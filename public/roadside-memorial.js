import * as THREE from 'three';

// A mundane roadside memorial on the Blackpine / Old Watch route.
// Locals call it the Three Cairns and leave travel tokens for the dead.
const SITE = { x: 674, z: -448 };
const ACTIVE_DISTANCE = 420;
let installed = false;

function install(api) {
  if (installed || !api?.scene || !api?.camera || !api?.terrainHeight || !Array.isArray(api?.colliders)) return;
  installed = true;

  const { scene, camera, terrainHeight, colliders, addFeed } = api;
  const root = new THREE.Group();
  root.name = 'EMPTYNET_Three_Cairns';
  root.position.set(SITE.x, terrainHeight(SITE.x, SITE.z), SITE.z);
  root.rotation.y = -0.28;
  scene.add(root);

  const stone = new THREE.MeshStandardMaterial({ color: 0x4d504a, roughness: 1 });
  const paleStone = new THREE.MeshStandardMaterial({ color: 0x67685f, roughness: 1 });
  const oldStone = new THREE.MeshStandardMaterial({ color: 0x353a36, roughness: 1 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x453426, roughness: 1 });
  const cloth = new THREE.MeshStandardMaterial({ color: 0x705b4d, roughness: 1, side: THREE.DoubleSide });
  const iron = new THREE.MeshStandardMaterial({ color: 0x242724, roughness: 0.82, metalness: 0.16 });

  const mark = mesh => { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; };
  const box = (w, h, d, mat) => mark(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat));

  function localTerrainY(localX, localZ) {
    const c = Math.cos(root.rotation.y);
    const s = Math.sin(root.rotation.y);
    const worldX = SITE.x + localX * c + localZ * s;
    const worldZ = SITE.z - localX * s + localZ * c;
    return terrainHeight(worldX, worldZ) - root.position.y;
  }

  function addCairn(x, z, scale, lean) {
    const cairn = new THREE.Group();
    cairn.position.set(x, 0, z);
    cairn.rotation.z = lean;
    root.add(cairn);
    const layers = [
      [0.72, 0.30, 0.58, 0.15],
      [0.58, 0.27, 0.47, 0.42],
      [0.44, 0.23, 0.38, 0.67],
      [0.31, 0.20, 0.28, 0.88]
    ];
    layers.forEach((v, i) => {
      const rock = mark(new THREE.Mesh(new THREE.DodecahedronGeometry(0.5, 0), i % 2 ? paleStone : stone));
      rock.scale.set(v[0] * scale, v[1] * scale, v[2] * scale);
      rock.position.y = v[3] * scale;
      rock.rotation.set(i * 0.19, i * 0.73 + x, i * 0.11);
      cairn.add(rock);
    });
    return cairn;
  }

  const cairns = [
    addCairn(-1.05, -0.15, 1.15, -0.025),
    addCairn(0.05, -0.42, 0.92, 0.018),
    addCairn(1.05, -0.08, 1.02, -0.012)
  ];

  const rail = box(3.25, 0.12, 0.12, wood);
  rail.position.set(0, 1.25, 0.58);
  rail.rotation.z = -0.035;
  root.add(rail);
  for (const x of [-1.35, 1.35]) {
    const post = box(0.14, 1.55, 0.14, wood);
    post.position.set(x, 0.67, 0.58);
    post.rotation.z = x < 0 ? 0.035 : -0.045;
    root.add(post);
  }

  // Strips are memorial cloth, not messages from an omniscient system.
  [-0.88, -0.31, 0.36, 0.91].forEach((x, i) => {
    const strip = mark(new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.58 + (i % 2) * 0.14), cloth));
    strip.position.set(x, 0.94, 0.64);
    strip.rotation.z = (i - 1.5) * 0.09;
    root.add(strip);
  });

  const cup = mark(new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.15, 0.18, 9), iron));
  cup.position.set(0.12, 0.12, 1.03);
  root.add(cup);

  // Deterministic offerings imply repeated ordinary visits along the road.
  const offerings = [
    [-0.56, 0.05, 0.95, 0.08],
    [-0.25, 0.04, 1.08, -0.17],
    [0.49, 0.05, 0.96, 0.24],
    [0.72, 0.04, 1.16, -0.06]
  ];
  offerings.forEach(([x, y, z, r], i) => {
    const token = mark(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.025, 8), i === 2 ? paleStone : stone));
    token.rotation.x = Math.PI / 2;
    token.rotation.z = r;
    token.position.set(x, y, z);
    root.add(token);
  });

  // Three shallow path stones visually connect the memorial to the nearby road.
  [[-0.9, 1.55], [0.05, 1.72], [0.92, 1.51]].forEach(([x, z], i) => {
    const step = mark(new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 0), stone));
    step.scale.set(1.15, 0.18, 0.78);
    step.position.set(x, 0.03, z);
    step.rotation.y = i * 0.42;
    root.add(step);
  });

  // The memorial was built around an older witness stone. Locals treat its cuts
  // as an obsolete road-prayer; only someone who has met Node 7 can recognize
  // that the surviving seventh mark matches the tower's sigil.
  const witnessZ = -1.02;
  const witness = box(1.42, 0.34, 0.50, oldStone);
  witness.position.set(0.02, localTerrainY(0.02, witnessZ) + 0.13, witnessZ);
  witness.rotation.x = -0.055;
  root.add(witness);

  const marks = new THREE.Group();
  marks.position.set(0.02, witness.position.y + 0.03, witnessZ + 0.257);
  root.add(marks);
  for (let i = 0; i < 7; i++) {
    const cut = box(0.055, 0.20, 0.018, paleStone);
    cut.position.x = (i - 3) * 0.16;
    marks.add(cut);
    if (i < 6) {
      const strike = box(0.12, 0.035, 0.020, oldStone);
      strike.position.set(cut.position.x, 0, 0.012);
      strike.rotation.z = (i % 2 ? -1 : 1) * 0.24;
      marks.add(strike);
    }
  }

  root.updateWorldMatrix(true, true);
  cairns.forEach(cairn => colliders.push(new THREE.Box3().setFromObject(cairn).expandByScalar(0.04)));
  colliders.push(new THREE.Box3().setFromObject(rail).expandByScalar(0.03));
  colliders.push(new THREE.Box3().setFromObject(witness).expandByScalar(0.03));

  const recognizedNode7 = localStorage.getItem('emptynet_node7_recognized') === '1';
  let loreState = localStorage.getItem('emptynet_three_cairns_counted') === '1' ? 3 : 0;
  let ordinarySeen = localStorage.getItem('emptynet_three_cairns_seen') === '1';

  function emit(text, lifespan = 15000) {
    if (typeof addFeed === 'function') addFeed(text, true, lifespan);
  }

  function updateLore(distance) {
    if (!ordinarySeen && distance < 16) {
      ordinarySeen = true;
      localStorage.setItem('emptynet_three_cairns_seen', '1');
      emit('Three cairns beside the road. Travelers have left coins, cloth and no names.', 12000);
    }
    if (!recognizedNode7 || loreState >= 3) return;
    if (distance < 13 && loreState < 1) {
      loreState = 1;
      emit('The low stone behind the cairns is older than the memorial. Seven cuts survive beneath the lichen.', 16000);
    }
    if (distance < 7 && loreState < 2) {
      loreState = 2;
      emit('Six cuts were struck through long ago. The seventh was deliberately left untouched.', 17000);
    }
    if (distance < 3.6 && loreState < 3) {
      loreState = 3;
      localStorage.setItem('emptynet_three_cairns_counted', '1');
      emit('Under the weathering: “THREE FOR THE ROAD. SIX FOR THE EARTH. ONE LEFT TO WATCH.” The last mark matches the black tower.', 22000);
    }
  }

  const clock = new THREE.Clock();
  function frame() {
    requestAnimationFrame(frame);
    const dx = SITE.x - camera.position.x;
    const dz = SITE.z - camera.position.z;
    const distanceSq = dx * dx + dz * dz;
    root.visible = distanceSq < ACTIVE_DISTANCE * ACTIVE_DISTANCE;
    if (!root.visible) return;
    updateLore(Math.sqrt(distanceSq));
    // Barely perceptible cloth movement. Deterministic, local and cheap.
    const t = clock.getElapsedTime();
    root.children.forEach((child, i) => {
      if (child.geometry?.type === 'PlaneGeometry') child.rotation.y = Math.sin(t * 0.55 + i * 1.7) * 0.045;
    });
  }
  requestAnimationFrame(frame);
}

if (window.EMPTYNET_WORLD_API) install(window.EMPTYNET_WORLD_API);
window.addEventListener('emptynet:world-ready', event => install(event.detail), { once: true });
