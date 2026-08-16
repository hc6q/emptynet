  const rightInput = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  const moving = !!(forwardInput || rightInput);

  if (moving) {
    camera.getWorldDirection(moveForwardVec);
    moveForwardVec.y = 0;
    if (moveForwardVec.lengthSq() < 0.0001) moveForwardVec.set(0, 0, -1);
    moveForwardVec.normalize();
    moveRightVec.crossVectors(moveForwardVec, camera.up).normalize();
    moveWish.set(0, 0, 0)
      .addScaledVector(moveForwardVec, forwardInput)
      .addScaledVector(moveRightVec, rightInput);
    if (moveWish.lengthSq() > 1) moveWish.normalize();
    moveWish.multiplyScalar(5.3 * dt);

    const tryX = camera.position.clone();
    tryX.x += moveWish.x;
    if (canMoveTo(tryX)) camera.position.x = tryX.x;

    const tryZ = camera.position.clone();
    tryZ.z += moveWish.z;
    if (canMoveTo(tryZ)) camera.position.z = tryZ.z;

    if (now - lastFootstepAt > 470) {
      playFootstep();
      lastFootstepAt = now;
    }
  }

  const ground = terrainHeight(camera.position.x, camera.position.z);
  const bob = moving ? Math.sin(now * 0.012) * 0.016 : 0;
  const targetY = ground + EYE_HEIGHT + bob;
  camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 1 - Math.exp(-dt * 18));
  movingLastFrame = moving;
}

function zoneFromPosition(x, z) {
  if (Math.hypot((x - LAKE.x) / LAKE.rx, (z - LAKE.z) / LAKE.rz) < 1.65) return 'WATER EDGE';
  let dynamicZone = null;
  eachNearbyStructure(x, z, spec => {
    if (dynamicZone) return;
    if (spec.type === 'pond') {
      const d = Math.hypot((x - spec.x) / spec.rx, (z - spec.z) / spec.rz);
      if (d < 1.7) dynamicZone = 'WATER EDGE';
    } else if (Math.hypot(x - spec.x, z - spec.z) < spec.radius + 7) {
      dynamicZone = spec.type === 'cabin' ? 'ABANDONED CABIN' : 'FIELD SHRINE';
    }
  });
  if (dynamicZone) return dynamicZone;
  for (const ruin of RUINS) {
    if (Math.hypot(x - ruin.x, z - ruin.z) < 14 * ruin.scale) return ruin.name;
  }
  for (const terminal of TERMINAL_SITES) {
    if (Math.hypot(x - terminal.x, z - terminal.z) < 8) return 'FIELD TERMINAL';
  }
  const regionX = Math.floor(x / 420);
  const regionZ = Math.floor(z / 420);
  return regionX === 0 && regionZ === 0 ? 'MEADOW' : `FIELD ${regionX}:${regionZ}`;
}

function chooseStalkerAnchor() {
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();
  const candidates = [];
  const seed = intHash(chunkCoord(camera.position.x), chunkCoord(camera.position.z), Math.floor(performance.now() / 15000));
  const rand = mulberry32(seed);
  for (let i = 0; i < 12; i++) {
    const angle = rand() * Math.PI * 2;
    const dist = 40 + rand() * 52;
    const x = camera.position.x + Math.cos(angle) * dist;
    const z = camera.position.z + Math.sin(angle) * dist;
    if (pointInsidePond(x, z, 1.15)) continue;
    const dir = new THREE.Vector3(x - camera.position.x, 0, z - camera.position.z).normalize();
    const dot = forward.dot(dir);
    if (dot < 0.82) candidates.push({ x, z, dist, dot });
  }
  if (!candidates.length) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function spawnStalker(now) {
  const anchor = chooseStalkerAnchor();
  if (!anchor) {
    nextStalkerAt = now + 7000;
    return;
  }
  stalker.anchor = anchor;
  stalker.group.position.set(anchor.x, terrainHeight(anchor.x, anchor.z), anchor.z);
  stalker.group.visible = true;
  stalker.material.opacity = 0;
  stalker.active = true;
  stalker.fading = false;
  stalker.spawnedAt = now;
  playDistantRustle(anchor.x, anchor.z);
}

function beginStalkerFade(now) {
  if (!stalker.active || stalker.fading) return;
