import * as THREE from 'three';

const WORLD_SEED = 28031997;
const MAX_DISTANCE = 190;
const MASTER_LEVEL = 0.105;

const EMITTERS = [
  { id: 'greyfold-bakehouse', x: -914, z: 1006, interval: 11500, chance: 0.58, kind: 'work', variant: 0 },
  { id: 'greyfold-yard', x: -934, z: 1018, interval: 9000, chance: 0.46, kind: 'cluck', variant: 1 },
  { id: 'greyfold-mill', x: -988, z: 965, interval: 14800, chance: 0.72, kind: 'creak', variant: 0 },
  { id: 'greyfold-road', x: -955, z: 1029, interval: 21000, chance: 0.30, kind: 'voices', variant: 0 },

  { id: 'high-school', x: 1118, z: 1287, interval: 52000, chance: 0.44, kind: 'bell', variant: 1 },
  { id: 'high-orchard', x: 1192, z: 1168, interval: 13000, chance: 0.50, kind: 'wood', variant: 0 },
  { id: 'high-yard', x: 1181, z: 1177, interval: 8800, chance: 0.45, kind: 'cluck', variant: 2 },
  { id: 'high-road', x: 1152, z: 1228, interval: 24000, chance: 0.28, kind: 'voices', variant: 1 },

  { id: 'blackpine-smith', x: 782, z: -585, interval: 7600, chance: 0.78, kind: 'hammer', variant: 0 },
  { id: 'blackpine-smith-second', x: 782, z: -585, interval: 11800, chance: 0.42, kind: 'hammer', variant: 1 },
  { id: 'blackpine-roadworks', x: 728, z: -548, interval: 16200, chance: 0.46, kind: 'wood', variant: 1 },
  { id: 'blackpine-wayhouse', x: 706, z: -520, interval: 26000, chance: 0.24, kind: 'voices', variant: 2 },

  { id: 'old-watch-timber', x: 624, z: -430, interval: 18000, chance: 0.34, kind: 'creak', variant: 2 },
  { id: 'old-watch-crow', x: 618, z: -438, interval: 15500, chance: 0.34, kind: 'crow', variant: 0 }
];

let installed = false;
let api = null;
let ctx = null;
let master = null;
let wet = null;
let dry = null;
let lastTick = 0;
const playedSlots = new Map();
const right = new THREE.Vector3();
const forward = new THREE.Vector3();
const direction = new THREE.Vector3();

function fract(value) {
  return value - Math.floor(value);
}

function hash(value, salt = 0) {
  return fract(Math.sin((value + WORLD_SEED * 0.00013 + salt * 19.17) * 91.3458) * 47453.5453);
}

function audioEnabled() {
  const state = document.querySelector('#audio-state')?.textContent || 'AUDIO ON';
  return state.includes('ON') && !state.includes('OFF') && !state.includes('UNAVAILABLE');
}

function createImpulseResponse(context, duration = 2.5, decay = 2.9) {
  const length = Math.floor(context.sampleRate * duration);
  const impulse = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = last * 0.18 + white * 0.82;
      data[i] = last * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
}

function ensureAudio() {
  if (!api || ctx) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  ctx = new AudioContextClass();
  master = ctx.createGain();
  master.gain.value = audioEnabled() ? MASTER_LEVEL : 0;
  master.connect(ctx.destination);

  dry = ctx.createGain();
  dry.gain.value = 0.78;
  dry.connect(master);

  const convolver = ctx.createConvolver();
  convolver.buffer = createImpulseResponse(ctx);
  wet = ctx.createGain();
  wet.gain.value = 0.24;
  convolver.connect(wet).connect(master);

  const reverbSend = ctx.createGain();
  reverbSend.gain.value = 0.55;
  reverbSend.connect(convolver);
  master.userData = { reverbSend };

  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
}

function syncAudioState() {
  if (!ctx || !master) return;
  const target = audioEnabled() ? MASTER_LEVEL : 0;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.linearRampToValueAtTime(target, ctx.currentTime + 0.12);
  if (audioEnabled() && ctx.state === 'suspended') ctx.resume().catch(() => {});
}

