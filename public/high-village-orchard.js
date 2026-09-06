import * as THREE from 'three';

// A working orchard on the southern High Village approach. Nessa and the yard
// belong to the ordinary regional economy: fruit, cider, vinegar and winter feed.
const SITE = { x: 1192, z: 1168 };
const ACTIVE_DISTANCE = 500;
let installed = false;

function install(api) {
  if (installed || !api?.scene || !api?.camera || !api?.terrainHeight || !Array.isArray(api?.colliders)) return;
  installed = true;

  const { scene, camera, terrainHeight, colliders, addFeed } = api;
  const root = new THREE.Group();
  root.name = 'EMPTYNET_High_Village_Orchard';
  root.position.set(SITE.x, terrainHeight(SITE.x, SITE.z), SITE.z);
  root.rotation.y = 0.16;
  scene.add(root);

  const mat = {
    bark: new THREE.MeshStandardMaterial({ color: 0x4a3627, roughness: 1 }),
    barkDark: new THREE.MeshStandardMaterial({ color: 0x2f251d, roughness: 1 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x465540, roughness: 1 }),
    leaf2: new THREE.MeshStandardMaterial({ color: 0x596148, roughness: 1 }),
    fruit: new THREE.MeshStandardMaterial({ color: 0x7b4934, roughness: 0.9 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x55584f, roughness: 1 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x5a432d, roughness: 0.98 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x292c29, roughness: 0.78, metalness: 0.2 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x696652, roughness: 1 }),
    cider: new THREE.MeshStandardMaterial({ color: 0x6d4d2c, roughness: 0.82 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xb28f72, roughness: 1 })
  };

  const mark = mesh => { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; };
  const box = (w, h, d, material) => mark(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material));
  const cyl = (rt, rb, h, sides, material) => mark(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, sides), material));

  function worldXZ(lx, lz) {
    const c = Math.cos(root.rotation.y);
    const s = Math.sin(root.rotation.y);
    return [SITE.x + lx * c + lz * s, SITE.z - lx * s + lz * c];
  }

  function terrainY(lx, lz) {
    const [x, z] = worldXZ(lx, lz);
    return terrainHeight(x, z) - root.position.y;
  }

  function addCollider(mesh, padding = 0.04) {
    mesh.updateWorldMatrix(true, false);
    colliders.push(new THREE.Box3().setFromObject(mesh).expandByScalar(padding));
  }

  // Eleven individually terrain-anchored orchard trees. Fixed coordinates keep
  // the yard deterministic and let every trunk share the normal world depth path.
  const treeSites = [
    [-12.0, -8.0], [-6.2, -8.6], [-0.4, -8.1], [5.5, -7.5],
    [-11.0, -1.7], [-5.1, -2.1], [0.8, -1.8], [6.9, -1.2],
    [-9.8, 4.9], [-3.6, 4.5], [2.8, 4.9]
  ];
  const crowns = [];

  treeSites.forEach(([x, z], i) => {
    const tree = new THREE.Group();
    tree.position.set(x, terrainY(x, z), z);
    tree.rotation.y = i * 0.71;
    root.add(tree);

    const trunk = cyl(0.24, 0.34, 2.8 + (i % 3) * 0.18, 8, mat.bark);
    trunk.position.y = 1.35;
    tree.add(trunk);

    const branchA = cyl(0.10, 0.15, 1.55, 7, mat.bark);
    branchA.position.set(-0.42, 2.65, 0.03);
    branchA.rotation.z = -0.62;
    tree.add(branchA);
    const branchB = branchA.clone();
    branchB.position.x = 0.40;
    branchB.rotation.z = 0.58;
    tree.add(branchB);

    const crown = new THREE.Group();
    crown.position.y = 3.35;
    tree.add(crown);
    crowns.push(crown);
    const blobs = [[0, 0, 0, 1.5], [-1.0, -0.10, 0.2, 1.15], [0.9, 0.05, -0.15, 1.2], [0.1, 0.52, 0.5, 1.05]];
    blobs.forEach(([bx, by, bz, scale], j) => {
      const foliage = mark(new THREE.Mesh(new THREE.DodecahedronGeometry(scale, 1), (i + j) % 2 ? mat.leaf : mat.leaf2));
      foliage.position.set(bx, by, bz);
      foliage.scale.y = 0.78;
      crown.add(foliage);
    });

    // Sparse fruit keeps the orchard readable rather than turning crowns into noise.
    for (let j = 0; j < 5; j++) {
      const a = i * 1.37 + j * 2.1;
      const fruit = mark(new THREE.Mesh(new THREE.SphereGeometry(0.10, 8, 6), mat.fruit));
      fruit.position.set(Math.cos(a) * (0.65 + (j % 2) * 0.35), -0.35 + (j % 3) * 0.32, Math.sin(a) * 0.72);
      crown.add(fruit);
    }

    tree.updateWorldMatrix(true, true);
    addCollider(trunk, 0.03);
  });

  // Low dry-stone boundaries follow terrain block by block so they never bridge slopes.
  const wallSegments = [];
  function wallRun(x0, z0, x1, z1, count) {
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      const x = x0 + (x1 - x0) * t;
      const z = z0 + (z1 - z0) * t;
      const seg = box(1.55, 0.62, 0.64, mat.stone);
      seg.position.set(x, terrainY(x, z) + 0.24, z);
      seg.rotation.y = Math.atan2(x1 - x0, z1 - z0) + (i % 2 ? 0.025 : -0.025);
      root.add(seg);
      wallSegments.push(seg);
    }
  }
  wallRun(-14.2, -11.2, 8.4, -10.0, 15);
  wallRun(-14.2, -11.2, -13.6, 7.2, 12);

  // Cider yard beside the road: press, trough, barrels, crates and a small awning.
  const yardX = 9.8;
  const yardZ = 5.0;
  const yardY = terrainY(yardX, yardZ);

  const pressBase = box(3.2, 0.38, 2.6, mat.stone);
  pressBase.position.set(yardX, yardY + 0.08, yardZ);
  root.add(pressBase);
  const pressBed = box(2.2, 0.26, 1.5, mat.wood);
  pressBed.position.set(yardX, yardY + 0.55, yardZ);
  root.add(pressBed);
  for (const x of [yardX - 0.86, yardX + 0.86]) {
    const post = box(0.22, 2.65, 0.22, mat.wood);
    post.position.set(x, terrainY(x, yardZ) + 1.33, yardZ);
    root.add(post);
  }
  const pressBeam = box(2.25, 0.24, 0.30, mat.wood);
  pressBeam.position.set(yardX, yardY + 2.46, yardZ);
  root.add(pressBeam);
  const screw = cyl(0.12, 0.12, 1.72, 10, mat.iron);
  screw.position.set(yardX, yardY + 1.65, yardZ);
  root.add(screw);
  const plate = cyl(0.72, 0.72, 0.18, 12, mat.woodDark || mat.barkDark);
  plate.position.set(yardX, yardY + 0.95, yardZ);
  root.add(plate);
  const handle = box(2.35, 0.11, 0.11, mat.wood);
  handle.position.set(yardX, yardY + 2.05, yardZ);
  root.add(handle);

  const trough = box(2.4, 0.55, 0.78, mat.wood);
  trough.position.set(yardX + 3.0, terrainY(yardX + 3.0, yardZ + 0.1) + 0.27, yardZ + 0.1);
  root.add(trough);
  const ciderSurface = box(2.08, 0.03, 0.55, mat.cider);
  ciderSurface.position.set(trough.position.x, trough.position.y + 0.22, trough.position.z);
  root.add(ciderSurface);

  const barrelSites = [[7.0, 7.8], [8.1, 8.0], [9.2, 7.7], [10.4, 8.1]];
  barrelSites.forEach(([x, z], i) => {
    const barrel = cyl(0.42, 0.42, 0.88, 12, mat.wood);
    barrel.position.set(x, terrainY(x, z) + 0.44, z);
    barrel.rotation.z = i === 3 ? Math.PI / 2 : 0;
    root.add(barrel);
    const hoopA = cyl(0.435, 0.435, 0.05, 12, mat.iron);
    hoopA.position.set(x, barrel.position.y - 0.28, z);
    root.add(hoopA);
    const hoopB = hoopA.clone();
    hoopB.position.y = barrel.position.y + 0.28;
    root.add(hoopB);
  });

  for (let i = 0; i < 5; i++) {
    const crate = box(0.92, 0.58, 0.72, mat.wood);
    const x = 13.2 + (i % 2) * 1.02;
    const z = 5.0 + Math.floor(i / 2) * 0.82;
    crate.position.set(x, terrainY(x, z) + 0.28, z);
    crate.rotation.y = (i % 2 ? -0.08 : 0.06);
    root.add(crate);
  }

  const awningPosts = [];
  for (const [x, z] of [[6.6, 4.0], [12.8, 4.0], [6.6, 8.7], [12.8, 8.7]]) {
    const post = box(0.18, 2.65, 0.18, mat.wood);
    post.position.set(x, terrainY(x, z) + 1.30, z);
    root.add(post);
    awningPosts.push(post);
  }
  const canopy = mark(new THREE.Mesh(new THREE.PlaneGeometry(6.6, 5.2), mat.cloth));
  canopy.position.set(9.7, yardY + 2.68, 6.35);
  canopy.rotation.x = -Math.PI / 2;
  canopy.rotation.z = -0.03;
  root.add(canopy);

  // Nessa works between trees, press and barrels. She never follows or faces the player.
  const nessa = new THREE.Group();
  nessa.name = 'Nessa_High_Village_Orchard';
  root.add(nessa);
  const torso = cyl(0.36, 0.48, 1.12, 8, mat.cloth);
  torso.position.y = 0.78;
  nessa.add(torso);
  const head = mark(new THREE.Mesh(new THREE.SphereGeometry(0.29, 12, 8), mat.skin));
  head.position.y = 1.58;
  nessa.add(head);
  const hood = mark(new THREE.Mesh(new THREE.ConeGeometry(0.37, 0.42, 8), mat.barkDark));
  hood.position.y = 1.84;
  nessa.add(hood);

  const route = [[4.5, 4.0], [10.2, 6.4], [13.3, 5.4], [-1.2, 3.8], [-7.8, -0.8], [2.8, -5.8]];
  let routeIndex = 0;
  let wait = 0;
  nessa.position.set(route[0][0], terrainY(route[0][0], route[0][1]), route[0][1]);

  root.updateWorldMatrix(true, true);
  wallSegments.forEach(seg => addCollider(seg, 0.03));
  [pressBase, pressBed, trough, ...awningPosts].forEach(mesh => addCollider(mesh, 0.05));

  let lastFeedSlot = -1;
  function emit(text, lifespan = 12500) {
    if (typeof addFeed === 'function') addFeed(text, false, lifespan);
  }

  function updateNessa(dt, elapsed) {
    if (wait > 0) {
      wait -= dt;
    } else {
      const [tx, tz] = route[routeIndex];
      const dx = tx - nessa.position.x;
      const dz = tz - nessa.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.11) {
        routeIndex = (routeIndex + 1) % route.length;
        wait = 4.0 + (routeIndex % 3) * 2.4;
      } else {
        const step = Math.min(d, dt * 0.48);
        nessa.position.x += dx / d * step;
        nessa.position.z += dz / d * step;
        nessa.position.y = terrainY(nessa.position.x, nessa.position.z);
        nessa.rotation.y = Math.atan2(dx, dz);
      }
    }

    const [wx, wz] = worldXZ(nessa.position.x, nessa.position.z);
    const dPlayer = Math.hypot(wx - camera.position.x, wz - camera.position.z);
    const slot = Math.floor(elapsed / 46);
    if (dPlayer < 27 && slot !== lastFeedSlot) {
      lastFeedSlot = slot;
      const lines = [
        'Nessa turns a bruised apple in her hand and tosses it toward the vinegar barrel.',
        'Nessa says Meret weighs cider carts more carefully since one axle broke on the southern climb.',
        'Nessa wipes the press screw clean. “Hale keeps flour moving. I keep winter drink moving. Same road.”',
        'Nessa counts empty crates and wonders whether Alwen can spare charcoal before the first hard frost.',
        'Nessa checks a low branch for rot, more interested in the tree than in passing travelers.'
      ];
      emit(lines[slot % lines.length]);
    }
  }

  const clock = new THREE.Clock();
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const dx = SITE.x - camera.position.x;
    const dz = SITE.z - camera.position.z;
    root.visible = dx * dx + dz * dz < ACTIVE_DISTANCE * ACTIVE_DISTANCE;
    if (!root.visible) return;

    const elapsed = clock.getElapsedTime();
    updateNessa(dt, elapsed);
    crowns.forEach((crown, i) => {
      crown.rotation.z = Math.sin(elapsed * 0.22 + i * 0.73) * 0.012;
      crown.rotation.x = Math.cos(elapsed * 0.17 + i) * 0.006;
    });
    handle.rotation.y = Math.sin(elapsed * 0.13) * 0.025;
  }
  requestAnimationFrame(frame);

  // World-space verification by construction:
  // - root is fixed at absolute SITE coordinates inside the primary scene;
  // - every ground-touching tree, wall block and prop samples shared terrainHeight;
  // - meshes use the shared renderer/depth path and therefore normal terrain occlusion;
  // - trunks, walls, press, trough and awning posts register shared Box3 collisions.
}

if (window.EMPTYNET_WORLD_API) install(window.EMPTYNET_WORLD_API);
window.addEventListener('emptynet:world-ready', event => install(event.detail), { once: true });
