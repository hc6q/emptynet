import * as THREE from 'three';

const SITE = { x: -438, z: 516 };
const ACTIVE_DISTANCE = 620;
const WORLD_SEED = 28031997;
let installed = false;

function fract(v) { return v - Math.floor(v); }
function seeded(n, salt = 0) {
  return fract(Math.sin((n + WORLD_SEED * 0.0001 + salt * 19.73) * 91.345) * 47453.5453);
}

function install(api) {
  if (installed || !api?.scene || !api?.camera || !api?.terrainHeight || !Array.isArray(api?.colliders)) return;
  installed = true;

  const { scene, camera, terrainHeight, colliders, addFeed } = api;
  const root = new THREE.Group();
  root.name = 'EMPTYNET_Greyfold_Coopers_Yard';
  root.position.set(SITE.x, terrainHeight(SITE.x, SITE.z), SITE.z);
  root.rotation.y = -0.31;
  scene.add(root);

  const wood = new THREE.MeshStandardMaterial({ color: 0x5b422d, roughness: 1 });
  const paleWood = new THREE.MeshStandardMaterial({ color: 0x80684c, roughness: 1 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x292a28, roughness: 0.82, metalness: 0.14 });
  const stone = new THREE.MeshStandardMaterial({ color: 0x69665d, roughness: 1 });
  const canvas = new THREE.MeshStandardMaterial({ color: 0x746c58, roughness: 1, side: THREE.DoubleSide });
  const ember = new THREE.MeshStandardMaterial({ color: 0x9f4e1f, emissive: 0x5f1f08, emissiveIntensity: 0.85, roughness: 0.75 });
  const cloth = new THREE.MeshStandardMaterial({ color: 0x66584a, roughness: 1 });
  const blockers = [];

  function mesh(geometry, material, x, y, z, blocks = false) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z);
    object.castShadow = true;
    object.receiveShadow = true;
    root.add(object);
    if (blocks) blockers.push(object);
    return object;
  }

  // Open-fronted work shed facing the road.
  for (const x of [-3.25, 3.25]) {
    for (const z of [-1.65, 1.65]) mesh(new THREE.BoxGeometry(0.22, 2.8, 0.22), wood, x, 1.4, z, true);
  }
  const roof = mesh(new THREE.BoxGeometry(7.2, 0.14, 4.0), canvas, 0, 3.0, 0, true);
  roof.rotation.z = -0.045;
  mesh(new THREE.BoxGeometry(6.1, 0.24, 0.95), wood, -0.15, 0.92, -0.72, true);

  // Hoop-heating brazier: resin from Blackpine is used to seal completed vessels.
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    mesh(new THREE.DodecahedronGeometry(0.22, 0), stone, 1.7 + Math.cos(angle) * 0.58, 0.2, 2.0 + Math.sin(angle) * 0.58, true);
  }
  const coals = mesh(new THREE.CylinderGeometry(0.43, 0.48, 0.09, 12), ember, 1.7, 0.15, 2.0);
  const brazierLight = new THREE.PointLight(0xff9a53, 0.7, 8, 2);
  brazierLight.position.set(1.7, 0.65, 2.0);
  root.add(brazierLight);

  function barrel(x, z, scale = 1, finished = true) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    root.add(g);

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.52 * scale, 0.58 * scale, 1.18 * scale, 12), finished ? paleWood : wood);
    body.position.y = 0.59 * scale;
    body.castShadow = body.receiveShadow = true;
    g.add(body);

    for (const y of [0.18, 0.58, 0.98]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55 * scale, 0.034 * scale, 6, 16), iron);
      ring.position.y = y * scale;
      ring.rotation.x = Math.PI / 2;
      g.add(ring);
    }
    blockers.push(body);
    return g;
  }

  barrel(2.65, -0.65, 1.0, true);
  barrel(3.05, 0.85, 0.88, true);
  barrel(-2.75, 1.05, 0.82, false);
  barrel(-1.25, 1.75, 0.72, true);

  // Loose staves and iron hoops waiting for assembly.
  mesh(new THREE.BoxGeometry(3.4, 0.15, 0.75), wood, -2.0, 0.54, 2.45, true);
  for (let i = 0; i < 10; i++) {
    const stave = mesh(new THREE.BoxGeometry(0.18, 0.055, 1.32), paleWood, -3.35 + i * 0.30, 0.73 + (i % 2) * 0.025, 2.45);
    stave.rotation.y = (i - 5) * 0.018;
  }
  for (let i = 0; i < 4; i++) {
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.56 + i * 0.025, 0.025, 5, 18), iron);
    hoop.rotation.x = Math.PI / 2;
    hoop.position.set(-0.45 + i * 0.09, 0.83 + i * 0.06, -0.72);
    root.add(hoop);
  }

  // Mallets, drawknife and a shaving pile provide a visible work process.
  for (let i = 0; i < 3; i++) {
    const handle = mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.78, 6), wood, -0.85 + i * 0.42, 1.18, -0.66);
    handle.rotation.z = Math.PI / 2;
    const head = mesh(new THREE.BoxGeometry(0.24, 0.11, 0.11), iron, -0.85 + i * 0.42, 1.18, -0.98);
    head.rotation.y = 0.12 * (i - 1);
  }
  for (let i = 0; i < 16; i++) {
    const shaving = mesh(new THREE.BoxGeometry(0.06, 0.018, 0.5 + seeded(i, 3) * 0.45), paleWood,
      -1.6 + seeded(i, 4) * 2.2, 0.035 + seeded(i, 5) * 0.025, -1.55 + seeded(i, 6) * 0.85);
    shaving.rotation.y = seeded(i, 7) * Math.PI;
  }

  // Fenner, Greyfold's cooper, follows his own short work loop.
  const worker = new THREE.Group();
  worker.name = 'Fenner_the_Cooper';
  const coat = new THREE.MeshStandardMaterial({ color: 0x4f493c, roughness: 1 });
  const skin = new THREE.MeshStandardMaterial({ color: 0x9b765c, roughness: 1 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.62, 4, 8), coat);
  torso.position.y = 0.88;
  worker.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 7), skin);
  head.position.y = 1.48;
  worker.add(head);
  const apron = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.52, 0.06), cloth);
  apron.position.set(0, 0.84, 0.21);
  worker.add(apron);
  const mallet = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.55, 6), wood);
  mallet.position.set(0.28, 0.95, 0);
  mallet.rotation.z = -0.35;
  worker.add(mallet);
  root.add(worker);

  const workerPoints = [
    new THREE.Vector3(-0.9, 0, -0.1),
    new THREE.Vector3(2.15, 0, -0.2),
    new THREE.Vector3(1.6, 0, 1.55),
    new THREE.Vector3(-2.2, 0, 1.85),
    new THREE.Vector3(-0.5, 0, -0.7)
  ];
  const workerCollider = new THREE.Box3();
  colliders.push(workerCollider);

  root.updateMatrixWorld(true);
  blockers.forEach(object => colliders.push(new THREE.Box3().setFromObject(object).expandByScalar(0.03)));

  function updateWorker(timeSeconds) {
    const cycle = 150;
    const phase = ((timeSeconds + 37) % cycle) / cycle;
    const scaled = phase * workerPoints.length;
    const index = Math.floor(scaled) % workerPoints.length;
    const next = (index + 1) % workerPoints.length;
    const localT = scaled - Math.floor(scaled);
    const eased = localT * localT * (3 - 2 * localT);
    const a = workerPoints[index];
    const b = workerPoints[next];
    const lx = THREE.MathUtils.lerp(a.x, b.x, eased);
    const lz = THREE.MathUtils.lerp(a.z, b.z, eased);

    const worldPoint = new THREE.Vector3(lx, 0, lz).applyAxisAngle(new THREE.Vector3(0, 1, 0), root.rotation.y);
    const wx = SITE.x + worldPoint.x;
    const wz = SITE.z + worldPoint.z;
    const wy = terrainHeight(wx, wz) - root.position.y;

    worker.position.set(lx, wy, lz);
    worker.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
    worker.position.y += Math.sin(timeSeconds * 2.2) * 0.012;

    const workBeat = Math.max(0, Math.sin(timeSeconds * 3.1));
    mallet.rotation.z = -0.35 - workBeat * 0.75;

    worker.updateMatrixWorld(true);
    workerCollider.setFromObject(worker).expandByScalar(0.04);
  }

  let last = 0;
  let wasNear = false;
  function tick(now) {
    requestAnimationFrame(tick);
    if (now - last < 40) return;
    last = now;

    const distance = Math.hypot(camera.position.x - SITE.x, camera.position.z - SITE.z);
    root.visible = distance < ACTIVE_DISTANCE;
    if (!root.visible) return;

    const t = Date.now() * 0.001;
    updateWorker(t);
    coals.material.emissiveIntensity = 0.72 + Math.sin(t * 4.3) * 0.10;
    brazierLight.intensity = 0.62 + Math.sin(t * 4.1) * 0.08;

    const near = distance < 24;
    if (near && !wasNear && addFeed) {
      addFeed("Fenner's cooper yard smells of hot iron and fresh shavings. Chalk marks reserve barrels for Vessa's dyehouse, the apiary and the Blackpine resin road.");
    }
    wasNear = near;
  }

  requestAnimationFrame(tick);
}

if (window.EMPTYNET_WORLD_API) install(window.EMPTYNET_WORLD_API);
window.addEventListener('emptynet:world-ready', event => install(event.detail), { once: true });
