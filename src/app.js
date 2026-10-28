import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './styles.css';

const canvas = document.querySelector('#scene');
const viewport = canvas.parentElement;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xe7e2d7, 28, 62);

const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
camera.position.set(18, 19, 23);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.065;
controls.minDistance = 12;
controls.maxDistance = 45;
controls.maxPolarAngle = Math.PI * 0.48;
controls.target.set(0, 1.6, 0);

scene.add(new THREE.HemisphereLight(0xfffdf5, 0x858178, 2.25));
const sun = new THREE.DirectionalLight(0xfff5dc, 3.1);
sun.position.set(-13, 23, 14);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -18;
sun.shadow.camera.right = 18;
sun.shadow.camera.top = 18;
sun.shadow.camera.bottom = -18;
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(70, 70),
  new THREE.ShadowMaterial({ color: 0x6d685e, opacity: 0.14 }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.04;
ground.receiveShadow = true;
scene.add(ground);

const material = {
  outer: new THREE.MeshStandardMaterial({ color: 0x292a27, roughness: 0.76 }),
  inner: new THREE.MeshStandardMaterial({
    color: 0xe9e6de,
    roughness: 0.84,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  }),
  floor: new THREE.MeshStandardMaterial({ color: 0xc9c5ba, roughness: 0.92 }),
  stair: new THREE.MeshStandardMaterial({ color: 0xb8b4aa, roughness: 0.88 }),
  rail: new THREE.MeshStandardMaterial({ color: 0x6b6a63, roughness: 0.72 }),
};

const floors = [];
const clickable = [];
const WALL_H = 1.5;
const OUTER_T = 0.28;
const INNER_T = 0.18;

function box(group, x, y, z, width, height, depth, mat, name = '') {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = name;
  group.add(mesh);
  return mesh;
}

function wallX(group, x1, x2, z, outer = false) {
  return box(group, (x1 + x2) / 2, WALL_H / 2 + 0.16, z, x2 - x1, WALL_H, outer ? OUTER_T : INNER_T, outer ? material.outer : material.inner);
}

function wallZ(group, x, z1, z2, outer = false) {
  return box(group, x, WALL_H / 2 + 0.16, (z1 + z2) / 2, outer ? OUTER_T : INNER_T, WALL_H, z2 - z1, outer ? material.outer : material.inner);
}

// Draw a wall with one or more real door openings instead of overlapping wall boxes.
function segmentedX(group, x1, x2, z, openings = [], outer = false) {
  let cursor = x1;
  [...openings].sort((a, b) => a[0] - b[0]).forEach(([start, end]) => {
    if (start > cursor) wallX(group, cursor, start, z, outer);
    cursor = Math.max(cursor, end);
  });
  if (cursor < x2) wallX(group, cursor, x2, z, outer);
}

function segmentedZ(group, x, z1, z2, openings = [], outer = false) {
  let cursor = z1;
  [...openings].sort((a, b) => a[0] - b[0]).forEach(([start, end]) => {
    if (start > cursor) wallZ(group, x, cursor, start, outer);
    cursor = Math.max(cursor, end);
  });
  if (cursor < z2) wallZ(group, x, cursor, z2, outer);
}

// Drawing grid is expressed in metres. The supplied 12100 × 12000 mm axes
// become a centred Three.js model without changing scale.
const PLAN_W = 12.1;
const PLAN_D = 12.0;
const X0 = PLAN_W / 2;
const Z0 = PLAN_D / 2;
const gx = (x) => x - X0;
const gz = (z) => z - Z0;

function boundaryX(group, x1, x2, z) {
  box(group, gx((x1 + x2) / 2), 0.38, gz(z), x2 - x1, 0.44, 0.1, material.rail);
}

function boundaryZ(group, x, z1, z2) {
  box(group, gx(x), 0.38, gz((z1 + z2) / 2), 0.1, 0.44, z2 - z1, material.rail);
}

function addStairs(group, level) {
  // F1 stair occupies the south-east bay; F2 arrives in the left-middle bay.
  const stair = level === 1
    ? { x1: 8.3, x2: 12.1, z1: 8.4, z2: 12.0, alongX: false }
    : { x1: 1.0, x2: 3.8, z1: 4.2, z2: 8.4, alongX: false };
  const steps = 11;
  for (let i = 0; i < steps; i += 1) {
    const depth = (stair.z2 - stair.z1) / steps;
    box(
      group,
      gx((stair.x1 + stair.x2) / 2),
      0.2 + i * 0.035,
      gz(stair.z2 - depth * (i + 0.5)),
      stair.x2 - stair.x1,
      0.1,
      depth - 0.025,
      material.stair,
    );
  }
}

function outerShell(group, level) {
  // C-1..C-5 are window gaps; M-1 is the principal south entrance.
  const northWindows = level === 1
    ? [[gx(1.35), gx(2.35)], [gx(5.7), gx(6.9)], [gx(9.65), gx(10.75)]] // C-1..C-3
    : [[gx(1.2), gx(2.4)], [gx(5.75), gx(6.95)], [gx(9.55), gx(10.75)]];
  segmentedX(group, gx(0), gx(12.1), gz(0), northWindows, true);
  segmentedZ(group, gx(12.1), gz(0), gz(12.0), [[gz(4.8), gz(6.0)]], true); // C-4
  segmentedX(group, gx(0), gx(12.1), gz(12.0), level === 1
    ? [[gx(1.35), gx(2.55)], [gx(5.65), gx(6.65)]] // C-5, M-1
    : [[gx(1.35), gx(2.55)], [gx(5.0), gx(8.3)]], true); // C-5, balcony opening
  segmentedZ(group, gx(0), gz(0), gz(12.0), [[gz(8.75), gz(9.95)]], true);
}

function firstFloorPartitions(group) {
  // North: rear court/kitchen and north-east store.
  segmentedX(group, gx(0), gx(12.1), gz(4.2), [
    [gx(2.8), gx(3.8)], // M-2
    [gx(6.35), gx(7.25)], // M-3
    [gx(9.1), gx(10.0)], // M-4
  ]);
  segmentedZ(group, gx(5.0), gz(0), gz(4.2), [[gz(2.55), gz(3.45)]]); // M-5
  segmentedZ(group, gx(8.3), gz(0), gz(4.2), [[gz(2.45), gz(3.35)]]); // M-6

  // West bedroom/bathroom, central reception and east dining room.
  segmentedZ(group, gx(3.8), gz(4.2), gz(12.0), [[gz(5.0), gz(5.9)], [gz(8.75), gz(9.65)]]);
  segmentedX(group, gx(0), gx(3.8), gz(6.0), [[gx(2.15), gx(3.05)]]); // M-7
  segmentedZ(group, gx(8.3), gz(4.2), gz(12.0), [[gz(6.15), gz(7.05)], [gz(9.15), gz(10.05)]]);
  segmentedX(group, gx(8.3), gx(12.1), gz(8.4), [[gx(9.65), gx(10.55)]]);
  segmentedX(group, gx(3.8), gx(8.3), gz(8.4), [[gx(5.55), gx(6.55)]]);

  // Front and rear courtyard boundaries remain architectural, not decorative.
  boundaryX(group, 3.8, 8.3, 11.25);
  boundaryZ(group, 3.8, 8.4, 11.25);
  boundaryZ(group, 8.3, 8.4, 11.25);
  boundaryX(group, 1.0, 5.0, 1.8);
}

function secondFloorPartitions(group) {
  // North-centre bedroom and north-east study.
  segmentedX(group, gx(0), gx(12.1), gz(4.2), [[gx(2.0), gx(2.9)], [gx(6.2), gx(7.1)], [gx(9.25), gx(10.15)]]);
  segmentedZ(group, gx(3.8), gz(0), gz(4.2), [[gz(2.45), gz(3.35)]]); // M-2
  segmentedZ(group, gx(8.3), gz(0), gz(4.2), [[gz(2.45), gz(3.35)]]); // M-3

  // South-west bedroom, west bathroom/stair, east bedroom and central living room.
  segmentedZ(group, gx(3.8), gz(4.2), gz(12.0), [[gz(5.0), gz(5.9)], [gz(8.9), gz(9.8)]]); // M-4/M-5
  segmentedX(group, gx(0), gx(3.8), gz(6.0), [[gx(2.15), gx(3.05)]]); // M-6
  segmentedX(group, gx(0), gx(3.8), gz(8.4), [[gx(2.0), gx(2.9)]]); // M-7
  segmentedZ(group, gx(8.3), gz(4.2), gz(12.0), [[gz(6.0), gz(6.9)], [gz(9.0), gz(9.9)]]);
  segmentedX(group, gx(3.8), gx(8.3), gz(8.4), [[gx(5.55), gx(6.55)]]);

  // South-centre balcony boundary and its slab edge.
  boundaryZ(group, 5.0, 8.4, 12.0);
  boundaryZ(group, 8.3, 8.4, 12.0);
  boundaryX(group, 5.0, 8.3, 11.9);
}

function makeFloor(level) {
  const group = new THREE.Group();
  group.userData.level = level;
  group.position.y = (level - 1) * 2.8;

  const slab = box(group, 0, 0.08, 0, PLAN_W, 0.16, PLAN_D, material.floor, `floor-${level}`);
  slab.userData.level = level;
  clickable.push(slab);

  outerShell(group, level);
  addStairs(group, level);
  if (level === 1) firstFloorPartitions(group);
  else secondFloorPartitions(group);

  scene.add(group);
  floors.push(group);
}

makeFloor(1);
makeFloor(2);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let mode = 'all';
let exploded = false;
let hovered = null;
let cameraTransition = false;
const state = {
  cam: new THREE.Vector3(18, 19, 23),
  target: new THREE.Vector3(0, 1.6, 0),
};

function setView(view) {
  cameraTransition = true;
  mode = String(view);
  exploded = false;
  document.querySelector('#explodeBtn').classList.remove('active');
  document.querySelectorAll('.floor-item').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === mode);
  });

  const names = { all: ['00', '整体建筑'], 1: ['01', '一层墙体'], 2: ['02', '二层墙体'] };
  document.querySelector('#viewIndex').textContent = names[mode][0];
  document.querySelector('#viewName').textContent = names[mode][1];

  floors.forEach((floor) => {
    floor.visible = mode === 'all' || String(floor.userData.level) === mode;
    floor.position.y = (floor.userData.level - 1) * 2.8;
  });

  if (mode === 'all') {
    state.cam.set(18, 19, 23);
    state.target.set(0, 1.6, 0);
  } else {
    const y = (+mode - 1) * 2.8;
    state.cam.set(10.8, y + 16.8, 16.2);
    state.target.set(0, y, -0.4);
  }
}

