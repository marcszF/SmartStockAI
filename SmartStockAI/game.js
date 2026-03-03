const ENEMIES = ["Slime", "Goblin", "Lobo Sombrio", "Esqueleto", "Aranha Abissal", "Golem", "Cavaleiro Corrompido", "Dragão Jovem"];

const baseState = {
  gold: 0,
  xp: 0,
  level: 1,
  essence: 0,
  zone: 1,
  enemiesKilled: 0,
  missionTarget: 15,
  missionReward: 35,
  missionKills: 0,
  buildClass: "Aventureiro",
  talentPoints: 0,
  talents: { fury: 0, precision: 0, flow: 0 },
  upgrades: { sword: 0, training: 0, crit: 0, miner: 0 },
  meta: { power: 0, economy: 0 },
  automation: { autoBuyer: 0, autoClimber: 0, lootDrone: 0 },
  pet: { name: "Poring", level: 1, xp: 0, hunger: 100, mood: 100, energy: 100 },
  minigameBuffs: { critUntil: 0, chestUntil: 0 },
  enemy: { name: "", hp: 10, maxHp: 10 },
  lastTick: Date.now()
};

const state = structuredClone(baseState);

const upgradeDefs = {
  sword: { label: "Espada Afiada", desc: "+1 dano por clique", baseCost: 15, growth: 1.45, buy: () => state.upgrades.sword++ },
  training: { label: "Treino de Combate", desc: "+0.8 DPS automático", baseCost: 30, growth: 1.55, buy: () => state.upgrades.training++ },
  crit: { label: "Instinto Crítico", desc: "+2% chance de crítico", baseCost: 75, growth: 1.75, buy: () => state.upgrades.crit++ },
  miner: { label: "Mineiro Arcano", desc: "+8% ouro por kill", baseCost: 100, growth: 1.6, buy: () => state.upgrades.miner++ }
};

const metaDefs = {
  power: { label: "Força Ancestral", desc: "+10% dano global", baseCost: 5, growth: 1.8, buy: () => state.meta.power++ },
  economy: { label: "Tesouro Eterno", desc: "+12% ouro global", baseCost: 7, growth: 1.9, buy: () => state.meta.economy++ }
};

const talentDefs = {
  fury: { label: "Fúria", desc: "+6% dano por ponto", max: 12 },
  precision: { label: "Precisão", desc: "+1.5% crítico por ponto", max: 12 },
  flow: { label: "Fluxo", desc: "+5% DPS por ponto", max: 12 }
};

const automationDefs = {
  autoBuyer: { label: "Auto Ferreiro", desc: "Compra espada/treino automaticamente", baseCost: 120, growth: 2.1, max: 5 },
  autoClimber: { label: "Navegador de Zona", desc: "Sobe zona quando matar 12 inimigos", baseCost: 220, growth: 2.25, max: 5 },
  lootDrone: { label: "Drone de Loot", desc: "Bônus passivo de ouro por minuto", baseCost: 150, growth: 1.95, max: 10 }
};

function fmt(num) {
  if (num < 1e3) return num.toFixed(num < 10 ? 1 : 0);
  const units = ["K", "M", "B", "T", "aa", "ab"];
  let u = -1;
  while (num >= 1000 && u < units.length - 1) { num /= 1000; u++; }
  return `${num.toFixed(2)}${units[u]}`;
}

function calcEnemyMaxHp() {
  const z = state.zone;
  return Math.floor((10 * Math.pow(1.28, z - 1) + z * 4) * (1 + Math.max(0, z - 40) * 0.006));
}

function petPowerFactor() {
  const p = state.pet;
  const care = (p.hunger + p.mood + p.energy) / 300;
  return 0.88 + care * 0.24 + p.level * 0.01;
}

