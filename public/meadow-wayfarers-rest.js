import * as THREE from 'three';

const SITE = { x: 14, z: 8 };
const ACTIVE_DISTANCE = 360;
const WORLD_SEED = 28031997;
let installed = false;

function fract(v) { return v - Math.floor(v); }
function seeded(n, salt = 0) {
  return fract(Math.sin((n + WORLD_SEED * 0.0001 + salt * 17.71) * 91.345) * 47453.5453);
}

function install(api) {
  if (installed || !api?.scene || !api?.camera || !api?.terrainHeight || !Array.isArray(api?.colliders)) return;
  installed = true;

  const { scene, camera, terrainHeight, colliders, addFeed } = api;
  const root = new THREE.Group();
  root.name = 'EMPTYNET_Meadow_Wayfarers_Rest';
  scene.add(root);

  const wood = new THREE.MeshStandardMaterial({ color: 0x56432f, roughness: 1 });
  const paleWood = new THREE.MeshStandardMaterial({ color: 0x79654a, roughness: 1 });
  const stone = new THREE.MeshStandardMaterial({ color: 0x6b6a62, roughness: 1 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x2b2d2b, roughness: 0.82, metalness: 0.15 });
  const canvas = new THREE.MeshStandardMaterial({ color: 0x716a58, roughness: 1, side: THREE.DoubleSide });
  const cloth = new THREE.MeshStandardMaterial({ color: 0x5d5146, roughness: 1 });
  const skin = new THREE.MeshStandardMaterial({ color: 0x9b765c, roughness: 1 });
  const coat = new THREE.MeshStandardMaterial({ color: 0x4d5249, roughness: 1 });
  const dogMat = new THREE.MeshStandardMaterial({ color: 0x4b4036, roughness: 1 });
  const ember = new THREE.MeshStandardMaterial({
    color: 0xa04f22,
    emissive: 0x6b250c,
    emissiveIntensity: 0.9,
    roughness: 0.72
  });

  const blockers = [];
  const UP = new THREE.Vector3(0, 1, 0);

  function groundY(x, z) {
    return terrainHeight(x, z);
  }

  function addMesh(geometry, material, x, y, z, blocks = false) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    if (blocks) blockers.push(mesh);
    return mesh;
  }

  function groundBox(x, z, sx, sy, sz, material = wood, blocks = true) {
    return addMesh(new THREE.BoxGeometry(sx, sy, sz), material, x, groundY(x, z) + sy / 2, z, blocks);
  }

  // A modest roadside shelter visible almost immediately from the spawn meadow.
  for (const [x, z] of [[10.5, 5.3], [16.4, 5.3], [10.5, 9.8], [16.4, 9.8]]) {
    groundBox(x, z, 0.22, 2.75, 0.22, wood, true);
  }

  const shelterGround = groundY(13.45, 7.55);
  const roof = addMesh(new THREE.BoxGeometry(6.6, 0.14, 5.1), canvas, 13.45, shelterGround + 3.02, 7.55, true);
  roof.rotation.z = -0.035;

  // Bench and a low table for travellers.
  groundBox(12.0, 6.3, 2.4, 0.28, 0.62, paleWood, true);
  groundBox(12.0, 6.3, 0.18, 0.72, 0.18, wood, true);
  groundBox(13.7, 6.3, 0.18, 0.72, 0.18, wood, true);
  groundBox(15.0, 8.5, 1.6, 0.16, 0.75, paleWood, true);
  groundBox(14.45, 8.5, 0.16, 0.68, 0.16, wood, true);
  groundBox(15.55, 8.5, 0.16, 0.68, 0.16, wood, true);

  // Water trough and hitching rail make it read as an ordinary stopping place.
  groundBox(18.0, 7.4, 2.8, 0.58, 0.78, wood, true);
  const troughWater = addMesh(
    new THREE.BoxGeometry(2.42, 0.04, 0.48),
    new THREE.MeshStandardMaterial({ color: 0x597b7e, roughness: 0.28, transparent: true, opacity: 0.72 }),
    18.0,
    groundY(18.0, 7.4) + 0.57,
    7.4
  );
  groundBox(18.9, 4.9, 0.18, 1.35, 0.18, wood, true);
  groundBox(15.8, 4.9, 0.18, 1.35, 0.18, wood, true);
  const railY = Math.max(groundY(18.9, 4.9), groundY(15.8, 4.9)) + 0.95;
  addMesh(new THREE.BoxGeometry(3.25, 0.16, 0.16), wood, 17.35, railY, 4.9, true);

  // Small stove/fire ring, intentionally domestic rather than ceremonial.
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const x = 11.0 + Math.cos(a) * 0.62;
    const z = 10.9 + Math.sin(a) * 0.62;
    addMesh(new THREE.DodecahedronGeometry(0.22, 0), stone, x, groundY(x, z) + 0.18, z, true);
  }
  const coals = addMesh(new THREE.CylinderGeometry(0.45, 0.48, 0.08, 12), ember, 11.0, groundY(11.0, 10.9) + 0.13, 10.9);
  const fireLight = new THREE.PointLight(0xff9c59, 0.72, 8, 2);
  fireLight.position.set(11.0, groundY(11.0, 10.9) + 0.72, 10.9);
  root.add(fireLight);

  // Firewood pile and a weathered blanket hanging under the roof.
  for (let i = 0; i < 9; i++) {
    const x = 10.2 + (i % 3) * 0.28;
    const z = 8.7 + Math.floor(i / 3) * 0.25;
    const log = addMesh(new THREE.CylinderGeometry(0.07, 0.08, 0.95, 7), wood, x, groundY(x, z) + 0.12, z, true);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = (seeded(i, 3) - 0.5) * 0.25;
  }
  const blanket = addMesh(new THREE.PlaneGeometry(1.25, 0.82, 4, 2), cloth, 15.8, shelterGround + 2.0, 5.42);
  blanket.rotation.y = Math.PI;

  // Simple iron lantern on the road-facing post.
  const lanternFrame = addMesh(new THREE.BoxGeometry(0.28, 0.42, 0.28), iron, 16.4, groundY(16.4, 5.3) + 2.05, 5.15);
  const lanternGlow = addMesh(
    new THREE.SphereGeometry(0.075, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0xffd3a0, emissive: 0xff8f36, emissiveIntensity: 1.4 }),
    16.4,
    groundY(16.4, 5.3) + 2.05,
    5.15
  );
  const lanternLight = new THREE.PointLight(0xffb16a, 0.55, 7, 2);
  lanternLight.position.copy(lanternGlow.position);
  root.add(lanternLight);

  // Rell, the ordinary caretaker, follows a deterministic work loop.
  const rell = new THREE.Group();
  rell.name = 'Rell_Wayfarers_Rest_Caretaker';
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.62, 4, 8), coat);
  torso.position.y = 0.88;
  rell.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 7), skin);
  head.position.y = 1.48;
  rell.add(head);
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.035, 5, 10), cloth);
  scarf.position.y = 1.29;
  scarf.rotation.x = Math.PI / 2;
  rell.add(scarf);
  root.add(rell);

  // Pip, an old road dog, makes the stop feel inhabited without blocking movement.
  const dog = new THREE.Group();
  dog.name = 'Pip_Road_Dog';
  const dogBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.42, 4, 7), dogMat);
  dogBody.rotation.x = Math.PI / 2;
  dogBody.position.y = 0.28;
  dog.add(dogBody);
  const dogHead = new THREE.Mesh(new THREE.SphereGeometry(0.14, 7, 6), dogMat);
  dogHead.position.set(0, 0.36, 0.32);
  dog.add(dogHead);
  for (const sx of [-0.09, 0.09]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 5), dogMat);
    ear.position.set(sx, 0.52, 0.28);
    dog.add(ear);
  }
  root.add(dog);

  const rellPoints = [
    [12.0, 7.3],
    [17.2, 7.3],
    [10.9, 10.0],
    [15.0, 8.1],
    [13.2, 6.0]
  ];

  const rellCollider = new THREE.Box3();
  colliders.push(rellCollider);

  root.updateMatrixWorld(true);
  blockers.forEach(object => colliders.push(new THREE.Box3().setFromObject(object).expandByScalar(0.03)));

  function updateRell(t) {
    const cycle = 175;
    const p = ((t + 19) % cycle) / cycle * rellPoints.length;
    const i = Math.floor(p) % rellPoints.length;
    const j = (i + 1) % rellPoints.length;
    const u = p - Math.floor(p);
    const eased = u * u * (3 - 2 * u);
    const [ax, az] = rellPoints[i];
    const [bx, bz] = rellPoints[j];
    const x = THREE.MathUtils.lerp(ax, bx, eased);
    const z = THREE.MathUtils.lerp(az, bz, eased);
    rell.position.set(x, groundY(x, z), z);
    rell.rotation.y = Math.atan2(bx - ax, bz - az);
    rell.position.y += Math.sin(t * 2.2) * 0.008;
    rell.updateMatrixWorld(true);
    rellCollider.setFromObject(rell).expandByScalar(0.04);
  }

  function updateDog(t) {
    const a = t * 0.12 + 1.7;
    const x = 13.8 + Math.cos(a) * 2.2;
    const z = 9.2 + Math.sin(a * 0.86) * 1.5;
    dog.position.set(x, groundY(x, z), z);
    dog.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a * 0.86) * 0.86);
    dogHead.position.y = 0.36 + Math.sin(t * 1.4) * 0.018;
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
    updateRell(t);
    updateDog(t);
    coals.material.emissiveIntensity = 0.78 + Math.sin(t * 4.3) * 0.11;
    fireLight.intensity = 0.64 + Math.sin(t * 4.0) * 0.09;
    lanternLight.intensity = 0.48 + Math.sin(t * 1.8) * 0.05;
    blanket.rotation.z = Math.sin(t * 0.9) * 0.025;

    const near = distance < 18;
    if (near && !wasNear && addFeed) {
      addFeed("A wayfarers' shelter sits just off the meadow road. Rell keeps water in the trough and a low fire under the roof; Pip circles the benches before settling again.");
    }
    wasNear = near;
  }

  requestAnimationFrame(tick);
}

if (window.EMPTYNET_WORLD_API) install(window.EMPTYNET_WORLD_API);
window.addEventListener('emptynet:world-ready', event => install(event.detail), { once: true });
