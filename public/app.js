import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const $ = selector => document.querySelector(selector);
const gate = $('#gate');
const game = $('#game');
const canvas = $('#view');
const nameInput = $('#name');
const connectBtn = $('#connect');
const statusEl = $('#node-status');
const loadingEl = $('#loading');
const feed = $('#feed');
const roomEl = $('#room');
const coordsEl = $('#coords');
const presenceEl = $('#presence');
const audioStateEl = $('#audio-state');
const hintEl = $('#hint');
const promptBox = $('#prompt');
const promptTitle = $('#prompt-title');
const promptText = $('#prompt-text');
const promptOk = $('#prompt-ok');
const promptCancel = $('#prompt-cancel');
const terminalBox = $('#terminal');
const terminalTitle = $('#terminal-title');
const terminalLog = $('#terminal-log');
const terminalInput = $('#terminal-input');
const terminalWrite = $('#terminal-write');
const terminalClose = $('#terminal-close');
const avatarCards = [...document.querySelectorAll('.avatar-card')];

const WORLD_SEED = 28031997;
const EYE_HEIGHT = 1.68;
const CHUNK_SIZE = 96;
const CHUNK_RADIUS = 4;
const STRUCTURE_CELL = 176;
const TRAIL_SPACING = 520;
const WORLD_SOFT_LIMIT = 1000000;
const LAKE = { x: -38, z: 58, rx: 14, rz: 9.5, level: -0.25 };
const TERMINAL_SITES = [
  { id: 'north-temple', title: 'NORTHERN FIELD TERMINAL', x: 8.5, z: -31.0, rot: 2.72 },
  { id: 'east-ruins', title: 'EASTERN FIELD TERMINAL', x: 39.0, z: 35.5, rot: -2.35 },
  { id: 'west-ruins', title: 'WESTERN FIELD TERMINAL', x: -41.0, z: 30.0, rot: 2.25 }
];
const RUINS = [
  { x: 0, z: -39, rot: 0.04, scale: 1.14, name: 'NORTHERN TEMPLE', terminal: 'north-temple', terminalOffset: [5.3, 0.58, 0.0] },
  { x: 51, z: 24, rot: -0.56, scale: 0.98, name: 'EASTERN RUINS', terminal: 'east-ruins', terminalOffset: [4.8, 0.58, -0.4] },
  { x: -53, z: 17, rot: 0.62, scale: 0.90, name: 'WESTERN RUINS', terminal: 'west-ruins', terminalOffset: [-4.8, 0.58, 0.3] },
  { x: 39, z: -73, rot: -0.18, scale: 0.84, name: 'LOW TEMPLE', terminal: null },
  { x: -70, z: -53, rot: 0.30, scale: 0.76, name: 'BROKEN COURT', terminal: null }
];
const PATH_CONTROL_SETS = [
  [[0, 7], [1, -9], [-2, -24], [0, -39], [8, -55], [22, -66], [39, -73]],
  [[0, -9], [15, -2], [31, 9], [51, 24]],
  [[-1, 4], [-17, 7], [-34, 12], [-53, 17]],
  [[-4, 8], [-12, 25], [-26, 40], [-38, 50]],
  [[-53, 17], [-61, -7], [-66, -31], [-70, -53]]
];

let ws;
let myId = '';
let myName = '';
let joined = false;
let initialized = false;
let scene;
let camera;
let renderer;
let controls;
let clock;
let assets = {};
let keys = Object.create(null);
let colliders = [];
let interactives = [];
let players = new Map();
let notes = new Map();
let terminalData = {};
let pendingNotes = [];
let worldEchoes = [];
let activeTerminal = null;
let promptMode = null;
let lastMoveSend = 0;
let currentZone = 'MEADOW';
let waterMesh = null;
let waterNormal = null;
let stalker = null;
let nextStalkerAt = 0;
let nextSignalGlitchAt = 0;
let signalGlitchTimer = null;
let ghostPlayback = null;
let nextGhostAt = 0;
let audioEnabled = true;
let audioCtx = null;
let masterGain = null;
let ambientBus = null;
let reverbGain = null;
let dryGain = null;
let lastFootstepAt = 0;
let movingLastFrame = false;
let spawnHeight = 0;
let selectedAvatar = 'wanderer';
let loadedChunks = new Map();
let lastChunkCX = Number.NaN;
let lastChunkCZ = Number.NaN;
let lastChunkRefreshAt = 0;
let worldMaterials = {};
let worldGeometry = {};
let sunLight = null;
let sunTarget = null;

function addFeed(text, system = false, lifespan = 10000) {
  const line = document.createElement('div');
  line.className = `line${system ? ' system' : ''}`;
  line.textContent = text;
  feed.appendChild(line);
  while (feed.children.length > 8) feed.removeChild(feed.firstChild);
  setTimeout(() => { line.style.opacity = '.28'; }, lifespan);
}

function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  connectBtn.disabled = true;
  statusEl.textContent = 'CONNECTING';
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${proto}://${location.host}`);

  ws.addEventListener('open', () => {
    statusEl.textContent = 'OPEN';
    ws.send(JSON.stringify({ type: 'join', name: nameInput.value, avatar: selectedAvatar }));
  });
  ws.addEventListener('close', () => {
    statusEl.textContent = 'LOST';
    connectBtn.disabled = false;
    if (joined) addFeed('CONNECTION LOST', true);
  });
  ws.addEventListener('error', () => {
    statusEl.textContent = 'ERROR';
    connectBtn.disabled = false;
  });
  ws.addEventListener('message', event => {
    try { handleMessage(JSON.parse(event.data)); } catch { /* ignore malformed packets */ }
  });
}

async function handleMessage(msg) {
  if (msg.type === 'hello') {
    myId = msg.id;
    terminalData = msg.world?.terminals || {};
    pendingNotes = msg.world?.notes || [];
    worldEchoes = msg.world?.echoes || [];
    return;
  }

  if (msg.type === 'joined') {
    myName = msg.name;
    if (msg.avatar) selectedAvatar = msg.avatar;
    joined = true;
    statusEl.textContent = 'OPEN';
    gate.classList.add('hidden');
    game.classList.remove('hidden');
    try {
      await init3D();
      addFeed(`CONNECTED AS ${myName}`, true);
      setTimeout(() => addFeed('No directory of connected users is available.', true), 1200);
    } catch (error) {
      console.error(error);
      loadingEl.textContent = 'failed to enter field';
      addFeed('RENDER INITIALIZATION FAILED', true);
    }
    return;
  }

  if (msg.type === 'players') syncPlayers(msg.players || []);
  if (msg.type === 'chat') addFeed(`[${msg.name}]: ${msg.text}`, !!msg.system);
  if (msg.type === 'note') createNote(msg.note);
  if (msg.type === 'terminalUpdate') {
    terminalData[msg.terminalId] = msg.entries || [];
    if (activeTerminal?.id === msg.terminalId) renderTerminal(activeTerminal.id);
  }
}

connectBtn.addEventListener('click', connect);
nameInput.addEventListener('keydown', event => { if (event.key === 'Enter') connect(); });
avatarCards.forEach(card => card.addEventListener('click', () => {
  avatarCards.forEach(other => other.classList.remove('active'));
  card.classList.add('active');
  selectedAvatar = card.dataset.avatar || 'wanderer';
}));

async function init3D() {
  if (initialized) return;
  initialized = true;
  loadingEl.classList.remove('done');
  loadingEl.textContent = 'loading field…';

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xa8c9d4, 0.0039);

  camera = new THREE.PerspectiveCamera(66, innerWidth / innerHeight, 0.08, 720);
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  controls = new PointerLockControls(camera, canvas);
  game.addEventListener('click', event => {
    if (event.target.closest?.('.panel')) return;
    if (!uiOpen() && !controls.isLocked && initialized) controls.lock();
  });
  controls.addEventListener('lock', () => {
    document.body.classList.add('mouse-locked');
    startAudio();
    if (audioCtx?.state === 'suspended') audioCtx.resume();
  });
  controls.addEventListener('unlock', () => {
    document.body.classList.remove('mouse-locked');
    keys = Object.create(null);
  });

  clock = new THREE.Clock();
  await loadAssets();
  LAKE.level = broadTerrainHeight(LAKE.x, LAKE.z) - 1.42;
  spawnHeight = terrainHeight(0, 5);
  camera.position.set(0, spawnHeight + EYE_HEIGHT, 5);
  buildWorld();

  for (const note of pendingNotes) createNote(note);
  pendingNotes = [];
  prepareGhostPlayback();

  window.addEventListener('resize', onResize);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', event => { keys[event.code] = false; });
  window.addEventListener('blur', () => { keys = Object.create(null); });

  nextStalkerAt = performance.now() + 16000 + Math.random() * 9000;
  nextSignalGlitchAt = performance.now() + 27000 + Math.random() * 15000;
  nextGhostAt = performance.now() + 42000 + Math.random() * 25000;

  setTimeout(() => loadingEl.classList.add('done'), 350);
  animate();
}

function loadTexture(url) {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(url, resolve, undefined, reject);
  });
}

async function loadAssets() {
  const [sky, grassColor, grassNormal, grassRough, pathColor, pathNormal, pathRough, stoneDiffuse, stoneNormal, stoneRough, waterNormalTex] = await Promise.all([
    loadTexture('assets/sky_kloppenheim.jpg'),
    loadTexture('assets/grass_color.jpg'),
    loadTexture('assets/grass_normal.jpg'),
    loadTexture('assets/grass_rough.jpg'),
    loadTexture('assets/path_color.jpg'),
    loadTexture('assets/path_normal.jpg'),
    loadTexture('assets/path_rough.jpg'),
    loadTexture('assets/stone_diffuse.jpg'),
    loadTexture('assets/stone_normal.jpg'),
    loadTexture('assets/stone_rough.jpg'),
    loadTexture('assets/water_normal.jpg')
  ]);

  sky.colorSpace = THREE.SRGBColorSpace;
  sky.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = sky;
  scene.environment = sky;

  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  for (const tex of [grassColor, grassNormal, grassRough, pathColor, pathNormal, pathRough, stoneDiffuse, stoneNormal, stoneRough, waterNormalTex]) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = Math.min(8, maxAniso);
  }
  grassColor.colorSpace = THREE.SRGBColorSpace;
  pathColor.colorSpace = THREE.SRGBColorSpace;
  stoneDiffuse.colorSpace = THREE.SRGBColorSpace;

  grassColor.repeat.set(560, 560);
  grassNormal.repeat.set(560, 560);
  grassRough.repeat.set(560, 560);
  stoneDiffuse.repeat.set(2.5, 2.5);
  stoneNormal.repeat.set(2.5, 2.5);
  stoneRough.repeat.set(2.5, 2.5);
  pathColor.repeat.set(180, 10);
  pathNormal.repeat.set(180, 10);
  pathRough.repeat.set(180, 10);
  waterNormalTex.repeat.set(4, 4);

  assets = { sky, grassColor, grassNormal, grassRough, pathColor, pathNormal, pathRough, stoneDiffuse, stoneNormal, stoneRough, waterNormalTex };
}

function fract(value) { return value - Math.floor(value); }
function smoothstep(edge0, edge1, x) {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
function hash2(x, z) {
  return fract(Math.sin(x * 127.1 + z * 311.7) * 43758.5453123);
}
function valueNoise(x, z) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz);
  const b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1);
  const d = hash2(ix + 1, iz + 1);
  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(a, b, ux),
    THREE.MathUtils.lerp(c, d, ux),
    uz
  );
}
function fbm(x, z) {
  let total = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < 5; i++) {
    total += valueNoise(x * freq, z * freq) * amp;
    freq *= 2.03;
    amp *= 0.5;
  }
  return total / 0.96875;
}
function broadTerrainHeight(x, z) {
  const broad = (fbm(x * 0.0105 + 11.2, z * 0.0105 - 7.4) - 0.5) * 13.2;
  const longWave = Math.sin(x * 0.017 + 0.8) * Math.cos(z * 0.0135 - 0.35) * 1.8;
  return broad + longWave;
}

