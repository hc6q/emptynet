import * as THREE from 'three';

const SITE = { x: 748, z: -566 };
const ACTIVE_DISTANCE = 430;
const WORLD_SEED = 28031997;
let installed = false;

function mulberry32(seed) {
  return function rand() {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function install(api) {
  if (installed || !api?.scene || !api?.camera || !api?.terrainHeight || !Array.isArray(api?.colliders)) return;
  installed = true;

  const { scene, camera, terrainHeight, colliders, addFeed } = api;
  const rand = mulberry32(WORLD_SEED ^ 0x5b1ac9e1);
  const root = new THREE.Group();
  root.name = 'EMPTYNET_Blackpine_Wayhouse';
  scene.add(root);

  const materials = {
    stone: new THREE.MeshStandardMaterial({ color: 0x4b4c45, roughness: 1 }),
    plaster: new THREE.MeshStandardMaterial({ color: 0x8e866f, roughness: 1 }),
    timber: new THREE.MeshStandardMaterial({ color: 0x463426, roughness: 0.98 }),
    timberDark: new THREE.MeshStandardMaterial({ color: 0x2d241d, roughness: 1 }),
    roof: new THREE.MeshStandardMaterial({ color: 0x3f4239, roughness: 1 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x2c2e2b, roughness: 0.82, metalness: 0.2 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x50594d, roughness: 1 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xb28f70, roughness: 1 }),
    mule: new THREE.MeshStandardMaterial({ color: 0x5b5144, roughness: 1 }),
    muleDark: new THREE.MeshStandardMaterial({ color: 0x312d28, roughness: 1 }),
    water: new THREE.MeshStandardMaterial({ color: 0x43575a, roughness: 0.32, metalness: 0.05 }),
    ember: new THREE.MeshStandardMaterial({ color: 0x8e4f2d, emissive: 0x7a2d16, emissiveIntensity: 0.8, roughness: 0.7 })
  };

  const smokeMaterial = new THREE.MeshBasicMaterial({
    color: 0x8a8b84,
    transparent: true,
    opacity: 0.16,
    depthWrite: false
  });

  function ground(x, z) {
    return terrainHeight(x, z);
  }

  function mark(mesh) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  function box(w, h, d, material) {
    return mark(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material));
  }

  function cylinder(rt, rb, h, sides, material) {
    return mark(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, sides), material));
  }

  function addCollider(object, padding = 0.05) {
    object.updateWorldMatrix(true, false);
    colliders.push(new THREE.Box3().setFromObject(object).expandByScalar(padding));
  }

  function buildWayhouse() {
    const x = SITE.x + 9;
    const z = SITE.z + 7;
    const y = ground(x, z);
    const house = new THREE.Group();
    house.name = 'Blackpine_Wayhouse_Building';
    house.position.set(x, y, z);
    house.rotation.y = -0.74;
    root.add(house);

    const foundation = box(8.5, 1.5, 6.5, materials.stone);
    foundation.position.y = -0.52;
    house.add(foundation);

    const body = box(7.5, 3.4, 5.6, materials.plaster);
    body.position.y = 1.72;
    house.add(body);

    const roofLeft = box(4.55, 0.24, 6.6, materials.roof);
    roofLeft.position.set(-1.72, 4.05, 0);
    roofLeft.rotation.z = 0.48;
    house.add(roofLeft);

    const roofRight = roofLeft.clone();
    roofRight.position.x = 1.72;
    roofRight.rotation.z = -0.48;
    house.add(roofRight);

    const door = box(1.12, 2.25, 0.14, materials.timberDark);
    door.position.set(1.35, 1.15, 2.87);
    house.add(door);

    for (const wx of [-2.25, -0.55]) {
      const shutter = box(0.82, 0.9, 0.12, materials.timber);
      shutter.position.set(wx, 1.95, 2.88);
      house.add(shutter);
    }

    const chimney = box(0.72, 1.7, 0.72, materials.stone);
    chimney.position.set(2.25, 4.15, -1.25);
    house.add(chimney);

    const porch = box(7.1, 0.18, 2.1, materials.timberDark);
    porch.position.set(0, 0.18, 3.72);
    house.add(porch);

    const porchRoof = box(7.3, 0.16, 2.45, materials.roof);
    porchRoof.position.set(0, 2.82, 3.67);
    porchRoof.rotation.x = -0.08;
    house.add(porchRoof);

    for (const px of [-3.15, 3.15]) {
      const post = box(0.18, 2.65, 0.18, materials.timberDark);
      post.position.set(px, 1.42, 4.42);
      house.add(post);
    }

    const bench = box(2.55, 0.18, 0.52, materials.timber);
    bench.position.set(-1.3, 0.76, 3.46);
    house.add(bench);
    for (const bx of [-1.0, 1.0]) {
      const leg = box(0.16, 0.64, 0.16, materials.timberDark);
      leg.position.set(-1.3 + bx, 0.43, 3.46);
      house.add(leg);
    }

    const hearth = cylinder(0.48, 0.58, 0.24, 10, materials.stone);
    hearth.position.set(2.55, 0.32, 3.75);
    house.add(hearth);
    const ember = cylinder(0.28, 0.34, 0.08, 10, materials.ember);
    ember.position.set(2.55, 0.49, 3.75);
    house.add(ember);

    house.updateWorldMatrix(true, true);
    addCollider(foundation, 0.08);
    addCollider(body, 0.10);
    addCollider(door, 0.04);
    addCollider(porch, 0.03);

    const chimneyWorld = new THREE.Vector3();
    chimney.getWorldPosition(chimneyWorld);
    return { house, chimneyWorld };
  }

  function buildRoadsideObjects() {
    const hitchX = SITE.x - 4;
    const hitchZ = SITE.z + 3;
    const hitchY = ground(hitchX, hitchZ);

    for (const dz of [-1.5, 1.5]) {
      const post = box(0.22, 1.45, 0.22, materials.timberDark);
      post.position.set(hitchX, ground(hitchX, hitchZ + dz) + 0.66, hitchZ + dz);
      root.add(post);
      addCollider(post, 0.02);
    }
    const rail = box(0.18, 0.18, 3.2, materials.timber);
    rail.position.set(hitchX, hitchY + 0.92, hitchZ);
    root.add(rail);
    addCollider(rail, 0.02);

    const barrelX = SITE.x + 4;
    const barrelZ = SITE.z + 13;
    const barrel = cylinder(0.55, 0.62, 1.15, 12, materials.timber);
    barrel.position.set(barrelX, ground(barrelX, barrelZ) + 0.55, barrelZ);
    root.add(barrel);
    addCollider(barrel, 0.03);
    const water = cylinder(0.48, 0.48, 0.035, 12, materials.water);
    water.position.set(barrelX, ground(barrelX, barrelZ) + 1.12, barrelZ);
    root.add(water);

    const stackBaseX = SITE.x + 16;
    const stackBaseZ = SITE.z + 5;
    for (let i = 0; i < 8; i++) {
      const log = cylinder(0.12, 0.14, 2.1, 7, materials.timberDark);
      const row = Math.floor(i / 4);
      const col = i % 4;
      log.rotation.z = Math.PI / 2;
      log.rotation.y = 0.2 + row * 0.05;
      log.position.set(stackBaseX + (col - 1.5) * 0.42, ground(stackBaseX, stackBaseZ) + 0.22 + row * 0.26, stackBaseZ + row * 0.30);
      root.add(log);
    }
  }

  function buildKeeper() {
    const group = new THREE.Group();
    group.name = 'Orin_Blackpine';
    root.add(group);

    const body = cylinder(0.44, 0.53, 1.3, 8, materials.cloth);
    body.position.y = 0.86;
    group.add(body);

    const head = mark(new THREE.Mesh(new THREE.SphereGeometry(0.31, 12, 8), materials.skin));
    head.position.y = 1.72;
    group.add(head);

    const cap = cylinder(0.23, 0.34, 0.24, 8, materials.timberDark);
    cap.position.y = 2.01;
    group.add(cap);

    const axeHandle = cylinder(0.035, 0.04, 1.15, 6, materials.timber);
    axeHandle.rotation.z = -0.24;
    axeHandle.position.set(0.5, 0.72, 0.08);
    group.add(axeHandle);
    const axeHead = box(0.34, 0.18, 0.08, materials.iron);
    axeHead.position.set(0.62, 1.24, 0.08);
    axeHead.rotation.z = -0.24;
    group.add(axeHead);

    const route = [
      [SITE.x + 5, SITE.z + 10],
      [SITE.x + 16, SITE.z + 5],
      [SITE.x + 3, SITE.z + 13],
      [SITE.x - 1, SITE.z + 4]
    ];

    group.position.set(route[0][0], ground(route[0][0], route[0][1]), route[0][1]);
    return { group, route, routeIndex: 1, wait: 1.5, speed: 0.56 };
  }

  function buildMule() {
    const group = new THREE.Group();
    group.name = 'Blackpine_Mule';
    root.add(group);

    const body = mark(new THREE.Mesh(new THREE.SphereGeometry(0.72, 12, 8), materials.mule));
    body.scale.set(1.45, 0.78, 0.72);
    body.position.y = 1.18;
    group.add(body);

    const neck = cylinder(0.24, 0.34, 0.78, 8, materials.mule);
    neck.rotation.z = -0.48;
    neck.position.set(0.82, 1.45, 0);
    group.add(neck);

    const head = mark(new THREE.Mesh(new THREE.SphereGeometry(0.33, 10, 7), materials.muleDark));
    head.scale.set(1.15, 0.82, 0.72);
    head.position.set(1.18, 1.63, 0);
    group.add(head);

    for (const sx of [-0.55, 0.52]) {
      for (const sz of [-0.34, 0.34]) {
        const leg = cylinder(0.065, 0.075, 0.95, 6, materials.muleDark);
        leg.position.set(sx, 0.55, sz);
        group.add(leg);
      }
    }

    const tailPivot = new THREE.Group();
    tailPivot.position.set(-1.02, 1.38, 0);
    group.add(tailPivot);
    const tail = cylinder(0.035, 0.05, 0.82, 6, materials.muleDark);
    tail.rotation.z = 0.66;
    tail.position.set(-0.27, -0.26, 0);
    tailPivot.add(tail);

    const x = SITE.x - 5.2;
    const z = SITE.z + 3.3;
    group.position.set(x, ground(x, z), z);
    group.rotation.y = 0.32;
    return { group, tailPivot };
  }

  const { chimneyWorld } = buildWayhouse();
  buildRoadsideObjects();
  const keeper = buildKeeper();
  const mule = buildMule();

  const smoke = [];
  for (let i = 0; i < 6; i++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.28 + i * 0.035, 7, 5), smokeMaterial.clone());
    puff.material.opacity = 0.10 + i * 0.012;
    puff.userData.phase = i / 6;
    root.add(puff);
    smoke.push(puff);
  }

  let lastFrame = performance.now();
  let wasNear = false;
  let nextRemark = performance.now() + 24000;
  const remarks = [
    'Orin: Road is soft past the watch. Keep to the higher wheel ruts.',
    'Orin: If Greyfold asks, the salt cart came through three mornings ago.',
    'Orin: Axles crack more often here than men admit.',
    'Orin: There is water in the barrel. Leave the cup on the bench.'
  ];

  function updateKeeper(dt) {
    if (keeper.wait > 0) {
      keeper.wait -= dt;
      return;
    }
    const [tx, tz] = keeper.route[keeper.routeIndex];
    const dx = tx - keeper.group.position.x;
    const dz = tz - keeper.group.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 0.24) {
      keeper.routeIndex = (keeper.routeIndex + 1) % keeper.route.length;
      keeper.wait = 2.5 + rand() * 4.5;
      return;
    }
    const step = Math.min(distance, keeper.speed * dt);
    keeper.group.position.x += dx / distance * step;
    keeper.group.position.z += dz / distance * step;
    keeper.group.position.y = ground(keeper.group.position.x, keeper.group.position.z);
    keeper.group.rotation.y = Math.atan2(dx, dz);
  }

  function updateSmoke(now) {
    const t = now * 0.00018;
    for (let i = 0; i < smoke.length; i++) {
      const puff = smoke[i];
      const phase = (t + puff.userData.phase) % 1;
      puff.position.set(
        chimneyWorld.x + Math.sin((phase + i) * 7.1) * 0.18,
        chimneyWorld.y + 0.65 + phase * 5.8,
        chimneyWorld.z + Math.cos((phase + i) * 5.4) * 0.14
      );
      const s = 0.65 + phase * 1.6;
      puff.scale.setScalar(s);
      puff.material.opacity = (1 - phase) * 0.16;
    }
  }

  function updateLocalLore(now) {
    const distance = Math.hypot(camera.position.x - keeper.group.position.x, camera.position.z - keeper.group.position.z);
    const near = distance < 13;
    if (near && !wasNear && typeof addFeed === 'function') {
      addFeed('A mule shifts at the hitching rail. The keeper keeps working.', true, 9000);
      nextRemark = now + 6500 + rand() * 4500;
    }
    if (near && now > nextRemark && typeof addFeed === 'function') {
      addFeed(remarks[Math.floor(rand() * remarks.length)], true, 11000);
      nextRemark = now + 32000 + rand() * 26000;
    }
    wasNear = near;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;
    const distance = Math.hypot(camera.position.x - SITE.x, camera.position.z - SITE.z);
    root.visible = distance < ACTIVE_DISTANCE;
    if (!root.visible) return;

    updateKeeper(dt);
    updateSmoke(now);
    mule.tailPivot.rotation.z = Math.sin(now * 0.0022) * 0.22;
    mule.group.rotation.x = Math.sin(now * 0.0011) * 0.012;
    updateLocalLore(now);
  }

  requestAnimationFrame(frame);
}

if (window.EMPTYNET_WORLD_API) install(window.EMPTYNET_WORLD_API);
window.addEventListener('emptynet:world-ready', event => install(event.detail), { once: true });
