import * as THREE from 'three';

// A small working burial garden on Greyfold's northern approach. It is intentionally
// mundane: generations of local families, a caretaker, yews, flowers and weathered stone.
const SITE = { x: -1008, z: 1034 };
const ACTIVE_DISTANCE = 500;
let installed = false;

function install(api) {
  if (installed || !api?.scene || !api?.camera || !api?.terrainHeight || !Array.isArray(api?.colliders)) return;
  installed = true;

  const { scene, camera, terrainHeight, colliders, addFeed } = api;
  const root = new THREE.Group();
  root.name = 'EMPTYNET_Greyfold_Burial_Garden';
  root.position.set(SITE.x, terrainHeight(SITE.x, SITE.z), SITE.z);
  root.rotation.y = -0.19;
  scene.add(root);

  const mat = {
    stone: new THREE.MeshStandardMaterial({ color: 0x555950, roughness: 1 }),
    stoneDark: new THREE.MeshStandardMaterial({ color: 0x393e39, roughness: 1 }),
    oldStone: new THREE.MeshStandardMaterial({ color: 0x68695e, roughness: 1 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x4a3828, roughness: 1 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x292d2a, roughness: 0.82, metalness: 0.18 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x35463b, roughness: 1 }),
    grass: new THREE.MeshStandardMaterial({ color: 0x657052, roughness: 1 }),
    flower: new THREE.MeshStandardMaterial({ color: 0x796a69, roughness: 1 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x5a5e54, roughness: 1 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xb39477, roughness: 1 }),
    earth: new THREE.MeshStandardMaterial({ color: 0x4b4034, roughness: 1 })
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

  // Low wall built in short terrain-following segments so it never bridges a slope.
  const wallSegments = [];
  function wallRun(x0, z0, x1, z1, count) {
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      const x = x0 + (x1 - x0) * t;
      const z = z0 + (z1 - z0) * t;
      const seg = box(1.55, 0.68, 0.68, i % 3 ? mat.stone : mat.oldStone);
      seg.position.set(x, terrainY(x, z) + 0.28, z);
      seg.rotation.y = Math.atan2(x1 - x0, z1 - z0) + (i % 2 ? 0.025 : -0.025);
      root.add(seg);
      wallSegments.push(seg);
    }
  }
  wallRun(-14, -10, 14, -10, 18);
  wallRun(-14, 10, 14, 10, 18);
  wallRun(-14, -10, -14, 10, 13);
  wallRun(14, -10, 14, -2.2, 5);
  wallRun(14, 2.2, 14, 10, 5);

  // Simple gate and notice board at the road-facing opening.
  for (const z of [-2.0, 2.0]) {
    const post = box(0.42, 2.4, 0.42, mat.stoneDark);
    post.position.set(14.0, terrainY(14.0, z) + 1.05, z);
    root.add(post);
    addCollider(post, 0.04);
  }
  const gate = box(0.15, 1.2, 3.45, mat.iron);
  gate.position.set(13.88, terrainY(13.88, 0) + 0.62, 0);
  root.add(gate);
  addCollider(gate, 0.03);

  const noticePost = box(0.2, 1.75, 0.2, mat.wood);
  noticePost.position.set(11.3, terrainY(11.3, 3.1) + 0.84, 3.1);
  root.add(noticePost);
  const notice = box(1.5, 0.82, 0.1, mat.wood);
  notice.position.set(11.3, noticePost.position.y + 0.42, 3.1);
  root.add(notice);

  // Eleven family graves. Their positions and lean are fixed, preserving seed determinism.
  const graves = [
    [-8.8, -5.8, -0.07], [-4.6, -5.6, 0.04], [-0.4, -5.7, -0.03], [4.0, -5.5, 0.06], [8.5, -5.6, -0.05],
    [-8.0, 0.0, 0.02], [-3.6, 0.2, -0.04], [1.0, 0.1, 0.05], [5.3, 0.3, -0.02],
    [-5.7, 5.6, 0.06], [2.1, 5.7, -0.05]
  ];
  const headstones = [];
  graves.forEach(([x, z, lean], i) => {
    const mound = box(2.1, 0.16, 0.82, mat.earth);
    mound.position.set(x - 0.7, terrainY(x - 0.7, z) + 0.02, z);
    mound.rotation.y = 0.04 * ((i % 3) - 1);
    root.add(mound);

    const stone = box(0.22, 1.35 + (i % 3) * 0.12, 0.82, i < 4 ? mat.oldStone : mat.stone);
    stone.position.set(x + 0.46, terrainY(x + 0.46, z) + 0.60, z);
    stone.rotation.z = lean;
    root.add(stone);
    headstones.push(stone);

    if (i === 1 || i === 6 || i === 9) {
      const stems = cyl(0.035, 0.045, 0.34, 5, mat.grass);
      stems.position.set(x - 0.12, terrainY(x - 0.12, z + 0.44) + 0.15, z + 0.44);
      root.add(stems);
      const bloom = mark(new THREE.Mesh(new THREE.SphereGeometry(0.12, 7, 5), mat.flower));
      bloom.position.set(stems.position.x, stems.position.y + 0.22, stems.position.z);
      root.add(bloom);
    }
  });

  // Two old yews make the garden visible from the road without becoming a landmark tower.
  for (const [x, z, scale] of [[-10.2, 7.0, 1.05], [9.4, 6.8, 0.9]]) {
    const trunk = cyl(0.28, 0.42, 3.8 * scale, 8, mat.wood);
    trunk.position.set(x, terrainY(x, z) + 1.75 * scale, z);
    root.add(trunk);
    addCollider(trunk, 0.05);
    for (const [ox, oy, oz, s] of [[0, 3.6, 0, 1.6], [-0.7, 3.1, 0.2, 1.15], [0.7, 3.0, -0.2, 1.1]]) {
      const crown = mark(new THREE.Mesh(new THREE.DodecahedronGeometry(s * scale, 1), mat.leaf));
      crown.position.set(x + ox * scale, terrainY(x, z) + oy * scale, z + oz * scale);
      crown.scale.y = 1.25;
      root.add(crown);
    }
  }

  // Caretaker's shed and handcart.
  const shedX = -10.4, shedZ = -6.0, shedY = terrainY(shedX, shedZ);
  const shed = box(4.4, 2.6, 3.4, mat.wood);
  shed.position.set(shedX, shedY + 1.25, shedZ);
  root.add(shed);
  const roofA = box(2.65, 0.18, 3.9, mat.stoneDark);
  roofA.position.set(shedX - 0.95, shedY + 2.85, shedZ);
  roofA.rotation.z = 0.42;
  root.add(roofA);
  const roofB = roofA.clone();
  roofB.position.x = shedX + 0.95;
  roofB.rotation.z = -0.42;
  root.add(roofB);
  addCollider(shed, 0.08);

  const cart = new THREE.Group();
  cart.position.set(-7.2, terrainY(-7.2, -7.0), -7.0);
  root.add(cart);
  const cartBed = box(1.7, 0.35, 1.1, mat.wood);
  cartBed.position.y = 0.72;
  cart.add(cartBed);
  for (const z of [-0.62, 0.62]) {
    const wheel = mark(new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.08, 6, 12), mat.iron));
    wheel.position.set(0, 0.5, z);
    wheel.rotation.y = Math.PI / 2;
    cart.add(wheel);
  }
  const handle = box(2.2, 0.09, 0.09, mat.wood);
  handle.position.set(1.6, 0.7, 0);
  cart.add(handle);
  cart.updateWorldMatrix(true, true);
  addCollider(cartBed, 0.05);

  // Oran keeps the paths, trims yews and carries flowers. He has no special knowledge.
  const oran = new THREE.Group();
  oran.name = 'Oran_Greyfold_Caretaker';
  root.add(oran);
  const torso = cyl(0.34, 0.46, 1.14, 8, mat.cloth);
  torso.position.y = 0.78;
  oran.add(torso);
  const head = mark(new THREE.Mesh(new THREE.SphereGeometry(0.29, 12, 8), mat.skin));
  head.position.y = 1.58;
  oran.add(head);
  const cap = cyl(0.32, 0.34, 0.16, 9, mat.stoneDark);
  cap.position.y = 1.82;
  oran.add(cap);
  const rake = cyl(0.035, 0.045, 1.95, 6, mat.wood);
  rake.position.set(0.48, 0.95, 0.06);
  rake.rotation.z = -0.12;
  oran.add(rake);

  const route = [[10.6, 3.0], [5.3, 0.6], [-1.0, 0.8], [-6.5, 5.0], [-10.0, -4.0], [-2.0, -5.0], [7.0, -5.2]];
  let routeIndex = 0;
  let wait = 0;
  oran.position.set(route[0][0], terrainY(route[0][0], route[0][1]), route[0][1]);

  root.updateWorldMatrix(true, true);
  wallSegments.forEach(seg => addCollider(seg, 0.03));
  headstones.forEach(stone => addCollider(stone, 0.025));

  let lastFeedSlot = -1;
  function emit(text, lifespan = 12500) {
    if (typeof addFeed === 'function') addFeed(text, false, lifespan);
  }

  function updateOran(dt, elapsed) {
    if (wait > 0) {
      wait -= dt;
    } else {
      const [tx, tz] = route[routeIndex];
      const dx = tx - oran.position.x;
      const dz = tz - oran.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.12) {
        routeIndex = (routeIndex + 1) % route.length;
        wait = 4.5 + (routeIndex % 4) * 1.8;
      } else {
        const step = Math.min(d, dt * 0.44);
        oran.position.x += dx / d * step;
        oran.position.z += dz / d * step;
        oran.position.y = terrainY(oran.position.x, oran.position.z);
        oran.rotation.y = Math.atan2(dx, dz);
      }
    }

    const [wx, wz] = worldXZ(oran.position.x, oran.position.z);
    const dPlayer = Math.hypot(wx - camera.position.x, wz - camera.position.z);
    const slot = Math.floor(elapsed / 47);
    if (dPlayer < 25 && slot !== lastFeedSlot) {
      lastFeedSlot = slot;
      const lines = [
        'Oran clears wet leaves from a family stone and sets them aside for the compost heap.',
        'Oran says Edda brings clean cloth after funerals when the weather allows the washing to dry.',
        'Oran checks the road. “Vessa promised darker ribbon before the next burial. Greyfold always runs short in rain.”',
        'Oran straightens a leaning marker. “Names last longer when somebody bothers to keep the moss off.”',
        'Oran counts three fresh flower stems and guesses Mara passed this way before dawn.',
        'Oran oils the little gate hinge, muttering that the north wind ruins iron faster than grief does.'
      ];
      emit(lines[slot % lines.length]);
    }
  }

  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const dx = SITE.x - camera.position.x;
    const dz = SITE.z - camera.position.z;
    const active = dx * dx + dz * dz < ACTIVE_DISTANCE * ACTIVE_DISTANCE;
    root.visible = active;
    if (!active) return;
    updateOran(dt, now / 1000);
  }
  requestAnimationFrame(frame);
}

function boot() {
  if (window.EMPTYNET_WORLD_API) install(window.EMPTYNET_WORLD_API);
  else window.addEventListener('emptynet:world-ready', event => install(event.detail), { once: true });
}

boot();
