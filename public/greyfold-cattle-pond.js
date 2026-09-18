import * as THREE from 'three';

const SITE = { x: -790, z: 1115 };
const ACTIVE_DISTANCE = 600;
let installed = false;

function mark(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function install(api) {
  if (installed || !api?.scene || !api?.camera || !api?.terrainHeight || !Array.isArray(api?.colliders)) return;
  installed = true;

  const { scene, camera, terrainHeight, colliders, addFeed } = api;
  const root = new THREE.Group();
  root.name = 'EMPTYNET_Greyfold_Cattle_Pond';
  scene.add(root);

  const earth = new THREE.MeshStandardMaterial({ color: 0x625846, roughness: 1 });
  const stone = new THREE.MeshStandardMaterial({ color: 0x77766c, roughness: 0.98 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x604a34, roughness: 1 });
  const darkWood = new THREE.MeshStandardMaterial({ color: 0x493827, roughness: 1 });
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x536966, roughness: 0.42, metalness: 0.04, transparent: true, opacity: 0.78 });
  const cowMat = new THREE.MeshStandardMaterial({ color: 0x66584a, roughness: 1 });
  const cowDark = new THREE.MeshStandardMaterial({ color: 0x3f3932, roughness: 1 });
  const pale = new THREE.MeshStandardMaterial({ color: 0xa69b82, roughness: 1 });

  function ground(x, z) { return terrainHeight(x, z); }
  function addBox(x, z, sx, sy, sz, mat, yaw = 0, blocking = true) {
    const y = ground(x, z);
    const mesh = mark(new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat));
    mesh.position.set(x, y + sy / 2, z);
    mesh.rotation.y = yaw;
    root.add(mesh);
    if (blocking) {
      mesh.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(mesh);
      colliders.push(box);
    }
    return mesh;
  }

  // A shallow stone-edged watering pond beside Greyfold's livestock road.
  const waterX = SITE.x - 3;
  const waterZ = SITE.z + 1;
  const waterY = ground(waterX, waterZ) + 0.05;
  const water = new THREE.Mesh(new THREE.CircleGeometry(5.4, 28), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(waterX, waterY, waterZ);
  root.add(water);

  const rim = [];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const r = 5.55 + Math.sin(i * 2.31) * 0.25;
    const x = waterX + Math.cos(a) * r;
    const z = waterZ + Math.sin(a) * r;
    const rock = mark(new THREE.Mesh(new THREE.DodecahedronGeometry(0.48 + (i % 3) * 0.08, 0), stone));
    rock.scale.set(1.25, 0.62, 0.92);
    rock.position.set(x, ground(x, z) + 0.25, z);
    rock.rotation.set(0.08 * Math.sin(i), -a, 0.05 * Math.cos(i));
    root.add(rock);
    rock.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(rock);
    colliders.push(box);
    rim.push(rock);
  }

  // Old split-rail fence keeps carts from cutting across the watering place.
  const fence = [
    [-799, 1108, 0.18], [-796, 1107, 0.12], [-793, 1107, 0.05],
    [-784, 1109, -0.10], [-781, 1111, -0.18]
  ];
  for (const [x, z, yaw] of fence) {
    addBox(x, z, 0.28, 2.2, 0.28, darkWood, yaw, true);
    const rail = addBox(x + 1.35, z, 2.9, 0.16, 0.18, wood, yaw, true);
    rail.position.y += 0.52;
  }

  // Trough and salt block make the place feel maintained rather than decorative.
  addBox(-785, 1121, 4.0, 0.62, 1.15, wood, -0.15, true);
  const troughWater = new THREE.Mesh(new THREE.BoxGeometry(3.55, 0.04, 0.72), waterMat);
  troughWater.position.set(-785, ground(-785, 1121) + 0.62, 1121);
  troughWater.rotation.y = -0.15;
  root.add(troughWater);
  addBox(-789, 1122.5, 0.65, 0.42, 0.55, pale, 0.1, true);

  function makeCow(seed) {
    const g = new THREE.Group();
    const bodyMat = seed % 2 ? cowMat : cowDark;
    const body = mark(new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.82, 2.15), bodyMat));
    body.position.y = 1.05;
    g.add(body);
    const headPivot = new THREE.Group();
    headPivot.position.set(0, 1.15, 1.28);
    g.add(headPivot);
    const head = mark(new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.68, 0.82), bodyMat));
    headPivot.add(head);
    const muzzle = mark(new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.32, 0.38), pale));
    muzzle.position.set(0, -0.12, 0.50);
    headPivot.add(muzzle);
    for (const side of [-1, 1]) {
      const horn = mark(new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.36, 6), pale));
      horn.position.set(side * 0.34, 0.33, 0.04);
      horn.rotation.z = side * -0.55;
      headPivot.add(horn);
      const leg = mark(new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.12, 0.92, 6), bodyMat));
      leg.position.set(side * 0.43, 0.47, 0.67);
      g.add(leg);
      const leg2 = leg.clone();
      leg2.position.z = -0.67;
      g.add(leg2);
    }
    g.userData.headPivot = headPivot;
    return g;
  }

  const cows = [0, 1, 2, 3].map(i => {
    const mesh = makeCow(i);
    mesh.scale.setScalar(0.86 + i * 0.035);
    root.add(mesh);
    return { mesh, phase: i * 1.57, radius: 7.2 + i * 1.25, speed: 0.72 + i * 0.06 };
  });

  // Olan is a local stockman. His concerns stay deliberately ordinary.
  const olan = new THREE.Group();
  const coat = new THREE.MeshStandardMaterial({ color: 0x4d5948, roughness: 1 });
  const skin = new THREE.MeshStandardMaterial({ color: 0x9b7b62, roughness: 1 });
  const torso = mark(new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.39, 1.15, 7), coat));
  torso.position.y = 1.25;
  olan.add(torso);
  const head = mark(new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 7), skin));
  head.position.y = 2.02;
  olan.add(head);
  const hat = mark(new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.08, 8), darkWood));
  hat.position.y = 2.27;
  olan.add(hat);
  for (const side of [-1, 1]) {
    const leg = mark(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.10, 0.9, 6), darkWood));
    leg.position.set(side * 0.16, 0.47, 0);
    olan.add(leg);
  }
  root.add(olan);

  const olanCollider = new THREE.Box3();
  colliders.push(olanCollider);
  const olanRoute = [
    [-781, 1117], [-786, 1119], [-791, 1117], [-796, 1113], [-792, 1108], [-784, 1110]
  ];
  const remarks = [
    'Olan: Tovin wants the brown ewe lot kept off this bank until noon.',
    'Olan: Mara says the east verge is holding water again.',
    'Olan: If Vessa sends for cream, tell her the morning pail is already spoken for.',
    'Olan: Iven came through before first light. Road dust all over his poor mule.',
    'Olan: The salt lasts longer when the rain comes straight down. It never does.'
  ];
  let lastRemark = -1;
  let lastFrame = 0;

  function routePosition(t) {
    const segmentTime = 18;
    const total = olanRoute.length * segmentTime;
    const local = ((t % total) + total) % total;
    const idx = Math.floor(local / segmentTime);
    const u = (local % segmentTime) / segmentTime;
    const a = olanRoute[idx];
    const b = olanRoute[(idx + 1) % olanRoute.length];
    const smooth = u * u * (3 - 2 * u);
    return { x: THREE.MathUtils.lerp(a[0], b[0], smooth), z: THREE.MathUtils.lerp(a[1], b[1], smooth), dx: b[0] - a[0], dz: b[1] - a[1] };
  }

  function animate(now) {
    requestAnimationFrame(animate);
    if (now - lastFrame < 34) return;
    lastFrame = now;
    const dxSite = camera.position.x - SITE.x;
    const dzSite = camera.position.z - SITE.z;
    const active = dxSite * dxSite + dzSite * dzSite < ACTIVE_DISTANCE * ACTIVE_DISTANCE;
    root.visible = active;
    if (!active) return;

    const t = Date.now() / 1000;
    waterMat.opacity = 0.75 + Math.sin(t * 0.34) * 0.035;
    water.rotation.z = Math.sin(t * 0.11) * 0.004;

    for (let i = 0; i < cows.length; i++) {
      const cow = cows[i];
      const u = t * 0.018 * cow.speed + cow.phase;
      const x = waterX + Math.cos(u) * cow.radius + Math.sin(u * 0.37 + i) * 1.6;
      const z = waterZ + Math.sin(u * 0.83) * cow.radius * 0.72;
      cow.mesh.position.set(x, ground(x, z), z);
      cow.mesh.rotation.y = Math.atan2(-Math.sin(u), Math.cos(u * 0.83));
      const drink = Math.sin(t * 0.27 + cow.phase) > 0.84 ? 0.72 : 0;
      cow.mesh.userData.headPivot.rotation.x = drink;
      cow.mesh.userData.headPivot.position.y = 1.15 - drink * 0.38;
    }

    const p = routePosition(t);
    olan.position.set(p.x, ground(p.x, p.z), p.z);
    olan.rotation.y = Math.atan2(p.dx, p.dz);
    olanCollider.setFromCenterAndSize(new THREE.Vector3(p.x, olan.position.y + 1.15, p.z), new THREE.Vector3(0.85, 2.3, 0.85));

    const remarkSlot = Math.floor(t / 79);
    if (remarkSlot !== lastRemark && camera.position.distanceTo(olan.position) < 15) {
      lastRemark = remarkSlot;
      const index = Math.abs((remarkSlot * 7 + 3) % remarks.length);
      if (typeof addFeed === 'function') addFeed(remarks[index], false, 7600);
    }
  }
  requestAnimationFrame(animate);
}

if (window.EMPTYNET_WORLD_API) install(window.EMPTYNET_WORLD_API);
window.addEventListener('emptynet:world-ready', event => install(event.detail), { once: true });