function baseTerrainHeight(x, z) {
  const broad = broadTerrainHeight(x, z);
  const rolling = (fbm(x * 0.025 - 4.8, z * 0.025 + 16.1) - 0.5) * 4.4;
  const micro = (fbm(x * 0.055 + 31.4, z * 0.055 - 19.7) - 0.5) * 0.8;
  return broad + rolling + micro;
}

function flattenAround(h, x, z, cx, cz, targetHeight, inner, outer) {
  const d = Math.hypot(x - cx, z - cz);
  if (d >= outer) return h;
  const amount = 1 - smoothstep(inner, outer, d);
  return THREE.MathUtils.lerp(h, targetHeight, amount);
}

function trailPhase() {
  return (WORLD_SEED % 997) * 0.006137;
}

function eastTrailZ(x, lane) {
  const phase = trailPhase() + lane * 1.917;
  const x0 = WORLD_SEED * 0.000013;
  const waveA = 36 * (Math.sin((x + x0) * 0.00415 + phase) - Math.sin(x0 * 0.00415 + phase));
  const waveB = 12 * (Math.sin((x - x0) * 0.0106 + phase * 0.53) - Math.sin((-x0) * 0.0106 + phase * 0.53));
  return lane * TRAIL_SPACING + waveA + waveB;
}

function northTrailX(z, lane) {
  const phase = trailPhase() * 0.83 + lane * 1.341;
  const base = (lane + 0.46) * TRAIL_SPACING;
  const z0 = WORLD_SEED * 0.000011;
  const waveA = 31 * Math.sin((z + z0) * 0.0038 + phase);
  const waveB = 10 * Math.sin((z - z0) * 0.0095 + phase * 0.71);
  return base + waveA + waveB;
}

function proceduralTrailDistance(x, z) {
  let best = Infinity;
  const eastLane = Math.round(z / TRAIL_SPACING);
  for (let lane = eastLane - 1; lane <= eastLane + 1; lane++) {
    best = Math.min(best, Math.abs(z - eastTrailZ(x, lane)));
  }
  const northLane = Math.round((x - TRAIL_SPACING * 0.46) / TRAIL_SPACING);
  for (let lane = northLane - 1; lane <= northLane + 1; lane++) {
    best = Math.min(best, Math.abs(x - northTrailX(z, lane)));
  }
  return best;
}

function structureSpecAtCell(gx, gz) {
  const roll = seededCellValue(gx, gz, 101);
  if (roll > 0.19) return null;

  const jitterX = (seededCellValue(gx, gz, 102) - 0.5) * STRUCTURE_CELL * 0.52;
  const jitterZ = (seededCellValue(gx, gz, 103) - 0.5) * STRUCTURE_CELL * 0.52;
  const x = (gx + 0.5) * STRUCTURE_CELL + jitterX;
  const z = (gz + 0.5) * STRUCTURE_CELL + jitterZ;

  if (Math.hypot(x, z - 5) < 145) return null;
  if (Math.hypot(x - LAKE.x, z - LAKE.z) < 36) return null;
  if (RUINS.some(r => Math.hypot(x - r.x, z - r.z) < 34)) return null;
  if (TERMINAL_SITES.some(t => Math.hypot(x - t.x, z - t.z) < 22)) return null;

  const rot = seededCellValue(gx, gz, 104) * Math.PI * 2;
  const scale = 0.88 + seededCellValue(gx, gz, 105) * 0.34;
  if (roll < 0.095) {
    return { type: 'cabin', gx, gz, x, z, rot, scale, radius: 6.0 * scale, baseY: broadTerrainHeight(x, z) };
  }
  if (roll < 0.135) {
    return { type: 'shrine', gx, gz, x, z, rot, scale: 0.75 + seededCellValue(gx, gz, 106) * 0.42, radius: 7.4, baseY: broadTerrainHeight(x, z) };
  }
  if (roll < 0.168) {
    const rx = 9 + seededCellValue(gx, gz, 107) * 7;
    const rz = 7 + seededCellValue(gx, gz, 108) * 5;
    const level = broadTerrainHeight(x, z) - 1.45;
    return { type: 'pond', gx, gz, x, z, rx, rz, level, radius: Math.max(rx, rz) * 1.5, baseY: level };
  }
  return { type: 'watchtower', gx, gz, x, z, rot, scale: 0.82 + seededCellValue(gx, gz, 109) * 0.30, radius: 5.8, baseY: broadTerrainHeight(x, z) };
}

function eachNearbyStructure(x, z, fn) {
  const gx = Math.floor(x / STRUCTURE_CELL);
  const gz = Math.floor(z / STRUCTURE_CELL);
  for (let ix = gx - 1; ix <= gx + 1; ix++) {
    for (let iz = gz - 1; iz <= gz + 1; iz++) {
      const spec = structureSpecAtCell(ix, iz);
      if (spec) fn(spec);
    }
  }
}

function applyPondBasin(h, x, z, pond) {
  const dx = (x - pond.x) / pond.rx;
  const dz = (z - pond.z) / pond.rz;
  const d = Math.hypot(dx, dz);
  if (d >= 1.48) return h;
  const basin = pond.level - 1.55 + Math.min(d, 1) * 0.12;
  const blend = smoothstep(0.82, 1.48, d);
  return THREE.MathUtils.lerp(basin, h, blend);
}

function terrainHeight(x, z) {
  let h = baseTerrainHeight(x, z);

  const spawnTarget = broadTerrainHeight(0, 5);
  h = flattenAround(h, x, z, 0, 5, spawnTarget, 9, 18);

  const trailDist = proceduralTrailDistance(x, z);
  if (trailDist < 5.1) {
    const target = broadTerrainHeight(x, z) - 0.10;
    h = THREE.MathUtils.lerp(h, target, 1 - smoothstep(2.4, 5.1, trailDist));
  }

  for (const ruin of RUINS) {
    const target = ruin.baseY ?? broadTerrainHeight(ruin.x, ruin.z);
    h = flattenAround(h, x, z, ruin.x, ruin.z, target, 6.2 * ruin.scale, 11.8 * ruin.scale);
  }

  for (const terminal of TERMINAL_SITES) {
    const target = terminal.baseY ?? broadTerrainHeight(terminal.x, terminal.z);
    h = flattenAround(h, x, z, terminal.x, terminal.z, target, 3.5, 7.0);
  }

  eachNearbyStructure(x, z, spec => {
    if (spec.type === 'cabin') {
      h = flattenAround(h, x, z, spec.x, spec.z, spec.baseY, 4.8 * spec.scale, 8.2 * spec.scale);
    } else if (spec.type === 'shrine') {
      h = flattenAround(h, x, z, spec.x, spec.z, spec.baseY, 5.5 * spec.scale, 9.5 * spec.scale);
    } else if (spec.type === 'watchtower') {
      h = flattenAround(h, x, z, spec.x, spec.z, spec.baseY, 4.2 * spec.scale, 7.2 * spec.scale);
    } else if (spec.type === 'pond') {
      h = applyPondBasin(h, x, z, spec);
    }
  });

  h = applyPondBasin(h, x, z, LAKE);
  return h;
}

function buildWorld() {
  for (const ruin of RUINS) ruin.baseY = broadTerrainHeight(ruin.x, ruin.z);
  for (const terminal of TERMINAL_SITES) terminal.baseY = broadTerrainHeight(terminal.x, terminal.z);

  scene.add(new THREE.HemisphereLight(0xdceeff, 0x536a3d, 1.24));
  sunLight = new THREE.DirectionalLight(0xfff1d7, 2.15);
  sunLight.position.set(camera.position.x - 58, 84, camera.position.z + 36);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.left = -110;
  sunLight.shadow.camera.right = 110;
  sunLight.shadow.camera.top = 110;
  sunLight.shadow.camera.bottom = -110;
  sunLight.shadow.camera.near = 4;
  sunLight.shadow.camera.far = 230;
  sunLight.shadow.bias = -0.00022;
  sunLight.shadow.normalBias = 0.035;
  sunTarget = new THREE.Object3D();
  sunTarget.position.copy(camera.position);
  scene.add(sunTarget);
  sunLight.target = sunTarget;
  scene.add(sunLight);

  initStreamingAssets();
  refreshWorldChunks(true);
  buildLake();
  buildRuins();
  buildTerminalStations();
  buildFootprintStories();
  buildStalker();
}