function classMod() {
  if (state.buildClass === "Guerreiro") return { click: 1.18, dps: 1.05, crit: 0.95 };
  if (state.buildClass === "Ladino") return { click: 0.95, dps: 1.0, crit: 1.35 };
  if (state.buildClass === "Mago") return { click: 1.0, dps: 1.2, crit: 1.0 };
  return { click: 1, dps: 1, crit: 1 };
}

function calcKillGold() {
  const base = 6 * Math.pow(1.22, state.zone - 1);
  const minerBonus = 1 + state.upgrades.miner * 0.08;
  const metaBonus = 1 + state.meta.economy * 0.12;
  const petBonus = 1 + Math.max(0, state.pet.level - 1) * 0.02;
  const chestBuff = Date.now() < state.minigameBuffs.chestUntil ? 1.15 : 1;
  return base * minerBonus * metaBonus * petBonus * chestBuff;
}

function calcKillXp() { return 4 * Math.pow(1.12, state.zone - 1); }

function clickDamage() {
  const cls = classMod();
  const base = 1 + state.upgrades.sword;
  const lvl = 1 + (state.level - 1) * 0.02;
  const meta = 1 + state.meta.power * 0.1;
  const talent = 1 + state.talents.fury * 0.06;
  return base * lvl * meta * talent * cls.click * petPowerFactor();
}

function autoDps() {
  const cls = classMod();
  const base = state.upgrades.training * 0.8;
  const lvl = 1 + (state.level - 1) * 0.02;
  const meta = 1 + state.meta.power * 0.1;
  const talent = 1 + state.talents.flow * 0.05;
  return base * lvl * meta * talent * cls.dps * petPowerFactor();
}

function critChance() {
  const cls = classMod();
  const fromUp = state.upgrades.crit * 0.02;
  const fromTalent = state.talents.precision * 0.015;
  const buff = Date.now() < state.minigameBuffs.critUntil ? 0.1 : 0;
  return Math.min(0.6, (fromUp + fromTalent + buff) * cls.crit);
}

function critMultiplier() { return Math.random() < critChance() ? 2 : 1; }
function upgradeCost(key) { const d = upgradeDefs[key]; return Math.floor(d.baseCost * Math.pow(d.growth, state.upgrades[key])); }
function metaCost(key) { const d = metaDefs[key]; return Math.floor(d.baseCost * Math.pow(d.growth, state.meta[key])); }
function automationCost(key) { const d = automationDefs[key]; return Math.floor(d.baseCost * Math.pow(d.growth, state.automation[key])); }
function xpToNextLevel() { return Math.floor(25 * Math.pow(1.35, state.level - 1)); }

function spawnEnemy() {
  const idx = (state.zone - 1) % ENEMIES.length;
  const tier = Math.floor((state.zone - 1) / ENEMIES.length) + 1;
  state.enemy.name = `${ENEMIES[idx]} ${tier > 1 ? `+${tier}` : ""}`.trim();
  state.enemy.maxHp = calcEnemyMaxHp();
  state.enemy.hp = state.enemy.maxHp;
}

function gainLevelIfNeeded() {
  let leveled = false;
  while (state.xp >= xpToNextLevel()) {
    state.xp -= xpToNextLevel();
    state.level++;
    leveled = true;
    if (state.level % 3 === 0) state.talentPoints++;
  }
  return leveled;
}

function addPetXp(value) {
  state.pet.xp += value;
  while (state.pet.xp >= 40 + state.pet.level * 18) {
    state.pet.xp -= 40 + state.pet.level * 18;
    state.pet.level++;
  }
}

function onKillEnemy() {
  state.gold += calcKillGold();
  state.xp += calcKillXp();
  state.enemiesKilled++;
  state.missionKills++;
  addPetXp(2);
  gainLevelIfNeeded();

  if (state.missionKills >= state.missionTarget) {
    state.gold += state.missionReward;
    state.missionKills = 0;
    state.missionTarget = Math.floor(state.missionTarget * 1.2);
    state.missionReward = Math.floor(state.missionReward * 1.4);
  }

  if (state.automation.autoClimber > 0 && state.enemiesKilled % Math.max(4, 12 - state.automation.autoClimber) === 0) {
    state.zone++;
  }
  spawnEnemy();
}

