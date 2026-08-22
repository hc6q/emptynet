import * as THREE from 'three';

const SITE = { x: -882, z: 925 };
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
  const rand = mulberry32(WORLD_SEED ^ 0x47a5f0d1);
  const root = new THREE.Group();
  root.name = 'EMPTYNET_Greyfold_Washhouse';
  scene.add(root);

  const materials = {
    stone: new THREE.MeshStandardMaterial({ color: 0x5a5a50, roughness: 1 }),
    stoneDark: new THREE.MeshStandardMaterial({ color: 0x3e403a, roughness: 1 }),
    timber: new THREE.MeshStandardMaterial({ color: 0x49372a, roughness: 0.98 }),
    timberDark: new THREE.MeshStandardMaterial({ color: 0x30271f, roughness: 1 }),
    roof: new THREE.MeshStandardMaterial({ color: 0x47483f, roughness: 1 }),
    water: new THREE.MeshStandardMaterial({ color: 0x465c60, roughness: 0.30, metalness: 0.04 }),
    linen: new THREE.MeshStandardMaterial({ color: 0xc0b9a2, roughness: 1, side: THREE.DoubleSide }),
    linenGrey: new THREE.MeshStandardMaterial({ color: 0x8f9188, roughness: 1, side: THREE.DoubleSide }),
    linenBlue: new THREE.MeshStandardMaterial({ color: 0x66747a, roughness: 1, side: THREE.DoubleSide }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x525a4f, roughness: 1 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xb08f72, roughness: 1 }),
    soap: new THREE.MeshStandardMaterial({ color: 0xd0c7a6, roughness: 0.9 })
  };

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

  function buildShelter() {
    const x = SITE.x - 4;
    const z = SITE.z + 3;
    const y = ground(x, z);
    const shelter = new THREE.Group();
    shelter.name = 'Greyfold_Wash_Shelter';
    shelter.position.set(x, y, z);
    shelter.rotation.y = 0.56;
    root.add(shelter);

    const floor = box(7.2, 0.28, 5.2, materials.stoneDark);
    floor.position.y = 0.02;
    shelter.add(floor);

    const back = box(7.0, 2.65, 0.34, materials.stone);
    back.position.set(0, 1.32, -2.38);
    shelter.add(back);

    for (const px of [-3.1, 3.1]) {
      const post = box(0.24, 2.75, 0.24, materials.timberDark);
      post.position.set(px, 1.42, 2.18);
      shelter.add(post);
    }

    const roof = box(7.6, 0.22, 5.7, materials.roof);
    roof.position.set(0, 2.92, -0.12);
    roof.rotation.x = -0.12;
    shelter.add(roof);

    const bench = box(3.2, 0.18, 0.54, materials.timber);
    bench.position.set(1.15, 0.72, -1.75);
    shelter.add(bench);
    for (const bx of [-1.25, 1.25]) {
      const leg = box(0.18, 0.62, 0.18, materials.timberDark);
      leg.position.set(1.15 + bx, 0.40, -1.75);
      shelter.add(leg);
    }

    shelter.updateWorldMatrix(true, true);
    addCollider(floor, 0.03);
    addCollider(back, 0.06);
    addCollider(roof, 0.03);
  }

  function buildWashBasins() {
    const basinSpecs = [
      [SITE.x - 1, SITE.z - 2, 0.15],
      [SITE.x + 4, SITE.z, -0.08]
    ];

    for (const [x, z, rotation] of basinSpecs) {
      const group = new THREE.Group();
      group.position.set(x, ground(x, z), z);
      group.rotation.y = rotation;
      root.add(group);

      const base = box(4.0, 0.78, 1.55, materials.stone);
      base.position.y = 0.39;
      group.add(base);

      const cavity = box(3.38, 0.40, 0.98, materials.stoneDark);
      cavity.position.y = 0.70;
      group.add(cavity);

      const water = box(3.15, 0.04, 0.78, materials.water);
      water.position.y = 0.92;
      group.add(water);

      group.updateWorldMatrix(true, true);
      addCollider(base, 0.04);
    }

    const channelX = SITE.x + 7;
    const channelZ = SITE.z + 2;
    const channel = box(0.55, 0.22, 7.0, materials.stoneDark);
    channel.position.set(channelX, ground(channelX, channelZ) + 0.08, channelZ);
    channel.rotation.y = 0.25;
    root.add(channel);
    addCollider(channel, 0.02);
  }

  function buildSpringMarker() {
    const x = SITE.x + 9;
    const z = SITE.z + 5;
    const y = ground(x, z);

    const stone = cylinder(0.66, 0.84, 1.10, 9, materials.stoneDark);
    stone.position.set(x, y + 0.53, z);
    root.add(stone);
    addCollider(stone, 0.03);

    const spout = cylinder(0.09, 0.11, 0.72, 8, materials.timberDark);
    spout.rotation.z = Math.PI / 2;
    spout.position.set(x - 0.42, y + 0.92, z);
    root.add(spout);

    const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.72, 16), materials.water);
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.set(x - 1.0, ground(x - 1.0, z) + 0.016, z);
    root.add(puddle);
  }

  function buildDryingLines() {
    const lines = [];
    const starts = [
      [SITE.x - 9, SITE.z + 1, SITE.x - 9, SITE.z + 10],
      [SITE.x - 5, SITE.z + 1, SITE.x - 5, SITE.z + 10]
    ];

    for (let lineIndex = 0; lineIndex < starts.length; lineIndex++) {
      const [x1, z1, x2, z2] = starts[lineIndex];
      const y1 = ground(x1, z1);
      const y2 = ground(x2, z2);

      for (const [x, z, y] of [[x1, z1, y1], [x2, z2, y2]]) {
        const post = box(0.18, 2.35, 0.18, materials.timberDark);
        post.position.set(x, y + 1.08, z);
        root.add(post);
        addCollider(post, 0.02);
      }

      const midX = (x1 + x2) * 0.5;
      const midZ = (z1 + z2) * 0.5;
      const rope = cylinder(0.025, 0.025, Math.hypot(x2 - x1, z2 - z1), 6, materials.timber);
      rope.rotation.x = Math.PI / 2;
      rope.position.set(midX, ground(midX, midZ) + 2.02, midZ);
      root.add(rope);

      for (let i = 0; i < 5; i++) {
        const t = 0.12 + i * 0.19;
        const x = THREE.MathUtils.lerp(x1, x2, t);
        const z = THREE.MathUtils.lerp(z1, z2, t);
        const clothMaterial = [materials.linen, materials.linenGrey, materials.linenBlue][(i + lineIndex) % 3];
        const width = 0.72 + rand() * 0.42;
        const height = 0.78 + rand() * 0.48;
        const cloth = new THREE.Mesh(new THREE.PlaneGeometry(width, height, 5, 4), clothMaterial);
        cloth.position.set(x, ground(x, z) + 1.55, z);
        cloth.rotation.y = lineIndex === 0 ? 0 : 0.02;
        cloth.userData.phase = rand() * Math.PI * 2;
        cloth.userData.baseY = cloth.position.y;
        root.add(cloth);
        lines.push(cloth);
      }
    }
    return lines;
  }

  function buildLaundryDetails() {
    const basketX = SITE.x - 2;
    const basketZ = SITE.z + 7;
    const basket = cylinder(0.56, 0.42, 0.68, 10, materials.timber);
    basket.position.set(basketX, ground(basketX, basketZ) + 0.32, basketZ);
    root.add(basket);
    addCollider(basket, 0.02);

    for (let i = 0; i < 5; i++) {
      const soap = box(0.28, 0.12, 0.20, materials.soap);
      const x = SITE.x + 0.6 + (i % 3) * 0.34;
      const z = SITE.z - 3.0 + Math.floor(i / 3) * 0.30;
      soap.position.set(x, ground(x, z) + 0.12, z);
      soap.rotation.y = rand() * 0.35;
      root.add(soap);
    }

    const stoolX = SITE.x + 1.5;
    const stoolZ = SITE.z + 4.5;
    const seat = box(0.9, 0.14, 0.7, materials.timber);
    seat.position.set(stoolX, ground(stoolX, stoolZ) + 0.58, stoolZ);
    root.add(seat);
    for (const dx of [-0.31, 0.31]) {
      const leg = box(0.12, 0.58, 0.12, materials.timberDark);
      leg.position.set(stoolX + dx, ground(stoolX + dx, stoolZ) + 0.27, stoolZ);
      root.add(leg);
    }
    addCollider(seat, 0.02);
  }

  function buildEdda() {
    const group = new THREE.Group();
    group.name = 'Edda_Greyfold_Washer';
    root.add(group);

    const skirt = cylinder(0.50, 0.62, 1.10, 8, materials.cloth);
    skirt.position.y = 0.66;
    group.add(skirt);

    const torso = cylinder(0.38, 0.47, 0.82, 8, materials.linenGrey);
    torso.position.y = 1.32;
    group.add(torso);

    const head = mark(new THREE.Mesh(new THREE.SphereGeometry(0.30, 12, 8), materials.skin));
    head.position.y = 1.92;
    group.add(head);

    const scarf = cylinder(0.26, 0.35, 0.26, 8, materials.linenBlue);
    scarf.position.y = 2.14;
    group.add(scarf);

    const route = [
      [SITE.x + 1, SITE.z - 1],
      [SITE.x - 5, SITE.z + 5],
      [SITE.x - 8, SITE.z + 8],
      [SITE.x + 2, SITE.z + 5],
      [SITE.x + 7, SITE.z + 3]
    ];

    group.position.set(route[0][0], ground(route[0][0], route[0][1]), route[0][1]);
    return { group, route, routeIndex: 1, wait: 2.0, speed: 0.46 };
  }

  buildShelter();
  buildWashBasins();
  buildSpringMarker();
  const dryingCloths = buildDryingLines();
  buildLaundryDetails();
  const edda = buildEdda();

  let lastFrame = performance.now();
  let wasNear = false;
  let nextAmbient = performance.now() + 26000;
  const ambientLines = [
    'Edda: Mara still owes me two wool blankets before the next cold rain.',
    'Edda: The spring has run clear since midsummer. Greyfold has been lucky.',
    'Edda: Blue cloth takes twice the rinsing. The dyer never admits it.',
    'Edda: If the north wind holds, these will be dry before supper.'
  ];

  function updateEdda(dt) {
    if (edda.wait > 0) {
      edda.wait -= dt;
      return;
    }

    const [tx, tz] = edda.route[edda.routeIndex];
    const dx = tx - edda.group.position.x;
    const dz = tz - edda.group.position.z;
    const distance = Math.hypot(dx, dz);

    if (distance < 0.22) {
      edda.routeIndex = (edda.routeIndex + 1) % edda.route.length;
      edda.wait = 3.0 + rand() * 5.5;
      return;
    }

    const step = Math.min(distance, edda.speed * dt);
    edda.group.position.x += dx / distance * step;
    edda.group.position.z += dz / distance * step;
    edda.group.position.y = ground(edda.group.position.x, edda.group.position.z);
    edda.group.rotation.y = Math.atan2(dx, dz);
  }

  function updateCloth(now) {
    const t = now * 0.001;
    for (let i = 0; i < dryingCloths.length; i++) {
      const cloth = dryingCloths[i];
      const phase = cloth.userData.phase;
      cloth.rotation.y = Math.sin(t * 0.82 + phase) * 0.07;
      cloth.rotation.z = Math.sin(t * 1.12 + phase * 1.7) * 0.025;
      cloth.position.y = cloth.userData.baseY + Math.sin(t * 0.74 + phase) * 0.015;
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.08, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;

    const dx = SITE.x - camera.position.x;
    const dz = SITE.z - camera.position.z;
    const distanceSq = dx * dx + dz * dz;
    const near = distanceSq < ACTIVE_DISTANCE * ACTIVE_DISTANCE;
    root.visible = near;

    if (!near) {
      wasNear = false;
      return;
    }

    updateEdda(dt);
    updateCloth(now);

    if (!wasNear && distanceSq < 78 * 78) {
      wasNear = true;
      addFeed?.('A roof of dark boards appears beside the Greyfold road. Linen moves in the wind above two stone basins.');
    }

    if (distanceSq < 42 * 42 && now >= nextAmbient) {
      addFeed?.(ambientLines[Math.floor(rand() * ambientLines.length)]);
      nextAmbient = now + 30000 + rand() * 18000;
    }
  }

  requestAnimationFrame(frame);
}

if (window.EMPTYNET_WORLD_API) install(window.EMPTYNET_WORLD_API);
window.addEventListener('emptynet:world-ready', event => install(event.detail), { once: true });
