import * as THREE from 'three';

// A working roadside windmill serving Greyfold's ordinary grain trade.
// It sits close to the established Greyfold road and ties together Mara, Edda,
// the flour cart and the road crew without giving locals anomalous knowledge.
const SITE = { x: -846, z: 973 };
const ACTIVE_DISTANCE = 520;
let installed = false;

function install(api) {
  if (installed || !api?.scene || !api?.camera || !api?.terrainHeight || !Array.isArray(api?.colliders)) return;
  installed = true;

  const { scene, camera, terrainHeight, colliders, addFeed } = api;
  const root = new THREE.Group();
  root.name = 'EMPTYNET_Greyfold_Windmill';
  root.position.set(SITE.x, terrainHeight(SITE.x, SITE.z), SITE.z);
  root.rotation.y = 0.38;
  scene.add(root);

  const mats = {
    stone: new THREE.MeshStandardMaterial({ color: 0x64665e, roughness: 1 }),
    stoneDark: new THREE.MeshStandardMaterial({ color: 0x444740, roughness: 1 }),
    plaster: new THREE.MeshStandardMaterial({ color: 0xa89d81, roughness: 1 }),
    timber: new THREE.MeshStandardMaterial({ color: 0x493728, roughness: 1 }),
    timberDark: new THREE.MeshStandardMaterial({ color: 0x30251d, roughness: 1 }),
    sail: new THREE.MeshStandardMaterial({ color: 0x8f8773, roughness: 1, side: THREE.DoubleSide }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x5c604f, roughness: 1 }),
    grain: new THREE.MeshStandardMaterial({ color: 0x8b794f, roughness: 1 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xb08c70, roughness: 1 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x2d302d, roughness: 0.82, metalness: 0.18 })
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
  function addCollider(obj, pad = 0.05) {
    obj.updateWorldMatrix(true, false);
    colliders.push(new THREE.Box3().setFromObject(obj).expandByScalar(pad));
  }

  // Low stone footing follows the actual terrain and gives the mill believable weight.
  const footing = cyl(3.45, 3.8, 1.25, 12, mats.stoneDark);
  footing.position.y = 0.28;
  root.add(footing);

  const tower = cyl(2.55, 3.25, 7.4, 12, mats.plaster);
  tower.position.y = 4.25;
  root.add(tower);

  // Exposed structural ribs keep the silhouette handmade rather than pristine.
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const rib = box(0.18, 5.8, 0.22, mats.timber);
    rib.position.set(Math.cos(a) * 2.7, 4.25, Math.sin(a) * 2.7);
    rib.rotation.y = -a;
    root.add(rib);
  }

  const cap = mark(new THREE.Mesh(new THREE.ConeGeometry(3.25, 2.35, 12), mats.timberDark));
  cap.position.y = 8.9;
  root.add(cap);

  const door = box(1.15, 2.1, 0.16, mats.timberDark);
  door.position.set(0.7, 1.2, 3.03);
  root.add(door);

  const lintel = box(1.5, 0.18, 0.28, mats.stone);
  lintel.position.set(0.7, 2.28, 2.98);
  root.add(lintel);

  for (const wx of [-1.15, 1.35]) {
    const shutter = box(0.72, 0.86, 0.12, mats.timber);
    shutter.position.set(wx, 4.8, 2.66);
    root.add(shutter);
  }

  // Wheel and sails are true world geometry on the same depth buffer.
  const axle = cyl(0.18, 0.18, 1.05, 10, mats.iron);
  axle.rotation.x = Math.PI / 2;
  axle.position.set(0, 7.55, 3.05);
  root.add(axle);

  const wheel = new THREE.Group();
  wheel.name = 'Greyfold_Mill_Sails';
  wheel.position.set(0, 7.55, 3.62);
  root.add(wheel);

  const hub = cyl(0.34, 0.34, 0.38, 10, mats.timberDark);
  hub.rotation.x = Math.PI / 2;
  wheel.add(hub);

  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group();
    arm.rotation.z = i * Math.PI / 2;
    wheel.add(arm);

    const spar = box(0.16, 4.9, 0.16, mats.timberDark);
    spar.position.y = 2.35;
    arm.add(spar);

    const sail = mark(new THREE.Mesh(new THREE.PlaneGeometry(1.08, 3.05), mats.sail));
    sail.position.set(0.48, 2.78, 0.04);
    sail.rotation.z = -0.08;
    arm.add(sail);
  }

  // Grain sacks and hand cart establish the mill as part of a functioning local economy.
  const sackPositions = [[-3.5, 2.3], [-2.8, 2.55], [-3.2, 3.05], [3.5, 1.9]];
  sackPositions.forEach(([x, z], i) => {
    const sack = mark(new THREE.Mesh(new THREE.SphereGeometry(0.52, 10, 7), mats.grain));
    sack.scale.set(0.75, 1.05, 0.6);
    sack.position.set(x, localY(x, z) + 0.48, z);
    sack.rotation.z = (i - 1.5) * 0.08;
    root.add(sack);
  });

  const cart = new THREE.Group();
  cart.name = 'Greyfold_Flour_Handcart';
  cart.position.set(4.25, localY(4.25, 2.8), 2.8);
  cart.rotation.y = -0.36;
  root.add(cart);
  const cartBed = box(2.0, 0.42, 1.2, mats.timber);
  cartBed.position.y = 0.78;
  cart.add(cartBed);
  for (const x of [-0.78, 0.78]) {
    const wheelMesh = mark(new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.09, 7, 14), mats.timberDark));
    wheelMesh.rotation.y = Math.PI / 2;
    wheelMesh.position.set(x, 0.5, 0.66);
    cart.add(wheelMesh);
  }
  const handleA = box(1.55, 0.10, 0.10, mats.timberDark);
  handleA.position.set(1.55, 0.72, 0.38);
  handleA.rotation.z = -0.13;
  cart.add(handleA);
  const handleB = handleA.clone();
  handleB.position.z = -0.38;
  cart.add(handleB);

  // Hale the miller has a small deterministic work circuit and does not orbit the player.
  const hale = new THREE.Group();
  hale.name = 'Hale_Greyfold_Miller';
  root.add(hale);
  const body = cyl(0.36, 0.46, 1.18, 8, mats.cloth);
  body.position.y = 0.72;
  hale.add(body);
  const head = mark(new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 7), mats.skin));
  head.position.y = 1.5;
  hale.add(head);
  const capHale = cyl(0.18, 0.3, 0.18, 8, mats.timberDark);
  capHale.position.y = 1.72;
  hale.add(capHale);
  const apron = box(0.52, 0.8, 0.08, mats.sail);
  apron.position.set(0, 0.78, 0.4);
  hale.add(apron);

  const route = [[1.8, 3.7], [-2.8, 2.4], [3.6, 2.1], [0.7, 3.25]];
  let routeIndex = 1;
  let wait = 2.5;
  const [startX, startZ] = route[0];
  hale.position.set(startX, localY(startX, startZ), startZ);

  root.updateWorldMatrix(true, true);
  addCollider(footing, 0.08);
  addCollider(tower, 0.08);
  addCollider(door, 0.03);
  addCollider(cart, 0.04);

  let last = performance.now();
  let nearLast = false;
  let nextRemark = last + 12000;
  let remarkIndex = 0;
  const remarks = [
    'Hale: Edda says the spring ran clear this morning. Good weather for washing sacks.',
    'Hale: Mara still owes me two measures of barley, unless the sheep ate the tally again.',
    'Hale: Tomas wants the west rut packed before the flour cart makes another run.',
    'Hale: Greyfold takes rye before wheat. Always has. Wheat goes east when the road holds.'
  ];

  function updateHale(dt) {
    if (wait > 0) { wait -= dt; return; }
    const [tx, tz] = route[routeIndex];
    const dx = tx - hale.position.x;
    const dz = tz - hale.position.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.18) {
      routeIndex = (routeIndex + 1) % route.length;
      wait = 3.0 + ((routeIndex * 1.9) % 3.5);
      return;
    }
    const step = Math.min(d, 0.38 * dt);
    hale.position.x += dx / d * step;
    hale.position.z += dz / d * step;
    hale.position.y = localY(hale.position.x, hale.position.z);
    hale.rotation.y = Math.atan2(dx, dz);
  }

  function updateLocalLife(now) {
    const d = Math.hypot(camera.position.x - SITE.x, camera.position.z - SITE.z);
    const near = d < 18;
    if (near && !nearLast && typeof addFeed === 'function') {
      addFeed('A windmill turns above the Greyfold road. Flour dust whitens the stones by the door.', true, 10000);
      nextRemark = now + 6500;
    }
    if (near && now > nextRemark && typeof addFeed === 'function') {
      addFeed(remarks[remarkIndex % remarks.length], true, 11500);
      remarkIndex++;
      nextRemark = now + 36000;
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

    // Constant, deterministic mechanical motion; no random per-client state.
    wheel.rotation.z -= dt * 0.23;
    updateHale(dt);
    updateLocalLife(now);
  }
  requestAnimationFrame(frame);
}

if (window.EMPTYNET_WORLD_API) install(window.EMPTYNET_WORLD_API);
window.addEventListener('emptynet:world-ready', event => install(event.detail), { once: true });
