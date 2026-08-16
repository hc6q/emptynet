  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  controls = new PointerLockControls(camera, canvas);
  game.addEventListener('click', event => {
    if (event.target.closest?.('.panel')) return;
    if (!uiOpen() && !controls.isLocked && initialized) controls.lock();
  });
  controls.addEventListener('lock', () => {
    document.body.classList.add('mouse-locked');
    startAudio();
    if (audioCtx?.state === 'suspended') audioCtx.resume();
  });
  controls.addEventListener('unlock', () => {
    document.body.classList.remove('mouse-locked');
    keys = Object.create(null);
  });

  clock = new THREE.Clock();
  await loadAssets();
  LAKE.level = broadTerrainHeight(LAKE.x, LAKE.z) - 1.42;
  spawnHeight = terrainHeight(0, 5);
  camera.position.set(0, spawnHeight + EYE_HEIGHT, 5);
  buildWorld();

  for (const note of pendingNotes) createNote(note);
  pendingNotes = [];
  prepareGhostPlayback();

  window.addEventListener('resize', onResize);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', event => { keys[event.code] = false; });
  window.addEventListener('blur', () => { keys = Object.create(null); });

  nextStalkerAt = performance.now() + 16000 + Math.random() * 9000;
  nextSignalGlitchAt = performance.now() + 27000 + Math.random() * 15000;
  nextGhostAt = performance.now() + 42000 + Math.random() * 25000;

  setTimeout(() => loadingEl.classList.add('done'), 350);
  animate();
}

function loadTexture(url) {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(url, resolve, undefined, reject);
  });
}

async function loadAssets() {
  const [sky, grassColor, grassNormal, grassRough, pathColor, pathNormal, pathRough, stoneDiffuse, stoneNormal, stoneRough, waterNormalTex] = await Promise.all([
    loadTexture('assets/sky_kloppenheim.jpg'),
    loadTexture('assets/grass_color.jpg'),
    loadTexture('assets/grass_normal.jpg'),
    loadTexture('assets/grass_rough.jpg'),
    loadTexture('assets/path_color.jpg'),
    loadTexture('assets/path_normal.jpg'),
    loadTexture('assets/path_rough.jpg'),
    loadTexture('assets/stone_diffuse.jpg'),
    loadTexture('assets/stone_normal.jpg'),
    loadTexture('assets/stone_rough.jpg'),
    loadTexture('assets/water_normal.jpg')
  ]);

  sky.colorSpace = THREE.SRGBColorSpace;
  sky.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = sky;
  scene.environment = sky;

  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  for (const tex of [grassColor, grassNormal, grassRough, pathColor, pathNormal, pathRough, stoneDiffuse, stoneNormal, stoneRough, waterNormalTex]) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = Math.min(8, maxAniso);
  }
  grassColor.colorSpace = THREE.SRGBColorSpace;
  pathColor.colorSpace = THREE.SRGBColorSpace;
  stoneDiffuse.colorSpace = THREE.SRGBColorSpace;

  grassColor.repeat.set(560, 560);
  grassNormal.repeat.set(560, 560);
  grassRough.repeat.set(560, 560);
  stoneDiffuse.repeat.set(2.5, 2.5);
  stoneNormal.repeat.set(2.5, 2.5);
  stoneRough.repeat.set(2.5, 2.5);
  pathColor.repeat.set(180, 10);
  pathNormal.repeat.set(180, 10);
  pathRough.repeat.set(180, 10);
  waterNormalTex.repeat.set(4, 4);

  assets = { sky, grassColor, grassNormal, grassRough, pathColor, pathNormal, pathRough, stoneDiffuse, stoneNormal, stoneRough, waterNormalTex };
}

function fract(value) { return value - Math.floor(value); }
function smoothstep(edge0, edge1, x) {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
