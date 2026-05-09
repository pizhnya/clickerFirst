import * as THREE from "https://unpkg.com/three@0.166.1/build/three.module.js";
import { GLTFLoader } from "https://unpkg.com/three@0.166.1/examples/jsm/loaders/GLTFLoader.js";

const STORAGE_KEY = "simple_clicker_save_v1";

const state = {
  score: 0,
  clickPower: 1,
  upgradeLevel: 0,
  upgradePrice: 10,
};

const scoreEl = document.getElementById("score");
const clickPowerEl = document.getElementById("clickPower");
const upgradeLevelEl = document.getElementById("upgradeLevel");
const upgradePriceEl = document.getElementById("upgradePrice");
const messageEl = document.getElementById("message");
const upgradeBtn = document.getElementById("upgradeBtn");
const sceneContainer = document.getElementById("sceneContainer");

const scene = new THREE.Scene();
scene.background = new THREE.Color("#eef4ff");

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(0, 0.65, 2.2);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
sceneContainer.appendChild(renderer.domElement);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0xcbd5e1, 1.15);
scene.add(hemiLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
keyLight.position.set(2, 3, 2);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
fillLight.position.set(-2, 1, -1.5);
scene.add(fillLight);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const clock = new THREE.Clock();

let roseRoot = null;
let roseBaseScale = 1;
let bounceTimeLeft = 0;

function saveGame() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadGame() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const saved = JSON.parse(raw);
    state.score = Number(saved.score) || 0;
    state.clickPower = Number(saved.clickPower) || 1;
    state.upgradeLevel = Number(saved.upgradeLevel) || 0;
    state.upgradePrice = Number(saved.upgradePrice) || 10;
  } catch {
    // ignore bad save data
  }
}

function showMessage(text = "") {
  messageEl.textContent = text;
}

function renderUi() {
  scoreEl.textContent = state.score;
  clickPowerEl.textContent = state.clickPower;
  upgradeLevelEl.textContent = state.upgradeLevel;
  upgradePriceEl.textContent = state.upgradePrice;
  upgradeBtn.disabled = state.score < state.upgradePrice;
}

function addScore() {
  state.score += state.clickPower;
  showMessage();
  renderUi();
  saveGame();
}

function buyUpgrade() {
  if (state.score < state.upgradePrice) {
    showMessage("Not enough score for upgrade.");
    return;
  }

  state.score -= state.upgradePrice;
  state.upgradeLevel += 1;
  state.clickPower += 1;
  state.upgradePrice = Math.ceil(state.upgradePrice * 1.5);

  showMessage("Upgrade purchased!");
  renderUi();
  saveGame();
}

function resizeRenderer() {
  const { clientWidth, clientHeight } = sceneContainer;
  renderer.setSize(clientWidth, clientHeight, false);
  camera.aspect = clientWidth / clientHeight;
  camera.updateProjectionMatrix();
}

function setupModel(model) {
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  model.position.sub(center);

  const maxAxis = Math.max(size.x, size.y, size.z) || 1;
  roseBaseScale = 1 / maxAxis;
  model.scale.setScalar(roseBaseScale * 1.5);

  roseRoot = model;
  scene.add(roseRoot);
}

function loadModel() {
  const loader = new GLTFLoader();
  loader.load(
    "assets/models/rose.glb",
    (gltf) => {
      setupModel(gltf.scene);
    },
    undefined,
    () => {
      showMessage("Failed to load rose model.");
    }
  );
}

function triggerBounce() {
  bounceTimeLeft = 0.28;
}

function onSceneClick(event) {
  if (!roseRoot) return;

  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObject(roseRoot, true);
  if (hits.length > 0) {
    triggerBounce();
    addScore();
  }
}

function animate() {
  requestAnimationFrame(animate);

  const elapsed = clock.getElapsedTime();
  const dt = clock.getDelta();

  if (roseRoot) {
    roseRoot.rotation.y = Math.sin(elapsed * 0.85) * 0.4;

    if (bounceTimeLeft > 0) {
      bounceTimeLeft = Math.max(0, bounceTimeLeft - dt);
      const progress = 1 - bounceTimeLeft / 0.28;
      const pulse = Math.sin(progress * Math.PI);
      const scale = roseBaseScale * 1.5 * (1 + pulse * 0.24);
      roseRoot.scale.setScalar(scale);
    } else {
      roseRoot.scale.setScalar(roseBaseScale * 1.5);
    }
  }

  renderer.render(scene, camera);
}

upgradeBtn.addEventListener("click", buyUpgrade);
renderer.domElement.addEventListener("pointerdown", onSceneClick);
window.addEventListener("resize", resizeRenderer);

loadGame();
renderUi();
resizeRenderer();
loadModel();
animate();
