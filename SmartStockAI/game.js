const ENEMIES = ["Slime", "Goblin", "Lobo Sombrio", "Esqueleto", "Aranha Abissal", "Golem", "Cavaleiro Corrompido", "Dragão Jovem"];

const SKILL_PARTS = {
  prefix: ["Arcana", "Sanguínea", "Rúnica", "Nebular", "Sombria", "Solar", "Dracônica", "Abissal", "Etérea", "Tempestuosa"],
  core: ["Lâmina", "Pulso", "Selo", "Dança", "Orbe", "Fenda", "Canto", "Surto", "Marca", "Vórtice"],
  suffix: ["da Fome", "da Aurora", "do Vazio", "das Marés", "do Cometa", "da Ruína", "da Harmonia", "do Eclipse", "de Aço", "de Cinzas"]
};

const SKILL_EFFECTS = [
  { key: "clickMul", min: 0.05, max: 0.25, tag: "Ataque" },
  { key: "dpsMul", min: 0.06, max: 0.3, tag: "Canalização" },
  { key: "critFlat", min: 0.015, max: 0.08, tag: "Precisão" },
  { key: "goldMul", min: 0.05, max: 0.25, tag: "Fortuna" },
  { key: "petMul", min: 0.04, max: 0.18, tag: "Companheiro" },
  { key: "missionMul", min: 0.08, max: 0.35, tag: "Contrato" }
];

const baseState = {
  gold: 0, xp: 0, level: 1, essence: 0, zone: 1, enemiesKilled: 0,
  missionTarget: 15, missionReward: 35, missionKills: 0,
  buildClass: "Aventureiro", talentPoints: 0, skillPoints: 0,
  talents: { fury: 0, precision: 0, flow: 0 },
  upgrades: { sword: 0, training: 0, crit: 0, miner: 0 },
  meta: { power: 0, economy: 0 },
  automation: { autoBuyer: 0, autoClimber: 0, lootDrone: 0 },
  pet: { name: "Poring", level: 1, xp: 0, hunger: 100, mood: 100, energy: 100 },
  minigameBuffs: { critUntil: 0, chestUntil: 0 },
  skills: { runSeed: 0, rerolls: 0, deck: [], learned: [], equipped: [] },
  enemy: { name: "", hp: 10, maxHp: 10 },
  lastTick: Date.now()
};

const state = structuredClone(baseState);

const upgradeDefs = {
  sword: { label: "Espada Afiada", desc: "+1 dano clique", baseCost: 15, growth: 1.45, buy: () => state.upgrades.sword++ },
  training: { label: "Treino", desc: "+0.8 DPS", baseCost: 30, growth: 1.55, buy: () => state.upgrades.training++ },
  crit: { label: "Instinto Crítico", desc: "+2% crítico", baseCost: 75, growth: 1.75, buy: () => state.upgrades.crit++ },
  miner: { label: "Mineiro Arcano", desc: "+8% ouro", baseCost: 100, growth: 1.6, buy: () => state.upgrades.miner++ }
};
const metaDefs = {
  power: { label: "Força Ancestral", desc: "+10% dano", baseCost: 5, growth: 1.8, buy: () => state.meta.power++ },
  economy: { label: "Tesouro Eterno", desc: "+12% ouro", baseCost: 7, growth: 1.9, buy: () => state.meta.economy++ }
};
const talentDefs = {
  fury: { label: "Fúria", desc: "+6% dano", max: 12 },
  precision: { label: "Precisão", desc: "+1.5% crítico", max: 12 },
  flow: { label: "Fluxo", desc: "+5% DPS", max: 12 }
};
const automationDefs = {
  autoBuyer: { label: "Auto Ferreiro", desc: "Compra upgrades", baseCost: 120, growth: 2.1, max: 5 },
  autoClimber: { label: "Navegador", desc: "Sobe zona por kills", baseCost: 220, growth: 2.25, max: 5 },
  lootDrone: { label: "Drone de Loot", desc: "Ouro passivo", baseCost: 150, growth: 1.95, max: 10 }
};

