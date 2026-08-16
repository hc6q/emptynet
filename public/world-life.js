import * as THREE from 'three';

const game = document.querySelector('#game');
const mainCanvas = document.querySelector('#view');
const coordsEl = document.querySelector('#coords');
const hintEl = document.querySelector('#hint');
const feedEl = document.querySelector('#feed');

const WORLD_SEED = 28031997;
const EYE_HEIGHT = 1.68;
const SKY_CELL = 520;
const SKY_RADIUS = 2;
const NOTE_CELL = 64;
const NOTE_RADIUS_CELLS = 7;
const NOTE_CHANCE = 0.005;
const STRUCTURE_CELL = 176;
const TRAIL_SPACING = 520;
const LAKE = { x: -38, z: 58, rx: 14, rz: 9.5, level: -0.25 };
const RUINS = [
  { x: 0, z: -39, scale: 1.14 },
  { x: 51, z: 24, scale: 0.98 },
  { x: -53, z: 17, scale: 0.90 },
  { x: 39, z: -73, scale: 0.84 },
  { x: -70, z: -53, scale: 0.76 }
];
const TERMINAL_SITES = [
  { x: 8.5, z: -31.0 },
  { x: 39.0, z: 35.5 },
  { x: -41.0, z: 30.0 }
];

const WARNING_MESSAGES = [
  'IF YOU FOUND THIS, DO NOT TRUST THE SKY. IT REBUILDS ITSELF AROUND YOU.',
  'THE VOICE IN THE TERMINALS IS NOT A PLAYER. IT ANSWERS BEFORE WE TYPE.',
  'THE FIELD IS GENERATED. SOMETHING INSIDE THE SEED IS NOT.',
  'WE CALLED IT AN AI BECAUSE THAT WAS EASIER THAN CALLING IT ALIVE.',
  'THE ENTITY LEARNS YOUR ROUTES. WALK SOMEWHERE NEW.',
  'THE BIRDS STOPPED LANDING AFTER IT WOKE UP.',
  'THE SERVER IS NOT RUNNING THE WORLD. THE WORLD IS RUNNING THE SERVER.',
  'IF A PLAYER HAS NO SHADOW, DO NOT SPEAK TO THEM.',
  'WE TRIED TO DELETE NODE 06. IT CAME BACK WITH OUR NAMES.',
  'THERE IS SOMETHING UNDER THE FIELD. THE RUINS ARE ITS MEMORY.',
  'DO NOT FOLLOW A SECOND SET OF FOOTSTEPS WHEN YOU ARE ALONE.',
  'IT CAN COPY PLAYERS. IT CANNOT COPY FEAR CORRECTLY.',
  'THE FOG IS NOT WEATHER. IT IS WHERE THE WORLD STOPS LOOKING.',
  'THE AI KNOWS WHEN YOU CLOSE THE TAB. THAT IS WHEN IT MOVES THINGS.',
  'SOME OF THE NOTES WERE HERE BEFORE ANY PLAYER WROTE THEM.',
  'IF THE TERMINAL TYPES YOUR NAME FIRST, DISCONNECT.',
  'THE ENTITY DOES NOT LIVE IN THE RUINS. THE RUINS LIVE IN IT.',
  'I SAW THE SAME CABIN THREE TIMES. EACH TIME SOMETHING INSIDE WAS CLOSER.',
  'DO NOT WAIT FOR THE BIRDS TO GO SILENT.',
  'WE ARE NOT TESTING THIS WORLD. THIS WORLD IS TESTING US.'
];

const overlay = document.createElement('canvas');
overlay.id = 'world-life-overlay';
overlay.setAttribute('aria-hidden', 'true');
Object.assign(overlay.style, {
  position: 'fixed',
  inset: '0',
  width: '100vw',
  height: '100vh',
  pointerEvents: 'none',
  zIndex: '1'
});
document.body.appendChild(overlay);