function damageEnemy(amount) {
  state.enemy.hp -= amount;
  if (state.enemy.hp <= 0) onKillEnemy();
}

function buyUpgrade(key) {
  const cost = upgradeCost(key);
  if (state.gold < cost) return;
  state.gold -= cost;
  upgradeDefs[key].buy();
  render();
}

function buyMeta(key) {
  const cost = metaCost(key);
  if (state.essence < cost) return;
  state.essence -= cost;
  metaDefs[key].buy();
  render();
}

function nextZone() { state.zone++; spawnEnemy(); render(); }

function essenceOnAscend() {
  const progress = Math.max(0, state.zone - 9);
  return Math.floor(Math.pow(progress, 1.15) + state.level * 0.4 + state.enemiesKilled / 40);
}

function ascend() {
  const earned = essenceOnAscend();
  if (earned <= 0) return alert("Chegue pelo menos na zona 10 para ganhar Essência.");
  state.essence += earned;
  state.gold = 0; state.xp = 0; state.level = 1; state.zone = 1; state.enemiesKilled = 0;
  state.missionKills = 0; state.missionTarget = 15; state.missionReward = 35;
  state.upgrades = { sword: 0, training: 0, crit: 0, miner: 0 };
  state.automation = { autoBuyer: 0, autoClimber: 0, lootDrone: state.automation.lootDrone };
  state.talents = { fury: 0, precision: 0, flow: 0 };
  state.talentPoints = 0;
  spawnEnemy(); save(); render();
}

function resetSave() { localStorage.removeItem("rpgInfinitySave"); location.reload(); }
function save() { localStorage.setItem("rpgInfinitySave", JSON.stringify(state)); }

function mergeDefaults(target, defaults) {
  Object.entries(defaults).forEach(([k, v]) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      target[k] = mergeDefaults(target[k] || {}, v);
    } else if (target[k] === undefined) {
      target[k] = v;
    }
  });
  return target;
}

function load() {
  const raw = localStorage.getItem("rpgInfinitySave");
  if (!raw) return;
  const parsed = JSON.parse(raw);
  const merged = mergeDefaults(parsed, structuredClone(baseState));
  Object.assign(state, merged);
}

function chooseClass(name) { state.buildClass = name; render(); }

function upgradeTalent(key) {
  if (state.talentPoints <= 0) return;
  if (state.talents[key] >= talentDefs[key].max) return;
  state.talents[key]++;
  state.talentPoints--;
  render();
}

function buyAutomation(key) {
  const def = automationDefs[key];
  if (state.automation[key] >= def.max) return;
  const cost = automationCost(key);
  if (state.gold < cost) return;
  state.gold -= cost;
  state.automation[key]++;
  render();
}

function carePet(type) {
  const p = state.pet;
  if (type === "feed") {
    if (state.gold < 25) return;
    state.gold -= 25;
    p.hunger = Math.min(100, p.hunger + 24);
  } else if (type === "play") {
    if (state.gold < 20) return;
    state.gold -= 20;
    p.mood = Math.min(100, p.mood + 22);
    p.energy = Math.max(0, p.energy - 10);
  } else {
    p.energy = Math.min(100, p.energy + 28);
  }
  render();
}

function startMinigameCrit() {
  const ok = window.confirm("Clique OK em até 1.5s para ganhar +10% crítico por 45s.");
  if (!ok) return;
  const t0 = performance.now();
  setTimeout(() => {
    const dt = performance.now() - t0;
    if (dt <= 1500) {
      state.minigameBuffs.critUntil = Date.now() + 45000;
      document.getElementById("minigameText").textContent = "Sucesso! Bônus de crítico ativo por 45s.";
    } else {
      document.getElementById("minigameText").textContent = "Falhou no reflexo. Tente novamente.";
    }
    render();
  }, 100);
}