function spatial(sourceX, sourceZ, maxDistance = MAX_DISTANCE) {
  if (!api?.camera) return null;
  const camera = api.camera;
  const dx = sourceX - camera.position.x;
  const dz = sourceZ - camera.position.z;
  const distance = Math.hypot(dx, dz);
  if (distance > maxDistance) return null;

  camera.getWorldDirection(forward);
  forward.y = 0;
  if (forward.lengthSq() < 0.0001) forward.set(0, 0, -1);
  forward.normalize();
  right.crossVectors(forward, camera.up).normalize();
  direction.set(dx, 0, dz);
  if (direction.lengthSq() > 0.0001) direction.normalize();

  const pan = THREE.MathUtils.clamp(right.dot(direction), -0.92, 0.92);
  const normalized = THREE.MathUtils.clamp(distance / maxDistance, 0, 1);
  const attenuation = Math.pow(1 - normalized, 1.7);
  return { distance, pan, attenuation };
}

function outputChain(x, z, baseGain, maxDistance = MAX_DISTANCE) {
  const info = spatial(x, z, maxDistance);
  if (!info || !ctx || !dry || !master?.userData?.reverbSend) return null;

  const gain = ctx.createGain();
  gain.gain.value = Math.max(0.0001, baseGain * info.attenuation);
  const pan = ctx.createStereoPanner();
  pan.pan.value = info.pan;
  gain.connect(pan);
  pan.connect(dry);
  pan.connect(master.userData.reverbSend);
  return { input: gain, info };
}

function noiseBuffer(seconds) {
  const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * seconds)), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function playHammer(emitter, strength) {
  const chain = outputChain(emitter.x, emitter.z, 0.28 * strength, 220);
  if (!chain) return;
  const now = ctx.currentTime;
  const strikes = emitter.variant ? [0, 0.31] : [0, 0.22, 0.47];
  for (const delay of strikes) {
    const t = now + delay;
    [178, 356, 534, 742].forEach((frequency, index) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = frequency * (1 + emitter.variant * 0.012 + index * 0.0018);
      const gain = ctx.createGain();
      const peak = 0.72 / (index + 1.5);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(peak, t + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.48 + index * 0.16);
      osc.connect(gain).connect(chain.input);
      osc.start(t);
      osc.stop(t + 1.2);
    });
  }
}

function playWood(emitter, strength) {
  const chain = outputChain(emitter.x, emitter.z, 0.12 * strength, 155);
  if (!chain) return;
  const now = ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(0.10);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = emitter.variant ? 310 : 240;
  filter.Q.value = 0.8;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.75, now + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.085);
  source.connect(filter).connect(gain).connect(chain.input);
  source.start(now);
}

function playWork(emitter, strength) {
  const chain = outputChain(emitter.x, emitter.z, 0.085 * strength, 130);
  if (!chain) return;
  const now = ctx.currentTime;
  [0, 0.16 + hash(Date.now(), 2) * 0.10].forEach((delay, index) => {
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer(0.13);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 260 + index * 80;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now + delay);
    gain.gain.exponentialRampToValueAtTime(0.62, now + delay + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.12);
    source.connect(filter).connect(gain).connect(chain.input);
    source.start(now + delay);
  });
}

function playCreak(emitter, strength) {
  const chain = outputChain(emitter.x, emitter.z, 0.045 * strength, 165);
  if (!chain) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(118 + emitter.variant * 11, now);
  osc.frequency.linearRampToValueAtTime(164 + emitter.variant * 9, now + 0.46);
  osc.frequency.linearRampToValueAtTime(103 + emitter.variant * 7, now + 1.05);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 520;
  filter.Q.value = 0.75;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.50, now + 0.12);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);
  osc.connect(filter).connect(gain).connect(chain.input);
  osc.start(now);
  osc.stop(now + 1.2);
}

function playCluck(emitter, strength) {
  const chain = outputChain(emitter.x, emitter.z, 0.044 * strength, 105);
  if (!chain) return;
  const now = ctx.currentTime;
  const count = 2 + (emitter.variant % 2);
  for (let i = 0; i < count; i++) {
    const t = now + i * (0.11 + emitter.variant * 0.025);
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(390 + emitter.variant * 45, t);
    osc.frequency.exponentialRampToValueAtTime(250 + emitter.variant * 30, t + 0.075);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.48, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
    osc.connect(gain).connect(chain.input);
    osc.start(t);
    osc.stop(t + 0.13);
  }
}

