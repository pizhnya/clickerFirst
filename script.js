import * as THREE from "https://esm.sh/three@0.166.1";

const SAVE_KEY = "iso_clicker_runner_v2";
const STAGES_PER_ZONE = 10;
const state = { zone: 1, stage: 1, gold: 0, clickDamage: 1, idleDps: 0, upgradeCost: 25, idleCost: 40, critChance: 0.1, critMultiplier: 2, runState: "running", enemy: null };

const el = (id) => document.getElementById(id);
const ui = { zone: el("zone"), stage: el("stage"), enemyName: el("enemyName"), enemyHp: el("enemyHp"), gold: el("gold"), dps: el("dps"), clickDamage: el("clickDamage"), critInfo: el("critInfo"), upgradeCost: el("upgradeCost"), idleCost: el("idleCost"), upgradeBtn: el("upgradeBtn"), idleBtn: el("idleBtn"), stateText: el("stateText"), feed: el("feed"), scene: el("scene"), fxLayer: el("fxLayer"), hitFlash: el("hitFlash"), enemyBar: el("enemyBar") };

const scene = new THREE.Scene();
scene.background = new THREE.Color("#6f9ac5"); scene.fog = new THREE.Fog("#6f9ac5", 20, 85);
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500); const baseCamPos = new THREE.Vector3(14, 12, 14); camera.position.copy(baseCamPos); camera.lookAt(0, 0, 0);
const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); ui.scene.appendChild(renderer.domElement);
scene.add(new THREE.AmbientLight(0xffffff, 0.65)); const sun = new THREE.DirectionalLight(0xfff3dd, 1.1); sun.position.set(12, 20, 8); scene.add(sun);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshStandardMaterial({ color: "#4a955d" })); ground.rotation.x = -Math.PI / 2; scene.add(ground);
const lane = new THREE.Mesh(new THREE.PlaneGeometry(7, 160), new THREE.MeshStandardMaterial({ color: "#846247" })); lane.rotation.x = -Math.PI / 2; lane.position.y = 0.02; scene.add(lane);


function addEnvironment() {
  for (let i = 0; i < 56; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const z = -75 + i * 2.8 + (Math.random() - 0.5) * 4;
    if (Math.random() < 0.55) {
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.4 + Math.random() * 0.8, 0),
        new THREE.MeshStandardMaterial({ color: "#808791", roughness: 0.95 })
      );
      rock.position.set(side * (5 + Math.random() * 7), 0.35 + Math.random() * 0.4, z);
      rock.scale.setScalar(0.7 + Math.random() * 1.4);
      scene.add(rock);
    } else {
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.22, 1.2 + Math.random() * 1.3, 8),
        new THREE.MeshStandardMaterial({ color: "#6e4f33" })
      );
      const crown = new THREE.Mesh(
        new THREE.SphereGeometry(0.7 + Math.random() * 0.6, 9, 9),
        new THREE.MeshStandardMaterial({ color: "#2f7d3d" })
      );
      const tree = new THREE.Group();
      trunk.position.y = 0.9;
      crown.position.y = 1.8 + Math.random() * 0.4;
      tree.add(trunk, crown);
      tree.position.set(side * (6 + Math.random() * 8), 0, z);
      tree.rotation.y = Math.random() * Math.PI;
      const s = 0.8 + Math.random() * 1.5;
      tree.scale.setScalar(s);
      scene.add(tree);
    }
  }
}
addEnvironment();

const hero = new THREE.Group();
const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.2, 0.6), new THREE.MeshStandardMaterial({ color: "#3b82f6" })); body.position.y = 1.4;
const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 16), new THREE.MeshStandardMaterial({ color: "#ffd4ad" })); head.position.y = 2.25;
const sword = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.15), new THREE.MeshStandardMaterial({ color: "#d9e2f1" })); sword.position.set(0.5, 1.3, 0);
hero.add(body, head, sword); hero.position.set(0, 0, -18); scene.add(hero);