function initStreamingAssets() {
  const cloneTex = (source, color = false) => {
    const tex = source.clone();
    tex.needsUpdate = true;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 1);
    if (color) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return tex;
  };

  worldMaterials.terrain = new THREE.MeshStandardMaterial({
    map: cloneTex(assets.grassColor, true),
    normalMap: cloneTex(assets.grassNormal),
    roughnessMap: cloneTex(assets.grassRough),
    normalScale: new THREE.Vector2(0.48, 0.48),
    color: 0xb7c98c,
    roughness: 0.98,
    metalness: 0
  });

  worldMaterials.skirt = new THREE.MeshStandardMaterial({ color: 0x7fa05f, roughness: 1 });

  worldMaterials.path = new THREE.MeshStandardMaterial({
    map: cloneTex(assets.pathColor, true),
    normalMap: cloneTex(assets.pathNormal),
    roughnessMap: cloneTex(assets.pathRough),
    normalScale: new THREE.Vector2(0.42, 0.42),
    color: 0xc3ae82,
    roughness: 1,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
  });

  worldMaterials.wood = new THREE.MeshStandardMaterial({ color: 0x73543b, roughness: 0.96 });
  worldMaterials.darkWood = new THREE.MeshStandardMaterial({ color: 0x3f3128, roughness: 0.98 });
  worldMaterials.roof = new THREE.MeshStandardMaterial({ color: 0x555c59, roughness: 0.96 });
  worldMaterials.stone = cloneStoneMaterial(0xbebbaa);
  worldMaterials.stoneDark = cloneStoneMaterial(0x8f8d80);
  worldMaterials.leafA = new THREE.MeshStandardMaterial({ color: 0x4e7139, roughness: 1 });
  worldMaterials.leafB = new THREE.MeshStandardMaterial({ color: 0x66894a, roughness: 1 });
  worldMaterials.trunk = new THREE.MeshStandardMaterial({ color: 0x65503b, roughness: 1 });
  worldMaterials.deadWood = new THREE.MeshStandardMaterial({ color: 0x554a3d, roughness: 1 });
  worldMaterials.grass = new THREE.MeshStandardMaterial({ color: 0x6a9547, roughness: 1, side: THREE.DoubleSide });
  worldMaterials.rock = cloneStoneMaterial(0x9f9d90);
  worldMaterials.flower = new THREE.PointsMaterial({
    map: flowerTexture(),
    size: 0.34,
    sizeAttenuation: true,
    transparent: true,
    alphaTest: 0.2,
    depthWrite: false,
    vertexColors: true
  });

  waterNormal = assets.waterNormalTex.clone();
  waterNormal.wrapS = THREE.RepeatWrapping;
  waterNormal.wrapT = THREE.RepeatWrapping;
  waterNormal.repeat.set(4, 4);
  waterNormal.needsUpdate = true;
  worldMaterials.water = new THREE.MeshPhysicalMaterial({
    color: 0x6dabc7,
    normalMap: waterNormal,
    normalScale: new THREE.Vector2(0.30, 0.30),
    roughness: 0.18,
    metalness: 0.02,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    transparent: true,
    opacity: 0.80,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  worldGeometry.grassBlade = makeGrassBladeGeometry();
  worldGeometry.rock = new THREE.DodecahedronGeometry(0.55, 0);
  worldGeometry.treeTrunk = new THREE.CylinderGeometry(0.22, 0.34, 4.0, 8);
  worldGeometry.treeCrown = new THREE.IcosahedronGeometry(1.45, 1);

  if (assets.sky && renderer) {
    try {
      const pmrem = new THREE.PMREMGenerator(renderer);
      const env = pmrem.fromEquirectangular(assets.sky).texture;
      scene.environment = env;
      pmrem.dispose();
    } catch { /* background still works without PMREM */ }
  }
}
function chunkKey(cx, cz) { return `${cx},${cz}`; }
function chunkCoord(value) { return Math.floor(value / CHUNK_SIZE); }
function chunkCenter(cx, cz) { return { x: (cx + 0.5) * CHUNK_SIZE, z: (cz + 0.5) * CHUNK_SIZE }; }

function desiredChunkLod(cx, cz, centerCX, centerCZ) {
  const ring = Math.max(Math.abs(cx - centerCX), Math.abs(cz - centerCZ));
  if (ring <= 1) return 0;
  if (ring <= 3) return 1;
  return 2;
}

function refreshWorldChunks(force = false) {
  if (!camera) return;
  const centerCX = chunkCoord(camera.position.x);
  const centerCZ = chunkCoord(camera.position.z);
  if (!force && centerCX === lastChunkCX && centerCZ === lastChunkCZ) return;
  lastChunkCX = centerCX;
  lastChunkCZ = centerCZ;

  const wanted = new Set();
  for (let dx = -CHUNK_RADIUS; dx <= CHUNK_RADIUS; dx++) {
    for (let dz = -CHUNK_RADIUS; dz <= CHUNK_RADIUS; dz++) {
      const cx = centerCX + dx;
      const cz = centerCZ + dz;
      const key = chunkKey(cx, cz);
      wanted.add(key);
      const lod = desiredChunkLod(cx, cz, centerCX, centerCZ);
      const existing = loadedChunks.get(key);
      if (!existing || existing.lod !== lod) {
        if (existing) disposeWorldChunk(existing);
        loadedChunks.set(key, createWorldChunk(cx, cz, lod));
      }
    }
  }

  for (const [key, record] of loadedChunks) {
    if (!wanted.has(key)) {
      disposeWorldChunk(record);
      loadedChunks.delete(key);
    }
  }
}

function disposeWorldChunk(record) {
  if (!record) return;
  scene.remove(record.group);
  const sharedGeometries = new Set(Object.values(worldGeometry));
  const sharedMaterials = new Set(Object.values(worldMaterials));
  const disposedGeometries = new Set();
  const disposedMaterials = new Set();
  record.group.traverse(object => {
    const geometry = object.geometry;
    if (geometry && !sharedGeometries.has(geometry) && !disposedGeometries.has(geometry)) {
      geometry.dispose();
      disposedGeometries.add(geometry);
    }
    const materials = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
    for (const material of materials) {
      if (!sharedMaterials.has(material) && !disposedMaterials.has(material)) {
        material.dispose();
        disposedMaterials.add(material);
      }
    }
  });
}

function createWorldChunk(cx, cz, lod) {
  const center = chunkCenter(cx, cz);
  const group = new THREE.Group();
  group.position.set(center.x, 0, center.z);
  scene.add(group);
  const record = { cx, cz, lod, center, group, colliders: [], ownedGeometries: [] };
  buildChunkTerrain(record);
  buildChunkTrails(record);
  buildChunkStructures(record);
  buildChunkVegetation(record);
  return record;
}

function buildChunkTerrain(record) {
  const segments = record.lod === 0 ? 40 : record.lod === 1 ? 20 : 10;
  const geometry = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const wx = record.center.x + pos.getX(i);
    const wz = record.center.z + pos.getZ(i);
    pos.setY(i, terrainHeight(wx, wz));
    uv.setXY(i, wx / 4.5, wz / 4.5);
  }
  pos.needsUpdate = true;
  uv.needsUpdate = true;
  geometry.computeVertexNormals();
  record.ownedGeometries.push(geometry);
  const mesh = new THREE.Mesh(geometry, worldMaterials.terrain);
  mesh.receiveShadow = true;
  record.group.add(mesh);
  buildChunkSkirt(record, segments);
}