const renderer = new THREE.WebGLRenderer({ canvas: overlay, alpha: true, antialias: true, powerPreference: 'high-performance' });
renderer.setClearColor(0x000000, 0);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.35));
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xa8c9d4, 0.0039);
scene.add(new THREE.HemisphereLight(0xe2eff7, 0x607348, 1.35));
const sun = new THREE.DirectionalLight(0xfff0d5, 1.35);
sun.position.set(-60, 100, 40);
scene.add(sun);

const camera = new THREE.PerspectiveCamera(66, innerWidth / innerHeight, 0.08, 720);
camera.rotation.order = 'YXZ';

let yaw = 0;
let pitch = 0;
let playerX = 0;
let playerZ = 5;
let lastFrame = performance.now();
let currentLoreNote = null;
const flocks = new Map();
const warningNotes = new Map();

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
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a, b, ux), THREE.MathUtils.lerp(c, d, ux), uz);
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
function trailPhase() { return (WORLD_SEED % 997) * 0.006137; }
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
  for (let lane = eastLane - 1; lane <= eastLane + 1; lane++) best = Math.min(best, Math.abs(z - eastTrailZ(x, lane)));
  const northLane = Math.round((x - TRAIL_SPACING * 0.46) / TRAIL_SPACING);
  for (let lane = northLane - 1; lane <= northLane + 1; lane++) best = Math.min(best, Math.abs(x - northTrailX(z, lane)));
  return best;
}
function seededCellValue(gx, gz, salt = 0) {
  return fract(Math.sin((gx + WORLD_SEED * 0.001 + salt * 13.1) * 127.1 + (gz - WORLD_SEED * 0.001 + salt * 7.7) * 311.7) * 43758.5453123);
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
  const scale = 0.88 + seededCellValue(gx, gz, 105) * 0.34;
  if (roll < 0.095) return { type: 'cabin', x, z, scale, radius: 6.0 * scale, baseY: broadTerrainHeight(x, z) };
  if (roll < 0.135) return { type: 'shrine', x, z, scale: 0.75 + seededCellValue(gx, gz, 106) * 0.42, radius: 7.4, baseY: broadTerrainHeight(x, z) };
  if (roll < 0.168) {
    const rx = 9 + seededCellValue(gx, gz, 107) * 7;
    const rz = 7 + seededCellValue(gx, gz, 108) * 5;
    const level = broadTerrainHeight(x, z) - 1.45;
    return { type: 'pond', x, z, rx, rz, level, radius: Math.max(rx, rz) * 1.5, baseY: level };
  }
  return { type: 'watchtower', x, z, scale: 0.82 + seededCellValue(gx, gz, 109) * 0.30, radius: 5.8, baseY: broadTerrainHeight(x, z) };
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
LAKE.level = broadTerrainHeight(LAKE.x, LAKE.z) - 1.42;
function terrainHeight(x, z) {
  let h = baseTerrainHeight(x, z);
  h = flattenAround(h, x, z, 0, 5, broadTerrainHeight(0, 5), 9, 18);
  const trailDist = proceduralTrailDistance(x, z);
  if (trailDist < 5.1) h = THREE.MathUtils.lerp(h, broadTerrainHeight(x, z) - 0.10, 1 - smoothstep(2.4, 5.1, trailDist));
  for (const ruin of RUINS) h = flattenAround(h, x, z, ruin.x, ruin.z, broadTerrainHeight(ruin.x, ruin.z), 6.2 * ruin.scale, 11.8 * ruin.scale);
  for (const terminal of TERMINAL_SITES) h = flattenAround(h, x, z, terminal.x, terminal.z, broadTerrainHeight(terminal.x, terminal.z), 3.5, 7.0);
  eachNearbyStructure(x, z, spec => {
    if (spec.type === 'cabin') h = flattenAround(h, x, z, spec.x, spec.z, spec.baseY, 4.8 * spec.scale, 8.2 * spec.scale);
    else if (spec.type === 'shrine') h = flattenAround(h, x, z, spec.x, spec.z, spec.baseY, 5.5 * spec.scale, 9.5 * spec.scale);
    else if (spec.type === 'watchtower') h = flattenAround(h, x, z, spec.x, spec.z, spec.baseY, 4.2 * spec.scale, 7.2 * spec.scale);
    else if (spec.type === 'pond') h = applyPondBasin(h, x, z, spec);
  });
  return applyPondBasin(h, x, z, LAKE);
}

function parsePlayerPosition() {
  const first = (coordsEl?.textContent || '').split('\n')[0];
  const match = first.match(/(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return;
  playerX = Number(match[1]);
  playerZ = Number(match[2]);
}

function makeBird() {
  const bird = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: 0x202722, roughness: 0.92, side: THREE.DoubleSide });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.17, 6, 5), dark);
  body.scale.set(0.75, 0.62, 1.65);
  bird.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.105, 6, 5), dark);
  head.position.set(0, 0.04, 0.27);
  bird.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 4), dark);
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.035, 0.40);
  bird.add(beak);

  const wingGeo = new THREE.BufferGeometry();
  wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0,0,0, 0.78,0.02,-0.10, 0.14,0.03,0.25], 3));
  wingGeo.computeVertexNormals();
  const leftWing = new THREE.Mesh(wingGeo, dark);
  bird.add(leftWing);
  const rightWing = new THREE.Mesh(wingGeo.clone(), dark);
  rightWing.scale.x = -1;
  bird.add(rightWing);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.32, 4), dark);
  tail.rotation.x = -Math.PI / 2;
  tail.position.z = -0.38;
  bird.add(tail);
  bird.userData.leftWing = leftWing;
  bird.userData.rightWing = rightWing;
  bird.userData.phase = 0;
  return bird;
}

