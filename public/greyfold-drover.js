import * as THREE from 'three';

// Mara moves part of Greyfold's flock between the wool yard and the south pasture.
// The routine is ordinary agricultural work: sheep drift, stop to graze and bunch at
// narrow points while a dog ranges around the outside. Nothing waits for the visitor.
const ACTIVE_DISTANCE = 620;
const CYCLE_MS = 11 * 60 * 1000;
const ROUTE = [
  { x: -1008, z: 834, wait: 0.10 },
  { x: -994, z: 850, wait: 0.02 },
  { x: -976, z: 871, wait: 0.02 },
  { x: -958, z: 892, wait: 0.12 },
  { x: -943, z: 914, wait: 0.02 },
  { x: -929, z: 941, wait: 0.03 },
  { x: -918, z: 969, wait: 0.08 }
];
const WORLD_SEED = 28031997;
let installed = false;

function fract(v) { return v - Math.floor(v); }
function hash(i, salt = 0) {
  return fract(Math.sin((i + WORLD_SEED * 0.001 + salt * 19.31) * 91.731) * 43758.5453123);
}

function install(api) {
  if (installed || !api?.scene || !api?.camera || !api?.terrainHeight || !Array.isArray(api?.colliders)) return;
  installed = true;

  const { scene, camera, terrainHeight, colliders, addFeed } = api;
  const root = new THREE.Group();
  root.name = 'EMPTYNET_Greyfold_Drover_Flock';
  scene.add(root);

  const mark = mesh => { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; };
  const mats = {
    wool: new THREE.MeshStandardMaterial({ color: 0xb8af98, roughness: 1 }),
    woolDark: new THREE.MeshStandardMaterial({ color: 0x8d856f, roughness: 1 }),
    face: new THREE.MeshStandardMaterial({ color: 0x39352e, roughness: 1 }),
    hoof: new THREE.MeshStandardMaterial({ color: 0x292722, roughness: 1 }),
    dog: new THREE.MeshStandardMaterial({ color: 0x3f3931, roughness: 1 }),
    dogPale: new THREE.MeshStandardMaterial({ color: 0x8e806b, roughness: 1 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xa77e62, roughness: 1 }),
    coat: new THREE.MeshStandardMaterial({ color: 0x4f584a, roughness: 1 }),
    cloak: new THREE.MeshStandardMaterial({ color: 0x66604f, roughness: 1 }),
    leather: new THREE.MeshStandardMaterial({ color: 0x49372a, roughness: 1 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x57402d, roughness: 1 })
  };

  const sheepBodyGeo = new THREE.SphereGeometry(0.42, 9, 7);
  const sheepHeadGeo = new THREE.SphereGeometry(0.19, 8, 6);
  const legGeo = new THREE.CylinderGeometry(0.035, 0.045, 0.42, 5);

  function makeSheep(index) {
    const sheep = new THREE.Group();
    sheep.name = `Mara_Sheep_${index + 1}`;
    const wool = index === 5 ? mats.woolDark : mats.wool;

    const body = mark(new THREE.Mesh(sheepBodyGeo, wool));
    body.scale.set(1.0, 0.80, 1.28);
    body.position.y = 0.54;
    sheep.add(body);

    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.62, 0.48);
    sheep.add(headPivot);
    const head = mark(new THREE.Mesh(sheepHeadGeo, mats.face));
    head.scale.set(0.82, 1.0, 1.12);
    headPivot.add(head);

    const earGeo = new THREE.BoxGeometry(0.19, 0.045, 0.08);
    const leftEar = mark(new THREE.Mesh(earGeo, mats.face));
    leftEar.position.set(-0.18, 0.07, 0.0);
    leftEar.rotation.z = -0.20;
    headPivot.add(leftEar);
    const rightEar = leftEar.clone();
    rightEar.position.x = 0.18;
    rightEar.rotation.z = 0.20;
    headPivot.add(rightEar);

    const legs = [];
    for (const [x, z] of [[-0.22,0.27],[0.22,0.27],[-0.22,-0.25],[0.22,-0.25]]) {
      const leg = mark(new THREE.Mesh(legGeo, mats.hoof));
      leg.position.set(x, 0.22, z);
      sheep.add(leg);
      legs.push(leg);
    }

    sheep.userData.body = body;
    sheep.userData.headPivot = headPivot;
    sheep.userData.legs = legs;
    root.add(sheep);
    return sheep;
  }

  function makeDog() {
    const dog = new THREE.Group();
    dog.name = 'Nell_Sheepdog';
    const body = mark(new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 7), mats.dog));
    body.scale.set(0.78, 0.72, 1.45);
    body.position.y = 0.38;
    dog.add(body);
    const chest = mark(new THREE.Mesh(new THREE.SphereGeometry(0.17, 7, 6), mats.dogPale));
    chest.scale.set(0.8, 1.15, 0.65);
    chest.position.set(0, 0.38, 0.27);
    dog.add(chest);
    const head = mark(new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), mats.dog));
    head.position.set(0, 0.53, 0.34);
    dog.add(head);
    for (const x of [-0.10, 0.10]) {
      const ear = mark(new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 4), mats.dog));
      ear.position.set(x, 0.73, 0.31);
      dog.add(ear);
    }
    const tail = mark(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.48, 6), mats.dog));
    tail.position.set(0, 0.47, -0.40);
    tail.rotation.x = -1.0;
    dog.add(tail);
    dog.userData.tail = tail;
    root.add(dog);
    return dog;
  }

  function makeMara() {
    const person = new THREE.Group();
    person.name = 'Mara_Drover';
    const body = mark(new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.39, 1.08, 9), mats.coat));
    body.position.y = 0.91;
    person.add(body);
    const cloak = mark(new THREE.Mesh(new THREE.ConeGeometry(0.43, 1.12, 10, 1, true), mats.cloak));
    cloak.position.set(0, 1.02, -0.07);
    cloak.rotation.x = 0.04;
    person.add(cloak);
    const head = mark(new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), mats.skin));
    head.position.y = 1.60;
    person.add(head);
    const hat = mark(new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.34, 0.13, 10), mats.leather));
    hat.position.y = 1.80;
    person.add(hat);
    const staff = mark(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 1.85, 6), mats.wood));
    staff.position.set(0.42, 0.88, 0.08);
    staff.rotation.z = -0.10;
    person.add(staff);
    root.add(person);
    return person;
  }

  const sheep = Array.from({ length: 7 }, (_, i) => ({
    mesh: makeSheep(i),
    along: 0.020 + i * 0.010,
    side: (hash(i, 2) - 0.5) * 4.8,
    phase: hash(i, 3) * Math.PI * 2,
    graze: hash(i, 4)
  }));
  const dog = makeDog();
  const mara = makeMara();

  // Mara is substantial enough to block movement. Sheep and Nell intentionally do
  // not: a moving flock should part around a traveller instead of forming invisible walls.
  const maraCollider = new THREE.Box3();
  colliders.push(maraCollider);

  const segmentLengths = [];
  let routeLength = 0;
  for (let i = 0; i < ROUTE.length - 1; i++) {
    const len = Math.hypot(ROUTE[i + 1].x - ROUTE[i].x, ROUTE[i + 1].z - ROUTE[i].z);
    segmentLengths.push(len);
    routeLength += len;
  }

  function sampleForward(progress) {
    const p = THREE.MathUtils.clamp(progress, 0, 0.999999);
    let target = p * routeLength;
    for (let i = 0; i < segmentLengths.length; i++) {
      if (target <= segmentLengths[i]) {
        const t = target / segmentLengths[i];
        const a = ROUTE[i], b = ROUTE[i + 1];
        const x = THREE.MathUtils.lerp(a.x, b.x, t);
        const z = THREE.MathUtils.lerp(a.z, b.z, t);
        const heading = Math.atan2(b.x - a.x, b.z - a.z);
        return { x, z, heading };
      }
      target -= segmentLengths[i];
    }
    const a = ROUTE[ROUTE.length - 2], b = ROUTE[ROUTE.length - 1];
    return { x: b.x, z: b.z, heading: Math.atan2(b.x - a.x, b.z - a.z) };
  }

  function pingPongProgress(raw) {
    const u = raw % 1;
    // Long pauses at the pasture and wool yard make the route feel like work,
    // rather than an endless conveyor belt of animals.
    if (u < 0.10) return { p: 0, moving: false, direction: 1 };
    if (u < 0.46) return { p: (u - 0.10) / 0.36, moving: true, direction: 1 };
    if (u < 0.60) return { p: 1, moving: false, direction: -1 };
    if (u < 0.96) return { p: 1 - (u - 0.60) / 0.36, moving: true, direction: -1 };
    return { p: 0, moving: false, direction: 1 };
  }

  function placeGround(group, x, z, heading) {
    group.position.set(x, terrainHeight(x, z), z);
    group.rotation.y = heading;
  }

  let lastFeed = 0;
  let lineIndex = 0;
  const lines = [
    'Mara clicks her tongue once. Nell circles wide and the flock folds back toward the road.',
    '“Tovin complains about burrs in the fleece. Sheep do not care about Tovin.”',
    'Mara checks a ewe’s hoof, rubs mud from the split, and sends her on.',
    '“Vessa wants the pale fleeces kept dry. Tell the sky.”',
    '“We bring them through early now. Too many carts after the mill bell.”'
  ];

  function frame(now) {
    requestAnimationFrame(frame);

    const centerX = -958;
    const centerZ = 900;
    const dx = centerX - camera.position.x;
    const dz = centerZ - camera.position.z;
    const active = dx * dx + dz * dz < ACTIVE_DISTANCE * ACTIVE_DISTANCE;
    root.visible = active;
    if (!active) return;

    const raw = (Date.now() % CYCLE_MS) / CYCLE_MS;
    const state = pingPongProgress(raw);
    const lead = sampleForward(state.p);
    const heading = state.direction > 0 ? lead.heading : lead.heading + Math.PI;
    const lateralX = Math.cos(heading);
    const lateralZ = -Math.sin(heading);

    const maraBack = state.moving ? 5.2 : 3.2;
    const mx = lead.x - Math.sin(heading) * maraBack + lateralX * 2.1;
    const mz = lead.z - Math.cos(heading) * maraBack + lateralZ * 2.1;
    placeGround(mara, mx, mz, heading);
    mara.updateWorldMatrix(true, true);
    maraCollider.setFromObject(mara).expandByScalar(0.06);

    sheep.forEach((agent, i) => {
      const spreadP = THREE.MathUtils.clamp(state.p - state.direction * agent.along, 0, 1);
      const s = sampleForward(spreadP);
      const sheepHeading = state.direction > 0 ? s.heading : s.heading + Math.PI;
      const sxSide = Math.cos(sheepHeading);
      const szSide = -Math.sin(sheepHeading);
      const bunch = state.moving ? 1 : 0.55;
      const wander = Math.sin(now * 0.00055 + agent.phase) * 0.65;
      const x = s.x + sxSide * (agent.side * bunch + wander);
      const z = s.z + szSide * (agent.side * bunch + wander);
      placeGround(agent.mesh, x, z, sheepHeading + Math.sin(now * 0.00033 + agent.phase) * 0.12);

      const step = state.moving ? Math.sin(now * 0.007 + agent.phase) : 0;
      agent.mesh.userData.legs[0].rotation.x = step * 0.30;
      agent.mesh.userData.legs[1].rotation.x = -step * 0.30;
      agent.mesh.userData.legs[2].rotation.x = -step * 0.24;
      agent.mesh.userData.legs[3].rotation.x = step * 0.24;
      const graze = !state.moving && Math.sin(now * 0.0012 + agent.phase) > -0.15;
      agent.mesh.userData.headPivot.rotation.x = graze ? 0.95 : 0.10 + Math.sin(now * 0.001 + agent.phase) * 0.08;
      agent.mesh.userData.headPivot.position.y = graze ? 0.49 : 0.62;
    });

    const dogAngle = now * 0.00075 + (state.direction > 0 ? 0 : Math.PI);
    const dogRadius = state.moving ? 7.2 : 5.0;
    const dogX = lead.x + Math.cos(dogAngle) * dogRadius;
    const dogZ = lead.z + Math.sin(dogAngle) * dogRadius;
    const dogHeading = Math.atan2(lead.x - dogX, lead.z - dogZ);
    placeGround(dog, dogX, dogZ, dogHeading);
    dog.userData.tail.rotation.z = Math.sin(now * 0.009) * 0.35;

    const distanceToMara = Math.hypot(camera.position.x - mx, camera.position.z - mz);
    if (distanceToMara < 9 && now - lastFeed > 24000) {
      if (typeof addFeed === 'function') addFeed(lines[lineIndex++ % lines.length], false, 11000);
      lastFeed = now;
    }
  }

  // World-space verification:
  // - all actors use absolute route coordinates inside the shared Three.js scene;
  // - terrainHeight is sampled every frame for every ground actor;
  // - normal scene depth/fog/lighting occludes the flock behind terrain and structures;
  // - Mara updates a shared Box3 collider every frame; smaller animals are deliberately non-blocking.
  requestAnimationFrame(frame);
}

if (window.EMPTYNET_WORLD_API) install(window.EMPTYNET_WORLD_API);
window.addEventListener('emptynet:world-ready', event => install(event.detail), { once: true });