function buildChunkSkirt(record, segments) {
  const min = -CHUNK_SIZE * 0.5;
  const max = CHUNK_SIZE * 0.5;
  const positions = [];
  const indices = [];
  const edges = [
    t => [THREE.MathUtils.lerp(min, max, t), min],
    t => [max, THREE.MathUtils.lerp(min, max, t)],
    t => [THREE.MathUtils.lerp(max, min, t), max],
    t => [min, THREE.MathUtils.lerp(max, min, t)]
  ];
  let baseIndex = 0;
  for (const edge of edges) {
    for (let i = 0; i <= segments; i++) {
      const [lx, lz] = edge(i / segments);
      const wx = record.center.x + lx;
      const wz = record.center.z + lz;
      const y = terrainHeight(wx, wz);
      positions.push(lx, y, lz, lx, y - 2.6, lz);
      if (i < segments) {
        const a = baseIndex + i * 2;
        indices.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
      }
    }
    baseIndex += (segments + 1) * 2;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  record.ownedGeometries.push(geometry);
  const skirt = new THREE.Mesh(geometry, worldMaterials.skirt);
  skirt.receiveShadow = true;
  record.group.add(skirt);
}

function buildChunkTrails(record) {
  const minX = record.center.x - CHUNK_SIZE * 0.5;
  const maxX = record.center.x + CHUNK_SIZE * 0.5;
  const minZ = record.center.z - CHUNK_SIZE * 0.5;
  const maxZ = record.center.z + CHUNK_SIZE * 0.5;

  const eastStart = Math.floor((minZ - 70) / TRAIL_SPACING) - 1;
  const eastEnd = Math.ceil((maxZ + 70) / TRAIL_SPACING) + 1;
  for (let lane = eastStart; lane <= eastEnd; lane++) {
    const points = [];
    const step = 3.0;
    for (let x = minX - 5; x <= maxX + 5; x += step) {
      const z = eastTrailZ(x, lane);
      if (z >= minZ - 8 && z <= maxZ + 8) points.push(new THREE.Vector3(x, terrainHeight(x, z) + 0.12, z));
    }
    if (points.length >= 3) addTrailRibbon(record, points, lane === 0 ? 2.7 : 2.35);
  }

  const northStart = Math.floor((minX - TRAIL_SPACING * 0.46 - 70) / TRAIL_SPACING) - 1;
  const northEnd = Math.ceil((maxX - TRAIL_SPACING * 0.46 + 70) / TRAIL_SPACING) + 1;
  for (let lane = northStart; lane <= northEnd; lane++) {
    const points = [];
    const step = 3.0;
    for (let z = minZ - 5; z <= maxZ + 5; z += step) {
      const x = northTrailX(z, lane);
      if (x >= minX - 8 && x <= maxX + 8) points.push(new THREE.Vector3(x, terrainHeight(x, z) + 0.12, z));
    }
    if (points.length >= 3) addTrailRibbon(record, points, 2.15);
  }
}

function addTrailRibbon(record, points, width) {
  const positions = [];
  const uvs = [];
  const indices = [];
  let accumulated = 0;
  for (let i = 0; i < points.length; i++) {
    if (i > 0) accumulated += points[i].distanceTo(points[i - 1]);
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const tangent = new THREE.Vector2(next.x - prev.x, next.z - prev.z).normalize();
    const side = new THREE.Vector2(-tangent.y, tangent.x);
    const half = width * 0.5;
    const lx = points[i].x + side.x * half;
    const lz = points[i].z + side.y * half;
    const rx = points[i].x - side.x * half;
    const rz = points[i].z - side.y * half;
    positions.push(lx - record.center.x, terrainHeight(lx, lz) + 0.13, lz - record.center.z);
    positions.push(rx - record.center.x, terrainHeight(rx, rz) + 0.13, rz - record.center.z);
    const v = accumulated / 3.6;
    uvs.push(0, v, 1, v);
    if (i < points.length - 1) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 2, a + 3, a + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  record.ownedGeometries.push(geometry);
  const mesh = new THREE.Mesh(geometry, worldMaterials.path);
  mesh.receiveShadow = true;
  record.group.add(mesh);
}

function intHash(cx, cz, salt = 0) {
  let h = (Math.imul(cx ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(cz ^ 0xc2b2ae35, 0x27d4eb2d) ^ Math.imul(WORLD_SEED + salt, 0x165667b1)) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function nearbyStructureClearance(x, z) {
  let clearance = Infinity;
  eachNearbyStructure(x, z, spec => {
    if (spec.type === 'pond') {
      const d = Math.hypot((x - spec.x) / spec.rx, (z - spec.z) / spec.rz);
      clearance = Math.min(clearance, (d - 1) * Math.max(spec.rx, spec.rz));
    } else {
      clearance = Math.min(clearance, Math.hypot(x - spec.x, z - spec.z) - spec.radius);
    }
  });
  return clearance;
}

function terrainSlope(x, z) {
  const step = 1.4;
  const dx = Math.abs(terrainHeight(x + step, z) - terrainHeight(x - step, z));
  const dz = Math.abs(terrainHeight(x, z + step) - terrainHeight(x, z - step));
  return Math.max(dx, dz) / (step * 2);
}

function isVegetationClear(x, z, extra = 0) {
  if (proceduralTrailDistance(x, z) < 4.2 + extra) return false;
  if (nearbyStructureClearance(x, z) < 5.0 + extra) return false;
  if (Math.hypot(x - LAKE.x, z - LAKE.z) < Math.max(LAKE.rx, LAKE.rz) + 4 + extra) return false;
  if (RUINS.some(r => Math.hypot(x - r.x, z - r.z) < 9 * r.scale + extra)) return false;
  if (TERMINAL_SITES.some(t => Math.hypot(x - t.x, z - t.z) < 7 + extra)) return false;
  if (Math.hypot(x, z - 5) < 26 + extra) return false;
  return terrainSlope(x, z) < 0.68;
}

function buildChunkVegetation(record) {
  const rand = mulberry32(intHash(record.cx, record.cz, 300));
  const grassCount = record.lod === 0 ? 260 : record.lod === 1 ? 95 : 0;
  if (grassCount) {
    const grass = new THREE.InstancedMesh(worldGeometry.grassBlade, worldMaterials.grass, grassCount);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    let count = 0;
    let tries = 0;
    while (count < grassCount && tries < grassCount * 6) {
      tries++;
      const lx = (rand() - 0.5) * CHUNK_SIZE;
      const lz = (rand() - 0.5) * CHUNK_SIZE;
      const wx = record.center.x + lx;
      const wz = record.center.z + lz;
      if (!isVegetationClear(wx, wz, 0)) continue;
      const y = terrainHeight(wx, wz);
      dummy.position.set(lx, y - 0.055, lz);
      dummy.rotation.set(0, rand() * Math.PI, (rand() - 0.5) * 0.05);
      const h = 0.55 + rand() * 0.65;
      dummy.scale.set(0.72 + rand() * 0.55, h, 0.72 + rand() * 0.55);
      dummy.updateMatrix();
      grass.setMatrixAt(count, dummy.matrix);
      color.setHSL(0.27 + (rand() - 0.5) * 0.035, 0.34 + rand() * 0.16, 0.34 + rand() * 0.12);
      grass.setColorAt(count, color);
      count++;
    }
    grass.count = count;
    grass.receiveShadow = true;
    record.group.add(grass);
  }

  const treeTarget = record.lod === 0 ? 3 : record.lod === 1 ? 1 : 0;
  let treeCount = 0;
  for (let tries = 0; tries < 18 && treeCount < treeTarget; tries++) {
    const lx = (rand() - 0.5) * CHUNK_SIZE;
    const lz = (rand() - 0.5) * CHUNK_SIZE;
    const wx = record.center.x + lx;
    const wz = record.center.z + lz;
    if (!isVegetationClear(wx, wz, 4)) continue;
    addTreeToChunk(record, wx, wz, 0.82 + rand() * 0.46, rand() < 0.13);
    treeCount++;
  }

  const rockTarget = record.lod === 0 ? 6 : record.lod === 1 ? 3 : 1;
  const rocks = new THREE.InstancedMesh(worldGeometry.rock, worldMaterials.rock, rockTarget);
  const rockDummy = new THREE.Object3D();
  let rockCount = 0;
  for (let tries = 0; tries < 30 && rockCount < rockTarget; tries++) {
    const lx = (rand() - 0.5) * CHUNK_SIZE;
    const lz = (rand() - 0.5) * CHUNK_SIZE;
    const wx = record.center.x + lx;
    const wz = record.center.z + lz;
    if (!isVegetationClear(wx, wz, 1.5)) continue;
    const scale = 0.25 + rand() * 0.68;
    rockDummy.position.set(lx, terrainHeight(wx, wz) + 0.12 * scale, lz);
    rockDummy.rotation.set(rand() * 2, rand() * Math.PI, rand() * 2);
    rockDummy.scale.set(scale * (0.8 + rand() * 0.4), scale * (0.55 + rand() * 0.25), scale);
    rockDummy.updateMatrix();
    rocks.setMatrixAt(rockCount++, rockDummy.matrix);
  }
  rocks.count = rockCount;
  rocks.castShadow = record.lod === 0;
  rocks.receiveShadow = true;
  record.group.add(rocks);

  if (record.lod === 0) {
    const positions = [];
    const colors = [];
    const palette = [new THREE.Color(0xffffff), new THREE.Color(0xf1ead2), new THREE.Color(0xd9e4ef), new THREE.Color(0xf1d8cc)];
    let flowers = 0;
    for (let tries = 0; tries < 60 && flowers < 24; tries++) {
      const lx = (rand() - 0.5) * CHUNK_SIZE;
      const lz = (rand() - 0.5) * CHUNK_SIZE;
      const wx = record.center.x + lx;
      const wz = record.center.z + lz;
      if (!isVegetationClear(wx, wz, 0.8)) continue;
      positions.push(lx, terrainHeight(wx, wz) + 0.25, lz);
      const c = palette[Math.floor(rand() * palette.length)];
      colors.push(c.r, c.g, c.b);
      flowers++;
    }
    if (flowers) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      record.ownedGeometries.push(geo);
      record.group.add(new THREE.Points(geo, worldMaterials.flower));
    }
  }
}

function addTreeToChunk(record, wx, wz, scale = 1, dead = false) {
  const group = new THREE.Group();
  const lx = wx - record.center.x;
  const lz = wz - record.center.z;
  const ground = terrainHeight(wx, wz);
  group.position.set(lx, ground - 0.30 * scale, lz);
  group.scale.setScalar(scale);
  group.rotation.y = seededCellValue(Math.floor(wx), Math.floor(wz), 401) * Math.PI * 2;
  record.group.add(group);

  const trunk = new THREE.Mesh(worldGeometry.treeTrunk, dead ? worldMaterials.deadWood : worldMaterials.trunk);
  trunk.position.y = 2.0;
  trunk.castShadow = record.lod === 0;
  trunk.receiveShadow = true;
  group.add(trunk);

  if (dead) {
    for (let i = 0; i < 4; i++) {
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.10, 1.8 - i * 0.12, 6), worldMaterials.deadWood);
      branch.position.y = 2.6 + i * 0.32;
      branch.rotation.z = (i % 2 ? 1 : -1) * (0.86 + i * 0.04);
      branch.rotation.y = i * 1.37;
      group.add(branch);
    }
  } else {
    const crownCount = 4;
    for (let i = 0; i < crownCount; i++) {
      const crown = new THREE.Mesh(worldGeometry.treeCrown, i % 2 ? worldMaterials.leafA : worldMaterials.leafB);
      crown.position.set((i - 1.5) * 0.42, 3.75 + (i % 2) * 0.48, ((i * 17) % 3 - 1) * 0.42);
      crown.scale.set(1.0 + (i % 2) * 0.18, 0.9 + (i % 3) * 0.08, 1.0);
      crown.castShadow = record.lod === 0;
      crown.receiveShadow = true;
      group.add(crown);
    }
  }

  group.updateMatrixWorld(true);
  trunk.updateMatrixWorld(true);
  record.colliders.push(new THREE.Box3().setFromObject(trunk).expandByScalar(0.06));
}

function buildChunkStructures(record) {
  const minX = record.center.x - CHUNK_SIZE * 0.5;
  const maxX = record.center.x + CHUNK_SIZE * 0.5;
  const minZ = record.center.z - CHUNK_SIZE * 0.5;
  const maxZ = record.center.z + CHUNK_SIZE * 0.5;
  const gx0 = Math.floor(minX / STRUCTURE_CELL) - 1;
  const gx1 = Math.floor(maxX / STRUCTURE_CELL) + 1;
  const gz0 = Math.floor(minZ / STRUCTURE_CELL) - 1;
  const gz1 = Math.floor(maxZ / STRUCTURE_CELL) + 1;
  for (let gx = gx0; gx <= gx1; gx++) {
    for (let gz = gz0; gz <= gz1; gz++) {
      const spec = structureSpecAtCell(gx, gz);
      if (!spec) continue;
      if (spec.x < minX || spec.x >= maxX || spec.z < minZ || spec.z >= maxZ) continue;
      if (spec.type === 'cabin') addCabinToChunk(record, spec);
      else if (spec.type === 'shrine') addShrineToChunk(record, spec);
      else if (spec.type === 'watchtower') addWatchtowerToChunk(record, spec);
      else if (spec.type === 'pond') addPondToChunk(record, spec);
    }
  }
}

function addCabinToChunk(record, spec) {
  const group = new THREE.Group();
  group.position.set(spec.x - record.center.x, terrainHeight(spec.x, spec.z) - 0.10 * spec.scale, spec.z - record.center.z);
  group.rotation.y = spec.rot;
  group.scale.setScalar(spec.scale);
  record.group.add(group);
  const collisionMeshes = [];

  const add = (mesh, collides = false) => {
    mesh.castShadow = record.lod === 0;
    mesh.receiveShadow = true;
    group.add(mesh);
    if (collides) collisionMeshes.push(mesh);
    return mesh;
  };

  const floor = add(new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.18, 3.8), worldMaterials.darkWood), false);
  floor.position.y = 0.06;

  const back = add(new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.35, 0.18), worldMaterials.wood), true);
  back.position.set(0, 1.22, -1.9);
  const left = add(new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.35, 3.8), worldMaterials.wood), true);
  left.position.set(-2.4, 1.22, 0);
  const right = add(new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.35, 3.8), worldMaterials.wood), true);
  right.position.set(2.4, 1.22, 0);
  const frontL = add(new THREE.Mesh(new THREE.BoxGeometry(1.65, 2.35, 0.18), worldMaterials.wood), true);
  frontL.position.set(-1.58, 1.22, 1.9);
  const frontR = add(new THREE.Mesh(new THREE.BoxGeometry(1.65, 2.35, 0.18), worldMaterials.wood), true);
  frontR.position.set(1.58, 1.22, 1.9);

  const roofL = add(new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.16, 4.3), worldMaterials.roof), false);
  roofL.position.set(-1.13, 2.85, 0);
  roofL.rotation.z = 0.48;
  const roofR = add(new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.16, 4.3), worldMaterials.roof), false);
  roofR.position.set(1.13, 2.85, 0);
  roofR.rotation.z = -0.48;

  const porch = add(new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.14, 1.15), worldMaterials.darkWood), false);
  porch.position.set(0, 0.14, 2.38);

  const table = add(new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 0.65), worldMaterials.darkWood), true);
  table.position.set(1.15, 0.78, -0.55);
  for (const sx of [-0.42, 0.42]) for (const sz of [-0.24, 0.24]) {
    const leg = add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.72, 0.07), worldMaterials.darkWood), false);
    leg.position.set(1.15 + sx, 0.4, -0.55 + sz);
  }
  const bed = add(new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.26, 0.78), worldMaterials.darkWood), true);
  bed.position.set(-1.1, 0.34, -0.95);
  const mattressMat = new THREE.MeshStandardMaterial({ color: 0x8c8a79, roughness: 1 });
  const mattress = add(new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.14, 0.70), mattressMat), false);
  mattress.position.set(-1.1, 0.53, -0.95);
  const crate = add(new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.58, 0.58), worldMaterials.wood), true);
  crate.position.set(1.72, 0.35, 0.85);

  const windowMat = new THREE.MeshPhysicalMaterial({ color: 0x8ba9aa, roughness: 0.25, transmission: 0.25, transparent: true, opacity: 0.45, side: THREE.DoubleSide });
  const window = add(new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.64), windowMat), false);
  window.position.set(0.55, 1.5, -2.0);

  const lintel = add(new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.16, 0.22), worldMaterials.darkWood), false);
  lintel.position.set(0, 2.25, 1.94);

  group.updateMatrixWorld(true);
  for (const mesh of collisionMeshes) {
    mesh.updateMatrixWorld(true);
    record.colliders.push(new THREE.Box3().setFromObject(mesh).expandByScalar(0.04));
  }
}

function addShrineToChunk(record, spec) {
  const group = new THREE.Group();
  group.position.set(spec.x - record.center.x, terrainHeight(spec.x, spec.z) - 0.06, spec.z - record.center.z);
  group.rotation.y = spec.rot;
  group.scale.setScalar(spec.scale);
  record.group.add(group);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.25, 0.34, 12), worldMaterials.stoneDark);
  base.position.y = 0.10;
  base.receiveShadow = true;
  group.add(base);
  const collisionMeshes = [];
  const positions = [[-1.8, -1.2], [1.8, -1.2], [-1.8, 1.2], [1.8, 1.2]];
  positions.forEach(([x, z], i) => {
    const h = i === 2 ? 1.85 : 3.0 + (i % 2) * 0.45;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.38, h, 10), worldMaterials.stone);
    col.position.set(x, h * 0.5 + 0.28, z);
    col.castShadow = record.lod === 0;
    col.receiveShadow = true;
    group.add(col);
    collisionMeshes.push(col);
  });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.32, 0.55), worldMaterials.stone);
  slab.position.set(0, 3.52, -1.2);
  slab.rotation.z = 0.035;
  group.add(slab);
  const altar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.75, 0.95), worldMaterials.stoneDark);
  altar.position.set(0, 0.62, 0.15);
  group.add(altar);
  collisionMeshes.push(altar);

  group.updateMatrixWorld(true);
  for (const mesh of collisionMeshes) {
    mesh.updateMatrixWorld(true);
    record.colliders.push(new THREE.Box3().setFromObject(mesh).expandByScalar(0.05));
  }
}

