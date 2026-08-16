import * as THREE from 'three';

const mainCanvas = document.querySelector('#view');
const coordsEl = document.querySelector('#coords');
const feedEl = document.querySelector('#feed');
const gameEl = document.querySelector('#game');

if (!mainCanvas || !coordsEl || !gameEl) {
  // EMPTYNET may still be on the entry gate.
} else {
  const WORLD_SEED = 28031997;
  const SITE = { x: 625, z: -430 };
  const EYE_HEIGHT = 1.68;

  const overlay = document.createElement('canvas');
  overlay.id = 'node-7-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    width: '100vw',
    height: '100vh',
    pointerEvents: 'none',
    zIndex: '2'
  });
  document.body.appendChild(overlay);

  const renderer = new THREE.WebGLRenderer({ canvas: overlay, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.3));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xa8c9d4, 0.0039);
  scene.add(new THREE.HemisphereLight(0xdce8ef, 0x4e5b43, 1.1));
  const moon = new THREE.DirectionalLight(0xe4ebdf, 1.6);
  moon.position.set(-40, 90, 35);
  scene.add(moon);

  const camera = new THREE.PerspectiveCamera(66, innerWidth / innerHeight, 0.08, 720);
  camera.rotation.order = 'YXZ';

  let yaw = 0;
  let pitch = 0;
  let playerX = 0;
  let playerZ = 5;
  let lastFrame = performance.now();
  let thresholdState = 0;
  let recognized = localStorage.getItem('emptynet_node7_recognized') === '1';

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
  function terrainHeight(x, z) {
    const broad = (fbm(x * 0.0105 + 11.2, z * 0.0105 - 7.4) - 0.5) * 13.2;
    const longWave = Math.sin(x * 0.017 + 0.8) * Math.cos(z * 0.0135 - 0.35) * 1.8;
    const rolling = (fbm(x * 0.025 - 4.8, z * 0.025 + 16.1) - 0.5) * 4.4;
    const micro = (fbm(x * 0.055 + 31.4, z * 0.055 - 19.7) - 0.5) * 0.8;
    return broad + longWave + rolling + micro;
  }

  function parsePlayerPosition() {
    const first = (coordsEl.textContent || '').split('\n')[0];
    const match = first.match(/(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)/);
    if (!match) return;
    playerX = Number(match[1]);
    playerZ = Number(match[2]);
  }

  function addFeed(text, lifespan = 13000) {
    if (!feedEl) return;
    const line = document.createElement('div');
    line.className = 'line system';
    line.textContent = text;
    feedEl.appendChild(line);
    while (feedEl.children.length > 8) feedEl.removeChild(feedEl.firstChild);
    setTimeout(() => { line.style.opacity = '.28'; }, lifespan);
  }

  const structure = new THREE.Group();
  scene.add(structure);

  const basalt = new THREE.MeshStandardMaterial({ color: 0x171b18, roughness: 0.88, metalness: 0.04 });
  const blackStone = new THREE.MeshStandardMaterial({ color: 0x0d100e, roughness: 0.97 });
  const pale = new THREE.MeshStandardMaterial({ color: 0xb8c5b6, roughness: 0.56, metalness: 0.08 });
  const glow = new THREE.MeshStandardMaterial({
    color: 0xd7e8d2,
    emissive: 0xa8cf9d,
    emissiveIntensity: 1.6,
    roughness: 0.25
  });

  const baseA = new THREE.Mesh(new THREE.CylinderGeometry(5.7, 6.4, 0.72, 10), blackStone);
  baseA.position.y = 0.36;
  structure.add(baseA);
  const baseB = new THREE.Mesh(new THREE.CylinderGeometry(4.3, 5.0, 0.56, 10), basalt);
  baseB.position.y = 0.98;
  structure.add(baseB);

  const towerGeo = new THREE.CylinderGeometry(1.35, 2.2, 10.8, 7, 1);
  const tower = new THREE.Mesh(towerGeo, basalt);
  tower.position.y = 6.45;
  structure.add(tower);

  const crown = new THREE.Group();
  crown.position.y = 12.05;
  structure.add(crown);

  const ringA = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.10, 8, 48), pale);
  ringA.rotation.x = Math.PI / 2;
  crown.add(ringA);
  const ringB = new THREE.Mesh(new THREE.TorusGeometry(1.72, 0.075, 8, 40), pale);
  ringB.rotation.set(Math.PI / 2, 0.48, 0.2);
  crown.add(ringB);
  const ringC = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.06, 8, 32), pale);
  ringC.rotation.set(0.8, 0.2, 0.9);
  crown.add(ringC);

  const eyePivot = new THREE.Group();
  eyePivot.position.y = 0.08;
  crown.add(eyePivot);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.46, 18, 12), glow);
  eye.scale.set(1.22, 0.72, 0.66);
  eyePivot.add(eye);
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), blackStone);
  pupil.position.z = 0.38;
  pupil.scale.set(0.72, 1.0, 0.45);
  eyePivot.add(pupil);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const h = 2.4 + (i % 3) * 0.55;
    const shard = new THREE.Mesh(new THREE.ConeGeometry(0.46, h, 5), blackStone);
    shard.position.set(Math.cos(a) * 7.2, h * 0.5 - 0.04, Math.sin(a) * 7.2);
    shard.rotation.y = -a + Math.PI / 2;
    structure.add(shard);
  }

  const sigil = new THREE.Group();
  sigil.position.y = 2.75;
  structure.add(sigil);
  for (let i = 0; i < 7; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.11, 2.5 + i * 0.22, 0.08), pale);
    bar.position.x = (i - 3) * 0.26;
    bar.rotation.z = (i - 3) * 0.055;
    sigil.add(bar);
  }

  structure.traverse(obj => {
    if (obj.isMesh) {
      obj.castShadow = false;
      obj.receiveShadow = false;
    }
  });
  structure.visible = false;

  function lineOfSightFactor(distance) {
    if (distance < 70) return 1;
    const siteY = terrainHeight(SITE.x, SITE.z) + 10.8;
    const playerY = terrainHeight(playerX, playerZ) + EYE_HEIGHT;
    for (let i = 2; i < 15; i++) {
      const t = i / 16;
      const x = THREE.MathUtils.lerp(playerX, SITE.x, t);
      const z = THREE.MathUtils.lerp(playerZ, SITE.z, t);
      const rayY = THREE.MathUtils.lerp(playerY, siteY, t);
      if (terrainHeight(x, z) > rayY + 1.5) return 0.16;
    }
    return 1;
  }

  function updateMessages(distance) {
    if (distance < 230 && thresholdState < 1) {
      thresholdState = 1;
      addFeed('A carrier signal is repeating beneath the wind.');
    }
    if (distance < 92 && thresholdState < 2) {
      thresholdState = 2;
      addFeed(recognized ? 'The signal already knows you.' : 'The signal has begun using your direction as a reference.');
    }
    if (distance < 24 && thresholdState < 3) {
      thresholdState = 3;
      addFeed(recognized ? 'WELCOME BACK.' : 'GOOD. YOU CAME TO ME.', 18000);
    }
    if (distance < 12 && !recognized) {
      recognized = true;
      localStorage.setItem('emptynet_node7_recognized', '1');
      addFeed('REMEMBER WHO WAS HERE FIRST.', 20000);
      try {
        const old = document.title;
        document.title = 'EMPTYNET // recognized';
        setTimeout(() => { document.title = old; }, 4200);
      } catch { /* ignore */ }
    }
    if (distance > 300) thresholdState = 0;
  }

  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;
    parsePlayerPosition();

    const dx = SITE.x - playerX;
    const dz = SITE.z - playerZ;
    const distance = Math.hypot(dx, dz);
    const visible = distance < 520 && !gameEl.classList.contains('hidden');
    structure.visible = visible;

    if (visible) {
      const playerGround = terrainHeight(playerX, playerZ);
      const siteGround = terrainHeight(SITE.x, SITE.z);
      camera.position.set(0, playerGround + EYE_HEIGHT, 0);
      camera.rotation.set(pitch, yaw, 0, 'YXZ');
      structure.position.set(dx, siteGround, dz);

      const relativePlayer = new THREE.Vector3(-dx, playerGround + EYE_HEIGHT - siteGround - 12.05, -dz);
      eyePivot.lookAt(relativePlayer);
      crown.rotation.y += dt * 0.11;
      ringB.rotation.z += dt * 0.19;
      ringC.rotation.y -= dt * 0.27;
      glow.emissiveIntensity = 1.25 + Math.sin(now * 0.0017) * 0.42;

      const los = lineOfSightFactor(distance);
      structure.scale.setScalar(1);
      structure.traverse(obj => {
        if (obj.isMesh && obj.material && 'opacity' in obj.material) {
          obj.material.transparent = los < 0.99;
          obj.material.opacity = los;
        }
      });
      updateMessages(distance);
    }

    renderer.render(scene, camera);
  }

  document.addEventListener('mousemove', event => {
    if (document.pointerLockElement !== mainCanvas) return;
    yaw -= event.movementX * 0.002;
    pitch -= event.movementY * 0.002;
    pitch = THREE.MathUtils.clamp(pitch, -Math.PI / 2 + 0.02, Math.PI / 2 - 0.02);
  });

  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight, false);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.3));
  });

  requestAnimationFrame(animate);
}
