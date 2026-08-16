function chunkKey(cx, cz) { return `${cx},${cz}`; }
function chunkCoord(value) { return Math.floor(value / CHUNK_SIZE); }
function chunkCenter(cx, cz) { return { x: (cx + 0.5) * CHUNK_SIZE, z: (cz + 0.5) * CHUNK_SIZE }; }

function desiredChunkLod(cx, cz, centerCX, centerCZ) {
  const ring = Math.max(Math.abs(cx - centerCX), Math.abs(cz - centerCZ));
  if (ring <= 1) return 0;
  if (ring <= 3) return 1;
  return 2;
}

function refreshWorldChunks(force = false) {
  if (!camera) return;
  const centerCX = chunkCoord(camera.position.x);
  const centerCZ = chunkCoord(camera.position.z);
  if (!force && centerCX === lastChunkCX && centerCZ === lastChunkCZ) return;
  lastChunkCX = centerCX;
  lastChunkCZ = centerCZ;

  const wanted = new Set();
  for (let dx = -CHUNK_RADIUS; dx <= CHUNK_RADIUS; dx++) {
    for (let dz = -CHUNK_RADIUS; dz <= CHUNK_RADIUS; dz++) {
      const cx = centerCX + dx;
      const cz = centerCZ + dz;
      const key = chunkKey(cx, cz);
      wanted.add(key);
      const lod = desiredChunkLod(cx, cz, centerCX, centerCZ);
      const existing = loadedChunks.get(key);
      if (!existing || existing.lod !== lod) {
        if (existing) disposeWorldChunk(existing);
        loadedChunks.set(key, createWorldChunk(cx, cz, lod));
      }
    }
  }

  for (const [key, record] of loadedChunks) {
    if (!wanted.has(key)) {
      disposeWorldChunk(record);
      loadedChunks.delete(key);
    }
  }
}

function disposeWorldChunk(record) {
  if (!record) return;
  scene.remove(record.group);
  const sharedGeometries = new Set(Object.values(worldGeometry));
  const sharedMaterials = new Set(Object.values(worldMaterials));
  const disposedGeometries = new Set();
  const disposedMaterials = new Set();
  record.group.traverse(object => {
    const geometry = object.geometry;
    if (geometry && !sharedGeometries.has(geometry) && !disposedGeometries.has(geometry)) {
      geometry.dispose();
      disposedGeometries.add(geometry);
    }
    const materials = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
    for (const material of materials) {
      if (!sharedMaterials.has(material) && !disposedMaterials.has(material)) {
        material.dispose();
        disposedMaterials.add(material);
      }
    }
  });
}

function createWorldChunk(cx, cz, lod) {
  const center = chunkCenter(cx, cz);
  const group = new THREE.Group();
  group.position.set(center.x, 0, center.z);
  scene.add(group);
  const record = { cx, cz, lod, center, group, colliders: [], ownedGeometries: [] };
  buildChunkTerrain(record);
  buildChunkTrails(record);
  buildChunkStructures(record);
  buildChunkVegetation(record);
  return record;
}

function buildChunkTerrain(record) {
  const segments = record.lod === 0 ? 40 : record.lod === 1 ? 20 : 10;
  const geometry = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const wx = record.center.x + pos.getX(i);
    const wz = record.center.z + pos.getZ(i);
    pos.setY(i, terrainHeight(wx, wz));
    uv.setXY(i, wx / 4.5, wz / 4.5);
  }
  pos.needsUpdate = true;
  uv.needsUpdate = true;
  geometry.computeVertexNormals();
  record.ownedGeometries.push(geometry);
  const mesh = new THREE.Mesh(geometry, worldMaterials.terrain);
  mesh.receiveShadow = true;
  record.group.add(mesh);
  buildChunkSkirt(record, segments);
}
