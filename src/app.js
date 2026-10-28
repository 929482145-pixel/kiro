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

function addStairs(group) {
  // Central stair shown at the top of both supplied plans.
  for (let i = 0; i < 11; i += 1) {
    box(group, -2.0 + i * 0.4, 0.22 + i * 0.025, -5.73, 0.36, 0.12, 1.52, material.stair);
  }
  wallZ(group, -2.48, -6.48, -4.88, false);
  wallZ(group, 2.48, -6.48, -4.88, false);
  wallX(group, -2.48, -1.48, -4.88, false);
  wallX(group, 1.48, 2.48, -4.88, false);
}

function addBalcony(group) {
  // Recessed south balcony/entrance, matching the lower centre projection in the plan.
  wallZ(group, -2.55, 5.22, 6.05, false);
  wallZ(group, 2.55, 5.22, 6.05, false);
  wallX(group, -2.55, 2.55, 6.05, false);
  box(group, 0, 0.06, 5.63, 5.1, 0.12, 0.82, material.floor);
}

function outerShell(group) {
  // Stepped outline traced from the 13.2m × 13.1m drawing.
  segmentedX(group, -2.48, 2.48, -6.48, [[-0.62, 0.62]], true);
  wallZ(group, -2.48, -6.48, -5.18, true);
  wallZ(group, 2.48, -6.48, -5.18, true);
  wallX(group, -4.62, -2.48, -5.18, true);
  wallX(group, 2.48, 4.62, -5.18, true);
  wallZ(group, -4.62, -5.18, -1.72, true);
  wallZ(group, 4.62, -5.18, -1.72, true);
  wallX(group, -6.62, -4.62, -1.72, true);
  wallX(group, 4.62, 6.62, -1.72, true);
  wallZ(group, -6.62, -1.72, 4.9, true);
  wallZ(group, 6.62, -1.72, 4.9, true);
  segmentedX(group, -6.62, 6.62, 4.9, [[-2.55, 2.55]], true);
  wallZ(group, -2.55, 4.9, 5.22, true);
  wallZ(group, 2.55, 4.9, 5.22, true);
}

function firstFloorPartitions(group) {
  // Left bedroom block: two bedrooms and central shared wet/circulation band.
  segmentedZ(group, -4.18, -5.18, 4.9, [[-4.15, -3.28], [-0.25, 0.62], [3.0, 3.9]]);
  segmentedX(group, -6.62, -4.18, -1.05, [[-5.92, -5.16]]);
  segmentedX(group, -6.62, -4.18, 1.26, [[-5.95, -5.2]]);

  // Right block: kitchen at top, bathroom in middle and bedroom below.
  segmentedZ(group, 4.18, -5.18, 4.9, [[-4.05, -3.18], [-0.35, 0.5], [2.42, 3.3]]);
  segmentedX(group, 4.18, 6.62, -1.05, [[5.08, 5.82]]);
  segmentedX(group, 4.18, 6.62, 1.17, [[5.1, 5.82]]);

  // Dining/stair enclosure and central living room boundaries.
  segmentedX(group, -4.18, -2.48, -4.42, [[-3.5, -2.78]]);
  segmentedX(group, 2.48, 4.18, -4.42, [[2.83, 3.58]]);
  segmentedX(group, -4.18, 4.18, -1.05, [[-3.18, -2.25], [-0.62, 0.65], [2.3, 3.2]]);
}

function secondFloorPartitions(group) {
  // Second floor contains five bedrooms around a central family hall.
  segmentedZ(group, -4.18, -5.18, 4.9, [[-4.08, -3.22], [-0.22, 0.64], [3.0, 3.88]]);
  segmentedX(group, -6.62, -4.18, -1.05, [[-5.94, -5.18]]);
  segmentedX(group, -6.62, -4.18, 1.28, [[-5.96, -5.18]]);

  segmentedZ(group, 4.18, -5.18, 4.9, [[-4.08, -3.2], [-0.28, 0.55], [2.42, 3.3]]);
  segmentedX(group, 4.18, 6.62, -1.05, [[5.08, 5.82]]);
  segmentedX(group, 4.18, 6.62, 1.15, [[5.08, 5.82]]);

  // Central upper bedroom and family hall, with door openings matching the drawing.
  segmentedX(group, -4.18, 4.18, -1.05, [[-3.18, -2.28], [-0.68, 0.68], [2.28, 3.18]]);
  segmentedZ(group, -1.62, -1.05, 4.9, [[0.18, 1.06], [3.36, 4.18]]);
  segmentedX(group, -1.62, 4.18, 1.08, [[-0.48, 0.5], [2.62, 3.48]]);
  segmentedX(group, -1.62, 4.18, 4.05, [[0.22, 1.18]]);
}

function makeFloor(level) {
  const group = new THREE.Group();
  group.userData.level = level;
  group.position.y = (level - 1) * 2.8;

  // One continuous slab follows the overall dimensions; walls preserve the stepped shell.
  const slab = box(group, 0, 0.08, -0.64, 13.24, 0.16, 11.68, material.floor, `floor-${level}`);
  slab.userData.level = level;
  clickable.push(slab);

  outerShell(group);
  addStairs(group);
  addBalcony(group);
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
const state = {
  cam: new THREE.Vector3(18, 19, 23),
  target: new THREE.Vector3(0, 1.6, 0),
};

function setView(view) {
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
  camera.position.lerp(state.cam, 1 - Math.exp(-2.4 * delta));
  controls.target.lerp(state.target, 1 - Math.exp(-2.4 * delta));
  controls.update();
  renderer.render(scene, camera);
}

setView('all');
animate();
setTimeout(() => document.querySelector('#loading').classList.add('hidden'), 500);
