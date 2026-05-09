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
const clickBtn = document.getElementById("clickBtn");
const upgradeBtn = document.getElementById("upgradeBtn");

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

function render() {
  scoreEl.textContent = state.score;
  clickPowerEl.textContent = state.clickPower;
  upgradeLevelEl.textContent = state.upgradeLevel;
  upgradePriceEl.textContent = state.upgradePrice;
  upgradeBtn.disabled = state.score < state.upgradePrice;
}

function addScore() {
  state.score += state.clickPower;
  showMessage();
  render();
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
  render();
  saveGame();
}

clickBtn.addEventListener("click", addScore);
upgradeBtn.addEventListener("click", buyUpgrade);

loadGame();
render();