let enemyMesh = null; const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2();
const particles = []; let shakeTime = 0; let shakePower = 0; let hitStop = 0; let zoomTime = 0;
function hpForZone(zone, stage) { const bossMul = stage === STAGES_PER_ZONE ? 8 : 1; return Math.ceil((10 * (zone + 1.55 ** zone)) * (1 + stage * 0.12) * bossMul); }
function goldForZone(zone, stage) { return Math.ceil((4 * 1.15 ** (zone - 1)) * (1 + stage * 0.08)); }
function save() { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
function load() { try { Object.assign(state, JSON.parse(localStorage.getItem(SAVE_KEY) || "{}")); } catch {} }
const feed = (t) => { ui.feed.textContent = t; };
function syncUi() { ui.zone.textContent = state.zone; ui.stage.textContent = `${state.stage}/${STAGES_PER_ZONE}`; ui.enemyName.textContent = state.enemy?.name ?? "-"; ui.enemyHp.textContent = state.enemy ? `${Math.ceil(state.enemy.hp)} / ${state.enemy.maxHp}` : "0 / 0"; ui.gold.textContent = Math.floor(state.gold); ui.dps.textContent = state.idleDps; ui.clickDamage.textContent = state.clickDamage; ui.critInfo.textContent = `${Math.round(state.critChance * 100)}% x${state.critMultiplier}`; ui.upgradeCost.textContent = state.upgradeCost; ui.idleCost.textContent = state.idleCost; ui.upgradeBtn.disabled = state.gold < state.upgradeCost; ui.idleBtn.disabled = state.gold < state.idleCost; const pct = state.enemy ? (state.enemy.hp / state.enemy.maxHp) * 100 : 0; ui.enemyBar.style.width = `${Math.max(0, pct)}%`; }

function spawnEnemy() {
  if (enemyMesh) scene.remove(enemyMesh);
  const isBoss = state.stage === STAGES_PER_ZONE;
  enemyMesh = new THREE.Mesh(new THREE.CapsuleGeometry(isBoss ? 0.9 : 0.6, isBoss ? 1.8 : 1.2, 6, 14), new THREE.MeshStandardMaterial({ color: isBoss ? "#b91c1c" : `hsl(${(state.zone * 37) % 360} 70% 52%)` }));
  enemyMesh.position.set(0, isBoss ? 1.6 : 1.1, -2); scene.add(enemyMesh);
  const maxHp = hpForZone(state.zone, state.stage);
  state.enemy = { name: isBoss ? `Boss ${state.zone}` : `Mob ${state.zone}-${state.stage}`, hp: maxHp, maxHp, gold: goldForZone(state.zone, state.stage) };
  state.runState = "fighting"; ui.stateText.textContent = isBoss ? "БОСС!" : "Бой!"; syncUi();
}
const nextStage = () => { state.stage += 1; if (state.stage > STAGES_PER_ZONE) { state.zone += 1; state.stage = 1; } };
function killEnemy() { state.gold += state.enemy.gold; feed(`+${state.enemy.gold} gold`); shakeTime = 0.25; shakePower = 0.3; zoomTime = 0.22; for (let i = 0; i < 16; i++) spawnParticle(true); state.enemy = null; state.runState = "running"; ui.stateText.textContent = "Бег..."; nextStage(); if (enemyMesh) scene.remove(enemyMesh); enemyMesh = null; save(); syncUi(); }

ui.upgradeBtn.addEventListener("click", () => { if (state.gold < state.upgradeCost) return; state.gold -= state.upgradeCost; state.clickDamage += 1; state.upgradeCost = Math.ceil(state.upgradeCost * 1.6); save(); syncUi(); });
ui.idleBtn.addEventListener("click", () => { if (state.gold < state.idleCost) return; state.gold -= state.idleCost; state.idleDps += 1; state.idleCost = Math.ceil(state.idleCost * 1.7); save(); syncUi(); });

function spawnPopup(text, crit, event) {
  const d = document.createElement("div"); d.className = `dmg-pop ${crit ? "crit" : ""}`; d.textContent = text;
  d.style.left = `${event.clientX}px`; d.style.top = `${event.clientY - 15}px`; ui.fxLayer.appendChild(d);
  setTimeout(() => d.remove(), 520);
}
function flashHit() { ui.hitFlash.classList.remove("active"); void ui.hitFlash.offsetWidth; ui.hitFlash.classList.add("active"); }
function spawnParticle(big = false) {
  const p = new THREE.Mesh(new THREE.SphereGeometry(big ? 0.12 : 0.07, 8, 8), new THREE.MeshStandardMaterial({ color: big ? "#ffd166" : "#ffffff", emissive: big ? "#c69200" : "#1f2937" }));
  p.position.copy(enemyMesh?.position || new THREE.Vector3(0, 1, -2)); p.userData.vel = new THREE.Vector3((Math.random() - 0.5) * 5, Math.random() * 4, (Math.random() - 0.5) * 5); p.userData.life = big ? 0.8 : 0.45;
  particles.push(p); scene.add(p);
}

renderer.domElement.addEventListener("pointerdown", (event) => {
  if (state.runState !== "fighting" || !enemyMesh) return;
  const rect = renderer.domElement.getBoundingClientRect(); pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1; pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera); if (!raycaster.intersectObject(enemyMesh).length) return;
  const isCrit = Math.random() < state.critChance; const dmg = state.clickDamage * (isCrit ? state.critMultiplier : 1);
  state.enemy.hp = Math.max(0, state.enemy.hp - dmg); enemyMesh.scale.setScalar(0.95 + Math.random() * 0.1); enemyMesh.rotation.y += 0.25; feed(`${isCrit ? "CRIT " : ""}-${dmg} HP`);
  shakeTime = isCrit ? 0.15 : 0.08; shakePower = isCrit ? 0.22 : 0.1; hitStop = isCrit ? 0.07 : 0.035; flashHit(); spawnPopup(`-${dmg}`, isCrit, event); for (let i = 0; i < (isCrit ? 9 : 5); i++) spawnParticle(false);
  if (state.enemy.hp === 0) killEnemy(); else syncUi();
});

