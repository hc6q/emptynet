import * as THREE from 'three';

const SITE={x:-612,z:742}, ACTIVE=620;
let installed=false;
function install(api){
 if(installed||!api?.scene||!api?.camera||!api?.terrainHeight||!Array.isArray(api?.colliders))return; installed=true;
 const {scene,camera,terrainHeight,colliders,addFeed}=api;
 const root=new THREE.Group(); root.name='EMPTYNET_Greyfold_Milestone_Yard'; root.position.set(SITE.x,terrainHeight(SITE.x,SITE.z),SITE.z); root.rotation.y=-0.42; scene.add(root);
 const wood=new THREE.MeshStandardMaterial({color:0x49382b,roughness:1});
 const stone=new THREE.MeshStandardMaterial({color:0x686861,roughness:.96});
 const pale=new THREE.MeshStandardMaterial({color:0x8a8578,roughness:1});
 const iron=new THREE.MeshStandardMaterial({color:0x282826,roughness:.8});
 const cloth=new THREE.MeshStandardMaterial({color:0x62584b,roughness:1,side:THREE.DoubleSide});
 const blocking=[];
 function mesh(g,m,x,y,z,b=false){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;root.add(o);if(b)blocking.push(o);return o;}
 // Open mason's shelter, deliberately practical rather than picturesque.
 for(const x of [-2.6,2.6])for(const z of [-1.55,1.55])mesh(new THREE.BoxGeometry(.2,2.8,.2),wood,x,1.4,z,true);
 mesh(new THREE.BoxGeometry(5.8,.18,3.8),wood,0,2.82,0,true);
 const roof=mesh(new THREE.BoxGeometry(6.25,.12,4.2),cloth,0,3.02,0,true); roof.rotation.z=.035;
 // Workbench, stone blanks and finished road markers waiting for carts.
 mesh(new THREE.BoxGeometry(3.2,.18,.85),wood,-.4,.92,-.72,true);
 for(const x of [-1.65,.85])for(const z of [-.98,-.46])mesh(new THREE.BoxGeometry(.13,.9,.13),wood,x,.45,z,true);
 const blanks=[[-3.55,.15],[3.65,.55],[-3.25,-1.2]];
 blanks.forEach(([x,z],i)=>{const s=mesh(new THREE.BoxGeometry(.72,1.35,.5),stone,x,.675,z,true);s.rotation.y=.08*i;});
 // Three carved milestones connect ordinary local geography: Greyfold, Blackpine and High Village.
 [[-1.8,1.8],[0,1.95],[1.8,1.72]].forEach(([x,z],i)=>{mesh(new THREE.BoxGeometry(.55,1.55,.38),pale,x,.775,z,true);const cap=mesh(new THREE.ConeGeometry(.4,.35,4),pale,x,1.72,z,true);cap.rotation.y=Math.PI/4;});
 // Chisel rack and discarded chips make the yard read as active work.
 for(let i=0;i<5;i++){const c=mesh(new THREE.CylinderGeometry(.025,.025,.7,6),iron,-1.35+i*.34,1.42,-1.17);c.rotation.z=Math.PI/2;}
 for(let i=0;i<18;i++){const a=i*2.399963,r=.55+(i%5)*.18;const chip=mesh(new THREE.TetrahedronGeometry(.07+(i%3)*.025),stone,Math.cos(a)*r-.1,.05,Math.sin(a)*r+.55);chip.rotation.set(a*.3,a,.2);}
 // Low hauling sledge for moving stones to roadside sites.
 mesh(new THREE.BoxGeometry(2.2,.16,1.15),wood,3.0,.22,-1.7,true);
 for(const z of [-2.12,-1.28])mesh(new THREE.BoxGeometry(2.55,.14,.14),wood,3.0,.08,z,true);
 root.updateMatrixWorld(true); blocking.forEach(o=>colliders.push(new THREE.Box3().setFromObject(o).expandByScalar(.03)));
 let last=0,wasNear=false;
 function tick(now){requestAnimationFrame(tick);if(now-last<40)return;last=now;const d=Math.hypot(camera.position.x-SITE.x,camera.position.z-SITE.z);root.visible=d<ACTIVE;if(!root.visible)return;
  const near=d<21;if(near&&!wasNear&&addFeed)addFeed('A mason’s yard sits beside the Greyfold road. Three fresh stones bear hand-cut arrows for Greyfold, Blackpine, and High Village; chalk marks on the bench count two more still owed before winter.');wasNear=near;
 }
 requestAnimationFrame(tick);
}
if(window.EMPTYNET_WORLD_API)install(window.EMPTYNET_WORLD_API);window.addEventListener('emptynet:world-ready',e=>install(e.detail));
