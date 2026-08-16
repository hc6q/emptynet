import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';

const OUT = path.resolve('public/assets');
const USER_AGENT = 'EMPTYNET/0.8 (+https://github.com/hc6q/emptynet)';
await fs.mkdir(OUT, { recursive: true });

async function exists(file) {
  try { await fs.access(path.join(OUT, file)); return true; } catch { return false; }
}

function collectUrls(value, out = []) {
  if (typeof value === 'string' && /^https?:\/\//.test(value)) out.push(value);
  else if (Array.isArray(value)) value.forEach(v => collectUrls(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach(v => collectUrls(v, out));
  return out;
}

async function getFiles(asset) {
  const response = await fetch(`https://api.polyhaven.com/files/${asset}`, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }
  });
  if (!response.ok) throw new Error(`Poly Haven files/${asset}: ${response.status}`);
  return collectUrls(await response.json());
}

function pick(urls, patterns) {
  for (const pattern of patterns) {
    const match = urls.find(url => pattern.test(url));
    if (match) return match;
  }
  return null;
}

async function download(url, filename) {
  if (await exists(filename)) return;
  if (!url) throw new Error(`No source URL found for ${filename}`);
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) throw new Error(`Download failed ${response.status}: ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(path.join(OUT, filename), bytes);
  console.log(`asset ${filename} <- ${url}`);
}

async function textureSet(asset, prefix) {
  const urls = await getFiles(asset);
  const diff = pick(urls, [/_diff_1k\.(jpg|jpeg)$/i, /_diff_1k\.png$/i, /_diff_2k\.(jpg|jpeg)$/i]);
  const normal = pick(urls, [/_nor_gl_1k\.(jpg|jpeg)$/i, /_nor_gl_1k\.png$/i, /_nor_gl_2k\.(jpg|jpeg)$/i]);
  const rough = pick(urls, [/_rough_1k\.(jpg|jpeg)$/i, /_rough_1k\.png$/i, /_arm_1k\.(jpg|jpeg)$/i, /_arm_1k\.png$/i]);
  await download(diff, `${prefix}_color.jpg`);
  await download(normal, `${prefix}_normal.jpg`);
  await download(rough, `${prefix}_rough.jpg`);
}

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type);
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  typeBuf.copy(out, 4);
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 8 + data.length);
  return out;
}

function encodePng(width, height, pixelFn) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a = 255] = pixelFn(x, y);
      const i = row + 1 + x * 4;
      raw[i] = r; raw[i + 1] = g; raw[i + 2] = b; raw[i + 3] = a;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4);
  header[8] = 8; header[9] = 6; header[10] = 0; header[11] = 0; header[12] = 0;
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

function seededNoise(x, y) {
  const n = Math.sin(x * 12.9898 + y * 78.233 + 28031997 * 0.001) * 43758.5453;
  return n - Math.floor(n);
}

async function generateLocalTextures() {
  if (!(await exists('noise.png'))) {
    const png = encodePng(64, 64, (x, y) => {
      const v = Math.floor(seededNoise(x, y) * 255);
      return [v, v, v, 255];
    });
    await fs.writeFile(path.join(OUT, 'noise.png'), png);
  }
  if (!(await exists('water_normal.jpg'))) {
    const png = encodePng(128, 128, (x, y) => {
      const h = (xx, yy) => Math.sin(xx * 0.22) * 0.55 + Math.cos(yy * 0.18) * 0.45 + (seededNoise(xx, yy) - 0.5) * 0.35;
      const dx = h(x + 1, y) - h(x - 1, y);
      const dy = h(x, y + 1) - h(x, y - 1);
      let nx = -dx * 0.45, ny = -dy * 0.45, nz = 1;
      const len = Math.hypot(nx, ny, nz); nx /= len; ny /= len; nz /= len;
      return [Math.floor((nx * 0.5 + 0.5) * 255), Math.floor((ny * 0.5 + 0.5) * 255), Math.floor((nz * 0.5 + 0.5) * 255), 255];
    });
    await fs.writeFile(path.join(OUT, 'water_normal.jpg'), png);
  }
}

const skyUrls = await getFiles('kloppenheim_03_puresky');
await download(
  pick(skyUrls, [/1k.*\.jpg$/i, /2k.*\.jpg$/i, /tonemapped.*\.jpg$/i, /\.jpg$/i]),
  'sky_kloppenheim.jpg'
);
await textureSet('leafy_grass', 'grass');
await textureSet('dirt_floor', 'path');
const stoneUrls = await getFiles('stone_wall');
await download(pick(stoneUrls, [/_diff_1k\.(jpg|jpeg)$/i, /_diff_1k\.png$/i]), 'stone_diffuse.jpg');
await download(pick(stoneUrls, [/_nor_gl_1k\.(jpg|jpeg)$/i, /_nor_gl_1k\.png$/i]), 'stone_normal.jpg');
await download(pick(stoneUrls, [/_rough_1k\.(jpg|jpeg)$/i, /_rough_1k\.png$/i, /_arm_1k\.(jpg|jpeg)$/i, /_arm_1k\.png$/i]), 'stone_rough.jpg');
await generateLocalTextures();

console.log('EMPTYNET assets ready.');
