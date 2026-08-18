import * as THREE from 'three';

const BOARD_DEPTH = 0.16;
const BOARD_BEVEL_THICKNESS = 0.035;
const LABEL_GAP = 0.018;
const LABEL_FACE_Z = BOARD_DEPTH * 0.5 + BOARD_BEVEL_THICKNESS + LABEL_GAP;

const POSTS = [
  {
    x: 1.2,
    z: -9.4,
    boards: [
      { label: 'NORTH TEMPLE', target: [0, -39] },
      { label: 'EAST RUINS', target: [51, 24] },
      { label: 'WEST RUINS', target: [-53, 17] }
    ]
  },
  {
    // Procedural trail crossing: east lane 2 / north lane -2.
    x: -828.94,
    z: 987.57,
    boards: [
      { label: 'GREYFOLD', target: [-930, 860] },
      { label: 'HIGH VILLAGE', target: [1160, 1240] }
    ]
  },
  {
    // Procedural trail crossing: east lane 2 / north lane 2.
    x: 1271.92,
    z: 1023.28,
    boards: [
      { label: 'HIGH VILLAGE', target: [1160, 1240] },
      { label: 'GREYFOLD', target: [-930, 860] }
    ]
  },
  {
    // Procedural trail crossing: east lane -1 / north lane 1.
    x: 785.62,
    z: -609.23,
    boards: [
      { label: 'OLD WATCH', target: [625, -430] },
      { label: 'NORTH ROAD', target: [725, 22] }
    ]
  }
];

let installed = false;

function install(api) {
  if (installed || !api?.scene || !api?.camera || !api?.terrainHeight || !Array.isArray(api?.colliders)) return;
  installed = true;

  const { scene, camera, terrainHeight, colliders } = api;
  const root = new THREE.Group();
  root.name = 'EMPTYNET_Wayfinding_Posts';
  scene.add(root);

  const wood = new THREE.MeshStandardMaterial({ color: 0x5a402d, roughness: 0.96 });
  const woodDark = new THREE.MeshStandardMaterial({ color: 0x37291f, roughness: 1 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x292b28, roughness: 0.78, metalness: 0.22 });

  function makeTextTexture(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(236, 222, 184, 0.96)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const maxWidth = 430;
    let fontSize = 48;
    do {
      ctx.font = `700 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
      if (ctx.measureText(text).width <= maxWidth) break;
      fontSize -= 2;
    } while (fontSize > 28);

    ctx.fillText(text, 256, 64, maxWidth);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }

  function makeArrowGeometry(length = 3.25, height = 0.72, depth = BOARD_DEPTH) {
    const halfH = height * 0.5;
    const bodyEnd = length * 0.70;
    const shape = new THREE.Shape();
    shape.moveTo(-length * 0.5, -halfH);
    shape.lineTo(bodyEnd - length * 0.5, -halfH);
    shape.lineTo(bodyEnd - length * 0.5, -height * 0.82);
    shape.lineTo(length * 0.5, 0);
    shape.lineTo(bodyEnd - length * 0.5, height * 0.82);
    shape.lineTo(bodyEnd - length * 0.5, halfH);
    shape.lineTo(-length * 0.5, halfH);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness: BOARD_BEVEL_THICKNESS,
      bevelSize: 0.035,
      bevelSegments: 1,
      curveSegments: 1
    });
    geometry.translate(0, 0, -depth * 0.5);
    geometry.computeVertexNormals();
    return geometry;
  }

  function setShadow(object) {
    object.traverse(child => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });
  }

  function addBoard(post, postSpec, boardSpec, index) {
    const dx = boardSpec.target[0] - postSpec.x;
    const dz = boardSpec.target[1] - postSpec.z;
    const angle = Math.atan2(-dz, dx);
    const board = new THREE.Group();
    board.position.y = 2.35 - index * 0.72;
    board.rotation.y = angle;
    post.add(board);

    const plank = new THREE.Mesh(makeArrowGeometry(), wood);
    board.add(plank);

    const labelTexture = makeTextTexture(boardSpec.label);
    const labelMaterial = new THREE.MeshBasicMaterial({
      map: labelTexture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      side: THREE.FrontSide,
      toneMapped: false
    });
    const label = new THREE.Mesh(new THREE.PlaneGeometry(2.25, 0.48), labelMaterial);
    label.position.set(-0.25, 0, LABEL_FACE_Z);
    board.add(label);

    const rearLabel = label.clone();
    rearLabel.position.z = -LABEL_FACE_Z;
    rearLabel.rotation.y = Math.PI;
    board.add(rearLabel);

    const nailFaceZ = LABEL_FACE_Z + 0.004;
    const nailA = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.06, 8), iron);
    nailA.rotation.x = Math.PI / 2;
    nailA.position.set(-1.03, 0.14, nailFaceZ);
    board.add(nailA);
    const nailB = nailA.clone();
    nailB.position.y = -0.14;
    board.add(nailB);
  }

  function buildPost(spec, postIndex) {
    const y = terrainHeight(spec.x, spec.z);
    const post = new THREE.Group();
    post.name = `EMPTYNET_Waypost_${postIndex + 1}`;
    post.position.set(spec.x, y, spec.z);
    post.rotation.y = ((postIndex * 0.37) % 1 - 0.5) * 0.08;
    root.add(post);

    const poleHeight = 3.35;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, poleHeight, 8), woodDark);
    pole.position.y = poleHeight * 0.5 - 0.20;
    pole.rotation.y = postIndex * 0.41;
    post.add(pole);

    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.30, 0.65, 8), woodDark);
    foot.position.y = 0.03;
    post.add(foot);

    spec.boards.forEach((board, index) => addBoard(post, spec, board, index));
    setShadow(post);

    post.updateWorldMatrix(true, true);
    pole.updateWorldMatrix(true, false);
    colliders.push(new THREE.Box3().setFromObject(pole).expandByScalar(0.06));
  }

  POSTS.forEach(buildPost);

  const maxVisibleDistance = 520;
  function frame() {
    requestAnimationFrame(frame);
    for (const child of root.children) {
      const dx = child.position.x - camera.position.x;
      const dz = child.position.z - camera.position.z;
      child.visible = dx * dx + dz * dz < maxVisibleDistance * maxVisibleDistance;
    }
  }
  requestAnimationFrame(frame);
}

if (window.EMPTYNET_WORLD_API) install(window.EMPTYNET_WORLD_API);
window.addEventListener('emptynet:world-ready', event => install(event.detail), { once: true });
