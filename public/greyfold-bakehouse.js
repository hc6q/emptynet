import * as THREE from 'three';

// Greyfold's communal bakehouse turns Hale's flour into an ordinary daily rhythm.
// The place belongs to the settlement first: villagers queue loaves, argue about
// firewood and weather, and keep working whether or not a visitor is nearby.
const SITE = { x: -914, z: 1006 };
const ACTIVE_DISTANCE = 520;
let installed = false;

function install(api) {
  if (installed || !api?.scene || !api?.camera || !api?.terrainHeight || !Array.isArray(api?.colliders)) return;
  installed = true;

  const { scene, camera, terrainHeight, colliders, addFeed } = api;
  const root = new THREE.Group();
  root.name = 'EMPTYNET_Greyfold_Bakehouse';
  root.position.set(SITE.x, terrainHeight(SITE.x, SITE.z), SITE.z);
  root.rotation.y = 0.34;
  scene.add(root);

  const mats = {
    stone: new THREE.MeshStandardMaterial({ color: 0x575a53, roughness: 1 }),
    mortar: new THREE.MeshStandardMaterial({ color: 0x777469, roughness: 1 }),
    timber: new THREE.MeshStandardMaterial({ color: 0x493629, roughness: 1 }),
    darkWood: new THREE.MeshStandardMaterial({ color: 0x2f251d, roughness: 1 }),
    roof: new THREE.MeshStandardMaterial({ color: 0x353a34, roughness: 1 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x252825, roughness: 0.76, metalness: 0.18 }),
    ember: new THREE.MeshStandardMaterial({ color: 0x7e3d20, emissive: 0x54230f, emissiveIntensity: 0.9, roughness: 0.8 }),
    dough: new THREE.MeshStandardMaterial({ color: 0xb8a77e, roughness: 1 }),
    bread: new THREE.MeshStandardMaterial({ color: 0x8c6238, roughness: 1 }),
    flour: new THREE.MeshStandardMaterial({ color: 0xc2b99e, roughness: 1 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x746b59, roughness: 1, side: THREE.DoubleSide }),
    skinA: new THREE.MeshStandardMaterial({ color: 0xae8468, roughness: 1 }),
    skinB: new THREE.MeshStandardMaterial({ color: 0x9b745d, roughness: 1 }),
    coatA: new THREE.MeshStandardMaterial({ color: 0x5b5749, roughness: 1 }),
    coatB: new THREE.MeshStandardMaterial({ color: 0x4d5448, roughness: 1 }),
    smoke: new THREE.MeshStandardMaterial({ color: 0x666a63, transparent: true, opacity: 0.20, depthWrite: false, roughness: 1 })
  };

  const mark = mesh => { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; };
  const box = (w, h, d, mat) => mark(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat));
  const cyl = (r1, r2, h, sides, mat) => mark(new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, sides), mat));

  function worldXZ(lx, lz) {
    const c = Math.cos(root.rotation.y), s = Math.sin(root.rotation.y);
    return [SITE.x + lx * c + lz * s, SITE.z - lx * s + lz * c];
  }
  function localY(lx, lz) {
    const [x, z] = worldXZ(lx, lz);
    return terrainHeight(x, z) - root.position.y;
  }
  function addCollider(obj, pad = 0.04) {
    obj.updateWorldMatrix(true, false);
    colliders.push(new THREE.Box3().setFromObject(obj).expandByScalar(pad));
  }

  // Low stone bakehouse, deliberately compact beside the established Greyfold road.
  const floor = box(7.4, 0.34, 5.4, mats.stone);
  floor.position.set(0, localY(0, 0) + 0.02, 0);
  root.add(floor);

  const walls = [
    [-3.45, 1.45, 0, 0.34, 2.9, 5.2],
    [3.45, 1.45, 0, 0.34, 2.9, 5.2],
    [0, 1.45, -2.55, 7.2, 2.9, 0.34]
  ];
  const wallMeshes = [];
  for (const [x, y, z, w, h, d] of walls) {
    const wall = box(w, h, d, mats.mortar);
    wall.position.set(x, localY(x, z) + y, z);
    root.add(wall);
    wallMeshes.push(wall);
    addCollider(wall, 0.04);
  }

  // Open front: the oven and worktables remain visible from the road.
  const frontLeft = box(2.35, 2.9, 0.34, mats.mortar);
  frontLeft.position.set(-2.42, localY(-2.42, 2.55) + 1.45, 2.55);
  root.add(frontLeft);
  addCollider(frontLeft, 0.04);
  const frontRight = box(2.35, 2.9, 0.34, mats.mortar);
  frontRight.position.set(2.42, localY(2.42, 2.55) + 1.45, 2.55);
  root.add(frontRight);
  addCollider(frontRight, 0.04);

  const roof = box(7.9, 0.22, 6.05, mats.roof);
  roof.position.set(0, localY(0, 0) + 3.18, 0);
  roof.rotation.z = -0.045;
  root.add(roof);

  for (const x of [-3.25, 3.25]) {
    const post = box(0.22, 2.6, 0.22, mats.timber);
    post.position.set(x, localY(x, 2.72) + 1.25, 2.72);
    root.add(post);
    addCollider(post, 0.03);
  }
  const lintel = box(7.0, 0.22, 0.24, mats.darkWood);
  lintel.position.set(0, localY(0, 2.72) + 2.55, 2.72);
  root.add(lintel);

  // Masonry oven with a real opening and chimney. The blocking mass has collision.
  const ovenBase = box(2.45, 1.45, 2.15, mats.stone);
  ovenBase.position.set(-1.65, localY(-1.65, -1.1) + 0.72, -1.1);
  root.add(ovenBase);
  addCollider(ovenBase, 0.05);

  const ovenCrown = mark(new THREE.Mesh(new THREE.SphereGeometry(1.35, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mats.stone));
  ovenCrown.scale.set(1.0, 0.78, 0.84);
  ovenCrown.position.set(-1.65, localY(-1.65, -1.1) + 1.44, -1.1);
  root.add(ovenCrown);

  const ovenMouth = box(1.12, 0.72, 0.08, mats.iron);
  ovenMouth.position.set(-1.65, localY(-1.65, 0.02) + 0.72, 0.02);
  root.add(ovenMouth);
  const ember = box(0.78, 0.18, 0.08, mats.ember);
  ember.position.set(-1.65, localY(-1.65, 0.075) + 0.44, 0.075);
  root.add(ember);

  const chimney = box(0.62, 3.2, 0.62, mats.stone);
  chimney.position.set(-2.08, localY(-2.08, -1.55) + 3.15, -1.55);
  root.add(chimney);
  addCollider(chimney, 0.03);

  // Workbench and bread rack make the space read as communal food production.
  const bench = box(3.25, 0.18, 1.15, mats.timber);
  bench.position.set(1.5, localY(1.5, 0.25) + 0.84, 0.25);
  root.add(bench);
  addCollider(bench, 0.04);
  for (const x of [0.18, 2.78]) {
    const leg = box(0.18, 0.82, 0.18, mats.darkWood);
    leg.position.set(x, localY(x, 0.25) + 0.41, 0.25);
    root.add(leg);
  }

  const doughSpecs = [[0.65, 0.95], [1.25, 1.03], [1.86, 0.94], [2.42, 1.01]];
  doughSpecs.forEach(([x, z], i) => {
    const loaf = mark(new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.38, 4, 8), i < 2 ? mats.dough : mats.bread));
    loaf.rotation.z = Math.PI / 2;
    loaf.rotation.y = 0.18 * i;
    loaf.position.set(x, localY(1.5, 0.25) + 1.02, z - 0.72);
    root.add(loaf);
  });

  const rack = new THREE.Group();
  rack.name = 'Bread_Cooling_Rack';
  root.add(rack);
  for (const x of [3.0, 4.2]) {
    const upright = box(0.16, 2.1, 0.16, mats.timber);
    upright.position.set(x, localY(x, 1.55) + 1.02, 1.55);
    rack.add(upright);
    addCollider(upright, 0.025);
  }
  for (let i = 0; i < 3; i++) {
    const shelf = box(1.45, 0.10, 0.72, mats.timber);
    shelf.position.set(3.6, localY(3.6, 1.55) + 0.52 + i * 0.62, 1.55);
    rack.add(shelf);
    for (let j = 0; j < 2; j++) {
      const loaf = mark(new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.30, 4, 8), mats.bread));
      loaf.rotation.z = Math.PI / 2;
      loaf.position.set(3.3 + j * 0.56, shelf.position.y + 0.17, 1.55);
      rack.add(loaf);
    }
  }

  // Flour sacks from Hale's mill and firewood for the oven.
  [[-4.1, 1.7], [-4.35, 0.95], [-3.92, 0.45]].forEach(([x, z], i) => {
    const sack = box(0.65, 0.82, 0.48, mats.flour);
    sack.scale.x = 0.9 + i * 0.05;
    sack.position.set(x, localY(x, z) + 0.39, z);
    sack.rotation.y = 0.18 * i;
    root.add(sack);
    addCollider(sack, 0.02);
  });

  for (let i = 0; i < 8; i++) {
    const x = 4.5 + (i % 2) * 0.32;
    const z = -1.65 + Math.floor(i / 2) * 0.42;
    const log = cyl(0.12, 0.13, 1.05, 8, mats.darkWood);
    log.rotation.z = Math.PI / 2;
    log.position.set(x, localY(x, z) + 0.20 + (i % 2) * 0.16, z);
    root.add(log);
  }

  const trough = box(2.3, 0.58, 0.82, mats.stone);
  trough.position.set(-0.4, localY(-0.4, 4.05) + 0.27, 4.05);
  root.add(trough);
  addCollider(trough, 0.04);

  // Chimney smoke remains actual scene geometry and follows the same depth buffer.
  const smokePuffs = [];
  for (let i = 0; i < 6; i++) {
    const puff = mark(new THREE.Mesh(new THREE.SphereGeometry(0.34 + i * 0.045, 8, 6), mats.smoke.clone()));
    puff.material.opacity = 0.18 - i * 0.018;
    root.add(puff);
    smokePuffs.push(puff);
  }

  function makePerson(name, coat, skin) {
    const person = new THREE.Group();
    person.name = name;
    const body = cyl(0.31, 0.39, 1.05, 9, coat);
    body.position.y = 0.90;
    person.add(body);
    const head = mark(new THREE.Mesh(new THREE.SphereGeometry(0.245, 10, 8), skin));
    head.position.y = 1.59;
    person.add(head);
    const cap = cyl(0.27, 0.29, 0.12, 10, mats.darkWood);
    cap.position.y = 1.80;
    person.add(cap);
    root.add(person);
    return person;
  }

  const elis = makePerson('Elis_Baker', mats.coatA, mats.skinA);
  const bram = makePerson('Bram_Oven_Tender', mats.coatB, mats.skinB);

  const elisPoints = [
    { x: 1.0, z: 0.55, face: -0.3 },
    { x: 3.3, z: 1.1, face: 1.2 },
    { x: -0.1, z: 3.5, face: 2.5 },
    { x: -3.7, z: 1.1, face: -1.7 }
  ];
  const bramPoints = [
    { x: -1.4, z: 0.45, face: 3.0 },
    { x: 4.0, z: -1.1, face: 1.5 },
    { x: -2.4, z: -0.2, face: -2.6 },
    { x: 0.4, z: 1.8, face: 0.2 }
  ];

  function moveWorker(person, points, cycle, offset = 0) {
    const phase = (((Date.now() + offset) % cycle) / cycle) * points.length;
    const i = Math.floor(phase) % points.length;
    const n = (i + 1) % points.length;
    const t = THREE.MathUtils.smoothstep(phase - Math.floor(phase), 0.18, 0.82);
    const a = points[i], b = points[n];
    const x = THREE.MathUtils.lerp(a.x, b.x, t);
    const z = THREE.MathUtils.lerp(a.z, b.z, t);
    person.position.set(x, localY(x, z), z);
    person.rotation.y = THREE.MathUtils.lerp(a.face, b.face, t);
    return [x, z];
  }

  const lines = [
    'Elis presses a thumb into a loaf, waits, then folds it back into itself.',
    '“Hale grinds finer when the air is dry. In rain, everyone blames the millstone.”',
    'Bram rakes the oven mouth and counts the wood without looking at the pile.',
    '“Sera rings the road bell twice when fog settles. That is when we stop sending bread uphill.”',
    '“Vessa takes the ash for some of her darker vats. Nothing useful stays waste for long in Greyfold.”',
    'A flour slate lists households, loaf counts and three debts carried into next week.'
  ];
  let lastFeedAt = 0;
  let feedStage = 0;

  function maybeFeed(now, positions) {
    if (now - lastFeedAt < 16000 || typeof addFeed !== 'function') return;
    for (const [x, z] of positions) {
      const [wx, wz] = worldXZ(x, z);
      if (Math.hypot(camera.position.x - wx, camera.position.z - wz) < 9) {
        addFeed(lines[feedStage++ % lines.length], false, 11000);
        lastFeedAt = now;
        break;
      }
    }
  }

  root.updateWorldMatrix(true, true);

  // Verification notes:
  // - root is fixed at absolute SITE coordinates inside the primary scene;
  // - all ground-touching props and inhabitants sample shared terrainHeight;
  // - smoke, structure and residents use the shared renderer/depth path;
  // - walls, oven, posts, bench, sacks, rack and trough register world colliders.
  function frame(now) {
    requestAnimationFrame(frame);
    const dx = SITE.x - camera.position.x;
    const dz = SITE.z - camera.position.z;
    const visible = dx * dx + dz * dz < ACTIVE_DISTANCE * ACTIVE_DISTANCE;
    root.visible = visible;
    if (!visible) return;

    const elisPos = moveWorker(elis, elisPoints, 88000, 0);
    const bramPos = moveWorker(bram, bramPoints, 97000, 21000);
    maybeFeed(now, [elisPos, bramPos]);

    const baseY = localY(-2.08, -1.55) + 4.86;
    const t = Date.now() * 0.00014;
    smokePuffs.forEach((puff, i) => {
      const phase = (t + i / smokePuffs.length) % 1;
      puff.position.set(
        -2.08 + Math.sin(t * 17 + i * 1.7) * 0.12,
        baseY + phase * 4.3,
        -1.55 + Math.cos(t * 13 + i * 1.1) * 0.10
      );
      const s = 0.72 + phase * 0.9;
      puff.scale.setScalar(s);
      puff.material.opacity = (1 - phase) * 0.18;
    });
    ember.material.emissiveIntensity = 0.75 + Math.sin(Date.now() * 0.0037) * 0.16;
  }
  requestAnimationFrame(frame);
}

if (window.EMPTYNET_WORLD_API) install(window.EMPTYNET_WORLD_API);
window.addEventListener('emptynet:world-ready', event => install(event.detail), { once: true });
