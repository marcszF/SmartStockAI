const ENEMIES = ["Slime", "Goblin", "Lobo Sombrio", "Esqueleto", "Aranha Abissal", "Golem", "Cavaleiro Corrompido", "Dragão Jovem"];

const state = {
  gold: 0,
  xp: 0,
  level: 1,
  essence: 0,
  zone: 1,
  enemiesKilled: 0,
  missionTarget: 15,
  missionReward: 35,
  missionKills: 0,
  upgrades: {
    sword: 0,
    training: 0,
    crit: 0,
    miner: 0
  },
  meta: {
    power: 0,
    economy: 0
  },
  enemy: {
    name: "",
    hp: 10,
    maxHp: 10
  },
  lastTick: Date.now()
};

const upgradeDefs = {
  sword: {
    label: "Espada Afiada",
    desc: "+1 dano por clique",
    baseCost: 15,
    growth: 1.45,
    buy: () => state.upgrades.sword++
  },
  training: {
    label: "Treino de Combate",
    desc: "+0.8 DPS automático",
    baseCost: 30,
    growth: 1.55,
    buy: () => state.upgrades.training++
  },
  crit: {
    label: "Instinto Crítico",
    desc: "+2% chance de crítico (x2)",
    baseCost: 75,
    growth: 1.75,
    buy: () => state.upgrades.crit++
  },
  miner: {
    label: "Mineiro Arcano",
    desc: "+8% ouro por kill",
    baseCost: 100,
    growth: 1.6,
    buy: () => state.upgrades.miner++
  }
};

const metaDefs = {
  power: {
    label: "Força Ancestral",
    desc: "+10% dano global por nível",
    baseCost: 5,
    growth: 1.8,
    buy: () => state.meta.power++
  },
  economy: {
    label: "Tesouro Eterno",
    desc: "+12% ouro global por nível",
    baseCost: 7,
    growth: 1.9,
    buy: () => state.meta.economy++
  }
};

function fmt(num) {
  if (num < 1e3) return num.toFixed(num < 10 ? 1 : 0);
  const units = ["K", "M", "B", "T", "aa", "ab"];
  let u = -1;
  while (num >= 1000 && u < units.length - 1) {
    num /= 1000;
    u++;
  }
  return `${num.toFixed(2)}${units[u]}`;
}

function calcEnemyMaxHp() {
  const z = state.zone;
  return Math.floor(10 * Math.pow(1.28, z - 1) + z * 4);
}

function calcKillGold() {
  const base = 6 * Math.pow(1.22, state.zone - 1);
  const minerBonus = 1 + state.upgrades.miner * 0.08;
  const metaBonus = 1 + state.meta.economy * 0.12;
  return base * minerBonus * metaBonus;
}

function calcKillXp() {
  return 4 * Math.pow(1.12, state.zone - 1);
}

function clickDamage() {
  const base = 1 + state.upgrades.sword;
  const levelBonus = 1 + (state.level - 1) * 0.02;
  const metaBonus = 1 + state.meta.power * 0.1;
  return base * levelBonus * metaBonus;
}

function autoDps() {
  const base = state.upgrades.training * 0.8;
  const levelBonus = 1 + (state.level - 1) * 0.02;
  const metaBonus = 1 + state.meta.power * 0.1;
  return base * levelBonus * metaBonus;
}

function critMultiplier() {
  return Math.random() < state.upgrades.crit * 0.02 ? 2 : 1;
}

function upgradeCost(key) {
  const def = upgradeDefs[key];
  return Math.floor(def.baseCost * Math.pow(def.growth, state.upgrades[key]));
}

function metaCost(key) {
  const def = metaDefs[key];
  return Math.floor(def.baseCost * Math.pow(def.growth, state.meta[key]));
}

function xpToNextLevel() {
  return Math.floor(25 * Math.pow(1.35, state.level - 1));
}

function spawnEnemy() {
  const idx = (state.zone - 1) % ENEMIES.length;
  const tier = Math.floor((state.zone - 1) / ENEMIES.length) + 1;
  state.enemy.name = `${ENEMIES[idx]} ${tier > 1 ? `+${tier}` : ""}`.trim();
  state.enemy.maxHp = calcEnemyMaxHp();
  state.enemy.hp = state.enemy.maxHp;
}

