    depthWrite: !ghost
  });
  const accent = ghost ? material : new THREE.MeshStandardMaterial({ color: 0x81958b, roughness: 1 });
  const alt = ghost ? material : new THREE.MeshStandardMaterial({ color: 0x3f4b45, roughness: 1 });
  const skin = ghost ? material : new THREE.MeshStandardMaterial({ color: 0xb6a28e, roughness: 0.95 });

  const torso = new THREE.Mesh(
    avatar === 'hermit' ? new THREE.ConeGeometry(0.40, 0.94, 7) : new THREE.BoxGeometry(0.50, 0.76, 0.28),
    material
  );
  torso.position.y = 1.02;
  group.add(torso);

  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.25), alt);
  hips.position.y = 0.61;
  group.add(hips);

  function limbPivot(x, y, z, length, limbMaterial, width = 0.13) {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, length, width), limbMaterial);
    mesh.position.y = -length * 0.5;
    pivot.add(mesh);
    group.add(pivot);
    return pivot;
  }

  const leftLeg = limbPivot(-0.13, 0.55, 0, 0.63, alt, 0.14);
  const rightLeg = limbPivot(0.13, 0.55, 0, 0.63, alt, 0.14);
  const leftArm = limbPivot(-0.34, 1.29, 0, 0.64, material, 0.11);
  const rightArm = limbPivot(0.34, 1.29, 0, 0.64, material, 0.11);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 9, 7), skin);
  head.position.y = 1.66;
  group.add(head);

  if (avatar === 'surveyor') {
    const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.50, 0.20), alt);
    backpack.position.set(0, 1.05, -0.23);
    group.add(backpack);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.20, 0.08, 10), alt);
    cap.position.y = 1.89;
    group.add(cap);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.03, 0.16), alt);
    brim.position.set(0, 1.86, 0.12);
    group.add(brim);
  } else if (avatar === 'hermit') {
    torso.position.y = 0.98;
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.29, 0.36, 8), alt);
    hood.position.y = 1.88;
    hood.rotation.x = Math.PI;
    group.add(hood);
    const rope = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.025, 6, 14), accent);
    rope.position.y = 0.75;
    rope.rotation.x = Math.PI / 2;
    group.add(rope);
  } else if (avatar === 'runner') {
    torso.scale.set(0.78, 1.05, 0.82);
    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.48, 0.30), accent);
    vest.position.y = 1.08;
    group.add(vest);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.20, 0.025, 6, 14), alt);
    band.position.y = 1.76;
    band.rotation.x = Math.PI / 2;
    group.add(band);
  } else {
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.045, 6, 14), alt);
    scarf.position.y = 1.42;
    scarf.rotation.x = Math.PI / 2;
    group.add(scarf);
    const coatTail = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.40, 0.24), material);
    coatTail.position.y = 0.62;
    group.add(coatTail);
  }

  if (!ghost) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(242,246,242,.82)';
    g.font = '22px monospace';
    g.textAlign = 'center';
    g.fillText(name, 128, 38);
    const tex = new THREE.CanvasTexture(c);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    sprite.position.y = 2.12;
    sprite.scale.set(1.7, 0.43, 1);
    group.add(sprite);
  }

  group.userData.material = material;
  group.userData.leftLeg = leftLeg;
  group.userData.rightLeg = rightLeg;
  group.userData.leftArm = leftArm;
  group.userData.rightArm = rightArm;
  group.userData.walkPhase = 0;
  group.userData.lastVisualPosition = new THREE.Vector3();
  scene.add(group);
  return group;
