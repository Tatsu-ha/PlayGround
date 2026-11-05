import { CARD_BY_ID, cardLevel, describeMove, getCardStats, BODY_PARTS } from './data.js';

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function weightedPick(items, weightFn) {
  const weights = items.map(weightFn);
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return items[0] || null;
  let roll = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}

export class Battle {
  constructor({ state, enemyDef, enemyIndex, renderer, callbacks = {} }) {
    this.state = state;
    this.def = enemyDef;
    this.enemyIndex = enemyIndex;
    this.renderer = renderer;
    this.cb = callbacks;
    this.uid = 0;
    this.over = false;
    this.busy = true;
    this.turn = 1;
    this.logHistory = [];
    this.damageDealt = 0;
    this.maxHit = 0;
    this.postureBreaks = 0;
    this.cardsPlayed = 0;
    this.enemyLooks = enemyDef.look;

    const p = state.player;
    this.player = {
      hp: p.hp,
      maxHp: p.maxHp,
      block: 0,
      posture: 0,
      maxPosture: 100,
      chi: 0,
      maxChi: Math.min(6, 3 + (p.level >= 3 ? 1 : 0) + (p.level >= 6 ? 1 : 0)),
      level: p.level,
      stance: null,
      flow: 0,
      broken: 0,
      statuses: {}
    };

    this.enemy = {
      hp: enemyDef.hp,
      maxHp: enemyDef.hp,
      block: 0,
      posture: 0,
      maxPosture: enemyDef.posture,
      postureRegen: enemyDef.postureRegen,
      statuses: {},
      phase2: false,
      lastMove: null,
      intent: null,
      look: enemyDef.look,
      parts: Object.fromEntries(Object.entries(BODY_PARTS).map(([key, part]) => [
        key, { integrity: part.max, max: part.max, crippled: false }
      ]))
    };

    this.drawPile = shuffle(p.owned.map(id => {
      const level = cardLevel(id, p.upgrades);
      return {
        uid: ++this.uid,
        id,
        level,
        def: CARD_BY_ID[id],
        stats: getCardStats(id, p.upgrades)
      };
    }));
    this.hand = [];
    this.discardPile = [];
    this.exhaustPile = [];

    this.enemy.intent = this.pickIntent();
  }

  /* ---------- setup / snapshots ---------- */

  async start() {
    this.renderer?.setFighters(
      { look: this.playerLook() },
      { look: this.def.look }
    );
    this.renderer?.setEmblem(this.def.glyph);
    this.renderer?.start();
    this.log(`<b>${this.def.name}</b> steps onto the floor.`);
    this.banner(this.def.name.toUpperCase(), this.def.title, 'vermin');
    await wait(650);
    this.startPlayerTurn(true);
  }

  playerLook() {
    return {
      robe: '#24332b', trim: '#d8b678', sash: '#6fae8d', hair: '#1c1914',
      skin: '#c8a57c', build: 1.0, headband: '#e9dec6', topknot: true, weapon: 'none'
    };
  }

  emit() {
    try { this.cb.onUpdate?.(); } catch (err) { console.error(err); }
  }

  log(html) {
    this.logHistory.push(html);
    if (this.logHistory.length > 40) this.logHistory.shift();
    try { this.cb.onLog?.(html); } catch (err) { console.error(err); }
  }

  banner(title, sub = '', tone = '') {
    try { this.cb.onBanner?.(title, sub, tone); } catch (err) { console.error(err); }
  }

  float(who, text, cls = '') {
    try { this.cb.onFloat?.(who, text, cls); } catch (err) { console.error(err); }
  }

  toast(msg, bad = false) {
    try { this.cb.onToast?.(msg, bad); } catch (err) { console.error(err); }
  }

  /* ---------- deck ---------- */

  drawCards(n) {
    let drawn = 0;
    for (let i = 0; i < n; i++) {
      if (this.hand.length >= 10) break;
      if (!this.drawPile.length) {
        if (!this.discardPile.length) break;
        this.drawPile = shuffle(this.discardPile);
        this.discardPile = [];
        this.log('The discard pile is gathered and shuffled.');
      }
      const card = this.drawPile.pop();
      if (card) {
        this.hand.push(card);
        drawn++;
      }
    }
    if (drawn) this.cb.onDraw?.(drawn);
    return drawn;
  }

