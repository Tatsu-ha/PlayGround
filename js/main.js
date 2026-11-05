import {
  CARDS, CARD_BY_ID, CHAPTERS, ENEMIES, BODY_PARTS,
  STATUS_INFO, DIFFICULTY_LABEL, cardLevel, describeCard, upgradeCost
} from './data.js';
import {
  defaultState, loadGame, saveGame, clearSave, addCard, upgradeCard,
  completeFight, doRest, restCost, canRest, rankFor
} from './save.js';
import { Battle } from './battle.js';
import { ArenaRenderer } from './render.js';
import { sfx, initAudio, setSound } from './audio.js';

/* ---------------- helpers ---------------- */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const STYLE_LABEL = { tiger: 'Tiger', crane: 'Crane', serpent: 'Serpent' };

const toastEl = $('#toast');
let toastTimer = 0;
function toast(msg, bad = false) {
  toastEl.textContent = msg;
  toastEl.classList.toggle('bad', bad);
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

let modalOnClose = null;
let modalClosable = true;
function openModal(html, { closable = true, onClose = null, wide = false } = {}) {
  closeModal(true);
  modalOnClose = onClose;
  modalClosable = closable;
  $('#modal-root').innerHTML = `
    <div class="overlay">
      <div class="modal${wide ? ' modal-wide' : ''}" role="dialog" aria-modal="true">
        ${closable ? '<button class="modal-close" data-close aria-label="Close">✕</button>' : ''}
        ${html}
      </div>
    </div>`;
}
function closeModal(silent = false) {
  const cb = modalOnClose;
  modalOnClose = null;
  $('#modal-root').innerHTML = '';
  if (!silent && cb) setTimeout(cb, 0);
}
function hasModal() { return !!$('#modal-root').innerHTML; }

/* ---------------- state ---------------- */

let game = loadGame();
let saveExists = !!game;
if (!game) game = defaultState();
let battle = null;
let renderer = null;
let uiLock = false;
let lastHandSig = '';
let bannerTimer = 0;
let currentScreen = 'title';
let currentEnemyIndex = 0;
let pendingFinal = false;

/* ---------------- start ---------------- */

function init() {
  renderer = new ArenaRenderer($('#arena'));
  makeEmbers();
  applySound();
  bindEvents();
  if (saveExists) {
    $('#btn-continue').hidden = false;
    $('#btn-new').textContent = 'New Journey';
  }
  showScreen('title');
}

function makeEmbers() {
  const wrap = $('#embers');
  if (!wrap) return;
  for (let i = 0; i < 26; i++) {
    const e = document.createElement('span');
    e.className = 'ember';
    e.style.left = `${Math.random() * 100}%`;
    e.style.bottom = `${-5 + Math.random() * 10}%`;
    e.style.animationDuration = `${10 + Math.random() * 16}s`;
    e.style.animationDelay = `${-Math.random() * 22}s`;
    e.style.opacity = `${0.15 + Math.random() * 0.65}`;
    e.style.transform += ` scale(${0.5 + Math.random() * 1.6})`;
    wrap.appendChild(e);
  }
}

function showScreen(name) {
  currentScreen = name;
  $$('.screen').forEach(s => {
    s.classList.toggle('active', s.id === `${name}-screen`);
    s.classList.remove('fade-in');
  });
  const screen = $(`#${name}-screen`);
  if (screen) {
    void screen.offsetWidth;
    screen.classList.add('fade-in');
  }
}

function applySound() {
  setSound(game.settings.sound);
  const label = game.settings.sound ? 'SOUND: ON' : 'SOUND: OFF';
  const simple = game.settings.sound ? 'SOUND' : 'MUTED';
  if ($('#btn-sound-title')) $('#btn-sound-title').textContent = label;
  if ($('#btn-sound')) $('#btn-sound').textContent = simple;
}

function toggleSound() {
  game.settings.sound = !game.settings.sound;
  saveGame(game);
  setSound(game.settings.sound);
  applySound();
  if (game.settings.sound) sfx('chi');
}

/* ---------------- cards ---------------- */

function cardHTML(cardId, level = 0, opts = {}) {
  const def = CARD_BY_ID[cardId];
  if (!def) return '';
  const stats = def.levels[clamp(level, 0, 2)];
  const desc = describeCard(cardId, { [cardId]: clamp(level, 0, 2) });
  const tag = opts.button ? 'button' : 'article';
  const attrs = [];
  if (opts.button) {
    attrs.push('type="button"');
    if (opts.uid != null) attrs.push(`data-uid="${opts.uid}"`);
    if (opts.reward) attrs.push(`data-reward="${cardId}"`);
    if (opts.start) attrs.push(`data-start="${opts.start}"`);
  }
  const classes = [
    'card', `style-${def.style}`,
    opts.static ? 'static-card' : '',
    opts.locked ? 'locked-card' : '',
    opts.reward ? 'reward-card' : '',
    opts.entering ? 'entering' : '',
    opts.className || ''
  ].filter(Boolean).join(' ');
  const style = opts.index != null ? ` style="--i:${opts.index}"` : '';
  const marks = '◆'.repeat(clamp(level, 0, 2));
  const targetName = def.target && BODY_PARTS[def.target] ? BODY_PARTS[def.target].label : '';
  const aria = `${def.name}, ${stats.cost} Chi, ${desc.replace(/<[^>]+>/g, '')}${targetName ? `, targets the ${targetName}` : ''}`;
  return `<${tag} class="${classes}" ${attrs.join(' ')} ${opts.button ? `aria-label="${esc(aria)}"` : ''}${style}>
    <span class="card-cost">${stats.cost}</span>
    <span class="card-type">${esc(def.type)}</span>
    ${marks ? `<span class="card-marks" aria-label="Tempered ${level}">${marks}</span>` : ''}
    <span class="card-style-glyph" aria-hidden="true">${def.style === 'tiger' ? '虎' : def.style === 'crane' ? '鶴' : '蛇'}</span>
    <span class="card-name">${esc(def.name)}</span>
    <span class="card-art" aria-hidden="true"><span class="brush-ring"></span><span class="sigil">${def.sigil}</span></span>
    <span class="card-desc">${desc}</span>
    <span class="card-foot"><span>${STYLE_LABEL[def.style]} · ${esc(def.type)}${targetName ? ` · ${targetName}` : ''}</span><span>${level ? ROMAN[level] : ''}</span></span>
  </${tag}>`;
}

function xpPct(p) {
  return clamp((p.xp / Math.max(1, p.xpNext)) * 100, 0, 100);
}

/* ---------------- map ---------------- */

function renderMap() {
  if (!game) return;
  const p = game.player;
  const completed = game.progress.completed.length;
  $('#map-insight').textContent = `${p.insight} INSIGHT`;

  const upgraded = p.owned.filter(id => cardLevel(id, p.upgrades) > 0).length;
  const nextEnemy = ENEMIES[game.progress.next];
  const note = game.campaignComplete
    ? 'The ten trials are complete. The Iron Lotus is yours — and the road keeps going.'
    : nextEnemy
      ? `Your next rival: <b>${esc(nextEnemy.name)}</b>, ${esc(nextEnemy.title)}.`
      : 'The road waits.';

  $('#profile-panel').innerHTML = `
    <div class="profile-head">
      <div class="profile-avatar" aria-hidden="true">${p.level >= 8 ? '蓮' : p.level >= 4 ? '武' : '旅'}</div>
      <div>
        <h3 class="profile-name">The Wanderer</h3>
        <p class="profile-rank">Level ${p.level} · ${esc(rankFor(p.level))}</p>
      </div>
    </div>
    <div class="stat-block">
      <div class="stat-label"><span>Vitality</span><b>${p.hp} / ${p.maxHp}</b></div>
      <div class="bar hp" role="img" aria-label="Health ${p.hp} of ${p.maxHp}"><i style="width:${clamp(p.hp / p.maxHp * 100, 0, 100)}%"></i></div>
    </div>
    <div class="stat-block">
      <div class="stat-label"><span>Experience</span><b>${p.xp} / ${p.xpNext} XP</b></div>
      <div class="bar xp" role="img" aria-label="Experience ${p.xp} of ${p.xpNext}"><i style="width:${xpPct(p)}%"></i></div>
    </div>
    <div class="profile-stats">
      <div class="mini-stat"><span>Insight</span><b>${p.insight}</b></div>
      <div class="mini-stat"><span>Trials</span><b>${completed}/10</b></div>
      <div class="mini-stat"><span>Deck</span><b>${p.owned.length}</b></div>
      <div class="mini-stat"><span>Tempered</span><b>${upgraded}</b></div>
    </div>
    <div class="profile-actions">
      <button class="btn btn-ghost" data-open="deck">Your Deck</button>
      <button class="btn btn-ghost" data-open="dojo">The Dojo</button>
      <button class="btn btn-ghost" data-open="rest">Rest · ${restCost(game)} insight</button>
    </div>
    <p class="profile-note">${note}</p>`;

  $('#campaign-copy').innerHTML = game.campaignComplete
    ? 'The map ends at the summit. What lies beyond it, you must write yourself.'
    : 'A faded map marks ten martial artists who guard the petals of the Iron Lotus. Defeat each one. Learn their ways. Carry your scars forward.';

  let html = '';
  for (const ch of CHAPTERS) {
    const fights = ch.range;
    const chapterDone = fights.filter(i => game.progress.completed.includes(i)).length;
    html += `<section class="chapter" data-chapter="${ch.num}">
      <div class="chapter-head">
        <span class="chapter-num">Chapter ${ch.num}</span>
        <h3 class="chapter-name">${esc(ch.name)}</h3>
        <span class="chapter-rule"></span>
        <span class="chapter-progress">${chapterDone}/${fights.length}</span>
      </div>
      <p class="campaign-copy" style="font-size:.76rem;margin:-6px 0 12px">${esc(ch.blurb)}</p>
      <div class="duel-river">`;
    for (const i of fights) {
      const e = ENEMIES[i];
      const done = game.progress.completed.includes(i) || (game.campaignComplete && i === 9);
      const current = i === game.progress.next && !done;
      const locked = i > game.progress.next;
      const status = done
        ? '<span class="stamp" aria-label="Conquered">勝</span>'
        : current ? 'Next Trial' : 'Sealed';
      const startText = done ? 'Conquered' : current ? 'Challenge' : 'Sealed';
      html += `<button class="duel-node ${done ? 'done' : ''} ${current ? 'current' : ''} ${locked ? 'locked' : ''}"
        data-index="${i}" data-style="${e.style}" ${locked ? 'disabled aria-disabled="true"' : ''}
        aria-label="${esc(e.name)}, ${esc(e.title)}${locked ? ', locked' : ''}">
        <div class="node-top">
          <div class="node-emblem" aria-hidden="true">${e.glyph}</div>
          <div class="node-status">${status}</div>
        </div>
        <p class="node-name">${esc(e.name)}</p>
        <p class="node-title">${esc(e.title)}</p>
        <div class="node-meta"><span>HP <b>${e.hp}</b></span><span>${esc(DIFFICULTY_LABEL[e.rewardTier] || 'Adept')}</span></div>
        <div class="node-start"><span>${startText}</span><span>${done ? '✓' : locked ? '×' : '→'}</span></div>
      </button>`;
    }
    html += `</div></section>`;
  }
  $('#campaign').innerHTML = html;

  requestAnimationFrame(() => {
    const current = $('.duel-node.current');
    if (current) {
      try { current.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch { /* ignore */ }
    }
  });
}

function openDuelIntro(index) {
  const e = ENEMIES[index];
  if (!e) return;
  if (index > game.progress.next) {
    toast('That trial is still sealed.', true);
    sfx('deny');
    return;
  }
  const done = game.progress.completed.includes(index);
  const facts = `
    <div class="duel-facts">
      <span>Vitality <b>${e.hp}</b></span>
      <span>Posture <b>${e.posture}</b></span>
      <span>Reward <b>${e.insight} insight</b></span>
      <span>${esc(DIFFICULTY_LABEL[e.rewardTier] || 'Adept')}</span>
    </div>`;
  const action = done
    ? `<button class="btn btn-ghost" data-close>Trial Complete</button>`
    : `<button class="btn btn-primary" data-start-fight="${index}">Enter the Duel</button>
       <button class="btn btn-ghost" data-close>Not Yet</button>`;
  openModal(`
    <div class="duel-intro">
      <div class="duel-portrait">
        <span class="emblem">${e.glyph}</span>
        <span class="portrait-title">${done ? 'Conquered' : 'Challenger'}</span>
      </div>
      <div class="duel-intro-body">
        <p class="epithet">${esc(e.title)} · Trial ${index + 1}</p>
        <h2>${esc(e.name)}</h2>
        <p class="duel-quote">${esc(e.quote)}</p>
        ${facts}
        <p class="duel-hint"><span>Hint:</span> ${esc(e.hint)}</p>
      </div>
    </div>
    <div class="modal-actions">${action}</div>
  `, { wide: true });
  $$('[data-start-fight]').forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal(true);
      startFight(index);
    });
  });
}

