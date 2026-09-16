import * as THREE from 'three';

const WORLD_SEED = 28031997;
const ACTIVE_DISTANCE = 620;
const SITES = [
  { id: 'greyfold-west', x: -790, z: 895, rot: 0.42 },
  { id: 'east-road', x: 935, z: 380, rot: -0.64 },
  { id: 'high-village-south', x: 1110, z: 1040, rot: 0.18 }
];

let installed = false;
const fract = n => n - Math.floor(n);
const hash = (i, salt = 0) => fract(Math.sin((i + WORLD_SEED * 0.0001 + salt * 19.17) * 91.713) * 43758.5453);

function install(api) {
  if (installed || !api?.scene || !api?.camera || !api?.terrainHeight || !Array.isArray(api?.colliders)) return;
  installed = true;
  const { scene, camera, terrainHeight, colliders } = api;
  const root = new THREE.Group();
  root.name = 'EMPTYNET_Roadside_Weather';
  scene.add(root);

  const wood = new THREE.MeshStandardMaterial({ color: 0x5b4936, roughness: 1 });
  const darkWood = new THREE.MeshStandardMaterial({ color: 0x352b22, roughness: 1 });
  const cloth = new THREE.MeshStandardMaterial({ color: 0x7d7767, roughness: 1, side: THREE.DoubleSide });
  const paleCloth = new THREE.MeshStandardMaterial({ color: 0xa69c82, roughness: 1, side: THREE.DoubleSide });
  const stone = new THREE.MeshStandardMaterial({ color: 0x77766d, roughness: 1 });

  function mesh(geo, mat, parent, x, y, z) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  const installations = SITES.map((site, index) => {
    const group = new THREE.Group();
    group.name = `EMPTYNET_WeatherMarker_${site.id}`;
    group.position.set(site.x, terrainHeight(site.x, site.z), site.z);
    group.rotation.y = site.rot;
    root.add(group);

    const post = mesh(new THREE.CylinderGeometry(0.11, 0.14, 3.4, 7), wood, group, 0, 1.7, 0);
    const arm = mesh(new THREE.BoxGeometry(2.15, 0.12, 0.12), darkWood, group, 0.62, 3.18, 0);
    mesh(new THREE.CylinderGeometry(0.16, 0.20, 0.18, 7), stone, group, 0, 0.09, 0);

    const vanePivot = new THREE.Group();
    vanePivot.position.set(1.42, 3.10, 0);
    group.add(vanePivot);
    const stripCount = 3;
    const strips = [];
    for (let s = 0; s < stripCount; s++) {
      const strip = mesh(new THREE.PlaneGeometry(0.16, 1.15 - s * 0.12), s === 1 ? paleCloth : cloth, vanePivot, s * 0.18 - 0.18, -0.62, 0);
      strip.geometry.translate(0, -0.5, 0);
      strip.userData.phase = hash(index * 7 + s, 4) * Math.PI * 2;
      strips.push(strip);
    }

    const marker = mesh(new THREE.BoxGeometry(0.78, 0.46, 0.08), darkWood, group, -0.52, 2.35, 0);
    marker.rotation.z = (hash(index, 7) - 0.5) * 0.08;

    group.updateMatrixWorld(true);
    colliders.push(new THREE.Box3().setFromObject(post));
    colliders.push(new THREE.Box3().setFromObject(arm));

    return { site, group, vanePivot, strips, phase: hash(index, 11) * Math.PI * 2 };
  });

  let last = 0;
  function tick(ms) {
    requestAnimationFrame(tick);
    if (ms - last < 40) return;
    last = ms;
    const t = ms * 0.001;
    for (const item of installations) {
      const dx = camera.position.x - item.site.x;
      const dz = camera.position.z - item.site.z;
      const active = dx * dx + dz * dz < ACTIVE_DISTANCE * ACTIVE_DISTANCE;
      item.group.visible = active;
      if (!active) continue;

      // A slow seeded prevailing wind. It is deterministic and decorative only.
      const wind = Math.sin(t * 0.075 + item.phase) * 0.52 + Math.sin(t * 0.021 + item.phase * 2.3) * 0.28;
      item.vanePivot.rotation.y = wind * 0.72;
      for (let s = 0; s < item.strips.length; s++) {
        const strip = item.strips[s];
        const gust = Math.sin(t * (1.65 + s * 0.17) + strip.userData.phase) * 0.18;
        strip.rotation.x = -0.42 - Math.abs(wind) * 0.32 + gust;
        strip.rotation.z = wind * (0.18 + s * 0.035) + gust * 0.28;
      }
    }
  }
  requestAnimationFrame(tick);
}

if (window.EMPTYNET_WORLD_API) install(window.EMPTYNET_WORLD_API);
window.addEventListener('emptynet:world-ready', event => install(event.detail), { once: true });
