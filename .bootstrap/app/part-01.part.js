let lastChunkCX = Number.NaN;
let lastChunkCZ = Number.NaN;
let lastChunkRefreshAt = 0;
let worldMaterials = {};
let worldGeometry = {};
let sunLight = null;
let sunTarget = null;

function addFeed(text, system = false, lifespan = 10000) {
  const line = document.createElement('div');
  line.className = `line${system ? ' system' : ''}`;
  line.textContent = text;
  feed.appendChild(line);
  while (feed.children.length > 8) feed.removeChild(feed.firstChild);
  setTimeout(() => { line.style.opacity = '.28'; }, lifespan);
}

function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  connectBtn.disabled = true;
  statusEl.textContent = 'CONNECTING';
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${proto}://${location.host}`);

  ws.addEventListener('open', () => {
    statusEl.textContent = 'OPEN';
    ws.send(JSON.stringify({ type: 'join', name: nameInput.value, avatar: selectedAvatar }));
  });
  ws.addEventListener('close', () => {
    statusEl.textContent = 'LOST';
    connectBtn.disabled = false;
    if (joined) addFeed('CONNECTION LOST', true);
  });
  ws.addEventListener('error', () => {
    statusEl.textContent = 'ERROR';
    connectBtn.disabled = false;
  });
  ws.addEventListener('message', event => {
    try { handleMessage(JSON.parse(event.data)); } catch { /* ignore malformed packets */ }
  });
}

async function handleMessage(msg) {
  if (msg.type === 'hello') {
    myId = msg.id;
    terminalData = msg.world?.terminals || {};
    pendingNotes = msg.world?.notes || [];
    worldEchoes = msg.world?.echoes || [];
    return;
  }

  if (msg.type === 'joined') {
    myName = msg.name;
    if (msg.avatar) selectedAvatar = msg.avatar;
    joined = true;
    statusEl.textContent = 'OPEN';
    gate.classList.add('hidden');
    game.classList.remove('hidden');
    try {
      await init3D();
      addFeed(`CONNECTED AS ${myName}`, true);
      setTimeout(() => addFeed('No directory of connected users is available.', true), 1200);
    } catch (error) {
      console.error(error);
      loadingEl.textContent = 'failed to enter field';
      addFeed('RENDER INITIALIZATION FAILED', true);
    }
    return;
  }

  if (msg.type === 'players') syncPlayers(msg.players || []);
  if (msg.type === 'chat') addFeed(`[${msg.name}]: ${msg.text}`, !!msg.system);
  if (msg.type === 'note') createNote(msg.note);
  if (msg.type === 'terminalUpdate') {
    terminalData[msg.terminalId] = msg.entries || [];
    if (activeTerminal?.id === msg.terminalId) renderTerminal(activeTerminal.id);
  }
}

connectBtn.addEventListener('click', connect);
nameInput.addEventListener('keydown', event => { if (event.key === 'Enter') connect(); });
avatarCards.forEach(card => card.addEventListener('click', () => {
  avatarCards.forEach(other => other.classList.remove('active'));
  card.classList.add('active');
  selectedAvatar = card.dataset.avatar || 'wanderer';
}));

async function init3D() {
  if (initialized) return;
  initialized = true;
  loadingEl.classList.remove('done');
  loadingEl.textContent = 'loading field…';

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xa8c9d4, 0.0039);

  camera = new THREE.PerspectiveCamera(66, innerWidth / innerHeight, 0.08, 720);
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