/* ---------------- battle ---------------- */

function startFight(index) {
  const e = ENEMIES[index];
  if (!e) return;
  closeModal(true);
  currentEnemyIndex = index;
  if (game.player.hp <= 0) game.player.hp = game.player.maxHp;
  saveGame(game);
  uiLock = false;
  lastHandSig = '';
  pendingFinal = false;
  showScreen('battle');
  requestAnimationFrame(() => renderer.resize());

  battle = new Battle({
    state: game,
    enemyDef: e,
    enemyIndex: index,
    renderer,
    callbacks: {
      onUpdate: () => updateBattleUI(),
      onLog: html => { const el = $('#battle-log'); if (el) el.innerHTML = html; },
      onBanner: (title, sub, tone) => showBanner(title, sub, tone),
      onFloat: (who, text, cls) => floatNumber(who, text, cls),
      onToast: toast,
      onSfx: name => sfx(name),
      onDraw: () => sfx('draw'),
      onStrikeMinigame: ctx => runStrikeMinigame(ctx),
      onWin: summary => handleWin(summary),
      onLose: summary => handleLose(summary)
    }
  });
  updateBattleUI();
  battle.start();
}

function updateBattleUI() {
  if (!battle) return;
  const p = battle.player;
  const e = battle.enemy;
  const def = battle.def;

  $('#hud-player').innerHTML = `
    <div class="hud-head"><span class="hud-name">The Wanderer</span><span class="hud-lv">LV. ${p.level}</span></div>
    <div class="hud-title">${esc(rankFor(p.level))}</div>
    <div class="hud-bars">
      <div class="hud-bar hp"><i style="width:${clamp(p.hp / p.maxHp * 100, 0, 100)}%"></i><span class="hud-bar-text"><span>HP</span><b>${p.hp}/${p.maxHp}</b></span></div>
      <div class="hud-bar posture"><i style="width:${clamp(p.posture / p.maxPosture * 100, 0, 100)}%"></i></div>
    </div>
    <div class="hud-labels"><span>Vitality</span><span>Balance ${p.posture}</span></div>
    <div class="status-row">${statusChips(p, 'player')}</div>`;

  $('#hud-enemy').innerHTML = `
    <div class="hud-head"><span class="hud-name">${esc(def.name)}</span><span class="hud-lv">${def.chapter === 3 && def.boss ? 'BOSS' : `TRIAL ${battle.enemyIndex + 1}`}</span></div>
    <div class="hud-title">${esc(def.title)}</div>
    <div class="hud-bars">
      <div class="hud-bar hp"><i style="width:${clamp(e.hp / e.maxHp * 100, 0, 100)}%"></i><span class="hud-bar-text"><span>HP</span><b>${e.hp}/${e.maxHp}</b></span></div>
      <div class="hud-bar posture"><i style="width:${clamp(e.posture / e.maxPosture * 100, 0, 100)}%"></i></div>
    </div>
    <div class="hud-labels"><span>Vitality</span><span>Balance ${e.posture}</span></div>
    <div class="status-row">${statusChips(e, 'enemy')}</div>`;

  $('#turn-medallion').textContent = ROMAN[clamp(battle.turn - 1, 0, 9)] || battle.turn;

  const intent = $('#intent-wrap');
  if (battle.over) {
    intent.innerHTML = '';
  } else if (battle.enemy.statuses.stun > 0) {
    intent.innerHTML = `<div class="intent"><div class="intent-glyph">停</div><div class="intent-body">
      <div class="intent-label">Opponent</div><div class="intent-name">Staggered</div><div class="intent-val">Loses next action</div></div></div>`;
  } else if (battle.enemy.intent) {
    const m = battle.enemy.intent;
    const dmg = battle.intentDamage(m);
    const parts = [];
    if (m.dmg) parts.push(`<b>${dmg}${m.hits > 1 ? `×${m.hits}` : ''}</b> damage`);
    if (m.posture) parts.push(`+${m.posture} posture`);
    if (m.block) parts.push(`Guard ${m.block}`);
    if (m.heal) parts.push(`heal ${m.heal}`);
    if (m.statuses?.enemy) for (const [k, v] of Object.entries(m.statuses.enemy)) parts.push(`${STATUS_INFO[k]?.label || k} ${v}`);
    if (m.statuses?.self) for (const [k, v] of Object.entries(m.statuses.self)) parts.push(`${STATUS_INFO[k]?.label || k} ${v}`);
    intent.innerHTML = `<div class="intent">
      <div class="intent-glyph">${m.glyph || '拳'}</div>
      <div class="intent-body">
        <div class="intent-label">Next move</div>
        <div class="intent-name">${esc(m.name)}</div>
        <div class="intent-val">${parts.join(' · ')}</div>
      </div>
    </div>`;
  } else {
    intent.innerHTML = '';
  }

  renderChi(p);
  renderFlow(p);
  $('#pile-info').innerHTML = `<span>Draw <b>${battle.drawPile.length}</b></span><span>Discard <b>${battle.discardPile.length}</b></span><span>Exhaust <b>${battle.exhaustPile.length}</b></span>`;
  $('#btn-endturn').disabled = battle.busy || battle.over;
  renderHand();
}

