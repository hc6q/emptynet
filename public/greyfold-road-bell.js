import * as THREE from 'three';

// Greyfold's roadside bell is an ordinary piece of local infrastructure: a fog signal,
// meeting point and warning bell beside the established crossroads. The deeper echo is
// only meaningful to someone who has already followed the Three Cairns / Node 7 thread.
const SITE = { x: -807, z: 1008 };
const ACTIVE_DISTANCE = 500;
const BELL_CYCLE_MS = 120000;
const BELL_WINDOW_MS = 6200;
let installed = false;

function install(api) {
  if (installed || !api?.scene || !api?.camera || !api?.terrainHeight || !Array.isArray(api?.colliders)) return;
  installed = true;

  const { scene, camera, terrainHeight, colliders, addFeed } = api;
  const root = new THREE.Group();
  root.name = 'EMPTYNET_Greyfold_Road_Bell';
  root.position.set(SITE.x, terrainHeight(SITE.x, SITE.z), SITE.z);
  root.rotation.y = -0.32;
  scene.add(root);

  const mats = {
    stone: new THREE.MeshStandardMaterial({ color: 0x5a5d56, roughness: 1 }),
    stoneDark: new THREE.MeshStandardMaterial({ color: 0x3d413c, roughness: 1 }),
    timber: new THREE.MeshStandardMaterial({ color: 0x493629, roughness: 1 }),
    timberDark: new THREE.MeshStandardMaterial({ color: 0x30251d, roughness: 1 }),
    bronze: new THREE.MeshStandardMaterial({ color: 0x63533a, roughness: 0.62, metalness: 0.34 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x292c29, roughness: 0.82, metalness: 0.18 }),
    rope: new THREE.MeshStandardMaterial({ color: 0x7b6c4f, roughness: 1 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x59604f, roughness: 1 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xb28f74, roughness: 1 })
  };

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

  function addCollider(object, pad = 0.05) {
    object.updateWorldMatrix(true, false);
    colliders.push(new THREE.Box3().setFromObject(object).expandByScalar(pad));
  }

  // Low roadside platform, deliberately compact so it reads as infrastructure rather
  // than another settlement. Every solid piece is part of the shared world scene.
  const plinth = box(5.4, 0.55, 3.8, mats.stoneDark);
  plinth.position.set(0, localY(0, 0) + 0.12, 0);
  root.add(plinth);

  const step = box(2.4, 0.26, 1.15, mats.stone);
  step.position.set(0, localY(0, 2.25) + 0.08, 2.25);
  root.add(step);

  const postLeft = box(0.38, 5.2, 0.42, mats.timberDark);
  postLeft.position.set(-1.65, plinth.position.y + 2.65, -0.15);
  root.add(postLeft);
  const postRight = postLeft.clone();
  postRight.position.x = 1.65;
  root.add(postRight);

  const beam = box(4.25, 0.42, 0.46, mats.timberDark);
  beam.position.set(0, plinth.position.y + 5.0, -0.15);
  root.add(beam);

  // Diagonal braces make the frame look repaired over generations rather than pristine.
  for (const side of [-1, 1]) {
    const brace = box(0.22, 2.3, 0.22, mats.timber);
    brace.position.set(side * 1.05, plinth.position.y + 3.95, -0.12);
    brace.rotation.z = side * 0.68;
    root.add(brace);
  }

  const bellPivot = new THREE.Group();
  bellPivot.name = 'Greyfold_Road_Bell_Pivot';
  bellPivot.position.set(0, plinth.position.y + 4.48, -0.15);
  root.add(bellPivot);

  const bell = mark(new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.86, 1.05, 14, 1, true), mats.bronze));
  bell.position.y = -0.48;
  bellPivot.add(bell);

  const bellLip = mark(new THREE.Mesh(new THREE.TorusGeometry(0.84, 0.09, 7, 18), mats.bronze));
  bellLip.rotation.x = Math.PI / 2;
  bellLip.position.y = -1.01;
  bellPivot.add(bellLip);

  const clapper = cyl(0.11, 0.15, 0.72, 8, mats.iron);
  clapper.position.y = -0.9;
  bellPivot.add(clapper);
  const clapperBall = mark(new THREE.Mesh(new THREE.SphereGeometry(0.19, 9, 7), mats.iron));
  clapperBall.position.y = -1.33;
  bellPivot.add(clapperBall);

  const rope = cyl(0.035, 0.045, 3.4, 6, mats.rope);
  rope.position.set(0.72, plinth.position.y + 2.45, -0.12);
  root.add(rope);
  const ropeHandle = mark(new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 6, 12), mats.rope));
  ropeHandle.position.set(0.72, plinth.position.y + 0.82, -0.12);
  root.add(ropeHandle);

  // The beam has seven old tally cuts. Six are packed with black pitch. Locals call
  // them carpenter marks and do not connect them to any hidden nature of the world.
  const tallyGroup = new THREE.Group();
  tallyGroup.position.set(-0.65, plinth.position.y + 4.98, 0.095);
  root.add(tallyGroup);
  for (let i = 0; i < 7; i++) {
    const cut = box(0.045, 0.26, 0.018, i < 6 ? mats.iron : mats.stone);
    cut.position.x = i * 0.20;
    cut.rotation.z = (i - 3) * 0.025;
    tallyGroup.add(cut);
  }

  // A modest rain hood and bench make this somewhere travelers actually wait.
  const hoodA = box(3.05, 0.16, 2.15, mats.timber);
  hoodA.position.set(-3.25, localY(-3.25, -0.35) + 2.15, -0.35);
  hoodA.rotation.z = -0.08;
  root.add(hoodA);
  for (const x of [-4.45, -2.05]) {
    const hoodPost = box(0.18, 2.25, 0.18, mats.timberDark);
    hoodPost.position.set(x, localY(x, -0.35) + 1.0, -0.35);
    root.add(hoodPost);
  }
  const bench = box(2.45, 0.22, 0.62, mats.timber);
  bench.position.set(-3.25, localY(-3.25, -0.15) + 0.62, -0.15);
  root.add(bench);
  for (const x of [-4.05, -2.45]) {
    const leg = box(0.18, 0.62, 0.18, mats.timberDark);
    leg.position.set(x, localY(x, -0.15) + 0.32, -0.15);
    root.add(leg);
  }

  const bucket = cyl(0.26, 0.22, 0.46, 10, mats.iron);
  bucket.position.set(-4.25, localY(-4.25, 0.65) + 0.24, 0.65);
  root.add(bucket);

  // Sera tends the bell, sweeps the platform and checks the road. She has mundane
  // explanations for every local superstition and never treats the player as central.
  const sera = new THREE.Group();
  sera.name = 'Sera_Greyfold_Bellkeeper';
  root.add(sera);
  const body = cyl(0.36, 0.46, 1.16, 8, mats.cloth);
  body.position.y = 0.72;
  sera.add(body);
  const head = mark(new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 7), mats.skin));
  head.position.y = 1.49;
  sera.add(head);
  const hood = mark(new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.42, 8), mats.cloth));
  hood.position.y = 1.77;
  sera.add(hood);
  const broom = cyl(0.035, 0.045, 1.65, 6, mats.timber);
  broom.position.set(0.45, 0.8, 0.05);
  broom.rotation.z = -0.12;
  sera.add(broom);

  const route = [[-2.0, 1.7], [0.6, 1.7], [-3.5, 0.1], [-0.5, -1.3]];
  let routeIndex = 1;
  let wait = 2.8;
  sera.position.set(route[0][0], localY(route[0][0], route[0][1]), route[0][1]);

  root.updateWorldMatrix(true, true);
  addCollider(plinth, 0.08);
  addCollider(step, 0.04);
  addCollider(postLeft, 0.05);
  addCollider(postRight, 0.05);
  addCollider(bench, 0.04);

  let last = performance.now();
  let nearLast = false;
  let nextRemark = last + 9000;
  let remarkIndex = 0;
  let lastBellCycle = -1;
  const remarks = [
    'Sera: Three pulls for fog. Six if the east road disappears completely.',
    'Sera: Hale says the bell spooks his flour mule. Orin says a frightened mule is better than a lost one.',
    'Sera: My grandmother called those beam marks the buried watches. Carpenter talk, probably.',
    'Sera: Edda hears the bell from the washhouse when the wind turns north. Mara says the sheep hear it farther.'
  ];

  function updateSera(dt) {
    if (wait > 0) { wait -= dt; return; }
    const [tx, tz] = route[routeIndex];
    const dx = tx - sera.position.x;
    const dz = tz - sera.position.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.16) {
      routeIndex = (routeIndex + 1) % route.length;
      wait = 2.5 + ((routeIndex * 1.7) % 3.2);
      return;
    }
    const stepLen = Math.min(d, 0.34 * dt);
    sera.position.x += dx / d * stepLen;
    sera.position.z += dz / d * stepLen;
    sera.position.y = localY(sera.position.x, sera.position.z);
    sera.rotation.y = Math.atan2(dx, dz);
  }

  function updateBell(now) {
    const wallNow = Date.now();
    const cycle = Math.floor(wallNow / BELL_CYCLE_MS);
    const phase = wallNow % BELL_CYCLE_MS;
    const active = phase < BELL_WINDOW_MS;
    if (active) {
      const t = phase / 1000;
      bellPivot.rotation.z = Math.sin(t * Math.PI * 2.2) * 0.19 * Math.exp(-t * 0.18);
      clapper.rotation.z = -bellPivot.rotation.z * 1.8;
    } else {
      bellPivot.rotation.z *= 0.88;
      clapper.rotation.z *= 0.82;
    }

    if (active && cycle !== lastBellCycle) {
      lastBellCycle = cycle;
      const d = Math.hypot(camera.position.x - SITE.x, camera.position.z - SITE.z);
      if (d < 85 && typeof addFeed === 'function') {
        addFeed('The Greyfold road bell gives three slow strokes across the fields.', true, 9500);
      }
      const knowsBelow = localStorage.getItem('emptynet_node7_cairns_answered') === '1';
      const heardEcho = localStorage.getItem('emptynet_bell_under_echo') === '1';
      if (d < 30 && knowsBelow && !heardEcho && typeof addFeed === 'function') {
        localStorage.setItem('emptynet_bell_under_echo', '1');
        setTimeout(() => addFeed('After the third stroke, six faint knocks answer from somewhere under the road.', true, 17000), 2600);
      }
    }
  }

  function updateLocalLife(now) {
    const d = Math.hypot(camera.position.x - SITE.x, camera.position.z - SITE.z);
    const near = d < 19;
    if (near && !nearLast && typeof addFeed === 'function') {
      addFeed('A bronze road bell hangs beside the Greyfold crossing. Someone has swept the stone platform clean.', true, 11000);
      nextRemark = now + 7000;
    }
    if (near && now > nextRemark && typeof addFeed === 'function') {
      addFeed(remarks[remarkIndex % remarks.length], true, 12000);
      remarkIndex++;
      nextRemark = now + 38000;
    }
    nearLast = near;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const dx = camera.position.x - SITE.x;
    const dz = camera.position.z - SITE.z;
    root.visible = dx * dx + dz * dz < ACTIVE_DISTANCE * ACTIVE_DISTANCE;
    if (!root.visible) return;

    updateSera(dt);
    updateBell(now);
    updateLocalLife(now);
  }

  requestAnimationFrame(frame);
}

if (window.EMPTYNET_WORLD_API) install(window.EMPTYNET_WORLD_API);
window.addEventListener('emptynet:world-ready', event => install(event.detail), { once: true });
