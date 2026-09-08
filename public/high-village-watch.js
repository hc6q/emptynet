import * as THREE from 'three';

// Two ordinary High Village watchkeepers make rounds between the village bell,
// orchard approach and toll road. Their phase is wall-clock deterministic so
// nearby clients see the same patrol without adding authoritative multiplayer state.
const ACTIVE_DISTANCE = 520;
const CYCLE_SECONDS = 420;
const ROUTES = [
  [
    { x: 1167, z: 1245 }, { x: 1184, z: 1229 }, { x: 1204, z: 1208 },
    { x: 1226, z: 1190 }, { x: 1242, z: 1178 }, { x: 1214, z: 1181 },
    { x: 1193, z: 1170 }, { x: 1178, z: 1195 }, { x: 1155, z: 1218 },
    { x: 1140, z: 1244 }, { x: 1167, z: 1245 }
  ],
  [
    { x: 1167, z: 1245 }, { x: 1141, z: 1261 }, { x: 1164, z: 1268 },
    { x: 1184, z: 1261 }, { x: 1193, z: 1242 }, { x: 1185, z: 1227 },
    { x: 1166, z: 1219 }, { x: 1146, z: 1221 }, { x: 1133, z: 1244 },
    { x: 1147, z: 1255 }, { x: 1167, z: 1245 }
  ]
];
let installed = false;