function statusChips(f, who) {
  const parts = [];
  if (f.block > 0) parts.push(`<span class="status-chip"><b>${f.block}</b> Guard</span>`);
  const order = ['bleed', 'vulnerable', 'weak', 'strength', 'counter', 'dodge', 'focus', 'regen', 'stun'];
  for (const k of order) {
    if (f.statuses[k] > 0) {
      const info = STATUS_INFO[k];
      parts.push(`<span class="status-chip ${k}" title="${esc(info?.desc || '')}"><b>${f.statuses[k]}</b> ${esc(info?.label || k)}</span>`);
    }
  }
  if (who === 'player' && f.broken > 0) parts.push(`<span class="status-chip broken"><b>!</b> Balance Broken</span>`);
  if (who === 'enemy' && f.parts) {
    for (const [key, meta] of Object.entries(BODY_PARTS)) {
      const part = f.parts[key];
      if (!part) continue;
      const lost = part.max - part.integrity;
      if (!part.crippled && lost <= 0) continue;
      const pct = Math.round((part.integrity / part.max) * 100);
      parts.push(`<span class="status-chip injury ${key} ${part.crippled ? 'crippled' : ''}" title="${esc(meta.effect)}"><b>${meta.glyph}</b> ${part.crippled ? 'CRIPPLED' : `${meta.label} ${pct}%`}</span>`);
    }
  }
  return parts.join('');
}

