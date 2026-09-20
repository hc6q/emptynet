import * as THREE from 'three';

const SITE = { x: 302, z: 214 };
const ACTIVE_DISTANCE = 560;
let installed = false;

function install(api) {
  if (installed || !api?.scene || !api?.camera || !api?.terrainHeight || !Array.isArray(api?.colliders)) return;
  installed = true;
  const { scene, camera, terrainHeight, colliders, addFeed } = api;
  const root = new THREE.Group();
  root.name = 'EMPTYNET_Roadside_Laundry_Crossing';
  root.position.set(SITE.x, terrainHeight(SITE.x, SITE.z), SITE.z);
  root.rotation.y = 0.31;
  scene.add(root);

  const wood = new THREE.MeshStandardMaterial({ color: 0x4b3827, roughness: 1 });
  const stone = new THREE.MeshStandardMaterial({ color: 0x55564e, roughness: 1 });
  const clothA = new THREE.MeshStandardMaterial({ color: 0x8b826f, roughness: 1, side: THREE.DoubleSide });
  const clothB = new THREE.MeshStandardMaterial({ color: 0x5d665d, roughness: 1, side: THREE.DoubleSide });
  const water = new THREE.MeshStandardMaterial({ color: 0x4e6664, roughness: 0.32, metalness: 0.05, transparent: true, opacity: 0.72 });
  const blocking = [];
  const cloths = [];

  function mesh(geo, mat, x, y, z, blockingPart = false) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    root.add(m);
    if (blockingPart) blocking.push(m);
    return m;
  }

  // A mundane washing place beside the road: two troughs fed by a shallow spring.
  mesh(new THREE.CylinderGeometry(2.7, 2.9, 0.34, 18), stone, -1.2, 0.04, 2.1, false).scale.y = 0.22;
  const pool = mesh(new THREE.CircleGeometry(2.45, 24), water, -1.2, 0.11, 2.1);
  pool.rotation.x = -Math.PI / 2;
  for (let i = 0; i < 11; i++) {
    const a = i / 11 * Math.PI * 2;
    mesh(new THREE.DodecahedronGeometry(0.28 + (i % 3) * 0.05, 0), stone, -1.2 + Math.cos(a) * 2.65, 0.22, 2.1 + Math.sin(a) * 2.65, true);
  }

  // Wash bench and two wooden tubs.
  mesh(new THREE.BoxGeometry(3.3, 0.18, 0.72), wood, 2.5, 0.62, 1.4, true);
  for (const x of [1.65, 3.25]) {
    const tub = mesh(new THREE.CylinderGeometry(0.62, 0.56, 0.72, 12, 1, true), wood, x, 0.36, 0.15, true);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.49, 0.49, 0.015, 12), water);
    inner.position.set(x, 0.73, 0.15);
    root.add(inner);
  }

  // Clothesline is physical scenery; posts collide, cloth does not.
  for (const x of [-3.8, 3.8]) mesh(new THREE.CylinderGeometry(0.10, 0.13, 3.2, 7), wood, x, 1.6, -2.4, true);
  const line = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 7.6, 5), wood);
  line.rotation.z = Math.PI / 2;
  line.position.set(0, 2.82, -2.4);
  root.add(line);
  const clothSpecs = [
    [-2.55, 1.25, clothA], [-1.05, 1.05, clothB], [0.45, 1.35, clothA], [2.05, 0.95, clothB]
  ];
  for (const [x, w, mat] of clothSpecs) {
    const c = mesh(new THREE.PlaneGeometry(w, 1.25, 3, 2), mat, x, 2.20, -2.38);
    cloths.push(c);
  }

  // Basket and folded bundles imply regular use without centering the player.
  mesh(new THREE.CylinderGeometry(0.48, 0.38, 0.55, 10, 1, true), wood, 4.15, 0.28, 1.2, true);
  for (let i = 0; i < 3; i++) mesh(new THREE.BoxGeometry(0.72 - i * 0.08, 0.12, 0.48), i % 2 ? clothB : clothA, 2.55, 0.83 + i * 0.12, 1.42);

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

    // Seed-stable wind phase: laundry moves subtly, never as a HUD effect.
    const t = now * 0.001;
    cloths.forEach((c, i) => {
      c.rotation.y = Math.sin(t * 0.72 + i * 1.71) * 0.075;
      c.rotation.x = Math.sin(t * 1.03 + i * 0.83) * 0.035;
    });
    const near = d < 18;
    if (near && !nearbyBefore && addFeed) addFeed('A spring-fed washing place. Someone has left linen drying in the road wind.');
    nearbyBefore = near;
  }
  requestAnimationFrame(tick);
}

if (window.EMPTYNET_WORLD_API) install(window.EMPTYNET_WORLD_API);
window.addEventListener('emptynet:world-ready', event => install(event.detail));
