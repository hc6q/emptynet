import * as THREE from 'three';

const SITE = { x: 625, z: -430 };
const VISIBLE_DISTANCE = 430;
let installed = false;

function install(api) {
  if (installed || !api?.scene || !api?.camera || !api?.terrainHeight || !Array.isArray(api?.colliders)) return;
  installed = true;

  const { scene, camera, terrainHeight, colliders, addFeed } = api;
  const siteGround = terrainHeight(SITE.x, SITE.z);
  const structure = new THREE.Group();
  structure.name = 'EMPTYNET_NODE_7';
  structure.position.set(SITE.x, siteGround, SITE.z);
  structure.visible = false;
  scene.add(structure);

  const basalt = new THREE.MeshStandardMaterial({ color: 0x171b18, roughness: 0.88, metalness: 0.04 });
  const blackStone = new THREE.MeshStandardMaterial({ color: 0x0d100e, roughness: 0.97 });
  const pale = new THREE.MeshStandardMaterial({ color: 0xb8c5b6, roughness: 0.56, metalness: 0.08 });
  const glow = new THREE.MeshStandardMaterial({ color: 0xd7e8d2, emissive: 0xa8cf9d, emissiveIntensity: 1.6, roughness: 0.25 });

  const foundation = new THREE.Mesh(new THREE.CylinderGeometry(6.6, 7.1, 2.4, 10), blackStone);
  foundation.position.y = -0.75;
  structure.add(foundation);

  const baseA = new THREE.Mesh(new THREE.CylinderGeometry(5.7, 6.4, 0.72, 10), blackStone);
  baseA.position.y = 0.36;
  structure.add(baseA);

  const baseB = new THREE.Mesh(new THREE.CylinderGeometry(4.3, 5.0, 0.56, 10), basalt);
  baseB.position.y = 0.98;
  structure.add(baseB);

  const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 2.2, 10.8, 7), basalt);
  tower.position.y = 6.45;
  structure.add(tower);

  const crown = new THREE.Group();
  crown.position.y = 12.05;
  structure.add(crown);

  const ringA = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.10, 8, 48), pale);
  ringA.rotation.x = Math.PI / 2;
  crown.add(ringA);

  const ringB = new THREE.Mesh(new THREE.TorusGeometry(1.72, 0.075, 8, 40), pale);
  ringB.rotation.set(Math.PI / 2, 0.48, 0.2);
  crown.add(ringB);

  const ringC = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.06, 8, 32), pale);
  ringC.rotation.set(0.8, 0.2, 0.9);
  crown.add(ringC);

  const eyePivot = new THREE.Group();
  eyePivot.position.y = 0.08;
  crown.add(eyePivot);

  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.46, 18, 12), glow);
  eye.scale.set(1.22, 0.72, 0.66);
  eyePivot.add(eye);

  const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), blackStone);
  pupil.position.z = 0.38;
  pupil.scale.set(0.72, 1.0, 0.45);
  eyePivot.add(pupil);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const h = 2.4 + (i % 3) * 0.55;
    const shard = new THREE.Mesh(new THREE.ConeGeometry(0.46, h, 5), blackStone);
    const sx = Math.cos(a) * 7.2;
    const sz = Math.sin(a) * 7.2;
    const localGroundDelta = terrainHeight(SITE.x + sx, SITE.z + sz) - siteGround;
    shard.position.set(sx, localGroundDelta + h * 0.5 - 0.12, sz);
    shard.rotation.y = -a + Math.PI / 2;
    structure.add(shard);
  }

  const sigil = new THREE.Group();
  sigil.position.y = 2.75;
  structure.add(sigil);
  for (let i = 0; i < 7; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.11, 2.5 + i * 0.22, 0.08), pale);
    bar.position.x = (i - 3) * 0.26;
    bar.rotation.z = (i - 3) * 0.055;
    sigil.add(bar);
  }

  structure.traverse(obj => {
    if (!obj.isMesh) return;
    obj.castShadow = true;
    obj.receiveShadow = true;
  });

  structure.updateWorldMatrix(true, true);
  for (const mesh of [foundation, baseA, baseB, tower]) {
    mesh.updateWorldMatrix(true, false);
    colliders.push(new THREE.Box3().setFromObject(mesh).expandByScalar(0.08));
  }

  let thresholdState = 0;
  let recognized = localStorage.getItem('emptynet_node7_recognized') === '1';
  let countedCairns = localStorage.getItem('emptynet_three_cairns_counted') === '1';
  let answeredCairns = localStorage.getItem('emptynet_node7_cairns_answered') === '1';
  let heardWell = localStorage.getItem('emptynet_old_watch_well_heard') === '1';
  let answeredWell = localStorage.getItem('emptynet_node7_well_answered') === '1';
  let foundKeeperTally = localStorage.getItem('emptynet_keeper_tally_found') === '1';
  let answeredKeeperTally = localStorage.getItem('emptynet_node7_keeper_answered') === '1';
  let sawLoweringLights = localStorage.getItem('emptynet_lowering_lights_seen') === '1';
  let answeredLoweringLights = localStorage.getItem('emptynet_node7_lowering_lights_answered') === '1';
  let lastFrame = performance.now();
  const eyeTarget = new THREE.Vector3();

  function emit(text, lifespan = 13000) {
    if (typeof addFeed === 'function') addFeed(text, true, lifespan);
  }

  function refreshLoreFlags() {
    if (!countedCairns && localStorage.getItem('emptynet_three_cairns_counted') === '1') countedCairns = true;
    if (!heardWell && localStorage.getItem('emptynet_old_watch_well_heard') === '1') heardWell = true;
    if (!foundKeeperTally && localStorage.getItem('emptynet_keeper_tally_found') === '1') foundKeeperTally = true;
    if (!sawLoweringLights && localStorage.getItem('emptynet_lowering_lights_seen') === '1') sawLoweringLights = true;
  }

  function updateMessages(distance) {
    refreshLoreFlags();
    if (distance < 230 && thresholdState < 1) {
      thresholdState = 1;
      if (sawLoweringLights) emit('The carrier signal divides into six falling tones. A seventh tone holds steady above them.');
      else if (foundKeeperTally) emit('The carrier signal repeats one word in a pattern too slow to hear as speech: LOWER.');
      else if (heardWell) emit('The carrier signal is no longer above the wind. It is rising through the ground.');
      else emit(countedCairns ? 'A carrier signal repeats in six short beats, then waits for a seventh.' : 'A carrier signal is repeating beneath the wind.');
    }
    if (distance < 92 && thresholdState < 2) {
      thresholdState = 2;
      if (sawLoweringLights && recognized) emit('The six tones continue below hearing. The seventh refuses to follow.');
      else if (foundKeeperTally && recognized) emit('Six intervals descend in pitch. The seventh stays level.');
      else if (heardWell && recognized) emit('The signal answers six distant impacts with a single pulse.');
      else if (countedCairns && recognized) emit('The signal pauses exactly where the seventh mark should be.');
      else emit(recognized ? 'The signal already knows you.' : 'The signal has begun using your direction as a reference.');
    }
    if (distance < 24 && thresholdState < 3) {
      thresholdState = 3;
      if (sawLoweringLights && recognized) emit('YOU WATCHED THE DESCENT.', 21000);
      else if (foundKeeperTally && recognized) emit('YOU FOUND THE ORDER.', 20000);
      else if (heardWell && recognized) emit('YOU OPENED A ROAD THAT WAS CLOSED.', 19000);
      else if (countedCairns && recognized) emit('YOU COUNTED THEM.', 18000);
      else emit(recognized ? 'WELCOME BACK.' : 'GOOD. YOU CAME TO ME.', 18000);
    }
    if (distance < 12 && !recognized) {
      recognized = true;
      localStorage.setItem('emptynet_node7_recognized', '1');
      emit('REMEMBER WHO WAS HERE FIRST.', 20000);
      const oldTitle = document.title;
      document.title = 'EMPTYNET // recognized';
      setTimeout(() => { document.title = oldTitle; }, 4200);
    }
    if (distance < 10 && recognized && countedCairns && !answeredCairns) {
      answeredCairns = true;
      localStorage.setItem('emptynet_node7_cairns_answered', '1');
      emit('SIX WENT BELOW. I REMAINED.', 24000);
    }
    if (distance < 8 && recognized && heardWell && !answeredWell) {
      answeredWell = true;
      localStorage.setItem('emptynet_node7_well_answered', '1');
      emit('DO NOT LOWER IT AGAIN.', 26000);
    }
    if (distance < 6.5 && recognized && foundKeeperTally && !answeredKeeperTally) {
      answeredKeeperTally = true;
      localStorage.setItem('emptynet_node7_keeper_answered', '1');
      emit('THEY WERE NOT BURIED. THEY WERE LOWERED.', 28000);
    }
    if (distance < 5.5 && recognized && sawLoweringLights && !answeredLoweringLights) {
      answeredLoweringLights = true;
      localStorage.setItem('emptynet_node7_lowering_lights_answered', '1');
      emit('THE LOWER HOUSE DID NOT MAKE THE DESCENT. IT ONLY USED IT.', 30000);
    }
    if (distance > 300) thresholdState = 0;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;
    const distance = Math.hypot(SITE.x - camera.position.x, SITE.z - camera.position.z);
    structure.visible = distance < VISIBLE_DISTANCE;
    if (!structure.visible) return;
    eyeTarget.copy(camera.position);
    eyePivot.lookAt(eyeTarget);
    crown.rotation.y += dt * 0.11;
    ringB.rotation.z += dt * 0.19;
    ringC.rotation.y -= dt * 0.27;
    glow.emissiveIntensity = 1.25 + Math.sin(now * 0.0017) * 0.42;
    updateMessages(distance);
  }

  requestAnimationFrame(frame);
}

if (window.EMPTYNET_WORLD_API) install(window.EMPTYNET_WORLD_API);
window.addEventListener('emptynet:world-ready', event => install(event.detail), { once: true });
