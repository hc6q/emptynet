import * as THREE from 'three';

// An ordinary road office on the southern High Village approach. Its surviving
// account books preserve a much older meaning that the present keeper dismisses
// as archaic survey language.
const SITE = { x: 1244, z: 1177 };
const ACTIVE_DISTANCE = 460;
let installed = false;

function install(api) {
  if (installed || !api?.scene || !api?.camera || !api?.terrainHeight || !Array.isArray(api?.colliders)) return;
  installed = true;

  const { scene, camera, terrainHeight, colliders, addFeed } = api;
  const root = new THREE.Group();
  root.name = 'EMPTYNET_High_Village_Tollhouse';
  root.position.set(SITE.x, terrainHeight(SITE.x, SITE.z), SITE.z);
  root.rotation.y = -0.18;
  scene.add(root);

  const mat = {
    stone: new THREE.MeshStandardMaterial({ color: 0x5b5d55, roughness: 1 }),
    stoneDark: new THREE.MeshStandardMaterial({ color: 0x3e413c, roughness: 1 }),
    plaster: new THREE.MeshStandardMaterial({ color: 0xa89e82, roughness: 1 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x4b3827, roughness: 0.98 }),
    woodDark: new THREE.MeshStandardMaterial({ color: 0x30251c, roughness: 1 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x292c29, roughness: 0.78, metalness: 0.22 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x666a59, roughness: 1 }),
    paper: new THREE.MeshStandardMaterial({ color: 0xb9aa83, roughness: 1 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xb09174, roughness: 1 })
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

  // Gatehouse shell: small enough to remain roadside infrastructure rather than a settlement.
  const houseY = terrainY(-3.2, 0.4);
  const foundation = box(6.6, 1.05, 5.4, mat.stoneDark);
  foundation.position.set(-3.2, houseY - 0.20, 0.4);
  root.add(foundation);

  const body = box(5.9, 2.8, 4.8, mat.plaster);
  body.position.set(-3.2, houseY + 1.42, 0.4);
  root.add(body);

  for (const [x, z] of [[-5.75, -1.65], [-0.65, -1.65], [-5.75, 2.45], [-0.65, 2.45]]) {
    const beam = box(0.18, 2.9, 0.18, mat.woodDark);
    beam.position.set(x, terrainY(x, z) + 1.42, z);
    root.add(beam);
  }

  const roofA = box(3.55, 0.22, 5.7, mat.woodDark);
  roofA.position.set(-4.55, houseY + 3.30, 0.4);
  roofA.rotation.z = 0.50;
  root.add(roofA);
  const roofB = roofA.clone();
  roofB.position.x = -1.85;
  roofB.rotation.z = -0.50;
  root.add(roofB);

  const door = box(1.05, 2.05, 0.13, mat.wood);
  door.position.set(-1.95, houseY + 1.03, 2.84);
  root.add(door);

  const shutter = box(1.25, 0.92, 0.12, mat.wood);
  shutter.position.set(-4.25, houseY + 1.65, 2.84);
  root.add(shutter);

  // Covered desk faces the road. The ledger is mundane physical scenery; the lore is
  // revealed through proximity only after the existing Node 7 chain was earned.
  const desk = box(2.4, 0.16, 0.92, mat.wood);
  desk.position.set(0.0, terrainY(0, 1.2) + 0.92, 1.2);
  root.add(desk);
  for (const x of [-0.92, 0.92]) {
    const leg = box(0.16, 0.90, 0.16, mat.woodDark);
    leg.position.set(x, terrainY(x, 1.2) + 0.45, 1.2);
    root.add(leg);
  }

  const ledger = box(0.82, 0.06, 0.58, mat.paper);
  ledger.position.set(-0.28, desk.position.y + 0.12, 1.15);
  ledger.rotation.y = 0.08;
  root.add(ledger);
  const clasp = box(0.08, 0.04, 0.62, mat.iron);
  clasp.position.set(0.05, ledger.position.y + 0.04, 1.15);
  root.add(clasp);

  const coinCup = cyl(0.16, 0.13, 0.16, 10, mat.iron);
  coinCup.position.set(0.72, desk.position.y + 0.15, 1.16);
  root.add(coinCup);

  // Road barrier. Its raised position allows passage while still reading as a toll gate.
  const gateX = 4.0;
  const gateZ = 0.8;
  const gatePost = box(0.38, 2.25, 0.38, mat.woodDark);
  gatePost.position.set(gateX, terrainY(gateX, gateZ) + 1.05, gateZ);
  root.add(gatePost);
  const armPivot = new THREE.Group();
  armPivot.position.set(gateX, terrainY(gateX, gateZ) + 1.75, gateZ);
  armPivot.rotation.z = 0.78;
  root.add(armPivot);
  const arm = box(6.0, 0.20, 0.20, mat.wood);
  arm.position.x = 2.85;
  armPivot.add(arm);
  const counterweight = box(0.75, 0.55, 0.55, mat.stoneDark);
  counterweight.position.x = -0.48;
  armPivot.add(counterweight);

  // Old milestone beside the gate: seven shallow bars are locally explained as an obsolete tariff mark.
  const milestone = box(0.85, 1.38, 0.48, mat.stone);
  milestone.position.set(5.45, terrainY(5.45, -1.1) + 0.63, -1.1);
  milestone.rotation.z = -0.035;
  root.add(milestone);
  for (let i = 0; i < 7; i++) {
    const cut = box(0.055, 0.36 + i * 0.025, 0.025, mat.stoneDark);
    cut.position.set(5.45 + (i - 3) * 0.095, milestone.position.y + 0.08, -0.848);
    root.add(cut);
  }

  // Scale and freight details make the place part of the regional economy.
  const scaleBeam = box(2.7, 0.12, 0.12, mat.woodDark);
  scaleBeam.position.set(1.8, terrainY(1.8, -2.2) + 1.62, -2.2);
  root.add(scaleBeam);
  const scalePost = box(0.18, 2.1, 0.18, mat.woodDark);
  scalePost.position.set(1.8, terrainY(1.8, -2.2) + 0.95, -2.2);
  root.add(scalePost);
  for (const x of [0.72, 2.88]) {
    const pan = cyl(0.42, 0.34, 0.08, 12, mat.iron);
    pan.position.set(x, terrainY(x, -2.2) + 0.56, -2.2);
    root.add(pan);
  }
  for (let i = 0; i < 4; i++) {
    const sack = box(0.62, 0.72, 0.46, mat.cloth);
    const x = -5.0 + (i % 2) * 0.68;
    const z = -2.1 - Math.floor(i / 2) * 0.50;
    sack.position.set(x, terrainY(x, z) + 0.34, z);
    sack.rotation.y = i * 0.29;
    root.add(sack);
  }

  // Meret, the toll keeper. She works a loop between the desk, gate and scale and does not track the player.
  const keeper = new THREE.Group();
  keeper.name = 'Meret_High_Village';
  root.add(keeper);
  const torso = cyl(0.38, 0.48, 1.20, 8, mat.cloth);
  torso.position.y = 0.82;
  keeper.add(torso);
  const head = mark(new THREE.Mesh(new THREE.SphereGeometry(0.30, 12, 8), mat.skin));
  head.position.y = 1.66;
  keeper.add(head);
  const cap = mark(new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.36, 8), mat.woodDark));
  cap.position.y = 1.92;
  keeper.add(cap);

  const route = [
    [-0.2, 2.0],
    [3.25, 1.25],
    [2.0, -1.75],
    [-0.8, 0.55]
  ];
  let routeIndex = 0;
  let keeperWait = 0;
  keeper.position.set(route[0][0], terrainY(route[0][0], route[0][1]), route[0][1]);

  root.updateWorldMatrix(true, true);
  for (const solid of [foundation, body, door, desk, gatePost, milestone, scalePost]) addCollider(solid, 0.06);

  let ordinarySeen = false;
  let loreStage = Number(localStorage.getItem('emptynet_tollhouse_roll_stage') || '0');
  const nodeAware = () => localStorage.getItem('emptynet_node7_recognized') === '1';
  const cairnsKnown = () => localStorage.getItem('emptynet_three_cairns_counted') === '1';
  const bellEcho = () => localStorage.getItem('emptynet_greyfold_bell_buried_echo') === '1';
  let lastChatterSlot = -1;

  function emit(text, lifespan = 14500) {
    if (typeof addFeed === 'function') addFeed(text, true, lifespan);
  }

  function updateLore(distance) {
    if (!ordinarySeen && distance < 22) {
      ordinarySeen = true;
      emit('A tollhouse keeps the southern High Village road. Flour, charcoal and cider are weighed here before the climb.', 13000);
    }

    if (!(nodeAware() && cairnsKnown()) || loreStage >= 3) return;
    if (distance < 11 && loreStage < 1) {
      loreStage = 1;
      localStorage.setItem('emptynet_tollhouse_roll_stage', '1');
      emit('An older tax roll lies beneath the current ledger. Its margins use the same seven-stroke mark as the cairn stone.', 17000);
    }
    if (distance < 6.5 && loreStage < 2) {
      loreStage = 2;
      localStorage.setItem('emptynet_tollhouse_roll_stage', '2');
      emit('One line survives: “Seven Watches assessed. Six remitted after the Lowering.” No place names follow.', 19000);
    }
    if (distance < 3.3 && loreStage < 3) {
      loreStage = 3;
      localStorage.setItem('emptynet_tollhouse_roll_stage', '3');
      const suffix = bellEcho() ? ' A later hand adds: “Do not collect from the seventh. It hears the buried toll.”' : ' A later hand adds: “Do not collect from the seventh.”';
      emit(`The final entry is written in another hand.${suffix}`, 24000);
    }
  }

  function updateKeeper(dt, elapsed) {
    if (keeperWait > 0) {
      keeperWait -= dt;
      return;
    }
    const [tx, tz] = route[routeIndex];
    const dx = tx - keeper.position.x;
    const dz = tz - keeper.position.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.10) {
      routeIndex = (routeIndex + 1) % route.length;
      keeperWait = 4.5 + routeIndex * 1.8;
      return;
    }
    const step = Math.min(d, dt * 0.48);
    keeper.position.x += dx / d * step;
    keeper.position.z += dz / d * step;
    keeper.position.y = terrainY(keeper.position.x, keeper.position.z);
    keeper.rotation.y = Math.atan2(dx, dz);

    const slot = Math.floor(elapsed / 48);
    const playerDistance = Math.hypot((SITE.x + keeper.position.x) - camera.position.x, (SITE.z + keeper.position.z) - camera.position.z);
    if (playerDistance < 30 && slot !== lastChatterSlot) {
      lastChatterSlot = slot;
      const lines = [
        'Meret checks a charcoal basket twice, then scratches a figure into the day book.',
        'Meret mutters that Hale’s flour sacks are easier to weigh than Alwen’s charcoal.',
        'Meret oils the gate hinge and complains that cider carts arrive after dusk.',
        'Meret taps the old milestone: “Seven bars. Old tariff mark, they say. Nobody charges by it now.”'
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
    armPivot.rotation.z = 0.78 + Math.sin(elapsed * 0.16) * 0.012;
  }
  requestAnimationFrame(frame);
}

if (window.EMPTYNET_WORLD_API) install(window.EMPTYNET_WORLD_API);
window.addEventListener('emptynet:world-ready', event => install(event.detail), { once: true });
