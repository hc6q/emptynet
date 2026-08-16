  if (a && b) ghostPlayback.ghost.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
  const fade = Math.sin(Math.PI * t);
  const dist = Math.hypot(x - camera.position.x, z - camera.position.z);
  ghostPlayback.ghost.userData.material.opacity = dist < 16 ? 0 : 0.14 * fade;
}

function updateWorldEffects(now, dt) {
  updateStalker(now, dt);
  updateGhost(now);
  maybeSignalGlitch(now);

  if (waterNormal) {
    waterNormal.offset.x = (now * 0.000011) % 1;
    waterNormal.offset.y = (now * 0.000006) % 1;
  }

  for (const child of scene.children) {
    if (child.userData?.pollen) {
      child.rotation.y += dt * 0.003;
      child.position.x = Math.sin(now * 0.00008) * 0.8;
      break;
    }
  }
}

function startAudio() {
  if (audioCtx) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    audioEnabled = false;
    audioStateEl.textContent = 'AUDIO UNAVAILABLE';
    return;
  }

  audioCtx = new AudioContextClass();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = audioEnabled ? 0.22 : 0;
  masterGain.connect(audioCtx.destination);

  ambientBus = audioCtx.createGain();
  ambientBus.gain.value = 0.52;
  dryGain = audioCtx.createGain();
  dryGain.gain.value = 0.70;
  reverbGain = audioCtx.createGain();
  reverbGain.gain.value = 0.40;
  ambientBus.connect(dryGain).connect(masterGain);

  const convolver = audioCtx.createConvolver();
  convolver.buffer = createImpulseResponse(audioCtx, 4.8, 2.8);
  ambientBus.connect(convolver).connect(reverbGain).connect(masterGain);

  createWindBed();
  createAmbientPad();
  scheduleBird();
  scheduleBell();
}

function createImpulseResponse(ctx, duration, decay) {
  const length = Math.floor(ctx.sampleRate * duration);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      const envelope = Math.pow(1 - i / length, decay);
      data[i] = (Math.random() * 2 - 1) * envelope;
    }
  }
  return impulse;
}

function createWindBed() {
  const length = audioCtx.sampleRate * 4;
  const buffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    last = last * 0.985 + white * 0.015;
    data[i] = last * 2.4;
  }
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const band = audioCtx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 420;
  band.Q.value = 0.35;
  const gain = audioCtx.createGain();
  gain.gain.value = 0.11;
  const lfo = audioCtx.createOscillator();
  const lfoGain = audioCtx.createGain();
  lfo.frequency.value = 0.07;
  lfoGain.gain.value = 0.035;
  lfo.connect(lfoGain).connect(gain.gain);
  src.connect(band).connect(gain).connect(ambientBus);
  src.start();
  lfo.start();
}

function createAmbientPad() {
