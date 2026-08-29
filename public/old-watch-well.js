import * as THREE from 'three';

// A working roadside well on the Old Watch approach. Locals consider the dark
// tower an ancient watch and the well simply part of the road infrastructure.
// A deeper reading is available only after the existing Seven Watches chain.
const SITE = { x: 646, z: -407 };
const ACTIVE_DISTANCE = 440;
let installed = false;

function install(api) {
  if (installed || !api?.scene || !api?.camera || !api?.terrainHeight || !Array.isArray(api?.colliders)) return;
  installed = true;

  const { scene, camera, terrainHeight, colliders, addFeed } = api;
  const root = new THREE.Group();
  root.name = 'EMPTYNET_Old_Watch_Well';
  root.position.set(SITE.x, terrainHeight(SITE.x, SITE.z), SITE.z);
  root.rotation.y = 0.32;
  scene.add(root);

  const mat = {
    stone: new THREE.MeshStandardMaterial({ color: 0x555951, roughness: 1 }),
    stoneDark: new THREE.MeshStandardMaterial({ color: 0x343935, roughness: 1 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x4a3828, roughness: 0.98 }),
    woodDark: new THREE.MeshStandardMaterial({ color: 0x2d241c, roughness: 1 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x262a28, roughness: 0.76, metalness: 0.24 }),
    rope: new THREE.MeshStandardMaterial({ color: 0x8c7b5d, roughness: 1 }),
    water: new THREE.MeshStandardMaterial({ color: 0x41565a, roughness: 0.18, metalness: 0.02, transparent: true, opacity: 0.82 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x5f6256, roughness: 1 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xad8d71, roughness: 1 }),
    brass: new THREE.MeshStandardMaterial({ color: 0x6f633b, roughness: 0.66, metalness: 0.28 })
  };

  const mark = mesh => { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; };
  const box = (w, h, d, material) => mark(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material));
  const cyl = (rt, rb, h, sides, material) => mark(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, sides), material));

  function localToWorld(localX, localZ) {
    const c = Math.cos(root.rotation.y);
    const s = Math.sin(root.rotation.y);
    return {
      x: SITE.x + localX * c + localZ * s,
      z: SITE.z - localX * s + localZ * c
    };
  }

  function terrainY(localX, localZ) {
    const p = localToWorld(localX, localZ);
    return terrainHeight(p.x, p.z) - root.position.y;
  }

  function addCollider(mesh, padding = 0.05) {
    mesh.updateWorldMatrix(true, false);
    colliders.push(new THREE.Box3().setFromObject(mesh).expandByScalar(padding));
  }

  // Well curb: individually seated stone blocks keep the ring visibly grounded
  // even if the nearby road shoulder is slightly uneven.
  const wellCenter = { x: 0, z: 0 };
  const wellY = terrainY(0, 0);
  const curbBlocks = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const x = Math.cos(a) * 1.35;
    const z = Math.sin(a) * 1.35;
    const stone = box(0.76, 0.58, 0.52, i % 3 === 0 ? mat.stoneDark : mat.stone);
    stone.position.set(x, terrainY(x, z) + 0.25, z);
    stone.rotation.y = -a + Math.PI / 2;
    root.add(stone);
    curbBlocks.push(stone);
  }

  const water = cyl(1.02, 1.02, 0.05, 32, mat.water);
  water.position.set(0, wellY + 0.12, 0);
  root.add(water);

  // Timber canopy and crank.
  const posts = [];
  for (const x of [-1.65, 1.65]) {
    const post = box(0.26, 3.1, 0.26, mat.woodDark);
    post.position.set(x, terrainY(x, 0.15) + 1.42, 0.15);
    root.add(post);
    posts.push(post);
  }
  const beam = box(4.05, 0.25, 0.28, mat.woodDark);
  beam.position.set(0, wellY + 2.75, 0.15);
  root.add(beam);

  const roofA = box(2.55, 0.14, 2.9, mat.wood);
  roofA.position.set(-0.72, wellY + 3.18, 0.12);
  roofA.rotation.z = 0.46;
  root.add(roofA);
  const roofB = roofA.clone();
  roofB.position.x = 0.72;
  roofB.rotation.z = -0.46;
  root.add(roofB);

  const crank = new THREE.Group();
  crank.position.set(0, wellY + 2.18, 0.16);
  root.add(crank);
  const axle = cyl(0.12, 0.12, 3.25, 12, mat.iron);
  axle.rotation.z = Math.PI / 2;
  crank.add(axle);
  const spool = cyl(0.38, 0.38, 0.68, 16, mat.woodDark);
  spool.rotation.z = Math.PI / 2;
  crank.add(spool);
  const handleArm = box(0.88, 0.11, 0.11, mat.iron);
  handleArm.position.set(1.92, 0, 0);
  handleArm.rotation.z = 0.62;
  crank.add(handleArm);
  const handle = cyl(0.08, 0.08, 0.52, 10, mat.wood);
  handle.position.set(2.18, 0.27, 0);
  handle.rotation.x = Math.PI / 2;
  crank.add(handle);

  // Seven small tally collars on the crank are locally understood as depth marks.
  for (let i = 0; i < 7; i++) {
    const collar = cyl(0.16, 0.16, 0.035, 12, i === 6 ? mat.brass : mat.iron);
    collar.rotation.z = Math.PI / 2;
    collar.position.x = -0.30 + i * 0.10;
    crank.add(collar);
  }

  const rope = cyl(0.035, 0.035, 2.0, 8, mat.rope);
  rope.position.set(0, wellY + 1.16, 0.05);
  root.add(rope);
  const bucket = cyl(0.30, 0.23, 0.42, 12, mat.iron);
  bucket.position.set(0, wellY + 0.26, 0.05);
  root.add(bucket);

  // Overflow trough and a tiny shelter make this a practical stop for carts and animals.
  const troughBaseY = terrainY(3.2, 1.25);
  const trough = box(3.0, 0.55, 0.92, mat.woodDark);
  trough.position.set(3.2, troughBaseY + 0.27, 1.25);
  root.add(trough);
  const troughWater = box(2.62, 0.05, 0.58, mat.water);
  troughWater.position.set(3.2, troughBaseY + 0.55, 1.25);
  root.add(troughWater);

  const shelterY = terrainY(-4.0, 1.15);
  for (const [x, z] of [[-5.2, 0.0], [-2.8, 0.0], [-5.2, 2.3], [-2.8, 2.3]]) {
    const p = box(0.18, 2.15, 0.18, mat.woodDark);
    p.position.set(x, terrainY(x, z) + 1.0, z);
    root.add(p);
  }
  const shelterRoof = box(3.1, 0.16, 3.15, mat.wood);
  shelterRoof.position.set(-4.0, shelterY + 2.08, 1.15);
  shelterRoof.rotation.z = -0.08;
  root.add(shelterRoof);
  const bench = box(2.3, 0.18, 0.58, mat.wood);
  bench.position.set(-4.0, terrainY(-4.0, 1.72) + 0.52, 1.72);
  root.add(bench);

  // A maintenance board: mundane notes on rope, water and cart traffic.
  const board = box(1.7, 1.0, 0.11, mat.wood);
  board.position.set(-4.0, shelterY + 1.18, 0.04);
  root.add(board);
  for (let i = 0; i < 5; i++) {
    const peg = cyl(0.035, 0.035, 0.13, 8, mat.iron);
    peg.rotation.x = Math.PI / 2;
    peg.position.set(-4.58 + i * 0.29, shelterY + 1.32 - (i % 2) * 0.22, 0.12);
    root.add(peg);
  }

  // Derren, the well tender. He checks the trough, crank and shelter in a loop
  // and never tracks the player.
  const keeper = new THREE.Group();
  keeper.name = 'Derren_Old_Watch_Well';
  root.add(keeper);
  const torso = cyl(0.36, 0.47, 1.18, 8, mat.cloth);
  torso.position.y = 0.80;
  keeper.add(torso);
  const head = mark(new THREE.Mesh(new THREE.SphereGeometry(0.29, 12, 8), mat.skin));
  head.position.y = 1.62;
  keeper.add(head);
  const hood = mark(new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.42, 8), mat.woodDark));
  hood.position.y = 1.90;
  keeper.add(hood);

  const route = [
    [-3.7, 1.55],
    [-0.8, 1.45],
    [2.7, 1.6],
    [0.9, -1.7]
  ];
  let routeIndex = 0;
  let keeperWait = 0;
  keeper.position.set(route[0][0], terrainY(route[0][0], route[0][1]), route[0][1]);

  root.updateWorldMatrix(true, true);
  curbBlocks.forEach(stone => addCollider(stone, 0.025));
  posts.forEach(post => addCollider(post, 0.05));
  addCollider(trough, 0.04);
  addCollider(bench, 0.04);

  let ordinarySeen = false;
  let loreStage = Number(localStorage.getItem('emptynet_old_watch_well_stage') || '0');
  let lastChatterSlot = -1;
  const nodeAware = () => localStorage.getItem('emptynet_node7_recognized') === '1';
  const cairnsKnown = () => localStorage.getItem('emptynet_three_cairns_counted') === '1';
  const tollKnown = () => Number(localStorage.getItem('emptynet_tollhouse_roll_stage') || '0') >= 3;

  function emit(text, lifespan = 14500) {
    if (typeof addFeed === 'function') addFeed(text, true, lifespan);
  }

  function updateLore(distance) {
    if (!ordinarySeen && distance < 24) {
      ordinarySeen = true;
      emit('A covered road well stands below the Old Watch. The trough is fresh-scrubbed and the rope smells of wet iron.', 14000);
    }

    if (!(nodeAware() && cairnsKnown() && tollKnown()) || loreStage >= 4) return;
    if (distance < 12 && loreStage < 1) {
      loreStage = 1;
      localStorage.setItem('emptynet_old_watch_well_stage', '1');
      emit('The crank carries seven depth collars. Six are black iron. The last is brass, polished by use.', 17000);
    }
    if (distance < 7.0 && loreStage < 2) {
      loreStage = 2;
      localStorage.setItem('emptynet_old_watch_well_stage', '2');
      emit('A maintenance tally claims the bucket reaches water at eighteen fathoms. A second hand has written: “rope paid out to twenty-four.”', 20000);
    }
    if (distance < 4.3 && loreStage < 3) {
      loreStage = 3;
      localStorage.setItem('emptynet_old_watch_well_stage', '3');
      emit('Beside the twenty-first fathom mark: “six knocks from below. Waited. One knock from the Watch.”', 22000);
    }
    if (distance < 2.6 && loreStage < 4) {
      loreStage = 4;
      localStorage.setItem('emptynet_old_watch_well_stage', '4');
      localStorage.setItem('emptynet_old_watch_well_heard', '1');
      emit('The hanging bucket shifts without wind. Far beneath the water: six slow impacts, then silence.', 24000);
    }
  }

  function updateKeeper(dt, elapsed) {
    if (keeperWait > 0) {
      keeperWait -= dt;
    } else {
      const [tx, tz] = route[routeIndex];
      const dx = tx - keeper.position.x;
      const dz = tz - keeper.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.10) {
        routeIndex = (routeIndex + 1) % route.length;
        keeperWait = 4.0 + routeIndex * 1.6;
      } else {
        const step = Math.min(d, dt * 0.46);
        keeper.position.x += dx / d * step;
        keeper.position.z += dz / d * step;
        keeper.position.y = terrainY(keeper.position.x, keeper.position.z);
        keeper.rotation.y = Math.atan2(dx, dz);
      }
    }

    const slot = Math.floor(elapsed / 52);
    const p = localToWorld(keeper.position.x, keeper.position.z);
    const playerDistance = Math.hypot(p.x - camera.position.x, p.z - camera.position.z);
    if (playerDistance < 30 && slot !== lastChatterSlot) {
      lastChatterSlot = slot;
      const lines = [
        'Derren scrapes mineral scale from the trough and throws it into the weeds.',
        'Derren checks the rope fibers: “Blackpine carts pull hard on this well after the climb.”',
        'Derren turns the crank twice and listens. “Old wells talk. Mostly it is stone settling.”',
        'Derren taps the brass collar. “Last depth mark. My grandfather swore the well was deeper before the road sank.”'
      ];
      emit(lines[slot % lines.length], 12500);
    }
  }

  const clock = new THREE.Clock();
  let lastTime = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    const dx = SITE.x - camera.position.x;
    const dz = SITE.z - camera.position.z;
    const distanceSq = dx * dx + dz * dz;
    root.visible = distanceSq < ACTIVE_DISTANCE * ACTIVE_DISTANCE;
    if (!root.visible) return;

    const elapsed = clock.getElapsedTime();
    updateKeeper(dt, elapsed);
    updateLore(Math.sqrt(distanceSq));

    // Small deterministic motion keeps the working well alive without creating
    // multiplayer state: bucket and water move identically for every client.
    bucket.position.y = wellY + 0.26 + Math.sin(elapsed * 0.33) * 0.018;
    rope.scale.y = 1 + Math.sin(elapsed * 0.33) * 0.004;
    water.rotation.y = elapsed * 0.025;
    crank.rotation.x = Math.sin(elapsed * 0.08) * 0.012;
  }
  requestAnimationFrame(frame);
}

if (window.EMPTYNET_WORLD_API) install(window.EMPTYNET_WORLD_API);
window.addEventListener('emptynet:world-ready', event => install(event.detail), { once: true });
