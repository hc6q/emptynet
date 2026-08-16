}

function makeGrassBladeGeometry() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -0.035, 0, 0, 0.035, 0, 0, 0, 0.62, 0,
    0, 0, -0.035, 0, 0, 0.035, 0, 0.62, 0
  ], 3));
  geometry.computeVertexNormals();
  return geometry;
}

function flowerTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.translate(32, 32);
  g.fillStyle = '#ffffff';
  for (let i = 0; i < 5; i++) {
    g.save();
    g.rotate(i * Math.PI * 2 / 5);
    g.beginPath();
    g.ellipse(0, -11, 5.8, 10, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  g.fillStyle = '#f0c75c';
  g.beginPath();
  g.arc(0, 0, 5, 0, Math.PI * 2);
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildFootprintStories() {
  const material = new THREE.MeshBasicMaterial({ color: 0x463b2d, transparent: true, opacity: 0.13, depthWrite: false, side: THREE.DoubleSide });
  const geometry = new THREE.PlaneGeometry(0.16, 0.33);
  const sequences = [
    { start: [-11, 22], dir: [-0.42, 0.90], count: 10 },
    { start: [46, 18], dir: [-0.86, -0.50], count: 8 },
    { start: [-31, 47], dir: [-0.32, 0.95], count: 7 }
  ];
  for (const seq of sequences) {
    for (let i = 0; i < seq.count; i++) {
      const side = i % 2 ? 0.14 : -0.14;
      const px = seq.start[0] + seq.dir[0] * i * 0.48 + seq.dir[1] * side;
      const pz = seq.start[1] + seq.dir[1] * i * 0.48 - seq.dir[0] * side;
      const foot = new THREE.Mesh(geometry, material);
      foot.rotation.x = -Math.PI / 2;
      foot.rotation.z = Math.atan2(seq.dir[0], seq.dir[1]);
      foot.position.set(px, terrainHeight(px, pz) + 0.065, pz);
      scene.add(foot);
    }
  }
}

function buildStalker() {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0x111715,
    roughness: 1,
    transparent: true,
    opacity: 0,
    depthWrite: false
  });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.48, 1.72, 7), material);
  body.position.y = 0.94;
  const shoulders = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.30, 0.38, 7), material);
  shoulders.position.y = 1.72;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), material);
  head.position.y = 2.10;
  group.add(body, shoulders, head);
  group.visible = false;
  scene.add(group);
  stalker = {
    group,
    material,
    active: false,
    fading: false,
    spawnedAt: 0,
    fadeStart: 0,
    maxOpacity: 0.46,
    anchor: null
  };
}

function isInLake(x, z, scale = 1) {
  const dx = (x - LAKE.x) / (LAKE.rx * scale);
  const dz = (z - LAKE.z) / (LAKE.rz * scale);
  return dx * dx + dz * dz < 1;
}

function playerMesh(name, ghost = false, avatar = 'wanderer') {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: ghost ? 0x98aaa1 : 0x59645d,
    roughness: 1,
    transparent: ghost,
    opacity: ghost ? 0 : 1,
