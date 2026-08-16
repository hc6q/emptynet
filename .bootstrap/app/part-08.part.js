  mesh.receiveShadow = true;
  record.group.add(mesh);
}

function intHash(cx, cz, salt = 0) {
  let h = (Math.imul(cx ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(cz ^ 0xc2b2ae35, 0x27d4eb2d) ^ Math.imul(WORLD_SEED + salt, 0x165667b1)) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function nearbyStructureClearance(x, z) {
  let clearance = Infinity;
  eachNearbyStructure(x, z, spec => {
    if (spec.type === 'pond') {
      const d = Math.hypot((x - spec.x) / spec.rx, (z - spec.z) / spec.rz);
      clearance = Math.min(clearance, (d - 1) * Math.max(spec.rx, spec.rz));
    } else {
      clearance = Math.min(clearance, Math.hypot(x - spec.x, z - spec.z) - spec.radius);
    }
  });
  return clearance;
}

function terrainSlope(x, z) {
  const step = 1.4;
  const dx = Math.abs(terrainHeight(x + step, z) - terrainHeight(x - step, z));
  const dz = Math.abs(terrainHeight(x, z + step) - terrainHeight(x, z - step));
  return Math.max(dx, dz) / (step * 2);
}

function isVegetationClear(x, z, extra = 0) {
  if (proceduralTrailDistance(x, z) < 4.2 + extra) return false;
  if (nearbyStructureClearance(x, z) < 5.0 + extra) return false;
  if (Math.hypot(x - LAKE.x, z - LAKE.z) < Math.max(LAKE.rx, LAKE.rz) + 4 + extra) return false;
  if (RUINS.some(r => Math.hypot(x - r.x, z - r.z) < 9 * r.scale + extra)) return false;
  if (TERMINAL_SITES.some(t => Math.hypot(x - t.x, z - t.z) < 7 + extra)) return false;
  if (Math.hypot(x, z - 5) < 26 + extra) return false;
  return terrainSlope(x, z) < 0.68;
}

function buildChunkVegetation(record) {
  const rand = mulberry32(intHash(record.cx, record.cz, 300));
  const grassCount = record.lod === 0 ? 260 : record.lod === 1 ? 95 : 0;
  if (grassCount) {
    const grass = new THREE.InstancedMesh(worldGeometry.grassBlade, worldMaterials.grass, grassCount);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    let count = 0;
    let tries = 0;
    while (count < grassCount && tries < grassCount * 6) {
      tries++;
      const lx = (rand() - 0.5) * CHUNK_SIZE;
      const lz = (rand() - 0.5) * CHUNK_SIZE;
      const wx = record.center.x + lx;
      const wz = record.center.z + lz;
      if (!isVegetationClear(wx, wz, 0)) continue;
      const y = terrainHeight(wx, wz);
      dummy.position.set(lx, y - 0.055, lz);
      dummy.rotation.set(0, rand() * Math.PI, (rand() - 0.5) * 0.05);
      const h = 0.55 + rand() * 0.65;
      dummy.scale.set(0.72 + rand() * 0.55, h, 0.72 + rand() * 0.55);
      dummy.updateMatrix();
      grass.setMatrixAt(count, dummy.matrix);
      color.setHSL(0.27 + (rand() - 0.5) * 0.035, 0.34 + rand() * 0.16, 0.34 + rand() * 0.12);
      grass.setColorAt(count, color);
      count++;
    }
    grass.count = count;
    grass.receiveShadow = true;
    record.group.add(grass);
  }

  const treeTarget = record.lod === 0 ? 3 : record.lod === 1 ? 1 : 0;
  let treeCount = 0;
  for (let tries = 0; tries < 18 && treeCount < treeTarget; tries++) {
    const lx = (rand() - 0.5) * CHUNK_SIZE;
    const lz = (rand() - 0.5) * CHUNK_SIZE;
    const wx = record.center.x + lx;
    const wz = record.center.z + lz;
    if (!isVegetationClear(wx, wz, 4)) continue;
    addTreeToChunk(record, wx, wz, 0.82 + rand() * 0.46, rand() < 0.13);
    treeCount++;
  }

  const rockTarget = record.lod === 0 ? 6 : record.lod === 1 ? 3 : 1;
  const rocks = new THREE.InstancedMesh(worldGeometry.rock, worldMaterials.rock, rockTarget);
