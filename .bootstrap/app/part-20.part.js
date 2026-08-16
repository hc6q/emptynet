  stalker.fading = true;
  stalker.fadeStart = now;
}

function updateStalker(now, dt) {
  if (!stalker) return;
  if (!stalker.active) {
    if (now >= nextStalkerAt) spawnStalker(now);
    return;
  }

  stalker.group.lookAt(camera.position.x, stalker.group.position.y + 1.35, camera.position.z);
  const age = now - stalker.spawnedAt;
  const toStalker = stalker.group.position.clone().sub(camera.position);
  toStalker.y = 0;
  const dist = toStalker.length();
  toStalker.normalize();
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();
  const dot = forward.dot(toStalker);

  if (!stalker.fading) {
    const fadeIn = smoothstep(0, 1800, age);
    const fogFade = smoothstep(100, 25, dist);
    stalker.material.opacity = stalker.maxOpacity * fadeIn * THREE.MathUtils.clamp(fogFade, 0.32, 1);
    if ((dot > 0.975 && age > 900) || dist < 18 || age > 11500) beginStalkerFade(now);
  } else {
    const t = (now - stalker.fadeStart) / 560;
    stalker.material.opacity = stalker.maxOpacity * Math.max(0, 1 - t);
    if (t >= 1) {
      stalker.active = false;
      stalker.fading = false;
      stalker.group.visible = false;
      stalker.material.opacity = 0;
      nextStalkerAt = now + 21000 + Math.random() * 33000;
    }
  }
}

function maybeSignalGlitch(now) {
  if (players.size || now < nextSignalGlitchAt) return;
  nextSignalGlitchAt = now + 42000 + Math.random() * 45000;
  if (Math.random() > 0.62) return;
  clearTimeout(signalGlitchTimer);
  presenceEl.textContent = '1 SIGNAL NEARBY';
  signalGlitchTimer = setTimeout(() => {
    if (!players.size) presenceEl.textContent = 'NO LOCAL SIGNALS';
  }, 480 + Math.random() * 520);
}

function prepareGhostPlayback() {
  if (!worldEchoes.length) return;
  const echo = worldEchoes[worldEchoes.length - 1];
  if (!echo?.points?.length || echo.points.length < 6) return;
  const ghost = playerMesh('', true);
  ghost.visible = false;
  ghostPlayback = { ghost, echo, active: false, startAt: 0, duration: 17000 + Math.random() * 7000 };
}

function startGhost(now) {
  if (!ghostPlayback || ghostPlayback.active) return;
  const points = ghostPlayback.echo.points;
  const farEnough = points.some(point => Math.hypot(point.x - camera.position.x, point.z - camera.position.z) > 22);
  if (!farEnough) {
    nextGhostAt = now + 20000;
    return;
  }
  ghostPlayback.active = true;
  ghostPlayback.startAt = now;
  ghostPlayback.duration = 16000 + Math.random() * 7000;
  ghostPlayback.ghost.visible = true;
}

function updateGhost(now) {
  if (!ghostPlayback) return;
  if (!ghostPlayback.active) {
    if (now >= nextGhostAt && Math.random() < 0.01) startGhost(now);
    return;
  }

  const t = (now - ghostPlayback.startAt) / ghostPlayback.duration;
  if (t >= 1) {
    ghostPlayback.active = false;
    ghostPlayback.ghost.visible = false;
    ghostPlayback.ghost.userData.material.opacity = 0;
    nextGhostAt = now + 70000 + Math.random() * 50000;
    return;
  }

  const points = ghostPlayback.echo.points;
  const f = t * (points.length - 1);
  const i = Math.floor(f);
  const a = points[Math.min(i, points.length - 1)];
  const b = points[Math.min(i + 1, points.length - 1)];
  const localT = f - i;
  const x = THREE.MathUtils.lerp(a.x, b.x, localT);
  const z = THREE.MathUtils.lerp(a.z, b.z, localT);
  ghostPlayback.ghost.position.set(x, terrainHeight(x, z), z);
