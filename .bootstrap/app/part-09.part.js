  const rockDummy = new THREE.Object3D();
  let rockCount = 0;
  for (let tries = 0; tries < 30 && rockCount < rockTarget; tries++) {
    const lx = (rand() - 0.5) * CHUNK_SIZE;
    const lz = (rand() - 0.5) * CHUNK_SIZE;
    const wx = record.center.x + lx;
    const wz = record.center.z + lz;
    if (!isVegetationClear(wx, wz, 1.5)) continue;
    const scale = 0.25 + rand() * 0.68;
    rockDummy.position.set(lx, terrainHeight(wx, wz) + 0.12 * scale, lz);
    rockDummy.rotation.set(rand() * 2, rand() * Math.PI, rand() * 2);
    rockDummy.scale.set(scale * (0.8 + rand() * 0.4), scale * (0.55 + rand() * 0.25), scale);
    rockDummy.updateMatrix();
    rocks.setMatrixAt(rockCount++, rockDummy.matrix);
  }
  rocks.count = rockCount;
  rocks.castShadow = record.lod === 0;
  rocks.receiveShadow = true;
  record.group.add(rocks);

  if (record.lod === 0) {
    const positions = [];
    const colors = [];
    const palette = [new THREE.Color(0xffffff), new THREE.Color(0xf1ead2), new THREE.Color(0xd9e4ef), new THREE.Color(0xf1d8cc)];
    let flowers = 0;
    for (let tries = 0; tries < 60 && flowers < 24; tries++) {
      const lx = (rand() - 0.5) * CHUNK_SIZE;
      const lz = (rand() - 0.5) * CHUNK_SIZE;
      const wx = record.center.x + lx;
      const wz = record.center.z + lz;
      if (!isVegetationClear(wx, wz, 0.8)) continue;
      positions.push(lx, terrainHeight(wx, wz) + 0.25, lz);
      const c = palette[Math.floor(rand() * palette.length)];
      colors.push(c.r, c.g, c.b);
      flowers++;
    }
    if (flowers) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      record.ownedGeometries.push(geo);
      record.group.add(new THREE.Points(geo, worldMaterials.flower));
    }
  }
}

function addTreeToChunk(record, wx, wz, scale = 1, dead = false) {
  const group = new THREE.Group();
  const lx = wx - record.center.x;
  const lz = wz - record.center.z;
  const ground = terrainHeight(wx, wz);
  group.position.set(lx, ground - 0.30 * scale, lz);
  group.scale.setScalar(scale);
  group.rotation.y = seededCellValue(Math.floor(wx), Math.floor(wz), 401) * Math.PI * 2;
  record.group.add(group);

  const trunk = new THREE.Mesh(worldGeometry.treeTrunk, dead ? worldMaterials.deadWood : worldMaterials.trunk);
  trunk.position.y = 2.0;
  trunk.castShadow = record.lod === 0;
  trunk.receiveShadow = true;
  group.add(trunk);

  if (dead) {
    for (let i = 0; i < 4; i++) {
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.10, 1.8 - i * 0.12, 6), worldMaterials.deadWood);
      branch.position.y = 2.6 + i * 0.32;
      branch.rotation.z = (i % 2 ? 1 : -1) * (0.86 + i * 0.04);
      branch.rotation.y = i * 1.37;
      group.add(branch);
    }
  } else {
    const crownCount = 4;
    for (let i = 0; i < crownCount; i++) {
      const crown = new THREE.Mesh(worldGeometry.treeCrown, i % 2 ? worldMaterials.leafA : worldMaterials.leafB);
      crown.position.set((i - 1.5) * 0.42, 3.75 + (i % 2) * 0.48, ((i * 17) % 3 - 1) * 0.42);
      crown.scale.set(1.0 + (i % 2) * 0.18, 0.9 + (i % 3) * 0.08, 1.0);
      crown.castShadow = record.lod === 0;
      crown.receiveShadow = true;
      group.add(crown);
    }
  }

  group.updateMatrixWorld(true);
  trunk.updateMatrixWorld(true);
  record.colliders.push(new THREE.Box3().setFromObject(trunk).expandByScalar(0.06));
}

function buildChunkStructures(record) {
  const minX = record.center.x - CHUNK_SIZE * 0.5;
  const maxX = record.center.x + CHUNK_SIZE * 0.5;
  const minZ = record.center.z - CHUNK_SIZE * 0.5;
  const maxZ = record.center.z + CHUNK_SIZE * 0.5;
  const gx0 = Math.floor(minX / STRUCTURE_CELL) - 1;
  const gx1 = Math.floor(maxX / STRUCTURE_CELL) + 1;
  const gz0 = Math.floor(minZ / STRUCTURE_CELL) - 1;
  const gz1 = Math.floor(maxZ / STRUCTURE_CELL) + 1;
  for (let gx = gx0; gx <= gx1; gx++) {
    for (let gz = gz0; gz <= gz1; gz++) {
      const spec = structureSpecAtCell(gx, gz);
      if (!spec) continue;
