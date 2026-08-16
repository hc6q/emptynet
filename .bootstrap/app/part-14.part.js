  shaft.position.set(x, 0.27 + actualHeight * 0.5, z);
  group.add(shaft);
  collisionMeshes.push(shaft);

  const collar = makeStoneMesh(new THREE.CylinderGeometry(radius * 0.98, radius * 0.88, 0.13, 14), stoneMaterial);
  collar.position.set(x, 0.29 + actualHeight, z);
  group.add(collar);

  if (!broken) {
    const capital = makeStoneMesh(new THREE.BoxGeometry(radius * 2.1, 0.18, radius * 2.1), stoneMaterial);
    capital.position.set(x, 0.43 + actualHeight, z);
    group.add(capital);
  } else if (rand() < 0.7) {
    const fragment = makeStoneMesh(new THREE.CylinderGeometry(radius * 0.78, radius, height * 0.32, 14, 1), stoneMaterial);
    fragment.position.set(x + radius * 1.8, 0.28, z + radius * (1.5 + rand()));
    fragment.rotation.z = Math.PI * (0.42 + rand() * 0.12);
    fragment.rotation.y = rand() * Math.PI;
    group.add(fragment);
  }
}

function createTempleRuin(config, index) {
  const rand = mulberry32(intHash(Math.round(config.x * 10), Math.round(config.z * 10), 710 + index));
  const group = new THREE.Group();
  group.position.set(config.x, terrainHeight(config.x, config.z), config.z);
  group.rotation.y = config.rot;
  group.scale.setScalar(config.scale);
  scene.add(group);

  const stone = cloneStoneMaterial(index === 0 ? 0xe6dfc8 : 0xd5d0bd);
  const stoneDark = cloneStoneMaterial(0xb7b09c);
  const collisionMeshes = [];

  for (let step = 0; step < 3; step++) {
    const terrace = makeStoneMesh(new THREE.BoxGeometry(10.4 - step * 0.7, 0.14, 7.8 - step * 0.55), step === 0 ? stoneDark : stone, false);
    terrace.position.y = 0.07 + step * 0.13;
    group.add(terrace);
  }

  const columns = [
    [-3.25, -2.25, false], [-1.1, -2.25, index !== 0], [1.1, -2.25, false], [3.25, -2.25, index === 2],
    [-3.25, 2.05, index === 4], [-1.1, 2.05, true], [1.1, 2.05, index !== 1], [3.25, 2.05, true]
  ];
  for (const [x, z, broken] of columns) createColumn(group, x, z, 3.9, 0.38, broken, stone, collisionMeshes, rand);

  if (index === 0) {
    const arch = makeStoneMesh(new THREE.TorusGeometry(1.55, 0.28, 10, 28, Math.PI), stone);
    arch.position.set(0, 2.75, 1.96);
    group.add(arch);
    const archLeft = makeStoneMesh(new THREE.BoxGeometry(0.55, 2.7, 0.62), stone);
    archLeft.position.set(-1.55, 1.35, 1.96);
    group.add(archLeft);
    collisionMeshes.push(archLeft);
    const archRight = archLeft.clone();
    archRight.position.x = 1.55;
    group.add(archRight);
    collisionMeshes.push(archRight);
  }

  const lintelA = makeStoneMesh(new THREE.BoxGeometry(7.7, 0.38, 0.62), stone);
  lintelA.position.set(0, 4.46, -2.25);
  lintelA.rotation.z = index === 3 ? -0.045 : 0;
  group.add(lintelA);

  if (index !== 0) {
    const wall = makeStoneMesh(new THREE.BoxGeometry(3.1, 2.25, 0.52), stone);
    wall.position.set(index % 2 ? -1.8 : 1.8, 1.4, 0.1);
    wall.rotation.y = index % 2 ? 0.16 : -0.16;
    group.add(wall);
    collisionMeshes.push(wall);
  }

  for (let i = 0; i < 14; i++) {
    const size = 0.22 + rand() * 0.42;
    const rock = makeStoneMesh(new THREE.DodecahedronGeometry(size, 0), rand() < 0.55 ? stone : stoneDark);
    const side = rand() < 0.5 ? -1 : 1;
    rock.position.set(side * (4 + rand() * 2.4), size * 0.6, (rand() - 0.5) * 6.6);
    rock.rotation.set(rand(), rand(), rand());
    group.add(rock);
  }

  const altar = makeStoneMesh(new THREE.BoxGeometry(1.35, 0.72, 1.05), stoneDark);
  altar.position.set(0, 0.62, 0.25);
  group.add(altar);

  group.updateMatrixWorld(true);
  for (const mesh of collisionMeshes) {
    mesh.updateMatrixWorld(true);
    colliders.push(new THREE.Box3().setFromObject(mesh).expandByScalar(0.06));
  }


}

function buildRuins() {
  RUINS.forEach(createTempleRuin);
}

function seededCellValue(ix, iz, salt = 0) {
  return fract(Math.sin((ix + WORLD_SEED * 0.001 + salt * 13.1) * 127.1 + (iz - WORLD_SEED * 0.001 + salt * 7.7) * 311.7) * 43758.5453123);