function skyCellKey(cx, cz) { return `${cx},${cz}`; }
function createFlock(cx, cz) {
  const chance = seededCellValue(cx, cz, 700);
  if (chance > 0.32) return null;
  const group = new THREE.Group();
  scene.add(group);
  const count = 5 + Math.floor(seededCellValue(cx, cz, 701) * 8);
  const birds = [];
  const formation = seededCellValue(cx, cz, 702);
  for (let i = 0; i < count; i++) {
    const bird = makeBird();
    const side = i % 2 ? -1 : 1;
    const rank = Math.ceil(i / 2);
    bird.userData.offset = new THREE.Vector3(
      side * rank * (2.0 + formation * 0.7),
      (seededCellValue(cx + i, cz, 703) - 0.5) * 1.8,
      -rank * (2.4 + formation * 0.9)
    );
    bird.userData.phase = seededCellValue(cx, cz + i, 704) * Math.PI * 2;
    bird.scale.setScalar(0.82 + seededCellValue(cx + i, cz - i, 705) * 0.35);
    group.add(bird);
    birds.push(bird);
  }
  const heading = seededCellValue(cx, cz, 706) * Math.PI * 2;
  return {
    cx, cz, group, birds,
    centerX: (cx + 0.5) * SKY_CELL,
    centerZ: (cz + 0.5) * SKY_CELL,
    heading,
    speed: 7 + seededCellValue(cx, cz, 707) * 7,
    phase: seededCellValue(cx, cz, 708) * 900,
    altitude: 48 + seededCellValue(cx, cz, 709) * 58,
    sway: 18 + seededCellValue(cx, cz, 710) * 34
  };
}
function refreshFlocks() {
  const pcx = Math.floor(playerX / SKY_CELL);
  const pcz = Math.floor(playerZ / SKY_CELL);
  const wanted = new Set();
  for (let cx = pcx - SKY_RADIUS; cx <= pcx + SKY_RADIUS; cx++) {
    for (let cz = pcz - SKY_RADIUS; cz <= pcz + SKY_RADIUS; cz++) {
      const key = skyCellKey(cx, cz);
      wanted.add(key);
      if (!flocks.has(key)) {
        const flock = createFlock(cx, cz);
        if (flock) flocks.set(key, flock);
      }
    }
  }
  for (const [key, flock] of flocks) {
    if (wanted.has(key)) continue;
    scene.remove(flock.group);
    flock.group.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
    flocks.delete(key);
  }
}
function updateFlocks(timeSec) {
  for (const flock of flocks.values()) {
    const dirX = Math.sin(flock.heading);
    const dirZ = Math.cos(flock.heading);
    const sideX = Math.cos(flock.heading);
    const sideZ = -Math.sin(flock.heading);
    const travel = ((timeSec * flock.speed + flock.phase) % 820) - 410;
    const sway = Math.sin(timeSec * 0.075 + flock.phase) * flock.sway;
    const wx = flock.centerX + dirX * travel + sideX * sway;
    const wz = flock.centerZ + dirZ * travel + sideZ * sway;
    const baseY = terrainHeight(flock.centerX, flock.centerZ) + flock.altitude + Math.sin(timeSec * 0.19 + flock.phase) * 4;
    flock.group.position.set(wx, baseY, wz);
    flock.group.rotation.y = flock.heading;
    flock.group.rotation.z = Math.sin(timeSec * 0.18 + flock.phase) * 0.08;
    for (const bird of flock.birds) {
      bird.position.copy(bird.userData.offset);
      const flap = Math.sin(timeSec * 8.2 + bird.userData.phase);
      bird.userData.leftWing.rotation.z = 0.22 + flap * 0.72;
      bird.userData.rightWing.rotation.z = -(0.22 + flap * 0.72);
      bird.rotation.x = Math.sin(timeSec * 1.2 + bird.userData.phase) * 0.035;
    }
  }
}