function seededRandom(seed) { let x = Math.sin(seed) * 10000; return x - Math.floor(x); }
function randBetween(seed, min, max) { return min + seededRandom(seed) * (max - min); }

function generateSkill(seed, i) {
  const p = SKILL_PARTS.prefix[Math.floor(seededRandom(seed + i * 2) * SKILL_PARTS.prefix.length)];
  const c = SKILL_PARTS.core[Math.floor(seededRandom(seed + i * 3) * SKILL_PARTS.core.length)];
  const s = SKILL_PARTS.suffix[Math.floor(seededRandom(seed + i * 5) * SKILL_PARTS.suffix.length)];
  const e1 = SKILL_EFFECTS[Math.floor(seededRandom(seed + i * 7) * SKILL_EFFECTS.length)];
  const e2 = SKILL_EFFECTS[Math.floor(seededRandom(seed + i * 11) * SKILL_EFFECTS.length)];
  const val1 = randBetween(seed + i * 13, e1.min, e1.max);
  const val2 = randBetween(seed + i * 17, e2.min, e2.max) * 0.6;
  const rarityRoll = seededRandom(seed + i * 19);
  const rarity = rarityRoll > 0.96 ? "Lendária" : rarityRoll > 0.85 ? "Épica" : rarityRoll > 0.6 ? "Rara" : "Comum";
  const rarityMult = rarity === "Lendária" ? 1.7 : rarity === "Épica" ? 1.42 : rarity === "Rara" ? 1.2 : 1;
  return {
    id: `sk_${seed}_${i}`,
    name: `${p} ${c} ${s}`,
    rarity,
    tags: [e1.tag, e2.tag],
    mods: { [e1.key]: val1 * rarityMult, [e2.key]: (val2 * rarityMult) + (e1.key === e2.key ? val1 * 0.25 : 0) }
  };
}

function generateSkillDeck(seed, size = 64) {
  const deck = [];
  for (let i = 0; i < size; i++) deck.push(generateSkill(seed, i + 1));
  return deck;
}

function fmt(num) {
  if (num < 1e3) return num.toFixed(num < 10 ? 1 : 0);
  const units = ["K", "M", "B", "T", "aa", "ab"]; let u = -1;
  while (num >= 1000 && u < units.length - 1) { num /= 1000; u++; }
  return `${num.toFixed(2)}${units[u]}`;
}

function calcEnemyMaxHp() { const z = state.zone; return Math.floor((10 * Math.pow(1.28, z - 1) + z * 4) * (1 + Math.max(0, z - 40) * 0.006)); }
function petPowerFactor() { const p = state.pet; return 0.88 + ((p.hunger + p.mood + p.energy) / 300) * 0.24 + p.level * 0.01; }

function classMod() {
  if (state.buildClass === "Guerreiro") return { click: 1.18, dps: 1.05, crit: 0.95 };
  if (state.buildClass === "Ladino") return { click: 0.95, dps: 1.0, crit: 1.35 };
  if (state.buildClass === "Mago") return { click: 1.0, dps: 1.2, crit: 1.0 };
  return { click: 1, dps: 1, crit: 1 };
}

function activeSkillMods() {
  const out = { clickMul: 0, dpsMul: 0, critFlat: 0, goldMul: 0, petMul: 0, missionMul: 0 };
  const equipped = state.skills.equipped.map(id => state.skills.deck.find(s => s.id === id)).filter(Boolean);
  equipped.forEach(sk => Object.entries(sk.mods).forEach(([k, v]) => { out[k] = (out[k] || 0) + v; }));

  // sinergia por tags repetidas => mais variedade e buildcraft
  const tagCount = {};
  equipped.forEach(sk => sk.tags.forEach(t => { tagCount[t] = (tagCount[t] || 0) + 1; }));
  Object.values(tagCount).forEach(n => {
    if (n >= 2) { out.clickMul += 0.03 * (n - 1); out.dpsMul += 0.03 * (n - 1); }
    if (n >= 3) out.goldMul += 0.02 * (n - 2);
  });
  return out;
}