function renderChi(p) {
  const max = Math.max(p.maxChi, p.chi);
  let html = '';
  for (let i = 0; i < max; i++) {
    html += `<span class="chi-pip ${i < p.chi ? 'full' : 'spent'}"></span>`;
  }
  $('#chi-pips').innerHTML = html;
}

function renderFlow(p) {
  const el = $('#flow-wrap');
  if (!p.stance) {
    el.innerHTML = `<span class="flow-badge">No stance</span>`;
    return;
  }
  const glyph = p.stance === 'tiger' ? '虎' : p.stance === 'crane' ? '鶴' : '蛇';
  const label = STYLE_LABEL[p.stance];
  const bonus = (p.flow - 1) * 2;
  el.innerHTML = `<span class="flow-badge ${p.stance}">${glyph} ${label} Flow ${p.flow}${bonus ? ` · +${bonus}` : ''}</span>`;
}

function renderHand() {
  if (!battle) return;
  const el = $('#hand');
  const sig = battle.hand.map(c => `${c.uid}:${c.level}`).join('|');
  if (sig !== lastHandSig) {
    lastHandSig = sig;
    if (!battle.hand.length) {
      el.innerHTML = `<div class="hand-empty">${battle.over ? 'The duel is decided.' : battle.busy ? 'The dust settles…' : 'No techniques in hand.'}</div>`;
    } else {
      el.innerHTML = battle.hand.map((c, i) => cardHTML(c.id, c.level, {
        button: true, uid: c.uid, index: i, entering: true
      })).join('');
      el.scrollLeft = 0;
    }
  }
  const locked = battle.busy || battle.over || uiLock;
  $$('.card', el).forEach(btn => {
    const card = battle.hand.find(c => c.uid === Number(btn.dataset.uid));
    if (!card) return;
    btn.classList.toggle('unaffordable', card.stats.cost > battle.player.chi);
    btn.disabled = locked;
  });
}

function floatNumber(who, text, cls = '') {
  const layer = $('#float-layer');
  if (!layer || !renderer) return;
  const pos = renderer.getPos(who);
  const el = document.createElement('div');
  el.className = `float-num ${cls}`;
  el.textContent = text;
  el.style.left = `${pos.x + (Math.random() - 0.5) * 38}px`;
  el.style.top = `${pos.y - 12 + (Math.random() - 0.5) * 18}px`;
  layer.appendChild(el);
  setTimeout(() => el.remove(), 1150);
}

function showBanner(title, sub = '', tone = '') {
  const layer = $('#banner-layer');
  if (!layer) return;
  layer.innerHTML = `<div class="banner show ${tone}"><strong>${esc(title)}</strong>${sub ? `<em>${esc(sub)}</em>` : ''}</div>`;
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => {
    const b = $('.banner', layer);
    if (b) b.classList.remove('show');
    setTimeout(() => { layer.innerHTML = ''; }, 220);
  }, 1150);
}

async function onHandClick(ev) {
  const btn = ev.target.closest('.card[data-uid]');
  if (!btn || !battle || uiLock) return;
  if (battle.busy || battle.over) return;
  const card = battle.hand.find(c => c.uid === Number(btn.dataset.uid));
  if (!card) return;
  if (card.stats.cost > battle.player.chi) {
    toast('Not enough Chi.', true);
    sfx('deny');
    btn.classList.remove('playing');
    void btn.offsetWidth;
    btn.style.animation = 'none';
    btn.style.transform = 'translateX(-4px)';
    setTimeout(() => { btn.style.transform = ''; btn.style.animation = ''; }, 150);
    return;
  }
  uiLock = true;
  btn.classList.add('playing');
  await sleep(190);
  try {
    await battle.playCard(card.uid);
  } finally {
    uiLock = false;
    if (battle) updateBattleUI();
  }
}

/* ---------------- strike timing minigame ---------------- */

