  if (event.code === 'KeyT' && !uiOpen()) { event.preventDefault(); openPrompt('LOCAL CHAT', 'chat'); }
  if (event.code === 'KeyN' && !uiOpen()) { event.preventDefault(); openPrompt('LEAVE NOTE', 'note'); }
  if (event.code === 'KeyE' && !uiOpen()) interact();
  if (event.code === 'KeyM') toggleAudio();
}

function openPrompt(title, mode) {
  controls.unlock();
  promptMode = mode;
  promptTitle.textContent = title;
  promptText.value = '';
  promptBox.classList.remove('hidden');
  setTimeout(() => promptText.focus(), 20);
}

promptCancel.onclick = () => {
  promptBox.classList.add('hidden');
  promptMode = null;
};
promptOk.onclick = () => {
  const text = promptText.value.trim();
  if (!text) return;
  if (promptMode === 'chat') ws.send(JSON.stringify({ type: 'chat', text }));
  if (promptMode === 'note') ws.send(JSON.stringify({ type: 'note', text, x: camera.position.x, z: camera.position.z }));
  promptBox.classList.add('hidden');
  promptMode = null;
};
promptText.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    promptOk.click();
  }
});

function interact() {
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = ray.intersectObjects(interactives, false);
  if (!hits.length || hits[0].distance > 2.8) return;
  const data = hits[0].object.userData;
  if (data.type === 'terminal') openTerminal(data);
  if (data.type === 'note') addFeed(`NOTE // ${data.note.author}: ${data.note.text}`, true, 14000);
}

function openTerminal(data) {
  activeTerminal = data;
  controls.unlock();
  terminalTitle.textContent = data.title;
  terminalBox.classList.remove('hidden');
  terminalInput.value = '';