function addWatchtowerToChunk(record, spec) {
  const group = new THREE.Group();
  group.position.set(spec.x - record.center.x, terrainHeight(spec.x, spec.z) - 0.14 * spec.scale, spec.z - record.center.z);
  group.rotation.y = spec.rot;
  group.scale.setScalar(spec.scale);
  record.group.add(group);
  const collisionMeshes = [];
  const wood = worldMaterials.darkWood;
  const plank = worldMaterials.wood;

  const feet = [[-1.25, -1.25], [1.25, -1.25], [-1.25, 1.25], [1.25, 1.25]];
  for (const [x, z] of feet) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 5.1, 0.22), wood);
    post.position.set(x, 2.55, z);
    post.castShadow = record.lod === 0;
    post.receiveShadow = true;
    group.add(post);
    collisionMeshes.push(post);
  }

  const deck = new THREE.Mesh(new THREE.BoxGeometry(3.25, 0.20, 3.25), plank);
  deck.position.y = 4.65;
  deck.castShadow = record.lod === 0;
  deck.receiveShadow = true;
  group.add(deck);

  const railHeight = 5.35;
  const rails = [
    [0, railHeight, -1.5, 3.0, 0.12, 0.12],
    [0, railHeight, 1.5, 3.0, 0.12, 0.12],
    [-1.5, railHeight, 0, 0.12, 0.12, 3.0],
    [1.5, railHeight, 0, 0.12, 0.12, 3.0]
  ];
  for (const [x, y, z, w, h, d] of rails) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wood);
    rail.position.set(x, y, z);
    group.add(rail);
  }

  for (let i = 0; i < 7; i++) {
    const rung = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.08, 0.10), plank);
    rung.position.set(0, 0.72 + i * 0.56, 1.43);
    group.add(rung);
  }
  const ladderL = new THREE.Mesh(new THREE.BoxGeometry(0.10, 4.25, 0.10), wood);
  ladderL.position.set(-0.42, 2.35, 1.43);
  group.add(ladderL);
  const ladderR = ladderL.clone();
  ladderR.position.x = 0.42;
  group.add(ladderR);

  const roofL = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.13, 3.6), worldMaterials.roof);
  roofL.position.set(-0.86, 6.20, 0);
  roofL.rotation.z = 0.44;
  group.add(roofL);
  const roofR = roofL.clone();
  roofR.position.x = 0.86;
  roofR.rotation.z = -0.44;
  group.add(roofR);

  const dangling = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.6, 0.05), worldMaterials.deadWood);
  dangling.position.set(1.2, 3.55, -1.3);
  dangling.rotation.z = 0.08;
  group.add(dangling);

  group.updateMatrixWorld(true);
  for (const mesh of collisionMeshes) {
    mesh.updateMatrixWorld(true);
    record.colliders.push(new THREE.Box3().setFromObject(mesh).expandByScalar(0.04));
  }
}

function addPondToChunk(record, spec) {
  const geo = new THREE.CircleGeometry(spec.rx * 0.985, 56);
  geo.rotateX(-Math.PI / 2);
  record.ownedGeometries.push(geo);
  const water = new THREE.Mesh(geo, worldMaterials.water);
  water.scale.z = spec.rz / spec.rx;
  water.position.set(spec.x - record.center.x, spec.level + 0.035, spec.z - record.center.z);
  record.group.add(water);

  if (record.lod === 0) {
    const reeds = new THREE.Group();
    const rand = mulberry32(intHash(spec.gx, spec.gz, 550));
    for (let i = 0; i < 34; i++) {
      const angle = rand() * Math.PI * 2;
      const radius = 1.02 + rand() * 0.17;
      const wx = spec.x + Math.cos(angle) * spec.rx * radius;
      const wz = spec.z + Math.sin(angle) * spec.rz * radius;
      const y = terrainHeight(wx, wz);
      if (y < spec.level - 0.35) continue;
      const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.045, 0.78 + rand() * 0.45), worldMaterials.leafA);
      blade.position.set(wx - record.center.x, y + 0.42, wz - record.center.z);
      blade.rotation.y = rand() * Math.PI;
      reeds.add(blade);
    }
    record.group.add(reeds);
  }
}

function buildTerminalStations() {
  for (const site of TERMINAL_SITES) createTerminalStation(site);
}

function createTerminalStation(site) {
  const group = new THREE.Group();
  const ground = terrainHeight(site.x, site.z);
  group.position.set(site.x, ground - 0.04, site.z);
  group.rotation.y = site.rot;
  scene.add(group);

  const wood = worldMaterials.wood;
  const darkWood = worldMaterials.darkWood;
  const caseMat = new THREE.MeshStandardMaterial({ color: 0xc4c0b4, roughness: 0.88 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x38423b, roughness: 0.84 });
  const screenMat = new THREE.MeshStandardMaterial({ color: 0x1b2b22, emissive: 0x6f9b78, emissiveIntensity: 0.55, roughness: 0.38, side: THREE.DoubleSide });

  const platform = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.16, 2.5), darkWood);
  platform.position.y = 0.04;
  platform.receiveShadow = true;
  group.add(platform);

  const deskTop = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.10, 0.78), wood);
  deskTop.position.set(0, 0.86, 0);
  deskTop.castShadow = true;
  deskTop.receiveShadow = true;
  group.add(deskTop);
  const legs = [[-0.70, -0.29], [0.70, -0.29], [-0.70, 0.29], [0.70, 0.29]];
  for (const [x, z] of legs) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.82, 0.10), darkWood);
    leg.position.set(x, 0.43, z);
    group.add(leg);
  }

  const monitor = new THREE.Group();
  monitor.position.set(0, 1.27, -0.05);
  group.add(monitor);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.62, 0.70), caseMat);
  body.castShadow = true;
  body.userData = { type: 'terminal', id: site.id, title: site.title, name: 'CRT TERMINAL' };
  monitor.add(body);
  interactives.push(body);
  const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.44, 0.04), trimMat);
  bezel.position.set(0, 0.03, 0.37);
  monitor.add(bezel);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.50, 0.33), screenMat);
  screen.position.set(0, 0.03, 0.394);
  screen.userData = { type: 'terminal', id: site.id, title: site.title, name: 'CRT TERMINAL' };
  monitor.add(screen);
  interactives.push(screen);
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.18, 0.17), caseMat);
  stand.position.set(0, -0.40, -0.02);
  monitor.add(stand);
  const monitorBase = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.06, 0.36), caseMat);
  monitorBase.position.set(0, -0.51, -0.02);
  monitor.add(monitorBase);

  const keyboard = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.05, 0.24), caseMat);
  keyboard.position.set(0, 0.93, 0.20);
  keyboard.rotation.x = -0.08;
  keyboard.userData = { type: 'terminal', id: site.id, title: site.title, name: 'CRT TERMINAL' };
  group.add(keyboard);
  interactives.push(keyboard);
  const tower = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.63, 0.45), caseMat);
  tower.position.set(-0.62, 0.53, 0.05);
  group.add(tower);

  const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.07, 0.46), darkWood);
  chairSeat.position.set(0, 0.48, 0.92);
  group.add(chairSeat);
  const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.55, 0.07), darkWood);
  chairBack.position.set(0, 0.72, 1.12);
  group.add(chairBack);

  group.updateMatrixWorld(true);
  [deskTop, body, tower, chairBack].forEach(mesh => {
    mesh.updateMatrixWorld(true);
    colliders.push(new THREE.Box3().setFromObject(mesh).expandByScalar(0.04));
  });
}

function pointInsidePond(x, z, scale = 0.92) {
  const hero = Math.hypot((x - LAKE.x) / (LAKE.rx * scale), (z - LAKE.z) / (LAKE.rz * scale));
  if (hero < 1) return true;
  let inside = false;
  eachNearbyStructure(x, z, spec => {
    if (spec.type !== 'pond' || inside) return;
    const d = Math.hypot((x - spec.x) / (spec.rx * scale), (z - spec.z) / (spec.rz * scale));
    if (d < 1) inside = true;
  });
  return inside;
}

function buildLake() {
  const shorelineMaterial = worldMaterials.path.clone();
  shorelineMaterial.side = THREE.DoubleSide;
  shorelineMaterial.color = new THREE.Color(0xb9ad8e);

  const segments = 96;
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const c = Math.cos(t);
    const sE = Math.sin(t);
    const innerRadius = 1.0 + 0.015 * Math.sin(t * 3.0 + 0.8) + 0.02 * Math.cos(t * 5.0 - 0.2);
    const outerRadius = 1.18 + 0.03 * Math.sin(t * 2.0 - 0.4);
    const ix = LAKE.x + c * LAKE.rx * innerRadius;
    const iz = LAKE.z + sE * LAKE.rz * innerRadius;
    const ox = LAKE.x + c * LAKE.rx * outerRadius;
    const oz = LAKE.z + sE * LAKE.rz * outerRadius;
    const iy = Math.max(LAKE.level + 0.02, terrainHeight(ix, iz) + 0.03);
    const oy = terrainHeight(ox, oz) + 0.04;
    positions.push(ix, iy, iz, ox, oy, oz);
    uvs.push(0, i / 8, 1, i / 8);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 2, a + 3, a + 1);
    }
  }
  const shoreGeo = new THREE.BufferGeometry();
  shoreGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  shoreGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  shoreGeo.setIndex(indices);
  shoreGeo.computeVertexNormals();
  const shore = new THREE.Mesh(shoreGeo, shorelineMaterial);
  shore.receiveShadow = true;
  scene.add(shore);

  waterMesh = new THREE.Mesh(new THREE.CircleGeometry(LAKE.rx * 0.985, 96), worldMaterials.water);
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.scale.z = LAKE.rz / LAKE.rx;
  waterMesh.position.set(LAKE.x, LAKE.level + 0.03, LAKE.z);
  scene.add(waterMesh);

  const reedsMat = new THREE.MeshStandardMaterial({ color: 0x557543, roughness: 1, side: THREE.DoubleSide });
  const bladeGeo = new THREE.PlaneGeometry(0.045, 0.9);
  const reeds = new THREE.InstancedMesh(bladeGeo, reedsMat, 220);
  const dummy = new THREE.Object3D();
  const rand = mulberry32(intHash(Math.round(LAKE.x), Math.round(LAKE.z), 880));
  let count = 0;
  for (let i = 0; i < 320 && count < 220; i++) {
    const angle = rand() * Math.PI * 2;
    const radius = 1.03 + rand() * 0.17;
    const x = LAKE.x + Math.cos(angle) * LAKE.rx * radius;
    const z = LAKE.z + Math.sin(angle) * LAKE.rz * radius;
    const y = terrainHeight(x, z);
    if (y < LAKE.level - 0.35) continue;
    dummy.position.set(x, y + 0.45, z);
    dummy.rotation.y = rand() * Math.PI;
    dummy.scale.set(0.9 + rand() * 0.4, 0.65 + rand() * 0.8, 1);
    dummy.updateMatrix();
    reeds.setMatrixAt(count++, dummy.matrix);
  }
  reeds.count = count;
  scene.add(reeds);
}

function cloneStoneMaterial(tint = 0xffffff) {
  return new THREE.MeshStandardMaterial({
    map: assets.stoneDiffuse,
    normalMap: assets.stoneNormal,
    roughnessMap: assets.stoneRough,
    normalScale: new THREE.Vector2(0.72, 0.72),
    color: tint,
    roughness: 0.95,
    metalness: 0
  });
}

function makeStoneMesh(geometry, material, cast = true) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  return mesh;
}

