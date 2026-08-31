import * as THREE from 'three';

// The current Old Watch keeper lives close enough to maintain the road and lamp,
// but understands the Watch as an old local landmark rather than an anomaly.
// A deeper clue is gated behind the existing Seven Watches discovery chain.
const SITE = { x: 605, z: -407 };
const ACTIVE_DISTANCE = 430;
let installed = false;

function install(api) {
  if (installed || !api?.scene || !api?.camera || !api?.terrainHeight || !Array.isArray(api?.colliders)) return;
  installed = true;

  const { scene, camera, terrainHeight, colliders, addFeed } = api;
  const root = new THREE.Group();
  root.name = 'EMPTYNET_Old_Watch_Keeper_Cottage';
  root.position.set(SITE.x, terrainHeight(SITE.x, SITE.z), SITE.z);
  root.rotation.y = -0.26;
  scene.add(root);

  const mat = {
    stone: new THREE.MeshStandardMaterial({ color: 0x4b504b, roughness: 1 }),
    stoneDark: new THREE.MeshStandardMaterial({ color: 0x303531, roughness: 1 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x4a3828, roughness: 0.98 }),
    woodDark: new THREE.MeshStandardMaterial({ color: 0x2d251e, roughness: 1 }),
    plaster: new THREE.MeshStandardMaterial({ color: 0x77766a, roughness: 1 }),
    roof: new THREE.MeshStandardMaterial({ color: 0x3b3832, roughness: 1 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x252826, roughness: 0.78, metalness: 0.22 }),
    brass: new THREE.MeshStandardMaterial({ color: 0x74653c, roughness: 0.62, metalness: 0.30 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x545a51, roughness: 1 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xaa876d, roughness: 1 }),
    ember: new THREE.MeshStandardMaterial({ color: 0x8d5837, emissive: 0x6d351c, emissiveIntensity: 0.65, roughness: 0.8 }),
    glass: new THREE.MeshStandardMaterial({ color: 0xd7c28b, emissive: 0x9d7438, emissiveIntensity: 0.35, transparent: true, opacity: 0.84, roughness: 0.28 })
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

  function addCollider(object, padding = 0.05) {
    object.updateWorldMatrix(true, true);
    colliders.push(new THREE.Box3().setFromObject(object).expandByScalar(padding));
  }

  // Cottage shell, seated to the actual terrain rather than an artificial flat pad.
  const baseY = terrainY(0, 0);
  const foundation = box(7.2, 0.58, 5.5, mat.stoneDark);
  foundation.position.set(0, baseY + 0.18, 0);
  root.add(foundation);

  const house = new THREE.Group();
  house.position.y = baseY;
  root.add(house);

  const rear = box(7.0, 2.9, 0.34, mat.plaster);
  rear.position.set(0, 1.72, -2.48);
  house.add(rear);
  const left = box(0.34, 2.9, 5.0, mat.plaster);
  left.position.set(-3.34, 1.72, 0);
  house.add(left);
  const right = left.clone();
  right.position.x = 3.34;
  house.add(right);
  const frontLeft = box(2.35, 2.9, 0.34, mat.plaster);
  frontLeft.position.set(-2.18, 1.72, 2.48);
  house.add(frontLeft);
  const frontRight = frontLeft.clone();
  frontRight.position.x = 2.18;
  house.add(frontRight);
  const lintel = box(2.0, 0.52, 0.34, mat.woodDark);
  lintel.position.set(0, 2.92, 2.48);
  house.add(lintel);

  // Exposed timber frame makes the cottage read as repaired rather than abandoned.
  for (const x of [-3.0, 0, 3.0]) {
    const timber = box(0.22, 3.0, 0.20, mat.woodDark);
    timber.position.set(x, 1.7, 2.67);
    house.add(timber);
  }
  const crossbeam = box(6.3, 0.20, 0.20, mat.woodDark);
  crossbeam.position.set(0, 2.40, 2.67);
  house.add(crossbeam);

  const roofA = box(4.3, 0.22, 6.3, mat.roof);
  roofA.position.set(-1.72, 3.78, 0);
  roofA.rotation.z = 0.50;
  house.add(roofA);
  const roofB = roofA.clone();
  roofB.position.x = 1.72;
  roofB.rotation.z = -0.50;
  house.add(roofB);

  const chimney = box(0.72, 2.4, 0.72, mat.stone);
  chimney.position.set(2.08, 4.30, -1.0);
  house.add(chimney);
  const chimneyCap = box(0.92, 0.18, 0.92, mat.stoneDark);
  chimneyCap.position.set(2.08, 5.48, -1.0);
  house.add(chimneyCap);

  // Porch and practical daily-life details.
  const porch = box(6.1, 0.22, 1.55, mat.wood);
  porch.position.set(0, terrainY(0, 3.05) + 0.36, 3.05);
  root.add(porch);
  const bench = box(2.25, 0.22, 0.58, mat.wood);
  bench.position.set(-1.95, terrainY(-1.95, 3.55) + 0.52, 3.55);
  root.add(bench);
  const table = box(1.45, 0.16, 0.90, mat.woodDark);
  table.position.set(1.78, terrainY(1.78, 3.42) + 0.82, 3.42);
  root.add(table);
  for (const x of [1.25, 2.31]) {
    const leg = box(0.13, 0.75, 0.13, mat.woodDark);
    leg.position.set(x, terrainY(x, 3.42) + 0.38, 3.42);
    root.add(leg);
  }

  // Keeper's lantern: a real world-space object using shared depth and lighting.
  const lantern = new THREE.Group();
  lantern.position.set(0.72, terrainY(0.72, 2.90) + 2.22, 2.90);
  root.add(lantern);
  const lanternFrame = box(0.38, 0.58, 0.38, mat.iron);
  lantern.add(lanternFrame);
  const lanternGlow = mark(new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), mat.glass));
  lanternGlow.position.y = -0.02;
  lantern.add(lanternGlow);
  const lanternHook = cyl(0.035, 0.035, 0.62, 8, mat.iron);
  lanternHook.position.y = 0.54;
  lantern.add(lanternHook);

  // Woodpile, rain barrel and herb patch anchor ordinary domestic life.
  for (let i = 0; i < 12; i++) {
    const log = cyl(0.12, 0.12, 1.15, 8, i % 3 === 0 ? mat.woodDark : mat.wood);
    log.rotation.z = Math.PI / 2;
    log.position.set(-4.05 + (i % 3) * 0.06, terrainY(-4.05, -1.45) + 0.18 + Math.floor(i / 3) * 0.22, -1.70 + (i % 3) * 0.28);
    root.add(log);
  }
  const barrel = cyl(0.46, 0.52, 1.18, 12, mat.woodDark);
  barrel.position.set(4.18, terrainY(4.18, -1.05) + 0.58, -1.05);
  root.add(barrel);
  for (let i = 0; i < 8; i++) {
    const herb = mark(new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.55, 6), mat.cloth));
    const hx = -4.3 + (i % 4) * 0.42;
    const hz = 1.35 + Math.floor(i / 4) * 0.45;
    herb.position.set(hx, terrainY(hx, hz) + 0.26, hz);
    root.add(herb);
  }

  // Seven old keeper notches in the lintel. Miren calls them storm tallies.
  for (let i = 0; i < 7; i++) {
    const notch = box(0.055, 0.31, 0.025, i === 6 ? mat.brass : mat.stoneDark);
    notch.position.set(-0.48 + i * 0.16, baseY + 2.95, 2.66);
    notch.rotation.z = (i - 3) * 0.018;
    root.add(notch);
  }

  // A small brass tally on the porch table is deliberately mundane until the
  // player has earned enough context from Node 7 and the Old Watch well.
  const tally = box(0.62, 0.055, 0.38, mat.brass);
  tally.position.set(1.78, table.position.y + 0.13, 3.42);
  tally.rotation.y = 0.08;
  root.add(tally);
  for (let i = 0; i < 7; i++) {
    const cut = box(0.035, 0.018, 0.19, mat.stoneDark);
    cut.position.set(1.56 + i * 0.073, tally.position.y + 0.035, 3.42);
    root.add(cut);
  }

  // Miren, the keeper. Her concerns are lamp oil, roof leaks and road traffic.
  const miren = new THREE.Group();
  miren.name = 'Miren_Old_Watch_Keeper';
  root.add(miren);
  const torso = cyl(0.34, 0.46, 1.16, 8, mat.cloth);
  torso.position.y = 0.80;
  miren.add(torso);
  const head = mark(new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), mat.skin));
  head.position.y = 1.61;
  miren.add(head);
  const cap = mark(new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.35, 8), mat.woodDark));
  cap.position.y = 1.88;
  miren.add(cap);

  const route = [
    [-1.7, 3.55],
    [0.7, 2.92],
    [4.0, -0.95],
    [-3.8, -1.55],
    [-4.0, 1.55]
  ];
  let routeIndex = 0;
  let wait = 0;
  miren.position.set(route[0][0], terrainY(route[0][0], route[0][1]), route[0][1]);

  root.updateWorldMatrix(true, true);
  addCollider(foundation, 0.06);
  addCollider(porch, 0.04);
  addCollider(bench, 0.04);
  addCollider(table, 0.03);
  addCollider(barrel, 0.04);
  addCollider(chimney, 0.04);

  let ordinarySeen = false;
  let loreStage = Number(localStorage.getItem('emptynet_keeper_cottage_stage') || '0');
  let lastChatterSlot = -1;

  const deepContext = () =>
    localStorage.getItem('emptynet_node7_recognized') === '1' &&
    localStorage.getItem('emptynet_three_cairns_counted') === '1' &&
    localStorage.getItem('emptynet_old_watch_well_heard') === '1' &&
    localStorage.getItem('emptynet_node7_well_answered') === '1';

  function emit(text, lifespan = 14500) {
    if (typeof addFeed === 'function') addFeed(text, true, lifespan);
  }

  function updateLore(distance) {
    if (!ordinarySeen && distance < 24) {
      ordinarySeen = true;
      emit('A keeper’s cottage crouches beside the Old Watch road. Split wood dries under the eaves; a brass lamp hangs ready by the door.', 14500);
    }
    if (!deepContext() || loreStage >= 4) return;
    if (distance < 11 && loreStage < 1) {
      loreStage = 1;
      localStorage.setItem('emptynet_keeper_cottage_stage', '1');
      emit('Seven narrow cuts mark the old door lintel. Six were packed with soot-black pitch; the seventh was capped in brass.', 18000);
    }
    if (distance < 6.0 && loreStage < 2) {
      loreStage = 2;
      localStorage.setItem('emptynet_keeper_cottage_stage', '2');
      emit('A brass watch tally lies among lamp receipts. Seven columns. The first six names have been hammered flat.', 19500);
    }
    if (distance < 3.5 && loreStage < 3) {
      loreStage = 3;
      localStorage.setItem('emptynet_keeper_cottage_stage', '3');
      emit('Only the seventh line survives: “kept above by order of the Lower House.” The ink is centuries older than the cottage.', 22000);
    }
    if (distance < 2.25 && loreStage < 4) {
      loreStage = 4;
      localStorage.setItem('emptynet_keeper_cottage_stage', '4');
      localStorage.setItem('emptynet_keeper_tally_found', '1');
      emit('Scratched under the tally: “Lowering is not burial. Do not let the Watch call it mercy.”', 25000);
    }
  }

  function updateMiren(dt, elapsed) {
    if (wait > 0) {
      wait -= dt;
    } else {
      const [tx, tz] = route[routeIndex];
      const dx = tx - miren.position.x;
      const dz = tz - miren.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.10) {
        routeIndex = (routeIndex + 1) % route.length;
        wait = 4.5 + routeIndex * 1.15;
      } else {
        const step = Math.min(d, dt * 0.43);
        miren.position.x += dx / d * step;
        miren.position.z += dz / d * step;
        miren.position.y = terrainY(miren.position.x, miren.position.z);
        miren.rotation.y = Math.atan2(dx, dz);
      }
    }

    const slot = Math.floor(elapsed / 56);
    const world = localToWorld(miren.position.x, miren.position.z);
    const playerDistance = Math.hypot(world.x - camera.position.x, world.z - camera.position.z);
    if (playerDistance < 30 && slot !== lastChatterSlot) {
      lastChatterSlot = slot;
      const lines = [
        'Miren oils the porch lantern. “Jory comes through late when the flour cart loses a wheel.”',
        'Miren presses a thumb into the roof seam. “Another wet week and I will need slate from Greyfold.”',
        'Miren glances toward the dark Watch. “No bell up there now. Hasn’t been one in my mother’s time.”',
        'Miren sorts receipts beside the brass tally. “Old keepers counted storms on everything. Superstitious lot.”',
        'Miren carries a bucket toward the herbs. “Derren keeps the well cleaner than the road deserves.”'
      ];
      emit(lines[slot % lines.length], 12800);
    }
  }

  const clock = new THREE.Clock();
  let lastFrame = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;
    const dx = SITE.x - camera.position.x;
    const dz = SITE.z - camera.position.z;
    const distanceSq = dx * dx + dz * dz;
    root.visible = distanceSq < ACTIVE_DISTANCE * ACTIVE_DISTANCE;
    if (!root.visible) return;

    const elapsed = clock.getElapsedTime();
    updateMiren(dt, elapsed);
    updateLore(Math.sqrt(distanceSq));
    mat.glass.emissiveIntensity = 0.30 + Math.sin(elapsed * 1.8) * 0.055;
    mat.ember.emissiveIntensity = 0.58 + Math.sin(elapsed * 2.1 + 1.2) * 0.08;
  }
  requestAnimationFrame(frame);
}

if (window.EMPTYNET_WORLD_API) install(window.EMPTYNET_WORLD_API);
window.addEventListener('emptynet:world-ready', event => install(event.detail), { once: true });