function resize() { renderer.setSize(ui.scene.clientWidth, ui.scene.clientHeight, false); camera.aspect = ui.scene.clientWidth / ui.scene.clientHeight; camera.updateProjectionMatrix(); }
window.addEventListener("resize", resize);

load(); let t = 0; let last = performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  const rawDt = Math.min(0.05, (now - last) / 1000); last = now;
  if (hitStop > 0) { hitStop -= rawDt; renderer.render(scene, camera); return; }
  const dt = rawDt; t += dt;
  if (state.runState === "running") { hero.position.z += 7 * dt; hero.position.y = Math.sin(t * 15) * 0.06; hero.rotation.z = Math.sin(t * 14) * 0.04; if (hero.position.z >= -4) spawnEnemy(); }
  else { hero.position.z += (-7 - hero.position.z) * 0.08; hero.position.y = 0; hero.rotation.z = 0; if (state.enemy) { state.enemy.hp = Math.max(0, state.enemy.hp - state.idleDps * dt); if (state.enemy.hp === 0) killEnemy(); else syncUi(); } }
  if (state.runState === "running" && hero.position.z > 24) hero.position.z = -24;
  for (let i = particles.length - 1; i >= 0; i--) { const p = particles[i]; p.userData.life -= dt; p.position.addScaledVector(p.userData.vel, dt); p.userData.vel.y -= 6 * dt; p.scale.multiplyScalar(0.985); if (p.userData.life <= 0) { scene.remove(p); particles.splice(i, 1); } }
  let zoomOffset = 0; if (zoomTime > 0) { zoomTime -= dt; zoomOffset = Math.sin((zoomTime / 0.22) * Math.PI) * 1.4; }
  if (shakeTime > 0) { shakeTime -= dt; camera.position.set(baseCamPos.x + (Math.random() - 0.5) * shakePower, baseCamPos.y + (Math.random() - 0.5) * shakePower, baseCamPos.z - zoomOffset + (Math.random() - 0.5) * shakePower); } else camera.position.lerp(new THREE.Vector3(baseCamPos.x, baseCamPos.y, baseCamPos.z - zoomOffset), 0.18);
  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
}
resize(); syncUi(); animate(performance.now());