function runStrikeMinigame({ card, part, bodyPart, enemy, parts }) {
  return new Promise(resolve => {
    $('#strike-game')?.remove();
    const target = bodyPart || BODY_PARTS[part];
    const center = 42 + Math.random() * 16;
    const perfect = 7;
    const good = 18;
    const graze = 31;
    const partRows = Object.entries(BODY_PARTS).map(([key, meta]) => {
      const p = parts[key];
      if (!p) return '';
      const pct = Math.round((p.integrity / p.max) * 100);
      return `<div class="strike-part-row ${p.crippled ? 'crippled' : ''} ${key === part ? 'target' : ''}">
        <span class="strike-part-name"><b>${meta.glyph}</b>${esc(meta.label)}</span>
        <span class="strike-part-bar"><i style="width:${pct}%"></i></span>
        <span class="strike-part-val">${p.crippled ? 'CRIPPLED' : `${pct}%`}</span>
      </div>`;
    }).join('');

    const el = document.createElement('div');
    el.id = 'strike-game';
    el.className = 'strike-overlay';
    el.innerHTML = `
      <div class="strike-panel" role="dialog" aria-modal="true" aria-label="Strike timing">
        <p class="strike-eyebrow">${esc(enemy.name)} · ${esc(card.def.name)}</p>
        <h2 class="strike-title">Strike the <span style="color:${target.color}">${esc(target.label)}</span></h2>
        <p class="strike-hint">Stop the mark inside the bright band. Perfect blows injure the ${esc(target.label.toLowerCase())}.</p>
        <div class="strike-meter" id="strike-meter">
          <span class="strike-zone graze" style="left:${center - graze}%;width:${graze * 2}%"></span>
          <span class="strike-zone good" style="left:${center - good}%;width:${good * 2}%"></span>
          <span class="strike-zone perfect" style="left:${center - perfect}%;width:${perfect * 2}%"></span>
          <span class="strike-marker" id="strike-marker" style="left:${center}%"></span>
        </div>
        <div class="strike-readout"><span id="strike-readout">READY</span><span class="strike-key">SPACE / TAP</span></div>
        <button type="button" class="btn btn-primary strike-btn" id="strike-btn">Strike</button>
        <div class="strike-parts">${partRows}</div>
      </div>`;
    document.body.appendChild(el);
    renderer?.setTargetPart?.(part);

    const marker = $('#strike-marker', el);
    const readout = $('#strike-readout', el);
    let done = false;
    let raf = 0;
    let last = performance.now();
    let elapsed = 0;
    const speed = 74;
    const tick = now => {
      if (done) return;
      elapsed += Math.min(0.05, (now - last) / 1000);
      last = now;
      let pos = 4 + ((elapsed * speed) % 184);
      if (pos > 96) pos = 192 - pos;
      marker.style.left = `${pos}%`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onKey = e => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        strike();
      }
    };

    function strike() {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      const pos = parseFloat(marker.style.left) || center;
      const dist = Math.abs(pos - center);
      let quality, mult, partDamage, title, sub;
      if (dist <= perfect) {
        quality = 'perfect'; mult = 1.6; partDamage = 40;
        title = 'PERFECT'; sub = `${target.label} struck clean.`;
      } else if (dist <= good) {
        quality = 'good'; mult = 1.05; partDamage = 22;
        title = 'CLEAN HIT'; sub = `The ${target.label.toLowerCase()} buckles.`;
      } else if (dist <= graze) {
        quality = 'graze'; mult = 0.55; partDamage = 10;
        title = 'GRAZE'; sub = 'A glancing blow.';
      } else {
        quality = 'miss'; mult = 0.15; partDamage = 0;
        title = 'MISS'; sub = 'The strike finds only air.';
      }
      marker.classList.add('stopped', quality);
      readout.textContent = title;
      readout.className = quality;
      el.classList.add('resolved', quality);
      const hint = $('.strike-hint', el);
      if (hint) hint.textContent = sub;
      const btn = $('.strike-btn', el);
      if (btn) btn.disabled = true;
      if (quality === 'perfect') { sfx('heavy'); renderer?.shakeScreen(8); }
      else if (quality === 'good') sfx('hit');
      else if (quality === 'graze') sfx('block');
      else sfx('deny');
      setTimeout(() => {
        el.classList.add('out');
        setTimeout(() => {
          el.remove();
          renderer?.setTargetPart?.(null);
          resolve({ quality, mult, partDamage });
        }, 220);
      }, 720);
    }

    el.addEventListener('pointerdown', e => {
      if (e.target.closest('.strike-parts')) return;
      strike();
    });
    window.addEventListener('keydown', onKey);
    requestAnimationFrame(() => el.classList.add('in'));
  });
}

/* ---------------- victory / defeat ---------------- */

function handleWin(summary) {
  const enemy = summary.enemy;
  const xpResult = completeFight(game, summary.enemyIndex, enemy);
  saveGame(game);
  const rewards = chooseRewards(enemy);
  pendingFinal = summary.enemyIndex === 9;

  const levelHtml = xpResult.log.length
    ? `<div class="level-list">${xpResult.log.map(l => `<span class="level-toast">Level ${l.level} · +${l.hpGain} vitality${l.chi > 3 ? ' · Chi rises' : ''}</span>`).join('')}</div>`
    : '';

  const rewardHtml = rewards.length
    ? `<p class="reward-prompt">Choose one technique to carry forward</p>
       <div class="reward-row">${rewards.map(c => cardHTML(c.id, 0, { button: true, reward: true })).join('')}</div>
       <div class="modal-actions">
         <button class="btn btn-ghost" data-take-insight>Take 10 insight instead</button>
       </div>`
    : `<p class="reward-prompt">Every technique is already yours.</p>
       <div class="modal-actions"><button class="btn btn-primary" data-continue>Continue</button></div>`;

  openModal(`
    <div class="result-head">
      <div class="result-kanji" aria-hidden="true">${pendingFinal ? '蓮' : '勝'}</div>
      <h2>${pendingFinal ? 'The Lotus Opens' : 'Victory'}</h2>
      <p>${esc(enemy.quote)}</p>
    </div>
    <div class="result-stats">
      <div class="result-stat"><span>Rounds</span><b>${summary.turns}</b></div>
      <div class="result-stat"><span>Damage</span><b>${summary.damageDealt}</b></div>
      <div class="result-stat"><span>Best Hit</span><b>${summary.maxHit}</b></div>
      <div class="result-stat"><span>Posture Breaks</span><b>${summary.postureBreaks}</b></div>
      <div class="result-stat"><span>Insight</span><b>+${enemy.insight}</b></div>
      ${summary.injuries?.length ? `<div class="result-stat"><span>Crippled</span><b>${esc(summary.injuries.join(' · '))}</b></div>` : ''}
    </div>
    ${levelHtml}
    ${rewardHtml}
  `, { closable: false, wide: true });

  $$('[data-reward]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.reward;
      if (addCard(game, id)) {
        saveGame(game);
        sfx('upgrade');
        toast(`${CARD_BY_ID[id].name} added to your deck.`);
      }
      closeModal(true);
      if (pendingFinal) openEnding();
      else returnToMap();
    });
  });
  $$('[data-take-insight]').forEach(btn => {
    btn.addEventListener('click', () => {
      game.player.insight += 10;
      saveGame(game);
      sfx('chi');
      toast('+10 insight');
      closeModal(true);
      if (pendingFinal) openEnding();
      else returnToMap();
    });
  });
  $$('[data-continue]').forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal(true);
      if (pendingFinal) openEnding();
      else returnToMap();
    });
  });
}