function createColumn(group, x, z, height, radius, broken, stoneMaterial, collisionMeshes, rand = Math.random) {
  const base = makeStoneMesh(new THREE.CylinderGeometry(radius * 1.18, radius * 1.24, 0.18, 14), stoneMaterial);
  base.position.set(x, 0.19, z);
  group.add(base);

  const actualHeight = broken ? height * (0.48 + rand() * 0.28) : height;
  const shaft = makeStoneMesh(new THREE.CylinderGeometry(radius * 0.78, radius, actualHeight, 14, 1), stoneMaterial);
  shaft.position.set(x, 0.27 + actualHeight * 0.5, z);
  group.add(shaft);
  collisionMeshes.push(shaft);

  const collar = makeStoneMesh(new THREE.CylinderGeometry(radius * 0.98, radius * 0.88, 0.13, 14), stoneMaterial);
  collar.position.set(x, 0.29 + actualHeight, z);
  group.add(collar);

  if (!broken) {
    const capital = makeStoneMesh(new THREE.BoxGeometry(radius * 2.1, 0.18, radius * 2.1), stoneMaterial);
    capital.position.set(x, 0.43 + actualHeight, z);
    group.add(capital);
  } else if (rand() < 0.7) {
    const fragment = makeStoneMesh(new THREE.CylinderGeometry(radius * 0.78, radius, height * 0.32, 14, 1), stoneMaterial);
    fragment.position.set(x + radius * 1.8, 0.28, z + radius * (1.5 + rand()));
    fragment.rotation.z = Math.PI * (0.42 + rand() * 0.12);
    fragment.rotation.y = rand() * Math.PI;
    group.add(fragment);
  }
}

function createTempleRuin(config, index) {
  const rand = mulberry32(intHash(Math.round(config.x * 10), Math.round(config.z * 10), 710 + index));
  const group = new THREE.Group();
  group.position.set(config.x, terrainHeight(config.x, config.z), config.z);
  group.rotation.y = config.rot;
  group.scale.setScalar(config.scale);
  scene.add(group);

  const stone = cloneStoneMaterial(index === 0 ? 0xe6dfc8 : 0xd5d0bd);
  const stoneDark = cloneStoneMaterial(0xb7b09c);
  const collisionMeshes = [];

  for (let step = 0; step < 3; step++) {
    const terrace = makeStoneMesh(new THREE.BoxGeometry(10.4 - step * 0.7, 0.14, 7.8 - step * 0.55), step === 0 ? stoneDark : stone, false);
    terrace.position.y = 0.07 + step * 0.13;
    group.add(terrace);
  }

  const columns = [
    [-3.25, -2.25, false], [-1.1, -2.25, index !== 0], [1.1, -2.25, false], [3.25, -2.25, index === 2],
    [-3.25, 2.05, index === 4], [-1.1, 2.05, true], [1.1, 2.05, index !== 1], [3.25, 2.05, true]
  ];
  for (const [x, z, broken] of columns) createColumn(group, x, z, 3.9, 0.38, broken, stone, collisionMeshes, rand);

  if (index === 0) {
    const arch = makeStoneMesh(new THREE.TorusGeometry(1.55, 0.28, 10, 28, Math.PI), stone);
    arch.position.set(0, 2.75, 1.96);
    group.add(arch);
    const archLeft = makeStoneMesh(new THREE.BoxGeometry(0.55, 2.7, 0.62), stone);
    archLeft.position.set(-1.55, 1.35, 1.96);
    group.add(archLeft);
    collisionMeshes.push(archLeft);
    const archRight = archLeft.clone();
    archRight.position.x = 1.55;
    group.add(archRight);
    collisionMeshes.push(archRight);
  }

  const lintelA = makeStoneMesh(new THREE.BoxGeometry(7.7, 0.38, 0.62), stone);
  lintelA.position.set(0, 4.46, -2.25);
  lintelA.rotation.z = index === 3 ? -0.045 : 0;
  group.add(lintelA);

  if (index !== 0) {
    const wall = makeStoneMesh(new THREE.BoxGeometry(3.1, 2.25, 0.52), stone);
    wall.position.set(index % 2 ? -1.8 : 1.8, 1.4, 0.1);
    wall.rotation.y = index % 2 ? 0.16 : -0.16;
    group.add(wall);
    collisionMeshes.push(wall);
  }

  for (let i = 0; i < 14; i++) {
    const size = 0.22 + rand() * 0.42;
    const rock = makeStoneMesh(new THREE.DodecahedronGeometry(size, 0), rand() < 0.55 ? stone : stoneDark);
    const side = rand() < 0.5 ? -1 : 1;
    rock.position.set(side * (4 + rand() * 2.4), size * 0.6, (rand() - 0.5) * 6.6);
    rock.rotation.set(rand(), rand(), rand());
    group.add(rock);
  }

  const altar = makeStoneMesh(new THREE.BoxGeometry(1.35, 0.72, 1.05), stoneDark);
  altar.position.set(0, 0.62, 0.25);
  group.add(altar);

  group.updateMatrixWorld(true);
  for (const mesh of collisionMeshes) {
    mesh.updateMatrixWorld(true);
    colliders.push(new THREE.Box3().setFromObject(mesh).expandByScalar(0.06));
  }


}

function buildRuins() {
  RUINS.forEach(createTempleRuin);
}

function seededCellValue(ix, iz, salt = 0) {
  return fract(Math.sin((ix + WORLD_SEED * 0.001 + salt * 13.1) * 127.1 + (iz - WORLD_SEED * 0.001 + salt * 7.7) * 311.7) * 43758.5453123);
}

function makeGrassBladeGeometry() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -0.035, 0, 0, 0.035, 0, 0, 0, 0.62, 0,
    0, 0, -0.035, 0, 0, 0.035, 0, 0.62, 0
  ], 3));
  geometry.computeVertexNormals();
  return geometry;
}

function flowerTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.translate(32, 32);
  g.fillStyle = '#ffffff';
  for (let i = 0; i < 5; i++) {
    g.save();
    g.rotate(i * Math.PI * 2 / 5);
    g.beginPath();
    g.ellipse(0, -11, 5.8, 10, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  g.fillStyle = '#f0c75c';
  g.beginPath();
  g.arc(0, 0, 5, 0, Math.PI * 2);
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildFootprintStories() {
  const material = new THREE.MeshBasicMaterial({ color: 0x463b2d, transparent: true, opacity: 0.13, depthWrite: false, side: THREE.DoubleSide });
  const geometry = new THREE.PlaneGeometry(0.16, 0.33);
  const sequences = [
    { start: [-11, 22], dir: [-0.42, 0.90], count: 10 },
    { start: [46, 18], dir: [-0.86, -0.50], count: 8 },
    { start: [-31, 47], dir: [-0.32, 0.95], count: 7 }
  ];
  for (const seq of sequences) {
    for (let i = 0; i < seq.count; i++) {
      const side = i % 2 ? 0.14 : -0.14;
      const px = seq.start[0] + seq.dir[0] * i * 0.48 + seq.dir[1] * side;
      const pz = seq.start[1] + seq.dir[1] * i * 0.48 - seq.dir[0] * side;
      const foot = new THREE.Mesh(geometry, material);
      foot.rotation.x = -Math.PI / 2;
      foot.rotation.z = Math.atan2(seq.dir[0], seq.dir[1]);
      foot.position.set(px, terrainHeight(px, pz) + 0.065, pz);
      scene.add(foot);
    }
  }
}

function buildStalker() {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0x111715,
    roughness: 1,
    transparent: true,
    opacity: 0,
    depthWrite: false
  });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.48, 1.72, 7), material);
  body.position.y = 0.94;
  const shoulders = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.30, 0.38, 7), material);
  shoulders.position.y = 1.72;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), material);
  head.position.y = 2.10;
  group.add(body, shoulders, head);
  group.visible = false;
  scene.add(group);
  stalker = {
    group,
    material,
    active: false,
    fading: false,
    spawnedAt: 0,
    fadeStart: 0,
    maxOpacity: 0.46,
    anchor: null
  };
}

function isInLake(x, z, scale = 1) {
  const dx = (x - LAKE.x) / (LAKE.rx * scale);
  const dz = (z - LAKE.z) / (LAKE.rz * scale);
  return dx * dx + dz * dz < 1;
}

function playerMesh(name, ghost = false, avatar = 'wanderer') {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: ghost ? 0x98aaa1 : 0x59645d,
    roughness: 1,
    transparent: ghost,
    opacity: ghost ? 0 : 1,
    depthWrite: !ghost
  });
  const accent = ghost ? material : new THREE.MeshStandardMaterial({ color: 0x81958b, roughness: 1 });
  const alt = ghost ? material : new THREE.MeshStandardMaterial({ color: 0x3f4b45, roughness: 1 });
  const skin = ghost ? material : new THREE.MeshStandardMaterial({ color: 0xb6a28e, roughness: 0.95 });

  const torso = new THREE.Mesh(
    avatar === 'hermit' ? new THREE.ConeGeometry(0.40, 0.94, 7) : new THREE.BoxGeometry(0.50, 0.76, 0.28),
    material
  );
  torso.position.y = 1.02;
  group.add(torso);

  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.25), alt);
  hips.position.y = 0.61;
  group.add(hips);

  function limbPivot(x, y, z, length, limbMaterial, width = 0.13) {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, length, width), limbMaterial);
    mesh.position.y = -length * 0.5;
    pivot.add(mesh);
    group.add(pivot);
    return pivot;
  }

  const leftLeg = limbPivot(-0.13, 0.55, 0, 0.63, alt, 0.14);
  const rightLeg = limbPivot(0.13, 0.55, 0, 0.63, alt, 0.14);
  const leftArm = limbPivot(-0.34, 1.29, 0, 0.64, material, 0.11);
  const rightArm = limbPivot(0.34, 1.29, 0, 0.64, material, 0.11);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 9, 7), skin);
  head.position.y = 1.66;
  group.add(head);

  if (avatar === 'surveyor') {
    const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.50, 0.20), alt);
    backpack.position.set(0, 1.05, -0.23);
    group.add(backpack);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.20, 0.08, 10), alt);
    cap.position.y = 1.89;
    group.add(cap);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.03, 0.16), alt);
    brim.position.set(0, 1.86, 0.12);
    group.add(brim);
  } else if (avatar === 'hermit') {
    torso.position.y = 0.98;
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.29, 0.36, 8), alt);
    hood.position.y = 1.88;
    hood.rotation.x = Math.PI;
    group.add(hood);
    const rope = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.025, 6, 14), accent);
    rope.position.y = 0.75;
    rope.rotation.x = Math.PI / 2;
    group.add(rope);
  } else if (avatar === 'runner') {
    torso.scale.set(0.78, 1.05, 0.82);
    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.48, 0.30), accent);
    vest.position.y = 1.08;
    group.add(vest);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.20, 0.025, 6, 14), alt);
    band.position.y = 1.76;
    band.rotation.x = Math.PI / 2;
    group.add(band);
  } else {
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.045, 6, 14), alt);
    scarf.position.y = 1.42;
    scarf.rotation.x = Math.PI / 2;
    group.add(scarf);
    const coatTail = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.40, 0.24), material);
    coatTail.position.y = 0.62;
    group.add(coatTail);
  }

  if (!ghost) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(242,246,242,.82)';
    g.font = '22px monospace';
    g.textAlign = 'center';
    g.fillText(name, 128, 38);
    const tex = new THREE.CanvasTexture(c);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    sprite.position.y = 2.12;
    sprite.scale.set(1.7, 0.43, 1);
    group.add(sprite);
  }

  group.userData.material = material;
  group.userData.leftLeg = leftLeg;
  group.userData.rightLeg = rightLeg;
  group.userData.leftArm = leftArm;
  group.userData.rightArm = rightArm;
  group.userData.walkPhase = 0;
  group.userData.lastVisualPosition = new THREE.Vector3();
  scene.add(group);
  return group;
}

