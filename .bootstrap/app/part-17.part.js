}

function syncPlayers(list) {
  const seen = new Set();
  for (const p of list) {
    seen.add(p.id);
    let obj = players.get(p.id);
    if (!obj) {
      obj = playerMesh(p.name, false, p.avatar || 'wanderer');
      obj.userData.target = new THREE.Vector3(p.x, terrainHeight(p.x, p.z), p.z);
      obj.position.copy(obj.userData.target);
      players.set(p.id, obj);
      addFeed(`${p.name} entered local range`, true);
    }
    obj.userData.target.set(p.x, terrainHeight(p.x, p.z), p.z);
    obj.userData.targetRotation = p.rot;
  }
  for (const [id, obj] of players) {
    if (!seen.has(id)) {
      scene.remove(obj);
      players.delete(id);
    }
  }
  updatePresenceLabel();
}

function updateRemotePlayers(dt) {
  for (const obj of players.values()) {
    const before = obj.position.clone();
    obj.position.lerp(obj.userData.target, 1 - Math.exp(-dt * 8));
    const targetRot = obj.userData.targetRotation ?? obj.rotation.y;
    obj.rotation.y = THREE.MathUtils.lerp(obj.rotation.y, targetRot, 1 - Math.exp(-dt * 10));

    const travelled = obj.position.distanceTo(before);
    const motion = THREE.MathUtils.clamp(travelled / Math.max(dt, 0.001) / 4.0, 0, 1);
    obj.userData.walkPhase += dt * (2.0 + motion * 7.0);
    const swing = Math.sin(obj.userData.walkPhase) * 0.48 * motion;
    if (obj.userData.leftLeg) obj.userData.leftLeg.rotation.x = swing;
    if (obj.userData.rightLeg) obj.userData.rightLeg.rotation.x = -swing;
    if (obj.userData.leftArm) obj.userData.leftArm.rotation.x = -swing * 0.72;
    if (obj.userData.rightArm) obj.userData.rightArm.rotation.x = swing * 0.72;
  }
}

function updatePresenceLabel() {
  presenceEl.textContent = players.size ? `${players.size} SIGNAL${players.size > 1 ? 'S' : ''} NEARBY` : 'NO LOCAL SIGNALS';
}

function createNote(note) {
  if (!scene || notes.has(note.id)) return;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  g.fillStyle = '#d8d2bd';
  g.fillRect(0, 0, 512, 256);
  g.fillStyle = '#2f332e';
  g.font = '21px ui-monospace, monospace';
  wrapText(g, note.text, 22, 48, 468, 28);
  g.fillStyle = '#666a62';
  g.font = '15px ui-monospace, monospace';
  g.fillText(`// ${note.author}`, 22, 230);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.93, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.52), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = (hash2(note.x, note.z) - 0.5) * 0.25;
  mesh.position.set(note.x, terrainHeight(note.x, note.z) + 0.075, note.z);
  mesh.userData = { type: 'note', name: 'NOTE', note };
  mesh.receiveShadow = true;
  scene.add(mesh);
  interactives.push(mesh);
  notes.set(note.id, mesh);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  for (const word of words) {
    const test = `${line}${word} `;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = `${word} `;
      y += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, y);
}

function uiOpen() {
  return !promptBox.classList.contains('hidden') || !terminalBox.classList.contains('hidden');
}

function onKeyDown(event) {
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  keys[event.code] = true;
  if (!joined || !initialized) return;
