import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC = path.join(__dirname, 'public');
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : __dirname;
const DATA_FILE = path.join(DATA_DIR, 'world-data.json');
const DATABASE_URL = String(process.env.DATABASE_URL || '').trim();
const PORT = Number(process.env.PORT || 8080);
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
};

function emptyWorld() {
  return { notes: [], terminals: {}, echoes: [] };
}

function normalizeWorld(parsed) {
  return {
    notes: Array.isArray(parsed?.notes) ? parsed.notes : [],
    terminals: parsed?.terminals && typeof parsed.terminals === 'object' ? parsed.terminals : {},
    echoes: Array.isArray(parsed?.echoes) ? parsed.echoes : []
  };
}

let pool = null;
let persistenceMode = DATABASE_URL ? 'postgres' : 'file';
let world = emptyWorld();
let saveTimer = null;
let saveChain = Promise.resolve();

function loadWorldFromFile() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  try {
    return normalizeWorld(JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')));
  } catch {
    return emptyWorld();
  }
}

async function initPersistence() {
  if (!DATABASE_URL) {
    world = loadWorldFromFile();
    persistenceMode = 'file';
    return;
  }

  const isLocal = /localhost|127\.0\.0\.1/.test(DATABASE_URL);
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 4,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS emptynet_state (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const result = await pool.query('SELECT value FROM emptynet_state WHERE key = $1', ['world']);
  if (result.rows.length) {
    world = normalizeWorld(result.rows[0].value);
  } else {
    world = loadWorldFromFile();
    await pool.query(
      'INSERT INTO emptynet_state (key, value) VALUES ($1, $2::jsonb) ON CONFLICT (key) DO NOTHING',
      ['world', JSON.stringify(world)]
    );
  }
  persistenceMode = 'postgres';
}

async function persistWorld() {
  const snapshot = JSON.stringify(world);
  if (pool) {
    await pool.query(
      `INSERT INTO emptynet_state (key, value, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (key)
       DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      ['world', snapshot]
    );
    return;
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(world, null, 2));
}

function saveWorldSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveChain = saveChain
      .then(() => persistWorld())
      .catch(error => console.error('EMPTYNET persistence error:', error));
  }, 250);
}

const server = http.createServer((req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({
      ok: true,
      service: 'emptynet',
      seed: 28031997,
      persistence: persistenceMode,
      clients: [...clients.values()].filter(player => player.joined).length
    }));
    return;
  }

  let pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  if (pathname === '/') pathname = '/index.html';
  const file = path.normalize(path.join(PUBLIC, pathname));
  if (!file.startsWith(PUBLIC)) {
    res.writeHead(403);
    res.end('forbidden');
    return;
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(data);
  });
});

function encodeFrame(text, opcode = 0x1) {
  const payload = Buffer.from(text);
  let header;
  if (payload.length < 126) {
    header = Buffer.from([0x80 | opcode, payload.length]);
  } else if (payload.length <= 0xffff) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(payload.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(payload.length), 2);
  }
  return Buffer.concat([header, payload]);
}

function parseFrames(state, chunk, onText, onClose) {
  state.buffer = Buffer.concat([state.buffer, chunk]);
  while (state.buffer.length >= 2) {
    const b0 = state.buffer[0];
    const b1 = state.buffer[1];
    const opcode = b0 & 0x0f;
    const masked = (b1 & 0x80) !== 0;
    let len = b1 & 0x7f;
    let offset = 2;

    if (len === 126) {
      if (state.buffer.length < 4) return;
      len = state.buffer.readUInt16BE(2);
      offset = 4;
    } else if (len === 127) {
      if (state.buffer.length < 10) return;
      const big = state.buffer.readBigUInt64BE(2);
      if (big > BigInt(1024 * 1024)) {
        onClose();
        return;
      }
      len = Number(big);
      offset = 10;
    }

    let mask;
    if (masked) {
      if (state.buffer.length < offset + 4) return;
      mask = state.buffer.subarray(offset, offset + 4);
      offset += 4;
    }
    if (state.buffer.length < offset + len) return;

    const payload = Buffer.from(state.buffer.subarray(offset, offset + len));
    state.buffer = state.buffer.subarray(offset + len);
    if (masked) {
      for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
    }

    if (opcode === 0x8) {
      onClose();
      return;
    }
    if (opcode === 0x9) {
      state.socket.write(encodeFrame(payload.toString(), 0xA));
      continue;
    }
    if (opcode === 0x1) onText(payload.toString('utf8'));
  }
}

const clients = new Map();
const WORLD_LIMIT = 1000000;
const WORLD_SEED = 28031997;
const ALLOWED_AVATARS = new Set(['wanderer', 'surveyor', 'hermit', 'runner']);

function safeName(name) {
  const clean = String(name || '').replace(/[^a-zA-Z0-9_\-.]/g, '').slice(0, 18);
  return clean || `guest${Math.floor(1000 + Math.random() * 9000)}`;
}

function send(player, data) {
  if (!player.socket.destroyed) player.socket.write(encodeFrame(JSON.stringify(data)));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function publicPlayer(player) {
  return {
    id: player.id,
    name: player.name,
    avatar: player.avatar,
    x: player.x,
    y: player.y,
    z: player.z,
    rot: player.rot,
    zone: player.zone
  };
}

function sendNearbyState() {
  const list = [...clients.values()].filter(player => player.joined);
  for (const player of list) {
    const nearby = list
      .filter(other => other.id !== player.id && distance(player, other) < 46)
      .map(publicPlayer);
    send(player, { type: 'players', players: nearby });
  }
}
setInterval(sendNearbyState, 250).unref();

function recordTrace(player) {
  const now = Date.now();
  if (now - player.lastTraceAt < 850) return;
  const last = player.trace[player.trace.length - 1];
  if (last && Math.hypot(last.x - player.x, last.z - player.z) < 0.75) return;
  player.lastTraceAt = now;
  player.trace.push({ x: Number(player.x.toFixed(2)), z: Number(player.z.toFixed(2)) });
  if (player.trace.length > 70) player.trace.shift();
}

function storeEcho(player) {
  if (!player.joined || player.trace.length < 8) return;
  world.echoes.push({
    id: crypto.randomUUID(),
    name: player.name,
    endedAt: Date.now(),
    points: player.trace.slice(-60)
  });
  world.echoes = world.echoes.slice(-12);
  saveWorldSoon();
}

function handleMessage(player, raw) {
  let msg;
  try { msg = JSON.parse(raw); } catch { return; }

  if (msg.type === 'join') {
    player.name = safeName(msg.name);
    player.avatar = ALLOWED_AVATARS.has(msg.avatar) ? msg.avatar : 'wanderer';
    player.joined = true;
    send(player, { type: 'joined', name: player.name, avatar: player.avatar });
    return;
  }

  if (msg.type === 'move') {
    const x = Number(msg.x);
    const y = Number(msg.y);
    const z = Number(msg.z);
    const rot = Number(msg.rot);
    if ([x, y, z, rot].every(Number.isFinite)) {
      player.x = Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, x));
      player.y = Math.max(-40, Math.min(80, y));
      player.z = Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, z));
      player.rot = rot;
      if (typeof msg.zone === 'string') player.zone = msg.zone.slice(0, 32);
      recordTrace(player);
    }
    return;
  }

  if (msg.type === 'chat') {
    const text = String(msg.text || '').trim().slice(0, 180);
    if (!text) return;
    for (const other of clients.values()) {
      if (other.joined && distance(player, other) <= 22) {
        send(other, { type: 'chat', id: player.id, name: player.name, text, system: false });
      }
    }
    return;
  }

  if (msg.type === 'note') {
    const text = String(msg.text || '').trim().slice(0, 140);
    const x = Number(msg.x);
    const z = Number(msg.z);
    if (!text || !Number.isFinite(x) || !Number.isFinite(z)) return;
    const note = {
      id: crypto.randomUUID(),
      author: player.name,
      text,
      x: Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, x)),
      z: Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, z)),
      zone: player.zone,
      createdAt: Date.now()
    };
    world.notes.push(note);
    if (world.notes.length > 500) world.notes = world.notes.slice(-500);
    saveWorldSoon();
    for (const other of clients.values()) send(other, { type: 'note', note });
    return;
  }

  if (msg.type === 'terminalWrite') {
    const terminalId = String(msg.terminalId || '').slice(0, 40);
    const text = String(msg.text || '').trim().slice(0, 800);
    if (!terminalId || !text) return;
    if (!world.terminals[terminalId]) world.terminals[terminalId] = [];
    world.terminals[terminalId].push({ author: player.name, text, at: Date.now() });
    world.terminals[terminalId] = world.terminals[terminalId].slice(-30);
    saveWorldSoon();
    for (const other of clients.values()) {
      send(other, { type: 'terminalUpdate', terminalId, entries: world.terminals[terminalId] });
    }
  }
}

function disconnect(id, endSocket = false) {
  const player = clients.get(id);
  if (!player) return;
  clients.delete(id);
  storeEcho(player);
  if (endSocket) {
    try { player.socket.end(); } catch { /* ignore */ }
  }
}

server.on('upgrade', (req, socket) => {
  if (req.headers.upgrade?.toLowerCase() !== 'websocket' || !req.headers['sec-websocket-key']) {
    socket.destroy();
    return;
  }

  const accept = crypto
    .createHash('sha1')
    .update(req.headers['sec-websocket-key'] + WS_GUID)
    .digest('base64');

  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
  );

  const id = crypto.randomUUID();
  const player = {
    id,
    socket,
    name: `guest${Math.floor(1000 + Math.random() * 9000)}`,
    joined: false,
    x: 0,
    y: 1.7,
    z: 5,
    rot: 0,
    zone: 'MEADOW',
    avatar: 'wanderer',
    buffer: Buffer.alloc(0),
    trace: [],
    lastTraceAt: 0
  };
  clients.set(id, player);

  send(player, {
    type: 'hello',
    id,
    world: {
      notes: world.notes.slice(-200),
      terminals: world.terminals,
      echoes: world.echoes.slice(-8),
      seed: WORLD_SEED
    }
  });

  socket.on('data', chunk => {
    parseFrames(
      player,
      chunk,
      raw => handleMessage(player, raw),
      () => disconnect(id, true)
    );
  });
  socket.on('close', () => disconnect(id, false));
  socket.on('error', () => disconnect(id, false));
});

async function shutdown(signal) {
  console.log(`EMPTYNET received ${signal}, flushing world state...`);
  clearTimeout(saveTimer);
  try {
    await persistWorld();
    await saveChain;
  } catch (error) {
    console.error('EMPTYNET shutdown persistence error:', error);
  }
  try { await pool?.end(); } catch { /* ignore */ }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 4000).unref();
}

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));

try {
  await initPersistence();
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`EMPTYNET listening on http://localhost:${PORT} [${persistenceMode}]`);
  });
} catch (error) {
  console.error('EMPTYNET failed to initialize persistence:', error);
  try { await pool?.end(); } catch { /* ignore */ }
  process.exit(1);
}
