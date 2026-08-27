import * as THREE from 'three';

// A small charcoal-burner's yard beside the established approach road to High Village.
// It adds ordinary work, trade and routine without making local people aware of deeper anomalies.
const SITE = { x: 1227, z: 1110 };
const ACTIVE_DISTANCE = 500;
let installed = false;

function install(api) {
  if (installed || !api?.scene || !api?.camera || !api?.terrainHeight || !Array.isArray(api?.colliders)) return;
  installed = true;

  const { scene, camera, terrainHeight, colliders, addFeed } = api;
  const root = new THREE.Group();
  root.name = 'EMPTYNET_High_Village_Charcoal_Yard';
  root.position.set(SITE.x, terrainHeight(SITE.x, SITE.z), SITE.z);
  root.rotation.y = -0.31;
  scene.add(root);

  const mat = {
    earth: new THREE.MeshStandardMaterial({ color: 0x38352d, roughness: 1 }),
    ash: new THREE.MeshStandardMaterial({ color: 0x575a54, roughness: 1 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x62645d, roughness: 1 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x493528, roughness: 1 }),
    woodDark: new THREE.MeshStandardMaterial({ color: 0x2e241d, roughness: 1 }),
    charcoal: new THREE.MeshStandardMaterial({ color: 0x171918, roughness: 0.98 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x555b50, roughness: 1, side: THREE.DoubleSide }),
    skin: new THREE.MeshStandardMaterial({ color: 0xaf8d72, roughness: 1 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x292c29, roughness: 0.8, metalness: 0.18 }),
    smoke: new THREE.MeshStandardMaterial({ color: 0x747972, roughness: 1, transparent: true, opacity: 0.22, depthWrite: false })
  };

  const mark = mesh => { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; };
  const box = (w, h, d, material) => mark(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material));
  const cyl = (rt, rb, h, sides, material) => mark(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, sides), material));

  function worldXZ(lx, lz) {
    const c = Math.cos(root.rotation.y), s = Math.sin(root.rotation.y);
    return [SITE.x + lx * c + lz * s, SITE.z - lx * s + lz * c];
  }
  function localY(lx, lz) {
    const [x, z] = worldXZ(lx, lz);
    return terrainHeight(x, z) - root.position.y;
  }
  function addCollider(object, padding = 0.05) {
    object.updateWorldMatrix(true, true);
    colliders.push(new THREE.Box3().setFromObject(object).expandByScalar(padding));
  }

  // The active clamp: timber is slowly carbonized under a sealed earth mound.
  const kiln = new THREE.Group();
  kiln.name = 'HighVillage_Charcoal_Clamp';
  kiln.position.set(-1.6, localY(-1.6, -1.2), -1.2);
  root.add(kiln);

  const kilnBase = cyl(3.1, 3.45, 0.72, 14, mat.stone);
  kilnBase.position.y = 0.16;
  kiln.add(kilnBase);

  const mound = mark(new THREE.Mesh(new THREE.SphereGeometry(3.05, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.58), mat.earth));
  mound.scale.y = 0.82;
  mound.position.y = 0.42;
  kiln.add(mound);

  const cap = cyl(0.34, 0.48, 1.05, 9, mat.charcoal);
  cap.position.y = 2.6;
  kiln.add(cap);

  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.2;
    const vent = cyl(0.12, 0.17, 0.52, 7, mat.stone);
    vent.position.set(Math.cos(a) * 2.45, 0.46, Math.sin(a) * 2.45);
    vent.rotation.z = Math.cos(a) * 0.11;
    vent.rotation.x = Math.sin(a) * 0.11;
    kiln.add(vent);
  }

  // A lean-to keeps split timber dry before it is stacked into the next burn.
  const shed = new THREE.Group();
  shed.name = 'HighVillage_Charcoal_Shed';
  shed.position.set(4.5, localY(4.5, 0.8), 0.8);
  shed.rotation.y = 0.08;
  root.add(shed);

  const shedFloor = box(5.3, 0.34, 3.5, mat.stone);
  shedFloor.position.y = 0.03;
  shed.add(shedFloor);
  const rear = box(5.0, 2.55, 0.18, mat.woodDark);
  rear.position.set(0, 1.25, -1.58);
  shed.add(rear);
  for (const x of [-2.25, 2.25]) {
    const post = box(0.18, 2.7, 0.18, mat.wood);
    post.position.set(x, 1.35, 1.45);
    shed.add(post);
  }
  const roof = box(5.55, 0.18, 4.05, mat.woodDark);
  roof.position.set(0, 2.72, -0.08);
  roof.rotation.x = -0.12;
  shed.add(roof);

  // Stacked cordwood, deliberately regular: this yard supplies households, bakers and smiths.
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 7; i++) {
      const log = cyl(0.14, 0.16, 1.15, 7, row === 2 ? mat.woodDark : mat.wood);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = (i % 2) * 0.06;
      log.position.set(-1.72 + i * 0.55, 0.42 + row * 0.30, -0.88 + (row % 2) * 0.32);
      shed.add(log);
    }
  }

  // Charcoal baskets and a weighing beam establish a mundane trade workflow.
  const basketPositions = [[1.25, 3.4], [2.35, 3.0], [3.2, 3.8]];
  basketPositions.forEach(([x, z], i) => {
    const basket = cyl(0.48, 0.38, 0.62, 10, mat.woodDark);
    basket.position.set(x, localY(x, z) + 0.31, z);
    basket.rotation.y = i * 0.42;
    root.add(basket);
    const coal = mark(new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), mat.charcoal));
    coal.scale.set(1.0, 0.45, 1.0);
    coal.position.set(x, basket.position.y + 0.33, z);
    root.add(coal);
  });

  const scale = new THREE.Group();
  scale.name = 'HighVillage_Charcoal_Scale';
  scale.position.set(2.9, localY(2.9, -2.3), -2.3);
  root.add(scale);
  const scalePost = box(0.18, 2.5, 0.18, mat.woodDark);
  scalePost.position.y = 1.22;
  scale.add(scalePost);
  const beam = box(2.7, 0.15, 0.15, mat.wood);
  beam.position.set(0.68, 2.28, 0);
  beam.rotation.z = -0.04;
  scale.add(beam);
  for (const x of [-0.32, 1.67]) {
    const chain = cyl(0.025, 0.025, 0.68, 5, mat.iron);
    chain.position.set(x, 1.9, 0);
    scale.add(chain);
    const pan = cyl(0.45, 0.24, 0.10, 10, mat.iron);
    pan.position.set(x, 1.54, 0);
    scale.add(pan);
  }

  // Alwen works a fixed circuit independent of the visitor.
  const alwen = new THREE.Group();
  alwen.name = 'Alwen_HighVillage_CharcoalBurner';
  root.add(alwen);
  const body = cyl(0.38, 0.46, 1.18, 8, mat.cloth);
  body.position.y = 0.72;
  alwen.add(body);
  const head = mark(new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 7), mat.skin));
  head.position.y = 1.5;
  alwen.add(head);
  const hood = mark(new THREE.Mesh(new THREE.ConeGeometry(0.31, 0.38, 8), mat.cloth));
  hood.position.y = 1.72;
  alwen.add(hood);
  const shovel = box(0.08, 1.65, 0.08, mat.woodDark);
  shovel.position.set(0.48, 0.82, 0.08);
  shovel.rotation.z = -0.12;
  alwen.add(shovel);
  const blade = box(0.32, 0.38, 0.06, mat.iron);
  blade.position.set(0.58, 0.10, 0.08);
  blade.rotation.z = -0.12;
  alwen.add(blade);

  const route = [[-3.8, -2.2], [-0.7, 2.8], [4.1, 1.9], [2.4, -2.2], [-3.8, -2.2]];
  let routeIndex = 1;
  let wait = 2.8;
  alwen.position.set(route[0][0], localY(route[0][0], route[0][1]), route[0][1]);

  // Smoke is world geometry and uses the same camera/depth buffer as everything else.
  const smokePuffs = [];
  for (let i = 0; i < 8; i++) {
    const puff = mark(new THREE.Mesh(new THREE.SphereGeometry(0.28 + (i % 3) * 0.07, 7, 5), mat.smoke));
    puff.castShadow = false;
    puff.receiveShadow = false;
    kiln.add(puff);
    smokePuffs.push(puff);
  }

  root.updateWorldMatrix(true, true);
  addCollider(kilnBase, 0.08);
  addCollider(mound, 0.06);
  addCollider(shedFloor, 0.04);
  addCollider(rear, 0.04);
  addCollider(scalePost, 0.04);

  let last = performance.now();
  let wasNear = false;
  let nextRemark = last + 10000;
  let remarkIndex = 0;
  const remarks = [
    'Alwen: Village ovens take the small coal. The smith wants the hard pieces and complains about every sack.',
    'Alwen: Greyfold flour comes up this road twice a week when the ruts are kind.',
    'Alwen: Keep rain off a fresh clamp and it behaves. Let water in and you lose three days of work.',
    'Alwen: Blackpine pays in salt when Orin has no coin. Salt keeps better than promises.'
  ];

  function updateAlwen(dt) {
    if (wait > 0) { wait -= dt; return; }
    const [tx, tz] = route[routeIndex];
    const dx = tx - alwen.position.x;
    const dz = tz - alwen.position.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.16) {
      routeIndex = (routeIndex + 1) % route.length;
      wait = 2.2 + (routeIndex % 3) * 1.15;
      return;
    }
    const step = Math.min(d, 0.34 * dt);
    alwen.position.x += dx / d * step;
    alwen.position.z += dz / d * step;
    alwen.position.y = localY(alwen.position.x, alwen.position.z);
    alwen.rotation.y = Math.atan2(dx, dz);
  }

  function updateSmoke(now) {
    const t = now * 0.001;
    smokePuffs.forEach((puff, i) => {
      const phase = (t * 0.16 + i / smokePuffs.length) % 1;
      puff.position.set(
        Math.sin(t * 0.37 + i * 1.7) * (0.10 + phase * 0.38),
        3.05 + phase * 4.8,
        Math.cos(t * 0.29 + i) * 0.10 + phase * 0.55
      );
      const s = 0.72 + phase * 1.65;
      puff.scale.setScalar(s);
      puff.material.opacity = 0.24 * (1 - phase);
    });
  }

  function updateLocalLife(now) {
    const d = Math.hypot(camera.position.x - SITE.x, camera.position.z - SITE.z);
    const near = d < 20;
    if (near && !wasNear && typeof addFeed === 'function') {
      addFeed('A sealed charcoal clamp smolders beside the High Village road. Split timber is stacked under a low shed.', true, 10500);
      nextRemark = now + 6500;
    }
    if (near && now > nextRemark && typeof addFeed === 'function') {
      addFeed(remarks[remarkIndex % remarks.length], true, 11500);
      remarkIndex++;
      nextRemark = now + 38000;
    }
    wasNear = near;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const dx = camera.position.x - SITE.x;
    const dz = camera.position.z - SITE.z;
    root.visible = dx * dx + dz * dz < ACTIVE_DISTANCE * ACTIVE_DISTANCE;
    if (!root.visible) return;
    updateAlwen(dt);
    updateSmoke(now);
    updateLocalLife(now);
  }
  requestAnimationFrame(frame);
}

if (window.EMPTYNET_WORLD_API) install(window.EMPTYNET_WORLD_API);
window.addEventListener('emptynet:world-ready', event => install(event.detail), { once: true });
