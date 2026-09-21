import * as THREE from 'three';

const SITE = { x: -742, z: 862 };
const ACTIVE_DISTANCE = 560;
let installed = false;

function install(api) {
  if (installed || !api?.scene || !api?.camera || !api?.terrainHeight || !Array.isArray(api?.colliders)) return;
  installed = true;
  const { scene, camera, terrainHeight, colliders, addFeed } = api;
  const root = new THREE.Group();
  root.name = 'EMPTYNET_Greyfold_Roadside_Apiary';
  root.position.set(SITE.x, terrainHeight(SITE.x, SITE.z), SITE.z);
  root.rotation.y = -0.24;
  scene.add(root);

  const wood = new THREE.MeshStandardMaterial({ color: 0x493625, roughness: 1 });
  const paleWood = new THREE.MeshStandardMaterial({ color: 0x75634a, roughness: 1 });
  const straw = new THREE.MeshStandardMaterial({ color: 0x8b7950, roughness: 1 });
  const stone = new THREE.MeshStandardMaterial({ color: 0x55564f, roughness: 1 });
  const wax = new THREE.MeshStandardMaterial({ color: 0xb08a3f, roughness: 0.82 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x24231d, roughness: 1 });
  const blocking = [];

  function mesh(geo, mat, x, y, z, blocks = false) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    root.add(m);
    if (blocks) blocking.push(m);
    return m;
  }

  // A small roadside apiary supplying wax and honey to Greyfold households.
  for (let i = 0; i < 4; i++) {
    const x = -3.0 + i * 2.0;
    mesh(new THREE.BoxGeometry(1.35, 0.18, 1.15), wood, x, 0.36, 0.7, true);
    for (const sx of [-0.48, 0.48]) mesh(new THREE.BoxGeometry(0.12, 0.58, 0.12), wood, x + sx, 0.16, 0.7, true);
    const hive = mesh(new THREE.CylinderGeometry(0.55, 0.72, 1.28, 10), straw, x, 1.10, 0.7, true);
    hive.scale.y = 1 + (i % 2) * 0.06;
    mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.10, 8), dark, x, 0.87, 1.27);
  }

  // Low split-rail boundary and a working bench; enough collision to read as physical space.
  for (const z of [-2.6, 3.7]) {
    for (const x of [-4.6, 4.6]) mesh(new THREE.CylinderGeometry(0.09, 0.12, 1.7, 7), wood, x, 0.85, z, true);
    for (const y of [0.65, 1.18]) {
      const rail = mesh(new THREE.CylinderGeometry(0.07, 0.09, 9.2, 7), wood, 0, y, z, true);
      rail.rotation.z = Math.PI / 2;
    }
  }
  mesh(new THREE.BoxGeometry(2.5, 0.18, 0.72), paleWood, 2.8, 0.82, -1.4, true);
  for (const x of [1.85, 3.75]) mesh(new THREE.BoxGeometry(0.15, 0.82, 0.15), wood, x, 0.41, -1.4, true);
  mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.58, 10), wax, 2.25, 1.19, -1.4);
  mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.42, 10), wax, 3.05, 1.11, -1.4);
  mesh(new THREE.BoxGeometry(0.82, 0.16, 0.58), straw, 3.55, 1.00, -1.4);

  // Smoker stones and a weathered water crock imply maintenance without staging a spectacle.
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2;
    mesh(new THREE.DodecahedronGeometry(0.20, 0), stone, -3.25 + Math.cos(a) * 0.55, 0.16, -1.25 + Math.sin(a) * 0.55, true);
  }
  mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.65, 9), paleWood, -3.25, 0.43, -1.25, true);

  // Bees are world-space particles in the primary scene, orbiting only their own hives.
  const beeCount = 26;
  const positions = new Float32Array(beeCount * 3);
  const beeGeo = new THREE.BufferGeometry();
  beeGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const bees = new THREE.Points(beeGeo, new THREE.PointsMaterial({ color: 0x2c281d, size: 0.065, sizeAttenuation: true }));
  root.add(bees);

  root.updateMatrixWorld(true);
  for (const m of blocking) colliders.push(new THREE.Box3().setFromObject(m));

  let last = 0;
  let nearbyBefore = false;
  function tick(now) {
    requestAnimationFrame(tick);
    if (now - last < 40) return;
    last = now;
    const dx = camera.position.x - SITE.x;
    const dz = camera.position.z - SITE.z;
    const d = Math.hypot(dx, dz);
    root.visible = d < ACTIVE_DISTANCE;
    if (!root.visible) return;

    const t = now * 0.001;
    for (let i = 0; i < beeCount; i++) {
      const hive = i % 4;
      const hx = -3.0 + hive * 2.0;
      const phase = i * 2.399963;
      const radius = 0.55 + ((i * 17) % 11) * 0.055;
      positions[i * 3] = hx + Math.cos(t * (1.35 + (i % 5) * 0.11) + phase) * radius;
      positions[i * 3 + 1] = 0.95 + Math.sin(t * 1.9 + phase * 1.7) * 0.38 + (i % 3) * 0.08;
      positions[i * 3 + 2] = 0.9 + Math.sin(t * (1.15 + (i % 4) * 0.09) + phase) * radius;
    }
    beeGeo.attributes.position.needsUpdate = true;

    const near = d < 20;
    if (near && !nearbyBefore && addFeed) addFeed('Four straw skeps hum beside the Greyfold road. Wax scraps on the bench smell faintly of smoke and honey.');
    nearbyBefore = near;
  }
  requestAnimationFrame(tick);
}

if (window.EMPTYNET_WORLD_API) install(window.EMPTYNET_WORLD_API);
window.addEventListener('emptynet:world-ready', event => install(event.detail));