  discardHand() {
    if (this.hand.length) {
      this.discardPile.push(...this.hand);
      this.hand = [];
    }
  }

  cardDiscard(card) {
    if (card.stats.exhaust) this.exhaustPile.push(card);
    else this.discardPile.push(card);
  }

  /* ---------- turns ---------- */

  async startPlayerTurn(first = false) {
    if (this.over) return;
    this.busy = true;
    this.player.block = 0;
    this.player.posture = Math.max(0, this.player.posture - 20);
    this.player.broken = 0;

    if (this.player.statuses.stun > 0) {
      this.player.statuses.stun -= 1;
      if (this.player.statuses.stun <= 0) delete this.player.statuses.stun;
      this.player.chi = 0;
      this.emit();
      this.banner('STAGGERED', 'You lose this turn.', 'vermin');
      this.log('You are too dazed to act.');
      await wait(900);
      if (!this.over) this.runEnemyTurn();
      return;
    }

    if (!first) this.turn += 1;
    this.player.chi = this.player.maxChi;
    this.drawCards(5);
    this.busy = false;
    this.emit();
    try { this.cb.onTurnStart?.(); } catch { /* ignore */ }
    if (first) {
      this.log('Your move. Choose your techniques.');
    } else {
      this.log(`Round ${this.turn}. Your move.`);
    }
  }

  canPlay(card) {
    return !!card && !this.busy && !this.over && card.stats.cost <= this.player.chi;
  }

  async playCard(uid) {
    if (this.busy || this.over) return false;
    const idx = this.hand.findIndex(c => c.uid === uid);
    if (idx < 0) return false;
    const card = this.hand[idx];
    if (card.stats.cost > this.player.chi) {
      this.toast('Not enough Chi', true);
      return false;
    }
    this.busy = true;
    this.player.chi -= card.stats.cost;
    this.hand.splice(idx, 1);
    this.cardsPlayed += 1;
    this.cb.onCardPlayed?.(card);
    this.emit();
    this.cb.onSfx?.('card');

    // stance flow
    const same = this.player.stance === card.def.style;
    this.player.stance = card.def.style;
    this.player.flow = same ? Math.min(3, this.player.flow + 1) : 1;
    const flowBonus = (this.player.flow - 1) * 2;

    if (card.def.style && this.player.flow > 1) {
      this.log(`${card.def.style === 'tiger' ? '虎 Tiger' : card.def.style === 'crane' ? '鶴 Crane' : '蛇 Serpent'} flow <b>${this.player.flow}</b>.`);
    }

    await wait(150);
    await this.resolveCard(card, flowBonus);
    if (!this.over) {
      this.cardDiscard(card);
      this.busy = false;
      this.emit();
    }
    return true;
  }

