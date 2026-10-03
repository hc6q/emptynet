import * as THREE from 'three';

const SITE = { x: -23, z: 8 };
const ACTIVE_DISTANCE = 380;
let installed = false;

function install(api) {
  if (installed || !api?.scene || !api?.camera || !api?.terrainHeight || !Array.isArray(api?.colliders)) return;
  installed = true;
  const { scene, camera, terrainHeight, colliders, addFeed } = api;

  const root = new THREE.Group();
  root.name = 'EMPTYNET_Meadow_Stonecutters_Patch';
  scene.add(root);

  const stone = new THREE.MeshStandardMaterial({ color: 0x77756c, roughness: 1 });
  const cutStone = new THREE.MeshStandardMaterial({ color: 0x89867b, roughness: .92 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x5b4631, roughness: 1 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x30312f, roughness: .78, metalness: .16 });
  const canvas = new THREE.MeshStandardMaterial({ color: 0x756c58, roughness: 1, side: THREE.DoubleSide });
  const coat = new THREE.MeshStandardMaterial({ color: 0x535046, roughness: 1 });
  const skin = new THREE.MeshStandardMaterial({ color: 0x9c775d, roughness: 1 });
  const blockers = [];

  const gy = (x,z) => terrainHeight(x,z);
  function mesh(g,m,x,y,z,block=false) {
    const o = new THREE.Mesh(g,m); o.position.set(x,y,z); o.castShadow=true; o.receiveShadow=true; root.add(o);
    if(block) blockers.push(o); return o;
  }
  function box(x,z,sx,sy,sz,m=wood,block=true) {
    return mesh(new THREE.BoxGeometry(sx,sy,sz),m,x,gy(x,z)+sy/2,z,block);
  }

  // Low open work shelter beside the western spawn path.
  for (const [x,z] of [[-26.5,5.5],[-20.5,5.5],[-26.5,10],[-20.5,10]]) box(x,z,.22,2.65,.22);
  const roofY = Math.max(gy(-23.5,7.7), gy(-26.5,5.5), gy(-20.5,10)) + 2.88;
  const roof=mesh(new THREE.BoxGeometry(6.7,.14,5.1),canvas,-23.5,roofY,7.7,true); roof.rotation.z=-.04;

  // Cutting bench, dressed blocks and road-repair sled.
  box(-23.6,7.1,3.2,.58,1.0,wood,true);
  for (let i=0;i<5;i++) {
    const x=-27.7+(i%2)*1.05, z=8.1+Math.floor(i/2)*1.0;
    box(x,z,.85,.55+(i%3)*.08,.72,cutStone,true);
  }
  const sled=box(-18.7,8.9,2.8,.18,1.25,wood,true);
  for (const z of [8.38,9.42]) {
    const runner=box(-18.7,z,3.25,.14,.12,iron,true); runner.position.y=gy(-18.7,z)+.09;
  }
  for(let i=0;i<4;i++) box(-19.45+(i%2)*1.25,8.9,.82,.48,.72,cutStone,true);

  // Rubble from real work, kept sparse around the path.
  for(let i=0;i<13;i++) {
    const a=i*2.399, r=2.4+(i%4)*.43, x=-23.5+Math.cos(a)*r, z=7.8+Math.sin(a)*r;
    const s=.12+(i%3)*.05;
    const chip=mesh(new THREE.DodecahedronGeometry(s,0),stone,x,gy(x,z)+s*.55,z,false);
    chip.rotation.set(i*.31,i*.47,0);
  }

  // Chisel rack and mallets make the craft legible at a glance.
  box(-21.6,6.55,1.7,.12,.28,wood,true);
  for(let i=0;i<4;i++) {
    const chisel=mesh(new THREE.CylinderGeometry(.025,.035,.58,6),iron,-22.15+i*.36,gy(-21.6,6.55)+.48,6.55);
    chisel.rotation.z=Math.PI/2;
  }

  // Orin works independently; he is a local mason, not a guide or exposition device.
  const orin=new THREE.Group(); orin.name='Orin_Stonecutter';
  const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.22,.62,4,8),coat); torso.position.y=.88; orin.add(torso);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.17,8,7),skin); head.position.y=1.48; orin.add(head);
  const apron=new THREE.Mesh(new THREE.BoxGeometry(.35,.54,.055),new THREE.MeshStandardMaterial({color:0x615b50,roughness:1}));
  apron.position.set(0,.83,.21); orin.add(apron);
  const hammer=new THREE.Mesh(new THREE.CylinderGeometry(.025,.03,.52,6),wood); hammer.position.set(.28,.95,0); hammer.rotation.z=-.3; orin.add(hammer);
  root.add(orin);

  const points=[[-23.6,6.5],[-27.0,8.7],[-19.1,8.2],[-24.6,9.2],[-22.2,7.0]];
  const orinCollider=new THREE.Box3(); colliders.push(orinCollider);
  root.updateMatrixWorld(true);
  blockers.forEach(o=>colliders.push(new THREE.Box3().setFromObject(o).expandByScalar(.03)));

  function updateOrin(t) {
    const p=((t+31)%165)/165*points.length, i=Math.floor(p)%points.length, j=(i+1)%points.length;
    const u=p-Math.floor(p), e=u*u*(3-2*u);
    const [ax,az]=points[i],[bx,bz]=points[j];
    const x=THREE.MathUtils.lerp(ax,bx,e), z=THREE.MathUtils.lerp(az,bz,e);
    orin.position.set(x,gy(x,z),z); orin.rotation.y=Math.atan2(bx-ax,bz-az);
    const beat=Math.max(0,Math.sin(t*3.05)); hammer.rotation.z=-.3-beat*.8;
    orin.updateMatrixWorld(true); orinCollider.setFromObject(orin).expandByScalar(.04);
  }

  let last=0, wasNear=false;
  function tick(now) {
    requestAnimationFrame(tick); if(now-last<40)return; last=now;
    const d=Math.hypot(camera.position.x-SITE.x,camera.position.z-SITE.z);
    root.visible=d<ACTIVE_DISTANCE; if(!root.visible)return;
    updateOrin(Date.now()*.001);
    const near=d<18;
    if(near&&!wasNear&&addFeed) addFeed("Stone chips mark a mason's patch beside the meadow road. Orin is dressing blocks for the northern path; a loaded sled waits for the next repair crew.");
    wasNear=near;
  }
  requestAnimationFrame(tick);
}

if(window.EMPTYNET_WORLD_API) install(window.EMPTYNET_WORLD_API);
window.addEventListener('emptynet:world-ready',e=>install(e.detail),{once:true});
