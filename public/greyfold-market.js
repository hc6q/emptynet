import * as THREE from 'three';

// Greyfold's market green makes the settlement feel economically connected:
// produce, pottery, wool and bread change hands here whether or not a visitor is watching.
const SITE = { x: -932, z: 956 };
const ACTIVE_DISTANCE = 560;
const CYCLE_MS = 420000;
let installed = false;

function install(api) {
  if (installed || !api?.scene || !api?.camera || !api?.terrainHeight || !Array.isArray(api?.colliders)) return;
  installed = true;

  const { scene, camera, terrainHeight, colliders, addFeed } = api;
  const root = new THREE.Group();
  root.name = 'EMPTYNET_Greyfold_Market_Green';
  root.position.set(SITE.x, terrainHeight(SITE.x, SITE.z), SITE.z);
  root.rotation.y = -0.18;
  scene.add(root);

  const mats = {
    timber: new THREE.MeshStandardMaterial({ color: 0x4c3929, roughness: 1 }),
    darkWood: new THREE.MeshStandardMaterial({ color: 0x30241c, roughness: 1 }),
    canvasA: new THREE.MeshStandardMaterial({ color: 0x766d58, roughness: 1, side: THREE.DoubleSide }),
    canvasB: new THREE.MeshStandardMaterial({ color: 0x667061, roughness: 1, side: THREE.DoubleSide }),
    canvasC: new THREE.MeshStandardMaterial({ color: 0x755c4f, roughness: 1, side: THREE.DoubleSide }),
    wicker: new THREE.MeshStandardMaterial({ color: 0x88704d, roughness: 1 }),
    greens: new THREE.MeshStandardMaterial({ color: 0x53613f, roughness: 1 }),
    roots: new THREE.MeshStandardMaterial({ color: 0x8b5e3f, roughness: 1 }),
    apples: new THREE.MeshStandardMaterial({ color: 0x76533b, roughness: 1 }),
    clay: new THREE.MeshStandardMaterial({ color: 0x855d49, roughness: 1 }),
    paleClay: new THREE.MeshStandardMaterial({ color: 0xa1785c, roughness: 1 }),
    bread: new THREE.MeshStandardMaterial({ color: 0x8c633c, roughness: 1 }),
    wool: new THREE.MeshStandardMaterial({ color: 0xaaa086, roughness: 1 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x292b29, roughness: 0.8, metalness: 0.18 }),
    skinA: new THREE.MeshStandardMaterial({ color: 0xa87f64, roughness: 1 }),
    skinB: new THREE.MeshStandardMaterial({ color: 0x98715a, roughness: 1 }),
    coatA: new THREE.MeshStandardMaterial({ color: 0x51584b, roughness: 1 }),
    coatB: new THREE.MeshStandardMaterial({ color: 0x5c5144, roughness: 1 }),
    coatC: new THREE.MeshStandardMaterial({ color: 0x4d5059, roughness: 1 })
  };

  const mark = mesh => { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; };
  const box = (w, h, d, mat) => mark(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat));
  const cyl = (r1, r2, h, sides, mat) => mark(new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, sides), mat));
  const sphere = (r, mat, seg = 7) => mark(new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(5, seg - 1)), mat));

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
    const collider = new THREE.Box3().setFromObject(obj).expandByScalar(pad);
    colliders.push(collider);
    return collider;
  }

  function makeStall(x, z, roofMat, yaw = 0) {
    const stall = new THREE.Group();
    stall.position.set(x, localY(x, z), z);
    stall.rotation.y = yaw;
    root.add(stall);

    const table = box(3.2, 0.24, 1.35, mats.darkWood);
    table.position.set(0, 1.03, 0.15);
    stall.add(table);
    addCollider(table, 0.05);

    for (const px of [-1.43, 1.43]) {
      for (const pz of [-0.58, 0.58]) {
        const post = box(0.14, 2.75, 0.14, mats.timber);
        post.position.set(px, 1.38, pz);
        stall.add(post);
        addCollider(post, 0.03);
      }
    }

    const roof = box(3.55, 0.10, 1.75, roofMat);
    roof.position.set(0, 2.74, 0);
    roof.rotation.z = 0.035;
    stall.add(roof);

    const shelf = box(2.7, 0.14, 0.45, mats.timber);
    shelf.position.set(0, 1.63, -0.48);
    stall.add(shelf);
    addCollider(shelf, 0.025);

    return { stall, table, shelf };
  }

  const produce = makeStall(-5.3, 0.8, mats.canvasB, 0.10);
  const pottery = makeStall(0.0, -2.2, mats.canvasC, -0.02);
  const staples = makeStall(5.4, 0.5, mats.canvasA, -0.12);

  function makeBasket(parent, x, y, z, contentsMat, count = 5) {
    const basket = cyl(0.34, 0.42, 0.34, 10, mats.wicker);
    basket.position.set(x, y, z);
    parent.add(basket);
    for (let i = 0; i < count; i++) {
      const item = sphere(0.12 + (i % 2) * 0.018, contentsMat, 6);
      item.scale.y = contentsMat === mats.greens ? 0.65 : 0.9;
      item.position.set(x + ((i % 3) - 1) * 0.16, y + 0.22 + Math.floor(i / 3) * 0.11, z + (i % 2 ? 0.10 : -0.08));
      parent.add(item);
    }
  }

  makeBasket(produce.stall, -0.78, 1.31, 0.10, mats.roots, 6);
  makeBasket(produce.stall, 0.12, 1.31, 0.12, mats.greens, 6);
  makeBasket(produce.stall, 0.92, 1.31, 0.08, mats.apples, 5);

  for (let i = 0; i < 7; i++) {
    const pot = cyl(0.17 + (i % 3) * 0.035, 0.24 + (i % 2) * 0.025, 0.34 + (i % 2) * 0.13, 10, i % 2 ? mats.paleClay : mats.clay);
    pot.position.set(-1.05 + (i % 4) * 0.68, 1.36 + Math.floor(i / 4) * 0.55, i < 4 ? 0.12 : -0.47);
    pottery.stall.add(pot);
  }

  for (let i = 0; i < 5; i++) {
    const loaf = sphere(0.22, mats.bread, 7);
    loaf.scale.set(1.45, 0.62, 0.82);
    loaf.position.set(-1.0 + i * 0.5, 1.36, 0.16 + (i % 2) * 0.08);
    staples.stall.add(loaf);
  }
  const woolBundle = box(0.9, 0.58, 0.72, mats.wool);
  woolBundle.position.set(0.87, 1.38, -0.05);
  staples.stall.add(woolBundle);

  // Central weighing table gives the green a mundane social focus.
  const scaleTable = box(1.65, 0.18, 1.0, mats.darkWood);
  scaleTable.position.set(0.2, localY(0.2, 3.1) + 0.90, 3.1);
  root.add(scaleTable);
  addCollider(scaleTable, 0.05);
  for (const x of [-0.62, 0.62]) {
    for (const z of [2.73, 3.47]) {
      const leg = box(0.12, 0.88, 0.12, mats.timber);
      leg.position.set(x + 0.2, localY(x + 0.2, z) + 0.44, z);
      root.add(leg);
      addCollider(leg, 0.02);
    }
  }
  const beam = box(1.15, 0.08, 0.08, mats.iron);
  beam.position.set(0.2, scaleTable.position.y + 0.72, 3.1);
  root.add(beam);
  const pivot = cyl(0.06, 0.06, 0.62, 7, mats.iron);
  pivot.position.set(0.2, scaleTable.position.y + 0.43, 3.1);
  root.add(pivot);

  function makeVillager(name, skin, coat) {
    const g = new THREE.Group();
    g.name = `EMPTYNET_${name}`;
    const body = cyl(0.24, 0.31, 0.92, 8, coat);
    body.position.y = 0.84;
    g.add(body);
    const head = sphere(0.22, skin, 8);
    head.position.y = 1.48;
    g.add(head);
    const cap = cyl(0.24, 0.20, 0.12, 8, mats.darkWood);
    cap.position.y = 1.68;
    g.add(cap);
    const leftArm = box(0.12, 0.70, 0.12, coat);
    leftArm.position.set(-0.34, 0.91, 0);
    leftArm.rotation.z = -0.10;
    g.add(leftArm);
    const rightArm = leftArm.clone();
    rightArm.position.x = 0.34;
    rightArm.rotation.z = 0.10;
    g.add(rightArm);
    const leftLeg = box(0.13, 0.72, 0.15, mats.darkWood);
    leftLeg.position.set(-0.12, 0.35, 0);
    g.add(leftLeg);
    const rightLeg = leftLeg.clone();
    rightLeg.position.x = 0.12;
    g.add(rightLeg);
    g.userData.leftLeg = leftLeg;
    g.userData.rightLeg = rightLeg;
    return g;
  }

  const orris = makeVillager('Orris_Market_Gardener', mats.skinA, mats.coatA);
  const lena = makeVillager('Lena_Potter', mats.skinB, mats.coatB);
  const visitor = makeVillager('Greyfold_Market_Regular', mats.skinA, mats.coatC);
  root.add(orris, lena, visitor);

  const people = [
    { mesh: orris, phase: 0, points: [[-4.4, 1.5], [-3.7, 2.8], [-1.0, 3.2], [-4.8, 0.2]], speed: 1.00 },
    { mesh: lena, phase: 85000, points: [[0.4, -0.7], [1.6, 1.3], [0.8, 3.3], [-0.7, -0.8]], speed: 0.93 },
    { mesh: visitor, phase: 185000, points: [[4.3, 1.3], [1.8, 3.5], [-3.2, 2.6], [3.6, 0.6]], speed: 1.06 }
  ];

  for (const person of people) {
    person.collider = new THREE.Box3();
    colliders.push(person.collider);
  }

  function sampleLoop(points, timeMs, speed) {
    const cycle = ((timeMs * speed) % CYCLE_MS + CYCLE_MS) % CYCLE_MS;
    const p = cycle / CYCLE_MS * points.length;
    const i = Math.floor(p) % points.length;
    const f = p - Math.floor(p);
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const eased = f * f * (3 - 2 * f);
    return {
      x: THREE.MathUtils.lerp(a[0], b[0], eased),
      z: THREE.MathUtils.lerp(a[1], b[1], eased),
      tx: b[0] - a[0],
      tz: b[1] - a[1],
      moving: f > 0.08 && f < 0.92
    };
  }

  const remarks = [
    'Orris counts the morning baskets twice. The south plots lost more roots to rain than he expected.',
    'Lena has set aside two glazed jugs for Vessa; the dyehouse keeps cracking the cheaper ones.',
    'Someone at the green asks whether Mara brought the coarse wool today. Tovin is paying less for burrs again.',
    'A loaf from Elis changes hands beside the scale before it has fully cooled.',
    'The road talk is ordinary: mud by the east bend, Nessa\'s cider, and whether Iven will make Greyfold before dusk.',
    'Lena argues that High Village clay fires too pale. Orris says a jug only needs to hold water.'
  ];
  let nextRemark = 0;
  let remarkIndex = 0;
  let lastUpdate = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    if (now - lastUpdate < 32) return;
    lastUpdate = now;

    const dx = camera.position.x - SITE.x;
    const dz = camera.position.z - SITE.z;
    const near = dx * dx + dz * dz <= ACTIVE_DISTANCE * ACTIVE_DISTANCE;
    root.visible = near;
    if (!near) {
      for (const person of people) person.collider.makeEmpty();
      return;
    }

    const worldTime = Date.now();
    for (const person of people) {
      const p = sampleLoop(person.points, worldTime + person.phase, person.speed);
      const [wx, wz] = worldXZ(p.x, p.z);
      const wy = terrainHeight(wx, wz);
      person.mesh.position.set(p.x, wy - root.position.y, p.z);
      person.mesh.rotation.y = Math.atan2(p.tx, p.tz) - root.rotation.y;
      const walk = p.moving ? Math.sin((worldTime + person.phase) * 0.0065 * person.speed) * 0.40 : 0;
      person.mesh.userData.leftLeg.rotation.x = walk;
      person.mesh.userData.rightLeg.rotation.x = -walk;
      person.mesh.updateWorldMatrix(true, false);
      person.collider.setFromObject(person.mesh).expandByScalar(0.06);
    }

    if (typeof addFeed === 'function' && now > nextRemark && Math.hypot(dx, dz) < 42) {
      addFeed(remarks[remarkIndex % remarks.length], true, 11000);
      remarkIndex++;
      nextRemark = now + 36000;
    }
  }

  requestAnimationFrame(frame);
}

if (window.EMPTYNET_WORLD_API) install(window.EMPTYNET_WORLD_API);
window.addEventListener('emptynet:world-ready', event => install(event.detail), { once: true });
