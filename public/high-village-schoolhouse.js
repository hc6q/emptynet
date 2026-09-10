import * as THREE from 'three';

// A modest village school near the northern lane. The building and yard are ordinary civic
// life: lessons, firewood, copy slates and weather talk. Nothing here assumes the hidden nature
// of EMPTYNET. All world-space elements live in the primary scene and use absolute coordinates.
const ACTIVE_DISTANCE = 560;
const CENTER = { x: 1118, z: 1287 };
const ROUTE_SECONDS = 360;
let installed = false;

function install(api) {
  if (installed || !api?.scene || !api?.camera || !api?.terrainHeight || !Array.isArray(api?.colliders)) return;
  installed = true;

  const { scene, camera, terrainHeight, colliders, addFeed } = api;
  const root = new THREE.Group();
  root.name = 'EMPTYNET_High_Village_Schoolhouse';
  scene.add(root);

  const mat = {
    stone: new THREE.MeshStandardMaterial({ color: 0x777368, roughness: 0.98 }),
    stoneDark: new THREE.MeshStandardMaterial({ color: 0x55534c, roughness: 1 }),
    plaster: new THREE.MeshStandardMaterial({ color: 0xb0a996, roughness: 0.95 }),
    timber: new THREE.MeshStandardMaterial({ color: 0x4b3928, roughness: 1 }),
    timberDark: new THREE.MeshStandardMaterial({ color: 0x342a21, roughness: 1 }),
    roof: new THREE.MeshStandardMaterial({ color: 0x4e4d47, roughness: 1 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x272a28, roughness: 0.72, metalness: 0.25 }),
    slate: new THREE.MeshStandardMaterial({ color: 0x303735, roughness: 0.9 }),
    chalk: new THREE.MeshStandardMaterial({ color: 0xc9c7b8, roughness: 1 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x5f655c, roughness: 1 }),
    leather: new THREE.MeshStandardMaterial({ color: 0x49392c, roughness: 1 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xb08e70, roughness: 1 }),
    brass: new THREE.MeshStandardMaterial({ color: 0x8b7045, roughness: 0.65, metalness: 0.32 }),
    ember: new THREE.MeshStandardMaterial({ color: 0x9f613d, emissive: 0x6b321b, emissiveIntensity: 1.0, roughness: 0.8 })
  };

  const mark = mesh => { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; };
  const box = (w, h, d, material) => mark(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material));
  const cyl = (rt, rb, h, sides, material) => mark(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, sides), material));

  function place(obj, x, z, yOffset = 0) {
    obj.position.set(x, terrainHeight(x, z) + yOffset, z);
    root.add(obj);
    return obj;
  }

  function addStaticCollider(obj, padding = 0) {
    obj.updateWorldMatrix(true, true);
    const collider = new THREE.Box3().setFromObject(obj);
    if (padding) collider.expandByScalar(padding);
    colliders.push(collider);
    return collider;
  }

  // Stone foundation is intentionally shallow so the schoolhouse reads as seated into the slope.
  const foundation = place(box(10.4, 0.7, 7.6, mat.stoneDark), CENTER.x, CENTER.z, 0.15);
  addStaticCollider(foundation);

  const house = new THREE.Group();
  house.name = 'High_Village_Schoolhouse_Building';
  const baseY = terrainHeight(CENTER.x, CENTER.z) + 0.5;
  house.position.set(CENTER.x, baseY, CENTER.z);
  root.add(house);

  const rear = box(10, 3.7, 0.38, mat.plaster); rear.position.set(0, 2.05, -3.25); house.add(rear);
  const left = box(0.38, 3.7, 6.5, mat.plaster); left.position.set(-4.8, 2.05, 0); house.add(left);
  const right = box(0.38, 3.7, 6.5, mat.plaster); right.position.set(4.8, 2.05, 0); house.add(right);
  const frontL = box(3.8, 3.7, 0.38, mat.plaster); frontL.position.set(-3.0, 2.05, 3.25); house.add(frontL);
  const frontR = box(3.8, 3.7, 0.38, mat.plaster); frontR.position.set(3.0, 2.05, 3.25); house.add(frontR);
  const lintel = box(2.25, 0.55, 0.42, mat.timber); lintel.position.set(0, 3.32, 3.2); house.add(lintel);

  // Timber frame makes the civic building visually distinct from the surrounding work yards.
  for (const x of [-4.55, 4.55]) {
    const beam = box(0.28, 3.45, 0.32, mat.timberDark); beam.position.set(x, 2.08, 3.05); house.add(beam);
  }
  for (const z of [-3.05, 3.05]) {
    const beam = box(9.25, 0.26, 0.32, mat.timberDark); beam.position.set(0, 3.58, z); house.add(beam);
  }

  const roof = mark(new THREE.Mesh(new THREE.ConeGeometry(7.1, 2.55, 4), mat.roof));
  roof.rotation.y = Math.PI / 4;
  roof.scale.z = 0.72;
  roof.position.set(0, 4.72, 0);
  house.add(roof);

  const chimney = box(0.85, 2.1, 0.85, mat.stoneDark); chimney.position.set(3.1, 4.75, -1.55); house.add(chimney);
  const door = box(1.55, 2.85, 0.18, mat.timber); door.position.set(0, 1.55, 3.36); house.add(door);
  const latch = box(0.42, 0.08, 0.08, mat.iron); latch.position.set(0.36, 1.55, 3.48); house.add(latch);

  // Two simple leaded windows. The glass remains opaque enough to avoid expensive transparency sorting.
  for (const x of [-2.7, 2.7]) {
    const frame = box(1.72, 1.5, 0.18, mat.timberDark); frame.position.set(x, 2.25, 3.38); house.add(frame);
    const pane = box(1.32, 1.1, 0.2, mat.slate); pane.position.set(x, 2.25, 3.47); house.add(pane);
    const barV = box(0.08, 1.1, 0.23, mat.iron); barV.position.set(x, 2.25, 3.59); house.add(barV);
    const barH = box(1.32, 0.08, 0.23, mat.iron); barH.position.set(x, 2.25, 3.59); house.add(barH);
  }

  addStaticCollider(rear);
  addStaticCollider(left);
  addStaticCollider(right);
  addStaticCollider(frontL);
  addStaticCollider(frontR);
  addStaticCollider(door);

  // School bell on its own roadside frame.
  const bellFrame = new THREE.Group();
  place(bellFrame, 1125.3, 1290.6);
  const postA = box(0.34, 3.45, 0.34, mat.timberDark); postA.position.set(-1.0, 1.72, 0); bellFrame.add(postA);
  const postB = box(0.34, 3.45, 0.34, mat.timberDark); postB.position.set(1.0, 1.72, 0); bellFrame.add(postB);
  const cross = box(2.65, 0.3, 0.34, mat.timberDark); cross.position.set(0, 3.18, 0); bellFrame.add(cross);
  const bell = mark(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.7, 0.72, 12, 1, true), mat.brass));
  bell.position.set(0, 2.58, 0); bellFrame.add(bell);
  const clapper = cyl(0.09, 0.12, 0.62, 8, mat.iron); clapper.position.set(0, 2.23, 0); bellFrame.add(clapper);
  addStaticCollider(postA); addStaticCollider(postB);

  // Yard: slate board, benches, firewood, water bucket and copy slates.
  const boardPostA = place(box(0.18, 2.6, 0.18, mat.timberDark), 1112.2, 1292.3, 1.3);
  const boardPostB = place(box(0.18, 2.6, 0.18, mat.timberDark), 1115.1, 1292.3, 1.3);
  const boardY = (terrainHeight(1113.65, 1292.3) + 2.0);
  const board = box(3.25, 1.65, 0.16, mat.slate); board.position.set(1113.65, boardY, 1292.3); root.add(board);
  addStaticCollider(boardPostA); addStaticCollider(boardPostB);

  // Chalk marks are abstract strokes, not screen-space text, keeping them physically embedded in the scene.
  for (let i = 0; i < 7; i++) {
    const stroke = box(0.48 + (i % 3) * 0.12, 0.035, 0.025, mat.chalk);
    stroke.position.set(1112.75 + (i % 3) * 0.82, boardY + 0.38 - Math.floor(i / 3) * 0.38, 1292.205);
    stroke.rotation.z = ((i * 17) % 9 - 4) * 0.025;
    root.add(stroke);
  }

  const benchPositions = [
    [1111.2, 1288.8, 0.05], [1113.8, 1289.0, -0.03], [1116.4, 1288.8, 0.04]
  ];
  for (const [x, z, r] of benchPositions) {
    const bench = new THREE.Group();
    place(bench, x, z);
    bench.rotation.y = r;
    const seat = box(2.05, 0.2, 0.55, mat.timber); seat.position.y = 0.72; bench.add(seat);
    const legA = box(0.18, 0.75, 0.42, mat.timberDark); legA.position.set(-0.72, 0.36, 0); bench.add(legA);
    const legB = box(0.18, 0.75, 0.42, mat.timberDark); legB.position.set(0.72, 0.36, 0); bench.add(legB);
    addStaticCollider(bench);
  }

  const woodpile = new THREE.Group();
  place(woodpile, 1122.2, 1282.5);
  for (let i = 0; i < 12; i++) {
    const log = cyl(0.14, 0.16, 1.35, 7, mat.timberDark);
    log.rotation.z = Math.PI / 2;
    log.position.set((i % 3) * 0.1, 0.22 + Math.floor(i / 3) * 0.26, ((i % 4) - 1.5) * 0.33);
    woodpile.add(log);
  }
  addStaticCollider(woodpile);

  const bucket = place(cyl(0.34, 0.28, 0.62, 10, mat.iron), 1120.4, 1292.0, 0.31);
  addStaticCollider(bucket);

  const copyCrate = place(box(1.15, 0.68, 0.9, mat.timber), 1109.7, 1291.1, 0.34);
  addStaticCollider(copyCrate);
  for (let i = 0; i < 5; i++) {
    const slate = box(0.62, 0.055, 0.44, mat.slate);
    slate.position.set(1109.45 + (i % 2) * 0.42, terrainHeight(1109.7, 1291.1) + 0.71 + Math.floor(i / 2) * 0.07, 1291.1);
    slate.rotation.y = (i - 2) * 0.04;
    root.add(slate);
  }

  // A tiny chimney ember gives the building a lived-in cue without adding another dynamic light.
  const ember = mark(new THREE.Mesh(new THREE.SphereGeometry(0.13, 7, 5), mat.ember));
  ember.position.set(CENTER.x + 3.1, baseY + 5.9, CENTER.z - 1.55);
  root.add(ember);

  function makeTeacher() {
    const person = new THREE.Group();
    person.name = 'Ansel_High_Village_Schoolmaster';
    root.add(person);
    const torso = cyl(0.32, 0.43, 1.15, 8, mat.cloth); torso.position.y = 0.8; person.add(torso);
    const head = mark(new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 7), mat.skin)); head.position.y = 1.59; person.add(head);
    const cap = cyl(0.2, 0.3, 0.22, 8, mat.leather); cap.position.y = 1.79; person.add(cap);
    const satchel = box(0.42, 0.5, 0.22, mat.leather); satchel.position.set(-0.38, 0.7, -0.08); person.add(satchel);
    const pointer = cyl(0.025, 0.03, 1.28, 6, mat.timber); pointer.position.set(0.42, 0.78, 0.03); pointer.rotation.z = -0.24; person.add(pointer);
    const collider = new THREE.Box3();
    colliders.push(collider);
    return { person, collider, pointer };
  }

  const teacher = makeTeacher();
  const route = [
    { x: 1117.5, z: 1291.4 },
    { x: 1114.0, z: 1291.2 },
    { x: 1110.7, z: 1288.0 },
    { x: 1117.0, z: 1285.8 },
    { x: 1124.5, z: 1290.1 },
    { x: 1120.0, z: 1291.2 },
    { x: 1117.5, z: 1291.4 }
  ];
  const segments = [];
  let routeLength = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const len = Math.hypot(route[i + 1].x - route[i].x, route[i + 1].z - route[i].z);
    segments.push(len); routeLength += len;
  }

  function sampleRoute(nowMs) {
    const raw = ((nowMs / 1000) % ROUTE_SECONDS + ROUTE_SECONDS) % ROUTE_SECONDS;
    let target = (raw / ROUTE_SECONDS) * routeLength;
    for (let i = 0; i < segments.length; i++) {
      const len = segments[i];
      if (target <= len || i === segments.length - 1) {
        const a = route[i], b = route[i + 1];
        const t = Math.min(1, target / len);
        return {
          x: THREE.MathUtils.lerp(a.x, b.x, t),
          z: THREE.MathUtils.lerp(a.z, b.z, t),
          heading: Math.atan2(b.x - a.x, b.z - a.z)
        };
      }
      target -= len;
    }
    return { ...route[0], heading: 0 };
  }

  const remarks = [
    'Ansel wipes yesterday’s sums from the yard slate with the heel of his sleeve.',
    'Ansel: “Meret says the south road is passable again. Copy that carefully: passable, not dry.”',
    'Ansel checks the firewood stack. “Nessa promised two cider crates for the winter lessons, if the frost leaves her any apples.”',
    'Ansel: “Rusk found the bell rope frayed. I told him a school bell has survived worse than village watchkeeping.”',
    'Ansel sets three copy slates in a neat row and leaves the others exactly where they were.',
    'Ansel glances toward the lane. “Hale’s flour cart is late. That will matter more to the children than my history lesson.”',
    'Ansel taps the slate. “Greyfold counts flood years. High Village counts winters. Both insist theirs is the sensible calendar.”'
  ];
  let remarkIndex = 0;
  let nextRemark = 0;
  let wasNear = false;

  function frame(now) {
    requestAnimationFrame(frame);
    const dx = camera.position.x - CENTER.x;
    const dz = camera.position.z - CENTER.z;
    const active = dx * dx + dz * dz < ACTIVE_DISTANCE * ACTIVE_DISTANCE;
    root.visible = active;
    if (!active) { wasNear = false; return; }

    const p = sampleRoute(Date.now());
    const ground = terrainHeight(p.x, p.z);
    teacher.person.position.set(p.x, ground, p.z);
    teacher.person.rotation.y = p.heading;
    const gait = Math.sin(Date.now() * 0.008) * 0.045;
    teacher.person.position.y += Math.abs(gait) * 0.18;
    teacher.pointer.rotation.z = -0.24 + gait * 0.35;
    teacher.person.updateWorldMatrix(true, true);
    teacher.collider.setFromObject(teacher.person).expandByScalar(0.02);

    // Bell movement is subtle and deterministic; the bell remains world geometry in the same scene.
    bell.rotation.z = Math.sin(Date.now() * 0.0014) * 0.025;
    clapper.rotation.z = -bell.rotation.z * 0.6;
    ember.scale.setScalar(0.94 + Math.sin(Date.now() * 0.003) * 0.06);

    const tdx = camera.position.x - p.x;
    const tdz = camera.position.z - p.z;
    const near = tdx * tdx + tdz * tdz < 18 * 18;
    if (near && !wasNear && typeof addFeed === 'function') {
      addFeed('A small schoolhouse stands beside the lane; chalk dust marks the outdoor slate.', true, 9000);
      nextRemark = now + 5000;
    }
    if (near && now > nextRemark && typeof addFeed === 'function') {
      addFeed(remarks[remarkIndex % remarks.length], true, 11000);
      remarkIndex++;
      nextRemark = now + 32000;
    }
    wasNear = near;
  }

  requestAnimationFrame(frame);
}

if (window.EMPTYNET_WORLD_API) install(window.EMPTYNET_WORLD_API);
window.addEventListener('emptynet:world-ready', event => install(event.detail), { once: true });
