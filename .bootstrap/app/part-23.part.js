  const dir = new THREE.Vector3(worldX - camera.position.x, 0, worldZ - camera.position.z).normalize();
  const panValue = THREE.MathUtils.clamp(right.dot(dir), -0.85, 0.85);

  const now = audioCtx.currentTime;
  const buffer = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * 0.7), audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const env = Math.sin(Math.PI * i / data.length) * Math.pow(1 - i / data.length, 0.8);
    data[i] = (Math.random() * 2 - 1) * env;
  }
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 650;
  filter.Q.value = 0.55;
  const pan = audioCtx.createStereoPanner();
  pan.pan.value = panValue;
  const gain = audioCtx.createGain();
  gain.gain.value = 0.025;
  source.connect(filter).connect(pan).connect(gain).connect(masterGain);
  source.start(now);
}

function toggleAudio() {
  audioEnabled = !audioEnabled;
  audioStateEl.textContent = audioEnabled ? 'AUDIO ON' : 'AUDIO OFF';
  if (masterGain && audioCtx) {
    masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
    masterGain.gain.linearRampToValueAtTime(audioEnabled ? 0.22 : 0, audioCtx.currentTime + 0.18);
  }
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const now = performance.now();

  updateMovement(dt, now);
  refreshWorldChunks(false);
  updateRemotePlayers(dt);
  updateWorldEffects(now, dt);

  if (!Number.isFinite(camera.position.x) || !Number.isFinite(camera.position.z)) {
    camera.position.set(0, terrainHeight(0, 5) + EYE_HEIGHT, 5);
    refreshWorldChunks(true);
  }

  if (sunLight && sunTarget) {
    sunTarget.position.set(camera.position.x, terrainHeight(camera.position.x, camera.position.z), camera.position.z);
    sunLight.position.set(camera.position.x - 58, camera.position.y + 84, camera.position.z + 36);
  }

  currentZone = zoneFromPosition(camera.position.x, camera.position.z);
  roomEl.textContent = currentZone;
  coordsEl.textContent = `${camera.position.x.toFixed(1)} / ${camera.position.z.toFixed(1)}\nSEED 28031997 · v0.8.0`;
  updateHint();

  if (ws?.readyState === WebSocket.OPEN && now - lastMoveSend > 90) {
    const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    ws.send(JSON.stringify({
      type: 'move',
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
      rot: euler.y,
      zone: currentZone
    }));
    lastMoveSend = now;
  }

  renderer.render(scene, camera);
}

function updateHint() {
  if (uiOpen()) {
    hintEl.classList.remove('on');
    return;
  }
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = ray.intersectObjects(interactives, false);
  if (hits.length && hits[0].distance < 2.8) {
    hintEl.textContent = `E  ${hits[0].object.userData.name || 'INTERACT'}`;
    hintEl.classList.add('on');
  } else {
    hintEl.classList.remove('on');
  }
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
}
