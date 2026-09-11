import * as THREE from 'three';

// A mundane courier route connecting Greyfold and High Village along the established east road.
// The courier and pack mule use absolute world coordinates, the shared terrain sampler and the
// primary scene. Their position is derived from wall-clock time so nearby clients see roughly the
// same journey without introducing new multiplayer or persistence state.
const ACTIVE_DISTANCE = 620;
const ROUTE_SECONDS = 1560;
const STOP_SECONDS = 34;
let installed = false;

const ROUTE = [
  { x: -944, z: 884, name: 'Greyfold' },
  { x: -901, z: 944 },
  { x: -828.94, z: 987.57, name: 'Greyfold east waypost' },
  { x: -520, z: 997 },
  { x: -180, z: 1002 },
  { x: 170, z: 1005 },
  { x: 520, z: 1008 },
  { x: 850, z: 1014 },
  { x: 1110, z: 1019 },
  { x: 1271.92, z: 1023.28, name: 'High Village waypost' },
  { x: 1242, z: 1090 },
  { x: 1205, z: 1168 },
  { x: 1168, z: 1230, name: 'High Village' }
];

function install(api) {
  if (installed || !api?.scene || !api?.camera || !api?.terrainHeight || !Array.isArray(api?.colliders)) return;
  installed = true;

  const { scene, camera, terrainHeight, colliders, addFeed } = api;
  const root = new THREE.Group();
  root.name = 'EMPTYNET_Greyfold_High_Village_Road_Courier';
  scene.add(root);

  const mat = {
    wood: new THREE.MeshStandardMaterial({ color: 0x5a402d, roughness: 1 }),
    woodDark: new THREE.MeshStandardMaterial({ color: 0x35281f, roughness: 1 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x282a27, roughness: 0.76, metalness: 0.24 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x596052, roughness: 1 }),
    clothDark: new THREE.MeshStandardMaterial({ color: 0x343a34, roughness: 1 }),
    leather: new THREE.MeshStandardMaterial({ color: 0x513929, roughness: 0.96 }),
    leatherDark: new THREE.MeshStandardMaterial({ color: 0x30251e, roughness: 1 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xb18d6c, roughness: 1 }),
    mule: new THREE.MeshStandardMaterial({ color: 0x62574a, roughness: 1 }),
    muleDark: new THREE.MeshStandardMaterial({ color: 0x3d3832, roughness: 1 }),
    paper: new THREE.MeshStandardMaterial({ color: 0xb9ad8d, roughness: 1 }),
    brass: new THREE.MeshStandardMaterial({ color: 0x8b7047, roughness: 0.72, metalness: 0.28 })
  };

  const mark = mesh => { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; };
  const box = (w, h, d, material) => mark(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material));
  const cyl = (rt, rb, h, sides, material) => mark(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, sides), material));

  function place(obj, x, z, yOffset = 0) {
    obj.position.set(x, terrainHeight(x, z) + yOffset, z);
    root.add(obj);
    return obj;
  }

  function addStaticCollider(obj, padding = 0) {
    obj.updateWorldMatrix(true, true);
    const collider = new THREE.Box3().setFromObject(obj);
    if (padding) collider.expandByScalar(padding);
    colliders.push(collider);
    return collider;
  }

  // Two modest delivery racks mark the endpoints. They are ordinary village infrastructure,
  // deliberately smaller than the existing wayfinding posts.
  function makeDeliveryRack(x, z, rotation, name) {
    const rack = new THREE.Group();
    rack.name = name;
    place(rack, x, z);
    rack.rotation.y = rotation;

    const postA = box(0.22, 2.0, 0.22, mat.woodDark); postA.position.set(-0.8, 1.0, 0); rack.add(postA);
    const postB = box(0.22, 2.0, 0.22, mat.woodDark); postB.position.set(0.8, 1.0, 0); rack.add(postB);
    const shelf = box(1.9, 0.18, 0.72, mat.wood); shelf.position.set(0, 1.15, 0); rack.add(shelf);
    const roof = box(2.25, 0.16, 1.0, mat.woodDark); roof.position.set(0, 2.0, 0); roof.rotation.z = 0.04; rack.add(roof);
    const hook = cyl(0.045, 0.045, 0.5, 7, mat.iron); hook.position.set(0.58, 1.55, 0.32); hook.rotation.x = Math.PI / 2; rack.add(hook);

    const parcel = box(0.7, 0.42, 0.48, mat.leather); parcel.position.set(-0.35, 1.47, 0); rack.add(parcel);
    const tieA = box(0.06, 0.44, 0.5, mat.paper); tieA.position.set(-0.35, 1.47, 0); rack.add(tieA);
    const tieB = box(0.72, 0.05, 0.5, mat.paper); tieB.position.set(-0.35, 1.47, 0); rack.add(tieB);

    addStaticCollider(postA, 0.03);
    addStaticCollider(postB, 0.03);
    addStaticCollider(shelf, 0.02);
    return rack;
  }

  const greyfoldRack = makeDeliveryRack(-950.5, 892.0, -0.38, 'Greyfold_Courier_Rack');
  const highVillageRack = makeDeliveryRack(1175.0, 1238.5, 0.58, 'High_Village_Courier_Rack');

  function makeMule() {
    const mule = new THREE.Group();
    mule.name = 'Bracken_Courier_Mule';

    const body = box(1.55, 0.85, 0.68, mat.mule); body.position.y = 1.18; mule.add(body);
    const chest = box(0.62, 0.92, 0.62, mat.mule); chest.position.set(0, 1.23, 0.58); mule.add(chest);
    const neck = cyl(0.24, 0.31, 0.92, 8, mat.mule); neck.position.set(0, 1.75, 0.72); neck.rotation.x = -0.28; mule.add(neck);
    const head = box(0.48, 0.52, 0.72, mat.muleDark); head.position.set(0, 2.12, 1.0); mule.add(head);
    const muzzle = box(0.38, 0.3, 0.5, mat.muleDark); muzzle.position.set(0, 1.98, 1.48); mule.add(muzzle);

    for (const x of [-0.34, 0.34]) {
      const ear = cyl(0.07, 0.13, 0.5, 7, mat.muleDark); ear.position.set(x, 2.52, 0.95); ear.rotation.z = x < 0 ? -0.18 : 0.18; mule.add(ear);
    }

    const legs = [];
    for (const [x, z] of [[-0.5, -0.43], [0.5, -0.43], [-0.5, 0.43], [0.5, 0.43]]) {
      const leg = cyl(0.10, 0.13, 1.05, 7, mat.muleDark); leg.position.set(x, 0.55, z); mule.add(leg); legs.push(leg);
      const hoof = box(0.24, 0.18, 0.33, mat.leatherDark); hoof.position.set(x, 0.08, z + 0.04); mule.add(hoof);
    }

    const tail = cyl(0.06, 0.09, 1.0, 7, mat.muleDark); tail.position.set(0, 1.25, -1.02); tail.rotation.x = 0.55; mule.add(tail);
    const blanket = box(1.2, 0.12, 0.88, mat.clothDark); blanket.position.set(0, 1.66, -0.05); mule.add(blanket);

    // Balanced mail panniers keep the silhouette readable from both sides of the road.
    for (const x of [-0.73, 0.73]) {
      const pannier = box(0.52, 0.72, 0.8, mat.leather); pannier.position.set(x, 1.38, -0.02); mule.add(pannier);
      const buckle = box(0.08, 0.24, 0.05, mat.brass); buckle.position.set(x + (x < 0 ? -0.27 : 0.27), 1.38, 0.18); mule.add(buckle);
    }

    root.add(mule);
    const collider = new THREE.Box3();
    colliders.push(collider);
    return { group: mule, collider, legs, tail };
  }

  function makeCourier() {
    const person = new THREE.Group();
    person.name = 'Iven_Road_Courier';

    const torso = cyl(0.31, 0.44, 1.2, 8, mat.cloth); torso.position.y = 0.82; person.add(torso);
    const head = mark(new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 7), mat.skin)); head.position.y = 1.62; person.add(head);
    const cap = cyl(0.22, 0.31, 0.26, 8, mat.clothDark); cap.position.y = 1.84; person.add(cap);
    const coat = box(0.82, 0.72, 0.28, mat.clothDark); coat.position.set(0, 0.82, -0.22); person.add(coat);
    const satchel = box(0.48, 0.55, 0.25, mat.leather); satchel.position.set(-0.43, 0.76, -0.02); person.add(satchel);
    const strap = box(0.07, 1.38, 0.06, mat.leatherDark); strap.position.set(-0.12, 1.05, 0.08); strap.rotation.z = -0.48; person.add(strap);
    const walkingStick = cyl(0.025, 0.035, 1.42, 6, mat.woodDark); walkingStick.position.set(0.48, 0.72, 0.10); walkingStick.rotation.z = -0.12; person.add(walkingStick);

    root.add(person);
    const collider = new THREE.Box3();
    colliders.push(collider);
    return { group: person, collider, walkingStick };
  }

  const mule = makeMule();
  const courier = makeCourier();

  const segmentLengths = [];
  let routeLength = 0;
  for (let i = 0; i < ROUTE.length - 1; i++) {
    const len = Math.hypot(ROUTE[i + 1].x - ROUTE[i].x, ROUTE[i + 1].z - ROUTE[i].z);
    segmentLengths.push(len);
    routeLength += len;
  }

  function sampleDistance(distance) {
    let target = THREE.MathUtils.clamp(distance, 0, routeLength);
    for (let i = 0; i < segmentLengths.length; i++) {
      const len = segmentLengths[i];
      if (target <= len || i === segmentLengths.length - 1) {
        const a = ROUTE[i];
        const b = ROUTE[i + 1];
        const t = len > 0 ? THREE.MathUtils.clamp(target / len, 0, 1) : 0;
        return {
          x: THREE.MathUtils.lerp(a.x, b.x, t),
          z: THREE.MathUtils.lerp(a.z, b.z, t),
          heading: Math.atan2(b.x - a.x, b.z - a.z),
          segment: i
        };
      }
      target -= len;
    }
    return { x: ROUTE[0].x, z: ROUTE[0].z, heading: 0, segment: 0 };
  }

  // Each half-cycle includes a short endpoint stop. The time function is deterministic and does
  // not accumulate floating point movement drift across long sessions.
  function sampleJourney(nowMs) {
    const half = ROUTE_SECONDS / 2;
    const phase = ((nowMs / 1000) % ROUTE_SECONDS + ROUTE_SECONDS) % ROUTE_SECONDS;
    const outward = phase < half;
    const local = outward ? phase : phase - half;
    const travelTime = half - STOP_SECONDS;
    const stopped = local >= travelTime;
    const t = stopped ? 1 : THREE.MathUtils.smootherstep(local / travelTime, 0, 1);
    const distance = outward ? routeLength * t : routeLength * (1 - t);
    const sample = sampleDistance(distance);
    if (!outward) sample.heading += Math.PI;
    return { ...sample, stopped, outward, endpoint: outward ? 'High Village' : 'Greyfold' };
  }

  const remarks = [
    'Iven checks the waxed flap on a mail pannier and tightens the strap without looking up.',
    'Iven: “Greyfold sends cloth, High Village sends lists. Somehow the lists are heavier.”',
    'Iven scratches Bracken behind one ear. “Easy. The east lane is drier than it was yesterday.”',
    'Iven: “Ansel has three slates coming from Greyfold. He wrote twice to make certain I remembered.”',
    'Iven: “Vessa wrapped a parcel for Nessa in oilcloth. Dye and cider seem to travel better than news.”',
    'Iven checks a folded route tally. “Meret wants toll notices carried both ways. Nobody wants to read them either way.”',
    'Iven: “If the windmill is turning when I reach Greyfold, Hale usually has flour waiting for the bakehouse.”',
    'Iven: “Rusk says the north ditch needs stones. Corren says it needs patience. I carry both opinions for free.”'
  ];
  let remarkIndex = 0;
  let nextRemark = 0;
  let wasNear = false;

  const endpointRemarks = {
    'Greyfold': 'Iven unloads a small bundle onto Greyfold’s courier rack, then checks the road east.',
    'High Village': 'Iven leaves two wrapped letters beneath the High Village rack roof and reties Bracken’s pannier.'
  };
  let lastEndpointKey = '';

  function frame(now) {
    requestAnimationFrame(frame);
    const p = sampleJourney(Date.now());
    const muleGround = terrainHeight(p.x, p.z);
    const speedBob = p.stopped ? 0 : Math.sin(Date.now() * 0.008) * 0.035;

    mule.group.position.set(p.x, muleGround + Math.abs(speedBob) * 0.13, p.z);
    mule.group.rotation.y = p.heading;
    mule.tail.rotation.x = 0.55 + Math.sin(Date.now() * 0.004) * 0.08;
    for (let i = 0; i < mule.legs.length; i++) {
      mule.legs[i].rotation.x = p.stopped ? 0 : Math.sin(Date.now() * 0.009 + i * Math.PI) * 0.16;
    }

    const side = p.outward ? -1 : 1;
    const sinH = Math.sin(p.heading);
    const cosH = Math.cos(p.heading);
    const behind = -1.35;
    const lateral = 0.95 * side;
    const cx = p.x + sinH * behind + cosH * lateral;
    const cz = p.z + cosH * behind - sinH * lateral;
    courier.group.position.set(cx, terrainHeight(cx, cz) + Math.abs(speedBob) * 0.08, cz);
    courier.group.rotation.y = p.heading;
    courier.walkingStick.rotation.z = -0.12 + (p.stopped ? 0 : Math.sin(Date.now() * 0.008 + 1.2) * 0.07);

    mule.group.updateWorldMatrix(true, true);
    courier.group.updateWorldMatrix(true, true);
    mule.collider.setFromObject(mule.group).expandByScalar(0.04);
    courier.collider.setFromObject(courier.group).expandByScalar(0.02);

    const cdx = camera.position.x - p.x;
    const cdz = camera.position.z - p.z;
    const nearCourier = cdx * cdx + cdz * cdz < ACTIVE_DISTANCE * ACTIVE_DISTANCE;
    mule.group.visible = nearCourier;
    courier.group.visible = nearCourier;

    // Endpoint infrastructure culls independently from the travelling pair.
    for (const rack of [greyfoldRack, highVillageRack]) {
      const dx = camera.position.x - rack.position.x;
      const dz = camera.position.z - rack.position.z;
      rack.visible = dx * dx + dz * dz < ACTIVE_DISTANCE * ACTIVE_DISTANCE;
    }

    const close = cdx * cdx + cdz * cdz < 20 * 20;
    if (close && !wasNear && typeof addFeed === 'function') {
      addFeed('A courier walks beside a loaded mule, keeping to the worn east road.', true, 9000);
      nextRemark = now + 4500;
    }
    if (close && now > nextRemark && typeof addFeed === 'function') {
      addFeed(remarks[remarkIndex % remarks.length], true, 11000);
      remarkIndex++;
      nextRemark = now + 33000;
    }
    wasNear = close;

    if (p.stopped && close && typeof addFeed === 'function') {
      const endpointKey = `${p.endpoint}:${Math.floor(Date.now() / (ROUTE_SECONDS * 500))}`;
      if (endpointKey !== lastEndpointKey) {
        addFeed(endpointRemarks[p.endpoint], true, 10500);
        lastEndpointKey = endpointKey;
      }
    }
  }

  requestAnimationFrame(frame);
}

if (window.EMPTYNET_WORLD_API) install(window.EMPTYNET_WORLD_API);
window.addEventListener('emptynet:world-ready', event => install(event.detail), { once: true });
