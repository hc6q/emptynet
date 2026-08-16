      if (spec.x < minX || spec.x >= maxX || spec.z < minZ || spec.z >= maxZ) continue;
      if (spec.type === 'cabin') addCabinToChunk(record, spec);
      else if (spec.type === 'shrine') addShrineToChunk(record, spec);
      else if (spec.type === 'watchtower') addWatchtowerToChunk(record, spec);
      else if (spec.type === 'pond') addPondToChunk(record, spec);
    }
  }
}

function addCabinToChunk(record, spec) {
  const group = new THREE.Group();
  group.position.set(spec.x - record.center.x, terrainHeight(spec.x, spec.z) - 0.10 * spec.scale, spec.z - record.center.z);
  group.rotation.y = spec.rot;
  group.scale.setScalar(spec.scale);
  record.group.add(group);
  const collisionMeshes = [];

  const add = (mesh, collides = false) => {
    mesh.castShadow = record.lod === 0;
    mesh.receiveShadow = true;
    group.add(mesh);
    if (collides) collisionMeshes.push(mesh);
    return mesh;
  };

  const floor = add(new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.18, 3.8), worldMaterials.darkWood), false);
  floor.position.y = 0.06;

  const back = add(new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.35, 0.18), worldMaterials.wood), true);
  back.position.set(0, 1.22, -1.9);
  const left = add(new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.35, 3.8), worldMaterials.wood), true);
  left.position.set(-2.4, 1.22, 0);
  const right = add(new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.35, 3.8), worldMaterials.wood), true);
  right.position.set(2.4, 1.22, 0);
  const frontL = add(new THREE.Mesh(new THREE.BoxGeometry(1.65, 2.35, 0.18), worldMaterials.wood), true);
  frontL.position.set(-1.58, 1.22, 1.9);
  const frontR = add(new THREE.Mesh(new THREE.BoxGeometry(1.65, 2.35, 0.18), worldMaterials.wood), true);
  frontR.position.set(1.58, 1.22, 1.9);

  const roofL = add(new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.16, 4.3), worldMaterials.roof), false);
  roofL.position.set(-1.13, 2.85, 0);
  roofL.rotation.z = 0.48;
  const roofR = add(new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.16, 4.3), worldMaterials.roof), false);
  roofR.position.set(1.13, 2.85, 0);
  roofR.rotation.z = -0.48;

  const porch = add(new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.14, 1.15), worldMaterials.darkWood), false);
  porch.position.set(0, 0.14, 2.38);

  const table = add(new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 0.65), worldMaterials.darkWood), true);
  table.position.set(1.15, 0.78, -0.55);
  for (const sx of [-0.42, 0.42]) for (const sz of [-0.24, 0.24]) {
    const leg = add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.72, 0.07), worldMaterials.darkWood), false);
    leg.position.set(1.15 + sx, 0.4, -0.55 + sz);
  }
  const bed = add(new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.26, 0.78), worldMaterials.darkWood), true);
  bed.position.set(-1.1, 0.34, -0.95);
  const mattressMat = new THREE.MeshStandardMaterial({ color: 0x8c8a79, roughness: 1 });
  const mattress = add(new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.14, 0.70), mattressMat), false);
  mattress.position.set(-1.1, 0.53, -0.95);
  const crate = add(new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.58, 0.58), worldMaterials.wood), true);
  crate.position.set(1.72, 0.35, 0.85);

  const windowMat = new THREE.MeshPhysicalMaterial({ color: 0x8ba9aa, roughness: 0.25, transmission: 0.25, transparent: true, opacity: 0.45, side: THREE.DoubleSide });
  const window = add(new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.64), windowMat), false);
  window.position.set(0.55, 1.5, -2.0);

  const lintel = add(new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.16, 0.22), worldMaterials.darkWood), false);
  lintel.position.set(0, 2.25, 1.94);

  group.updateMatrixWorld(true);
  for (const mesh of collisionMeshes) {
    mesh.updateMatrixWorld(true);
    record.colliders.push(new THREE.Box3().setFromObject(mesh).expandByScalar(0.04));
  }
}

function addShrineToChunk(record, spec) {
  const group = new THREE.Group();
  group.position.set(spec.x - record.center.x, terrainHeight(spec.x, spec.z) - 0.06, spec.z - record.center.z);
  group.rotation.y = spec.rot;
  group.scale.setScalar(spec.scale);
  record.group.add(group);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.25, 0.34, 12), worldMaterials.stoneDark);
  base.position.y = 0.10;
  base.receiveShadow = true;
  group.add(base);
  const collisionMeshes = [];
  const positions = [[-1.8, -1.2], [1.8, -1.2], [-1.8, 1.2], [1.8, 1.2]];
  positions.forEach(([x, z], i) => {
    const h = i === 2 ? 1.85 : 3.0 + (i % 2) * 0.45;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.38, h, 10), worldMaterials.stone);
    col.position.set(x, h * 0.5 + 0.28, z);
    col.castShadow = record.lod === 0;
    col.receiveShadow = true;
    group.add(col);
    collisionMeshes.push(col);
  });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.32, 0.55), worldMaterials.stone);