function handleLose(summary) {
  const enemy = summary.enemy;
  openModal(`
    <div class="result-head">
      <div class="result-kanji" aria-hidden="true">敗</div>
      <h2>Defeat</h2>
      <p>“${esc(enemy.hint)}”</p>
    </div>
    <div class="result-stats">
      <div class="result-stat"><span>Rounds</span><b>${summary.turns}</b></div>
      <div class="result-stat"><span>Damage</span><b>${summary.damageDealt}</b></div>
      <div class="result-stat"><span>Posture Breaks</span><b>${summary.postureBreaks}</b></div>
    </div>
    <div class="result-body">
      <p class="result-note">Your wounds are tended. Rise again at full strength, or return to the map and sharpen your deck.</p>
      <div class="modal-actions" style="justify-content:center">
        <button class="btn btn-primary" data-retry>Rise Again</button>
        <button class="btn btn-ghost" data-map>Return to the Path</button>
      </div>
    </div>
  `, { closable: false });
  $$('[data-retry]').forEach(btn => {
    btn.addEventListener('click', () => {
      game.player.hp = game.player.maxHp;
      saveGame(game);
      closeModal(true);
      startFight(currentEnemyIndex);
    });
  });
  $$('[data-map]').forEach(btn => {
    btn.addEventListener('click', () => {
      game.player.hp = game.player.maxHp;
      saveGame(game);
      closeModal(true);
      returnToMap();
    });
  });
}

function chooseRewards(enemy) {
  const owned = new Set(game.player.owned);
  let pool = CARDS.filter(c => c.rarity !== 'starter' && !owned.has(c.id));
  if (!pool.length) return [];
  const picks = [];
  const tier = enemy.rewardTier || 1;
  while (picks.length < 3 && pool.length) {
    const weights = pool.map(c => {
      if (c.rarity === 'rare') return tier >= 4 ? 5 : tier >= 3 ? 2.5 : tier >= 2 ? 1 : 0.12;
      return 1;
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * total;
    let idx = 0;
    for (; idx < pool.length; idx++) {
      roll -= weights[idx];
      if (roll <= 0) break;
    }
    picks.push(pool.splice(Math.min(idx, pool.length - 1), 1)[0]);
  }
  return picks;
}

function openEnding() {
  openModal(`
    <div class="result-head">
      <div class="result-kanji" aria-hidden="true">蓮</div>
      <h2>The Iron Lotus</h2>
      <p>The last petal falls. The road begins.</p>
    </div>
    <div class="result-body">
      <p class="result-note" style="font-size:.92rem;font-style:normal;color:var(--paper-dim);line-height:1.8">
        Kurogane's blade lies at your feet. The Black Lotus closes, and the mountain is quiet.<br><br>
        You did not come to guard the flower. You came to learn whether you could become it — iron at the root, lotus at the crown. The wanderer who climbed the path is gone. In their place stands something patient, dangerous, and alive.
      </p>
      <div class="result-stats" style="margin-top:24px">
        <div class="result-stat"><span>Trials</span><b>10 / 10</b></div>
        <div class="result-stat"><span>Victories</span><b>${game.stats.wins || 10}</b></div>
        <div class="result-stat"><span>Rank</span><b>${esc(rankFor(game.player.level))}</b></div>
      </div>
      <p class="result-note">The ten trials are complete. Your deck, your scars, and your name remain.</p>
      <div class="modal-actions" style="justify-content:center"><button class="btn btn-primary" data-finish>Walk the World</button></div>
    </div>
  `, { closable: false, wide: true });
  $$('[data-finish]').forEach(btn => btn.addEventListener('click', () => {
    closeModal(true);
    returnToMap();
  }));
}

function returnToMap() {
  closeModal(true);
  renderer.stop();
  battle = null;
  lastHandSig = '';
  uiLock = false;
  $('#hand').innerHTML = '';
  $('#float-layer').innerHTML = '';
  $('#banner-layer').innerHTML = '';
  showScreen('map');
  renderMap();
  saveGame(game);
}

/* ---------------- deck / dojo / help ---------------- */

function openDeck() {
  const p = game.player;
  const owned = [...p.owned];
  const upgraded = owned.filter(id => cardLevel(id, p.upgrades) > 0).length;
  const locked = CARDS.filter(c => !p.owned.includes(c.id));
  const ordered = owned.sort((a, b) => {
    const ca = CARD_BY_ID[a], cb = CARD_BY_ID[b];
    return ca.style.localeCompare(cb.style) || ca.name.localeCompare(cb.name);
  });
  const cardsHtml = ordered.map(id => cardHTML(id, cardLevel(id, p.upgrades), { static: true })).join('');
  const lockedHtml = locked.map(c => cardHTML(c.id, 0, { static: true, locked: true })).join('');

  openModal(`
    <div class="modal-head">
      <p class="eyebrow">Your collection</p>
      <h2 class="modal-title">The Deck</h2>
      <p class="modal-sub">Every technique you own is shuffled into your deck. Tempered techniques in <b style="color:var(--gold)">The Dojo</b>.</p>
    </div>
    <div class="deck-summary">
      <span>Techniques <b>${owned.length}</b></span>
      <span>Tempered <b>${upgraded}</b></span>
      <span>Known <b>${owned.length}/${CARDS.length}</b></span>
      <span>Insight <b>${p.insight}</b></span>
    </div>
    <div class="card-grid">${cardsHtml}</div>
    ${lockedHtml ? `<div class="card-section-title">Undiscovered techniques</div><div class="locked-grid">${lockedHtml}</div>` : ''}
    <div class="modal-actions"><button class="btn btn-ghost" data-close>Return</button></div>
  `, { wide: true, onClose: renderMap });
}

function openDojo() {
  const p = game.player;
  const ordered = [...p.owned].sort((a, b) => {
    const ca = CARD_BY_ID[a], cb = CARD_BY_ID[b];
    return ca.style.localeCompare(cb.style) || ca.name.localeCompare(cb.name);
  });
  const cards = ordered.map(id => {
    const lvl = cardLevel(id, p.upgrades);
    const cost = upgradeCost(id, p.upgrades);
    const can = cost != null && p.insight >= cost;
    const label = lvl >= 2
      ? 'Mastered · III'
      : `Temper ${ROMAN[lvl]} → ${ROMAN[lvl + 1]} · ${cost} insight`;
    return `<div class="dojo-card">
      ${cardHTML(id, lvl, { static: true })}
      <button class="btn ${lvl >= 2 ? 'upgrade-btn maxed' : 'upgrade-btn'}" ${lvl >= 2 || !can ? 'disabled' : ''} data-upgrade="${id}">${label}</button>
    </div>`;
  }).join('');

  const restDisabled = !canRest(game);
  const heal = Math.min(p.maxHp - p.hp, Math.round(p.maxHp * 0.5));
  openModal(`
    <div class="modal-head">
      <p class="eyebrow">The space between battles</p>
      <h2 class="modal-title">The Dojo</h2>
      <p class="modal-sub">Spend insight to temper your techniques. A sharper card is worth more than a longer deck.</p>
    </div>
    <div class="dojo-top">
      <div class="insight-purse">Insight <b>${p.insight}</b></div>
      <div class="insight-purse">Vitality <b>${p.hp}/${p.maxHp}</b></div>
    </div>
    <div class="rest-row">
      <div>
        <div style="font-family:var(--sans);font-size:.58rem;letter-spacing:.16em;text-transform:uppercase;color:var(--gold)">Meditate</div>
        <div style="font-size:.78rem;color:var(--muted);margin-top:4px">Recover ${heal} vitality. Costs ${restCost(game)} insight.</div>
      </div>
      <button class="btn btn-ghost" id="dojo-rest" ${restDisabled ? 'disabled' : ''}>${p.hp >= p.maxHp ? 'At Full Strength' : `Rest · ${restCost(game)}`}</button>
    </div>
    <div class="card-grid">${cards}</div>
    <p class="dojo-note">Each technique has three forms. Tempering raises damage, Guard, and the potency of its effects. The third form is the true shape of the technique.</p>
    <div class="modal-actions"><button class="btn btn-ghost" data-close>Return</button></div>
  `, { wide: true, onClose: renderMap });

  $$('[data-upgrade]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.upgrade;
      const res = upgradeCard(game, id);
      if (res.ok) {
        sfx('upgrade');
        toast(`${CARD_BY_ID[id].name} tempered to ${ROMAN[res.level]}.`);
        renderMap();
        openDojo();
      } else if (res.reason === 'insight') {
        toast('Not enough insight.', true);
        sfx('deny');
      }
    });
  });
  $('#dojo-rest')?.addEventListener('click', () => {
    if (doRest(game)) {
      sfx('heal');
      toast('You breathe. Your wounds close.');
      renderMap();
      openDojo();
    } else {
      toast('You cannot rest right now.', true);
      sfx('deny');
    }
  });
}