function gainLevelIfNeeded() {
  while (state.xp >= xpToNextLevel()) {
    state.xp -= xpToNextLevel();
    state.level++;
  }
}

function onKillEnemy() {
  state.gold += calcKillGold();
  state.xp += calcKillXp();
  state.enemiesKilled++;
  state.missionKills++;
  gainLevelIfNeeded();

  if (state.missionKills >= state.missionTarget) {
    state.gold += state.missionReward;
    state.missionKills = 0;
    state.missionTarget = Math.floor(state.missionTarget * 1.2);
    state.missionReward = Math.floor(state.missionReward * 1.4);
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

function nextZone() {
  state.zone++;
  spawnEnemy();
  render();
}

function essenceOnAscend() {
  const progress = Math.max(0, state.zone - 9);
  return Math.floor(Math.pow(progress, 1.15) + state.level * 0.4 + state.enemiesKilled / 40);
}

function ascend() {
  const earned = essenceOnAscend();
  if (earned <= 0) {
    alert("Chegue pelo menos na zona 10 para ganhar Essência.");
    return;
  }
  state.essence += earned;
  state.gold = 0;
  state.xp = 0;
  state.level = 1;
  state.zone = 1;
  state.enemiesKilled = 0;
  state.missionKills = 0;
  state.missionTarget = 15;
  state.missionReward = 35;
  state.upgrades = { sword: 0, training: 0, crit: 0, miner: 0 };
  spawnEnemy();
  save();
  render();
}

function resetSave() {
  localStorage.removeItem("rpgInfinitySave");
  location.reload();
}

function save() {
  localStorage.setItem("rpgInfinitySave", JSON.stringify(state));
}

function load() {
  const raw = localStorage.getItem("rpgInfinitySave");
  if (!raw) return;
  const parsed = JSON.parse(raw);
  Object.assign(state, parsed);
}

function renderUpgrades() {
  const root = document.getElementById("upgradeList");
  root.innerHTML = "";

  Object.entries(upgradeDefs).forEach(([key, def]) => {
    const cost = upgradeCost(key);
    const item = document.createElement("div");
    item.className = "up-item";
    item.innerHTML = `
      <div>
        <strong>${def.label}</strong>
        <small>${def.desc}</small>
        <small class="lvl">Nível: ${state.upgrades[key]}</small>
      </div>
      <button ${state.gold < cost ? "disabled" : ""}>${fmt(cost)} ouro</button>
    `;
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
    item.innerHTML = `
      <div>
        <strong>${def.label}</strong>
        <small>${def.desc}</small>
        <small class="lvl">Nível: ${state.meta[key]}</small>
      </div>
      <button ${state.essence < cost ? "disabled" : ""}>${fmt(cost)} essência</button>
    `;
    item.querySelector("button").addEventListener("click", () => buyMeta(key));
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

  const hpPct = Math.max(0, (state.enemy.hp / state.enemy.maxHp) * 100);
  document.getElementById("enemyHpBar").style.width = `${hpPct}%`;

  document.getElementById("clickDamage").textContent = fmt(clickDamage());
  document.getElementById("autoDps").textContent = fmt(autoDps());

  const earn = essenceOnAscend();
  document.getElementById("ascendBtn").textContent = `Ascender (+${earn} essência)`;

  document.getElementById("missionText").textContent =
    `Derrote ${state.missionTarget} monstros (${state.missionKills}/${state.missionTarget}) para ganhar ${fmt(state.missionReward)} ouro bônus.`;

  renderUpgrades();
  renderMeta();
}

function tick() {
  const now = Date.now();
  const dt = Math.min(1, (now - state.lastTick) / 1000);
  state.lastTick = now;

  damageEnemy(autoDps() * dt);
  render();
}

function bind() {
  document.getElementById("attackBtn").addEventListener("click", () => {
    damageEnemy(clickDamage() * critMultiplier());
    render();
  });

  document.getElementById("nextZoneBtn").addEventListener("click", nextZone);
  document.getElementById("ascendBtn").addEventListener("click", ascend);
  document.getElementById("resetBtn").addEventListener("click", resetSave);
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
