  buildLake();
  buildRuins();
  buildTerminalStations();
  buildFootprintStories();
  buildStalker();
}


function initStreamingAssets() {
  const cloneTex = (source, color = false) => {
    const tex = source.clone();
    tex.needsUpdate = true;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 1);
    if (color) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return tex;
  };

  worldMaterials.terrain = new THREE.MeshStandardMaterial({
    map: cloneTex(assets.grassColor, true),
    normalMap: cloneTex(assets.grassNormal),
    roughnessMap: cloneTex(assets.grassRough),
    normalScale: new THREE.Vector2(0.48, 0.48),
    color: 0xb7c98c,
    roughness: 0.98,
    metalness: 0
  });

  worldMaterials.skirt = new THREE.MeshStandardMaterial({ color: 0x7fa05f, roughness: 1 });

  worldMaterials.path = new THREE.MeshStandardMaterial({
    map: cloneTex(assets.pathColor, true),
    normalMap: cloneTex(assets.pathNormal),
    roughnessMap: cloneTex(assets.pathRough),
    normalScale: new THREE.Vector2(0.42, 0.42),
    color: 0xc3ae82,
    roughness: 1,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
  });

  worldMaterials.wood = new THREE.MeshStandardMaterial({ color: 0x73543b, roughness: 0.96 });
  worldMaterials.darkWood = new THREE.MeshStandardMaterial({ color: 0x3f3128, roughness: 0.98 });
  worldMaterials.roof = new THREE.MeshStandardMaterial({ color: 0x555c59, roughness: 0.96 });
  worldMaterials.stone = cloneStoneMaterial(0xbebbaa);
  worldMaterials.stoneDark = cloneStoneMaterial(0x8f8d80);
  worldMaterials.leafA = new THREE.MeshStandardMaterial({ color: 0x4e7139, roughness: 1 });
  worldMaterials.leafB = new THREE.MeshStandardMaterial({ color: 0x66894a, roughness: 1 });
  worldMaterials.trunk = new THREE.MeshStandardMaterial({ color: 0x65503b, roughness: 1 });
  worldMaterials.deadWood = new THREE.MeshStandardMaterial({ color: 0x554a3d, roughness: 1 });
  worldMaterials.grass = new THREE.MeshStandardMaterial({ color: 0x6a9547, roughness: 1, side: THREE.DoubleSide });
  worldMaterials.rock = cloneStoneMaterial(0x9f9d90);
  worldMaterials.flower = new THREE.PointsMaterial({
    map: flowerTexture(),
    size: 0.34,
    sizeAttenuation: true,
    transparent: true,
    alphaTest: 0.2,
    depthWrite: false,
    vertexColors: true
  });

  waterNormal = assets.waterNormalTex.clone();
  waterNormal.wrapS = THREE.RepeatWrapping;
  waterNormal.wrapT = THREE.RepeatWrapping;
  waterNormal.repeat.set(4, 4);
  waterNormal.needsUpdate = true;
  worldMaterials.water = new THREE.MeshPhysicalMaterial({
    color: 0x6dabc7,
    normalMap: waterNormal,
    normalScale: new THREE.Vector2(0.30, 0.30),
    roughness: 0.18,
    metalness: 0.02,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    transparent: true,
    opacity: 0.80,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  worldGeometry.grassBlade = makeGrassBladeGeometry();
  worldGeometry.rock = new THREE.DodecahedronGeometry(0.55, 0);
  worldGeometry.treeTrunk = new THREE.CylinderGeometry(0.22, 0.34, 4.0, 8);
  worldGeometry.treeCrown = new THREE.IcosahedronGeometry(1.45, 1);

  if (assets.sky && renderer) {
    try {
      const pmrem = new THREE.PMREMGenerator(renderer);
      const env = pmrem.fromEquirectangular(assets.sky).texture;
      scene.environment = env;
      pmrem.dispose();
    } catch { /* background still works without PMREM */ }
  }
}
