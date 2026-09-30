import * as THREE from 'three';
const SITE={x:-15,z:9},ACTIVE_DISTANCE=380;let installed=false;
function install(api){
 if(installed||!api?.scene||!api?.camera||!api?.terrainHeight||!Array.isArray(api?.colliders))return;installed=true;
 const{scene,camera,terrainHeight,colliders,addFeed}=api,root=new THREE.Group();root.name='EMPTYNET_Meadow_Shepherd_Gate';scene.add(root);
 const wood=new THREE.MeshStandardMaterial({color:0x594632,roughness:1}),wool=new THREE.MeshStandardMaterial({color:0xb3aa91,roughness:1}),dark=new THREE.MeshStandardMaterial({color:0x77705f,roughness:1}),coat=new THREE.MeshStandardMaterial({color:0x555347,roughness:1}),skin=new THREE.MeshStandardMaterial({color:0x98745c,roughness:1});
 const blockers=[],gy=(x,z)=>terrainHeight(x,z);
 function box(x,z,sx,sy,sz,mat=wood,block=true){const o=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat);o.position.set(x,gy(x,z)+sy/2,z);o.castShadow=o.receiveShadow=true;root.add(o);if(block)blockers.push(o);return o}
 for(const[x,z]of[[-18.2,6.1],[-12.4,6.1],[-18.2,12],[-12.4,12]])box(x,z,.2,1.45,.2);
 for(const z of[6.1,12])for(let i=0;i<2;i++){const y=Math.max(gy(-18.2,z),gy(-12.4,z))+.78+i*.43,o=new THREE.Mesh(new THREE.BoxGeometry(5.8,.12,.12),wood);o.position.set(-15.3,y,z);root.add(o);blockers.push(o)}
 for(const x of[-18.2,-12.4])for(let i=0;i<2;i++){const y=Math.max(gy(x,6.1),gy(x,12))+.78+i*.43,o=new THREE.Mesh(new THREE.BoxGeometry(.12,.12,5.9),wood);o.position.set(x,y,9.05);root.add(o);blockers.push(o)}
 box(-16.1,8.7,1.7,.72,.68);box(-17.2,10.8,.55,.42,.55);
 function sheep(i){const g=new THREE.Group(),b=new THREE.Mesh(new THREE.SphereGeometry(.34,8,6),i===3?dark:wool);b.scale.set(1.25,.82,1.55);b.position.y=.47;g.add(b);const h=new THREE.Mesh(new THREE.SphereGeometry(.18,7,6),dark);h.position.set(0,.48,.48);g.add(h);root.add(g);return g}
 const flock=[0,1,2,3].map(sheep),centers=[[-16.7,10.4],[-14.4,10.5],[-16.1,7.5],[-13.8,7.8]];
 const mara=new THREE.Group();mara.name='Mara_Meadow_Shepherd';const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.22,.62,4,8),coat);torso.position.y=.88;mara.add(torso);const head=new THREE.Mesh(new THREE.SphereGeometry(.17,8,7),skin);head.position.y=1.48;mara.add(head);root.add(mara);
 const mc=new THREE.Box3();colliders.push(mc);root.updateMatrixWorld(true);blockers.forEach(o=>colliders.push(new THREE.Box3().setFromObject(o).expandByScalar(.025)));
 function update(t){flock.forEach((s,i)=>{const[cx,cz]=centers[i],a=t*(.07+i*.006)+i*1.7,x=cx+Math.cos(a)*.55,z=cz+Math.sin(a*.83)*.48;s.position.set(x,gy(x,z),z);s.rotation.y=Math.atan2(-Math.sin(a),Math.cos(a*.83)*.83)});
 const pts=[[-11.6,8],[-15.8,8.8],[-17,10.5],[-12.2,8.2]],p=((t+31)%130)/130*pts.length,i=Math.floor(p)%pts.length,j=(i+1)%pts.length,u=p-Math.floor(p),e=u*u*(3-2*u),x=THREE.MathUtils.lerp(pts[i][0],pts[j][0],e),z=THREE.MathUtils.lerp(pts[i][1],pts[j][1],e);mara.position.set(x,gy(x,z),z);mara.rotation.y=Math.atan2(pts[j][0]-pts[i][0],pts[j][1]-pts[i][1]);mara.updateMatrixWorld(true);mc.setFromObject(mara).expandByScalar(.04)}
 let last=0,wasNear=false;function tick(now){requestAnimationFrame(tick);if(now-last<40)return;last=now;const d=Math.hypot(camera.position.x-SITE.x,camera.position.z-SITE.z);root.visible=d<ACTIVE_DISTANCE;if(!root.visible)return;update(Date.now()*.001);const near=d<17;if(near&&!wasNear&&addFeed)addFeed("Four sheep crop the grass behind a low gate. Mara checks the latch twice, then the feed rack, as if both have disappointed her before.");wasNear=near}requestAnimationFrame(tick)
}
if(window.EMPTYNET_WORLD_API)install(window.EMPTYNET_WORLD_API);window.addEventListener('emptynet:world-ready',e=>install(e.detail),{once:true});
