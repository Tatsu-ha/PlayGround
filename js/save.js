import { CARD_BY_ID, STARTING_DECK, cardLevel, upgradeCost } from './data.js';

const SAVE_KEY = 'iron-lotus-save-v1';

export function xpNeeded(level) {
  return 55 + (level - 1) * 35;
}

export function maxChiFor(level) {
  let chi = 3;
  if (level >= 3) chi += 1;
  if (level >= 6) chi += 1;
  return chi;
}

export function rankFor(level) {
  if (level >= 10) return 'Iron Lotus';
  if (level >= 8) return 'Lotus Blade';
  if (level >= 7) return 'Mountain Heart';
  if (level >= 6) return 'Jade Fist';
  if (level >= 5) return 'Iron Hand';
  if (level >= 4) return 'Reed in the Wind';
  if (level >= 3) return 'Student of the Gate';
  if (level >= 2) return 'Road Walker';
  return 'Wanderer';
}

export function defaultState() {
  return {
    version: 1,
    player: {
      level: 1,
      xp: 0,
      xpNext: xpNeeded(1),
      hp: 60,
      maxHp: 60,
      insight: 0,
      owned: [...STARTING_DECK],
      upgrades: {}
    },
    progress: {
      next: 0,
      completed: []
    },
    campaignComplete: false,
    settings: { sound: true },
    tutorialSeen: false,
    stats: { fights: 0, wins: 0, damageDealt: 0, bestPostureBreak: 0, restCount: 0 },
    createdAt: Date.now()
  };
}

export function normalizeState(raw) {
  const base = defaultState();
  if (!raw || typeof raw !== 'object') return base;
  const p = raw.player || {};
  const owned = Array.isArray(p.owned) ? p.owned.filter(id => CARD_BY_ID[id]) : [];
  const upgrades = {};
  if (p.upgrades && typeof p.upgrades === 'object') {
    for (const [id, lvl] of Object.entries(p.upgrades)) {
      if (CARD_BY_ID[id]) upgrades[id] = Math.max(0, Math.min(2, Number(lvl) || 0));
    }
  }
  const level = Math.max(1, Math.min(14, Number(p.level) || 1));
  const maxHp = Math.max(40, Number(p.maxHp) || 60);
  return {
    ...base,
    ...raw,
    player: {
      ...base.player,
      ...p,
      level,
      xp: Math.max(0, Number(p.xp) || 0),
      xpNext: Math.max(1, Number(p.xpNext) || xpNeeded(level)),
      hp: Math.max(1, Math.min(maxHp, Number(p.hp) || maxHp)),
      maxHp,
      insight: Math.max(0, Number(p.insight) || 0),
      owned: owned.length ? [...new Set(owned)] : [...STARTING_DECK],
      upgrades
    },
    progress: {
      next: Math.max(0, Math.min(10, Number(raw.progress?.next) || 0)),
      completed: Array.isArray(raw.progress?.completed) ? raw.progress.completed.filter(n => Number.isInteger(n) && n >= 0 && n < 10) : []
    },
    settings: { sound: raw.settings?.sound !== false },
    tutorialSeen: raw.tutorialSeen === true,
    campaignComplete: raw.campaignComplete === true,
    stats: { ...base.stats, ...(raw.stats || {}) }
  };
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return normalizeState(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveGame(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}

export function addXp(state, amount) {
  const p = state.player;
  p.xp += Math.max(0, Math.round(amount));
  let gained = 0;
  const log = [];
  while (p.xp >= p.xpNext && p.level < 14) {
    p.xp -= p.xpNext;
    p.level += 1;
    gained += 1;
    const oldMax = p.maxHp;
    p.maxHp += 7;
    p.hp = p.maxHp;
    p.xpNext = xpNeeded(p.level);
    log.push({ level: p.level, hpGain: p.maxHp - oldMax, chi: maxChiFor(p.level) });
  }
  if (p.level >= 14) {
    p.xp = Math.min(p.xp, p.xpNext - 1);
  }
  return { gained, log };
}

export function healPct(state, pct) {
  const p = state.player;
  const amount = Math.round(p.maxHp * pct);
  const before = p.hp;
  p.hp = Math.min(p.maxHp, p.hp + amount);
  return p.hp - before;
}

export function restCost(state) {
  return 25;
}

export function canRest(state) {
  return state.player.hp < state.player.maxHp && state.player.insight >= restCost(state);
}

export function doRest(state) {
  const cost = restCost(state);
  if (state.player.insight < cost || state.player.hp >= state.player.maxHp) return false;
  state.player.insight -= cost;
  healPct(state, 0.5);
  state.stats.restCount = (state.stats.restCount || 0) + 1;
  saveGame(state);
  return true;
}

export function upgradeCard(state, cardId) {
  const lvl = cardLevel(cardId, state.player.upgrades);
  const cost = upgradeCost(cardId, state.player.upgrades);
  if (lvl >= 2 || !state.player.owned.includes(cardId)) return { ok: false, reason: 'maxed' };
  if (state.player.insight < cost) return { ok: false, reason: 'insight' };
  state.player.insight -= cost;
  state.player.upgrades[cardId] = lvl + 1;
  saveGame(state);
  return { ok: true, level: lvl + 1, cost };
}

export function addCard(state, cardId) {
  if (!CARD_BY_ID[cardId] || state.player.owned.includes(cardId)) return false;
  state.player.owned.push(cardId);
  saveGame(state);
  return true;
}

export function isUnlocked(state, index) {
  return index <= state.progress.next;
}

export function completeFight(state, index, enemy) {
  const p = state.player;
  p.insight += enemy.insight;
  const xpResult = addXp(state, enemy.xp);
  p.hp = Math.min(p.maxHp, Math.max(1, p.hp));
  healPct(state, 0.3);
  if (!state.progress.completed.includes(index)) state.progress.completed.push(index);
  state.progress.next = Math.min(10, Math.max(state.progress.next, index + 1));
  state.stats.wins = (state.stats.wins || 0) + 1;
  state.stats.fights = (state.stats.fights || 0) + 1;
  if (index === 9) state.campaignComplete = true;
  saveGame(state);
  return xpResult;
}
