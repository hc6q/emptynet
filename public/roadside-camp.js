import * as THREE from 'three';

const CAMP = { x: 904, z: 342 };
const ACTIVE_DISTANCE = 560;
let installed = false;

function install(api) {
  if (installed || !api?.scene || !api?.camera || !api?.terrainHeight || !api?.colliders) return;
  installed = true;
  const { scene, camera, terrainHeight, colliders, addFeed } = api;
  const root = new THREE.Group();
  root.name = 'EMPTYNET_Roadside_Charcoal_Camp';
  scene.add(root);

  const wood = new THREE.MeshStandardMaterial({ color: 0x4b3829, roughness: 1 });
  const darkWood = new THREE.MeshStandardMaterial({ color: 0x29231d, roughness: 1 });
  const cloth = new THREE.MeshStandardMaterial({ color: 0x625b49, roughness: 1, side: THREE.DoubleSide });
  const stone = new THREE.MeshStandardMaterial({ color: 0x68665e, roughness: 1 });
  const ember = new THREE.MeshStandardMaterial({ color: 0x7b321b, emissive: 0x5b1609, emissiveIntensity: 1.5, roughness: 0.9 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x252727, roughness: 0.78, metalness: 0.45 });
  const skin = new THREE.MeshStandardMaterial({ color: 0x8a6d55, roughness: 1 });
  const coat = new THREE.MeshStandardMaterial({ color: 0x403d34, roughness: 1 });

  const y = terrainHeight(CAMP.x, CAMP.z);
  root.position.set(CAMP.x, y, CAMP.z);

  function mesh(geo, mat, x, yy, z, ry = 0) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, yy, z); m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; root.add(m); return m;
  }
  function boxCollider(m, pad = 0.04) {
    m.updateWorldMatrix(true, false);
    const b = new THREE.Box3().setFromObject(m).expandByScalar(pad);
    colliders.push(b); return b;
  }

  // Lean-to used by road crews and charcoal carriers: deliberately small and workmanlike.
  const postGeo = new THREE.CylinderGeometry(0.13, 0.16, 2.7, 6);
  const posts = [[-2.6,1.35,-1.8],[2.6,1.35,-1.8],[-2.6,1.35,1.8],[2.6,1.35,1.8]].map(p => mesh(postGeo, darkWood, ...p));
  const roof = mesh(new THREE.BoxGeometry(6.2, 0.13, 4.6), cloth, 0, 2.72, 0, -0.04);
  roof.rotation.z = -0.09;
  posts.forEach(p => boxCollider(p, 0.02));

  const bench = mesh(new THREE.BoxGeometry(3.3, 0.22, 0.55), wood, -0.45, 0.55, -1.15, 0.06);
  const benchLegA = mesh(new THREE.BoxGeometry(0.18, 0.95, 0.18), darkWood, -1.75, 0.26, -1.15);
  const benchLegB = mesh(new THREE.BoxGeometry(0.18, 0.95, 0.18), darkWood, 0.85, 0.26, -1.15);
  [bench, benchLegA, benchLegB].forEach(m => boxCollider(m));

  // Fire ring is world geometry; stones block movement, embers do not.
  const fire = new THREE.Group(); fire.position.set(0.7, 0.08, 0.65); root.add(fire);
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2;
    const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), stone);
    s.position.set(Math.cos(a) * 0.7, 0.13, Math.sin(a) * 0.7); s.scale.y = 0.65; s.castShadow = true; s.receiveShadow = true; fire.add(s);
    s.updateWorldMatrix(true, false);
    colliders.push(new THREE.Box3().setFromObject(s).expandByScalar(0.015));
  }
  const coals = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.52, 0.08, 10), ember); coals.position.y = 0.08; fire.add(coals);
  const fireLight = new THREE.PointLight(0xd97838, 1.15, 10, 2); fireLight.position.set(0, 1.05, 0); fire.add(fireLight);

  // Mundane evidence of travel: stacked charcoal sacks, kettle, split wood and a drying line.
  for (let i = 0; i < 4; i++) {
    const sack = mesh(new THREE.SphereGeometry(0.43, 7, 6), cloth, -2.0 + (i % 2) * 0.72, 0.37 + Math.floor(i / 2) * 0.52, 0.85 + (i % 2) * 0.08);
    sack.scale.set(0.75, 1.05, 0.55);
  }
  const kettle = mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.42, 8), iron, 0.15, 0.43, 0.62);
  boxCollider(kettle, 0.01);
  for (let i = 0; i < 7; i++) {
    const log = mesh(new THREE.CylinderGeometry(0.10, 0.13, 1.5, 6), wood, -2.0 + i * 0.22, 0.20 + (i % 2) * 0.12, -0.25, Math.PI / 2 + 0.12 * (i % 3));
    log.rotation.z = Math.PI / 2;
  }
  const lineA = mesh(new THREE.CylinderGeometry(0.055, 0.07, 2.2, 5), darkWood, -2.35, 1.1, 1.55);
  const lineB = mesh(new THREE.CylinderGeometry(0.055, 0.07, 2.2, 5), darkWood, 2.2, 1.1, 1.55);
  boxCollider(lineA, 0.01); boxCollider(lineB, 0.01);
  const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-2.35,2.02,1.55), new THREE.Vector3(2.2,2.02,1.55)]);
  root.add(new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0x746e5e })));
  [-1.3,-0.35,0.7].forEach((x,i) => { const rag = mesh(new THREE.PlaneGeometry(0.55,0.72), cloth, x,1.66,1.55); rag.rotation.y = 0.04 * i; });

  function makePerson() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.82, 4, 7), coat); body.position.y = 1.0; body.castShadow = true; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 8, 7), skin); head.position.y = 1.77; head.castShadow = true; g.add(head);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.24,0.12,8), darkWood); cap.position.y = 1.94; g.add(cap);
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.52,0.65,0.28), cloth); pack.position.set(0,1.08,-0.31); pack.castShadow = true; g.add(pack);
    return g;
  }

  const traveler = makePerson(); traveler.name = 'Perrin'; root.add(traveler);
  const travelerCollider = new THREE.Box3(); colliders.push(travelerCollider);
  const route = [new THREE.Vector2(-1.65,-0.85),new THREE.Vector2(0.0,-0.7),new THREE.Vector2(1.55,0.1),new THREE.Vector2(1.3,1.25),new THREE.Vector2(-0.8,1.1)];
  const lines = [
    'Perrin: Blackpine sent too much charcoal again. High Village will buy it before the rain does.',
    'Perrin: Iven said the east road is passable. Mud to the ankle, but passable.',
    'Perrin: Nessa trades bruised apples cheap when the carts come back empty.',
    'Perrin: The road crew leaves this shelter cleaner than most inns.',
    'Perrin: Greyfold market tomorrow. If the bridge holds, I will be there before noon.'
  ];
  let lastTalk = -1;

  function update(now) {
    const dx = camera.position.x - CAMP.x, dz = camera.position.z - CAMP.z;
    const near = dx * dx + dz * dz < ACTIVE_DISTANCE * ACTIVE_DISTANCE;
    root.visible = near; if (!near) return;
    const t = now * 0.001;
    const cycle = (t % 300) / 300;
    const segFloat = cycle * route.length;
    const seg = Math.floor(segFloat) % route.length;
    const next = (seg + 1) % route.length;
    const f = segFloat - Math.floor(segFloat);
    const a = route[seg], b = route[next];
    const eased = f * f * (3 - 2 * f);
    const lx = THREE.MathUtils.lerp(a.x,b.x,eased), lz = THREE.MathUtils.lerp(a.y,b.y,eased);
    const wx = CAMP.x + lx, wz = CAMP.z + lz;
    traveler.position.set(lx, terrainHeight(wx,wz) - y, lz);
    traveler.rotation.y = Math.atan2(b.x-a.x,b.y-a.y);
    traveler.updateWorldMatrix(true,true); travelerCollider.setFromObject(traveler).expandByScalar(0.05);
    fireLight.intensity = 0.92 + Math.sin(t*8.7)*0.12 + Math.sin(t*13.1)*0.08;
    coals.material.emissiveIntensity = 1.3 + Math.sin(t*6.2)*0.25;
    const talkSlot = Math.floor(t / 74);
    if (addFeed && talkSlot !== lastTalk && Math.hypot(camera.position.x-wx,camera.position.z-wz) < 18) {
      lastTalk = talkSlot;
      const idx = Math.abs((talkSlot * 17 + 3) % lines.length);
      addFeed(lines[idx]);
    }
  }

  let last = 0;
  function frame(now) { requestAnimationFrame(frame); if (now-last < 34) return; last=now; update(now); }
  requestAnimationFrame(frame);
}

if (window.EMPTYNET_WORLD_API) install(window.EMPTYNET_WORLD_API);
else window.addEventListener('emptynet:world-ready', e => install(e.detail), { once: true });
