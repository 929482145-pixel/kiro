import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './styles.css';

const canvas = document.querySelector('#scene');
const viewport = canvas.parentElement;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xe7e2d7, 26, 58);
const camera = new THREE.PerspectiveCamera(32, 1, .1, 100);
camera.position.set(18, 18, 22);
const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.15;

const controls = new OrbitControls(camera, canvas);
controls.enableDamping=true; controls.dampingFactor=.065; controls.minDistance=12; controls.maxDistance=45;
controls.maxPolarAngle=Math.PI*.47; controls.target.set(0,1.5,0);

scene.add(new THREE.HemisphereLight(0xfffdf5,0x8d897f,2.2));
const sun=new THREE.DirectionalLight(0xfff6dd,3.1); sun.position.set(-12,22,13); sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-18;sun.shadow.camera.right=18;sun.shadow.camera.top=18;sun.shadow.camera.bottom=-18; scene.add(sun);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(70,70),new THREE.ShadowMaterial({color:0x777166,opacity:.15}));ground.rotation.x=-Math.PI/2;ground.position.y=-.04;ground.receiveShadow=true;scene.add(ground);

const MAT={wall:new THREE.MeshStandardMaterial({color:0xeae7df,roughness:.82}), edge:new THREE.MeshStandardMaterial({color:0x31322e,roughness:.7}), floor:new THREE.MeshStandardMaterial({color:0xcac6bb,roughness:.9}), wood:new THREE.MeshStandardMaterial({color:0xa8926e,roughness:.8}), sofa:new THREE.MeshStandardMaterial({color:0xe4dfd4,roughness:.95}), bed:new THREE.MeshStandardMaterial({color:0xd8cfbf,roughness:.9}), blue:new THREE.MeshStandardMaterial({color:0x91b6b8,roughness:.7}), glass:new THREE.MeshStandardMaterial({color:0x91bfc1,transparent:true,opacity:.45}), green:new THREE.MeshStandardMaterial({color:0x6f8068,roughness:1})};
const floors=[]; const clickable=[];
function box(group,x,y,z,w,h,d,mat=MAT.wall,name=''){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;m.name=name;group.add(m);return m}
function labelTexture(text,sub){const c=document.createElement('canvas');c.width=512;c.height=180;const x=c.getContext('2d');x.fillStyle='rgba(243,240,232,.9)';x.fillRect(0,0,c.width,c.height);x.fillStyle='#514d43';x.font='500 55px Noto Sans SC';x.textAlign='center';x.fillText(text,256,82);x.fillStyle='#918977';x.font='22px DM Sans';x.fillText(sub,256,127);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
function roomLabel(g,text,sub,x,z,y){const m=new THREE.Mesh(new THREE.PlaneGeometry(2.5,.88),new THREE.MeshBasicMaterial({map:labelTexture(text,sub),transparent:true,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(x,y,z);g.add(m)}
function bed(g,x,z,rot=0){const q=new THREE.Group();box(q,0,.3,0,2.2,.45,3.1,MAT.wood);box(q,0,.57,.25,2,.22,2.5,MAT.bed);box(q,-.5,.72,-.85,.8,.18,.5,MAT.sofa);box(q,.5,.72,-.85,.8,.18,.5,MAT.sofa);q.position.set(x,0,z);q.rotation.y=rot;g.add(q)}
function plant(g,x,z){const q=new THREE.Group();box(q,0,.22,0,.65,.44,.65,MAT.wood);for(let i=0;i<8;i++){const leaf=new THREE.Mesh(new THREE.IcosahedronGeometry(.45+Math.random()*.25,1),MAT.green);const a=i/8*Math.PI*2;leaf.position.set(Math.cos(a)*.38,.7+Math.random()*.5,Math.sin(a)*.38);leaf.castShadow=true;q.add(leaf)}q.position.set(x,0,z);g.add(q)}
function walls(g,y=0){const W=.26,H=1.25;box(g,0,y+H/2,-6.3,9.1,H,W,MAT.edge);box(g,-4.55,y+H/2,-3.8,W,H,5.2,MAT.edge);box(g,4.55,y+H/2,-3.8,W,H,5.2,MAT.edge);box(g,-5.65,y+H/2,-1.15,2.45,H,W,MAT.edge);box(g,5.65,y+H/2,-1.15,2.45,H,W,MAT.edge);box(g,-6.8,y+H/2,1.8,W,H,6.1,MAT.edge);box(g,6.8,y+H/2,1.8,W,H,6.1,MAT.edge);box(g,0,y+H/2,4.85,13.8,H,W,MAT.edge);box(g,-4.55,y+H/2,1.8,W,H,5.8,MAT.wall);box(g,4.55,y+H/2,1.8,W,H,5.8,MAT.wall);box(g,0,y+H/2,-1.15,9,H,W,MAT.wall);}
function makeFloor(level){const g=new THREE.Group();g.userData={level,targetY:(level-1)*2.55};g.position.y=g.userData.targetY;
 const slab=box(g,0,.08,0,13.6,.16,12.6,MAT.floor,`floor-${level}`);clickable.push(slab);slab.userData.level=level;walls(g,.16);
 // stairs
 for(let i=0;i<8;i++) box(g,-.18+i*.46,.24+i*.045,-5.25, .42,.12,1.55,MAT.sofa);
 if(level===1){
  // living room and dining, matching provided plan
  box(g,.35,.42,1.25,1.1,.65,3.5,MAT.sofa);box(g,-.55,.42,2.65,1.9,.65,.75,MAT.sofa);box(g,-1.75,.28,1.25,.85,.45,.85,MAT.wood);
  box(g,0,.5,-3.5,3,.15,1.15,MAT.wood);for(const x of[-1.1,1.1])for(const z of[-4.2,-2.8])box(g,x,.42,z,.45,.75,.45,MAT.wood);
  box(g,4.95,.35,-3.5,2.8,.55,.7,MAT.wood);bed(g,-5.6,-3.5,Math.PI/2);bed(g,-5.6,2,Math.PI/2);bed(g,5.6,2,-Math.PI/2);
  roomLabel(g,'客厅','LIVING ROOM',-.4,1.25,.19);roomLabel(g,'餐厅','DINING',0,-4.45,.19);plant(g,5.7,4.1);
 }else{
  bed(g,-5.6,-3.5,Math.PI/2);bed(g,5.6,-3.5,-Math.PI/2);bed(g,-5.6,2,Math.PI/2);bed(g,1.25,2,Math.PI/2);bed(g,5.6,2,-Math.PI/2);
  box(g,0,.4,-3.5,2.2,.65,1.1,MAT.wood);box(g,0,.28,-2.4,1.2,.4,.6,MAT.sofa);
  box(g,6.1,.18,-.1,1.15,.25,1.6,MAT.blue);roomLabel(g,'卧室','BEDROOM',1.15,2,.19);roomLabel(g,'起居厅','FAMILY AREA',0,-3.45,.19);
 }
 scene.add(g);floors.push(g);return g}
makeFloor(1);makeFloor(2);
// roof caps and site landscaping
const roof=new THREE.Group();roof.userData={targetY:5.1};roof.position.y=5.1;box(roof,0,.05,-5.2,4.5,.12,2.3,MAT.wall);scene.add(roof);
plant(scene,-8,-5.2);plant(scene,7.8,4.2);

const raycaster=new THREE.Raycaster(), pointer=new THREE.Vector2();let mode='all',exploded=false,hovered=null;
const state={cam:new THREE.Vector3(18,18,22),target:new THREE.Vector3(0,1.5,0)};
function setView(view,fromClick=false){mode=String(view);exploded=false;document.querySelector('#explodeBtn').classList.remove('active');document.querySelectorAll('.floor-item').forEach(b=>b.classList.toggle('active',b.dataset.view===mode));
 const names={all:['00','整体建筑'],1:['01','一层空间'],2:['02','二层空间']};document.querySelector('#viewIndex').textContent=names[mode][0];document.querySelector('#viewName').textContent=names[mode][1];
 floors.forEach(f=>{f.visible=mode==='all'||String(f.userData.level)===mode;f.position.y=(f.userData.level-1)*2.55});roof.visible=mode==='all';roof.position.y=5.1;
 if(mode==='all'){state.cam.set(18,18,22);state.target.set(0,1.5,0)}else{const y=(+mode-1)*2.55;state.cam.set(13,y+15,17);state.target.set(0,y,0)}
}
function toggleExplode(){exploded=!exploded;mode='all';document.querySelectorAll('.floor-item').forEach(b=>b.classList.remove('active'));document.querySelector('#explodeBtn').classList.toggle('active',exploded);document.querySelector('#viewIndex').textContent=exploded?'↕':'00';document.querySelector('#viewName').textContent=exploded?'楼层爆炸图':'整体建筑';floors.forEach(f=>{f.visible=true;f.position.y=(f.userData.level-1)*(exploded?5.1:2.55)});roof.visible=true;roof.position.y=exploded?10.2:5.1;state.cam.set(20,20,25);state.target.set(0,exploded?3.2:1.5,0)}
document.querySelectorAll('.floor-item').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
document.querySelector('#explodeBtn').addEventListener('click',toggleExplode);document.querySelector('#resetView').addEventListener('click',()=>setView('all'));
canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(clickable,false)[0];canvas.style.cursor=hit?'pointer':'grab';hovered=hit?.object||null});
canvas.addEventListener('click',e=>{if(hovered&&mode==='all'&&!exploded)setView(hovered.userData.level,true)});
function resize(){const w=viewport.clientWidth,h=viewport.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}window.addEventListener('resize',resize);resize();
const clock=new THREE.Clock();function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);camera.position.lerp(state.cam,1-Math.exp(-2.4*dt));controls.target.lerp(state.target,1-Math.exp(-2.4*dt));controls.update();renderer.render(scene,camera)}
setView('all');animate();setTimeout(()=>document.querySelector('#loading').classList.add('hidden'),700);