function syncPlayers(list) {
  const seen = new Set();
  for (const p of list) {
    seen.add(p.id);
    let obj = players.get(p.id);
    if (!obj) {
      obj = playerMesh(p.name, false, p.avatar || 'wanderer');
      obj.userData.target = new THREE.Vector3(p.x, terrainHeight(p.x, p.z), p.z);
      obj.position.copy(obj.userData.target);
      players.set(p.id, obj);
      addFeed(`${p.name} entered local range`, true);
    }
    obj.userData.target.set(p.x, terrainHeight(p.x, p.z), p.z);
    obj.userData.targetRotation = p.rot;
  }
  for (const [id, obj] of players) {
    if (!seen.has(id)) {
      scene.remove(obj);
      players.delete(id);
    }
  }
  updatePresenceLabel();
}

function updateRemotePlayers(dt) {
  for (const obj of players.values()) {
    const before = obj.position.clone();
    obj.position.lerp(obj.userData.target, 1 - Math.exp(-dt * 8));
    const targetRot = obj.userData.targetRotation ?? obj.rotation.y;
    obj.rotation.y = THREE.MathUtils.lerp(obj.rotation.y, targetRot, 1 - Math.exp(-dt * 10));

    const travelled = obj.position.distanceTo(before);
    const motion = THREE.MathUtils.clamp(travelled / Math.max(dt, 0.001) / 4.0, 0, 1);
    obj.userData.walkPhase += dt * (2.0 + motion * 7.0);
    const swing = Math.sin(obj.userData.walkPhase) * 0.48 * motion;
    if (obj.userData.leftLeg) obj.userData.leftLeg.rotation.x = swing;
    if (obj.userData.rightLeg) obj.userData.rightLeg.rotation.x = -swing;
    if (obj.userData.leftArm) obj.userData.leftArm.rotation.x = -swing * 0.72;
    if (obj.userData.rightArm) obj.userData.rightArm.rotation.x = swing * 0.72;
  }
}

function updatePresenceLabel() {
  presenceEl.textContent = players.size ? `${players.size} SIGNAL${players.size > 1 ? 'S' : ''} NEARBY` : 'NO LOCAL SIGNALS';
}

function createNote(note) {
  if (!scene || notes.has(note.id)) return;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  g.fillStyle = '#d8d2bd';
  g.fillRect(0, 0, 512, 256);
  g.fillStyle = '#2f332e';
  g.font = '21px ui-monospace, monospace';
  wrapText(g, note.text, 22, 48, 468, 28);
  g.fillStyle = '#666a62';
  g.font = '15px ui-monospace, monospace';
  g.fillText(`// ${note.author}`, 22, 230);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.93, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.52), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = (hash2(note.x, note.z) - 0.5) * 0.25;
  mesh.position.set(note.x, terrainHeight(note.x, note.z) + 0.075, note.z);
  mesh.userData = { type: 'note', name: 'NOTE', note };
  mesh.receiveShadow = true;
  scene.add(mesh);
  interactives.push(mesh);
  notes.set(note.id, mesh);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  for (const word of words) {
    const test = `${line}${word} `;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = `${word} `;
      y += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, y);
}

function uiOpen() {
  return !promptBox.classList.contains('hidden') || !terminalBox.classList.contains('hidden');
}

function onKeyDown(event) {
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  keys[event.code] = true;
  if (!joined || !initialized) return;
  if (event.code === 'KeyT' && !uiOpen()) { event.preventDefault(); openPrompt('LOCAL CHAT', 'chat'); }
  if (event.code === 'KeyN' && !uiOpen()) { event.preventDefault(); openPrompt('LEAVE NOTE', 'note'); }
  if (event.code === 'KeyE' && !uiOpen()) interact();
  if (event.code === 'KeyM') toggleAudio();
}

function openPrompt(title, mode) {
  controls.unlock();
  promptMode = mode;
  promptTitle.textContent = title;
  promptText.value = '';
  promptBox.classList.remove('hidden');
  setTimeout(() => promptText.focus(), 20);
}

promptCancel.onclick = () => {
  promptBox.classList.add('hidden');
  promptMode = null;
};
promptOk.onclick = () => {
  const text = promptText.value.trim();
  if (!text) return;
  if (promptMode === 'chat') ws.send(JSON.stringify({ type: 'chat', text }));
  if (promptMode === 'note') ws.send(JSON.stringify({ type: 'note', text, x: camera.position.x, z: camera.position.z }));
  promptBox.classList.add('hidden');
  promptMode = null;
};
promptText.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    promptOk.click();
  }
});

function interact() {
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = ray.intersectObjects(interactives, false);
  if (!hits.length || hits[0].distance > 2.8) return;
  const data = hits[0].object.userData;
  if (data.type === 'terminal') openTerminal(data);
  if (data.type === 'note') addFeed(`NOTE // ${data.note.author}: ${data.note.text}`, true, 14000);
}

function openTerminal(data) {
  activeTerminal = data;
  controls.unlock();
  terminalTitle.textContent = data.title;
  terminalBox.classList.remove('hidden');
  terminalInput.value = '';
  renderTerminal(data.id);
}

function renderTerminal(id) {
  const entries = terminalData[id] || [];
  terminalLog.textContent = entries.length
    ? entries.map(entry => `${new Date(entry.at).toLocaleString()}  ${entry.author}\n${entry.text}\n`).join('\n')
    : 'NO ENTRIES\n';
  terminalLog.scrollTop = terminalLog.scrollHeight;
}

terminalClose.onclick = () => {
  terminalBox.classList.add('hidden');
  activeTerminal = null;
};
terminalWrite.onclick = () => {
  const text = terminalInput.value.trim();
  if (!text || !activeTerminal) return;
  ws.send(JSON.stringify({ type: 'terminalWrite', terminalId: activeTerminal.id, text }));
  terminalInput.value = '';
};

function canMoveTo(position) {
  if (Math.abs(position.x) > WORLD_SOFT_LIMIT || Math.abs(position.z) > WORLD_SOFT_LIMIT) return false;
  if (pointInsidePond(position.x, position.z, 0.90)) return false;
  const y = terrainHeight(position.x, position.z);
  const currentGround = terrainHeight(camera.position.x, camera.position.z);
  if (Math.abs(y - currentGround) > 0.92) return false;
  const box = new THREE.Box3(
    new THREE.Vector3(position.x - 0.24, y + 0.08, position.z - 0.24),
    new THREE.Vector3(position.x + 0.24, y + 1.72, position.z + 0.24)
  );
  if (colliders.some(collider => collider.intersectsBox(box))) return false;
  for (const record of loadedChunks.values()) {
    if (record.colliders.some(collider => collider.intersectsBox(box))) return false;
  }
  return true;
}

const moveForwardVec = new THREE.Vector3();
const moveRightVec = new THREE.Vector3();
const moveWish = new THREE.Vector3();

function updateMovement(dt, now) {
  if (!controls.isLocked || uiOpen()) {
    movingLastFrame = false;
    return;
  }

  const forwardInput = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
  const rightInput = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  const moving = !!(forwardInput || rightInput);

  if (moving) {
    camera.getWorldDirection(moveForwardVec);
    moveForwardVec.y = 0;
    if (moveForwardVec.lengthSq() < 0.0001) moveForwardVec.set(0, 0, -1);
    moveForwardVec.normalize();
    moveRightVec.crossVectors(moveForwardVec, camera.up).normalize();
    moveWish.set(0, 0, 0)
      .addScaledVector(moveForwardVec, forwardInput)
      .addScaledVector(moveRightVec, rightInput);
    if (moveWish.lengthSq() > 1) moveWish.normalize();
    moveWish.multiplyScalar(5.3 * dt);

    const tryX = camera.position.clone();
    tryX.x += moveWish.x;
    if (canMoveTo(tryX)) camera.position.x = tryX.x;

    const tryZ = camera.position.clone();
    tryZ.z += moveWish.z;
    if (canMoveTo(tryZ)) camera.position.z = tryZ.z;

    if (now - lastFootstepAt > 470) {
      playFootstep();
      lastFootstepAt = now;
    }
  }

  const ground = terrainHeight(camera.position.x, camera.position.z);
  const bob = moving ? Math.sin(now * 0.012) * 0.016 : 0;
  const targetY = ground + EYE_HEIGHT + bob;
  camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 1 - Math.exp(-dt * 18));
  movingLastFrame = moving;
}

function zoneFromPosition(x, z) {
  if (Math.hypot((x - LAKE.x) / LAKE.rx, (z - LAKE.z) / LAKE.rz) < 1.65) return 'WATER EDGE';
  let dynamicZone = null;
  eachNearbyStructure(x, z, spec => {
    if (dynamicZone) return;
    if (spec.type === 'pond') {
      const d = Math.hypot((x - spec.x) / spec.rx, (z - spec.z) / spec.rz);
      if (d < 1.7) dynamicZone = 'WATER EDGE';
    } else if (Math.hypot(x - spec.x, z - spec.z) < spec.radius + 7) {
      dynamicZone = spec.type === 'cabin' ? 'ABANDONED CABIN' : 'FIELD SHRINE';
    }
  });
  if (dynamicZone) return dynamicZone;
  for (const ruin of RUINS) {
    if (Math.hypot(x - ruin.x, z - ruin.z) < 14 * ruin.scale) return ruin.name;
  }
  for (const terminal of TERMINAL_SITES) {
    if (Math.hypot(x - terminal.x, z - terminal.z) < 8) return 'FIELD TERMINAL';
  }
  const regionX = Math.floor(x / 420);
  const regionZ = Math.floor(z / 420);
  return regionX === 0 && regionZ === 0 ? 'MEADOW' : `FIELD ${regionX}:${regionZ}`;
}

