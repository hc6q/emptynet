import * as THREE from 'three';

// A small ordinary road crew repairing the Blackpine / Old Watch route.
// Their work makes the road feel inhabited without turning the player into its center.
const SITE = { x: 716, z: -523 };
const ACTIVE_DISTANCE = 390;
let installed = false;

function install(api) {
  if (installed || !api?.scene || !api?.camera || !api?.terrainHeight || !Array.isArray(api?.colliders)) return;
  installed = true;

  const { scene, camera, terrainHeight, colliders, addFeed } = api;
  const root = new THREE.Group();
  root.name = 'EMPTYNET_Blackpine_Roadworks';
  root.position.set(SITE.x, terrainHeight(SITE.x, SITE.z), SITE.z);
  root.rotation.y = -0.52;
  scene.add(root);

  const mats = {
    earth: new THREE.MeshStandardMaterial({ color: 0x574b3b, roughness: 1 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x565951, roughness: 1 }),
    pale: new THREE.MeshStandardMaterial({ color: 0x77786c, roughness: 1 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x4a3828, roughness: 1 }),
    darkWood: new THREE.MeshStandardMaterial({ color: 0x30261e, roughness: 1 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x292b29, roughness: 0.84, metalness: 0.18 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x65594a, roughness: 1, side: THREE.DoubleSide }),
    coat: new THREE.MeshStandardMaterial({ color: 0x4f554b, roughness: 1 }),
    coat2: new THREE.MeshStandardMaterial({ color: 0x595047, roughness: 1 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xaa8669, roughness: 1 })
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
  function collider(obj, pad = 0.03) {
    obj.updateWorldMatrix(true, false);
    colliders.push(new THREE.Box3().setFromObject(obj).expandByScalar(pad));
  }

  // A low dry-stone retaining wall: practical, irregular, and visibly repaired.
  const wall = new THREE.Group();
  wall.name = 'Roadworks_Retaining_Wall';
  root.add(wall);
  for (let i = 0; i < 12; i++) {
    const lx = -4.7 + i * 0.84;
    const lz = -0.85 + Math.sin(i * 0.72) * 0.12;
    const rock = mark(new THREE.Mesh(new THREE.DodecahedronGeometry(0.48, 0), i % 3 === 0 ? mats.pale : mats.stone));
    rock.scale.set(0.95 + (i % 2) * 0.16, 0.48 + (i % 3) * 0.06, 0.72);
    rock.position.set(lx, localY(lx, lz) + 0.22, lz);
    rock.rotation.set(i * 0.05, i * 0.67, i % 2 ? 0.08 : -0.05);
    wall.add(rock);
  }

  // Wheel-rut fill and a gravel heap waiting to be spread.
  for (let i = 0; i < 9; i++) {
    const lx = -3.7 + i * 0.92;
    const lz = 0.55 + Math.sin(i * 1.3) * 0.18;
    const fill = mark(new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), mats.earth));
    fill.scale.set(1.25, 0.16, 0.72);
    fill.position.set(lx, localY(lx, lz) + 0.04, lz);
    fill.rotation.y = i * 0.41;
    root.add(fill);
  }
  for (let i = 0; i < 11; i++) {
    const a = i * 2.399;
    const r = 0.22 + (i % 4) * 0.18;
    const lx = 4.45 + Math.cos(a) * r;
    const lz = 1.95 + Math.sin(a) * r * 0.72;
    const rock = mark(new THREE.Mesh(new THREE.DodecahedronGeometry(0.27 + (i % 3) * 0.05, 0), mats.stone));
    rock.position.set(lx, localY(lx, lz) + 0.12 + Math.floor(i / 4) * 0.12, lz);
    rock.rotation.set(i, a, i * 0.3);
    root.add(rock);
  }

  // Tool rack and simple canvas lean-to on the safe shoulder of the road.
  const rackPostA = box(0.14, 1.65, 0.14, mats.darkWood);
  rackPostA.position.set(3.1, localY(3.1, 3.35) + 0.76, 3.35);
  root.add(rackPostA);
  const rackPostB = rackPostA.clone();
  rackPostB.position.set(5.0, localY(5.0, 3.35) + 0.76, 3.35);
  root.add(rackPostB);
  const rack = box(2.1, 0.12, 0.12, mats.wood);
  rack.position.set(4.05, Math.max(rackPostA.position.y, rackPostB.position.y) + 0.34, 3.35);
  root.add(rack);

  for (let i = 0; i < 3; i++) {
    const handle = cyl(0.035, 0.04, 1.28, 6, mats.wood);
    handle.position.set(3.55 + i * 0.5, localY(3.55 + i * 0.5, 3.15) + 0.62, 3.15);
    handle.rotation.z = (i - 1) * 0.08;
    root.add(handle);
    const head = box(i === 1 ? 0.42 : 0.28, 0.12, 0.12, mats.iron);
    head.position.set(handle.position.x, handle.position.y + 0.6, 3.15);
    head.rotation.z = handle.rotation.z;
    root.add(head);
  }

  const shelter = new THREE.Group();
  shelter.name = 'Roadworks_LeanTo';
  shelter.position.set(-4.0, localY(-4.0, 3.9), 3.9);
  root.add(shelter);
  for (const x of [-1.15, 1.15]) {
    const post = box(0.16, 1.75, 0.16, mats.darkWood);
    post.position.set(x, 0.82, 0);
    shelter.add(post);
  }
  const ridge = box(2.55, 0.13, 0.13, mats.wood);
  ridge.position.set(0, 1.67, 0);
  shelter.add(ridge);
  const canvas = mark(new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.15), mats.cloth));
  canvas.position.set(0, 1.15, 0.72);
  canvas.rotation.x = -0.82;
  shelter.add(canvas);

  const waterCask = cyl(0.42, 0.46, 0.92, 10, mats.wood);
  waterCask.position.set(-2.25, localY(-2.25, 3.65) + 0.43, 3.65);
  root.add(waterCask);

  function makeWorker(name, coat, route) {
    const g = new THREE.Group();
    g.name = name;
    root.add(g);
    const body = cyl(0.34, 0.44, 1.15, 8, coat);
    body.position.y = 0.72;
    g.add(body);
    const head = mark(new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 7), mats.skin));
    head.position.y = 1.48;
    g.add(head);
    const cap = cyl(0.18, 0.29, 0.18, 8, mats.darkWood);
    cap.position.y = 1.7;
    g.add(cap);
    const tool = cyl(0.025, 0.035, 1.15, 6, mats.wood);
    tool.position.set(0.4, 0.67, 0.02);
    tool.rotation.z = -0.28;
    g.add(tool);
    return { g, route, index: 1, wait: 1.5, speed: 0.42 };
  }

  const workers = [
    makeWorker('Tomas_Roadwarden', mats.coat, [[-2.8, 1.35], [2.8, 1.05], [4.0, 2.8], [-1.8, 1.5]]),
    makeWorker('Iven_Roadhand', mats.coat2, [[2.2, 0.7], [4.5, 1.8], [1.1, 0.85], [-0.8, 1.1]])
  ];
  workers.forEach((w, wi) => {
    const [lx, lz] = w.route[0];
    w.g.position.set(lx, localY(lx, lz), lz);
    w.g.rotation.y = wi ? 0.5 : -0.4;
  });

  root.updateWorldMatrix(true, true);
  collider(wall, 0.04);
  collider(rackPostA);
  collider(rackPostB);
  collider(rack);
  collider(shelter, 0.02);
  collider(waterCask);

  let last = performance.now();
  let wasNear = false;
  let nextRemark = last + 18000;
  let remarkIndex = 0;
  const remarks = [
    'Tomas: Orin was right. The lower rut washed out again.',
    'Iven: Greyfold wants the west road open before the flour cart comes.',
    'Tomas: Stack the flat stones first. Loose gravel will only walk downhill.',
    'Iven: Old Watch road always takes twice the stone you think it will.'
  ];

  function updateWorker(w, dt) {
    if (w.wait > 0) { w.wait -= dt; return; }
    const [tx, tz] = w.route[w.index];
    const dx = tx - w.g.position.x, dz = tz - w.g.position.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.18) {
      w.index = (w.index + 1) % w.route.length;
      w.wait = 3.2 + ((w.index * 1.7 + (w.g.name.length % 4)) % 3.8);
      return;
    }
    const step = Math.min(d, w.speed * dt);
    w.g.position.x += dx / d * step;
    w.g.position.z += dz / d * step;
    w.g.position.y = localY(w.g.position.x, w.g.position.z);
    w.g.rotation.y = Math.atan2(dx, dz);
  }

  function updateLore(now) {
    const d = Math.hypot(camera.position.x - SITE.x, camera.position.z - SITE.z);
    const near = d < 16;
    if (near && !wasNear && typeof addFeed === 'function') {
      addFeed('Two road hands work the washed shoulder. Neither stops for you.', true, 9000);
      nextRemark = now + 7000;
    }
    if (near && now > nextRemark && typeof addFeed === 'function') {
      addFeed(remarks[remarkIndex % remarks.length], true, 11000);
      remarkIndex++;
      nextRemark = now + 34000;
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
    workers.forEach(w => updateWorker(w, dt));
    canvas.rotation.z = Math.sin(now * 0.0007) * 0.018;
    updateLore(now);
  }
  requestAnimationFrame(frame);
}

if (window.EMPTYNET_WORLD_API) install(window.EMPTYNET_WORLD_API);
window.addEventListener('emptynet:world-ready', event => install(event.detail), { once: true });
