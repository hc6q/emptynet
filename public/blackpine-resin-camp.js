import * as THREE from 'three';

const SITE={x:782,z:-468}, ACTIVE=620;
let installed=false;
function install(api){
 if(installed||!api?.scene||!api?.camera||!api?.terrainHeight||!Array.isArray(api?.colliders))return; installed=true;
 const {scene,camera,terrainHeight,colliders,addFeed}=api;
 const root=new THREE.Group(); root.name='EMPTYNET_Blackpine_Resin_Camp'; root.position.set(SITE.x,terrainHeight(SITE.x,SITE.z),SITE.z); root.rotation.y=.28; scene.add(root);
 const wood=new THREE.MeshStandardMaterial({color:0x44372b,roughness:1});
 const bark=new THREE.MeshStandardMaterial({color:0x302c27,roughness:1});
 const resin=new THREE.MeshStandardMaterial({color:0x9b6428,roughness:.55,metalness:0});
 const iron=new THREE.MeshStandardMaterial({color:0x292a28,roughness:.82});
 const canvas=new THREE.MeshStandardMaterial({color:0x615b4c,roughness:1,side:THREE.DoubleSide});
 const blocking=[];
 function mesh(g,m,x,y,z,b=false){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;root.add(o);if(b)blocking.push(o);return o;}
 // Lean-to where Blackpine workers sort bark cups and seal transport jars.
 for(const x of [-2.5,2.5])for(const z of [-1.35,1.35])mesh(new THREE.BoxGeometry(.18,2.55,.18),wood,x,1.275,z,true);
 const roof=mesh(new THREE.BoxGeometry(5.7,.11,3.45),canvas,0,2.68,0,true);roof.rotation.z=-.055;
 mesh(new THREE.BoxGeometry(3.5,.2,.9),wood,-.25,.92,-.62,true);
 for(const x of [-1.7,1.2])for(const z of [-.95,-.3])mesh(new THREE.BoxGeometry(.14,.86,.14),wood,x,.43,z,true);
 // Resin barrels and stoppered jars awaiting the road cart.
 for(const [x,z] of [[3.15,-.9],[3.45,.25],[-3.25,1.0]]){mesh(new THREE.CylinderGeometry(.55,.58,1.2,12),wood,x,.6,z,true);for(const y of [.18,.98])mesh(new THREE.TorusGeometry(.57,.035,6,14),iron,x,y,z);}
 for(let i=0;i<7;i++){const x=-1.35+i*.42;mesh(new THREE.CylinderGeometry(.12,.14,.42,8),resin,x,1.24,-.58);mesh(new THREE.CylinderGeometry(.09,.09,.06,8),wood,x,1.48,-.58);}
 // Two tapped pines: physical trunks, cut channels and collection cups are all world geometry.
 for(const [x,z] of [[-4.15,-1.45],[4.55,1.65]]){const trunk=mesh(new THREE.CylinderGeometry(.34,.48,5.4,10),bark,x,2.7,z,true);const cut=mesh(new THREE.BoxGeometry(.3,.62,.035),resin,x,1.55,z+.38);cut.rotation.z=-.22;const cup=mesh(new THREE.CylinderGeometry(.2,.14,.3,8),iron,x,1.05,z+.43);cup.rotation.x=.08;}
 // Low bark rack and hand tools give the camp a work rhythm without turning it into a spectacle.
 mesh(new THREE.BoxGeometry(2.7,.14,.7),wood,-2.7,.55,2.25,true);
 for(const x of [-3.75,-1.65])mesh(new THREE.BoxGeometry(.14,1.05,.14),wood,x,.52,2.25,true);
 for(let i=0;i<5;i++){const strip=mesh(new THREE.BoxGeometry(.22,.06,1.25),bark,-3.55+i*.43,.78,2.25);strip.rotation.y=(i-2)*.05;}
 for(let i=0;i<3;i++){const tool=mesh(new THREE.CylinderGeometry(.025,.025,.78,6),iron,.55+i*.28,1.22,-.58);tool.rotation.z=Math.PI/2;}
 root.updateMatrixWorld(true);blocking.forEach(o=>colliders.push(new THREE.Box3().setFromObject(o).expandByScalar(.03)));
 let last=0,wasNear=false;
 function tick(now){requestAnimationFrame(tick);if(now-last<40)return;last=now;const d=Math.hypot(camera.position.x-SITE.x,camera.position.z-SITE.z);root.visible=d<ACTIVE;if(!root.visible)return;
  const near=d<22;if(near&&!wasNear&&addFeed)addFeed('A resin camp works the Blackpine road. Fresh cuts shine on two trunks; sealed jars wait beneath the lean-to. A chalk tally on one barrel reads: smithy 3, wagonwright 2, Greyfold 1.');wasNear=near;
 }
 requestAnimationFrame(tick);
}
if(window.EMPTYNET_WORLD_API)install(window.EMPTYNET_WORLD_API);window.addEventListener('emptynet:world-ready',e=>install(e.detail));
