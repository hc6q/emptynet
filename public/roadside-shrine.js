import * as THREE from 'three';

const SITE = { x: 711, z: -486 };
const ACTIVE_DISTANCE = 380;
let installed = false;

function install(api) {
  if (installed || !api?.scene || !api?.camera || !api?.terrainHeight || !Array.isArray(api?.colliders)) return;
  installed = true;

  const { scene, camera, terrainHeight, colliders } = api;
  const root = new THREE.Group();
  root.name = 'EMPTYNET_Roadside_Shrine';
  scene.add(root);

  const stone = new THREE.MeshStandardMaterial({ color: 0x55564f, roughness: 1 });
  const darkStone = new THREE.MeshStandardMaterial({ color: 0x363a35, roughness: 1 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x4b3627, roughness: 1 });
  const wax = new THREE.MeshStandardMaterial({ color: 0xb4a57e, roughness: 0.9 });
  const ember = new THREE.MeshStandardMaterial({ color: 0xb66b32, emissive: 0x9a431b, emissiveIntensity: 1.15, roughness: 0.7 });
  const cloth = new THREE.MeshStandardMaterial({ color: 0x66594d, roughness: 1, side: THREE.DoubleSide });

  const ground = (x, z) => terrainHeight(x, z);
  const mark = mesh => { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; };
  const box = (w, h, d, mat) => mark(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat));

  const y = ground(SITE.x, SITE.z);
  root.position.set(SITE.x, y, SITE.z);
  root.rotation.y = -0.42;

  const base = box(2.7, 0.65, 2.15, stone);
  base.position.y = 0.18;
  root.add(base);

  const back = box(2.15, 2.65, 0.42, darkStone);
  back.position.set(0, 1.52, -0.63);
  root.add(back);

  const cap = box(2.55, 0.28, 0.78, stone);
  cap.position.set(0, 2.93, -0.63);
  cap.rotation.z = 0.025;
  root.add(cap);

  const shelf = box(1.72, 0.18, 0.62, wood);
  shelf.position.set(0, 1.18, -0.28);
  root.add(shelf);

  const marker = box(0.18, 1.16, 0.12, wood);
  marker.position.set(0, 2.02, -0.36);
  root.add(marker);
  const markerArm = box(0.76, 0.16, 0.12, wood);
  markerArm.position.set(0, 2.24, -0.36);
  root.add(markerArm);

  const rag = mark(new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.72), cloth));
  rag.position.set(0.31, 1.95, -0.285);
  rag.rotation.z = -0.12;
  root.add(rag);

  const flames = [];
  for (const [cx, cz, scale] of [[-0.48, -0.02, 1], [0.08, -0.02, 0.8], [0.52, -0.02, 0.65]]) {
    const candle = mark(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.34 * scale, 8), wax));
    candle.position.set(cx, 1.43 + 0.17 * (scale - 1), cz);
    root.add(candle);
    const flame = mark(new THREE.Mesh(new THREE.SphereGeometry(0.055, 7, 5), ember));
    flame.scale.set(0.72, 1.55, 0.72);
    flame.position.set(cx, candle.position.y + 0.22 * scale, cz);
    root.add(flame);
    flames.push(flame);
  }

  const bowl = mark(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.19, 0.16, 10), darkStone));
  bowl.position.set(-0.05, 0.62, 0.55);
  root.add(bowl);

  for (let i = 0; i < 5; i++) {
    const token = mark(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.025, 8), stone));
    token.rotation.x = Math.PI / 2;
    token.position.set(-0.48 + i * 0.22, 1.31, -0.01 + (i % 2) * 0.08);
    root.add(token);
  }

  const leaningPost = box(0.14, 1.6, 0.14, wood);
  leaningPost.position.set(1.65, 0.73, 0.45);
  leaningPost.rotation.z = -0.13;
  root.add(leaningPost);

  root.updateWorldMatrix(true, true);
  colliders.push(new THREE.Box3().setFromObject(base).expandByScalar(0.05));
  colliders.push(new THREE.Box3().setFromObject(back).expandByScalar(0.04));

  const clock = new THREE.Clock();
  function frame() {
    requestAnimationFrame(frame);
    const dx = SITE.x - camera.position.x;
    const dz = SITE.z - camera.position.z;
    root.visible = dx * dx + dz * dz < ACTIVE_DISTANCE * ACTIVE_DISTANCE;
    if (!root.visible) return;
    const t = clock.getElapsedTime();
    flames.forEach((flame, i) => {
      const pulse = 1 + Math.sin(t * (5.1 + i * 0.37) + i * 1.9) * 0.08;
      flame.scale.y = 1.55 * pulse;
      flame.scale.x = flame.scale.z = 0.72 / pulse;
    });
  }
  requestAnimationFrame(frame);
}

if (window.EMPTYNET_WORLD_API) install(window.EMPTYNET_WORLD_API);
window.addEventListener('emptynet:world-ready', event => install(event.detail), { once: true });
