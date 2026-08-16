  eachNearbyStructure(x, z, spec => {
    if (spec.type !== 'pond' || inside) return;
    const d = Math.hypot((x - spec.x) / (spec.rx * scale), (z - spec.z) / (spec.rz * scale));
    if (d < 1) inside = true;
  });
  return inside;
}

function buildLake() {
  const shorelineMaterial = worldMaterials.path.clone();
  shorelineMaterial.side = THREE.DoubleSide;
  shorelineMaterial.color = new THREE.Color(0xb9ad8e);

  const segments = 96;
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const c = Math.cos(t);
    const sE = Math.sin(t);
    const innerRadius = 1.0 + 0.015 * Math.sin(t * 3.0 + 0.8) + 0.02 * Math.cos(t * 5.0 - 0.2);
    const outerRadius = 1.18 + 0.03 * Math.sin(t * 2.0 - 0.4);
    const ix = LAKE.x + c * LAKE.rx * innerRadius;
    const iz = LAKE.z + sE * LAKE.rz * innerRadius;
    const ox = LAKE.x + c * LAKE.rx * outerRadius;
    const oz = LAKE.z + sE * LAKE.rz * outerRadius;
    const iy = Math.max(LAKE.level + 0.02, terrainHeight(ix, iz) + 0.03);
    const oy = terrainHeight(ox, oz) + 0.04;
    positions.push(ix, iy, iz, ox, oy, oz);
    uvs.push(0, i / 8, 1, i / 8);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 2, a + 3, a + 1);
    }
  }
  const shoreGeo = new THREE.BufferGeometry();
  shoreGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  shoreGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  shoreGeo.setIndex(indices);
  shoreGeo.computeVertexNormals();
  const shore = new THREE.Mesh(shoreGeo, shorelineMaterial);
  shore.receiveShadow = true;
  scene.add(shore);

  waterMesh = new THREE.Mesh(new THREE.CircleGeometry(LAKE.rx * 0.985, 96), worldMaterials.water);
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.scale.z = LAKE.rz / LAKE.rx;
  waterMesh.position.set(LAKE.x, LAKE.level + 0.03, LAKE.z);
  scene.add(waterMesh);

  const reedsMat = new THREE.MeshStandardMaterial({ color: 0x557543, roughness: 1, side: THREE.DoubleSide });
  const bladeGeo = new THREE.PlaneGeometry(0.045, 0.9);
  const reeds = new THREE.InstancedMesh(bladeGeo, reedsMat, 220);
  const dummy = new THREE.Object3D();
  const rand = mulberry32(intHash(Math.round(LAKE.x), Math.round(LAKE.z), 880));
  let count = 0;
  for (let i = 0; i < 320 && count < 220; i++) {
    const angle = rand() * Math.PI * 2;
    const radius = 1.03 + rand() * 0.17;
    const x = LAKE.x + Math.cos(angle) * LAKE.rx * radius;
    const z = LAKE.z + Math.sin(angle) * LAKE.rz * radius;
    const y = terrainHeight(x, z);
    if (y < LAKE.level - 0.35) continue;
    dummy.position.set(x, y + 0.45, z);
    dummy.rotation.y = rand() * Math.PI;
    dummy.scale.set(0.9 + rand() * 0.4, 0.65 + rand() * 0.8, 1);
    dummy.updateMatrix();
    reeds.setMatrixAt(count++, dummy.matrix);
  }
  reeds.count = count;
  scene.add(reeds);
}

function cloneStoneMaterial(tint = 0xffffff) {
  return new THREE.MeshStandardMaterial({
    map: assets.stoneDiffuse,
    normalMap: assets.stoneNormal,
    roughnessMap: assets.stoneRough,
    normalScale: new THREE.Vector2(0.72, 0.72),
    color: tint,
    roughness: 0.95,
    metalness: 0
  });
}

function makeStoneMesh(geometry, material, cast = true) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  return mesh;
}

function createColumn(group, x, z, height, radius, broken, stoneMaterial, collisionMeshes, rand = Math.random) {
  const base = makeStoneMesh(new THREE.CylinderGeometry(radius * 1.18, radius * 1.24, 0.18, 14), stoneMaterial);
  base.position.set(x, 0.19, z);
  group.add(base);

  const actualHeight = broken ? height * (0.48 + rand() * 0.28) : height;
  const shaft = makeStoneMesh(new THREE.CylinderGeometry(radius * 0.78, radius, actualHeight, 14, 1), stoneMaterial);