  async resolveCard(card, flowBonus) {
    const s = card.stats;
    let focusUsed = false;
    if (s.dmg && this.player.statuses.focus > 0) {
      this.player.statuses.focus -= 1;
      if (this.player.statuses.focus <= 0) delete this.player.statuses.focus;
      focusUsed = true;
      this.float('player', 'FOCUS', 'info');
    }

    let firstBonus = flowBonus;
    if (s.postureBonus && this.enemy.posture >= 50) firstBonus += s.postureBonus;
    if (s.bleedBonus) firstBonus += (this.enemy.statuses.bleed || 0) * s.bleedBonus;

    const targetPart = card.def.target || 'torso';
    let strike = null;
    if (s.dmg && this.cb.onStrikeMinigame) {
      this.renderer?.setTargetPart?.(targetPart);
      try {
        strike = await this.cb.onStrikeMinigame({
          card,
          part: targetPart,
          bodyPart: BODY_PARTS[targetPart],
          parts: this.enemy.parts,
          enemy: this.def
        });
      } catch (err) {
        console.error('Strike minigame failed', err);
      }
      this.renderer?.setTargetPart?.(null);
    }
    const strikeMult = strike?.mult ?? 1;

    if (s.dmg) {
      const hits = s.hits || 1;
      const heavy = s.dmg >= 12 || hits >= 3 || firstBonus >= 8;
      for (let h = 0; h < hits; h++) {
        if (this.over) return;
        this.renderer?.play('player', 'attack', 0.56);
        await wait(h === 0 ? 150 : 110);
        const bonus = h === 0 ? firstBonus : 0;
        const raw = (s.dmg + (this.player.statuses.strength || 0) + bonus) * strikeMult;
        this.hitEnemy(raw, {
          posture: Math.round((s.posture || 0) * clamp(strikeMult, 0.35, 1.35)),
          focus: focusUsed,
          heavy
        });
        await wait(h === 0 ? 160 : 130);
        if (this.over) return;
      }
      if (!this.over && strike?.partDamage > 0) {
        this.applyPartDamage(targetPart, strike.partDamage, strike.quality);
      }
      if (s.dmg >= 12) this.renderer?.shakeScreen(7);
    } else if (s.block || s.recover) {
      this.renderer?.play('player', 'guard', 0.7);
      await wait(150);
    } else if (s.heal || s.chi || s.draw) {
      this.renderer?.play('player', 'cast', 0.75);
      this.renderer?.spawnCast('player', card.def.style === 'crane' ? '#7fb7b3' : card.def.style === 'serpent' ? '#9aae5a' : '#d8b678');
      await wait(140);
    }

    if (this.over) return;

    if (s.block) {
      this.player.block += s.block;
      this.float('player', `+${s.block} GUARD`, 'block');
      this.renderer?.spawnBlock?.('player');
      this.cb.onSfx?.('block');
      this.log(`You gain <b>${s.block}</b> Guard.`);
    }
    if (s.heal) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + s.heal);
      this.float('player', `+${s.heal}`, 'heal');
      this.cb.onSfx?.('heal');
      this.log(`You recover <b>${s.heal}</b> health.`);
    }
    if (s.chi) {
      this.player.chi = Math.min(8, this.player.chi + s.chi);
      this.float('player', `+${s.chi} CHI`, 'info');
      this.cb.onSfx?.('chi');
      this.log(`You gather <b>${s.chi}</b> Chi.`);
    }
    if (s.draw) {
      const n = this.drawCards(s.draw);
      this.cb.onSfx?.('draw');
      this.log(`You draw <b>${n}</b> technique${n === 1 ? '' : 's'}.`);
    }
    if (s.recover) {
      this.player.posture = Math.max(0, this.player.posture - s.recover);
      this.float('player', `BALANCE +${s.recover}`, 'block');
      this.log(`You recover <b>${s.recover}</b> balance.`);
    }

    if (s.statuses?.self) {
      for (const [k, v] of Object.entries(s.statuses.self)) {
        this.applyStatus('player', k, v);
      }
    }
    if (s.statuses?.enemy && !this.over) {
      for (const [k, v] of Object.entries(s.statuses.enemy)) {
        this.applyStatus('enemy', k, v);
      }
    }

    if (focusUsed && s.dmg) this.cb.onSfx?.('buff');
    this.emit();
  }

  /* ---------- damage ---------- */

  enemyPostureRegen() {
    const regen = this.enemy.postureRegen * (this.enemy.parts?.legs?.crippled ? 0.5 : 1);
    return Math.round(regen);
  }

  applyPartDamage(part, amount, quality = 'good') {
    const p = this.enemy.parts?.[part];
    const meta = BODY_PARTS[part];
    if (!p || !meta || p.crippled || amount <= 0 || this.over) return;
    p.integrity = Math.max(0, p.integrity - amount);
    this.float('enemy', `${meta.glyph} ${meta.label.toUpperCase()} −${Math.round(amount)}`, quality === 'perfect' ? 'crit' : 'info');
    this.renderer?.spawnPartHit?.('enemy', part, quality === 'perfect');
    this.log(`${this.def.name}'s ${meta.label.toLowerCase()} takes <b>${Math.round(amount)}</b> injury.`);

    if (p.integrity <= 0) {
      p.crippled = true;
      this.banner(`${meta.label.toUpperCase()} CRIPPLED`, meta.effect, 'vermin');
      this.log(`<b>${this.def.name}'s ${meta.label.toLowerCase()} is crippled.</b> ${meta.effect}`);
      this.renderer?.setInjuries?.('enemy', this.enemy.parts);
      this.renderer?.spawnCast?.('enemy', meta.color);
      this.renderer?.spawnBreak?.('enemy');
      this.cb.onSfx?.('break');
    }
    this.emit();
  }

  hitEnemy(raw, { posture = 0, focus = false, heavy = false, isCounter = false } = {}) {
    if (this.over || this.enemy.hp <= 0) return;
    const enemy = this.enemy;

    if (!isCounter && enemy.statuses.dodge > 0) {
      enemy.statuses.dodge -= 1;
      if (enemy.statuses.dodge <= 0) delete enemy.statuses.dodge;
      this.float('enemy', 'DODGED', 'info');
      this.renderer?.spawnDodge('enemy');
      this.renderer?.play('enemy', 'cast', 0.4);
      this.cb.onSfx?.('dodge');
      this.log(`${this.def.name} slips aside. The blow finds only air.`);
      this.emit();
      return;
    }

    let dmg = raw;
    if (this.player.statuses.weak > 0) dmg *= 0.75;
    if (enemy.statuses.vulnerable > 0) dmg *= 1.3;
    if (enemy.parts?.torso?.crippled) dmg *= 1.2;
    if (focus) dmg *= 1.5;
    dmg = Math.max(1, Math.round(dmg));

    const absorbed = Math.min(enemy.block, dmg);
    enemy.block -= absorbed;
    const hpLoss = dmg - absorbed;
    enemy.hp = Math.max(0, enemy.hp - hpLoss);
    this.damageDealt += hpLoss;
    this.maxHit = Math.max(this.maxHit, hpLoss);

    if (hpLoss > 0) {
      this.float('enemy', `-${hpLoss}`, hpLoss >= 20 ? 'crit' : 'damage');
      this.renderer?.spawnImpact('enemy', { heavy, color: '#e05a44', count: heavy ? 20 : 12 });
      this.cb.onSfx?.(heavy ? 'heavy' : 'hit');
      this.renderer?.play('enemy', 'hit', 0.5);
    } else {
      this.float('enemy', 'BLOCKED', 'block');
      this.renderer?.spawnBlock('enemy');
      this.cb.onSfx?.('block');
    }

    if (posture > 0) {
      if (enemy.parts?.legs?.crippled) posture = Math.round(posture * 1.25);
      enemy.posture += posture;
      if (enemy.posture >= enemy.maxPosture && !this.over) {
        enemy.posture = 0;
        enemy.statuses.stun = (enemy.statuses.stun || 0) + 1;
        this.postureBreaks += 1;
        this.state.stats.bestPostureBreak = Math.max(this.state.stats.bestPostureBreak || 0, this.postureBreaks);
        this.banner('POSTURE BROKEN', `${this.def.name} loses their next action.`, 'jade');
        this.renderer?.spawnBreak('enemy');
        this.renderer?.play('enemy', 'hit', 0.8);
        this.cb.onSfx?.('break');
        this.log(`<b>${this.def.name}'s posture breaks!</b> They will lose their next action.`);
      }
    }

    if (enemy.statuses.counter > 0 && !isCounter) {
      const counter = enemy.statuses.counter;
      delete enemy.statuses.counter;
      this.float('enemy', 'COUNTER', 'info');
      this.cb.onSfx?.('block');
      this.log(`${this.def.name} turns the blow aside and counters for <b>${counter}</b>.`);
      this.hitPlayer(counter, { posture: 0, isCounter: true });
    }

    if (this.def.phase2At && !enemy.phase2 && enemy.hp > 0 && enemy.hp / enemy.maxHp <= this.def.phase2At) {
      this.enterPhase2();
    }

    this.emit();
    if (enemy.hp <= 0 && !this.over) this.finishWin();
  }

  hitPlayer(raw, { posture = 0, isCounter = false, heavy = false } = {}) {
    if (this.over || this.player.hp <= 0) return;
    const player = this.player;

    if (!isCounter && player.statuses.dodge > 0) {
      player.statuses.dodge -= 1;
      if (player.statuses.dodge <= 0) delete player.statuses.dodge;
      this.float('player', 'DODGED', 'info');
      this.renderer?.spawnDodge('player');
      this.renderer?.play('player', 'cast', 0.4);
      this.cb.onSfx?.('dodge');
      this.log('You slip aside. The blow finds only air.');
      this.emit();
      return;
    }

    let dmg = raw;
    if (this.enemy.statuses.weak > 0) dmg *= 0.75;
    let limbPenalty = 0;
    if (this.enemy.parts?.head?.crippled) limbPenalty += 0.2;
    if (this.enemy.parts?.arms?.crippled) limbPenalty += 0.3;
    if (limbPenalty) dmg *= Math.max(0.5, 1 - limbPenalty);
    if (player.statuses.vulnerable > 0) dmg *= 1.3;
    if (player.broken > 0) dmg *= 1.5;
    dmg = Math.max(1, Math.round(dmg));

    const absorbed = Math.min(player.block, dmg);
    player.block -= absorbed;
    const hpLoss = dmg - absorbed;
    player.hp = Math.max(0, player.hp - hpLoss);
    this.state.player.hp = player.hp;

    if (hpLoss > 0) {
      this.float('player', `-${hpLoss}`, hpLoss >= 18 ? 'crit' : 'damage');
      this.renderer?.spawnImpact('player', { heavy: hpLoss >= 15, color: '#e05a44', count: 14 });
      this.cb.onSfx?.(hpLoss >= 15 ? 'heavy' : 'hit');
      this.renderer?.play('player', 'hit', 0.5);
    } else {
      this.float('player', 'BLOCKED', 'block');
      this.renderer?.spawnBlock('player');
      this.cb.onSfx?.('block');
    }

    if (posture > 0) {
      player.posture += posture;
      if (player.posture >= player.maxPosture) {
        player.posture = 0;
        player.broken = 1;
        this.banner('BALANCE BROKEN', 'Incoming damage is increased by 50% this turn.', 'vermin');
        this.renderer?.spawnBreak('player');
        this.cb.onSfx?.('break');
        this.log('<b>Your balance breaks.</b> Guard yourself.');
      }
    }

    if (player.statuses.counter > 0 && !isCounter) {
      const counter = player.statuses.counter;
      delete player.statuses.counter;
      this.float('player', 'COUNTER', 'info');
      this.log(`You answer the blow for <b>${counter}</b>.`);
      this.hitEnemy(counter, { posture: 0, isCounter: true });
    }

    this.emit();
    if (player.hp <= 0 && !this.over) this.finishLose();
  }

  applyStatus(who, kind, amount) {
    const target = who === 'player' ? this.player : this.enemy;
    if (!target || amount <= 0) return;
    target.statuses[kind] = (target.statuses[kind] || 0) + amount;
    const label = kind.charAt(0).toUpperCase() + kind.slice(1);
    this.float(who, `${label.toUpperCase()} ${amount}`, kind === 'bleed' ? 'damage' : 'info');
    this.cb.onSfx?.(kind === 'bleed' ? 'debuff' : 'buff');
    this.renderer?.spawnCast(who, kind === 'bleed' ? '#b83f32' : kind === 'vulnerable' ? '#d76a45' : kind === 'weak' ? '#9aae5a' : '#d8b678');
    this.renderer?.play(who, 'cast', 0.55);
    this.emit();
  }

  enterPhase2() {
    const enemy = this.enemy;
    enemy.phase2 = true;
    enemy.statuses.strength = (enemy.statuses.strength || 0) + 2;
    enemy.block += 8;
    enemy.intent = this.pickIntent();
    this.banner('SECOND WIND', `${this.def.name} draws a deeper blade.`, 'vermin');
    this.log(`<b>${this.def.name} sheds their restraint.</b> Strength rises.`);
    this.renderer?.spawnCast('enemy', '#e05a44');
    this.renderer?.play('enemy', 'cast', 0.9);
    this.renderer?.shakeScreen(10);
    this.cb.onSfx?.('break');
    this.emit();
  }

  /* ---------- enemy turn ---------- */

  async runEnemyTurn() {
    if (this.over) return;
    this.busy = true;
    this.player.block = Math.max(0, this.player.block);
    this.enemy.block = 0;
    this.emit();
    await wait(420);
    if (this.over) return;

    if (this.enemy.statuses.stun > 0) {
      this.enemy.statuses.stun -= 1;
      if (this.enemy.statuses.stun <= 0) delete this.enemy.statuses.stun;
      this.banner('STAGGERED', `${this.def.name} loses their action.`, 'jade');
      this.log(`${this.def.name} is still reeling. Their action is lost.`);
      this.renderer?.play('enemy', 'hit', 0.7);
      await wait(800);
      this.enemy.posture = Math.min(this.enemy.maxPosture, this.enemy.posture + Math.round(this.enemyPostureRegen() * 0.7));
      this.enemy.intent = this.pickIntent();
      this.player.broken = 0;
      await this.tickStatuses('enemy');
      if (this.over) return;
      this.emit();
      await this.endEnemyTurn();
      return;
    }

    const move = this.enemy.intent || this.pickIntent();
    await this.executeMove(move);
    if (this.over) return;

    this.enemy.lastMove = move.id;
    if (this.enemy.hp > 0) {
      this.enemy.posture = Math.min(this.enemy.maxPosture, this.enemy.posture + this.enemyPostureRegen());
    }
    this.enemy.intent = this.pickIntent();
    this.player.broken = 0;
    await this.tickStatuses('enemy');
    if (this.over) return;
    this.emit();
    await this.endEnemyTurn();
  }

  async endEnemyTurn() {
    if (this.over) return;
    await wait(300);
    this.startPlayerTurn();
  }

  async executeMove(move) {
    if (!move) return;
    const enemy = this.enemy;
    this.enemy.block = 0;
    this.log(`<b>${this.def.name}</b> uses <b>${move.name}</b>.`);

    if (move.heal) {
      const before = enemy.hp;
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + move.heal);
      const healed = enemy.hp - before;
      if (healed > 0) {
        this.float('enemy', `+${healed}`, 'heal');
        this.cb.onSfx?.('heal');
      }
      this.renderer?.spawnCast('enemy', '#7fb7b3');
    }
    if (move.block) {
      enemy.block += move.block;
      this.float('enemy', `+${move.block} GUARD`, 'block');
      this.renderer?.spawnBlock('enemy');
      this.cb.onSfx?.('block');
    }
    if (move.recover) {
      enemy.posture = Math.max(0, enemy.posture - move.recover);
      this.float('enemy', `BALANCE +${move.recover}`, 'block');
    }

    if (move.dmg) {
      const hits = move.hits || 1;
      for (let i = 0; i < hits; i++) {
        if (this.over) return;
        this.renderer?.play('enemy', 'attack', 0.56);
        await wait(i === 0 ? 180 : 110);
        const raw = move.dmg + (enemy.statuses.strength || 0);
        this.hitPlayer(raw, { posture: move.posture || 0, heavy: move.dmg + (enemy.statuses.strength || 0) >= 13 });
        await wait(i === 0 ? 150 : 110);
        if (this.over) return;
      }
    } else if (!move.heal && !move.block) {
      this.renderer?.play('enemy', 'cast', 0.7);
      this.renderer?.spawnCast('enemy', '#d8b678');
      await wait(220);
    }

    if (move.statuses?.self) {
      for (const [k, v] of Object.entries(move.statuses.self)) this.applyStatus('enemy', k, v);
    }
    if (move.statuses?.enemy && !this.over) {
      for (const [k, v] of Object.entries(move.statuses.enemy)) this.applyStatus('player', k, v);
    }

    if (move.statuses?.enemy) {
      this.log(describeMove(move) + '.');
    } else if (move.statuses?.self) {
      this.log(describeMove(move) + '.');
    }
    this.emit();
  }

  async tickStatuses(who) {
    const target = who === 'player' ? this.player : this.enemy;
    const st = target.statuses;
    if (st.bleed > 0) {
      const dmg = st.bleed;
      target.hp = Math.max(0, target.hp - dmg);
      this.float(who, `-${dmg} BLEED`, 'damage');
      this.cb.onSfx?.('debuff');
      this.renderer?.spawnImpact(who, { heavy: false, color: '#b83f32', count: 8 });
      this.log(`${who === 'player' ? 'You bleed' : `${this.def.name} bleeds`} for <b>${dmg}</b>.`);
      st.bleed -= 1;
      if (st.bleed <= 0) delete st.bleed;
      await wait(260);
      this.emit();
      if (target.hp <= 0) {
        if (who === 'player') this.finishLose();
        else this.finishWin();
        return;
      }
    }
    if (st.regen > 0) {
      const healed = Math.min(target.maxHp - target.hp, st.regen);
      if (healed > 0) {
        target.hp += healed;
        this.float(who, `+${healed}`, 'heal');
      }
    }
    for (const key of ['vulnerable', 'weak']) {
      if (st[key] > 0) {
        st[key] -= 1;
        if (st[key] <= 0) delete st[key];
      }
    }
    this.emit();
  }

  /* ---------- ending turn ---------- */

  async endTurn() {
    if (this.busy || this.over) return;
    this.busy = true;
    this.emit();
    this.log('You end your turn.');
    await this.tickStatuses('player');
    if (this.over) return;
    this.discardHand();
    this.emit();
    await wait(280);
    if (!this.over) await this.runEnemyTurn();
  }

  /* ---------- AI ---------- */

  pickIntent() {
    const enemy = this.enemy;
    const ratio = enemy.hp / enemy.maxHp;
    const all = this.def.moves || [];
    let candidates = all.filter(m => {
      if (m.phase2 && !enemy.phase2) return false;
      if (m.hpBelow && ratio > m.hpBelow) return false;
      if (m.heal && ratio > 0.95) return false;
      return true;
    });
    if (!candidates.length) candidates = all.filter(m => !m.phase2 || enemy.phase2);
    if (!candidates.length) candidates = all;
    const chosen = weightedPick(candidates, m => {
      let w = m.weight || 1;
      if (m.id === enemy.lastMove) w *= 0.35;
      return w;
    });
    return chosen || candidates[0];
  }

  intentDamage(move) {
    if (!move?.dmg) return 0;
    let dmg = move.dmg + (this.enemy.statuses.strength || 0);
    if (this.enemy.statuses.weak > 0) dmg *= 0.75;
    let limbPenalty = 0;
    if (this.enemy.parts?.head?.crippled) limbPenalty += 0.2;
    if (this.enemy.parts?.arms?.crippled) limbPenalty += 0.3;
    if (limbPenalty) dmg *= Math.max(0.5, 1 - limbPenalty);
    if (this.player.statuses.vulnerable > 0) dmg *= 1.3;
    if (this.player.broken > 0) dmg *= 1.5;
    return Math.max(1, Math.round(dmg));
  }

  /* ---------- finish ---------- */

  finishWin() {
    if (this.over) return;
    this.over = true;
    this.busy = true;
    this.enemy.hp = 0;
    this.state.player.hp = this.player.hp;
    this.state.stats.damageDealt = (this.state.stats.damageDealt || 0) + this.damageDealt;
    this.renderer?.play('enemy', 'ko', 1.2);
    this.renderer?.spawnBreak('enemy');
    this.renderer?.shakeScreen(12);
    this.cb.onSfx?.('win');
    this.log(`<b>${this.def.name} falls.</b> The floor is yours.`);
    this.emit();
    setTimeout(() => {
      this.renderer?.play('player', 'win', 1.2);
      this.cb.onWin?.(this.summary());
    }, 1050);
  }

  finishLose() {
    if (this.over) return;
    this.over = true;
    this.busy = true;
    this.player.hp = 0;
    this.state.player.hp = 0;
    this.state.stats.damageDealt = (this.state.stats.damageDealt || 0) + this.damageDealt;
    this.renderer?.play('player', 'ko', 1.2);
    this.renderer?.spawnBreak('player');
    this.cb.onSfx?.('lose');
    this.log('<b>You fall.</b> The path is not yet closed.');
    this.emit();
    setTimeout(() => this.cb.onLose?.(this.summary()), 1150);
  }

  summary() {
    return {
      turns: this.turn,
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      damageDealt: this.damageDealt,
      maxHit: this.maxHit,
      postureBreaks: this.postureBreaks,
      cardsPlayed: this.cardsPlayed,
      injuries: Object.entries(this.enemy.parts)
        .filter(([, part]) => part.crippled)
        .map(([key]) => BODY_PARTS[key]?.label || key),
      enemy: this.def,
      enemyIndex: this.enemyIndex
    };
  }
}
