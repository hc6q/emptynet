const game = document.querySelector('#game');

const canvas = document.createElement('canvas');
canvas.id = 'sky-birds';
canvas.setAttribute('aria-hidden', 'true');
Object.assign(canvas.style, {
  position: 'fixed',
  inset: '0',
  width: '100vw',
  height: '100vh',
  pointerEvents: 'none',
  zIndex: '2',
  opacity: '1'
});
document.body.appendChild(canvas);

const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const WORLD_SEED = 28031997;
const V_FOV = 66 * Math.PI / 180;
const MAX_FLOCKS = prefersReducedMotion ? 3 : 8;

let width = 1;
let height = 1;
let dpr = 1;
let cameraYaw = 0;
let cameraPitch = 0;
let lastTime = performance.now();
let seedState = WORLD_SEED >>> 0;

function random() {
  seedState += 0x6D2B79F5;
  let t = seedState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function wrapAngle(value) {
  while (value > Math.PI) value -= Math.PI * 2;
  while (value < -Math.PI) value += Math.PI * 2;
  return value;
}

function resize() {
  dpr = Math.min(devicePixelRatio || 1, 1.5);
  width = innerWidth;
  height = innerHeight;
  canvas.width = Math.max(1, Math.floor(width * dpr));
  canvas.height = Math.max(1, Math.floor(height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resize();
addEventListener('resize', resize, { passive: true });

addEventListener('mousemove', event => {
  if (document.pointerLockElement) {
    cameraYaw = wrapAngle(cameraYaw - event.movementX * 0.0020);
    cameraPitch = Math.max(-1.25, Math.min(1.25, cameraPitch - event.movementY * 0.0020));
  }
}, { passive: true });

function makeBird(index, count) {
  const row = Math.floor(index / 2);
  const side = index % 2 ? 1 : -1;
  const spread = 0.010 + row * 0.007;
  return {
    angleOffset: side * spread * (1 + row * 0.7) + (random() - 0.5) * 0.004,
    elevationOffset: (random() - 0.5) * 0.020 - row * 0.002,
    depthOffset: (random() - 0.5) * 0.20,
    phase: random() * Math.PI * 2,
    flapRate: 5.2 + random() * 3.2,
    bank: (random() - 0.5) * 0.45,
    count
  };
}

function makeFlock(index) {
  const count = 3 + Math.floor(random() * 6);
  const distance = 130 + random() * 280;
  const birds = [];
  for (let i = 0; i < count; i++) birds.push(makeBird(i, count));
  return {
    id: index,
    azimuth: random() * Math.PI * 2 - Math.PI,
    elevation: 0.10 + random() * 0.36,
    distance,
    speed: (0.010 + random() * 0.016) * (random() < 0.5 ? -1 : 1),
    drift: (random() - 0.5) * 0.0028,
    bobPhase: random() * Math.PI * 2,
    bobRate: 0.22 + random() * 0.23,
    opacity: 0.30 + random() * 0.40,
    birds
  };
}

const flocks = Array.from({ length: MAX_FLOCKS }, (_, index) => makeFlock(index));

function project(azimuth, elevation) {
  const relYaw = wrapAngle(azimuth - cameraYaw);
  const relPitch = elevation - cameraPitch;
  const aspect = width / Math.max(1, height);
  const hFov = 2 * Math.atan(Math.tan(V_FOV / 2) * aspect);
  if (Math.abs(relYaw) > hFov * 0.66 || Math.abs(relPitch) > V_FOV * 0.72) return null;

  const focalX = width / (2 * Math.tan(hFov / 2));
  const focalY = height / (2 * Math.tan(V_FOV / 2));
  return {
    x: width * 0.5 + Math.tan(relYaw) * focalX,
    y: height * 0.52 - Math.tan(relPitch) * focalY,
    relYaw
  };
}

function drawBird(x, y, size, flap, bank, alpha, heading) {
  if (size < 0.45 || x < -30 || x > width + 30 || y < -30 || y > height + 30) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(bank + heading * 0.11);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(22, 29, 30, 0.95)';
  ctx.strokeStyle = 'rgba(16, 23, 24, 0.95)';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const wingLift = flap * size * 0.55;
  const bodyLength = size * 1.55;
  const wingSpan = size * 2.75;

  ctx.beginPath();
  ctx.ellipse(0, 0, bodyLength * 0.34, size * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-size * 0.06, 0);
  ctx.quadraticCurveTo(-wingSpan * 0.34, -size * 0.18 - wingLift, -wingSpan * 0.50, size * 0.06 + wingLift * 0.28);
  ctx.quadraticCurveTo(-wingSpan * 0.25, size * 0.02, -size * 0.02, size * 0.08);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(size * 0.06, 0);
  ctx.quadraticCurveTo(wingSpan * 0.34, -size * 0.18 - wingLift, wingSpan * 0.50, size * 0.06 + wingLift * 0.28);
  ctx.quadraticCurveTo(wingSpan * 0.25, size * 0.02, size * 0.02, size * 0.08);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, size * 0.02);
  ctx.lineTo(-size * 0.28, size * 0.33);
  ctx.lineTo(0, size * 0.20);
  ctx.lineTo(size * 0.28, size * 0.33);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawFlock(flock, timeSeconds) {
  const bob = Math.sin(flock.bobPhase + timeSeconds * flock.bobRate) * 0.014;
  const center = project(flock.azimuth, flock.elevation + bob);
  if (!center) return;

  const distanceScale = Math.max(0.55, Math.min(1.75, 235 / flock.distance));
  const horizonFade = Math.max(0, Math.min(1, (center.y - height * 0.04) / (height * 0.16)));
  const edgeFade = Math.max(0, Math.min(1, (Math.min(center.x, width - center.x) + 60) / 180));
  const baseAlpha = flock.opacity * horizonFade * edgeFade;
  const heading = flock.speed > 0 ? 1 : -1;

  for (let i = 0; i < flock.birds.length; i++) {
    const bird = flock.birds[i];
    const p = project(
      flock.azimuth + bird.angleOffset,
      flock.elevation + bob + bird.elevationOffset
    );
    if (!p) continue;

    const depth = flock.distance * (1 + bird.depthOffset);
    const size = (4.0 + i * 0.08) * Math.max(0.52, Math.min(1.7, 230 / depth)) * distanceScale;
    const flap = Math.sin(timeSeconds * bird.flapRate + bird.phase);
    const alpha = baseAlpha * Math.max(0.45, Math.min(1, 320 / depth));
    drawBird(p.x, p.y, size, flap, bird.bank, alpha, heading);
  }
}

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
  lastTime = now;
  ctx.clearRect(0, 0, width, height);

  if (!game || game.classList.contains('hidden')) return;

  const t = now / 1000;
  for (const flock of flocks) {
    flock.azimuth = wrapAngle(flock.azimuth + flock.speed * dt);
    flock.elevation += Math.sin(t * 0.11 + flock.id) * flock.drift * dt;
    flock.elevation = Math.max(0.08, Math.min(0.52, flock.elevation));
    drawFlock(flock, t);
  }
}
requestAnimationFrame(animate);