function startMinigameChest() {
  const guess = Number(prompt("Escolha um baú: 1, 2 ou 3"));
  if (![1, 2, 3].includes(guess)) return;
  const right = 1 + Math.floor(Math.random() * 3);
  if (guess === right) {
    state.gold += calcKillGold() * 8;
    state.minigameBuffs.chestUntil = Date.now() + 60000;
    document.getElementById("minigameText").textContent = "Acertou! Ouro instantâneo e +15% ouro por 60s.";
  } else {
    state.gold += calcKillGold() * 1.5;
    document.getElementById("minigameText").textContent = `Errou! O certo era ${right}, mas ganhou consolo.`;
  }
  render();
}

function renderUpgrades() {
  const root = document.getElementById("upgradeList");
  root.innerHTML = "";
  Object.entries(upgradeDefs).forEach(([key, def]) => {
    const cost = upgradeCost(key);
    const item = document.createElement("div");
    item.className = "up-item";
    item.innerHTML = `<div><strong>${def.label}</strong><small>${def.desc}</small><small class="lvl">Nível: ${state.upgrades[key]}</small></div><button ${state.gold < cost ? "disabled" : ""}>${fmt(cost)} ouro</button>`;
    item.querySelector("button").addEventListener("click", () => buyUpgrade(key));
    root.appendChild(item);
  });
}

function renderMeta() {
  const root = document.getElementById("metaList");
  root.innerHTML = "";
  Object.entries(metaDefs).forEach(([key, def]) => {
    const cost = metaCost(key);
    const item = document.createElement("div");
    item.className = "up-item";
    item.innerHTML = `<div><strong>${def.label}</strong><small>${def.desc}</small><small class="lvl">Nível: ${state.meta[key]}</small></div><button ${state.essence < cost ? "disabled" : ""}>${fmt(cost)} essência</button>`;
    item.querySelector("button").addEventListener("click", () => buyMeta(key));
    root.appendChild(item);
  });
}

function renderTalents() {
  const root = document.getElementById("talentList");
  root.innerHTML = "";
  Object.entries(talentDefs).forEach(([key, def]) => {
    const item = document.createElement("div");
    item.className = "up-item";
    const full = state.talents[key] >= def.max;
    item.innerHTML = `<div><strong>${def.label}</strong><small>${def.desc}</small><small class="lvl">${state.talents[key]} / ${def.max}</small></div><button ${(state.talentPoints <= 0 || full) ? "disabled" : ""}>+1 talento</button>`;
    item.querySelector("button").addEventListener("click", () => upgradeTalent(key));
    root.appendChild(item);
  });
}

function renderAutomation() {
  const root = document.getElementById("automationList");
  root.innerHTML = "";
  Object.entries(automationDefs).forEach(([key, def]) => {
    const cost = automationCost(key);
    const maxed = state.automation[key] >= def.max;
    const item = document.createElement("div");
    item.className = "up-item";
    item.innerHTML = `<div><strong>${def.label}</strong><small>${def.desc}</small><small class="lvl">Nível: ${state.automation[key]} / ${def.max}</small></div><button ${(state.gold < cost || maxed) ? "disabled" : ""}>${maxed ? "MAX" : fmt(cost) + " ouro"}</button>`;
    item.querySelector("button").addEventListener("click", () => buyAutomation(key));
    root.appendChild(item);
  });
}

