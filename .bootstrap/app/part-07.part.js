
function buildChunkSkirt(record, segments) {
  const min = -CHUNK_SIZE * 0.5;
  const max = CHUNK_SIZE * 0.5;
  const positions = [];
  const indices = [];
  const edges = [
    t => [THREE.MathUtils.lerp(min, max, t), min],
    t => [max, THREE.MathUtils.lerp(min, max, t)],
    t => [THREE.MathUtils.lerp(max, min, t), max],
    t => [min, THREE.MathUtils.lerp(max, min, t)]
  ];
  let baseIndex = 0;
  for (const edge of edges) {
    for (let i = 0; i <= segments; i++) {
      const [lx, lz] = edge(i / segments);
      const wx = record.center.x + lx;
      const wz = record.center.z + lz;
      const y = terrainHeight(wx, wz);
      positions.push(lx, y, lz, lx, y - 2.6, lz);
      if (i < segments) {
        const a = baseIndex + i * 2;
        indices.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
      }
    }
    baseIndex += (segments + 1) * 2;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  record.ownedGeometries.push(geometry);
  const skirt = new THREE.Mesh(geometry, worldMaterials.skirt);
  skirt.receiveShadow = true;
  record.group.add(skirt);
}

function buildChunkTrails(record) {
  const minX = record.center.x - CHUNK_SIZE * 0.5;
  const maxX = record.center.x + CHUNK_SIZE * 0.5;
  const minZ = record.center.z - CHUNK_SIZE * 0.5;
  const maxZ = record.center.z + CHUNK_SIZE * 0.5;

  const eastStart = Math.floor((minZ - 70) / TRAIL_SPACING) - 1;
  const eastEnd = Math.ceil((maxZ + 70) / TRAIL_SPACING) + 1;
  for (let lane = eastStart; lane <= eastEnd; lane++) {
    const points = [];
    const step = 3.0;
    for (let x = minX - 5; x <= maxX + 5; x += step) {
      const z = eastTrailZ(x, lane);
      if (z >= minZ - 8 && z <= maxZ + 8) points.push(new THREE.Vector3(x, terrainHeight(x, z) + 0.12, z));
    }
    if (points.length >= 3) addTrailRibbon(record, points, lane === 0 ? 2.7 : 2.35);
  }

  const northStart = Math.floor((minX - TRAIL_SPACING * 0.46 - 70) / TRAIL_SPACING) - 1;
  const northEnd = Math.ceil((maxX - TRAIL_SPACING * 0.46 + 70) / TRAIL_SPACING) + 1;
  for (let lane = northStart; lane <= northEnd; lane++) {
    const points = [];
    const step = 3.0;
    for (let z = minZ - 5; z <= maxZ + 5; z += step) {
      const x = northTrailX(z, lane);
      if (x >= minX - 8 && x <= maxX + 8) points.push(new THREE.Vector3(x, terrainHeight(x, z) + 0.12, z));
    }
    if (points.length >= 3) addTrailRibbon(record, points, 2.15);
  }
}

function addTrailRibbon(record, points, width) {
  const positions = [];
  const uvs = [];
  const indices = [];
  let accumulated = 0;
  for (let i = 0; i < points.length; i++) {
    if (i > 0) accumulated += points[i].distanceTo(points[i - 1]);
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const tangent = new THREE.Vector2(next.x - prev.x, next.z - prev.z).normalize();
    const side = new THREE.Vector2(-tangent.y, tangent.x);
    const half = width * 0.5;
    const lx = points[i].x + side.x * half;
    const lz = points[i].z + side.y * half;
    const rx = points[i].x - side.x * half;
    const rz = points[i].z - side.y * half;
    positions.push(lx - record.center.x, terrainHeight(lx, lz) + 0.13, lz - record.center.z);
    positions.push(rx - record.center.x, terrainHeight(rx, rz) + 0.13, rz - record.center.z);
    const v = accumulated / 3.6;
    uvs.push(0, v, 1, v);
    if (i < points.length - 1) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 2, a + 3, a + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  record.ownedGeometries.push(geometry);
  const mesh = new THREE.Mesh(geometry, worldMaterials.path);
