import * as THREE from 'three';

const ACTIVE_DISTANCE = 300;
const WORLD_SEED = 28031997;

const ZONES = [
  { id: 'greyfold', kind: 'chicken', x: -917, z: 998, count: 5, radiusX: 10, radiusZ: 8 },
  { id: 'high-village', kind: 'chicken', x: 1181, z: 1177, count: 4, radiusX: 9, radiusZ: 7 },
  { id: 'blackpine-road', kind: 'hare', x: 728, z: -548, count: 3, radiusX: 16, radiusZ: 11 },
  { id: 'old-watch', kind: 'crow', x: 624, z: -430, count: 3, radiusX: 18, radiusZ: 14 }
];

let installed = false;

function fract(value) {
  return value - Math.floor(value);
}

function hash(index, salt = 0) {
  return fract(Math.sin((index + WORLD_SEED * 0.0001 + salt * 17.17) * 91.345) * 47453.5453);
}

function mark(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function install(api) {
  if (installed || !api?.scene || !api?.camera || !api?.terrainHeight) return;
  installed = true;

  const { scene, camera, terrainHeight } = api;
  const root = new THREE.Group();
  root.name = 'EMPTYNET_Ambient_Fauna';
  scene.add(root);

  const darkFeather = new THREE.MeshStandardMaterial({ color: 0x252b27, roughness: 0.96, side: THREE.DoubleSide });
  const henBrown = new THREE.MeshStandardMaterial({ color: 0x765944, roughness: 0.98 });
  const henPale = new THREE.MeshStandardMaterial({ color: 0xa99572, roughness: 0.98 });
  const combRed = new THREE.MeshStandardMaterial({ color: 0x7f3328, roughness: 0.92 });
  const beakMat = new THREE.MeshStandardMaterial({ color: 0xb38b45, roughness: 0.92 });
  const hareMat = new THREE.MeshStandardMaterial({ color: 0x6a6255, roughness: 1 });
  const harePale = new THREE.MeshStandardMaterial({ color: 0x8a8171, roughness: 1 });

  const birdBodyGeo = new THREE.SphereGeometry(0.18, 7, 6);
  const birdHeadGeo = new THREE.SphereGeometry(0.11, 7, 6);
  const chickenBodyGeo = new THREE.SphereGeometry(0.24, 8, 7);
  const chickenHeadGeo = new THREE.SphereGeometry(0.13, 8, 7);
  const smallConeGeo = new THREE.ConeGeometry(0.055, 0.16, 5);
  const legGeo = new THREE.CylinderGeometry(0.018, 0.022, 0.24, 5);
  const hareBodyGeo = new THREE.SphereGeometry(0.27, 8, 7);
  const hareHeadGeo = new THREE.SphereGeometry(0.18, 8, 7);
  const earGeo = new THREE.CapsuleGeometry(0.045, 0.24, 3, 6);

  function makeChicken(seed) {
    const group = new THREE.Group();
    const feather = seed % 3 === 0 ? henPale : henBrown;

    const body = mark(new THREE.Mesh(chickenBodyGeo, feather));
    body.scale.set(0.90, 0.82, 1.18);
    body.position.y = 0.26;
    group.add(body);

    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.44, 0.26);
    group.add(headPivot);

    const head = mark(new THREE.Mesh(chickenHeadGeo, feather));
    headPivot.add(head);

    const beak = mark(new THREE.Mesh(smallConeGeo, beakMat));
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, -0.01, 0.15);
    headPivot.add(beak);

    const comb = mark(new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.10, 0.06), combRed));
    comb.position.set(0, 0.12, 0.01);
    headPivot.add(comb);

    const leftLeg = mark(new THREE.Mesh(legGeo, beakMat));
    leftLeg.position.set(-0.075, 0.08, 0.02);
    group.add(leftLeg);
    const rightLeg = leftLeg.clone();
    rightLeg.position.x = 0.075;
    group.add(rightLeg);

    const tail = mark(new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.30, 5), feather));
    tail.rotation.x = -Math.PI / 2;
    tail.position.set(0, 0.33, -0.34);
    group.add(tail);

    group.userData.headPivot = headPivot;
    group.userData.body = body;
    group.userData.leftLeg = leftLeg;
    group.userData.rightLeg = rightLeg;
    return group;
  }

  function makeHare() {
    const group = new THREE.Group();

    const body = mark(new THREE.Mesh(hareBodyGeo, hareMat));
    body.scale.set(0.86, 0.74, 1.20);
    body.position.y = 0.30;
    group.add(body);

    const head = mark(new THREE.Mesh(hareHeadGeo, hareMat));
    head.position.set(0, 0.42, 0.31);
    head.scale.set(0.86, 0.90, 1.02);
    group.add(head);

    const leftEar = mark(new THREE.Mesh(earGeo, harePale));
    leftEar.position.set(-0.075, 0.69, 0.26);
    leftEar.rotation.z = 0.08;
    group.add(leftEar);
    const rightEar = leftEar.clone();
    rightEar.position.x = 0.075;
    rightEar.rotation.z = -0.08;
    group.add(rightEar);

    const tail = mark(new THREE.Mesh(new THREE.SphereGeometry(0.105, 7, 6), harePale));
    tail.position.set(0, 0.31, -0.33);
    group.add(tail);

    group.userData.body = body;
    group.userData.leftEar = leftEar;
    group.userData.rightEar = rightEar;
    return group;
  }

  function makeCrow() {
    const group = new THREE.Group();

    const body = mark(new THREE.Mesh(birdBodyGeo, darkFeather));
    body.scale.set(0.80, 0.68, 1.55);
    group.add(body);

    const head = mark(new THREE.Mesh(birdHeadGeo, darkFeather));
    head.position.set(0, 0.04, 0.26);
    group.add(head);

    const beak = mark(new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.17, 4), darkFeather));
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.025, 0.39);
    group.add(beak);

    const wingGeo = new THREE.BufferGeometry();
    wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([
      0, 0, 0,
      0.74, 0.01, -0.12,
      0.12, 0.02, 0.26
    ], 3));
    wingGeo.computeVertexNormals();

    const leftWing = mark(new THREE.Mesh(wingGeo, darkFeather));
    group.add(leftWing);
    const rightWing = mark(new THREE.Mesh(wingGeo.clone(), darkFeather));
    rightWing.scale.x = -1;
    group.add(rightWing);

    const tail = mark(new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.30, 4), darkFeather));
    tail.rotation.x = -Math.PI / 2;
    tail.position.z = -0.34;
    group.add(tail);

    group.userData.leftWing = leftWing;
    group.userData.rightWing = rightWing;
    return group;
  }

  const zones = ZONES.map((spec, zoneIndex) => {
    const group = new THREE.Group();
    group.name = `EMPTYNET_Ambient_${spec.id}`;
    root.add(group);

    const agents = [];
    for (let i = 0; i < spec.count; i++) {
      const seed = zoneIndex * 31 + i * 7 + 1;
      const mesh = spec.kind === 'chicken' ? makeChicken(seed) : spec.kind === 'hare' ? makeHare() : makeCrow();
      mesh.scale.setScalar(0.88 + hash(seed, 1) * 0.22);
      group.add(mesh);
      agents.push({
        mesh,
        phase: hash(seed, 2) * Math.PI * 2,
        orbit: 0.58 + hash(seed, 3) * 0.42,
        speed: 0.80 + hash(seed, 4) * 0.40,
        lane: (hash(seed, 5) - 0.5) * 0.36,
        altitude: 3.8 + hash(seed, 6) * 3.6
      });
    }
    return { spec, group, agents };
  });

  function updateChicken(agent, spec, t) {
    const u = t * 0.085 * agent.speed + agent.phase;
    const x = spec.x + Math.cos(u) * spec.radiusX * agent.orbit + Math.sin(u * 0.41 + agent.phase) * 1.7;
    const z = spec.z + Math.sin(u * 0.82 + agent.lane) * spec.radiusZ * agent.orbit;
    const y = terrainHeight(x, z);

    const dx = -Math.sin(u) * spec.radiusX * agent.orbit;
    const dz = Math.cos(u * 0.82 + agent.lane) * spec.radiusZ * agent.orbit * 0.82;
    agent.mesh.position.set(x, y, z);
    agent.mesh.rotation.y = Math.atan2(dx, dz);

    const peckCycle = Math.sin(t * 1.9 * agent.speed + agent.phase * 3.1);
    const peck = peckCycle > 0.54 ? (peckCycle - 0.54) / 0.46 : 0;
    agent.mesh.userData.headPivot.rotation.x = peck * 1.10;
    agent.mesh.userData.headPivot.position.y = 0.44 - peck * 0.12;
    agent.mesh.userData.body.position.y = 0.26 + Math.sin(t * 3.2 + agent.phase) * 0.012;
    agent.mesh.userData.leftLeg.rotation.x = Math.sin(t * 4.4 * agent.speed + agent.phase) * 0.30;
    agent.mesh.userData.rightLeg.rotation.x = -agent.mesh.userData.leftLeg.rotation.x;
  }

  function updateHare(agent, spec, t) {
    const u = t * 0.12 * agent.speed + agent.phase;
    const x = spec.x + Math.cos(u) * spec.radiusX * agent.orbit + Math.sin(u * 0.33) * 2.4;
    const z = spec.z + Math.sin(u * 0.76 + agent.lane) * spec.radiusZ * agent.orbit;
    const ground = terrainHeight(x, z);
    const hopBase = Math.max(0, Math.sin(t * 1.55 * agent.speed + agent.phase));
    const hop = hopBase * hopBase * 0.42;

    const dx = -Math.sin(u) * spec.radiusX * agent.orbit;
    const dz = Math.cos(u * 0.76 + agent.lane) * spec.radiusZ * agent.orbit * 0.76;
    agent.mesh.position.set(x, ground + hop, z);
    agent.mesh.rotation.y = Math.atan2(dx, dz);
    agent.mesh.userData.body.scale.y = 0.74 - hop * 0.10;
    agent.mesh.userData.leftEar.rotation.x = Math.sin(t * 0.95 + agent.phase) * 0.12;
    agent.mesh.userData.rightEar.rotation.x = Math.sin(t * 0.91 + agent.phase + 0.4) * 0.10;
  }

  function updateCrow(agent, spec, t) {
    const u = t * 0.055 * agent.speed + agent.phase;
    const x = spec.x + Math.cos(u) * spec.radiusX * agent.orbit;
    const z = spec.z + Math.sin(u * 0.93 + agent.lane) * spec.radiusZ * agent.orbit;
    const ground = terrainHeight(x, z);
    const altitude = agent.altitude + Math.sin(t * 0.31 + agent.phase) * 1.1;

    const dx = -Math.sin(u) * spec.radiusX * agent.orbit;
    const dz = Math.cos(u * 0.93 + agent.lane) * spec.radiusZ * agent.orbit * 0.93;
    agent.mesh.position.set(x, ground + altitude, z);
    agent.mesh.rotation.y = Math.atan2(dx, dz);
    agent.mesh.rotation.z = Math.sin(t * 0.21 + agent.phase) * 0.10;

    const flap = Math.sin(t * 5.8 * agent.speed + agent.phase) * 0.68;
    agent.mesh.userData.leftWing.rotation.z = flap;
    agent.mesh.userData.rightWing.rotation.z = -flap;
  }

  let lastUpdate = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (now - lastUpdate < 30) return;
    lastUpdate = now;

    const t = Date.now() / 1000;
    let anythingVisible = false;

    for (const zone of zones) {
      const dx = zone.spec.x - camera.position.x;
      const dz = zone.spec.z - camera.position.z;
      const visible = dx * dx + dz * dz < ACTIVE_DISTANCE * ACTIVE_DISTANCE;
      zone.group.visible = visible;
      if (!visible) continue;
      anythingVisible = true;

      for (const agent of zone.agents) {
        if (zone.spec.kind === 'chicken') updateChicken(agent, zone.spec, t);
        else if (zone.spec.kind === 'hare') updateHare(agent, zone.spec, t);
        else updateCrow(agent, zone.spec, t);
      }
    }

    root.visible = anythingVisible;
  }

  requestAnimationFrame(frame);
}

if (window.EMPTYNET_WORLD_API) install(window.EMPTYNET_WORLD_API);
window.addEventListener('emptynet:world-ready', event => install(event.detail), { once: true });