function chooseStalkerAnchor() {
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();
  const candidates = [];
  const seed = intHash(chunkCoord(camera.position.x), chunkCoord(camera.position.z), Math.floor(performance.now() / 15000));
  const rand = mulberry32(seed);
  for (let i = 0; i < 12; i++) {
    const angle = rand() * Math.PI * 2;
    const dist = 40 + rand() * 52;
    const x = camera.position.x + Math.cos(angle) * dist;
    const z = camera.position.z + Math.sin(angle) * dist;
    if (pointInsidePond(x, z, 1.15)) continue;
    const dir = new THREE.Vector3(x - camera.position.x, 0, z - camera.position.z).normalize();
    const dot = forward.dot(dir);
    if (dot < 0.82) candidates.push({ x, z, dist, dot });
  }
  if (!candidates.length) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function spawnStalker(now) {
  const anchor = chooseStalkerAnchor();
  if (!anchor) {
    nextStalkerAt = now + 7000;
    return;
  }
  stalker.anchor = anchor;
  stalker.group.position.set(anchor.x, terrainHeight(anchor.x, anchor.z), anchor.z);
  stalker.group.visible = true;
  stalker.material.opacity = 0;
  stalker.active = true;
  stalker.fading = false;
  stalker.spawnedAt = now;
  playDistantRustle(anchor.x, anchor.z);
}

function beginStalkerFade(now) {
  if (!stalker.active || stalker.fading) return;
  stalker.fading = true;
  stalker.fadeStart = now;
}

function updateStalker(now, dt) {
  if (!stalker) return;
  if (!stalker.active) {
    if (now >= nextStalkerAt) spawnStalker(now);
    return;
  }

  stalker.group.lookAt(camera.position.x, stalker.group.position.y + 1.35, camera.position.z);
  const age = now - stalker.spawnedAt;
  const toStalker = stalker.group.position.clone().sub(camera.position);
  toStalker.y = 0;
  const dist = toStalker.length();
  toStalker.normalize();
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();
  const dot = forward.dot(toStalker);

  if (!stalker.fading) {
    const fadeIn = smoothstep(0, 1800, age);
    const fogFade = smoothstep(100, 25, dist);
    stalker.material.opacity = stalker.maxOpacity * fadeIn * THREE.MathUtils.clamp(fogFade, 0.32, 1);
    if ((dot > 0.975 && age > 900) || dist < 18 || age > 11500) beginStalkerFade(now);
  } else {
    const t = (now - stalker.fadeStart) / 560;
    stalker.material.opacity = stalker.maxOpacity * Math.max(0, 1 - t);
    if (t >= 1) {
      stalker.active = false;
      stalker.fading = false;
      stalker.group.visible = false;
      stalker.material.opacity = 0;
      nextStalkerAt = now + 21000 + Math.random() * 33000;
    }
  }
}

function maybeSignalGlitch(now) {
  if (players.size || now < nextSignalGlitchAt) return;
  nextSignalGlitchAt = now + 42000 + Math.random() * 45000;
  if (Math.random() > 0.62) return;
  clearTimeout(signalGlitchTimer);
  presenceEl.textContent = '1 SIGNAL NEARBY';
  signalGlitchTimer = setTimeout(() => {
    if (!players.size) presenceEl.textContent = 'NO LOCAL SIGNALS';
  }, 480 + Math.random() * 520);
}

function prepareGhostPlayback() {
  if (!worldEchoes.length) return;
  const echo = worldEchoes[worldEchoes.length - 1];
  if (!echo?.points?.length || echo.points.length < 6) return;
  const ghost = playerMesh('', true);
  ghost.visible = false;
  ghostPlayback = { ghost, echo, active: false, startAt: 0, duration: 17000 + Math.random() * 7000 };
}

function startGhost(now) {
  if (!ghostPlayback || ghostPlayback.active) return;
  const points = ghostPlayback.echo.points;
  const farEnough = points.some(point => Math.hypot(point.x - camera.position.x, point.z - camera.position.z) > 22);
  if (!farEnough) {
    nextGhostAt = now + 20000;
    return;
  }
  ghostPlayback.active = true;
  ghostPlayback.startAt = now;
  ghostPlayback.duration = 16000 + Math.random() * 7000;
  ghostPlayback.ghost.visible = true;
}

function updateGhost(now) {
  if (!ghostPlayback) return;
  if (!ghostPlayback.active) {
    if (now >= nextGhostAt && Math.random() < 0.01) startGhost(now);
    return;
  }

  const t = (now - ghostPlayback.startAt) / ghostPlayback.duration;
  if (t >= 1) {
    ghostPlayback.active = false;
    ghostPlayback.ghost.visible = false;
    ghostPlayback.ghost.userData.material.opacity = 0;
    nextGhostAt = now + 70000 + Math.random() * 50000;
    return;
  }

  const points = ghostPlayback.echo.points;
  const f = t * (points.length - 1);
  const i = Math.floor(f);
  const a = points[Math.min(i, points.length - 1)];
  const b = points[Math.min(i + 1, points.length - 1)];
  const localT = f - i;
  const x = THREE.MathUtils.lerp(a.x, b.x, localT);
  const z = THREE.MathUtils.lerp(a.z, b.z, localT);
  ghostPlayback.ghost.position.set(x, terrainHeight(x, z), z);
  if (a && b) ghostPlayback.ghost.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
  const fade = Math.sin(Math.PI * t);
  const dist = Math.hypot(x - camera.position.x, z - camera.position.z);
  ghostPlayback.ghost.userData.material.opacity = dist < 16 ? 0 : 0.14 * fade;
}

function updateWorldEffects(now, dt) {
  updateStalker(now, dt);
  updateGhost(now);
  maybeSignalGlitch(now);

  if (waterNormal) {
    waterNormal.offset.x = (now * 0.000011) % 1;
    waterNormal.offset.y = (now * 0.000006) % 1;
  }

  for (const child of scene.children) {
    if (child.userData?.pollen) {
      child.rotation.y += dt * 0.003;
      child.position.x = Math.sin(now * 0.00008) * 0.8;
      break;
    }
  }
}

function startAudio() {
  if (audioCtx) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    audioEnabled = false;
    audioStateEl.textContent = 'AUDIO UNAVAILABLE';
    return;
  }

  audioCtx = new AudioContextClass();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = audioEnabled ? 0.22 : 0;
  masterGain.connect(audioCtx.destination);

  ambientBus = audioCtx.createGain();
  ambientBus.gain.value = 0.52;
  dryGain = audioCtx.createGain();
  dryGain.gain.value = 0.70;
  reverbGain = audioCtx.createGain();
  reverbGain.gain.value = 0.40;
  ambientBus.connect(dryGain).connect(masterGain);

  const convolver = audioCtx.createConvolver();
  convolver.buffer = createImpulseResponse(audioCtx, 4.8, 2.8);
  ambientBus.connect(convolver).connect(reverbGain).connect(masterGain);

  createWindBed();
  createAmbientPad();
  scheduleBird();
  scheduleBell();
}

function createImpulseResponse(ctx, duration, decay) {
  const length = Math.floor(ctx.sampleRate * duration);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      const envelope = Math.pow(1 - i / length, decay);
      data[i] = (Math.random() * 2 - 1) * envelope;
    }
  }
  return impulse;
}

function createWindBed() {
  const length = audioCtx.sampleRate * 4;
  const buffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    last = last * 0.985 + white * 0.015;
    data[i] = last * 2.4;
  }
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const band = audioCtx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 420;
  band.Q.value = 0.35;
  const gain = audioCtx.createGain();
  gain.gain.value = 0.11;
  const lfo = audioCtx.createOscillator();
  const lfoGain = audioCtx.createGain();
  lfo.frequency.value = 0.07;
  lfoGain.gain.value = 0.035;
  lfo.connect(lfoGain).connect(gain.gain);
  src.connect(band).connect(gain).connect(ambientBus);
  src.start();
  lfo.start();
}

function createAmbientPad() {
  const frequencies = [65.41, 98.00, 146.83, 220.00];
  frequencies.forEach((frequency, index) => {
    const osc = audioCtx.createOscillator();
    osc.type = index % 2 ? 'triangle' : 'sine';
    osc.frequency.value = frequency;
    osc.detune.value = (index - 1.5) * 2.8;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 480 + index * 130;
    const gain = audioCtx.createGain();
    gain.gain.value = index === 0 ? 0.045 : 0.018;
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    lfo.frequency.value = 0.018 + index * 0.006;
    lfoGain.gain.value = index === 0 ? 0.012 : 0.006;
    lfo.connect(lfoGain).connect(gain.gain);
    osc.connect(filter).connect(gain).connect(ambientBus);
    osc.start();
    lfo.start();
  });
}

function scheduleBird() {
  if (!audioCtx) return;
  setTimeout(() => {
    if (audioEnabled && audioCtx?.state === 'running' && Math.random() < 0.72) playBird();
    scheduleBird();
  }, 6500 + Math.random() * 9500);
}

function playBird() {
  const now = audioCtx.currentTime;
  const pan = audioCtx.createStereoPanner();
  pan.pan.value = Math.random() * 1.5 - 0.75;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.014, now + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1500 + Math.random() * 300, now);
  osc.frequency.exponentialRampToValueAtTime(2400 + Math.random() * 500, now + 0.16);
  osc.frequency.exponentialRampToValueAtTime(1750 + Math.random() * 250, now + 0.43);
  osc.connect(gain).connect(pan).connect(ambientBus);
  osc.start(now);
  osc.stop(now + 0.58);
}

function scheduleBell() {
  if (!audioCtx) return;
  setTimeout(() => {
    if (audioEnabled && audioCtx?.state === 'running' && Math.random() < 0.70) playBell();
    scheduleBell();
  }, 36000 + Math.random() * 42000);
}

function playBell() {
  const now = audioCtx.currentTime;
  const pan = audioCtx.createStereoPanner();
  pan.pan.value = Math.random() * 1.2 - 0.6;
  const partials = [196, 392.7, 588.8, 823.4];
  partials.forEach((freq, index) => {
    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq * (0.995 + Math.random() * 0.01);
    const gain = audioCtx.createGain();
    const peak = 0.026 / (index + 1);
    gain.gain.setValueAtTime(peak, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.3 + index * 0.5);
    osc.connect(gain).connect(pan).connect(ambientBus);
    osc.start(now);
    osc.stop(now + 5.2);
  });
}

function playFootstep() {
  if (!audioEnabled || !audioCtx || audioCtx.state !== 'running') return;
  const now = audioCtx.currentTime;
  const buffer = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * 0.08), audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2.2);
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 260 + Math.random() * 90;
  const gain = audioCtx.createGain();
  gain.gain.value = 0.045;
  source.connect(filter).connect(gain).connect(masterGain);
  source.start(now);
}

function playDistantRustle(worldX, worldZ) {
  if (!audioEnabled || !audioCtx || audioCtx.state !== 'running') return;
  const right = new THREE.Vector3();
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();
  right.crossVectors(forward, camera.up).normalize();
  const dir = new THREE.Vector3(worldX - camera.position.x, 0, worldZ - camera.position.z).normalize();
  const panValue = THREE.MathUtils.clamp(right.dot(dir), -0.85, 0.85);

  const now = audioCtx.currentTime;
  const buffer = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * 0.7), audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const env = Math.sin(Math.PI * i / data.length) * Math.pow(1 - i / data.length, 0.8);
    data[i] = (Math.random() * 2 - 1) * env;
  }
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 650;
  filter.Q.value = 0.55;
  const pan = audioCtx.createStereoPanner();
  pan.pan.value = panValue;
  const gain = audioCtx.createGain();
  gain.gain.value = 0.025;
  source.connect(filter).connect(pan).connect(gain).connect(masterGain);
  source.start(now);
}

function toggleAudio() {
  audioEnabled = !audioEnabled;
  audioStateEl.textContent = audioEnabled ? 'AUDIO ON' : 'AUDIO OFF';
  if (masterGain && audioCtx) {
    masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
    masterGain.gain.linearRampToValueAtTime(audioEnabled ? 0.22 : 0, audioCtx.currentTime + 0.18);
  }
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const now = performance.now();

  updateMovement(dt, now);
  refreshWorldChunks(false);
  updateRemotePlayers(dt);
  updateWorldEffects(now, dt);

  if (!Number.isFinite(camera.position.x) || !Number.isFinite(camera.position.z)) {
    camera.position.set(0, terrainHeight(0, 5) + EYE_HEIGHT, 5);
    refreshWorldChunks(true);
  }

  if (sunLight && sunTarget) {
    sunTarget.position.set(camera.position.x, terrainHeight(camera.position.x, camera.position.z), camera.position.z);
    sunLight.position.set(camera.position.x - 58, camera.position.y + 84, camera.position.z + 36);
  }

  currentZone = zoneFromPosition(camera.position.x, camera.position.z);
  roomEl.textContent = currentZone;
  coordsEl.textContent = `${camera.position.x.toFixed(1)} / ${camera.position.z.toFixed(1)}\nSEED 28031997 · v0.8.0`;
  updateHint();

  if (ws?.readyState === WebSocket.OPEN && now - lastMoveSend > 90) {
    const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    ws.send(JSON.stringify({
      type: 'move',
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
      rot: euler.y,
      zone: currentZone
    }));
    lastMoveSend = now;
  }

  renderer.render(scene, camera);
}

function updateHint() {
  if (uiOpen()) {
    hintEl.classList.remove('on');
    return;
  }
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = ray.intersectObjects(interactives, false);
  if (hits.length && hits[0].distance < 2.8) {
    hintEl.textContent = `E  ${hits[0].object.userData.name || 'INTERACT'}`;
    hintEl.classList.add('on');
  } else {
    hintEl.classList.remove('on');
  }
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
}
