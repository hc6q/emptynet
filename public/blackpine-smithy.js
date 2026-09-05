import * as THREE from 'three';

// Blackpine's ordinary roadside forge. Alwen's hard charcoal ends up here,
// while Fen keeps cart iron and road tools alive between larger settlements.
const SITE = { x: 782, z: -585 };
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
  const rand = mulberry32(WORLD_SEED ^ 0x4f524745);
  const root = new THREE.Group();
  root.name = 'EMPTYNET_Blackpine_Smithy';
  root.position.set(SITE.x, terrainHeight(SITE.x, SITE.z), SITE.z);
  root.rotation.y = 0.34;
  scene.add(root);

  const mats = {
    stone: new THREE.MeshStandardMaterial({ color: 0x50514b, roughness: 1 }),
    darkStone: new THREE.MeshStandardMaterial({ color: 0x343733, roughness: 1 }),
    timber: new THREE.MeshStandardMaterial({ color: 0x4a3525, roughness: 1 }),
    darkWood: new THREE.MeshStandardMaterial({ color: 0x2d241c, roughness: 1 }),
    roof: new THREE.MeshStandardMaterial({ color: 0x3b3d36, roughness: 1 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x292c2b, roughness: 0.68, metalness: 0.34 }),
    hotIron: new THREE.MeshStandardMaterial({ color: 0x7a3521, emissive: 0xff5a1f, emissiveIntensity: 1.35, roughness: 0.56 }),
    ember: new THREE.MeshStandardMaterial({ color: 0x6b2a18, emissive: 0xff4b14, emissiveIntensity: 1.5, roughness: 0.8 }),
    leather: new THREE.MeshStandardMaterial({ color: 0x584231, roughness: 1 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x56584f, roughness: 1 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xa98568, roughness: 1 }),
    water: new THREE.MeshStandardMaterial({ color: 0x42565a, roughness: 0.3, metalness: 0.03 }),
    coal: new THREE.MeshStandardMaterial({ color: 0x181a19, roughness: 0.96 })
  };
  const smokeMat = new THREE.MeshBasicMaterial({ color: 0x7d7d77, transparent: true, opacity: 0.13, depthWrite: false });

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
  function addCollider(obj, pad = 0.035) {
    obj.updateWorldMatrix(true, false);
    colliders.push(new THREE.Box3().setFromObject(obj).expandByScalar(pad));
  }

  // Open-fronted work shed: deep foundations hide small grade changes while each
  // load-bearing post is individually terrain-anchored.
  const foundation = box(7.8, 0.9, 5.9, mats.stone);
  foundation.position.set(0, localY(0, 0.6) - 0.34, 0.6);
  root.add(foundation);

  const backWall = box(7.1, 2.75, 0.38, mats.darkStone);
  backWall.position.set(0, localY(0, -2.05) + 1.22, -2.05);
  root.add(backWall);

  const posts = [];
  for (const [x, z] of [[-3.2, -1.72], [3.2, -1.72], [-3.2, 2.45], [3.2, 2.45]]) {
    const post = box(0.24, 3.35, 0.24, mats.darkWood);
    post.position.set(x, localY(x, z) + 1.54, z);
    root.add(post);
    posts.push(post);
  }

  const roof = box(7.8, 0.24, 5.5, mats.roof);
  roof.position.set(0, Math.max(...posts.map(p => p.position.y)) + 1.58, 0.35);
  roof.rotation.z = -0.055;
  root.add(roof);

  // Stone forge and hood.
  const forgeX = -2.1, forgeZ = -0.8;
  const forge = box(2.25, 1.25, 1.45, mats.stone);
  forge.position.set(forgeX, localY(forgeX, forgeZ) + 0.49, forgeZ);
  root.add(forge);
  const fireBed = box(1.45, 0.12, 0.82, mats.ember);
  fireBed.position.set(forgeX, forge.position.y + 0.68, forgeZ + 0.05);
  root.add(fireBed);
  const hood = new THREE.Mesh(new THREE.ConeGeometry(1.25, 1.45, 4, 1, true), mats.iron);
  hood.position.set(forgeX, forge.position.y + 2.0, forgeZ);
  hood.rotation.y = Math.PI / 4;
  root.add(mark(hood));
  const chimney = box(0.72, 2.1, 0.72, mats.darkStone);
  chimney.position.set(forgeX, roof.position.y + 0.82, forgeZ);
  root.add(chimney);

  const fireLight = new THREE.PointLight(0xff7a32, 0.7, 10, 2.0);
  fireLight.position.set(forgeX, fireBed.position.y + 0.35, forgeZ + 0.2);
  root.add(fireLight);

  // Bellows next to the hearth. The handle moves during Fen's forge phase.
  const bellows = new THREE.Group();
  bellows.position.set(-3.05, localY(-3.05, 0.25) + 0.55, 0.25);
  root.add(bellows);
  const bellowsBody = box(0.75, 0.42, 1.05, mats.leather);
  bellows.add(bellowsBody);
  const bellowsHandle = box(0.14, 1.2, 0.14, mats.timber);
  bellowsHandle.position.set(0, 0.64, 0.2);
  bellows.add(bellowsHandle);

  // Anvil and stump, positioned as the center of the visible work cycle.
  const stump = cyl(0.5, 0.58, 0.82, 10, mats.darkWood);
  stump.position.set(0.55, localY(0.55, 0.15) + 0.39, 0.15);
  root.add(stump);
  const anvil = new THREE.Group();
  anvil.position.set(0.55, stump.position.y + 0.68, 0.15);
  root.add(anvil);
  const anvilBody = box(1.15, 0.28, 0.42, mats.iron);
  anvil.add(anvilBody);
  const horn = mark(new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.72, 8), mats.iron));
  horn.rotation.z = -Math.PI / 2;
  horn.position.x = 0.75;
  anvil.add(horn);
  const hotBar = box(0.88, 0.06, 0.11, mats.hotIron);
  hotBar.position.set(0.05, 0.2, 0.03);
  anvil.add(hotBar);

  // Quench trough, charcoal bins, repaired wheel rims and road tools.
  const troughX = 2.55, troughZ = 0.45;
  const trough = box(1.55, 0.72, 0.9, mats.darkWood);
  trough.position.set(troughX, localY(troughX, troughZ) + 0.3, troughZ);
  root.add(trough);
  const water = box(1.34, 0.04, 0.7, mats.water);
  water.position.set(troughX, trough.position.y + 0.36, troughZ);
  root.add(water);

  const coalBin = box(1.65, 0.82, 1.2, mats.darkWood);
  coalBin.position.set(-1.85, localY(-1.85, 1.75) + 0.34, 1.75);
  root.add(coalBin);
  for (let i = 0; i < 14; i++) {
    const a = i * 2.399963;
    const r = 0.16 + (i % 5) * 0.11;
    const coal = mark(new THREE.Mesh(new THREE.DodecahedronGeometry(0.15 + (i % 3) * 0.035, 0), mats.coal));
    coal.position.set(-1.85 + Math.cos(a) * r, coalBin.position.y + 0.45 + Math.floor(i / 5) * 0.08, 1.75 + Math.sin(a) * r * 0.72);
    coal.rotation.set(a, i, a * 0.5);
    root.add(coal);
  }

  for (let i = 0; i < 3; i++) {
    const rim = mark(new THREE.Mesh(new THREE.TorusGeometry(0.58 - i * 0.04, 0.045, 6, 20), mats.iron));
    const lx = 2.4 + i * 0.36, lz = -1.7 + i * 0.08;
    rim.position.set(lx, localY(lx, lz) + 0.62, lz);
    rim.rotation.set(Math.PI / 2, 0.12 * i, 0.08 * i);
    root.add(rim);
  }

  const toolRack = box(2.35, 0.13, 0.13, mats.timber);
  toolRack.position.set(1.1, localY(1.1, -1.76) + 1.55, -1.76);
  root.add(toolRack);
  for (let i = 0; i < 4; i++) {
    const handle = cyl(0.028, 0.035, 1.05, 6, mats.timber);
    handle.position.set(0.3 + i * 0.5, localY(0.3 + i * 0.5, -1.58) + 0.72, -1.58);
    handle.rotation.z = (i - 1.5) * 0.035;
    root.add(handle);
    const head = box(i % 2 ? 0.34 : 0.24, 0.11, 0.12, mats.iron);
    head.position.set(handle.position.x, handle.position.y + 0.49, -1.58);
    root.add(head);
  }

  // A small shoeing rail at the roadside edge. It ties Moss and passing carts to
  // the forge without scripting the player as a customer.
  const shoePosts = [];
  for (const x of [-1.1, 1.1]) {
    const p = box(0.18, 1.5, 0.18, mats.darkWood);
    p.position.set(x + 1.25, localY(x + 1.25, 3.15) + 0.69, 3.15);
    root.add(p);
    shoePosts.push(p);
  }
  const shoeRail = box(2.35, 0.16, 0.16, mats.timber);
  shoeRail.position.set(1.25, Math.max(...shoePosts.map(p => p.position.y)) + 0.18, 3.15);
  root.add(shoeRail);

  // Fen, Blackpine's smith. His work loop is independent of the camera.
  const fen = new THREE.Group();
  fen.name = 'Fen_Blackpine_Smith';
  root.add(fen);
  const body = cyl(0.34, 0.44, 1.15, 8, mats.cloth);
  body.position.y = 0.72;
  fen.add(body);
  const apron = box(0.68, 0.92, 0.08, mats.leather);
  apron.position.set(0, 0.72, 0.37);
  fen.add(apron);
  const head = mark(new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 7), mats.skin));
  head.position.y = 1.48;
  fen.add(head);
  const cap = cyl(0.18, 0.28, 0.17, 8, mats.darkWood);
  cap.position.y = 1.69;
  fen.add(cap);
  const hammerPivot = new THREE.Group();
  hammerPivot.position.set(0.35, 1.03, 0.12);
  fen.add(hammerPivot);
  const hammerHandle = cyl(0.026, 0.032, 0.76, 6, mats.timber);
  hammerHandle.position.y = -0.28;
  hammerPivot.add(hammerHandle);
  const hammerHead = box(0.36, 0.16, 0.16, mats.iron);
  hammerHead.position.y = -0.68;
  hammerPivot.add(hammerHead);

  const route = [
    [0.65, 0.75, 5.8],   // anvil
    [-2.6, 0.15, 4.8],  // forge / bellows
    [2.55, 0.85, 4.0],  // quench
    [-1.75, 1.55, 4.2], // coal
    [1.35, 2.75, 5.5]   // shoeing rail
  ];
  let routeIndex = 0;
  let wait = 0;
  let last = performance.now();
  fen.position.set(route[0][0], localY(route[0][0], route[0][1]), route[0][1]);

  // Smoke lives in the primary scene and rises from the actual chimney location.
  const smoke = [];
  for (let i = 0; i < 6; i++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.25 + i * 0.03, 7, 5), smokeMat.clone());
    puff.userData.phase = i / 6;
    root.add(puff);
    smoke.push(puff);
  }

  root.updateWorldMatrix(true, true);
  addCollider(foundation, 0.06);
  addCollider(backWall, 0.05);
  posts.forEach(p => addCollider(p, 0.025));
  addCollider(forge, 0.05);
  addCollider(bellowsBody, 0.03);
  addCollider(stump, 0.03);
  addCollider(anvil, 0.035);
  addCollider(trough, 0.04);
  addCollider(coalBin, 0.04);
  shoePosts.forEach(p => addCollider(p, 0.02));
  addCollider(shoeRail, 0.02);

  let wasNear = false;
  let nextRemark = performance.now() + 15000;
  let remarkIndex = 0;
  const remarks = [
    'Fen: Alwen sent good hard coal this time. Tell her I said that once, not twice.',
    'Fen: Jory needs this rim before dusk. Moss can pull a lame cart, but he should not have to.',
    'Fen: Tomas blunts a pick faster than the road blunts a wheel.',
    'Fen: Orin keeps three spare nails in his porch beam. Says four invites trouble.',
    'Fen: Old Watch damp gets into iron. Oil your hinges before you climb that road.'
  ];

  function updateFen(now, dt) {
    if (wait > 0) {
      wait -= dt;
      if (routeIndex === 0) {
        const strike = Math.max(0, Math.sin(now * 0.012));
        hammerPivot.rotation.z = -0.3 - strike * 1.05;
        hotBar.material.emissiveIntensity = 0.9 + strike * 0.8;
      } else if (routeIndex === 1) {
        bellowsHandle.rotation.x = Math.sin(now * 0.0048) * 0.32;
        fireLight.intensity = 0.65 + Math.max(0, Math.sin(now * 0.0048)) * 0.45;
      }
      return;
    }

    hammerPivot.rotation.z *= 0.86;
    bellowsHandle.rotation.x *= 0.86;
    const next = (routeIndex + 1) % route.length;
    const [tx, tz] = route[next];
    const dx = tx - fen.position.x, dz = tz - fen.position.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.16) {
      routeIndex = next;
      wait = route[routeIndex][2] + rand() * 2.4;
      return;
    }
    const step = Math.min(d, 0.48 * dt);
    fen.position.x += dx / d * step;
    fen.position.z += dz / d * step;
    fen.position.y = localY(fen.position.x, fen.position.z);
    fen.rotation.y = Math.atan2(dx, dz);
  }

  function updateSmoke(now) {
    const t = now * 0.00019;
    for (let i = 0; i < smoke.length; i++) {
      const puff = smoke[i];
      const phase = (t + puff.userData.phase) % 1;
      puff.position.set(
        forgeX + Math.sin(now * 0.00038 + i * 1.7) * (0.08 + phase * 0.42),
        chimney.position.y + 1.15 + phase * 5.4,
        forgeZ + Math.cos(now * 0.00031 + i) * (0.06 + phase * 0.3)
      );
      const scale = 0.75 + phase * 1.8;
      puff.scale.setScalar(scale);
      puff.material.opacity = (1 - phase) * 0.14;
    }
    fireBed.material.emissiveIntensity = 1.25 + Math.sin(now * 0.006) * 0.18;
    if (routeIndex !== 1 || wait <= 0) fireLight.intensity = 0.68 + Math.sin(now * 0.007) * 0.08;
  }

  function updateRemarks(now) {
    const distance = Math.hypot(camera.position.x - SITE.x, camera.position.z - SITE.z);
    const near = distance < 17;
    if (near && !wasNear && typeof addFeed === 'function') {
      addFeed('Hammering carries from an open forge beside the Blackpine road.', true, 9000);
      nextRemark = now + 6500;
    }
    if (near && now > nextRemark && typeof addFeed === 'function') {
      addFeed(remarks[remarkIndex % remarks.length], true, 11000);
      remarkIndex++;
      nextRemark = now + 32000;
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
    updateFen(now, dt);
    updateSmoke(now);
    updateRemarks(now);
  }
  requestAnimationFrame(frame);
}

if (window.EMPTYNET_WORLD_API) install(window.EMPTYNET_WORLD_API);
window.addEventListener('emptynet:world-ready', event => install(event.detail), { once: true });