function toggleExplode() {
  cameraTransition = true;
  exploded = !exploded;
  mode = 'all';
  document.querySelectorAll('.floor-item').forEach((button) => button.classList.remove('active'));
  document.querySelector('#explodeBtn').classList.toggle('active', exploded);
  document.querySelector('#viewIndex').textContent = exploded ? '↕' : '00';
  document.querySelector('#viewName').textContent = exploded ? '墙体分层图' : '整体建筑';
  floors.forEach((floor) => {
    floor.visible = true;
    floor.position.y = (floor.userData.level - 1) * (exploded ? 5.4 : 2.8);
  });
  state.cam.set(20, 21, 25);
  state.target.set(0, exploded ? 3.0 : 1.6, 0);
}

document.querySelectorAll('.floor-item').forEach((button) => {
  button.addEventListener('click', () => setView(button.dataset.view));
});
document.querySelector('#explodeBtn').addEventListener('click', toggleExplode);
document.querySelector('#resetView').addEventListener('click', () => setView('all'));

// Once the user starts orbiting, stop applying preset camera coordinates.
// OrbitControls then owns the camera, so the chosen angle remains unchanged.
controls.addEventListener('start', () => {
  cameraTransition = false;
});

canvas.addEventListener('pointermove', (event) => {
  const rect = canvas.getBoundingClientRect();
  pointer.set(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1,
  );
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(clickable, false)[0];
  canvas.style.cursor = hit ? 'pointer' : 'grab';
  hovered = hit?.object || null;
});

canvas.addEventListener('click', () => {
  if (hovered && mode === 'all' && !exploded) setView(hovered.userData.level);
});

function resize() {
  const width = viewport.clientWidth;
  const height = viewport.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  if (cameraTransition) {
    camera.position.lerp(state.cam, 1 - Math.exp(-2.4 * delta));
    controls.target.lerp(state.target, 1 - Math.exp(-2.4 * delta));
    if (camera.position.distanceTo(state.cam) < 0.01 && controls.target.distanceTo(state.target) < 0.01) {
      camera.position.copy(state.cam);
      controls.target.copy(state.target);
      cameraTransition = false;
    }
  }
  controls.update();
  renderer.render(scene, camera);
}

setView('all');
animate();
setTimeout(() => document.querySelector('#loading').classList.add('hidden'), 500);
