import * as THREE from 'three';

// Greyfold's wool collection yard closes the ordinary economic loop between
// Mara's flock, Vessa's dyehouse and the road trade. Locals understand it as
// nothing more mysterious than seasonal work, arguments over grades and rain.
const SITE = { x: -958, z: 892 };
const ACTIVE_DISTANCE = 500;
let installed = false;

function install(api) {
  if (installed || !api?.scene || !api?.camera || !api?.terrainHeight || !Array.isArray(api?.colliders)) return;
  installed = true;

  const { scene, camera, terrainHeight, colliders, addFeed } = api;
  const root = new THREE.Group();
  root.name = 'EMPTYNET_Greyfold_Wool_Yard';
  root.position.set(SITE.x, terrainHeight(SITE.x, SITE.z), SITE.z);
  root.rotation.y = -0.31;
  scene.add(root);

  const mats = {
    stone: new THREE.MeshStandardMaterial({ color: 0x585b53, roughness: 1 }),
    timber: new THREE.MeshStandardMaterial({ color: 0x4d3929, roughness: 1 }),
    darkWood: new THREE.MeshStandardMaterial({ color: 0x30251d, roughness: 1 }),
    wool: new THREE.MeshStandardMaterial({ color: 0xb9ae91, roughness: 1 }),
    dirtyWool: new THREE.MeshStandardMaterial({ color: 0x8c8168, roughness: 1 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x292c29, roughness: 0.78, metalness: 0.2 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x6e6656, roughness: 1, side: THREE.DoubleSide }),
    skin: new THREE.MeshStandardMaterial({ color: 0xac866b, roughness: 1 }),
    coat: new THREE.MeshStandardMaterial({ color: 0x4f594e, roughness: 1 })
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
  function addCollider(obj, pad = 0.04) {
    obj.updateWorldMatrix(true, false);
    colliders.push(new THREE.Box3().setFromObject(obj).expandByScalar(pad));
  }

  // A low open shed, each support planted against the real terrain rather than
  // hovering from one flat reference plane.
  const shed = new THREE.Group();
  shed.name = 'Wool_Sorting_Shed';
  root.add(shed);

  for (const [x, z] of [[-2.7, -1.7], [2.7, -1.7], [-2.7, 1.7], [2.7, 1.7]]) {
    const post = box(0.22, 2.65, 0.22, mats.timber);
    post.position.set(x, localY(x, z) + 1.25, z);
    shed.add(post);
    addCollider(post, 0.03);
  }

  const beamA = box(5.7, 0.22, 0.25, mats.darkWood);
  beamA.position.set(0, 2.47, -1.7);
  shed.add(beamA);
  const beamB = beamA.clone();
  beamB.position.z = 1.7;
  shed.add(beamB);

  const roof = mark(new THREE.Mesh(new THREE.BoxGeometry(6.1, 0.16, 4.3), mats.cloth));
  roof.position.set(0, 2.75, 0);
  roof.rotation.z = 0.055;
  shed.add(roof);

  const table = box(2.8, 0.16, 1.25, mats.timber);
  table.position.set(-0.45, localY(-0.45, 0.05) + 0.86, 0.05);
  root.add(table);
  for (const x of [-1.55, 0.65]) {
    const leg = box(0.16, 0.82, 0.16, mats.darkWood);
    leg.position.set(x, localY(x, 0.05) + 0.41, 0.05);
    root.add(leg);
  }
  addCollider(table, 0.04);

  // Wool waiting to be graded. The arrangement is fixed and deliberately small
  // to keep the yard readable rather than becoming a prop field.
  const baleSpecs = [
    [3.4, -0.8, 0.0, mats.wool], [3.7, 0.25, 0.08, mats.dirtyWool],
    [3.05, 0.8, -0.07, mats.wool], [4.05, 1.0, 0.03, mats.wool],
    [-3.65, 1.25, 0.06, mats.dirtyWool]
  ];
  baleSpecs.forEach(([x, z, r, mat], i) => {
    const bale = box(0.95, 0.72, 0.72, mat);
    bale.position.set(x, localY(x, z) + 0.36, z);
    bale.rotation.y = r + i * 0.05;
    root.add(bale);
    addCollider(bale, 0.025);
  });

  // Hanging beam scale used to grade bundles before they go to Vessa.
  const scalePost = box(0.18, 2.35, 0.18, mats.timber);
  scalePost.position.set(1.9, localY(1.9, -2.7) + 1.13, -2.7);
  root.add(scalePost);
  const scaleArm = box(2.3, 0.13, 0.13, mats.darkWood);
  scaleArm.position.set(1.1, localY(1.9, -2.7) + 2.12, -2.7);
  root.add(scaleArm);
  const hook = cyl(0.035, 0.035, 0.85, 8, mats.iron);
  hook.position.set(0.1, localY(1.9, -2.7) + 1.62, -2.7);
  root.add(hook);
  const pan = cyl(0.48, 0.38, 0.07, 12, mats.iron);
  pan.position.set(0.1, localY(1.9, -2.7) + 1.17, -2.7);
  root.add(pan);
  addCollider(scalePost, 0.03);

  // Sparse fence keeps carts out of the sorting area without enclosing the road.
  for (const [x, z, rot] of [[-4.4,-1.8,0],[-4.4,0.2,0],[-4.4,2.2,0],[4.55,2.2,Math.PI/2]]) {
    const post = box(0.16, 1.25, 0.16, mats.timber);
    post.position.set(x, localY(x, z) + 0.58, z);
    post.rotation.y = rot;
    root.add(post);
    addCollider(post, 0.02);
  }
  const rail = box(0.13, 0.13, 4.1, mats.timber);
  rail.position.set(-4.4, localY(-4.4, 0.2) + 0.76, 0.2);
  root.add(rail);

  // Tovin, Greyfold's wool grader. He has work to do whether or not anyone is
  // watching and never treats the visitor as the center of the yard.
  const tovin = new THREE.Group();
  tovin.name = 'Tovin_Wool_Grader';
  root.add(tovin);
  const body = cyl(0.32, 0.38, 1.05, 9, mats.coat);
  body.position.y = 0.92;
  tovin.add(body);
  const head = mark(new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), mats.skin));
  head.position.y = 1.61;
  tovin.add(head);
  const cap = cyl(0.28, 0.30, 0.13, 10, mats.darkWood);
  cap.position.y = 1.82;
  tovin.add(cap);

  const workPoints = [
    { x: -0.9, z: 0.35, face: 0.2 },
    { x: 0.4, z: -2.25, face: -1.0 },
    { x: 3.0, z: 0.1, face: 1.4 },
    { x: -2.6, z: 1.25, face: -2.1 }
  ];
  let lastFeedAt = 0;
  let feedStage = 0;

  const lines = [
    'Tovin weighs a fleece twice, then chalks a smaller number onto the slate.',
    '“Mara keeps the cleanest flock on this road. Do not tell her I said that.”',
    '“Vessa wants pale wool this week. Dark dye hides bad sorting, not bad wool.”',
    '“Hale trades flour for winter blankets. Greyfold has always counted debts in whatever keeps.”'
  ];

  function updateTovin(now) {
    const cycle = 76000;
    const phase = ((Date.now() % cycle) / cycle) * workPoints.length;
    const index = Math.floor(phase) % workPoints.length;
    const next = (index + 1) % workPoints.length;
    const t = THREE.MathUtils.smoothstep(phase - Math.floor(phase), 0.15, 0.85);
    const a = workPoints[index];
    const b = workPoints[next];
    const x = THREE.MathUtils.lerp(a.x, b.x, t);
    const z = THREE.MathUtils.lerp(a.z, b.z, t);
    tovin.position.set(x, localY(x, z), z);
    tovin.rotation.y = THREE.MathUtils.lerp(a.face, b.face, t);

    const wx = SITE.x + x * Math.cos(root.rotation.y) + z * Math.sin(root.rotation.y);
    const wz = SITE.z - x * Math.sin(root.rotation.y) + z * Math.cos(root.rotation.y);
    const d = Math.hypot(camera.position.x - wx, camera.position.z - wz);
    if (d < 8 && now - lastFeedAt > 18000) {
      if (typeof addFeed === 'function') addFeed(lines[feedStage++ % lines.length], false, 10500);
      lastFeedAt = now;
    }
  }

  root.updateWorldMatrix(true, true);

  // Verification notes for future maintainers:
  // - root uses absolute SITE coordinates in the shared world scene;
  // - every ground object samples the shared terrainHeight function;
  // - all meshes share the scene's normal depth/occlusion path;
  // - solid posts, table, bales and scale post register shared colliders.
  function frame(now) {
    requestAnimationFrame(frame);
    const dx = SITE.x - camera.position.x;
    const dz = SITE.z - camera.position.z;
    const visible = dx * dx + dz * dz < ACTIVE_DISTANCE * ACTIVE_DISTANCE;
    root.visible = visible;
    if (!visible) return;
    updateTovin(now);
    pan.rotation.y = Math.sin(Date.now() * 0.00035) * 0.035;
  }
  requestAnimationFrame(frame);
}

if (window.EMPTYNET_WORLD_API) install(window.EMPTYNET_WORLD_API);
window.addEventListener('emptynet:world-ready', event => install(event.detail), { once: true });