function render() {
  document.getElementById("gold").textContent = fmt(state.gold);
  document.getElementById("xp").textContent = `${fmt(state.xp)} / ${fmt(xpToNextLevel())}`;
  document.getElementById("level").textContent = state.level;
  document.getElementById("essence").textContent = fmt(state.essence);
  document.getElementById("zone").textContent = state.zone;

  document.getElementById("enemyName").textContent = state.enemy.name;
  document.getElementById("enemyHp").textContent = fmt(Math.max(0, state.enemy.hp));
  document.getElementById("enemyMaxHp").textContent = fmt(state.enemy.maxHp);
  document.getElementById("enemyHpBar").style.width = `${Math.max(0, (state.enemy.hp / state.enemy.maxHp) * 100)}%`;

  document.getElementById("clickDamage").textContent = fmt(clickDamage());
  document.getElementById("autoDps").textContent = fmt(autoDps());
  document.getElementById("critChance").textContent = `${(critChance() * 100).toFixed(1)}%`;

  document.getElementById("ascendBtn").textContent = `Ascender (+${essenceOnAscend()} essência)`;
  document.getElementById("missionText").textContent =
    `Derrote ${state.missionTarget} monstros (${state.missionKills}/${state.missionTarget}) para ganhar ${fmt(state.missionReward)} ouro bônus.`;

  document.getElementById("buildClass").textContent = state.buildClass;
  document.getElementById("talentPoints").textContent = state.talentPoints;

  document.getElementById("petName").textContent = state.pet.name;
  document.getElementById("petLevel").textContent = state.pet.level;
  document.getElementById("petHunger").textContent = Math.floor(state.pet.hunger);
  document.getElementById("petMood").textContent = Math.floor(state.pet.mood);
  document.getElementById("petEnergy").textContent = Math.floor(state.pet.energy);
  const petBuffText = `x${petPowerFactor().toFixed(2)} poder global`;
  document.getElementById("petBonus").textContent = petBuffText;

  renderUpgrades();
  renderMeta();
  renderTalents();
  renderAutomation();
}

function runAutomation(dt) {
  if (state.automation.autoBuyer > 0) {
    const priorities = ["training", "sword", "crit", "miner"];
    const attempts = state.automation.autoBuyer;
    for (let i = 0; i < attempts; i++) {
      const key = priorities[i % priorities.length];
      const cost = upgradeCost(key);
      if (state.gold >= cost) {
        state.gold -= cost;
        upgradeDefs[key].buy();
      }
    }
  }

  if (state.automation.lootDrone > 0) {
    const perMinute = state.automation.lootDrone * 0.25;
    state.gold += perMinute * dt * 60;
  }
}

function decayPet(dt) {
  state.pet.hunger = Math.max(0, state.pet.hunger - 0.9 * dt);
  state.pet.mood = Math.max(0, state.pet.mood - 0.7 * dt);
  state.pet.energy = Math.max(0, state.pet.energy - 0.6 * dt);
}

function tick() {
  const now = Date.now();
  const dt = Math.min(1, (now - state.lastTick) / 1000);
  state.lastTick = now;

  runAutomation(dt);
  damageEnemy(autoDps() * dt);
  decayPet(dt);
  render();
}

function bind() {
  document.getElementById("attackBtn").addEventListener("click", () => { damageEnemy(clickDamage() * critMultiplier()); render(); });
  document.getElementById("nextZoneBtn").addEventListener("click", nextZone);
  document.getElementById("ascendBtn").addEventListener("click", ascend);
  document.getElementById("resetBtn").addEventListener("click", resetSave);

  document.getElementById("classWarrior").addEventListener("click", () => chooseClass("Guerreiro"));
  document.getElementById("classRogue").addEventListener("click", () => chooseClass("Ladino"));
  document.getElementById("classMage").addEventListener("click", () => chooseClass("Mago"));

  document.getElementById("miniCritBtn").addEventListener("click", startMinigameCrit);
  document.getElementById("miniChestBtn").addEventListener("click", startMinigameChest);

  document.getElementById("petFeedBtn").addEventListener("click", () => carePet("feed"));
  document.getElementById("petPlayBtn").addEventListener("click", () => carePet("play"));
  document.getElementById("petRestBtn").addEventListener("click", () => carePet("rest"));
}

function init() {
  load();
  if (!state.enemy.name) spawnEnemy();
  state.lastTick = Date.now();
  bind();
  render();
  setInterval(tick, 100);
  setInterval(save, 4000);
}

init();
