      const angle = rand() * Math.PI * 2;
      const radius = 1.02 + rand() * 0.17;
      const wx = spec.x + Math.cos(angle) * spec.rx * radius;
      const wz = spec.z + Math.sin(angle) * spec.rz * radius;
      const y = terrainHeight(wx, wz);
      if (y < spec.level - 0.35) continue;
      const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.045, 0.78 + rand() * 0.45), worldMaterials.leafA);
      blade.position.set(wx - record.center.x, y + 0.42, wz - record.center.z);
      blade.rotation.y = rand() * Math.PI;
      reeds.add(blade);
    }
    record.group.add(reeds);
  }
}

function buildTerminalStations() {
  for (const site of TERMINAL_SITES) createTerminalStation(site);
}

function createTerminalStation(site) {
  const group = new THREE.Group();
  const ground = terrainHeight(site.x, site.z);
  group.position.set(site.x, ground - 0.04, site.z);
  group.rotation.y = site.rot;
  scene.add(group);

  const wood = worldMaterials.wood;
  const darkWood = worldMaterials.darkWood;
  const caseMat = new THREE.MeshStandardMaterial({ color: 0xc4c0b4, roughness: 0.88 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x38423b, roughness: 0.84 });
  const screenMat = new THREE.MeshStandardMaterial({ color: 0x1b2b22, emissive: 0x6f9b78, emissiveIntensity: 0.55, roughness: 0.38, side: THREE.DoubleSide });

  const platform = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.16, 2.5), darkWood);
  platform.position.y = 0.04;
  platform.receiveShadow = true;
  group.add(platform);

  const deskTop = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.10, 0.78), wood);
  deskTop.position.set(0, 0.86, 0);
  deskTop.castShadow = true;
  deskTop.receiveShadow = true;
  group.add(deskTop);
  const legs = [[-0.70, -0.29], [0.70, -0.29], [-0.70, 0.29], [0.70, 0.29]];
  for (const [x, z] of legs) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.82, 0.10), darkWood);
    leg.position.set(x, 0.43, z);
    group.add(leg);
  }

  const monitor = new THREE.Group();
  monitor.position.set(0, 1.27, -0.05);
  group.add(monitor);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.62, 0.70), caseMat);
  body.castShadow = true;
  body.userData = { type: 'terminal', id: site.id, title: site.title, name: 'CRT TERMINAL' };
  monitor.add(body);
  interactives.push(body);
  const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.44, 0.04), trimMat);
  bezel.position.set(0, 0.03, 0.37);
  monitor.add(bezel);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.50, 0.33), screenMat);
  screen.position.set(0, 0.03, 0.394);
  screen.userData = { type: 'terminal', id: site.id, title: site.title, name: 'CRT TERMINAL' };
  monitor.add(screen);
  interactives.push(screen);
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.18, 0.17), caseMat);
  stand.position.set(0, -0.40, -0.02);
  monitor.add(stand);
  const monitorBase = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.06, 0.36), caseMat);
  monitorBase.position.set(0, -0.51, -0.02);
  monitor.add(monitorBase);

  const keyboard = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.05, 0.24), caseMat);
  keyboard.position.set(0, 0.93, 0.20);
  keyboard.rotation.x = -0.08;
  keyboard.userData = { type: 'terminal', id: site.id, title: site.title, name: 'CRT TERMINAL' };
  group.add(keyboard);
  interactives.push(keyboard);
  const tower = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.63, 0.45), caseMat);
  tower.position.set(-0.62, 0.53, 0.05);
  group.add(tower);

  const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.07, 0.46), darkWood);
  chairSeat.position.set(0, 0.48, 0.92);
  group.add(chairSeat);
  const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.55, 0.07), darkWood);
  chairBack.position.set(0, 0.72, 1.12);
  group.add(chairBack);

  group.updateMatrixWorld(true);
  [deskTop, body, tower, chairBack].forEach(mesh => {
    mesh.updateMatrixWorld(true);
    colliders.push(new THREE.Box3().setFromObject(mesh).expandByScalar(0.04));
  });
}

function pointInsidePond(x, z, scale = 0.92) {
  const hero = Math.hypot((x - LAKE.x) / (LAKE.rx * scale), (z - LAKE.z) / (LAKE.rz * scale));
  if (hero < 1) return true;
  let inside = false;