function openHelp({ intro = false, onClose = null } = {}) {
  openModal(`
    <div class="modal-head">
      <p class="eyebrow">${intro ? 'Before the first step' : 'The way of the fist'}</p>
      <h2 class="modal-title">How to Fight</h2>
      <p class="modal-sub">Break their balance, time your blows, and never play the same stance twice without purpose.</p>
    </div>
    <div class="how-grid">
      <div class="how-step"><span class="how-num">01 · THE HAND</span><h3>Choose techniques</h3><p>You draw five cards each turn and gain Chi. Click a card to play it. Unplayed cards are discarded when you end your turn.</p></div>
      <div class="how-step"><span class="how-num">02 · THE STRIKE</span><h3>Win the timing</h3><p>Every attack opens a timing meter. Tap or press Space inside the bright band. Perfect blows hurt the targeted body part.</p></div>
      <div class="how-step"><span class="how-num">03 · THE BODY</span><h3>Break their posture</h3><p>Attacks add posture. Fill the amber bar and your rival loses their next action. Guard cards restore your own balance.</p></div>
      <div class="how-step"><span class="how-num">04 · THE SPIRIT</span><h3>Ride the flow</h3><p>Playing cards of the same stance in a row builds Flow, adding damage to every strike. Upgraded cards grow far stronger.</p></div>
    </div>
    <div class="card-section-title">Battle rules</div>
    <ul class="rules-list">
      <li><b>Chi</b> refills at the start of your turn. Cards cost Chi; unspent Chi is lost.</li>
      <li><b>Guard</b> absorbs damage and resets at the start of your next turn.</li>
      <li><b>Posture</b> recovers each turn. A broken opponent is staggered and skips their action.</li>
      <li><b>Balance</b> also matters: if yours breaks, incoming damage rises by 50% for a turn.</li>
      <li><b>Body parts</b> — techniques aim at the head, arms, torso, or legs. Perfect strikes wear a part down; a crippled part suffers a lasting injury for the rest of the duel.</li>
      <li><b>Bleed</b> drains health at the end of the afflicted fighter's turn.</li>
      <li><b>Vulnerable</b> takes +30% damage; <b>Weak</b> deals −25%; <b>Dodge</b> avoids one hit entirely.</li>
      <li><b>Counter</b> answers the next attack. <b>Strength</b> adds damage to every hit.</li>
      <li><b>Exhaust</b> cards leave the duel after one use. Insight is earned in battle and spent in the Dojo.</li>
    </ul>
    <div class="stance-legend">
      <span class="stance-pill tiger"><i>虎</i> Tiger · pressure &amp; posture</span>
      <span class="stance-pill crane"><i>鶴</i> Crane · guard &amp; counter</span>
      <span class="stance-pill serpent"><i>蛇</i> Serpent · Chi &amp; affliction</span>
    </div>
    <div class="modal-actions">
      ${!intro && saveExists ? '<button class="btn btn-danger" id="btn-erase">Erase Journey</button>' : ''}
      <button class="btn btn-primary" id="help-continue">${intro ? 'Enter the Path' : 'Return'}</button>
    </div>
  `, { wide: true, closable: true, onClose });
  $('#help-continue')?.addEventListener('click', () => closeModal());
  $('#btn-erase')?.addEventListener('click', () => {
    openConfirm({
      title: 'Erase this journey?',
      body: 'All levels, techniques, and tempered cards will be lost. The lotus does not remember you.',
      confirm: 'Erase Everything',
      danger: true,
      onConfirm: () => {
        clearSave();
        game = defaultState();
        saveExists = false;
        toast('The pages are blank again.');
        showScreen('title');
        $('#btn-continue').hidden = true;
        $('#btn-new').textContent = 'Begin the Path';
      }
    });
  });
}

