import * as THREE from 'three';

const SITE = { x: -686, z: 808 };
const ACTIVE_DISTANCE = 600;
let installed = false;

function install(api) {
  if (installed || !api?.scene || !api?.camera || !api?.terrainHeight || !Array.isArray(api?.colliders)) return;
  installed = true;
  const { scene, camera, terrainHeight, colliders, addFeed } = api;

  const root = new THREE.Group();
  root.name = 'EMPTYNET_Greyfold_Pigeon_Loft';
  root.position.set(SITE.x, terrainHeight(SITE.x, SITE.z), SITE.z);
  root.rotation.y = 0.31;
  scene.add(root);

  const wood = new THREE.MeshStandardMaterial({ color: 0x493629, roughness: 1 });
  const pale = new THREE.MeshStandardMaterial({ color: 0x756650, roughness: 1 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x302b27, roughness: 1 });
  const stone = new THREE.MeshStandardMaterial({ color: 0x555650, roughness: 1 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x201f1c, roughness: 1 });
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

  // A practical loft used by Greyfold households to exchange short messages with nearby settlements.
  for (const x of [-1.35, 1.35]) for (const z of [-1.0, 1.0]) {
    mesh(new THREE.BoxGeometry(0.22, 3.3, 0.22), wood, x, 1.65, z, true);
    mesh(new THREE.BoxGeometry(0.48, 0.24, 0.48), stone, x, 0.12, z, true);
  }
  mesh(new THREE.BoxGeometry(3.3, 0.24, 2.6), pale, 0, 2.75, 0, true);
  mesh(new THREE.BoxGeometry(3.05, 1.9, 2.35), wood, 0, 3.72, 0, true);
  const roof = mesh(new THREE.ConeGeometry(2.55, 1.35, 4), roofMat, 0, 5.28, 0, true);
  roof.rotation.y = Math.PI / 4;

  // Landing shelf and individual dark openings make the building readable from the road.
  mesh(new THREE.BoxGeometry(3.0, 0.14, 0.72), pale, 0, 3.48, 1.48, true);
  for (let row = 0; row < 2; row++) for (let col = 0; col < 4; col++) {
    mesh(new THREE.BoxGeometry(0.38, 0.34, 0.08), dark, -1.02 + col * 0.68, 3.76 + row * 0.58, 1.19);
  }

  // Feed bin, water crock and a battered stool keep the site mundane rather than monumental.
  mesh(new THREE.BoxGeometry(1.15, 0.72, 0.82), pale, -2.15, 0.36, 0.4, true);
  mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.58, 10), stone, 2.05, 0.29, 0.6, true);
  mesh(new THREE.BoxGeometry(0.72, 0.12, 0.62), pale, 1.85, 0.62, -1.25, true);
  for (const x of [1.58, 2.12]) mesh(new THREE.BoxGeometry(0.11, 0.62, 0.11), wood, x, 0.31, -1.25, true);

  // World-space birds: deterministic local flights, never camera-relative and never a second render layer.
  const birdCount = 9;
  const birds = [];
  for (let i = 0; i < birdCount; i++) {
    const body = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.11, 7, 5), dark);
    torso.scale.set(1.25, 0.72, 0.72);
    body.add(torso);
    const wingGeo = new THREE.PlaneGeometry(0.27, 0.09);
    const left = new THREE.Mesh(wingGeo, dark);
    const right = new THREE.Mesh(wingGeo, dark);
    left.position.x = -0.14; right.position.x = 0.14;
    body.add(left, right);
    root.add(body);
    birds.push({ body, left, right, phase: i * 2.399963, radius: 2.5 + (i % 4) * 0.8, height: 5.0 + (i % 3) * 0.55 });
  }

  root.updateMatrixWorld(true);
  for (const m of blocking) colliders.push(new THREE.Box3().setFromObject(m).expandByScalar(0.03));

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
    birds.forEach((bird, i) => {
      const speed = 0.16 + (i % 4) * 0.012;
      const a = t * speed + bird.phase;
      const r = bird.radius + Math.sin(t * 0.31 + bird.phase) * 0.35;
      bird.body.position.set(Math.cos(a) * r, bird.height + Math.sin(a * 2.1) * 0.38, Math.sin(a) * r);
      bird.body.rotation.y = -a;
      const flap = Math.sin(t * (7.0 + (i % 3) * 0.45) + bird.phase) * 0.65;
      bird.left.rotation.z = flap;
      bird.right.rotation.z = -flap;
    });

    const near = d < 22;
    if (near && !nearbyBefore && addFeed) addFeed('A raised pigeon loft stands above the Greyfold verge. A slate by the feed bin lists Blackpine, High Village, and three household names in chalk.');
    nearbyBefore = near;
  }
  requestAnimationFrame(tick);
}

if (window.EMPTYNET_WORLD_API) install(window.EMPTYNET_WORLD_API);
window.addEventListener('emptynet:world-ready', event => install(event.detail));