function calcKillGold() {
  const sk = activeSkillMods();
  const base = 6 * Math.pow(1.22, state.zone - 1);
  const minerBonus = 1 + state.upgrades.miner * 0.08;
  const metaBonus = 1 + state.meta.economy * 0.12;
  const petBonus = (1 + Math.max(0, state.pet.level - 1) * 0.02) * (1 + sk.petMul);
  const chestBuff = Date.now() < state.minigameBuffs.chestUntil ? 1.15 : 1;
  return base * minerBonus * metaBonus * petBonus * chestBuff * (1 + sk.goldMul);
}
function calcKillXp() { return 4 * Math.pow(1.12, state.zone - 1); }

function clickDamage() {
  const cls = classMod(), sk = activeSkillMods();
  const base = 1 + state.upgrades.sword;
  return base * (1 + (state.level - 1) * 0.02) * (1 + state.meta.power * 0.1) * (1 + state.talents.fury * 0.06) * cls.click * petPowerFactor() * (1 + sk.clickMul);
}
function autoDps() {
  const cls = classMod(), sk = activeSkillMods();
  const base = state.upgrades.training * 0.8;
  return base * (1 + (state.level - 1) * 0.02) * (1 + state.meta.power * 0.1) * (1 + state.talents.flow * 0.05) * cls.dps * petPowerFactor() * (1 + sk.dpsMul);
}
function critChance() {
  const cls = classMod(), sk = activeSkillMods();
  const buff = Date.now() < state.minigameBuffs.critUntil ? 0.1 : 0;
  return Math.min(0.65, (state.upgrades.crit * 0.02 + state.talents.precision * 0.015 + buff + sk.critFlat) * cls.crit);
}

function critMultiplier() { return Math.random() < critChance() ? 2 : 1; }
function upgradeCost(k) { const d = upgradeDefs[k]; return Math.floor(d.baseCost * Math.pow(d.growth, state.upgrades[k])); }
function metaCost(k) { const d = metaDefs[k]; return Math.floor(d.baseCost * Math.pow(d.growth, state.meta[k])); }
function automationCost(k) { const d = automationDefs[k]; return Math.floor(d.baseCost * Math.pow(d.growth, state.automation[k])); }
function xpToNextLevel() { return Math.floor(25 * Math.pow(1.35, state.level - 1)); }

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
    if (state.level % 3 === 0) state.talentPoints++;
    if (state.level % 2 === 0) state.skillPoints++;
  }
}
function addPetXp(v) { state.pet.xp += v; while (state.pet.xp >= 40 + state.pet.level * 18) { state.pet.xp -= 40 + state.pet.level * 18; state.pet.level++; } }

function onKillEnemy() {
  const sk = activeSkillMods();
  state.gold += calcKillGold();
  state.xp += calcKillXp();
  state.enemiesKilled++; state.missionKills++; addPetXp(2); gainLevelIfNeeded();
  if (state.missionKills >= state.missionTarget) {
    state.gold += state.missionReward * (1 + sk.missionMul);
    state.missionKills = 0;
    state.missionTarget = Math.floor(state.missionTarget * 1.2);
    state.missionReward = Math.floor(state.missionReward * 1.4);
  }
  if (state.automation.autoClimber > 0 && state.enemiesKilled % Math.max(4, 12 - state.automation.autoClimber) === 0) state.zone++;
  spawnEnemy();
}
function damageEnemy(amount) { state.enemy.hp -= amount; if (state.enemy.hp <= 0) onKillEnemy(); }

function buyUpgrade(k) { const c = upgradeCost(k); if (state.gold < c) return; state.gold -= c; upgradeDefs[k].buy(); render(); }
function buyMeta(k) { const c = metaCost(k); if (state.essence < c) return; state.essence -= c; metaDefs[k].buy(); render(); }
function nextZone() { state.zone++; spawnEnemy(); render(); }
function essenceOnAscend() { const p = Math.max(0, state.zone - 9); return Math.floor(Math.pow(p, 1.15) + state.level * 0.4 + state.enemiesKilled / 40); }

