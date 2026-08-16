  const frequencies = [65.41, 98.00, 146.83, 220.00];
  frequencies.forEach((frequency, index) => {
    const osc = audioCtx.createOscillator();
    osc.type = index % 2 ? 'triangle' : 'sine';
    osc.frequency.value = frequency;
    osc.detune.value = (index - 1.5) * 2.8;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 480 + index * 130;
    const gain = audioCtx.createGain();
    gain.gain.value = index === 0 ? 0.045 : 0.018;
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    lfo.frequency.value = 0.018 + index * 0.006;
    lfoGain.gain.value = index === 0 ? 0.012 : 0.006;
    lfo.connect(lfoGain).connect(gain.gain);
    osc.connect(filter).connect(gain).connect(ambientBus);
    osc.start();
    lfo.start();
  });
}

function scheduleBird() {
  if (!audioCtx) return;
  setTimeout(() => {
    if (audioEnabled && audioCtx?.state === 'running' && Math.random() < 0.72) playBird();
    scheduleBird();
  }, 6500 + Math.random() * 9500);
}

function playBird() {
  const now = audioCtx.currentTime;
  const pan = audioCtx.createStereoPanner();
  pan.pan.value = Math.random() * 1.5 - 0.75;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.014, now + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1500 + Math.random() * 300, now);
  osc.frequency.exponentialRampToValueAtTime(2400 + Math.random() * 500, now + 0.16);
  osc.frequency.exponentialRampToValueAtTime(1750 + Math.random() * 250, now + 0.43);
  osc.connect(gain).connect(pan).connect(ambientBus);
  osc.start(now);
  osc.stop(now + 0.58);
}

function scheduleBell() {
  if (!audioCtx) return;
  setTimeout(() => {
    if (audioEnabled && audioCtx?.state === 'running' && Math.random() < 0.70) playBell();
    scheduleBell();
  }, 36000 + Math.random() * 42000);
}

function playBell() {
  const now = audioCtx.currentTime;
  const pan = audioCtx.createStereoPanner();
  pan.pan.value = Math.random() * 1.2 - 0.6;
  const partials = [196, 392.7, 588.8, 823.4];
  partials.forEach((freq, index) => {
    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq * (0.995 + Math.random() * 0.01);
    const gain = audioCtx.createGain();
    const peak = 0.026 / (index + 1);
    gain.gain.setValueAtTime(peak, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.3 + index * 0.5);
    osc.connect(gain).connect(pan).connect(ambientBus);
    osc.start(now);
    osc.stop(now + 5.2);
  });
}

function playFootstep() {
  if (!audioEnabled || !audioCtx || audioCtx.state !== 'running') return;
  const now = audioCtx.currentTime;
  const buffer = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * 0.08), audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2.2);
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 260 + Math.random() * 90;
  const gain = audioCtx.createGain();
  gain.gain.value = 0.045;
  source.connect(filter).connect(gain).connect(masterGain);
  source.start(now);
}

function playDistantRustle(worldX, worldZ) {
  if (!audioEnabled || !audioCtx || audioCtx.state !== 'running') return;
  const right = new THREE.Vector3();
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();
  right.crossVectors(forward, camera.up).normalize();