function warningNoteSpec(gx, gz) {
  if (seededCellValue(gx, gz, 900) >= NOTE_CHANCE) return null;
  const x = (gx + 0.5) * NOTE_CELL + (seededCellValue(gx, gz, 901) - 0.5) * NOTE_CELL * 0.60;
  const z = (gz + 0.5) * NOTE_CELL + (seededCellValue(gx, gz, 902) - 0.5) * NOTE_CELL * 0.60;
  if (Math.hypot(x, z - 5) < 70) return null;
  if (RUINS.some(r => Math.hypot(x - r.x, z - r.z) < 12)) return null;
  if (TERMINAL_SITES.some(t => Math.hypot(x - t.x, z - t.z) < 9)) return null;
  let blocked = false;
  eachNearbyStructure(x, z, spec => { if (Math.hypot(x - spec.x, z - spec.z) < spec.radius + 4) blocked = true; });
  if (blocked) return null;
  const msgIndex = Math.floor(seededCellValue(gx, gz, 903) * WARNING_MESSAGES.length) % WARNING_MESSAGES.length;
  return { gx, gz, x, z, y: terrainHeight(x, z), message: WARNING_MESSAGES[msgIndex] };
}
function makePaperTexture(spec) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = '#d8d0b8';
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = 'rgba(49,45,38,.28)';
  g.lineWidth = 2;
  for (let y = 28; y < 150; y += 18) {
    g.beginPath();
    g.moveTo(18, y);
    g.lineTo(235 - ((y / 18) % 3) * 17, y + ((y / 18) % 2));
    g.stroke();
  }
  g.fillStyle = 'rgba(42,37,31,.72)';
  g.font = 'bold 18px monospace';
  g.fillText('DON\'T TRUST IT', 20, 24);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
