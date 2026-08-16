function hash2(x, z) {
  return fract(Math.sin(x * 127.1 + z * 311.7) * 43758.5453123);
}
function valueNoise(x, z) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz);
  const b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1);
  const d = hash2(ix + 1, iz + 1);
  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(a, b, ux),
    THREE.MathUtils.lerp(c, d, ux),
    uz
  );
}
function fbm(x, z) {
  let total = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < 5; i++) {
    total += valueNoise(x * freq, z * freq) * amp;
    freq *= 2.03;
    amp *= 0.5;
  }
  return total / 0.96875;
}
function broadTerrainHeight(x, z) {
  const broad = (fbm(x * 0.0105 + 11.2, z * 0.0105 - 7.4) - 0.5) * 13.2;
  const longWave = Math.sin(x * 0.017 + 0.8) * Math.cos(z * 0.0135 - 0.35) * 1.8;
  return broad + longWave;
}

function baseTerrainHeight(x, z) {
  const broad = broadTerrainHeight(x, z);
  const rolling = (fbm(x * 0.025 - 4.8, z * 0.025 + 16.1) - 0.5) * 4.4;
  const micro = (fbm(x * 0.055 + 31.4, z * 0.055 - 19.7) - 0.5) * 0.8;
  return broad + rolling + micro;
}

function flattenAround(h, x, z, cx, cz, targetHeight, inner, outer) {
  const d = Math.hypot(x - cx, z - cz);
  if (d >= outer) return h;
  const amount = 1 - smoothstep(inner, outer, d);
  return THREE.MathUtils.lerp(h, targetHeight, amount);
}

function trailPhase() {
  return (WORLD_SEED % 997) * 0.006137;
}

function eastTrailZ(x, lane) {
  const phase = trailPhase() + lane * 1.917;
  const x0 = WORLD_SEED * 0.000013;
  const waveA = 36 * (Math.sin((x + x0) * 0.00415 + phase) - Math.sin(x0 * 0.00415 + phase));
  const waveB = 12 * (Math.sin((x - x0) * 0.0106 + phase * 0.53) - Math.sin((-x0) * 0.0106 + phase * 0.53));
  return lane * TRAIL_SPACING + waveA + waveB;
}

function northTrailX(z, lane) {
  const phase = trailPhase() * 0.83 + lane * 1.341;
  const base = (lane + 0.46) * TRAIL_SPACING;
  const z0 = WORLD_SEED * 0.000011;
  const waveA = 31 * Math.sin((z + z0) * 0.0038 + phase);
  const waveB = 10 * Math.sin((z - z0) * 0.0095 + phase * 0.71);
  return base + waveA + waveB;
}

function proceduralTrailDistance(x, z) {
  let best = Infinity;
  const eastLane = Math.round(z / TRAIL_SPACING);
  for (let lane = eastLane - 1; lane <= eastLane + 1; lane++) {
    best = Math.min(best, Math.abs(z - eastTrailZ(x, lane)));
  }
  const northLane = Math.round((x - TRAIL_SPACING * 0.46) / TRAIL_SPACING);
  for (let lane = northLane - 1; lane <= northLane + 1; lane++) {
    best = Math.min(best, Math.abs(x - northTrailX(z, lane)));
  }
  return best;
}

function structureSpecAtCell(gx, gz) {
  const roll = seededCellValue(gx, gz, 101);
  if (roll > 0.19) return null;

  const jitterX = (seededCellValue(gx, gz, 102) - 0.5) * STRUCTURE_CELL * 0.52;
  const jitterZ = (seededCellValue(gx, gz, 103) - 0.5) * STRUCTURE_CELL * 0.52;
  const x = (gx + 0.5) * STRUCTURE_CELL + jitterX;
  const z = (gz + 0.5) * STRUCTURE_CELL + jitterZ;

  if (Math.hypot(x, z - 5) < 145) return null;
  if (Math.hypot(x - LAKE.x, z - LAKE.z) < 36) return null;
  if (RUINS.some(r => Math.hypot(x - r.x, z - r.z) < 34)) return null;
  if (TERMINAL_SITES.some(t => Math.hypot(x - t.x, z - t.z) < 22)) return null;

  const rot = seededCellValue(gx, gz, 104) * Math.PI * 2;