function install(api) {
  if (installed || !api?.scene || !api?.camera || !api?.terrainHeight || !Array.isArray(api?.colliders)) return;
  installed = true;

  const { scene, camera, terrainHeight, colliders, addFeed } = api;
  const root = new THREE.Group();
  root.name = 'EMPTYNET_High_Village_Watch';
  scene.add(root);

  const mat = {
    coatA: new THREE.MeshStandardMaterial({ color: 0x4f5c55, roughness: 1 }),
    coatB: new THREE.MeshStandardMaterial({ color: 0x665a49, roughness: 1 }),
    leather: new THREE.MeshStandardMaterial({ color: 0x3c3025, roughness: 1 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x4a3727, roughness: 1 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x252925, roughness: 0.75, metalness: 0.24 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xae8d70, roughness: 1 }),
    flame: new THREE.MeshStandardMaterial({ color: 0xe3a45a, emissive: 0xc8792f, emissiveIntensity: 1.65, roughness: 0.7 })
  };

  const mark = mesh => { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; };
  const cyl = (rt, rb, h, sides, material) => mark(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, sides), material));
  const box = (w, h, d, material) => mark(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material));

  function makeWatchkeeper(name, material) {
    const person = new THREE.Group();
    person.name = name;
    root.add(person);

    const torso = cyl(0.31, 0.43, 1.12, 8, material);
    torso.position.y = 0.78;
    person.add(torso);
    const head = mark(new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 7), mat.skin));
    head.position.y = 1.57;
    person.add(head);
    const hood = cyl(0.19, 0.31, 0.28, 8, mat.leather);
    hood.position.y = 1.78;
    person.add(hood);

    const staff = cyl(0.035, 0.045, 1.85, 6, mat.wood);
    staff.position.set(0.42, 0.92, 0.03);
    staff.rotation.z = -0.08;
    person.add(staff);

    const lantern = new THREE.Group();
    lantern.position.set(-0.38, 0.72, 0.08);
    person.add(lantern);
    const frame = box(0.26, 0.42, 0.26, mat.iron);
    lantern.add(frame);
    const flame = mark(new THREE.Mesh(new THREE.SphereGeometry(0.075, 7, 5), mat.flame));
    flame.scale.y = 1.45;
    flame.position.y = -0.02;
    lantern.add(flame);
    const light = new THREE.PointLight(0xf0aa58, 1.15, 10, 2.1);
    light.position.y = 0.05;
    lantern.add(light);

    const collider = new THREE.Box3();
    colliders.push(collider);
    return { person, lantern, flame, light, collider };
  }

  const keepers = [
    { ...makeWatchkeeper('Rusk_High_Village_Watch', mat.coatA), name: 'Rusk', route: ROUTES[0], offset: 0 },
    { ...makeWatchkeeper('Melin_High_Village_Watch', mat.coatB), name: 'Melin', route: ROUTES[1], offset: CYCLE_SECONDS / 2 }
  ];

  function routeLengths(route) {
    const lengths = [];
    let total = 0;
    for (let i = 0; i < route.length - 1; i++) {
      const a = route[i], b = route[i + 1];
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      lengths.push(len);
      total += len;
    }
    return { lengths, total };
  }
  keepers.forEach(k => Object.assign(k, routeLengths(k.route)));

  function sample(keeper, nowMs) {
    const raw = ((nowMs / 1000 + keeper.offset) % CYCLE_SECONDS + CYCLE_SECONDS) % CYCLE_SECONDS;
    const progress = raw / CYCLE_SECONDS;
    let target = progress * keeper.total;
    for (let i = 0; i < keeper.lengths.length; i++) {
      const len = keeper.lengths[i];
      if (target <= len || i === keeper.lengths.length - 1) {
        const a = keeper.route[i], b = keeper.route[i + 1];
        const t = Math.min(1, target / len);
        return {
          x: THREE.MathUtils.lerp(a.x, b.x, t),
          z: THREE.MathUtils.lerp(a.z, b.z, t),
          heading: Math.atan2(b.x - a.x, b.z - a.z),
          phase: raw
        };
      }
      target -= len;
    }
    return { ...keeper.route[0], heading: 0, phase: raw };
  }

  const remarks = [
    'Rusk checks a shutter latch and marks the loose hinge with a piece of chalk.',
    'Melin: “Nessa wants the orchard gate watched until the last cider barrels are in.”',
    'Rusk looks down the toll road. “Meret says the south ditch is holding water again.”',
    'Melin pauses by the bell. “Fox took two hens behind Pell’s house. That is tonight’s great emergency.”',
    'Rusk: “If Alwen comes up late with charcoal, leave the lower gate unbarred until he passes.”',
    'Melin cups the lantern from the wind and keeps walking without looking your way.'
  ];
  let remarkIndex = 0;
  let nextRemark = 0;
  let wasNear = false;

  function frame(now) {
    requestAnimationFrame(frame);
    const centerDx = camera.position.x - 1170;
    const centerDz = camera.position.z - 1230;
    const active = centerDx * centerDx + centerDz * centerDz < ACTIVE_DISTANCE * ACTIVE_DISTANCE;
    root.visible = active;
    if (!active) { wasNear = false; return; }

    let nearestSq = Infinity;
    keepers.forEach((keeper, index) => {
      const p = sample(keeper, Date.now());
      keeper.person.position.set(p.x, terrainHeight(p.x, p.z), p.z);
      keeper.person.rotation.y = p.heading;
      const gait = Math.sin((Date.now() * 0.008) + index * Math.PI) * 0.055;
      keeper.person.position.y += Math.abs(gait) * 0.22;
      keeper.lantern.rotation.z = gait;
      keeper.flame.scale.y = 1.35 + Math.sin(Date.now() * 0.017 + index) * 0.12;
      keeper.light.intensity = 1.05 + Math.sin(Date.now() * 0.013 + index * 2.1) * 0.13;
      keeper.person.updateWorldMatrix(true, true);
      keeper.collider.setFromObject(keeper.person).expandByScalar(0.025);

      const dx = camera.position.x - p.x;
      const dz = camera.position.z - p.z;
      nearestSq = Math.min(nearestSq, dx * dx + dz * dz);
    });

    const near = nearestSq < 18 * 18;
    if (near && !wasNear && typeof addFeed === 'function') {
      addFeed('Two village watchkeepers make separate rounds with hooded lanterns.', true, 9000);
      nextRemark = now + 5500;
    }
    if (near && now > nextRemark && typeof addFeed === 'function') {
      addFeed(remarks[remarkIndex % remarks.length], true, 11000);
      remarkIndex++;
      nextRemark = now + 33000;
    }
    wasNear = near;
  }

  requestAnimationFrame(frame);
}

if (window.EMPTYNET_WORLD_API) install(window.EMPTYNET_WORLD_API);
window.addEventListener('emptynet:world-ready', event => install(event.detail), { once: true });
