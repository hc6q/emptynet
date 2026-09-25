import * as THREE from 'three';

const SITE = { x: -438, z: 516 };
let installed = false;

function install(api) {
  if (installed || !api?.scene || !api?.camera || !api?.terrainHeight || !Array.isArray(api?.colliders)) return;
  installed = true;
  const root = new THREE.Group();
  root.name = 'EMPTYNET_Greyfold_Coopers_Yard';
  root.position.set(SITE.x, api.terrainHeight(SITE.x, SITE.z), SITE.z);
  root.rotation.y = -0.31;
  api.scene.add(root);

  const timber = new THREE.MeshStandardMaterial({ color: 0x5b422d, roughness: 1 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x292a28, roughness: 0.85 });
  const blockers = [];

  function box(x, y, z, sx, sy, sz, blocks = true) {
    const object = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), timber);
    object.position.set(x, y, z);
    object.castShadow = object.receiveShadow = true;
    root.add(object);
    if (blocks) blockers.push(object);
    return object;
  }

  for (const x of [-3, 3]) for (const z of [-1.5, 1.5]) box(x, 1.4, z, 0.2, 2.8, 0.2);
  box(0, 2.9, 0, 6.8, 0.14, 3.7);
  box(-0.5, 0.9, -0.6, 4.2, 0.22, 1.0);

  function vessel(x, z, scale = 1) {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5 * scale, 0.56 * scale, 1.15 * scale, 12), timber);
    body.position.set(x, 0.575 * scale, z);
    body.castShadow = body.receiveShadow = true;
    root.add(body);
    blockers.push(body);
    for (const y of [0.2, 0.95]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.53 * scale, 0.035 * scale, 6, 14), dark);
      ring.position.set(x, y * scale, z);
      root.add(ring);
    }
  }

  vessel(2.1, -0.6);
  vessel(2.9, 0.7, 0.9);
  vessel(-2.7, 1.1, 0.82);
  box(-2.1, 0.55, 2.1, 3.3, 0.14, 0.7);
  for (let i = 0; i < 8; i++) box(-3.3 + i * 0.32, 0.82, 2.1, 0.2, 0.06, 1.2, false);

  root.updateMatrixWorld(true);
  blockers.forEach((object) => api.colliders.push(new THREE.Box3().setFromObject(object).expandByScalar(0.03)));

  let last = 0;
  let wasNear = false;
  function tick(now) {
    requestAnimationFrame(tick);
    if (now - last < 40) return;
    last = now;
    const distance = Math.hypot(api.camera.position.x - SITE.x, api.camera.position.z - SITE.z);
    root.visible = distance < 620;
    const near = distance < 23;
    if (root.visible && near && !wasNear && api.addFeed) {
      api.addFeed("A cooper's yard stands beside the Greyfold road. Finished vessels are chalked for the dyehouse, the apiary and the Blackpine resin workers.");
    }
    wasNear = near;
  }
  requestAnimationFrame(tick);
}

if (window.EMPTYNET_WORLD_API) install(window.EMPTYNET_WORLD_API);
window.addEventListener('emptynet:world-ready', (event) => install(event.detail));
