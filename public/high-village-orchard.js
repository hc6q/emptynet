import * as THREE from 'three';

// A working orchard on the southeast approach to High Village. It is deliberately
// ordinary infrastructure: fruit, cider and cart repairs, not an anomalous site.
const SITE = { x: 1192, z: 1168 };
const ACTIVE_DISTANCE = 470;
let installed = false;

function install(api) {
  if (installed || !api?.scene || !api?.camera || !api?.terrainHeight || !Array.isArray(api?.colliders)) return;
  installed = true;

  const { scene, camera, terrainHeight, colliders, addFeed } = api;
  const root = new THREE.Group();
  root.name = 'EMPTYNET_High_Village_Orchard';
  root.position.set(SITE.x, terrainHeight(SITE.x, SITE.z), SITE.z);
  root.rotation.y = -0.18;
  scene.add(root);

  const mat = {
    trunk: new THREE.MeshStandardMaterial({ color: 0x49382b, roughness: 1 }),
    branch: new THREE.MeshStandardMaterial({ color: 0x3b3027, roughness: 1 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x516243, roughness: 1 }),
    leafDark: new THREE.MeshStandardMaterial({ color: 0x3f4d38, roughness: 1 }),
    fruit: new THREE.MeshStandardMaterial({ color: 0x70493b, roughness: 0.92 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x65675f, roughness: 1 }),
    stoneDark: new THREE.MeshStandardMaterial({ color: 0x484b46, roughness: 1 }),
    timber: new THREE.MeshStandardMaterial({ color: 0x56402f, roughness: 1 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x2d302d, roughness: 0.8, metalness: 0.18 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x616954, roughness: 1 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xb39175, roughness: 1 }),
    cider: new THREE.MeshStandardMaterial({ color: 0x6f5430, roughness: 0.55 })
  };

  const mark = mesh => { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; };
  const box = (w, h, d, m) => mark(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m));
  const cyl = (rt, rb, h, sides, m) => mark(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, sides), m));

  function worldXZ(lx, lz) {
    const c = Math.cos(root.rotation.y), s = Math.sin(root.rotation.y);
    return [SITE.x + lx * c + lz * s, SITE.z - lx * s + lz * c];
  }

  function localY(lx, lz) {
    const [x, z] = worldXZ(lx, lz);
    return terrainHeight(x, z) - root.position.y;
  }

  function addCollider(object, pad = 0.04) {
    object.updateWorldMatrix(true, false);
    colliders.push(new THREE.Box3().setFromObject(object).expandByScalar(pad));
  }

  function addTree(x, z, scale, fruitPattern) {
    const tree = new THREE.Group();
    tree.position.set(x, localY(x, z), z);
    tree.rotation.y = (x * 0.37 + z * 0.21) % Math.PI;
    root.add(tree);

    const trunk = cyl(0.22 * scale, 0.30 * scale, 2.8 * scale, 8, mat.trunk);
    trunk.position.y = 1.35 * scale;
    tree.add(trunk);

    const limbs = [[-0.55, 2.0, 0.10, 0.72], [0.52, 2.15, -0.12, -0.68], [0.08, 2.32, 0.48, 0.38]];
    for (const [lx, ly, lz, rz] of limbs) {
      const branch = cyl(0.07 * scale, 0.12 * scale, 1.35 * scale, 7, mat.branch);
      branch.position.set(lx * scale, ly * scale, lz * scale);
      branch.rotation.z = rz;
      tree.add(branch);
    }

    const crownSpecs = [[0, 3.15, 0, 1.25], [-0.82, 2.85, 0.18, 0.90], [0.78, 2.92, -0.12, 0.96], [0.05, 2.83, 0.78, 0.84]];
    crownSpecs.forEach(([cx, cy, cz, cs], i) => {
      const crown = mark(new THREE.Mesh(new THREE.DodecahedronGeometry(cs * scale, 1), i % 2 ? mat.leafDark : mat.leaf));
      crown.position.set(cx * scale, cy * scale, cz * scale);
      crown.scale.y = 0.82;
      tree.add(crown);
    });

    for (let i = 0; i < 5; i++) {
      if (((fruitPattern >> i) & 1) === 0) continue;
      const a = i * 2.17 + fruitPattern * 0.31;
      const fruit = mark(new THREE.Mesh(new THREE.SphereGeometry(0.10 * scale, 7, 5), mat.fruit));
      fruit.position.set(Math.cos(a) * 0.82 * scale, (2.68 + (i % 2) * 0.44) * scale, Math.sin(a) * 0.72 * scale);
      tree.add(fruit);
    }

    tree.updateWorldMatrix(true, true);
    addCollider(trunk, 0.05);
  }

  const trees = [
    [-14, -8, 0.96, 27], [-7, -9, 1.04, 21], [0, -9, 0.93, 30], [7, -9, 1.05, 19], [14, -8, 0.98, 29],
    [-13, 1, 1.02, 23], [-6, 0, 0.95, 28], [1, 0, 1.08, 31], [8, 1, 0.94, 22], [14, 2, 1.00, 26],
    [-10, 9, 0.92, 25], [-2, 9, 1.03, 30], [6, 9, 0.97, 21]
  ];
  trees.forEach(t => addTree(...t));

  // Dry-laid roadside wall with a gap toward the village approach.
  const wallSegments = [[-17, -12, 15], [8, -12, 10], [-17, 13, 34]];
  for (const [x, z, len] of wallSegments) {
    const wall = box(len, 0.78, 0.72, mat.stoneDark);
    wall.position.set(x + len * 0.5, localY(x + len * 0.5, z) + 0.28, z);
    root.add(wall);
    addCollider(wall, 0.03);
  }

  // Press yard at the road-facing edge.
  const pressBase = box(4.4, 0.55, 3.8, mat.stone);
  pressBase.position.set(15.5, localY(15.5, 10.5) + 0.18, 10.5);
  root.add(pressBase);
  addCollider(pressBase, 0.05);

  const pressFrame = new THREE.Group();
  pressFrame.position.set(15.5, pressBase.position.y + 0.25, 10.5);
  root.add(pressFrame);
  for (const x of [-1.35, 1.35]) {
    const post = box(0.28, 3.25, 0.32, mat.timber);
    post.position.set(x, 1.55, 0);
    pressFrame.add(post);
  }
  const topBeam = box(3.25, 0.34, 0.38, mat.timber);
  topBeam.position.set(0, 3.0, 0);
  pressFrame.add(topBeam);
  const screw = cyl(0.10, 0.10, 2.1, 8, mat.iron);
  screw.position.set(0, 2.05, 0);
  pressFrame.add(screw);
  const platen = box(1.85, 0.30, 1.75, mat.timber);
  platen.position.set(0, 1.05, 0);
  pressFrame.add(platen);
  const basket = cyl(0.86, 0.92, 0.82, 12, mat.timber);
  basket.position.set(0, 0.55, 0);
  pressFrame.add(basket);
  pressFrame.updateWorldMatrix(true, true);
  addCollider(pressFrame, 0.04);

  const trough = box(2.2, 0.36, 0.72, mat.timber);
  trough.position.set(15.4, localY(15.4, 13.1) + 0.18, 13.1);
  root.add(trough);
  addCollider(trough, 0.03);

  // Casks awaiting the village cart.
  [[11.6, 11.7], [10.6, 12.4], [19.1, 11.9]].forEach(([x, z], i) => {
    const barrel = cyl(0.58, 0.58, 1.05, 12, i === 2 ? mat.cider : mat.timber);
    barrel.position.set(x, localY(x, z) + 0.48, z);
    barrel.rotation.z = i === 1 ? Math.PI / 2 : 0;
    root.add(barrel);
    addCollider(barrel, 0.03);
  });

  const cart = new THREE.Group();
  cart.position.set(21.3, localY(21.3, 8.0), 8.0);
  cart.rotation.y = 0.32;
  root.add(cart);
  const cartBed = box(3.2, 0.34, 1.7, mat.timber);
  cartBed.position.y = 0.88;
  cart.add(cartBed);
  for (const z of [-0.92, 0.92]) {
    const wheel = mark(new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.12, 7, 14), mat.timber));
    wheel.position.set(-0.55, 0.62, z);
    wheel.rotation.x = Math.PI / 2;
    cart.add(wheel);
  }
  const shaftA = box(2.8, 0.12, 0.12, mat.timber);
  shaftA.position.set(2.5, 0.78, -0.58);
  cart.add(shaftA);
  const shaftB = shaftA.clone(); shaftB.position.z = 0.58; cart.add(shaftB);
  cart.updateWorldMatrix(true, true);
  addCollider(cartBed, 0.08);

  // Nessa runs the orchard. Her concerns are yields, frost, casks and cart traffic.
  const nessa = new THREE.Group();
  nessa.name = 'Nessa_High_Village_Orchard';
  root.add(nessa);
  const body = cyl(0.36, 0.47, 1.20, 8, mat.cloth); body.position.y = 0.74; nessa.add(body);
  const head = mark(new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 7), mat.skin)); head.position.y = 1.52; nessa.add(head);
  const kerchief = mark(new THREE.Mesh(new THREE.ConeGeometry(0.31, 0.34, 8), mat.cloth)); kerchief.position.y = 1.78; nessa.add(kerchief);
  const basketCarry = cyl(0.30, 0.34, 0.35, 10, mat.timber); basketCarry.position.set(0.48, 0.72, 0.08); nessa.add(basketCarry);

  const route = [[15.8, 9.0], [7.0, 7.0], [-1.0, 8.2], [-7.0, 1.0], [4.5, -3.0], [14.8, 12.2]];
  let routeIndex = 1;
  let wait = 2.0;
  nessa.position.set(route[0][0], localY(route[0][0], route[0][1]), route[0][1]);

  let last = performance.now();
  let wasNear = false;
  let nextRemark = last + 9000;
  let remarkIndex = 0;
  const remarks = [
    'Nessa: The lower trees flower first, but the frost reaches them first too.',
    'Nessa: Hale sends flour north. His empty carts come back with our cider casks when the road is kind.',
    'Nessa: Greyfold folk like the sharp cider. Blackpine takes the sweeter barrels for travelers.',
    'Nessa: The east track looks shorter on a clear morning. It never feels shorter with a loaded cart.'
  ];

  function updateNessa(dt) {
    if (wait > 0) { wait -= dt; return; }
    const [tx, tz] = route[routeIndex];
    const dx = tx - nessa.position.x, dz = tz - nessa.position.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.18) {
      routeIndex = (routeIndex + 1) % route.length;
      wait = 2.6 + ((routeIndex * 1.31) % 3.4);
      return;
    }
    const stepLen = Math.min(d, 0.38 * dt);
    nessa.position.x += dx / d * stepLen;
    nessa.position.z += dz / d * stepLen;
    nessa.position.y = localY(nessa.position.x, nessa.position.z);
    nessa.rotation.y = Math.atan2(dx, dz);
  }

  function updateLocalLife(now) {
    const d = Math.hypot(camera.position.x - SITE.x, camera.position.z - SITE.z);
    const near = d < 24;
    if (near && !wasNear && typeof addFeed === 'function') {
      addFeed('Rows of old fruit trees follow the road toward High Village. A cider press creaks in the yard.', true, 12000);
      nextRemark = now + 7500;
    }
    if (near && now > nextRemark && typeof addFeed === 'function') {
      addFeed(remarks[remarkIndex % remarks.length], true, 12000);
      remarkIndex++;
      nextRemark = now + 40000;
    }
    wasNear = near;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const dx = camera.position.x - SITE.x, dz = camera.position.z - SITE.z;
    root.visible = dx * dx + dz * dz < ACTIVE_DISTANCE * ACTIVE_DISTANCE;
    if (!root.visible) return;
    updateNessa(dt);
    updateLocalLife(now);
  }
  requestAnimationFrame(frame);
}

if (window.EMPTYNET_WORLD_API) install(window.EMPTYNET_WORLD_API);
window.addEventListener('emptynet:world-ready', event => install(event.detail), { once: true });
