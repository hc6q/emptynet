import * as THREE from 'three';

// A mundane supply cart that keeps the Blackpine / Old Watch road connected.
// Its phase comes from wall-clock time, so nearby clients see roughly the same journey
// without introducing authoritative multiplayer state or persistence writes.
const ROUTE = [
  { x: 744, z: -560 },
  { x: 731, z: -542 },
  { x: 714, z: -519 },
  { x: 697, z: -491 },
  { x: 675, z: -455 },
  { x: 656, z: -423 },
  { x: 646, z: -408 }
];
const ACTIVE_DISTANCE = 460;
const TRAVEL_SECONDS = 205;
const END_REST_SECONDS = 34;
const CYCLE_SECONDS = (TRAVEL_SECONDS + END_REST_SECONDS) * 2;
let installed = false;

function install(api) {
  if (installed || !api?.scene || !api?.camera || !api?.terrainHeight || !Array.isArray(api?.colliders)) return;
  installed = true;

  const { scene, camera, terrainHeight, colliders, addFeed } = api;
  const root = new THREE.Group();
  root.name = 'EMPTYNET_Blackpine_Supply_Cart';
  scene.add(root);

  const mats = {
    wood: new THREE.MeshStandardMaterial({ color: 0x4b3827, roughness: 1 }),
    darkWood: new THREE.MeshStandardMaterial({ color: 0x2f261f, roughness: 1 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x282a28, roughness: 0.82, metalness: 0.2 }),
    canvas: new THREE.MeshStandardMaterial({ color: 0x827866, roughness: 1, side: THREE.DoubleSide }),
    sack: new THREE.MeshStandardMaterial({ color: 0x786b55, roughness: 1 }),
    mule: new THREE.MeshStandardMaterial({ color: 0x51483d, roughness: 1 }),
    mane: new THREE.MeshStandardMaterial({ color: 0x28241f, roughness: 1 }),
    coat: new THREE.MeshStandardMaterial({ color: 0x50564d, roughness: 1 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xaa8568, roughness: 1 })
  };

  const mark = mesh => { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; };
  const box = (w, h, d, mat) => mark(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat));
  const cyl = (r1, r2, h, sides, mat) => mark(new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, sides), mat));

  // Cart body. Local +Z is forward.
  const cart = new THREE.Group();
  cart.name = 'Blackpine_Flour_And_Salt_Cart';
  root.add(cart);

  const bed = box(1.75, 0.22, 2.35, mats.wood);
  bed.position.y = 0.92;
  cart.add(bed);
  for (const x of [-0.82, 0.82]) {
    const rail = box(0.12, 0.72, 2.25, mats.darkWood);
    rail.position.set(x, 1.28, 0);
    cart.add(rail);
  }
  const back = box(1.72, 0.68, 0.12, mats.darkWood);
  back.position.set(0, 1.28, -1.1);
  cart.add(back);

  const wheelGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.12, 14);
  const wheels = [];
  for (const x of [-0.94, 0.94]) {
    for (const z of [-0.72, 0.72]) {
      const wheel = mark(new THREE.Mesh(wheelGeo, mats.darkWood));
      wheel.position.set(x, 0.63, z);
      wheel.rotation.z = Math.PI / 2;
      cart.add(wheel);
      wheels.push(wheel);
      const hub = cyl(0.12, 0.12, 0.18, 8, mats.iron);
      hub.position.copy(wheel.position);
      hub.rotation.z = Math.PI / 2;
      cart.add(hub);
    }
  }

  // Cargo makes the route legible as ordinary regional trade.
  for (let i = 0; i < 6; i++) {
    const sack = mark(new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), mats.sack));
    sack.scale.set(0.9, 1.25, 0.72);
    sack.position.set((i % 2 ? 0.42 : -0.42), 1.35 + Math.floor(i / 4) * 0.38, -0.5 + (i % 3) * 0.48);
    sack.rotation.y = i * 0.71;
    cart.add(sack);
  }
  const cask = cyl(0.34, 0.38, 0.78, 10, mats.wood);
  cask.rotation.z = Math.PI / 2;
  cask.position.set(0, 1.32, 0.76);
  cart.add(cask);

  // Driver: Jory, a hauler rather than a guide or quest-giver.
  const driver = new THREE.Group();
  driver.name = 'Jory_Blackpine_Carter';
  driver.position.set(0, 1.03, 0.93);
  cart.add(driver);
  const torso = cyl(0.29, 0.38, 0.92, 8, mats.coat);
  torso.position.y = 0.52;
  driver.add(torso);
  const head = mark(new THREE.Mesh(new THREE.SphereGeometry(0.23, 10, 7), mats.skin));
  head.position.y = 1.13;
  driver.add(head);
  const cap = cyl(0.17, 0.27, 0.16, 8, mats.darkWood);
  cap.position.y = 1.32;
  driver.add(cap);

  // Mule and shafts are part of the same world-space group and share normal depth.
  const mule = new THREE.Group();
  mule.name = 'Moss_Blackpine_Mule';
  mule.position.z = 2.95;
  cart.add(mule);
  const muleBody = mark(new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.05, 5, 8), mats.mule));
  muleBody.rotation.x = Math.PI / 2;
  muleBody.position.y = 1.05;
  mule.add(muleBody);
  const neck = cyl(0.25, 0.32, 0.78, 8, mats.mule);
  neck.position.set(0, 1.35, 0.55);
  neck.rotation.x = -0.42;
  mule.add(neck);
  const muleHead = mark(new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.48, 0.7), mats.mule));
  muleHead.position.set(0, 1.68, 0.84);
  mule.add(muleHead);
  for (const x of [-0.22, 0.22]) {
    const ear = cyl(0.055, 0.10, 0.42, 6, mats.mane);
    ear.position.set(x, 2.03, 0.91);
    ear.rotation.x = -0.12;
    mule.add(ear);
  }
  const legs = [];
  for (const x of [-0.27, 0.27]) {
    for (const z of [-0.45, 0.45]) {
      const leg = cyl(0.075, 0.105, 0.92, 7, mats.mule);
      leg.position.set(x, 0.48, z);
      mule.add(leg);
      legs.push(leg);
    }
  }
  for (const x of [-0.58, 0.58]) {
    const shaft = box(0.07, 0.07, 3.0, mats.wood);
    shaft.position.set(x, 0.82, 1.95);
    cart.add(shaft);
  }

  // Dynamic colliders are updated in-place; the movement system keeps references to these Box3s.
  const cartCollider = new THREE.Box3();
  const muleCollider = new THREE.Box3();
  colliders.push(cartCollider, muleCollider);

  const segmentLengths = [];
  let totalLength = 0;
  for (let i = 0; i < ROUTE.length - 1; i++) {
    const len = Math.hypot(ROUTE[i + 1].x - ROUTE[i].x, ROUTE[i + 1].z - ROUTE[i].z);
    segmentLengths.push(len);
    totalLength += len;
  }

  function sampleRoute(t, reverse) {
    let target = (reverse ? 1 - t : t) * totalLength;
    for (let i = 0; i < segmentLengths.length; i++) {
      if (target <= segmentLengths[i] || i === segmentLengths.length - 1) {
        const a = ROUTE[i], b = ROUTE[i + 1];
        const f = Math.min(1, target / segmentLengths[i]);
        const x = THREE.MathUtils.lerp(a.x, b.x, f);
        const z = THREE.MathUtils.lerp(a.z, b.z, f);
        const heading = Math.atan2(b.x - a.x, b.z - a.z) + (reverse ? Math.PI : 0);
        return { x, z, heading };
      }
      target -= segmentLengths[i];
    }
    return { ...ROUTE[0], heading: 0 };
  }

  function journeyState(nowMs) {
    // Fixed epoch + cycle makes the journey deterministic across clients and reloads.
    const sec = ((nowMs / 1000) % CYCLE_SECONDS + CYCLE_SECONDS) % CYCLE_SECONDS;
    if (sec < TRAVEL_SECONDS) return { t: sec / TRAVEL_SECONDS, reverse: false, moving: true };
    if (sec < TRAVEL_SECONDS + END_REST_SECONDS) return { t: 1, reverse: false, moving: false };
    const backStart = TRAVEL_SECONDS + END_REST_SECONDS;
    if (sec < backStart + TRAVEL_SECONDS) return { t: (sec - backStart) / TRAVEL_SECONDS, reverse: true, moving: true };
    return { t: 0, reverse: true, moving: false };
  }

  let lastX = ROUTE[0].x;
  let lastZ = ROUTE[0].z;
  let wasNear = false;
  let nextRemark = 0;
  let remarkIndex = 0;
  const remarks = [
    'Jory: Hale’s flour goes up. Salt and lamp oil come back down.',
    'Jory: Tomas filled that rut. Moss still finds the old hole every trip.',
    'Jory: Orin keeps a dry stall if the weather turns before Blackpine.',
    'Jory: Derren says the well rope is not to be touched after dark. Fine by me.'
  ];

  function frame(now) {
    requestAnimationFrame(frame);
    const state = journeyState(Date.now());
    const p = sampleRoute(state.t, state.reverse);
    root.position.set(p.x, terrainHeight(p.x, p.z), p.z);
    root.rotation.y = p.heading;

    const dx = camera.position.x - p.x;
    const dz = camera.position.z - p.z;
    const nearSq = dx * dx + dz * dz;
    root.visible = nearSq < ACTIVE_DISTANCE * ACTIVE_DISTANCE;
    if (!root.visible) { wasNear = false; return; }

    const moved = Math.hypot(p.x - lastX, p.z - lastZ);
    if (state.moving && moved > 0.0001) {
      const spin = moved / 0.62;
      wheels.forEach(w => { w.rotation.x -= spin; });
      const gait = Math.sin(Date.now() * 0.007) * 0.16;
      legs.forEach((leg, i) => { leg.rotation.x = (i % 2 ? gait : -gait); });
      mule.position.y = Math.sin(Date.now() * 0.014) * 0.018;
    } else {
      legs.forEach(leg => { leg.rotation.x *= 0.9; });
      mule.position.y *= 0.9;
    }
    lastX = p.x;
    lastZ = p.z;

    root.updateWorldMatrix(true, true);
    cartCollider.setFromObject(cart).expandByScalar(0.03);
    muleCollider.setFromObject(mule).expandByScalar(0.04);

    const near = nearSq < 15 * 15;
    if (near && !wasNear && typeof addFeed === 'function') {
      addFeed(state.moving ? 'A loaded cart works slowly along the Old Watch road.' : 'A mule cart has stopped at the end of its run.', true, 9000);
      nextRemark = now + 6500;
    }
    if (near && now > nextRemark && typeof addFeed === 'function') {
      addFeed(remarks[remarkIndex % remarks.length], true, 11000);
      remarkIndex++;
      nextRemark = now + 36000;
    }
    wasNear = near;
  }

  requestAnimationFrame(frame);
}

if (window.EMPTYNET_WORLD_API) install(window.EMPTYNET_WORLD_API);
window.addEventListener('emptynet:world-ready', event => install(event.detail), { once: true });
