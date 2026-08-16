  renderTerminal(data.id);
}

function renderTerminal(id) {
  const entries = terminalData[id] || [];
  terminalLog.textContent = entries.length
    ? entries.map(entry => `${new Date(entry.at).toLocaleString()}  ${entry.author}\n${entry.text}\n`).join('\n')
    : 'NO ENTRIES\n';
  terminalLog.scrollTop = terminalLog.scrollHeight;
}

terminalClose.onclick = () => {
  terminalBox.classList.add('hidden');
  activeTerminal = null;
};
terminalWrite.onclick = () => {
  const text = terminalInput.value.trim();
  if (!text || !activeTerminal) return;
  ws.send(JSON.stringify({ type: 'terminalWrite', terminalId: activeTerminal.id, text }));
  terminalInput.value = '';
};

function canMoveTo(position) {
  if (Math.abs(position.x) > WORLD_SOFT_LIMIT || Math.abs(position.z) > WORLD_SOFT_LIMIT) return false;
  if (pointInsidePond(position.x, position.z, 0.90)) return false;
  const y = terrainHeight(position.x, position.z);
  const currentGround = terrainHeight(camera.position.x, camera.position.z);
  if (Math.abs(y - currentGround) > 0.92) return false;
  const box = new THREE.Box3(
    new THREE.Vector3(position.x - 0.24, y + 0.08, position.z - 0.24),
    new THREE.Vector3(position.x + 0.24, y + 1.72, position.z + 0.24)
  );
  if (colliders.some(collider => collider.intersectsBox(box))) return false;
  for (const record of loadedChunks.values()) {
    if (record.colliders.some(collider => collider.intersectsBox(box))) return false;
  }
  return true;
}

const moveForwardVec = new THREE.Vector3();
const moveRightVec = new THREE.Vector3();
const moveWish = new THREE.Vector3();

function updateMovement(dt, now) {
  if (!controls.isLocked || uiOpen()) {
    movingLastFrame = false;
    return;
  }

  const forwardInput = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