function regenSkillDeck(payEssence = false) {
  if (payEssence) {
    if (state.essence < 3) return;
    state.essence -= 3;
  }
  state.skills.rerolls++;
  state.skills.runSeed = Math.floor(Date.now() / 1000) + state.skills.rerolls * 97 + state.level * 13;
  state.skills.deck = generateSkillDeck(state.skills.runSeed, 64);
  state.skills.learned = [];
  state.skills.equipped = [];
}

function ascend() {
  const earned = essenceOnAscend();
  if (earned <= 0) return alert("Chegue na zona 10 para ganhar Essência.");
  state.essence += earned;
  state.gold = 0; state.xp = 0; state.level = 1; state.zone = 1; state.enemiesKilled = 0;
  state.missionKills = 0; state.missionTarget = 15; state.missionReward = 35;
  state.upgrades = { sword: 0, training: 0, crit: 0, miner: 0 };
  state.automation = { autoBuyer: 0, autoClimber: 0, lootDrone: state.automation.lootDrone };
  state.talents = { fury: 0, precision: 0, flow: 0 }; state.talentPoints = 0; state.skillPoints = 0;
  regenSkillDeck(false);
  spawnEnemy(); save(); render();
}

function resetSave() { localStorage.removeItem("rpgInfinitySave"); location.reload(); }
function save() { localStorage.setItem("rpgInfinitySave", JSON.stringify(state)); }
function mergeDefaults(target, defaults) {
  Object.entries(defaults).forEach(([k, v]) => {
    if (v && typeof v === "object" && !Array.isArray(v)) target[k] = mergeDefaults(target[k] || {}, v);
    else if (target[k] === undefined) target[k] = v;
  });
  return target;
}
function load() {
  const raw = localStorage.getItem("rpgInfinitySave"); if (!raw) return;
  const merged = mergeDefaults(JSON.parse(raw), structuredClone(baseState)); Object.assign(state, merged);
}

function chooseClass(name) { state.buildClass = name; render(); }
function upgradeTalent(key) {
  if (state.talentPoints <= 0 || state.talents[key] >= talentDefs[key].max) return;
  state.talents[key]++; state.talentPoints--; render();
}
function buyAutomation(key) {
  const def = automationDefs[key], c = automationCost(key);
  if (state.automation[key] >= def.max || state.gold < c) return;
  state.gold -= c; state.automation[key]++; render();
}

function learnSkill(id) {
  if (state.skillPoints <= 0 || state.skills.learned.includes(id)) return;
  state.skillPoints--; state.skills.learned.push(id); render();
}
function equipSkill(id) {
  if (!state.skills.learned.includes(id)) return;
  if (state.skills.equipped.includes(id)) { state.skills.equipped = state.skills.equipped.filter(x => x !== id); render(); return; }
  if (state.skills.equipped.length >= 4) return;
  state.skills.equipped.push(id); render();
}

