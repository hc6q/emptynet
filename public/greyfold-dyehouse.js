import * as THREE from 'three';

const SITE = { x: -901, z: 943 };
const ACTIVE_DISTANCE = 440;
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
  const rand = mulberry32(WORLD_SEED ^ 0x6d9137a2);
  const root = new THREE.Group();
  root.name = 'EMPTYNET_Greyfold_Dyehouse';
  scene.add(root);

  const materials = {
    stone: new THREE.MeshStandardMaterial({ color: 0x50524a, roughness: 1 }),
    stoneDark: new THREE.MeshStandardMaterial({ color: 0x393b36, roughness: 1 }),
    timber: new THREE.MeshStandardMaterial({ color: 0x4d3828, roughness: 0.98 }),
    timberDark: new THREE.MeshStandardMaterial({ color: 0x30251d, roughness: 1 }),
    roof: new THREE.MeshStandardMaterial({ color: 0x41443d, roughness: 1 }),
    copper: new THREE.MeshStandardMaterial({ color: 0x675044, roughness: 0.74, metalness: 0.20 }),
    indigo: new THREE.MeshStandardMaterial({ color: 0x334957, roughness: 0.48 }),
    madder: new THREE.MeshStandardMaterial({ color: 0x765049, roughness: 0.52 }),
    ochre: new THREE.MeshStandardMaterial({ color: 0x847050, roughness: 0.56 }),
    wool: new THREE.MeshStandardMaterial({ color: 0xc4bba1, roughness: 1 }),
    woolBlue: new THREE.MeshStandardMaterial({ color: 0x637785, roughness: 1 }),
    woolRed: new THREE.MeshStandardMaterial({ color: 0x80605b, roughness: 1 }),
    woolGold: new THREE.MeshStandardMaterial({ color: 0x90815e, roughness: 1 }),
    apron: new THREE.MeshStandardMaterial({ color: 0x58605b, roughness: 1 }),
    dress: new THREE.MeshStandardMaterial({ color: 0x5e5351, roughness: 1 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xb08d70, roughness: 1 }),
    steam: new THREE.MeshStandardMaterial({ color: 0xb9beb4, transparent: true, opacity: 0.18, depthWrite: false, roughness: 1 })
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

  function buildWorkshop() {
    const x = SITE.x - 3.5;
    const z = SITE.z + 2.5;
    const y = ground(x, z);
    const house = new THREE.Group();
    house.name = 'Greyfold_Dye_Workshop';
    house.position.set(x, y, z);
    house.rotation.y = 0.52;
    root.add(house);

    const floor = box(6.4, 0.26, 4.8, materials.stoneDark);
    floor.position.y = 0.02;
    house.add(floor);

    const back = box(6.1, 2.65, 0.30, materials.stone);
    back.position.set(0, 1.30, -2.12);
    house.add(back);

    const side = box(0.30, 2.45, 4.1, materials.stone);
    side.position.set(-2.90, 1.20, -0.05);
    house.add(side);

    for (const px of [-2.7, 2.7]) {
      const post = box(0.24, 2.65, 0.24, materials.timberDark);
      post.position.set(px, 1.36, 2.0);
      house.add(post);
    }

    const roof = box(6.8, 0.22, 5.25, materials.roof);
    roof.position.set(0, 2.84, -0.10);
    roof.rotation.x = -0.11;
    house.add(roof);

    const workbench = box(3.2, 0.16, 0.76, materials.timber);
    workbench.position.set(1.05, 0.80, -1.48);
    house.add(workbench);
    for (const bx of [-1.35, 1.35]) {
      const leg = box(0.17, 0.72, 0.17, materials.timberDark);
      leg.position.set(1.05 + bx, 0.42, -1.48);
      house.add(leg);
    }

    house.updateWorldMatrix(true, true);
    addCollider(floor, 0.03);
    addCollider(back, 0.05);
    addCollider(side, 0.05);
    addCollider(workbench, 0.03);
  }

  function buildVats() {
    const specs = [
      [SITE.x + 0.5, SITE.z - 2.2, materials.indigo, 0.2],
      [SITE.x + 3.7, SITE.z - 1.0, materials.madder, -0.16],
      [SITE.x + 6.4, SITE.z + 1.0, materials.ochre, 0.08]
    ];
    const steamPuffs = [];

    for (let i = 0; i < specs.length; i++) {
      const [x, z, liquid, rotation] = specs[i];
      const y = ground(x, z);
      const vat = new THREE.Group();
      vat.position.set(x, y, z);
      vat.rotation.y = rotation;
      root.add(vat);

      const base = cylinder(1.08, 1.18, 0.92, 12, materials.stoneDark);
      base.position.y = 0.44;
      vat.add(base);

      const rim = mark(new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.12, 8, 18), materials.copper));
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.92;
      vat.add(rim);

      const surface = cylinder(0.92, 0.92, 0.035, 18, liquid);
      surface.position.y = 0.91;
      surface.castShadow = false;
      vat.add(surface);

      vat.updateWorldMatrix(true, true);
      addCollider(base, 0.05);

      for (let p = 0; p < 4; p++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.16 + p * 0.035, 8, 6), materials.steam.clone());
        puff.castShadow = false;
        puff.receiveShadow = false;
        puff.position.set(x, y + 1.15 + p * 0.32, z);
        puff.userData.phase = rand() * Math.PI * 2;
        puff.userData.baseX = x;
        puff.userData.baseY = puff.position.y;
        puff.userData.baseZ = z;
        root.add(puff);
        steamPuffs.push(puff);
      }
    }

    return steamPuffs;
  }

  function buildDryingYard() {
    const cloths = [];
    const rackXs = [SITE.x - 9.5, SITE.x - 6.7];
    const z1 = SITE.z + 6.0;
    const z2 = SITE.z + 13.0;

    for (let r = 0; r < rackXs.length; r++) {
      const x = rackXs[r];
      for (const z of [z1, z2]) {
        const post = box(0.18, 2.45, 0.18, materials.timberDark);
        post.position.set(x, ground(x, z) + 1.12, z);
        root.add(post);
        addCollider(post, 0.02);
      }

      const midZ = (z1 + z2) * 0.5;
      const rope = cylinder(0.025, 0.025, z2 - z1, 6, materials.timber);
      rope.rotation.x = Math.PI / 2;
      rope.position.set(x, ground(x, midZ) + 2.08, midZ);
      root.add(rope);

      for (let i = 0; i < 4; i++) {
        const t = 0.15 + i * 0.22;
        const z = THREE.MathUtils.lerp(z1, z2, t);
        const mats = [materials.woolBlue, materials.woolRed, materials.woolGold, materials.wool];
        const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.92 + rand() * 0.36, 0.82 + rand() * 0.38, 5, 4), mats[(i + r) % mats.length]);
        cloth.position.set(x, ground(x, z) + 1.58, z);
        cloth.userData.baseY = cloth.position.y;
        cloth.userData.phase = rand() * Math.PI * 2;
        root.add(cloth);
        cloths.push(cloth);
      }
    }

    return cloths;
  }

  function buildYardDetails() {
    const crateSpecs = [
      [SITE.x + 1.6, SITE.z + 5.4, materials.ochre],
      [SITE.x + 3.1, SITE.z + 5.8, materials.madder],
      [SITE.x + 4.4, SITE.z + 5.0, materials.indigo]
    ];

    for (const [x, z, mat] of crateSpecs) {
      const crate = box(0.94, 0.66, 0.82, materials.timber);
      crate.position.set(x, ground(x, z) + 0.31, z);
      crate.rotation.y = (rand() - 0.5) * 0.4;
      root.add(crate);
      addCollider(crate, 0.02);

      for (let i = 0; i < 4; i++) {
        const cake = box(0.22, 0.12, 0.18, mat);
        const ox = (i % 2 - 0.5) * 0.36;
        const oz = (Math.floor(i / 2) - 0.5) * 0.30;
        cake.position.set(x + ox, ground(x, z) + 0.72, z + oz);
        cake.rotation.y = rand() * 0.5;
        root.add(cake);
      }
    }

    const woolX = SITE.x - 1.0;
    const woolZ = SITE.z + 8.2;
    for (let i = 0; i < 5; i++) {
      const bale = cylinder(0.46, 0.50, 0.74, 10, materials.wool);
      const x = woolX + (i % 3) * 0.78;
      const z = woolZ + Math.floor(i / 3) * 0.86;
      bale.rotation.z = Math.PI / 2;
      bale.rotation.y = rand() * Math.PI;
      bale.position.set(x, ground(x, z) + 0.42, z);
      root.add(bale);
      addCollider(bale, 0.02);
    }

    const rinseX = SITE.x - 3.0;
    const rinseZ = SITE.z + 10.2;
    const trough = box(2.65, 0.62, 1.05, materials.stone);
    trough.position.set(rinseX, ground(rinseX, rinseZ) + 0.30, rinseZ);
    trough.rotation.y = 0.16;
    root.add(trough);
    addCollider(trough, 0.03);
  }

  function buildVessa() {
    const person = new THREE.Group();
    person.name = 'Vessa_Greyfold_Dyer';
    root.add(person);

    const skirt = cylinder(0.48, 0.60, 1.08, 8, materials.dress);
    skirt.position.y = 0.65;
    person.add(skirt);

    const torso = cylinder(0.36, 0.45, 0.82, 8, materials.apron);
    torso.position.y = 1.31;
    person.add(torso);

    const head = mark(new THREE.Mesh(new THREE.SphereGeometry(0.30, 12, 8), materials.skin));
    head.position.y = 1.91;
    person.add(head);

    const kerchief = cylinder(0.26, 0.34, 0.24, 8, materials.woolBlue);
    kerchief.position.y = 2.13;
    person.add(kerchief);

    const route = [
      [SITE.x + 0.2, SITE.z - 1.2],
      [SITE.x + 6.0, SITE.z + 0.8],
      [SITE.x + 2.4, SITE.z + 5.4],
      [SITE.x - 2.8, SITE.z + 9.7],
      [SITE.x - 8.2, SITE.z + 9.2],
      [SITE.x - 4.4, SITE.z + 2.8]
    ];

    person.position.set(route[0][0], ground(route[0][0], route[0][1]), route[0][1]);
    return { person, route, routeIndex: 1, wait: 2.5, speed: 0.44 };
  }

  buildWorkshop();
  const steamPuffs = buildVats();
  const dryingCloths = buildDryingYard();
  buildYardDetails();
  const vessa = buildVessa();

  let lastFrame = performance.now();
  let wasNear = false;
  let nextAmbient = performance.now() + 23000;
  const ambientLines = [
    'Vessa: Edda says blue needs twice the rinsing. She is right, unfortunately.',
    'Vessa: Mara brought good wool this week. Hardly any burrs in it.',
    'Vessa: Hale wants the grain-sack hems dark enough to hide road dust.',
    'Vessa: Madder catches better after a cold night. That is the part apprentices never believe.',
    'Vessa: Greyfold used to trade undyed wool. Now half the road wants blue.'
  ];

  function updateVessa(dt) {
    if (vessa.wait > 0) {
      vessa.wait -= dt;
      return;
    }

    const [tx, tz] = vessa.route[vessa.routeIndex];
    const dx = tx - vessa.person.position.x;
    const dz = tz - vessa.person.position.z;
    const distance = Math.hypot(dx, dz);

    if (distance < 0.24) {
      vessa.routeIndex = (vessa.routeIndex + 1) % vessa.route.length;
      vessa.wait = 3.5 + rand() * 6.0;
      return;
    }

    const step = Math.min(distance, vessa.speed * dt);
    vessa.person.position.x += dx / distance * step;
    vessa.person.position.z += dz / distance * step;
    vessa.person.position.y = ground(vessa.person.position.x, vessa.person.position.z);
    vessa.person.rotation.y = Math.atan2(dx, dz);
  }

  function updateCloth(now) {
    const t = now * 0.001;
    for (const cloth of dryingCloths) {
      const phase = cloth.userData.phase;
      cloth.rotation.y = Math.sin(t * 0.78 + phase) * 0.065;
      cloth.rotation.z = Math.sin(t * 1.02 + phase * 1.6) * 0.028;
      cloth.position.y = cloth.userData.baseY + Math.sin(t * 0.70 + phase) * 0.012;
    }
  }

  function updateSteam(now) {
    const t = now * 0.001;
    for (const puff of steamPuffs) {
      const phase = puff.userData.phase;
      const cycle = (t * 0.12 + phase / (Math.PI * 2)) % 1;
      puff.position.x = puff.userData.baseX + Math.sin(t * 0.25 + phase) * 0.10;
      puff.position.y = puff.userData.baseY + cycle * 1.05;
      puff.position.z = puff.userData.baseZ + Math.cos(t * 0.21 + phase) * 0.08;
      const scale = 0.72 + cycle * 0.85;
      puff.scale.setScalar(scale);
      puff.material.opacity = 0.18 * (1 - cycle);
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

    updateVessa(dt);
    updateCloth(now);
    updateSteam(now);

    if (!wasNear && distanceSq < 82 * 82) {
      wasNear = true;
      addFeed?.('Warm dye steam drifts across the Greyfold road. Wool hangs in muted blue, rust and ochre beyond the washhouse.');
    }

    if (distanceSq < 44 * 44 && now >= nextAmbient) {
      addFeed?.(ambientLines[Math.floor(rand() * ambientLines.length)]);
      nextAmbient = now + 30000 + rand() * 19000;
    }
  }

  requestAnimationFrame(frame);
}

if (window.EMPTYNET_WORLD_API) install(window.EMPTYNET_WORLD_API);
window.addEventListener('emptynet:world-ready', event => install(event.detail), { once: true });
