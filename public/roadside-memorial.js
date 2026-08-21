import * as THREE from 'three';

// A mundane roadside memorial on the Blackpine / Old Watch route.
// Locals call it the Three Cairns and leave travel tokens for the dead.
const SITE = { x: 674, z: -448 };
const ACTIVE_DISTANCE = 420;
let installed = false;

function install(api) {
  if (installed || !api?.scene || !api?.camera || !api?.terrainHeight || !Array.isArray(api?.colliders)) return;
  installed = true;

  const { scene, camera, terrainHeight, colliders } = api;
  const root = new THREE.Group();
  root.name = 'EMPTYNET_Three_Cairns';
  root.position.set(SITE.x, terrainHeight(SITE.x, SITE.z), SITE.z);
  root.rotation.y = -0.28;
  scene.add(root);

  const stone = new THREE.MeshStandardMaterial({ color: 0x4d504a, roughness: 1 });
  const paleStone = new THREE.MeshStandardMaterial({ color: 0x67685f, roughness: 1 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x453426, roughness: 1 });
  const cloth = new THREE.MeshStandardMaterial({ color: 0x705b4d, roughness: 1, side: THREE.DoubleSide });
  const iron = new THREE.MeshStandardMaterial({ color: 0x242724, roughness: 0.82, metalness: 0.16 });

  const mark = mesh => { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; };
  const box = (w, h, d, mat) => mark(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat));

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

  root.updateWorldMatrix(true, true);
  cairns.forEach(cairn => colliders.push(new THREE.Box3().setFromObject(cairn).expandByScalar(0.04)));
  colliders.push(new THREE.Box3().setFromObject(rail).expandByScalar(0.03));

  const clock = new THREE.Clock();
  function frame() {
    requestAnimationFrame(frame);
    const dx = SITE.x - camera.position.x;
    const dz = SITE.z - camera.position.z;
    root.visible = dx * dx + dz * dz < ACTIVE_DISTANCE * ACTIVE_DISTANCE;
    if (!root.visible) return;
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
