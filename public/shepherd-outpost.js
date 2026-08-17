import * as THREE from 'three';

const SITE = { x: -930, z: 860 };
const ACTIVE_DISTANCE = 460;
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
  const rand = mulberry32(WORLD_SEED ^ 0x47e7f01d);
  const root = new THREE.Group();
  root.name = 'EMPTYNET_Greyfold_Outpost';
  scene.add(root);

  const materials = {
    stone: new THREE.MeshStandardMaterial({ color: 0x6d6b60, roughness: 1 }),
    stoneDark: new THREE.MeshStandardMaterial({ color: 0x454740, roughness: 1 }),
    plaster: new THREE.MeshStandardMaterial({ color: 0xa99f83, roughness: 1 }),
    timber: new THREE.MeshStandardMaterial({ color: 0x4a3829, roughness: 1 }),
    roof: new THREE.MeshStandardMaterial({ color: 0x4d493d, roughness: 1 }),
    wool: new THREE.MeshStandardMaterial({ color: 0xc2baa3, roughness: 1 }),
    woolDark: new THREE.MeshStandardMaterial({ color: 0x8f8877, roughness: 1 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xb79a7c, roughness: 1 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x596152, roughness: 1 }),
    leather: new THREE.MeshStandardMaterial({ color: 0x3d3126, roughness: 1 }),
    grassDry: new THREE.MeshStandardMaterial({ color: 0x837a50, roughness: 1 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x343733, roughness: 0.8, metalness: 0.22 })
  };

  function ground(x, z) {
    return terrainHeight(x, z);
  }

  function markWorld(mesh) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  function addCollider(mesh, padding = 0.06) {
    mesh.updateWorldMatrix(true, false);
    colliders.push(new THREE.Box3().setFromObject(mesh).expandByScalar(padding));
  }

  function box(w, h, d, material) {
    return markWorld(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material));
  }

  function cylinder(rt, rb, h, sides, material) {
    return markWorld(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, sides), material));
  }

  function buildHut() {
    const x = SITE.x - 8;
    const z = SITE.z + 3;
    const y = ground(x, z);
    const hut = new THREE.Group();
    hut.position.set(x, y, z);
    hut.rotation.y = -0.24;
    root.add(hut);

    const foundation = box(6.8, 1.8, 5.9, materials.stoneDark);
    foundation.position.y = -0.62;
    hut.add(foundation);

    const body = box(6.1, 2.8, 5.2, materials.plaster);
    body.position.y = 1.45;
    hut.add(body);

    const beamPositions = [
      [-2.75, 1.5, 2.64], [2.75, 1.5, 2.64], [-2.75, 1.5, -2.64], [2.75, 1.5, -2.64]
    ];
    for (const [bx, by, bz] of beamPositions) {
      const beam = box(0.18, 2.8, 0.18, materials.timber);
      beam.position.set(bx, by, bz);
      hut.add(beam);
    }

    const roofLeft = box(3.75, 0.22, 6.0, materials.roof);
    roofLeft.position.set(-1.45, 3.38, 0);
    roofLeft.rotation.z = 0.52;
    hut.add(roofLeft);

    const roofRight = roofLeft.clone();
    roofRight.position.x = 1.45;
    roofRight.rotation.z = -0.52;
    hut.add(roofRight);

    const door = box(0.95, 1.95, 0.12, materials.timber);
    door.position.set(0.45, 1.0, 2.67);
    hut.add(door);

    const latch = box(0.18, 0.08, 0.08, materials.iron);
    latch.position.set(0.15, 1.04, 2.76);
    hut.add(latch);

    for (const wx of [-1.6, 1.75]) {
      const shutter = box(0.72, 0.72, 0.10, materials.timber);
      shutter.position.set(wx, 1.58, 2.67);
      hut.add(shutter);
    }

    const chimney = box(0.62, 1.5, 0.62, materials.stoneDark);
    chimney.position.set(1.75, 3.58, -0.72);
    hut.add(chimney);

    hut.updateWorldMatrix(true, true);
    addCollider(body, 0.12);
    addCollider(foundation, 0.08);
    addCollider(door, 0.04);
  }

  function buildPen() {
    const cx = SITE.x + 11;
    const cz = SITE.z + 2;
    const halfW = 10.5;
    const halfD = 8.0;
    const spacing = 2.5;

    function fencePost(x, z) {
      const post = box(0.18, 1.38, 0.18, materials.timber);
      post.position.set(x, ground(x, z) + 0.61, z);
      root.add(post);
      addCollider(post, 0.02);
    }

    function railBetween(x1, z1, x2, z2) {
      const mx = (x1 + x2) * 0.5;
      const mz = (z1 + z2) * 0.5;
      const len = Math.hypot(x2 - x1, z2 - z1);
      const rail = box(len, 0.12, 0.14, materials.timber);
      rail.position.set(mx, ground(mx, mz) + 0.78, mz);
      rail.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
      root.add(rail);
      addCollider(rail, 0.025);
    }

    const perimeter = [];
    for (let x = -halfW; x <= halfW + 0.01; x += spacing) perimeter.push([cx + x, cz - halfD]);
    for (let z = -halfD + spacing; z <= halfD + 0.01; z += spacing) perimeter.push([cx + halfW, cz + z]);
    for (let x = halfW - spacing; x >= -halfW - 0.01; x -= spacing) perimeter.push([cx + x, cz + halfD]);
    for (let z = halfD - spacing; z >= -halfD + spacing - 0.01; z -= spacing) perimeter.push([cx - halfW, cz + z]);

    for (let i = 0; i < perimeter.length; i++) {
      const [x1, z1] = perimeter[i];
      const [x2, z2] = perimeter[(i + 1) % perimeter.length];
      fencePost(x1, z1);
      railBetween(x1, z1, x2, z2);
    }

    const trough = box(3.4, 0.48, 0.82, materials.timber);
    trough.position.set(cx - 3.5, ground(cx - 3.5, cz + 4.6) + 0.22, cz + 4.6);
    root.add(trough);
    addCollider(trough, 0.04);
  }

  function buildHayStacks() {
    const locations = [[-2, -8], [1, -10], [4, -9]];
    for (const [dx, dz] of locations) {
      const x = SITE.x + dx;
      const z = SITE.z + dz;
      const hay = cylinder(0.8, 0.95, 1.4, 12, materials.grassDry);
      hay.position.set(x, ground(x, z) + 0.67, z);
      hay.rotation.z = Math.PI / 2;
      hay.rotation.y = rand() * Math.PI;
      root.add(hay);
      addCollider(hay, 0.03);
    }
  }

  function buildShepherd() {
    const group = new THREE.Group();
    group.name = 'Mara_Greyfold';
    root.add(group);

    const body = cylinder(0.42, 0.5, 1.22, 8, materials.cloth);
    body.position.y = 0.86;
    group.add(body);

    const head = markWorld(new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 8), materials.skin));
    head.position.y = 1.72;
    group.add(head);

    const hood = markWorld(new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.62, 8), materials.cloth));
    hood.position.y = 1.98;
    group.add(hood);

    const staff = cylinder(0.035, 0.045, 2.0, 6, materials.timber);
    staff.position.set(0.52, 0.96, 0.08);
    staff.rotation.z = -0.08;
    group.add(staff);

    const route = [
      [SITE.x + 1, SITE.z + 9],
      [SITE.x + 13, SITE.z + 7],
      [SITE.x + 16, SITE.z - 2],
      [SITE.x + 7, SITE.z - 7],
      [SITE.x - 2, SITE.z - 2]
    ];

    return { group, route, routeIndex: 0, wait: 0, speed: 0.62 };
  }

  function buildSheep(index) {
    const group = new THREE.Group();
    group.name = `Greyfold_Sheep_${index + 1}`;
    root.add(group);

    const woolMat = index === 4 ? materials.woolDark : materials.wool;
    const body = markWorld(new THREE.Mesh(new THREE.SphereGeometry(0.62, 10, 7), woolMat));
    body.scale.set(1.35, 0.9, 0.82);
    body.position.y = 0.68;
    group.add(body);

    const neck = cylinder(0.19, 0.25, 0.54, 7, woolMat);
    neck.rotation.x = Math.PI / 2;
    neck.position.set(0.68, 0.78, 0);
    group.add(neck);

    const head = markWorld(new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), materials.leather));
    head.scale.set(1.0, 0.8, 0.72);
    head.position.set(0.96, 0.78, 0);
    group.add(head);

    for (const sx of [-0.38, 0.38]) {
      for (const sz of [-0.28, 0.28]) {
        const leg = cylinder(0.045, 0.055, 0.62, 5, materials.leather);
        leg.position.set(sx, 0.3, sz);
        group.add(leg);
      }
    }

    const angle = rand() * Math.PI * 2;
    const radius = 2.8 + rand() * 5.2;
    const baseX = SITE.x + 11;
    const baseZ = SITE.z + 2;
    group.position.set(baseX + Math.cos(angle) * radius, 0, baseZ + Math.sin(angle) * radius);
    group.position.y = ground(group.position.x, group.position.z);
    group.rotation.y = rand() * Math.PI * 2;

    return {
      group,
      target: new THREE.Vector2(group.position.x, group.position.z),
      nextDecision: performance.now() + 2000 + rand() * 8000,
      speed: 0.22 + rand() * 0.12,
      phase: rand() * Math.PI * 2
    };
  }

  buildHut();
  buildPen();
  buildHayStacks();
  const shepherd = buildShepherd();
  const [shepherdStartX, shepherdStartZ] = shepherd.route[0];
  shepherd.group.position.set(shepherdStartX, ground(shepherdStartX, shepherdStartZ), shepherdStartZ);
  shepherd.routeIndex = 1;
  const sheep = Array.from({ length: 5 }, (_, i) => buildSheep(i));

  root.traverse(obj => {
    if (!obj.isMesh) return;
    obj.castShadow = true;
    obj.receiveShadow = true;
  });

  let lastFrame = performance.now();
  let lastOverheardAt = -Infinity;
  let seenOnce = false;

  function chooseSheepTarget(animal, now) {
    const angle = rand() * Math.PI * 2;
    const radius = 1.8 + rand() * 6.8;
    const cx = SITE.x + 11;
    const cz = SITE.z + 2;
    animal.target.set(cx + Math.cos(angle) * radius, cz + Math.sin(angle) * radius);
    animal.nextDecision = now + 5500 + rand() * 9500;
  }

  function updateSheep(animal, dt, now) {
    if (now >= animal.nextDecision) chooseSheepTarget(animal, now);
    const dx = animal.target.x - animal.group.position.x;
    const dz = animal.target.y - animal.group.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.18) {
      const step = Math.min(dist, animal.speed * dt);
      animal.group.position.x += dx / dist * step;
      animal.group.position.z += dz / dist * step;
      animal.group.rotation.y = Math.atan2(-dz, dx);
    }
    animal.group.position.y = ground(animal.group.position.x, animal.group.position.z);
    animal.group.rotation.z = Math.sin(now * 0.0012 + animal.phase) * 0.012;
  }

  function updateShepherd(dt) {
    if (shepherd.wait > 0) {
      shepherd.wait -= dt;
      return;
    }
    const [tx, tz] = shepherd.route[shepherd.routeIndex];
    const dx = tx - shepherd.group.position.x;
    const dz = tz - shepherd.group.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.18) {
      shepherd.routeIndex = (shepherd.routeIndex + 1) % shepherd.route.length;
      shepherd.wait = 3.5 + rand() * 8;
      return;
    }
    const step = Math.min(dist, shepherd.speed * dt);
    shepherd.group.position.x += dx / dist * step;
    shepherd.group.position.z += dz / dist * step;
    shepherd.group.position.y = ground(shepherd.group.position.x, shepherd.group.position.z);
    shepherd.group.rotation.y = Math.atan2(-dz, dx);
  }

  function maybeOverhear(distance, now) {
    if (distance > 18 || now - lastOverheardAt < 65000) return;
    const lines = [
      'Mara: "Storm came from the west last year too. Bent every post on the north fence."',
      'Mara: "Five still here. Good. Thought Brindle had slipped the rail again."',
      'Mara: "If the grass stays this thin, I will move them toward the old chalk ridge."',
      'Mara: "Village traders are late. Salt barrel is nearly empty."'
    ];
    lastOverheardAt = now;
    if (typeof addFeed === 'function') addFeed(lines[Math.floor(rand() * lines.length)], false, 12000);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;
    const distance = Math.hypot(SITE.x - camera.position.x, SITE.z - camera.position.z);
    root.visible = distance < ACTIVE_DISTANCE;
    if (!root.visible) return;

    if (!seenOnce && distance < 150) {
      seenOnce = true;
      if (typeof addFeed === 'function') addFeed('A low stone hut and a fenced flock sit against the wind.', false, 10000);
    }

    updateShepherd(dt);
    for (const animal of sheep) updateSheep(animal, dt, now);
    maybeOverhear(distance, now);
  }

  requestAnimationFrame(frame);
}

if (window.EMPTYNET_WORLD_API) install(window.EMPTYNET_WORLD_API);
window.addEventListener('emptynet:world-ready', event => install(event.detail), { once: true });