function openConfirm({ title, body, confirm = 'Confirm', danger = false, onConfirm }) {
  openModal(`
    <div class="modal-head">
      <p class="eyebrow">A crossroads</p>
      <h2 class="modal-title">${esc(title)}</h2>
      <p class="modal-sub">${esc(body)}</p>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" data-close>Go Back</button>
      <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirm-yes">${esc(confirm)}</button>
    </div>
  `);
  $('#confirm-yes')?.addEventListener('click', () => {
    closeModal(true);
    onConfirm?.();
  });
}

/* ---------------- title / new game ---------------- */

function beginNew() {
  game = defaultState();
  saveExists = true;
  saveGame(game);
  applySound();
  $('#btn-continue').hidden = false;
  $('#btn-new').textContent = 'New Journey';
  openHelp({
    intro: true,
    onClose: () => {
      game.tutorialSeen = true;
      saveGame(game);
      showScreen('map');
      renderMap();
    }
  });
}

function confirmNew() {
  openConfirm({
    title: 'Begin a new journey?',
    body: 'The current path will be forgotten. Your deck, levels, and victories will be lost.',
    confirm: 'Begin Anew',
    danger: true,
    onConfirm: beginNew
  });
}

/* ---------------- events ---------------- */

function bindEvents() {
  // unlock audio on the first gesture
  const unlock = () => { initAudio(); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);

  $('#btn-continue').addEventListener('click', () => {
    if (!game) return;
    sfx('click');
    showScreen('map');
    renderMap();
    if (!game.tutorialSeen) {
      openHelp({
        intro: true,
        onClose: () => { game.tutorialSeen = true; saveGame(game); renderMap(); }
      });
    }
  });
  $('#btn-new').addEventListener('click', () => { sfx('click'); saveExists ? confirmNew() : beginNew(); });
  $('#btn-how').addEventListener('click', () => { sfx('click'); openHelp(); });
  $('#btn-sound-title').addEventListener('click', toggleSound);
  $('#btn-sound').addEventListener('click', toggleSound);
  $('#btn-help').addEventListener('click', () => { sfx('click'); openHelp(); });
  $('#btn-title').addEventListener('click', () => { sfx('click'); showScreen('title'); });
  $('#brand-home').addEventListener('click', () => { sfx('click'); showScreen('title'); });

  $('#btn-deck').addEventListener('click', () => { sfx('click'); openDeck(); });
  $('#btn-dojo').addEventListener('click', () => { sfx('click'); openDojo(); });
  $('#btn-deck-m').addEventListener('click', () => { sfx('click'); openDeck(); });
  $('#btn-dojo-m').addEventListener('click', () => { sfx('click'); openDojo(); });
  $('#btn-rest-m').addEventListener('click', eventRest);
  $('#campaign').addEventListener('click', e => {
    const node = e.target.closest('.duel-node');
    if (!node || node.disabled) return;
    sfx('click');
    openDuelIntro(Number(node.dataset.index));
  });
  $('#profile-panel').addEventListener('click', e => {
    const btn = e.target.closest('[data-open]');
    if (!btn) return;
    sfx('click');
    const action = btn.dataset.open;
    if (action === 'deck') openDeck();
    else if (action === 'dojo') openDojo();
    else if (action === 'rest') eventRest();
  });

  $('#hand').addEventListener('click', onHandClick);
  $('#btn-endturn').addEventListener('click', () => {
    if (!battle || battle.busy || battle.over) return;
    sfx('click');
    battle.endTurn();
  });
  $('#btn-forfeit').addEventListener('click', () => {
    if (!battle || battle.over) return;
    sfx('click');
    openConfirm({
      title: 'Leave the duel?',
      body: 'Yielding counts as a defeat. Your wounds will be tended, and you may challenge this rival again.',
      confirm: 'Yield',
      danger: true,
      onConfirm: () => {
        closeModal(true);
        battle?.finishLose();
      }
    });
  });

  $('#modal-root').addEventListener('click', e => {
    if (e.target.closest('[data-close]')) {
      closeModal();
      return;
    }
    if (e.target.classList.contains('overlay') && modalClosable) closeModal();
  });

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && hasModal()) {
      if (modalClosable) closeModal();
      return;
    }
    if (currentScreen !== 'battle' || hasModal() || !battle || battle.busy || battle.over) return;
    if (e.key === 'e' || e.key === 'E') {
      e.preventDefault();
      battle.endTurn();
      return;
    }
    const n = Number(e.key);
    if (n >= 1 && n <= 9) {
      const card = battle.hand[n - 1];
      if (!card) return;
      if (card.stats.cost > battle.player.chi) {
        toast('Not enough Chi.', true);
        sfx('deny');
        return;
      }
      uiLock = true;
      battle.playCard(card.uid).finally(() => { uiLock = false; if (battle) updateBattleUI(); });
    }
  });

  // subtle click feedback on all UI buttons
  document.addEventListener('click', e => {
    if (e.target.closest('.card')) return;
    if (e.target.closest('button')) {
      initAudio();
      sfx('click');
    }
  }, true);
}

function eventRest() {
  const p = game.player;
  if (p.hp >= p.maxHp) { toast('You are already at full strength.'); return; }
  if (!canRest(game)) { toast('Not enough insight to rest.', true); sfx('deny'); return; }
  if (doRest(game)) {
    sfx('heal');
    toast('You breathe. Your wounds close.');
    renderMap();
  }
}

/* ---------------- go ---------------- */
init();