function mixSkills() {
  const a = document.getElementById("mixA").value;
  const b = document.getElementById("mixB").value;
  if (!a || !b || a === b || state.gold < 120) return;
  const sa = state.skills.deck.find(s => s.id === a);
  const sb = state.skills.deck.find(s => s.id === b);
  if (!sa || !sb || !state.skills.learned.includes(a) || !state.skills.learned.includes(b)) return;
  state.gold -= 120;
  const newSkill = {
    id: `mix_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
    name: `${sa.name.split(" ")[0]}-${sb.name.split(" ")[1]} Híbrida`,
    rarity: "Sintética",
    tags: [...new Set([...sa.tags, ...sb.tags])].slice(0, 3),
    mods: {}
  };
  const keys = [...new Set([...Object.keys(sa.mods), ...Object.keys(sb.mods)])];
  keys.forEach(k => {
    const va = sa.mods[k] || 0, vb = sb.mods[k] || 0;
    newSkill.mods[k] = (va * 0.65 + vb * 0.65) * 0.92; // evita escalada descontrolada
  });
  state.skills.deck.push(newSkill);
  state.skills.learned.push(newSkill.id);
  render();
}

function carePet(type) {
  const p = state.pet;
  if (type === "feed") { if (state.gold < 25) return; state.gold -= 25; p.hunger = Math.min(100, p.hunger + 24); }
  else if (type === "play") { if (state.gold < 20) return; state.gold -= 20; p.mood = Math.min(100, p.mood + 22); p.energy = Math.max(0, p.energy - 10); }
  else p.energy = Math.min(100, p.energy + 28);
  render();
}

function startMinigameCrit() {
  const ok = window.confirm("Clique OK em até 1.5s para +10% crítico por 45s."); if (!ok) return;
  const t0 = performance.now(); setTimeout(() => {
    if (performance.now() - t0 <= 1500) { state.minigameBuffs.critUntil = Date.now() + 45000; document.getElementById("minigameText").textContent = "Sucesso no reflexo!"; }
    else document.getElementById("minigameText").textContent = "Falhou no reflexo.";
    render();
  }, 100);
}
function startMinigameChest() {
  const guess = Number(prompt("Escolha um baú: 1, 2 ou 3")); if (![1, 2, 3].includes(guess)) return;
  const right = 1 + Math.floor(Math.random() * 3);
  if (guess === right) { state.gold += calcKillGold() * 8; state.minigameBuffs.chestUntil = Date.now() + 60000; document.getElementById("minigameText").textContent = "Baú perfeito! +15% ouro por 60s."; }
  else { state.gold += calcKillGold() * 1.5; document.getElementById("minigameText").textContent = `Errou (${right}), ganhou consolo.`; }
  render();
}

function renderCard(defRoot, entries, levelGetter, costGetter, buyFn, currencyLabel, currencyGetter) {
  defRoot.innerHTML = "";
  entries.forEach(([key, def]) => {
    const cost = costGetter(key), lvl = levelGetter(key);
    const item = document.createElement("div"); item.className = "up-item";
    item.innerHTML = `<div><strong>${def.label}</strong><small>${def.desc}</small><small class="lvl">Nível: ${lvl}${def.max ? ` / ${def.max}` : ""}</small></div><button ${(currencyGetter() < cost || (def.max && lvl >= def.max)) ? "disabled" : ""}>${def.max && lvl >= def.max ? "MAX" : fmt(cost) + " " + currencyLabel}</button>`;
    item.querySelector("button").addEventListener("click", () => buyFn(key));
    defRoot.appendChild(item);
  });
}

function renderSkills() {
  const learnedSet = new Set(state.skills.learned);
  const equippedSet = new Set(state.skills.equipped);

  const equippedRoot = document.getElementById("equippedSkills");
  equippedRoot.innerHTML = "";
  state.skills.equipped.forEach(id => {
    const sk = state.skills.deck.find(s => s.id === id);
    if (!sk) return;
    const item = document.createElement("div"); item.className = "up-item";
    item.innerHTML = `<div><strong>${sk.name} [${sk.rarity}]</strong><small>Tags: ${sk.tags.join(", ")}</small><small class="lvl">${Object.entries(sk.mods).map(([k,v]) => `${k}+${(v*100).toFixed(1)}%`).join(" | ")}</small></div><button>Desequipar</button>`;
    item.querySelector("button").addEventListener("click", () => equipSkill(sk.id));
    equippedRoot.appendChild(item);
  });

  const root = document.getElementById("skillList"); root.innerHTML = "";
  state.skills.deck.slice(0, 24).forEach(sk => {
    const learned = learnedSet.has(sk.id), equipped = equippedSet.has(sk.id);
    const item = document.createElement("div"); item.className = "up-item";
    item.innerHTML = `<div><strong>${sk.name} [${sk.rarity}]</strong><small>Tags: ${sk.tags.join(", ")}</small><small class="lvl">${Object.entries(sk.mods).map(([k,v]) => `${k}+${(v*100).toFixed(1)}%`).join(" | ")}</small></div><div class="actions"><button ${learned || state.skillPoints <= 0 ? "disabled" : ""}>Aprender</button><button ${!learned ? "disabled" : ""}>${equipped ? "Desequipar" : "Equipar"}</button></div>`;
    const [learnBtn, eqBtn] = item.querySelectorAll("button");
    learnBtn.addEventListener("click", () => learnSkill(sk.id));
    eqBtn.addEventListener("click", () => equipSkill(sk.id));
    root.appendChild(item);
  });

  const learnedSkills = state.skills.deck.filter(s => learnedSet.has(s.id));
  ["mixA", "mixB"].forEach(id => {
    const sel = document.getElementById(id);
    const current = sel.value;
    sel.innerHTML = `<option value="">Skill</option>`;
    learnedSkills.forEach(sk => {
      const opt = document.createElement("option"); opt.value = sk.id; opt.textContent = sk.name;
      if (sk.id === current) opt.selected = true;
      sel.appendChild(opt);
    });
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
  document.getElementById("missionText").textContent = `Derrote ${state.missionTarget} monstros (${state.missionKills}/${state.missionTarget}) para ganhar ${fmt(state.missionReward)} ouro.`;
  document.getElementById("buildClass").textContent = state.buildClass;
  document.getElementById("talentPoints").textContent = state.talentPoints;
  document.getElementById("skillPoints").textContent = state.skillPoints;
  document.getElementById("runSeed").textContent = state.skills.runSeed;
  document.getElementById("equippedCount").textContent = state.skills.equipped.length;

  document.getElementById("petName").textContent = state.pet.name;
  document.getElementById("petLevel").textContent = state.pet.level;
  document.getElementById("petHunger").textContent = Math.floor(state.pet.hunger);
  document.getElementById("petMood").textContent = Math.floor(state.pet.mood);
  document.getElementById("petEnergy").textContent = Math.floor(state.pet.energy);
  document.getElementById("petBonus").textContent = `x${petPowerFactor().toFixed(2)} poder global`;

  renderCard(document.getElementById("upgradeList"), Object.entries(upgradeDefs), k => state.upgrades[k], upgradeCost, buyUpgrade, "ouro", () => state.gold);
  renderCard(document.getElementById("metaList"), Object.entries(metaDefs), k => state.meta[k], metaCost, buyMeta, "essência", () => state.essence);
  renderCard(document.getElementById("talentList"), Object.entries(talentDefs), k => state.talents[k], () => 0, upgradeTalent, "talento", () => state.talentPoints + 1);
  renderCard(document.getElementById("automationList"), Object.entries(automationDefs), k => state.automation[k], automationCost, buyAutomation, "ouro", () => state.gold);
  renderSkills();
}

function runAutomation(dt) {
  if (state.automation.autoBuyer > 0) {
    const order = ["training", "sword", "crit", "miner"];
    for (let i = 0; i < state.automation.autoBuyer; i++) {
      const k = order[i % order.length], c = upgradeCost(k);
      if (state.gold >= c) { state.gold -= c; upgradeDefs[k].buy(); }
    }
  }
  if (state.automation.lootDrone > 0) state.gold += state.automation.lootDrone * 0.25 * dt * 60;
}

function decayPet(dt) {
  state.pet.hunger = Math.max(0, state.pet.hunger - 0.9 * dt);
  state.pet.mood = Math.max(0, state.pet.mood - 0.7 * dt);
  state.pet.energy = Math.max(0, state.pet.energy - 0.6 * dt);
}

function tick() {
  const now = Date.now(), dt = Math.min(1, (now - state.lastTick) / 1000); state.lastTick = now;
  runAutomation(dt); damageEnemy(autoDps() * dt); decayPet(dt); render();
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
  document.getElementById("mixBtn").addEventListener("click", mixSkills);
  document.getElementById("rerollSkillsBtn").addEventListener("click", () => { regenSkillDeck(true); render(); });
}

function init() {
  load();
  if (!state.skills.runSeed || !state.skills.deck.length) regenSkillDeck(false);
  if (!state.enemy.name) spawnEnemy();
  state.lastTick = Date.now();
  bind(); render();
  setInterval(tick, 100); setInterval(save, 4000);
}

init();
