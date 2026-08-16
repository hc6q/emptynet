  const scale = 0.88 + seededCellValue(gx, gz, 105) * 0.34;
  if (roll < 0.095) {
    return { type: 'cabin', gx, gz, x, z, rot, scale, radius: 6.0 * scale, baseY: broadTerrainHeight(x, z) };
  }
  if (roll < 0.135) {
    return { type: 'shrine', gx, gz, x, z, rot, scale: 0.75 + seededCellValue(gx, gz, 106) * 0.42, radius: 7.4, baseY: broadTerrainHeight(x, z) };
  }
  if (roll < 0.168) {
    const rx = 9 + seededCellValue(gx, gz, 107) * 7;
    const rz = 7 + seededCellValue(gx, gz, 108) * 5;
    const level = broadTerrainHeight(x, z) - 1.45;
    return { type: 'pond', gx, gz, x, z, rx, rz, level, radius: Math.max(rx, rz) * 1.5, baseY: level };
  }
  return { type: 'watchtower', gx, gz, x, z, rot, scale: 0.82 + seededCellValue(gx, gz, 109) * 0.30, radius: 5.8, baseY: broadTerrainHeight(x, z) };
}

function eachNearbyStructure(x, z, fn) {
  const gx = Math.floor(x / STRUCTURE_CELL);
  const gz = Math.floor(z / STRUCTURE_CELL);
  for (let ix = gx - 1; ix <= gx + 1; ix++) {
    for (let iz = gz - 1; iz <= gz + 1; iz++) {
      const spec = structureSpecAtCell(ix, iz);
      if (spec) fn(spec);
    }
  }
}

function applyPondBasin(h, x, z, pond) {
  const dx = (x - pond.x) / pond.rx;
  const dz = (z - pond.z) / pond.rz;
  const d = Math.hypot(dx, dz);
  if (d >= 1.48) return h;
  const basin = pond.level - 1.55 + Math.min(d, 1) * 0.12;
  const blend = smoothstep(0.82, 1.48, d);
  return THREE.MathUtils.lerp(basin, h, blend);
}

function terrainHeight(x, z) {
  let h = baseTerrainHeight(x, z);

  const spawnTarget = broadTerrainHeight(0, 5);
  h = flattenAround(h, x, z, 0, 5, spawnTarget, 9, 18);

  const trailDist = proceduralTrailDistance(x, z);
  if (trailDist < 5.1) {
    const target = broadTerrainHeight(x, z) - 0.10;
    h = THREE.MathUtils.lerp(h, target, 1 - smoothstep(2.4, 5.1, trailDist));
  }

  for (const ruin of RUINS) {
    const target = ruin.baseY ?? broadTerrainHeight(ruin.x, ruin.z);
    h = flattenAround(h, x, z, ruin.x, ruin.z, target, 6.2 * ruin.scale, 11.8 * ruin.scale);
  }

  for (const terminal of TERMINAL_SITES) {
    const target = terminal.baseY ?? broadTerrainHeight(terminal.x, terminal.z);
    h = flattenAround(h, x, z, terminal.x, terminal.z, target, 3.5, 7.0);
  }

  eachNearbyStructure(x, z, spec => {
    if (spec.type === 'cabin') {
      h = flattenAround(h, x, z, spec.x, spec.z, spec.baseY, 4.8 * spec.scale, 8.2 * spec.scale);
    } else if (spec.type === 'shrine') {
      h = flattenAround(h, x, z, spec.x, spec.z, spec.baseY, 5.5 * spec.scale, 9.5 * spec.scale);
    } else if (spec.type === 'watchtower') {
      h = flattenAround(h, x, z, spec.x, spec.z, spec.baseY, 4.2 * spec.scale, 7.2 * spec.scale);
    } else if (spec.type === 'pond') {
      h = applyPondBasin(h, x, z, spec);
    }
  });

  h = applyPondBasin(h, x, z, LAKE);
  return h;
}

function buildWorld() {
  for (const ruin of RUINS) ruin.baseY = broadTerrainHeight(ruin.x, ruin.z);
  for (const terminal of TERMINAL_SITES) terminal.baseY = broadTerrainHeight(terminal.x, terminal.z);

  scene.add(new THREE.HemisphereLight(0xdceeff, 0x536a3d, 1.24));
  sunLight = new THREE.DirectionalLight(0xfff1d7, 2.15);
  sunLight.position.set(camera.position.x - 58, 84, camera.position.z + 36);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.left = -110;
  sunLight.shadow.camera.right = 110;
  sunLight.shadow.camera.top = 110;
  sunLight.shadow.camera.bottom = -110;
  sunLight.shadow.camera.near = 4;
  sunLight.shadow.camera.far = 230;
  sunLight.shadow.bias = -0.00022;
  sunLight.shadow.normalBias = 0.035;
  sunTarget = new THREE.Object3D();
  sunTarget.position.copy(camera.position);
  scene.add(sunTarget);
  sunLight.target = sunTarget;
  scene.add(sunLight);

  initStreamingAssets();
  refreshWorldChunks(true);