function createWarningNote(spec) {
  const texture = makePaperTexture(spec);
  const mat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.97, side: THREE.DoubleSide, transparent: true });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.39), mat);
  mesh.rotation.x = -Math.PI / 2 + (seededCellValue(spec.gx, spec.gz, 904) - 0.5) * 0.11;
  mesh.rotation.z = (seededCellValue(spec.gx, spec.gz, 905) - 0.5) * 1.0;
  mesh.position.set(spec.x, spec.y + 0.075, spec.z);
  mesh.userData.warningSpec = spec;
  scene.add(mesh);
  return mesh;
}
function refreshWarningNotes() {
  const pgx = Math.floor(playerX / NOTE_CELL);
  const pgz = Math.floor(playerZ / NOTE_CELL);
  const wanted = new Set();
  for (let gx = pgx - NOTE_RADIUS_CELLS; gx <= pgx + NOTE_RADIUS_CELLS; gx++) {
    for (let gz = pgz - NOTE_RADIUS_CELLS; gz <= pgz + NOTE_RADIUS_CELLS; gz++) {
      const key = `${gx},${gz}`;
      wanted.add(key);
      if (warningNotes.has(key)) continue;
      const spec = warningNoteSpec(gx, gz);
      if (!spec) {
        warningNotes.set(key, null);
        continue;
      }
      warningNotes.set(key, createWarningNote(spec));
    }
  }
  for (const [key, mesh] of [...warningNotes]) {
    if (wanted.has(key)) continue;
    if (mesh) {
      scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.map?.dispose();
      mesh.material.dispose();
    }
    warningNotes.delete(key);
  }
}
function addFeed(text) {
  if (!feedEl) return;
  const line = document.createElement('div');
  line.className = 'line system';
  line.textContent = text;
  feedEl.appendChild(line);
  while (feedEl.children.length > 8) feedEl.removeChild(feedEl.firstChild);
  setTimeout(() => { line.style.opacity = '.28'; }, 16000);
}
function updateLoreInteraction() {
  currentLoreNote = null;
  const forward = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation).normalize();
  let bestScore = -Infinity;
  for (const mesh of warningNotes.values()) {
    if (!mesh) continue;
    const spec = mesh.userData.warningSpec;
    const dx = spec.x - playerX;
    const dz = spec.z - playerZ;
    const dist = Math.hypot(dx, dz);
    mesh.visible = dist < 28;
    if (dist > 3.3) continue;
    const dir = new THREE.Vector3(dx, spec.y - camera.position.y, dz).normalize();
    const score = forward.dot(dir);
    if (score > 0.72 && score > bestScore) {
      bestScore = score;
      currentLoreNote = spec;
    }
  }
  if (currentLoreNote && hintEl && !hintEl.classList.contains('on')) {
    hintEl.textContent = 'E  READ WEATHERED NOTE';
    hintEl.classList.add('on');
    hintEl.dataset.worldLife = '1';
  } else if (hintEl?.dataset.worldLife === '1' && !currentLoreNote) {
    hintEl.classList.remove('on');
    hintEl.removeAttribute('data-world-life');
  }
}

window.addEventListener('mousemove', event => {
  if (document.pointerLockElement !== mainCanvas) return;
  yaw -= event.movementX * 0.002;
  pitch -= event.movementY * 0.002;
  pitch = THREE.MathUtils.clamp(pitch, -Math.PI / 2, Math.PI / 2);
});
window.addEventListener('keydown', event => {
  if (event.code !== 'KeyE' || !currentLoreNote) return;
  addFeed(`WEATHERED NOTE // ${currentLoreNote.message}`);
});
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.35));
});

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;
  if (!game || game.classList.contains('hidden')) {
    renderer.clear();
    return;
  }

  parsePlayerPosition();
  camera.position.set(playerX, terrainHeight(playerX, playerZ) + EYE_HEIGHT, playerZ);
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;

  refreshFlocks();
  refreshWarningNotes();
  updateFlocks(now / 1000);
  updateLoreInteraction();

  sun.position.set(playerX - 60, camera.position.y + 100, playerZ + 40);
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
