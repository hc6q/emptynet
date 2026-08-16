  slab.position.set(0, 3.52, -1.2);
  slab.rotation.z = 0.035;
  group.add(slab);
  const altar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.75, 0.95), worldMaterials.stoneDark);
  altar.position.set(0, 0.62, 0.15);
  group.add(altar);
  collisionMeshes.push(altar);

  group.updateMatrixWorld(true);
  for (const mesh of collisionMeshes) {
    mesh.updateMatrixWorld(true);
    record.colliders.push(new THREE.Box3().setFromObject(mesh).expandByScalar(0.05));
  }
}

function addWatchtowerToChunk(record, spec) {
  const group = new THREE.Group();
  group.position.set(spec.x - record.center.x, terrainHeight(spec.x, spec.z) - 0.14 * spec.scale, spec.z - record.center.z);
  group.rotation.y = spec.rot;
  group.scale.setScalar(spec.scale);
  record.group.add(group);
  const collisionMeshes = [];
  const wood = worldMaterials.darkWood;
  const plank = worldMaterials.wood;

  const feet = [[-1.25, -1.25], [1.25, -1.25], [-1.25, 1.25], [1.25, 1.25]];
  for (const [x, z] of feet) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 5.1, 0.22), wood);
    post.position.set(x, 2.55, z);
    post.castShadow = record.lod === 0;
    post.receiveShadow = true;
    group.add(post);
    collisionMeshes.push(post);
  }

  const deck = new THREE.Mesh(new THREE.BoxGeometry(3.25, 0.20, 3.25), plank);
  deck.position.y = 4.65;
  deck.castShadow = record.lod === 0;
  deck.receiveShadow = true;
  group.add(deck);

  const railHeight = 5.35;
  const rails = [
    [0, railHeight, -1.5, 3.0, 0.12, 0.12],
    [0, railHeight, 1.5, 3.0, 0.12, 0.12],
    [-1.5, railHeight, 0, 0.12, 0.12, 3.0],
    [1.5, railHeight, 0, 0.12, 0.12, 3.0]
  ];
  for (const [x, y, z, w, h, d] of rails) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wood);
    rail.position.set(x, y, z);
    group.add(rail);
  }

  for (let i = 0; i < 7; i++) {
    const rung = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.08, 0.10), plank);
    rung.position.set(0, 0.72 + i * 0.56, 1.43);
    group.add(rung);
  }
  const ladderL = new THREE.Mesh(new THREE.BoxGeometry(0.10, 4.25, 0.10), wood);
  ladderL.position.set(-0.42, 2.35, 1.43);
  group.add(ladderL);
  const ladderR = ladderL.clone();
  ladderR.position.x = 0.42;
  group.add(ladderR);

  const roofL = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.13, 3.6), worldMaterials.roof);
  roofL.position.set(-0.86, 6.20, 0);
  roofL.rotation.z = 0.44;
  group.add(roofL);
  const roofR = roofL.clone();
  roofR.position.x = 0.86;
  roofR.rotation.z = -0.44;
  group.add(roofR);

  const dangling = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.6, 0.05), worldMaterials.deadWood);
  dangling.position.set(1.2, 3.55, -1.3);
  dangling.rotation.z = 0.08;
  group.add(dangling);

  group.updateMatrixWorld(true);
  for (const mesh of collisionMeshes) {
    mesh.updateMatrixWorld(true);
    record.colliders.push(new THREE.Box3().setFromObject(mesh).expandByScalar(0.04));
  }
}

function addPondToChunk(record, spec) {
  const geo = new THREE.CircleGeometry(spec.rx * 0.985, 56);
  geo.rotateX(-Math.PI / 2);
  record.ownedGeometries.push(geo);
  const water = new THREE.Mesh(geo, worldMaterials.water);
  water.scale.z = spec.rz / spec.rx;
  water.position.set(spec.x - record.center.x, spec.level + 0.035, spec.z - record.center.z);
  record.group.add(water);

  if (record.lod === 0) {
    const reeds = new THREE.Group();
    const rand = mulberry32(intHash(spec.gx, spec.gz, 550));
    for (let i = 0; i < 34; i++) {
