import * as THREE from 'three';

const mainCanvas = document.querySelector('#view');
const coordsEl = document.querySelector('#coords');
const feedEl = document.querySelector('#feed');
const gameEl = document.querySelector('#game');

if (mainCanvas && coordsEl && gameEl) {
  const WORLD_SEED = 28031997;
  const SITE = { x: 1160, z: 1240 };
  const EYE_HEIGHT = 1.68;
  const VISIBLE_DISTANCE = 420;
  const DEPTH_PATCH_SIZE = 900;
  const DEPTH_PATCH_SEGMENTS = 56;

  const overlay = document.createElement('canvas');
  overlay.id = 'settlement-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    width: '100vw',
    height: '100vh',
    pointerEvents: 'none',
    zIndex: '1'
  });
  document.body.appendChild(overlay);

  const renderer = new THREE.WebGLRenderer({
    canvas: overlay,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xa8c9d4, 0.0039);
  scene.add(new THREE.HemisphereLight(0xe2eff7, 0x62714e, 1.28));
  const sun = new THREE.DirectionalLight(0xffeed2, 1.25);
  sun.position.set(SITE.x - 55, 95, SITE.z + 30);
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(66, innerWidth / innerHeight, 0.08, 720);
  camera.rotation.order = 'YXZ';

  let yaw = 0;
  let pitch = 0;
  let playerX = 0;
  let playerZ = 5;
  let targetPlayerX = 0;
  let targetPlayerZ = 5;
  let havePlayerSample = false;
  let lastFrame = performance.now();
  let approachState = 0;
  let lastOverheardAt = 0;

  function fract(value) { return value - Math.floor(value); }
  function hash2(x, z) {
    return fract(Math.sin(x * 127.1 + z * 311.7) * 43758.5453123);
  }
  function valueNoise(x, z) {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    const fx = x - ix;
    const fz = z - iz;
    const ux = fx * fx * (3 - 2 * fx);
    const uz = fz * fz * (3 - 2 * fz);
    const a = hash2(ix, iz);
    const b = hash2(ix + 1, iz);
    const c = hash2(ix, iz + 1);
    const d = hash2(ix + 1, iz + 1);
    return THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(a, b, ux),
      THREE.MathUtils.lerp(c, d, ux),
      uz
    );
  }
  function fbm(x, z) {
    let total = 0;
    let amp = 0.5;
    let freq = 1;
    for (let i = 0; i < 5; i++) {
      total += valueNoise(x * freq, z * freq) * amp;
      freq *= 2.03;
      amp *= 0.5;
    }
    return total / 0.96875;
  }
  function terrainHeight(x, z) {
    const broad = (fbm(x * 0.0105 + 11.2, z * 0.0105 - 7.4) - 0.5) * 13.2;
    const longWave = Math.sin(x * 0.017 + 0.8) * Math.cos(z * 0.0135 - 0.35) * 1.8;
    const rolling = (fbm(x * 0.025 - 4.8, z * 0.025 + 16.1) - 0.5) * 4.4;
    const micro = (fbm(x * 0.055 + 31.4, z * 0.055 - 19.7) - 0.5) * 0.8;
    return broad + longWave + rolling + micro;
  }

  function samplePlayerPosition() {
    const first = (coordsEl.textContent || '').split('\n')[0];
    const match = first.match(/(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)/);
    if (!match) return;
    targetPlayerX = Number(match[1]);
    targetPlayerZ = Number(match[2]);
    if (!havePlayerSample) {
      playerX = targetPlayerX;
      playerZ = targetPlayerZ;
      havePlayerSample = true;
    }
  }

  function addFeed(text, lifespan = 12000) {
    if (!feedEl) return;
    const line = document.createElement('div');
    line.className = 'line system';
    line.textContent = text;
    feedEl.appendChild(line);
    while (feedEl.children.length > 8) feedEl.removeChild(feedEl.firstChild);
    setTimeout(() => { line.style.opacity = '.28'; }, lifespan);
  }

  function createTerrainDepthPatch() {
    const half = DEPTH_PATCH_SIZE * 0.5;
    const positions = [];
    const indices = [];
    const n = DEPTH_PATCH_SEGMENTS;

    for (let iz = 0; iz <= n; iz++) {
      const z = SITE.z - half + (iz / n) * DEPTH_PATCH_SIZE;
      for (let ix = 0; ix <= n; ix++) {
        const x = SITE.x - half + (ix / n) * DEPTH_PATCH_SIZE;
        positions.push(x, terrainHeight(x, z) + 0.025, z);
      }
    }

    for (let iz = 0; iz < n; iz++) {
      for (let ix = 0; ix < n; ix++) {
        const a = iz * (n + 1) + ix;
        const b = a + 1;
        const c = a + (n + 1);
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    material.colorWrite = false;
    material.depthWrite = true;
    material.depthTest = true;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = -100;
    scene.add(mesh);
    return mesh;
  }

  const terrainDepth = createTerrainDepthPatch();
  terrainDepth.visible = false;

  const siteGround = terrainHeight(SITE.x, SITE.z);
  const village = new THREE.Group();
  village.position.set(SITE.x, siteGround, SITE.z);
  village.visible = false;
  scene.add(village);

  const mat = {
    plaster: new THREE.MeshStandardMaterial({ color: 0xb7aa8e, roughness: 1 }),
    plasterDark: new THREE.MeshStandardMaterial({ color: 0x8e836d, roughness: 1 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x49372b, roughness: 1 }),
    roof: new THREE.MeshStandardMaterial({ color: 0x503d35, roughness: 0.96 }),
    roofDark: new THREE.MeshStandardMaterial({ color: 0x332d2a, roughness: 1 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x77756b, roughness: 1 }),
    soil: new THREE.MeshStandardMaterial({ color: 0x4e4432, roughness: 1 }),
    crop: new THREE.MeshStandardMaterial({ color: 0x718249, roughness: 1 }),
    clothA: new THREE.MeshStandardMaterial({ color: 0x5f6c63, roughness: 1 }),
    clothB: new THREE.MeshStandardMaterial({ color: 0x75634f, roughness: 1 }),
    clothC: new THREE.MeshStandardMaterial({ color: 0x4d5860, roughness: 1 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xb79d83, roughness: 1 })
  };

  function localGround(x, z) {
    return terrainHeight(SITE.x + x, SITE.z + z) - siteGround;
  }

  function addHouse(x, z, rotation, scale = 1, dark = false) {
    const group = new THREE.Group();
    group.position.set(x, localGround(x, z), z);
    group.rotation.y = rotation;
    group.scale.setScalar(scale);
    village.add(group);

    const wallMat = dark ? mat.plasterDark : mat.plaster;
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.45, 4.0), wallMat);
    body.position.y = 1.25;
    group.add(body);

    const roofL = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.18, 4.5), dark ? mat.roofDark : mat.roof);
    roofL.position.set(-1.05, 2.82, 0);
    roofL.rotation.z = 0.55;
    group.add(roofL);
    const roofR = roofL.clone();
    roofR.position.x = 1.05;
    roofR.rotation.z = -0.55;
    group.add(roofR);

    const door = new THREE.Mesh(new THREE.BoxGeometry(0.82, 1.55, 0.08), mat.wood);
    door.position.set(0, 0.82, 2.04);
    group.add(door);

    for (const bx of [-1.75, 1.75]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.13, 2.35, 0.13), mat.wood);
      beam.position.set(bx, 1.2, 2.03);
      group.add(beam);
    }

    for (const wx of [-1.25, 1.25]) {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.55, 0.07), mat.wood);
      frame.position.set(wx, 1.4, 2.06);
      group.add(frame);
    }

    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.48, 1.25, 0.48), mat.stone);
    chimney.position.set(1.25, 3.1, -0.65);
    group.add(chimney);
  }

  const houseSpecs = [
    [-23, -17, 0.18, 1.0], [-8, -23, -0.08, 0.92], [10, -21, 0.12, 1.05],
    [24, -12, -0.22, 0.94], [-26, 5, 1.38, 0.96], [26, 8, -1.35, 1.02],
    [-18, 22, 2.8, 0.90], [3, 25, 3.02, 1.0], [21, 23, -2.84, 0.88]
  ];
  houseSpecs.forEach((h, i) => addHouse(h[0], h[1], h[2], h[3], i === 6));

  function addBarn() {
    const x = 37;
    const z = -28;
    const group = new THREE.Group();
    group.position.set(x, localGround(x, z), z);
    group.rotation.y = -0.35;
    village.add(group);
    const body = new THREE.Mesh(new THREE.BoxGeometry(7.8, 3.2, 5.4), mat.wood);
    body.position.y = 1.65;
    group.add(body);
    const roofL = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.24, 6.1), mat.roofDark);
    roofL.position.set(-1.62, 3.75, 0);
    roofL.rotation.z = 0.62;
    group.add(roofL);
    const roofR = roofL.clone();
    roofR.position.x = 1.62;
    roofR.rotation.z = -0.62;
    group.add(roofR);
    const door = new THREE.Mesh(new THREE.BoxGeometry(2.7, 2.55, 0.12), mat.roof);
    door.position.set(0, 1.35, 2.76);
    group.add(door);
  }
  addBarn();

  function addWell() {
    const group = new THREE.Group();
    group.position.set(0, localGround(0, 1), 1);
    village.add(group);
    const well = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.15, 0.72, 12, 1, true), mat.stone);
    well.position.y = 0.38;
    group.add(well);
    for (const x of [-0.9, 0.9]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.15, 0.12), mat.wood);
      post.position.set(x, 1.2, 0);
      group.add(post);
    }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.16, 2.0), mat.roof);
    roof.position.y = 2.35;
    group.add(roof);
  }
  addWell();

  function addFields() {
    for (let row = 0; row < 7; row++) {
      const soil = new THREE.Mesh(new THREE.BoxGeometry(13, 0.06, 0.8), mat.soil);
      const x = -42;
      const z = -18 + row * 2.0;
      soil.position.set(x, localGround(x, z) + 0.04, z);
      soil.rotation.y = 0.1;
      village.add(soil);
      for (let i = 0; i < 18; i++) {
        const crop = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.56 + ((i + row) % 3) * 0.08, 5), mat.crop);
        const cx = x - 5.8 + i * 0.68;
        crop.position.set(cx, localGround(cx, z) + 0.28, z);
        village.add(crop);
      }
    }
  }
  addFields();

  function addBellPost() {
    const group = new THREE.Group();
    group.position.set(7, localGround(7, 5), 5);
    village.add(group);
    for (const x of [-0.75, 0.75]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.3, 0.14), mat.wood);
      post.position.set(x, 1.65, 0);
      group.add(post);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.15, 0.15), mat.wood);
    beam.position.y = 3.2;
    group.add(beam);
    const bell = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.65, 12, 1, true), mat.stone);
    bell.position.y = 2.58;
    bell.rotation.x = Math.PI;
    group.add(bell);
  }
  addBellPost();

  const residentSpecs = [
    { name: 'Mara', cloth: mat.clothB, route: [[-23,-17],[-23,-17],[-40,-13],[-40,-13],[0,1],[7,5],[-23,-17]] },
    { name: 'Toma', cloth: mat.clothA, route: [[-8,-23],[-8,-23],[37,-28],[37,-28],[7,5],[0,1],[-8,-23]] },
    { name: 'Iven', cloth: mat.clothC, route: [[10,-21],[10,-21],[24,-12],[24,-12],[0,1],[-18,22],[10,-21]] },
    { name: 'Sela', cloth: mat.clothA, route: [[24,-12],[24,-12],[0,1],[-42,-7],[-42,-7],[7,5],[24,-12]] },
    { name: 'Orin', cloth: mat.clothB, route: [[-26,5],[-26,5],[-42,-18],[-42,-18],[0,1],[-18,22],[-26,5]] },
    { name: 'Nera', cloth: mat.clothC, route: [[26,8],[26,8],[37,-28],[7,5],[7,5],[3,25],[26,8]] },
    { name: 'Pell', cloth: mat.clothA, route: [[-18,22],[-18,22],[3,25],[3,25],[0,1],[-26,5],[-18,22]] },
    { name: 'Eda', cloth: mat.clothB, route: [[3,25],[3,25],[21,23],[0,1],[0,1],[-8,-23],[3,25]] },
    { name: 'Bram', cloth: mat.clothC, route: [[21,23],[21,23],[37,-28],[37,-28],[26,8],[7,5],[21,23]] },
    { name: 'Lio', cloth: mat.clothA, route: [[10,-21],[10,-21],[7,5],[0,1],[-18,22],[-18,22],[10,-21]] }
  ];

  function makeResident(spec, index) {
    const group = new THREE.Group();
    village.add(group);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.72, 0.26), spec.cloth);
    torso.position.y = 1.02;
    group.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), mat.skin);
    head.position.y = 1.62;
    group.add(head);

    function limbPivot(x, y, length, material) {
      const pivot = new THREE.Group();
      pivot.position.set(x, y, 0);
      const limb = new THREE.Mesh(new THREE.BoxGeometry(0.11, length, 0.11), material);
      limb.position.y = -length * 0.5;
      pivot.add(limb);
      group.add(pivot);
      return pivot;
    }

    return {
      ...spec,
      index,
      group,
      leftLeg: limbPivot(-0.12, 0.58, 0.62, mat.wood),
      rightLeg: limbPivot(0.12, 0.58, 0.62, mat.wood),
      leftArm: limbPivot(-0.31, 1.27, 0.58, spec.cloth),
      rightArm: limbPivot(0.31, 1.27, 0.58, spec.cloth),
      lastX: spec.route[0][0],
      lastZ: spec.route[0][1]
    };
  }

  const residents = residentSpecs.map(makeResident);
  const overheard = [
    ['Mara', 'The south row needs water before noon.'],
    ['Toma', 'I will mend the barn latch after the grain is in.'],
    ['Sela', 'Nera left bread by your door.'],
    ['Orin', 'The well tastes of iron again.'],
    ['Pell', 'My father said the old road used to run farther east.'],
    ['Eda', 'Bring the washing in if the wind turns cold.'],
    ['Bram', 'The bell skipped an hour yesterday.'],
    ['Nera', 'Do not leave the hens loose near the north field.'],
    ['Iven', 'I saw lights past the ridge. Probably travellers.'],
    ['Lio', 'Mara says we are short on salt.']
  ];

  function updateResidents(nowSeconds, dt) {
    const cycle = 360;
    for (const resident of residents) {
      const route = resident.route;
      const offset = (resident.index * 47 + WORLD_SEED % 131) % cycle;
      const phase = ((nowSeconds + offset) % cycle) / cycle * route.length;
      const segment = Math.floor(phase) % route.length;
      const next = (segment + 1) % route.length;
      let t = phase - Math.floor(phase);
      t = t * t * (3 - 2 * t);
      const [ax, az] = route[segment];
      const [bx, bz] = route[next];
      const x = THREE.MathUtils.lerp(ax, bx, t);
      const z = THREE.MathUtils.lerp(az, bz, t);
      const y = localGround(x, z);
      const dx = x - resident.lastX;
      const dz = z - resident.lastZ;
      const speed = Math.hypot(dx, dz) / Math.max(dt, 0.001);

      resident.group.position.set(x, y, z);
      if (Math.hypot(dx, dz) > 0.001) resident.group.rotation.y = Math.atan2(dx, dz);
      const motion = THREE.MathUtils.clamp(speed / 1.4, 0, 1);
      const swing = Math.sin(nowSeconds * 7.2 + resident.index) * 0.48 * motion;
      resident.leftLeg.rotation.x = swing;
      resident.rightLeg.rotation.x = -swing;
      resident.leftArm.rotation.x = -swing * 0.7;
      resident.rightArm.rotation.x = swing * 0.7;
      resident.lastX = x;
      resident.lastZ = z;
    }
  }

  function updateApproach(distance, now) {
    if (distance < 260 && approachState < 1) {
      approachState = 1;
      addFeed('You smell woodsmoke somewhere beyond the field.');
    }
    if (distance < 110 && approachState < 2) {
      approachState = 2;
      addFeed('Voices carry between the houses. None of them call to you.');
    }
    if (distance > 330) approachState = 0;

    if (distance < 48 && now - lastOverheardAt > 24000) {
      const bucket = Math.floor(Date.now() / 24000);
      const index = Math.abs((bucket + WORLD_SEED) % overheard.length);
      const [speaker, text] = overheard[index];
      addFeed(`overheard // ${speaker}: “${text}”`, 16000);
      lastOverheardAt = now;
    }
  }

  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;
    samplePlayerPosition();

    if (havePlayerSample) {
      const follow = 1 - Math.exp(-dt * 24);
      playerX = THREE.MathUtils.lerp(playerX, targetPlayerX, follow);
      playerZ = THREE.MathUtils.lerp(playerZ, targetPlayerZ, follow);
    }

    const distance = Math.hypot(SITE.x - playerX, SITE.z - playerZ);
    const visible = havePlayerSample && distance < VISIBLE_DISTANCE && !gameEl.classList.contains('hidden');
    village.visible = visible;
    terrainDepth.visible = visible;

    if (visible) {
      const playerGround = terrainHeight(playerX, playerZ);
      camera.position.set(playerX, playerGround + EYE_HEIGHT, playerZ);
      camera.rotation.set(pitch, yaw, 0, 'YXZ');
      updateResidents(Date.now() / 1000, dt);
      updateApproach(distance, now);
      sun.position.set(playerX - 55, camera.position.y + 95, playerZ + 30);
    }

    renderer.render(scene, camera);
  }

  document.addEventListener('mousemove', event => {
    if (document.pointerLockElement !== mainCanvas) return;
    yaw -= event.movementX * 0.002;
    pitch -= event.movementY * 0.002;
    pitch = THREE.MathUtils.clamp(pitch, -Math.PI / 2 + 0.02, Math.PI / 2 - 0.02);
  });

  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight, false);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
  });

  requestAnimationFrame(animate);
}
