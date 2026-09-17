import * as THREE from 'three';

const SITE = { x: 536, z: 72 };
const ACTIVE_DISTANCE = 620;
let installed = false;

function install(api) {
  if (installed || !api?.scene || !api?.camera || !api?.terrainHeight || !Array.isArray(api?.colliders)) return;
  installed = true;

  const { scene, camera, terrainHeight, colliders, addFeed } = api;
  const ground = terrainHeight(SITE.x, SITE.z);
  const root = new THREE.Group();
  root.name = 'EMPTYNET_Roadside_Wagon';
  root.position.set(SITE.x, ground, SITE.z);
  root.rotation.y = -0.38;
  scene.add(root);

  const wood = new THREE.MeshStandardMaterial({ color: 0x4c3927, roughness: 0.96 });
  const darkWood = new THREE.MeshStandardMaterial({ color: 0x30261d, roughness: 1 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x292b29, roughness: 0.78, metalness: 0.28 });
  const canvas = new THREE.MeshStandardMaterial({ color: 0x817966, roughness: 1, side: THREE.DoubleSide });
  const sack = new THREE.MeshStandardMaterial({ color: 0x756b54, roughness: 1 });
  const stone = new THREE.MeshStandardMaterial({ color: 0x55554d, roughness: 1 });

  const blocking = [];
  function mesh(geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, blockingPart = false) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    m.receiveShadow = true;
    root.add(m);
    if (blockingPart) blocking.push(m);
    return m;
  }

  // A delivery wagon left beside an established road, weathered but not ancient.
  mesh(new THREE.BoxGeometry(3.8, 0.34, 2.05), wood, 0, 1.45, 0, 0, 0, 0, true);
  mesh(new THREE.BoxGeometry(3.55, 0.72, 0.18), wood, 0, 1.92, -0.94, 0, 0, 0, true);
  mesh(new THREE.BoxGeometry(3.55, 0.72, 0.18), wood, 0, 1.92, 0.94, 0, 0, 0, true);
  mesh(new THREE.BoxGeometry(0.18, 0.72, 1.75), wood, -1.72, 1.92, 0, 0, 0, 0, true);
  mesh(new THREE.BoxGeometry(0.18, 0.58, 1.75), wood, 1.72, 1.86, 0, 0, 0, 0, true);

  const wheelGeo = new THREE.TorusGeometry(0.84, 0.085, 7, 20);
  for (const x of [-1.18, 1.18]) {
    for (const z of [-1.13, 1.13]) {
      const wheel = mesh(wheelGeo, iron, x, 0.83, z, Math.PI / 2, 0, 0, true);
      for (let i = 0; i < 8; i++) {
        const spoke = mesh(new THREE.BoxGeometry(0.055, 1.42, 0.055), darkWood, x, 0.83, z, Math.PI / 2, 0, i * Math.PI / 4);
        spoke.rotation.order = 'ZXY';
      }
    }
  }

  // Broken shafts point toward the road; one has dropped into the grass.
  mesh(new THREE.BoxGeometry(4.5, 0.12, 0.12), darkWood, 3.55, 1.16, -0.58, 0, 0.04, -0.07, true);
  mesh(new THREE.BoxGeometry(4.25, 0.12, 0.12), darkWood, 3.43, 0.88, 0.60, 0, -0.03, 0.12, true);

  // Simple bowed canvas over the rear half of the wagon.
  for (const x of [-1.45, -0.55, 0.35]) {
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.035, 5, 14, Math.PI), iron);
    hoop.position.set(x, 2.18, 0);
    hoop.rotation.y = Math.PI / 2;
    root.add(hoop);
  }
  const cover = mesh(new THREE.PlaneGeometry(2.2, 2.05, 4, 2), canvas, -0.55, 2.78, 0, -Math.PI / 2, 0, Math.PI / 2);
  cover.geometry.attributes.position.needsUpdate = true;

  // Cargo suggests an interrupted mundane journey rather than a staged mystery.
  mesh(new THREE.BoxGeometry(0.72, 0.52, 0.62), darkWood, -0.82, 1.92, 0.25, 0, 0.18, 0);
  mesh(new THREE.BoxGeometry(0.62, 0.46, 0.55), darkWood, 0.02, 1.86, -0.26, 0, -0.12, 0);
  mesh(new THREE.SphereGeometry(0.36, 7, 6), sack, 0.78, 1.88, 0.30);
  mesh(new THREE.SphereGeometry(0.32, 7, 6), sack, 1.05, 1.82, -0.28);

  // A tiny cold fire ring and a stool make the absence feel recent but ambiguous.
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    mesh(new THREE.DodecahedronGeometry(0.17, 0), stone, -3.15 + Math.cos(a) * 0.62, 0.16, 2.25 + Math.sin(a) * 0.62, 0, a, 0, true);
  }
  mesh(new THREE.CylinderGeometry(0.08, 0.10, 0.92, 6), darkWood, -3.20, 0.24, 2.25, 0, 0, Math.PI / 2);
  mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.78, 6), darkWood, -3.18, 0.23, 2.28, Math.PI / 2, 0, 0.65);
  mesh(new THREE.BoxGeometry(0.72, 0.10, 0.38), wood, -2.05, 0.48, 2.42, 0, 0.18, 0, true);
  for (const dx of [-0.25, 0.25]) mesh(new THREE.BoxGeometry(0.09, 0.52, 0.09), darkWood, -2.05 + dx, 0.24, 2.42, 0, 0, dx * 0.25, true);

  root.updateMatrixWorld(true);
  for (const part of blocking) {
    const box = new THREE.Box3().setFromObject(part);
    if (!box.isEmpty()) colliders.push(box);
  }

  let lastNear = false;
  let lastUpdate = 0;
  function tick(now) {
    requestAnimationFrame(tick);
    if (now - lastUpdate < 50) return;
    lastUpdate = now;
    const dx = camera.position.x - SITE.x;
    const dz = camera.position.z - SITE.z;
    const dist = Math.hypot(dx, dz);
    root.visible = dist < ACTIVE_DISTANCE;
    const near = dist < 10;
    if (near && !lastNear && typeof addFeed === 'function') {
      addFeed('An empty wagon rests off the road. The fire beside it has gone cold.');
    }
    lastNear = near;
  }
  requestAnimationFrame(tick);
}

if (window.EMPTYNET_WORLD_API) install(window.EMPTYNET_WORLD_API);
window.addEventListener('emptynet:world-ready', event => install(event.detail), { once: true });
