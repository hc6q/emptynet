import * as THREE from 'three';

const SITE = { x: -884, z: 966 };
const ACTIVE_DISTANCE = 620;
let installed = false;

function install(api) {
  if (installed || !api?.scene || !api?.camera || !api?.terrainHeight || !Array.isArray(api?.colliders)) return;
  installed = true;
  const { scene, camera, terrainHeight, colliders, addFeed } = api;
  const root = new THREE.Group();
  root.name = 'EMPTYNET_Greyfold_Night_Watch';
  scene.add(root);

  const wood = new THREE.MeshStandardMaterial({ color: 0x4a3929, roughness: 0.98 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x272925, roughness: 0.9 });
  const cloth = new THREE.MeshStandardMaterial({ color: 0x4d5547, roughness: 1 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xa77f61, roughness: 1 });
  const ember = new THREE.MeshStandardMaterial({ color: 0xff9b42, emissive: 0xff6a18, emissiveIntensity: 1.4 });

  const box = (w,h,d,mat,x,y,z) => { const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat); m.position.set(x,y,z); m.castShadow=m.receiveShadow=true; root.add(m); return m; };
  const ground = terrainHeight(SITE.x, SITE.z);

  // A modest watch shelter at Greyfold's road edge: ordinary civic infrastructure, not a fortress.
  box(4.8,0.35,3.4,wood,SITE.x,ground+0.18,SITE.z);
  for (const dx of [-2.05,2.05]) for (const dz of [-1.35,1.35]) box(0.25,2.7,0.25,wood,SITE.x+dx,ground+1.45,SITE.z+dz);
  const roof=box(5.5,0.22,4.0,wood,SITE.x,ground+2.92,SITE.z); roof.rotation.z=0.03;
  box(3.2,0.42,0.55,wood,SITE.x,ground+0.58,SITE.z+1.0);
  box(0.18,1.9,0.18,wood,SITE.x-2.9,ground+0.95,SITE.z-0.3);
  box(0.95,0.08,0.95,iron,SITE.x-2.9,ground+1.78,SITE.z-0.3);
  const brazier = new THREE.Mesh(new THREE.CylinderGeometry(0.34,0.26,0.22,8),iron); brazier.position.set(SITE.x-2.9,ground+1.9,SITE.z-0.3); brazier.castShadow=true; root.add(brazier);
  const coal = new THREE.Mesh(new THREE.SphereGeometry(0.22,7,5),ember); coal.scale.y=0.35; coal.position.set(SITE.x-2.9,ground+2.03,SITE.z-0.3); root.add(coal);
  const lamp = new THREE.PointLight(0xff9a54,0.75,15,2); lamp.position.set(SITE.x-2.9,ground+2.25,SITE.z-0.3); root.add(lamp);

  const staticBoxes = [
    [SITE.x,ground+0.45,SITE.z,4.8,0.9,3.4],
    [SITE.x-2.9,ground+0.95,SITE.z-0.3,0.7,1.9,0.7]
  ];
  for (const [x,y,z,w,h,d] of staticBoxes) colliders.push(new THREE.Box3(new THREE.Vector3(x-w/2,y-h/2,z-d/2),new THREE.Vector3(x+w/2,y+h/2,z+d/2)));

  function makeWatchman() {
    const g=new THREE.Group(); g.name='Hale_Greyfold_Watchman';
    const body=new THREE.Mesh(new THREE.CapsuleGeometry(0.32,0.85,4,7),cloth); body.position.y=1.0; body.castShadow=true; g.add(body);
    const head=new THREE.Mesh(new THREE.SphereGeometry(0.25,8,7),skin); head.position.y=1.78; head.castShadow=true; g.add(head);
    const cap=new THREE.Mesh(new THREE.CylinderGeometry(0.28,0.31,0.15,8),wood); cap.position.y=2.0; g.add(cap);
    const staff=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.045,1.75,6),wood); staff.position.set(0.42,0.9,0); staff.rotation.z=-0.08; g.add(staff);
    return g;
  }
  const hale=makeWatchman(); root.add(hale);
  const haleCollider=new THREE.Box3(); colliders.push(haleCollider);

  const route=[
    [SITE.x+1.1,SITE.z+0.5],[SITE.x+8,SITE.z-2],[SITE.x+15,SITE.z+1],
    [SITE.x+7,SITE.z+5],[SITE.x-3,SITE.z+4],[SITE.x-8,SITE.z+1]
  ];
  const lines=[
    'Hale: Iven says the east road is holding. Mud past the second marker, though.',
    'Hale: Market folk left two crates under the shelter. Orris will fetch them at first light.',
    'Hale: Olan counted his cattle twice tonight. One keeps worrying the south fence.',
    'Hale: Mara came through late. Said the flock hates the wind more than rain.',
    'Hale: If the brazier goes dark, Greyfold knows I have fallen asleep. So it stays lit.'
  ];
  let lastLine=-1;

  function positionOnRoute(t) {
    const cycle=720; const p=((t%cycle)+cycle)%cycle/cycle*route.length;
    const i=Math.floor(p)%route.length, j=(i+1)%route.length, f=p-Math.floor(p);
    const a=route[i],b=route[j];
    return {x:THREE.MathUtils.lerp(a[0],b[0],f),z:THREE.MathUtils.lerp(a[1],b[1],f),dx:b[0]-a[0],dz:b[1]-a[1]};
  }

  let last=0;
  function tick(ms) {
    requestAnimationFrame(tick);
    if (ms-last<34) return; last=ms;
    const dx=camera.position.x-SITE.x,dz=camera.position.z-SITE.z;
    const active=dx*dx+dz*dz<ACTIVE_DISTANCE*ACTIVE_DISTANCE;
    root.visible=active; if(!active) return;
    const t=Date.now()/1000;
    const p=positionOnRoute(t/1.0);
    const y=terrainHeight(p.x,p.z);
    hale.position.set(p.x,y,p.z); hale.rotation.y=Math.atan2(p.dx,p.dz);
    haleCollider.setFromCenterAndSize(new THREE.Vector3(p.x,y+1.0,p.z),new THREE.Vector3(0.75,2.05,0.75));
    lamp.intensity=0.68+Math.sin(t*7.1)*0.08+Math.sin(t*13.7)*0.05;
    coal.scale.y=0.30+Math.sin(t*5.3)*0.05;
    const slot=Math.floor(t/47);
    if(slot!==lastLine && Math.hypot(camera.position.x-p.x,camera.position.z-p.z)<12){
      lastLine=slot;
      if(slot%3===0 && typeof addFeed==='function') addFeed(lines[Math.abs(slot)%lines.length]);
    }
  }
  requestAnimationFrame(tick);
}

if (window.EMPTYNET_WORLD_API) install(window.EMPTYNET_WORLD_API);
window.addEventListener('emptynet:world-ready', e => install(e.detail), { once: true });