function playCrow(emitter, strength) {
  const chain = outputChain(emitter.x, emitter.z, 0.035 * strength, 145);
  if (!chain) return;
  const now = ctx.currentTime;
  [0, 0.33].forEach((delay, index) => {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(410 - index * 35, now + delay);
    osc.frequency.exponentialRampToValueAtTime(245, now + delay + 0.18);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1150;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now + delay);
    gain.gain.exponentialRampToValueAtTime(0.23, now + delay + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.24);
    osc.connect(filter).connect(gain).connect(chain.input);
    osc.start(now + delay);
    osc.stop(now + delay + 0.27);
  });
}

function playBell(emitter, strength) {
  const chain = outputChain(emitter.x, emitter.z, 0.12 * strength, 260);
  if (!chain) return;
  const now = ctx.currentTime;
  [196, 391, 586, 818].forEach((frequency, index) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = frequency * (1 + emitter.variant * 0.003);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.34 / (index + 1), now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.6 + index * 0.28);
    osc.connect(gain).connect(chain.input);
    osc.start(now);
    osc.stop(now + 4.7);
  });
}

function playVoices(emitter, strength) {
  const chain = outputChain(emitter.x, emitter.z, 0.016 * strength, 115);
  if (!chain) return;
  const now = ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(1.55);
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 520 + emitter.variant * 90;
  band.Q.value = 1.15;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.42, now + 0.22);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.72);
  gain.gain.linearRampToValueAtTime(0.36, now + 1.06);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.52);
  source.connect(band).connect(gain).connect(chain.input);
  source.start(now);
}

function playEmitter(emitter, strength) {
  if (!ctx || ctx.state !== 'running' || !audioEnabled()) return;
  if (emitter.kind === 'hammer') playHammer(emitter, strength);
  else if (emitter.kind === 'wood') playWood(emitter, strength);
  else if (emitter.kind === 'work') playWork(emitter, strength);
  else if (emitter.kind === 'creak') playCreak(emitter, strength);
  else if (emitter.kind === 'cluck') playCluck(emitter, strength);
  else if (emitter.kind === 'crow') playCrow(emitter, strength);
  else if (emitter.kind === 'bell') playBell(emitter, strength);
  else if (emitter.kind === 'voices') playVoices(emitter, strength);
}

function update(now) {
  requestAnimationFrame(update);
  if (!api || now - lastTick < 400) return;
  lastTick = now;
  if (!ctx || ctx.state !== 'running' || !audioEnabled()) return;

  const wallNow = Date.now();
  for (let index = 0; index < EMITTERS.length; index++) {
    const emitter = EMITTERS[index];
    const dx = emitter.x - api.camera.position.x;
    const dz = emitter.z - api.camera.position.z;
    const distance = Math.hypot(dx, dz);
    const audibleDistance = emitter.kind === 'bell' ? 260 : emitter.kind === 'hammer' ? 220 : MAX_DISTANCE;
    if (distance > audibleDistance) continue;

    const slot = Math.floor(wallNow / emitter.interval);
    if (playedSlots.get(emitter.id) === slot) continue;
    playedSlots.set(emitter.id, slot);

    const roll = hash(slot + index * 113, index + emitter.variant * 7);
    if (roll > emitter.chance) continue;
    const strength = 0.82 + hash(slot, index + 71) * 0.34;
    playEmitter(emitter, strength);
  }
}

function install(worldApi) {
  if (installed || !worldApi?.camera || !worldApi?.scene || !worldApi?.terrainHeight) return;
  installed = true;
  api = worldApi;

  const start = () => {
    ensureAudio();
    syncAudioState();
  };
  document.addEventListener('pointerdown', start, { passive: true });
  document.addEventListener('keydown', start, { passive: true });

  const stateEl = document.querySelector('#audio-state');
  if (stateEl) new MutationObserver(syncAudioState).observe(stateEl, { childList: true, characterData: true, subtree: true });

  requestAnimationFrame(update);
}

if (window.EMPTYNET_WORLD_API) install(window.EMPTYNET_WORLD_API);
window.addEventListener('emptynet:world-ready', event => install(event.detail), { once: true });
