import * as THREE from 'three';

// Corren keeps a small set of roadside lamps around Greyfold. The route is
// deterministic from wall clock time so nearby clients see the same ordinary
// evening routine without introducing new multiplayer or persistence state.
const ACTIVE_DISTANCE = 560;
const CYCLE_SECONDS = 360;
const LAMPS = [
  { x: -889, z: 931 }, { x: -906, z: 951 }, { x: -925, z: 970 },
  { x: -946, z: 989 }, { x: -970, z: 1009 }, { x: -995, z: 1025 }
];
let installed = false;

function install(api) {
  if (installed || !api?.scene || !api?.camera || !api?.terrainHeight || !Array.isArray(api?.colliders)) return;
  installed = true;

  const { scene, camera, terrainHeight, colliders, addFeed } = api;
  const root = new THREE.Group();
  root.name = 'EMPTYNET_Greyfold_Lamplighter';
  scene.add(root);

  const wood = new THREE.MeshStandardMaterial({ color: 0x4b3929, roughness: 1 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x292d2a, roughness: 0.82, metalness: 0.2 });
  const coat = new THREE.MeshStandardMaterial({ color: 0x56594f, roughness: 1 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xb08d70, roughness: 1 });
  const flameMat = new THREE.MeshStandardMaterial({ color: 0xe3a45a, emissive: 0xc97930, emissiveIntensity: 1.8, roughness: 0.7 });
  const mark = mesh => { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; };
  const box = (w, h, d, material) => mark(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material));
  const cyl = (rt, rb, h, sides, material) => mark(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, sides), material));

  const lamps = LAMPS.map((p, i) => {
    const g = new THREE.Group();
    g.name = `Greyfold_Road_Lamp_${i + 1}`;
    g.position.set(p.x, terrainHeight(p.x, p.z), p.z);
    root.add(g);

    const post = box(0.2, 2.7, 0.2, wood);
    post.position.y = 1.35;
    g.add(post);
    const arm = box(0.85, 0.12, 0.12, iron);
    arm.position.set(0.34, 2.45, 0);
    g.add(arm);
    const cage = box(0.34, 0.5, 0.34, iron);
    cage.position.set(0.68, 2.15, 0);
    g.add(cage);
    const flame = mark(new THREE.Mesh(new THREE.SphereGeometry(0.075, 7, 5), flameMat));
    flame.scale.y = 1.45;
    flame.position.set(0.68, 2.13, 0);
    g.add(flame);
    const light = new THREE.PointLight(0xf0aa58, 0, 13, 2.1);
    light.position.set(0.68, 2.2, 0);
    g.add(light);

    g.updateWorldMatrix(true, true);
    colliders.push(new THREE.Box3().setFromObject(post).expandByScalar(0.035));
    return { g, flame, light, lit: false };
  });

  const route = [...LAMPS, ...LAMPS.slice(0, -1).reverse()];
  const segmentLengths = [];
  let routeTotal = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const len = Math.hypot(route[i + 1].x - route[i].x, route[i + 1].z - route[i].z);
    segmentLengths.push(len);
    routeTotal += len;
  }

  const corren = new THREE.Group();
  corren.name = 'Corren_Greyfold_Lamplighter';
  root.add(corren);
  const torso = cyl(0.33, 0.44, 1.12, 8, coat);
  torso.position.y = 0.78;
  corren.add(torso);
  const head = mark(new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 7), skin));
  head.position.y = 1.58;
  corren.add(head);
  const cap = cyl(0.26, 0.32, 0.18, 8, iron);
  cap.position.y = 1.8;
  corren.add(cap);
  const pole = cyl(0.035, 0.045, 2.2, 6, wood);
  pole.position.set(0.42, 1.02, 0.02);
  pole.rotation.z = -0.09;
  corren.add(pole);
  const correnCollider = new THREE.Box3();
  colliders.push(correnCollider);

  function sampleRoute(nowMs) {
    const phase = (((nowMs / 1000) % CYCLE_SECONDS) + CYCLE_SECONDS) % CYCLE_SECONDS;
    let target = phase / CYCLE_SECONDS * routeTotal;
    for (let i = 0; i < segmentLengths.length; i++) {
      const len = segmentLengths[i];
      if (target <= len || i === segmentLengths.length - 1) {
        const a = route[i], b = route[i + 1];
        const t = Math.min(1, target / len);
        return {
          x: THREE.MathUtils.lerp(a.x, b.x, t),
          z: THREE.MathUtils.lerp(a.z, b.z, t),
          heading: Math.atan2(b.x - a.x, b.z - a.z),
          phase
        };
      }
      target -= len;
    }
    return { ...route[0], heading: 0, phase: 0 };
  }

  const remarks = [
    'Corren trims a lamp wick and shields it from the wind with one hand.',
    'Corren: “Edda says the north post smokes whenever the damp gets into the oil.”',
    'Corren taps the reservoir. “Vessa still owes me two jars of clean lamp oil.”',
    'Corren looks toward the bakehouse. “Elis leaves bread by the door if I finish after dark.”',
    'Corren checks the burial-road lamp twice, then moves on without ceremony.',
    'Corren mutters that Greyfold spends more on hinges and lamp glass than anyone admits.'
  ];
  let lastRemarkSlot = -1;

  function frame(now) {
    requestAnimationFrame(frame);
    const cx = camera.position.x + 944;
    const cz = camera.position.z - 980;
    const active = cx * cx + cz * cz < ACTIVE_DISTANCE * ACTIVE_DISTANCE;
    root.visible = active;
    if (!active) return;

    const worldSeconds = Date.now() / 1000;
    // A slow six-hour civic cycle: lamps are considered lit during the latter half.
    const evening = ((worldSeconds % 21600) + 21600) % 21600 > 10800;
    lamps.forEach((lamp, i) => {
      lamp.lit = evening;
      lamp.flame.visible = evening;
      lamp.light.intensity = evening && i % 2 === 0 ? 1.05 : 0;
      if (evening) {
        lamp.flame.scale.y = 1.35 + Math.sin(now * 0.017 + i * 1.7) * 0.12;
        if (lamp.light.intensity) lamp.light.intensity = 1.0 + Math.sin(now * 0.011 + i) * 0.12;
      }
    });

    const p = sampleRoute(Date.now());
    corren.position.set(p.x, terrainHeight(p.x, p.z), p.z);
    corren.rotation.y = p.heading;
    const gait = Math.sin(now * 0.008) * 0.045;
    corren.position.y += Math.abs(gait) * 0.18;
    pole.rotation.z = -0.09 + gait * 0.35;
    corren.updateWorldMatrix(true, true);
    correnCollider.setFromObject(corren).expandByScalar(0.025);

    const dist = Math.hypot(camera.position.x - p.x, camera.position.z - p.z);
    const slot = Math.floor(worldSeconds / 43);
    if (dist < 24 && slot !== lastRemarkSlot && typeof addFeed === 'function') {
      lastRemarkSlot = slot;
      addFeed(remarks[slot % remarks.length], false, 11000);
    }
  }

  requestAnimationFrame(frame);
}

if (window.EMPTYNET_WORLD_API) install(window.EMPTYNET_WORLD_API);
window.addEventListener('emptynet:world-ready', event => install(event.detail), { once: true });
