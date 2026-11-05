/* =========================================================
   Arena renderer — ink-wash dojo, vector fighters, particles
   ========================================================= */

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeIn = t => t * t * t;

function rgba(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function shade(hex, amt) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  const r = clamp(((n >> 16) & 255) + amt, 0, 255);
  const g = clamp(((n >> 8) & 255) + amt, 0, 255);
  const b = clamp((n & 255) + amt, 0, 255);
  return `rgb(${r},${g},${b})`;
}

const BASE_POSE = {
  hip: [0, -74], shoulder: [0, -121], head: [0, -154],
  faE: [21, -111], faH: [33, -91],
  baE: [-22, -110], baH: [-35, -93],
  flK: [16, -37], flF: [28, 0],
  blK: [-16, -39], blF: [-30, 0],
  lean: 0
};

const POSES = {
  idle: { ...BASE_POSE },
  wind: {
    hip: [-2, -71], shoulder: [-3, -118], head: [-4, -151],
    faE: [12, -116], faH: [6, -104],
    baE: [-26, -110], baH: [-40, -98],
    flK: [16, -36], flF: [28, 0],
    blK: [-18, -38], blF: [-34, 0],
    lean: -2
  },
  attack: {
    hip: [4, -72], shoulder: [7, -119], head: [9, -152],
    faE: [39, -117], faH: [74, -108],
    baE: [-18, -106], baH: [-6, -94],
    flK: [24, -35], flF: [40, 0],
    blK: [-20, -31], blF: [-39, 0],
    lean: 4
  },
  guard: {
    hip: [0, -67], shoulder: [0, -112], head: [-1, -145],
    faE: [18, -104], faH: [-4, -114],
    baE: [-12, -102], baH: [15, -108],
    flK: [17, -34], flF: [30, 0],
    blK: [-17, -36], blF: [-32, 0],
    lean: -1
  },
  hit: {
    hip: [-3, -70], shoulder: [-8, -117], head: [-13, -149],
    faE: [10, -106], faH: [0, -84],
    baE: [-30, -103], baH: [-44, -86],
    flK: [11, -35], flF: [22, 0],
    blK: [-19, -36], blF: [-36, 0],
    lean: -7
  },
  cast: {
    hip: [0, -75], shoulder: [0, -122], head: [0, -156],
    faE: [30, -122], faH: [38, -143],
    baE: [-30, -121], baH: [-38, -142],
    flK: [18, -37], flF: [31, 0],
    blK: [-18, -38], blF: [-33, 0],
    lean: 0
  },
  win: {
    hip: [0, -75], shoulder: [0, -122], head: [0, -156],
    faE: [24, -130], faH: [36, -158],
    baE: [-24, -110], baH: [-36, -94],
    flK: [18, -37], flF: [32, 0],
    blK: [-18, -38], blF: [-34, 0],
    lean: -1
  }
};

function lerpPose(a, b, t) {
  const out = {};
  for (const k of Object.keys(b)) {
    if (Array.isArray(b[k])) out[k] = [lerp(a[k][0], b[k][0], t), lerp(a[k][1], b[k][1], t)];
    else out[k] = lerp(a[k], b[k], t);
  }
  return out;
}

function withBreath(pose, t, intensity = 1) {
  const s = Math.sin(t * 1.7) * 1.6 * intensity;
  const s2 = Math.sin(t * 1.7 + 1.1) * 1.2 * intensity;
  return {
    ...pose,
    shoulder: [pose.shoulder[0], pose.shoulder[1] + s * 0.4],
    head: [pose.head[0] + s2 * 0.25, pose.head[1] + s * 0.5],
    faH: [pose.faH[0], pose.faH[1] + s * 0.7],
    baH: [pose.baH[0], pose.baH[1] + s2 * 0.6],
    faE: [pose.faE[0], pose.faE[1] + s * 0.4],
    baE: [pose.baE[0], pose.baE[1] + s2 * 0.4]
  };
}

export class ArenaRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.w = 0;
    this.h = 0;
    this.dpr = 1;
    this.groundY = 0;
    this.scale = 1;
    this.playerX = 0;
    this.enemyX = 0;
    this.raf = 0;
    this.last = 0;
    this.time = 0;
    this.effects = [];
    this.motes = [];
    this.shake = 0;
    this.flash = 0;
    this.running = false;
    this.fighters = null;
    this.ko = { player: false, enemy: false };
    this.targetPart = null;
    this.injuries = { player: {}, enemy: {} };
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
    this.makeMotes();
  }

  makeMotes() {
    this.motes = Array.from({ length: 42 }, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 1.4 + 0.35,
      speed: Math.random() * 0.012 + 0.004,
      drift: (Math.random() - 0.5) * 0.008,
      alpha: Math.random() * 0.34 + 0.08,
      phase: Math.random() * TAU
    }));
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = rect.width;
    this.h = rect.height;
    this.canvas.width = Math.round(rect.width * this.dpr);
    this.canvas.height = Math.round(rect.height * this.dpr);
    this.scale = clamp(this.h / 330, 0.72, 1.42);
    this.groundY = this.h * 0.845;
    this.playerX = this.w * (this.w < 620 ? 0.275 : 0.3);
    this.enemyX = this.w * (this.w < 620 ? 0.725 : 0.7);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (!this.running) this.draw();
  }

  setFighters(player, enemy) {
    const now = performance.now();
    this.fighters = {
      player: { look: player.look, facing: 1, x: 0, state: 'idle', t0: now, dur: 1e9, flash: 0, glow: 0, hitCount: 0 },
      enemy: { look: enemy.look, facing: -1, x: 0, state: 'idle', t0: now, dur: 1e9, flash: 0, glow: 0, hitCount: 0 }
    };
    this.ko = { player: false, enemy: false };
    this.effects = [];
    this.shake = 0;
    this.targetPart = null;
    this.injuries = { player: {}, enemy: {} };
  }

  setTargetPart(part) {
    this.targetPart = part || null;
  }

  setInjuries(who, parts) {
    if (!this.injuries[who]) this.injuries[who] = {};
    this.injuries[who] = parts || {};
  }

  setEmblem(glyph) {
    this.emblem = glyph || '';
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = (t) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (t - this.last) / 1000 || 0.016);
      this.last = t;
      this.time += dt;
      this.update(dt);
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  destroy() {
    this.stop();
    this.resizeObserver.disconnect();
  }

  play(who, state, dur = 0.65) {
    const f = this.fighters?.[who];
    if (!f) return;
    f.state = state;
    f.t0 = performance.now();
    f.dur = dur * 1000;
    if (state === 'ko') this.ko[who] = true;
  }

  getPos(who) {
    const f = this.fighters?.[who];
    if (!f) return { x: this.w / 2, y: this.h / 2 };
    const x = who === 'player' ? this.playerX : this.enemyX;
    return {
      x,
      y: this.groundY - 148 * this.scale,
      headY: this.groundY - 178 * this.scale
    };
  }

  getPartPos(who, part) {
    const scale = this.scale * (this.fighters?.[who]?.look?.build || 1);
    const facing = who === 'player' ? 1 : -1;
    const baseX = who === 'player' ? this.playerX : this.enemyX;
    const gy = this.groundY;
    if (part === 'head') return { x: baseX + 2 * facing * scale, y: gy - 158 * scale };
    if (part === 'arms') return { x: baseX + 18 * facing * scale, y: gy - 111 * scale };
    if (part === 'legs') return { x: baseX - 2 * facing * scale, y: gy - 35 * scale };
    return { x: baseX, y: gy - 102 * scale };
  }

  spawnPartHit(who, part, heavy = false) {
    const p = this.getPartPos(who, part);
    const color = part === 'head' ? '#e0a786' : part === 'legs' ? '#9aae5a' : part === 'arms' ? '#d8b678' : '#d76a45';
    this.effects.push({
      type: 'slash', x: p.x, y: p.y,
      angle: (Math.random() - 0.5) * 1.2 + (part === 'legs' ? 1.35 : -0.35),
      rot: (Math.random() - 0.5) * 0.5,
      life: 0.28, max: 0.28,
      size: (heavy ? 52 : 34) * this.scale,
      color: heavy ? '#f0d49a' : '#e9dec6'
    });
    this.effects.push({
      type: 'ring', x: p.x, y: p.y, maxR: (heavy ? 54 : 32) * this.scale,
      life: 0.4, max: 0.4, color
    });
    for (let i = 0; i < (heavy ? 18 : 9); i++) {
      const a = Math.random() * TAU;
      const sp = (Math.random() * 180 + 30) * this.scale;
      this.effects.push({
        type: 'spark', x: p.x, y: p.y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
        r: (Math.random() * 2.2 + 0.7) * this.scale,
        life: Math.random() * 0.35 + 0.2, max: 0.55,
        color: Math.random() > 0.5 ? color : '#151510',
        gravity: 380
      });
    }
    if (heavy) this.flashScreen(0.08);
  }

  shakeScreen(amount = 6) {
    this.shake = Math.max(this.shake, amount);
  }

  flashScreen(amount = 0.18) {
    this.flash = Math.max(this.flash, amount);
  }

  spawnImpact(who, { heavy = false, color = '#d8b678', count = 14 } = {}) {
    const p = this.getPos(who);
    const dir = who === 'enemy' ? 1 : -1;
    const x = p.x + (who === 'enemy' ? -6 : 6) * this.scale;
    const y = p.y;
    this.effects.push({
      type: 'slash', x, y,
      angle: (Math.random() - 0.5) * 1.4 + (who === 'enemy' ? 0.2 : Math.PI - 0.2),
      rot: (Math.random() - 0.5) * 0.9,
      life: 0.24, max: 0.24,
      size: (heavy ? 56 : 38) * this.scale,
      color: heavy ? '#f0d49a' : '#e9dec6'
    });
    this.effects.push({
      type: 'ring', x, y, maxR: (heavy ? 60 : 38) * this.scale,
      life: 0.35, max: 0.35, color
    });
    const n = heavy ? count + 10 : count;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const sp = (Math.random() * (heavy ? 240 : 150) + 30) * this.scale;
      this.effects.push({
        type: 'spark',
        x: x + (Math.random() - 0.5) * 12,
        y: y + (Math.random() - 0.5) * 16,
        vx: Math.cos(a) * sp + dir * 40,
        vy: Math.sin(a) * sp - 30,
        r: (Math.random() * 2.6 + 0.8) * this.scale,
        life: Math.random() * 0.4 + 0.25, max: 0.65,
        color: Math.random() > 0.55 ? color : '#151510',
        gravity: 420
      });
    }
    this.shakeScreen(heavy ? 11 : 5.5);
    if (heavy) this.flashScreen(0.12);
  }

  spawnBlock(who) {
    const p = this.getPos(who);
    for (let i = 0; i < 2; i++) {
      this.effects.push({
        type: 'ring', x: p.x, y: p.y + 6, maxR: (36 + i * 20) * this.scale,
        life: 0.42 + i * 0.08, max: 0.5, color: '#7fb7b3'
      });
    }
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * TAU;
      this.effects.push({
        type: 'spark', x: p.x, y: p.y + 6,
        vx: Math.cos(a) * 110 * this.scale, vy: Math.sin(a) * 80 * this.scale - 20,
        r: 1.6 * this.scale, life: 0.36, max: 0.36, color: '#9fd4cd', gravity: 100
      });
    }
    this.shakeScreen(2);
  }

  spawnDodge(who) {
    const p = this.getPos(who);
    for (let i = 0; i < 10; i++) {
      this.effects.push({
        type: 'streak', x: p.x + (Math.random() - 0.5) * 44 * this.scale,
        y: p.y + (Math.random() - 0.5) * 80 * this.scale,
        len: (18 + Math.random() * 30) * this.scale,
        life: 0.35, max: 0.35, color: '#9fd4cd'
      });
    }
  }

  spawnCast(who, color = '#9aae5a') {
    const p = this.getPos(who);
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * TAU;
      const r = (18 + Math.random() * 30) * this.scale;
      this.effects.push({
        type: 'spark', x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r * 1.4 + 10,
        vx: Math.cos(a) * 12, vy: -45 - Math.random() * 55,
        r: (1.2 + Math.random() * 2) * this.scale,
        life: 0.55 + Math.random() * 0.35, max: 0.9, color, gravity: -30
      });
    }
    this.effects.push({ type: 'ring', x: p.x, y: p.y + 8, maxR: 60 * this.scale, life: 0.6, max: 0.6, color });
  }

  spawnBreak(who) {
    const p = this.getPos(who);
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * TAU;
      const sp = 70 + Math.random() * 210;
      this.effects.push({
        type: 'spark', x: p.x, y: p.y + (Math.random() - 0.5) * 60,
        vx: Math.cos(a) * sp * this.scale, vy: Math.sin(a) * sp * this.scale - 60,
        r: (1 + Math.random() * 2.4) * this.scale,
        life: 0.4 + Math.random() * 0.5, max: 0.9, color: Math.random() > 0.4 ? '#f0d49a' : '#e05a44',
        gravity: 360
      });
    }
    this.effects.push({ type: 'ring', x: p.x, y: p.y, maxR: 100 * this.scale, life: 0.55, max: 0.55, color: '#f0d49a' });
    this.shakeScreen(14);
    this.flashScreen(0.2);
  }

  update(dt) {
    const now = performance.now();
    for (const f of Object.values(this.fighters || {})) {
      if (f.state !== 'ko' && f.state !== 'win' && f.state !== 'idle' && now - f.t0 > f.dur) {
        f.state = 'idle';
        f.t0 = now;
      }
      f.flash = Math.max(0, f.flash - dt * 5);
      f.glow = Math.max(0, f.glow - dt * 2.2);
    }
    this.shake *= Math.pow(0.0015, dt);
    if (this.shake < 0.1) this.shake = 0;
    this.flash *= Math.pow(0.02, dt);
    for (const e of this.effects) {
      e.life -= dt;
      if (e.type === 'spark') {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.vy += e.gravity * dt;
        e.vx *= Math.pow(0.3, dt);
      } else if (e.type === 'streak') {
        e.y -= dt * 12;
      }
    }
    this.effects = this.effects.filter(e => e.life > 0);
    for (const m of this.motes) {
      m.y -= m.speed * dt;
      m.x += m.drift * dt;
      if (m.y < -0.05) { m.y = 1.05; m.x = Math.random(); }
      if (m.x < -0.05) m.x = 1.05;
      if (m.x > 1.05) m.x = -0.05;
    }
  }

  poseFor(f, now) {
    const p = (now - f.t0) / f.dur;
    if (f.state === 'idle') return withBreath(POSES.idle, this.time + (f.facing > 0 ? 0 : 2.1));
    if (f.state === 'attack') {
      if (p < 0.24) return lerpPose(POSES.idle, POSES.wind, easeOut(p / 0.24));
      if (p < 0.42) return lerpPose(POSES.wind, POSES.attack, easeOut((p - 0.24) / 0.18));
      if (p < 0.62) return { ...POSES.attack };
      return lerpPose(POSES.attack, POSES.idle, easeOut(clamp((p - 0.62) / 0.38, 0, 1)));
    }
    if (f.state === 'hit') {
      if (p < 0.22) return POSES.hit;
      return lerpPose(POSES.hit, POSES.idle, easeOut(clamp((p - 0.22) / 0.78, 0, 1)));
    }
    if (f.state === 'guard') {
      if (p < 0.7) return lerpPose(POSES.idle, POSES.guard, easeOut(p / 0.16));
      return lerpPose(POSES.guard, POSES.idle, easeOut(clamp((p - 0.7) / 0.3, 0, 1)));
    }
    if (f.state === 'cast') {
      if (p < 0.2) return lerpPose(POSES.idle, POSES.cast, easeOut(p / 0.2));
      if (p < 0.7) return POSES.cast;
      return lerpPose(POSES.cast, POSES.idle, easeOut(clamp((p - 0.7) / 0.3, 0, 1)));
    }
    if (f.state === 'ko') return POSES.hit;
    if (f.state === 'win') return POSES.win;
    return POSES.idle;
  }

  draw() {
    const { ctx, w, h } = this;
    if (!w || !h) return;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const sx = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    const sy = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    ctx.save();
    ctx.translate(sx, sy);
    this.drawBackground(ctx, w, h);
    if (this.fighters) {
      this.drawFighter(ctx, 'player');
      this.drawFighter(ctx, 'enemy');
      this.drawTargetMarker(ctx);
    }
    this.drawEffects(ctx);
    ctx.restore();
    if (this.flash > 0.002) {
      ctx.fillStyle = `rgba(240,212,154,${this.flash})`;
      ctx.fillRect(0, 0, w, h);
    }
    this.drawVignette(ctx, w, h);
  }

  drawBackground(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#080a08');
    g.addColorStop(0.46, '#17150f');
    g.addColorStop(0.78, '#2a1b15');
    g.addColorStop(1, '#0c0c08');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // sun
    const sunX = w * 0.72;
    const sunY = h * 0.31;
    const sunR = clamp(Math.min(w, h) * 0.17, 52, 150);
    const halo = ctx.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR * 2.3);
    halo.addColorStop(0, 'rgba(197,72,54,.23)');
    halo.addColorStop(0.45, 'rgba(160,50,39,.08)');
    halo.addColorStop(1, 'rgba(160,50,39,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(sunX - sunR * 2.4, sunY - sunR * 2.4, sunR * 4.8, sunR * 4.8);
    const sg = ctx.createRadialGradient(sunX - sunR * 0.25, sunY - sunR * 0.25, sunR * 0.1, sunX, sunY, sunR);
    sg.addColorStop(0, '#df7159');
    sg.addColorStop(0.55, '#b83f32');
    sg.addColorStop(1, '#6f241d');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR, 0, TAU);
    ctx.fill();
    // faint brush rings around the sun
    ctx.strokeStyle = 'rgba(240,212,154,.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunR + 9 + i * 11, 0.2 + i, TAU - 0.4 + i);
      ctx.stroke();
    }

    // mist bands
    for (let i = 0; i < 3; i++) {
      const y = h * (0.36 + i * 0.09);
      const mg = ctx.createLinearGradient(0, y - 18, 0, y + 18);
      mg.addColorStop(0, 'rgba(233,222,198,0)');
      mg.addColorStop(0.5, `rgba(233,222,198,${0.028 - i * 0.005})`);
      mg.addColorStop(1, 'rgba(233,222,198,0)');
      ctx.fillStyle = mg;
      ctx.fillRect(0, y - 18, w, 36);
    }

    // mountains — three ink layers
    this.drawMountains(ctx, w, h, h * 0.68, 0.42, '#0f110c', 0.7);
    this.drawMountains(ctx, w, h, h * 0.76, 0.35, '#0a0c08', 0.9);

    // bamboo
    this.drawBamboo(ctx, w, h);

    // emblem behind enemy
    if (this.emblem) {
      ctx.save();
      ctx.font = `${Math.round(150 * this.scale)}px "Songti SC","Noto Serif CJK SC",serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(216,182,120,.035)';
      ctx.fillText(this.emblem, this.enemyX, this.groundY - 105 * this.scale);
      ctx.restore();
    }

    // ground
    const groundY = this.groundY;
    const gg = ctx.createLinearGradient(0, groundY - 20, 0, h);
    gg.addColorStop(0, '#141510');
    gg.addColorStop(0.28, '#0c0d09');
    gg.addColorStop(1, '#060705');
    ctx.fillStyle = gg;
    ctx.fillRect(0, groundY, w, h - groundY);

    // platform ellipse
    ctx.save();
    ctx.translate(w * 0.5, groundY + 8);
    ctx.scale(1, 0.17);
    const platform = ctx.createRadialGradient(0, 0, 20, 0, 0, w * 0.4);
    platform.addColorStop(0, 'rgba(216,182,120,.075)');
    platform.addColorStop(0.65, 'rgba(216,182,120,.02)');
    platform.addColorStop(1, 'rgba(216,182,120,0)');
    ctx.fillStyle = platform;
    ctx.beginPath();
    ctx.arc(0, 0, w * 0.42, 0, TAU);
    ctx.fill();
    ctx.restore();

    // perspective lines
    ctx.strokeStyle = 'rgba(216,182,120,.055)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const y = groundY + 18 + i * i * 7;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.quadraticCurveTo(w * 0.5, y - 4, w, y);
      ctx.stroke();
    }
    // cracks
    ctx.strokeStyle = 'rgba(233,222,198,.045)';
    ctx.beginPath();
    ctx.moveTo(w * 0.12, groundY + 30);
    ctx.lineTo(w * 0.2, groundY + 42);
    ctx.lineTo(w * 0.18, groundY + 56);
    ctx.moveTo(w * 0.84, groundY + 24);
    ctx.lineTo(w * 0.78, groundY + 44);
    ctx.lineTo(w * 0.81, groundY + 58);
    ctx.stroke();

    // ambient motes
    for (const m of this.motes) {
      const a = m.alpha * (0.6 + 0.4 * Math.sin(this.time * 0.9 + m.phase));
      ctx.fillStyle = `rgba(240,212,154,${a})`;
      ctx.beginPath();
      ctx.arc(m.x * w, m.y * h, m.r, 0, TAU);
      ctx.fill();
    }
  }

  drawMountains(ctx, w, h, baseY, amp, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, baseY);
    const pts = [
      [0.05, 0.62], [0.12, 0.48], [0.18, 0.6], [0.27, 0.3],
      [0.34, 0.55], [0.4, 0.42], [0.48, 0.62], [0.56, 0.38],
      [0.63, 0.58], [0.7, 0.46], [0.78, 0.64], [0.87, 0.4],
      [0.94, 0.57], [1, 0.5]
    ];
    for (const [x, y] of pts) {
      ctx.lineTo(w * x, baseY - h * amp * (1 - y) * 1.15);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawBamboo(ctx, w, h) {
    const stalks = [
      { x: 0.035, lean: 0.012, h: 0.82, a: 0.5 },
      { x: 0.09, lean: -0.006, h: 0.66, a: 0.32 },
      { x: 0.14, lean: 0.02, h: 0.48, a: 0.18 },
      { x: 0.93, lean: -0.014, h: 0.76, a: 0.42 },
      { x: 0.975, lean: 0.008, h: 0.58, a: 0.26 }
    ];
    ctx.save();
    for (const s of stalks) {
      const topX = (s.x + s.lean) * w;
      const bottomX = s.x * w;
      const topY = h * (1 - s.h);
      ctx.strokeStyle = `rgba(6,5,4,${0.82 * s.a + 0.24})`;
      ctx.lineWidth = Math.max(2, w * 0.0045);
      ctx.beginPath();
      ctx.moveTo(bottomX, h);
      ctx.quadraticCurveTo((bottomX + topX) / 2, h * 0.55, topX, topY);
      ctx.stroke();
      // joints
      const segs = 6;
      ctx.lineWidth = 1;
      for (let i = 1; i < segs; i++) {
        const t = i / segs;
        const x = lerp(bottomX, topX, t);
        const y = lerp(h, topY, t);
        ctx.beginPath();
        ctx.moveTo(x - w * 0.005, y);
        ctx.lineTo(x + w * 0.006, y - 2);
        ctx.stroke();
      }
    }
    // leaves
    ctx.fillStyle = 'rgba(7,7,5,.72)';
    const leaves = [[0.11, 0.35, -0.5], [0.12, 0.4, 0.3], [0.09, 0.5, -0.9], [0.95, 0.36, 0.6], [0.96, 0.45, -0.4], [0.94, 0.55, 0.9]];
    for (const [x, y, rot] of leaves) {
      ctx.save();
      ctx.translate(w * x, h * y);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, w * 0.035, w * 0.008, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  drawFighter(ctx, who) {
    const f = this.fighters[who];
    if (!f) return;
    const now = performance.now();
    const pose = this.poseFor(f, now);
    const p = (now - f.t0) / f.dur;
    const baseX = who === 'player' ? this.playerX : this.enemyX;
    let x = baseX;
    let y = this.groundY;

    // lunge / recoil
    if (f.state === 'attack') {
      const lunge = Math.sin(clamp(p, 0, 1) * Math.PI) * 24 * this.scale;
      x += f.facing * lunge;
    }
    if (f.state === 'hit') {
      x += -f.facing * Math.sin(clamp(p, 0, 1) * Math.PI) * 8 * this.scale;
    }
    if (f.state === 'ko') {
      const t = clamp((now - f.t0) / 900, 0, 1);
      x += -f.facing * 30 * easeOut(t) * this.scale;
    }

    const bob = f.state === 'idle' ? Math.sin(this.time * 1.7 + (who === 'enemy' ? 1.5 : 0)) * 1.2 : 0;
    const scale = this.scale * (f.look.build || 1);

    // shadow
    ctx.save();
    ctx.translate(x, this.groundY + 2);
    ctx.scale(1, 0.2);
    const sh = ctx.createRadialGradient(0, 0, 2, 0, 0, 48 * scale);
    sh.addColorStop(0, 'rgba(0,0,0,.65)');
    sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh;
    ctx.beginPath();
    ctx.arc(0, 0, 48 * scale, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(x, y + bob);
    if (f.state === 'ko') {
      const t = clamp((now - f.t0) / 900, 0, 1);
      ctx.translate(-f.facing * 20 * scale, -6 * scale);
      ctx.rotate(-f.facing * 1.28 * easeOut(t));
      ctx.translate(0, 10 * scale);
    }
    ctx.scale(scale * f.facing, scale);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (f.glow > 0) {
      ctx.shadowColor = 'rgba(240,212,154,.65)';
      ctx.shadowBlur = 18 * f.glow;
    }
    this.drawBody(ctx, f, pose, who);
    ctx.shadowBlur = 0;

    // hit flash overlay
    if (f.flash > 0.02) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = `rgba(255,190,150,${f.flash * 0.22})`;
      ctx.fillRect(-90, -190, 180, 200);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }

  drawBody(ctx, f, pose, who) {
    const look = f.look;
    const skin = look.skin || '#c8a57c';
    const skinLight = shade(skin, 16);
    const skinDark = shade(skin, -22);
    const robe = look.robe || '#2f2b25';
    const robeDark = shade(robe, -14);
    const robeLight = shade(robe, 10);
    const trim = look.trim || '#c48263';
    const sash = look.sash || '#b23a2f';
    const hair = look.hair || '#14110e';
    const outline = 'rgba(4,4,3,.6)';

    const hip = pose.hip, sh = pose.shoulder, head = pose.head;
    const faE = pose.faE, faH = pose.faH, baE = pose.baE, baH = pose.baH;
    const flK = pose.flK, flF = pose.flF, blK = pose.blK, blF = pose.blF;

    // back leg
    this.limb(ctx, hip[0] - 6, hip[1] + 4, blK[0], blK[1], blF[0], blF[1], 17, robeDark, outline);
    this.foot(ctx, blF[0], blF[1], robeDark, f.facing);
    // robe skirt
    ctx.beginPath();
    ctx.moveTo(-18, -84);
    ctx.quadraticCurveTo(-26, -62, -23, -44);
    ctx.lineTo(24, -44);
    ctx.quadraticCurveTo(27, -64, 18, -84);
    ctx.closePath();
    ctx.fillStyle = robeDark;
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // robe skirt crease
    ctx.strokeStyle = 'rgba(0,0,0,.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-4, -78);
    ctx.lineTo(-9, -46);
    ctx.moveTo(7, -78);
    ctx.lineTo(12, -46);
    ctx.stroke();
    // hem and side slit
    ctx.strokeStyle = rgba(trim, 0.55);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-23, -45);
    ctx.quadraticCurveTo(0, -42, 24, -45);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath();
    ctx.moveTo(20, -48);
    ctx.lineTo(21, -65);
    ctx.stroke();

    // back arm
    this.arm(ctx, sh[0] - 9, sh[1] + 4, baE[0], baE[1], baH[0], baH[1], robe, skin, outline, 11);

    // torso
    ctx.beginPath();
    ctx.moveTo(-17, -127);
    ctx.bezierCurveTo(-25, -118, -24, -98, -18, -82);
    ctx.lineTo(19, -82);
    ctx.bezierCurveTo(25, -99, 25, -118, 17, -127);
    ctx.closePath();
    const tg = ctx.createLinearGradient(-20, -130, 20, -80);
    tg.addColorStop(0, robeLight);
    tg.addColorStop(0.55, robe);
    tg.addColorStop(1, robeDark);
    ctx.fillStyle = tg;
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // inner robe shadow and fabric folds
    ctx.fillStyle = 'rgba(0,0,0,.14)';
    ctx.beginPath();
    ctx.moveTo(0, -124);
    ctx.lineTo(-7, -83);
    ctx.lineTo(7, -83);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-15, -118);
    ctx.quadraticCurveTo(-17, -100, -12, -86);
    ctx.moveTo(16, -117);
    ctx.quadraticCurveTo(18, -101, 13, -86);
    ctx.moveTo(-18, -90);
    ctx.quadraticCurveTo(0, -85, 18, -90);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.07)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-12, -124);
    ctx.quadraticCurveTo(-16, -112, -13, -98);
    ctx.moveTo(9, -124);
    ctx.quadraticCurveTo(13, -114, 11, -103);
    ctx.stroke();

    // collar
    ctx.strokeStyle = trim;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-9, -126);
    ctx.lineTo(0, -110);
    ctx.lineTo(9, -126);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.28)';
    ctx.lineWidth = .9;
    ctx.beginPath();
    ctx.moveTo(-8, -123);
    ctx.lineTo(0, -109);
    ctx.lineTo(8, -123);
    ctx.stroke();

    // sash
    ctx.save();
    ctx.translate(0, -88);
    ctx.rotate(-0.05);
    const sashGrad = ctx.createLinearGradient(0, -4, 0, 6);
    sashGrad.addColorStop(0, shade(sash, 10));
    sashGrad.addColorStop(1, shade(sash, -12));
    ctx.fillStyle = sashGrad;
    ctx.fillRect(-19, -4, 38, 9);
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    ctx.fillRect(-19, 2, 38, 3);
    ctx.strokeStyle = rgba(trim, .35);
    ctx.lineWidth = .8;
    ctx.beginPath();
    ctx.moveTo(-18, -2);
    ctx.lineTo(18, -2);
    ctx.stroke();
    // knot
    ctx.fillStyle = shade(sash, -6);
    ctx.beginPath();
    ctx.ellipse(2, 0, 5.5, 6.5, 0.15, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.25)';
    ctx.lineWidth = .8;
    ctx.stroke();
    // hanging tails
    for (const [x0, drift, len] of [[15, 25, 22], [9, 16, 16]]) {
      ctx.fillStyle = sash;
      ctx.beginPath();
      ctx.moveTo(x0, 0);
      ctx.quadraticCurveTo(x0 + drift * 0.45, 8 + Math.sin(this.time * 2 + x0) * 3, x0 + drift * 0.55, len);
      ctx.lineTo(x0 + drift * 0.55 - 5, len - 3);
      ctx.quadraticCurveTo(x0 + drift * 0.25, 8, x0 - 3, 3);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // front leg
    this.limb(ctx, hip[0] + 5, hip[1] + 3, flK[0], flK[1], flF[0], flF[1], 18, robe, outline);
    this.foot(ctx, flF[0], flF[1], shade(robe, 4), f.facing);

    // neck
    ctx.strokeStyle = skin;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(sh[0], sh[1] + 2);
    ctx.lineTo(head[0], head[1] + 13);
    ctx.stroke();

    // head
    ctx.save();
    ctx.translate(head[0], head[1]);
    ctx.rotate(pose.lean * 0.012);
    // hair back
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.ellipse(-3, -2, 18, 19, 0, 0, TAU);
    ctx.fill();
    // ear
    ctx.fillStyle = skinDark;
    ctx.beginPath();
    ctx.ellipse(-11, 4, 4.2, 6.2, 0.15, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.25)';
    ctx.lineWidth = .8;
    ctx.beginPath();
    ctx.arc(-10, 4, 2.4, -0.8, 1.9);
    ctx.stroke();
    // face
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(2, 1, 15.2, 16.6, 0.05, 0, TAU);
    ctx.fill();
    // cheek and jaw shading
    ctx.fillStyle = 'rgba(0,0,0,.09)';
    ctx.beginPath();
    ctx.ellipse(5, 8, 9.5, 7.5, 0.1, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba(skinLight, .32);
    ctx.beginPath();
    ctx.ellipse(9, 1, 5.5, 3.4, -0.2, 0, TAU);
    ctx.fill();
    // hair cap
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.moveTo(-15, -3);
    ctx.quadraticCurveTo(-14, -21, 2, -19);
    ctx.quadraticCurveTo(18, -18, 17, -4);
    ctx.quadraticCurveTo(9, -12, -3, -11);
    ctx.quadraticCurveTo(-10, -10, -15, -3);
    ctx.fill();
    // hair strands
    ctx.strokeStyle = 'rgba(255,255,255,.08)';
    ctx.lineWidth = .8;
    ctx.beginPath();
    ctx.moveTo(-10, -16);
    ctx.quadraticCurveTo(-3, -18, 4, -16);
    ctx.moveTo(-12, -12);
    ctx.quadraticCurveTo(-5, -14, 2, -12);
    ctx.moveTo(-8, -8);
    ctx.quadraticCurveTo(-2, -10, 5, -8);
    ctx.stroke();
    // topknot
    if (look.topknot) {
      ctx.fillStyle = hair;
      ctx.beginPath();
      ctx.arc(-4, -20, 6.5, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = trim;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(-4, -20, 6.5, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = trim;
      ctx.fillRect(-7.5, -16.5, 7, 2.2);
    }
    if (look.shaved) {
      ctx.fillStyle = 'rgba(0,0,0,.06)';
      ctx.beginPath();
      ctx.ellipse(1, -7, 12, 9, 0, 0, TAU);
      ctx.fill();
    }
    // headband
    if (look.headband) {
      ctx.strokeStyle = look.headband;
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.moveTo(-15, -7);
      ctx.lineTo(15, -8);
      ctx.stroke();
      ctx.strokeStyle = look.headband;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-14, -7);
      ctx.quadraticCurveTo(-24 - Math.sin(this.time * 2.4) * 3, -2, -29, 9);
      ctx.moveTo(-14, -5);
      ctx.quadraticCurveTo(-23, 2, -24, 13);
      ctx.stroke();
      ctx.fillStyle = look.headband;
      ctx.beginPath();
      ctx.ellipse(-15, -6.5, 3.1, 2.5, -0.3, 0, TAU);
      ctx.fill();
    }
    // eyes & brow
    ctx.fillStyle = '#f2e5cc';
    ctx.beginPath();
    ctx.ellipse(8, -2.2, 3.3, 1.8, 0.03, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1b1510';
    ctx.beginPath();
    ctx.arc(9.2, -2.2, 1.35, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.beginPath();
    ctx.arc(9.7, -2.7, .45, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#1b1510';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(4.6, -2.1);
    ctx.lineTo(11.8, -2.6);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(4.6, -6.2);
    ctx.quadraticCurveTo(8.4, -8, 12.4, -6.7);
    ctx.stroke();
    // nose/mouth
    ctx.strokeStyle = 'rgba(27,21,16,.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(13.2, 2.4);
    ctx.quadraticCurveTo(14.2, 5.2, 11.8, 6.7);
    ctx.moveTo(8.8, 7.9);
    ctx.lineTo(8.3, 9.4);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(130,52,40,.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(6.4, 11.2);
    ctx.quadraticCurveTo(9.2, 12.2, 12.2, 10.7);
    ctx.stroke();
    // scar
    if (look.scar) {
      ctx.strokeStyle = 'rgba(130,52,40,.8)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(8, -13);
      ctx.lineTo(12, 3);
      ctx.stroke();
    }
    // mask
    if (look.masked) {
      ctx.fillStyle = shade(look.robe, -20);
      ctx.beginPath();
      ctx.moveTo(-12, 4);
      ctx.quadraticCurveTo(2, 20, 17, 4);
      ctx.lineTo(15, 12);
      ctx.quadraticCurveTo(2, 25, -12, 12);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // front arm
    this.arm(ctx, sh[0] + 9, sh[1] + 5, faE[0], faE[1], faH[0], faH[1], robe, skin, outline, 12);

    // weapon
    this.drawWeapon(ctx, f, pose);

    // veil
    if (look.veil) {
      ctx.fillStyle = 'rgba(184,63,50,.12)';
      ctx.beginPath();
      ctx.moveTo(head[0] - 12, head[1] - 8);
      ctx.quadraticCurveTo(head[0] - 40, head[1] + 40, head[0] - 26, head[1] + 82);
      ctx.lineTo(head[0] - 6, head[1] + 70);
      ctx.quadraticCurveTo(head[0] - 22, head[1] + 30, head[0] + 2, head[1] - 6);
      ctx.closePath();
      ctx.fill();
    }
  }

  limb(ctx, x1, y1, x2, y2, x3, y3, width, color, outline) {
    ctx.strokeStyle = outline;
    ctx.lineWidth = width + 3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(x2, y2, x3, y3);
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(x2, y2, x3, y3);
    ctx.stroke();
  }

  arm(ctx, sx, sy, ex, ey, hx, hy, robe, skin, outline, width) {
    // sleeve to elbow
    ctx.strokeStyle = outline;
    ctx.lineWidth = width + 3;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo((sx + ex) / 2, (sy + ey) / 2 - 2, ex, ey);
    ctx.stroke();
    ctx.strokeStyle = robe;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo((sx + ex) / 2, (sy + ey) / 2 - 2, ex, ey);
    ctx.stroke();
    // forearm
    ctx.strokeStyle = outline;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    ctx.strokeStyle = skin;
    ctx.lineWidth = 6.5;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    // hand
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(hx, hy, 4.6, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  foot(ctx, x, y, color, facing) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x + 3 * facing, y - 1, 8, 3.6, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(4,4,3,.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  drawWeapon(ctx, f, pose) {
    const look = f.look;
    const hx = pose.faH[0], hy = pose.faH[1];
    if (look.weapon === 'staff') {
      ctx.strokeStyle = 'rgba(4,4,3,.6)';
      ctx.lineWidth = 5.4;
      ctx.beginPath();
      ctx.moveTo(hx - 26, hy + 58);
      ctx.lineTo(hx + 22, hy - 64);
      ctx.stroke();
      ctx.strokeStyle = '#6b4c2f';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(hx - 26, hy + 58);
      ctx.lineTo(hx + 22, hy - 64);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(216,182,120,.55)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(hx - 26, hy + 58);
      ctx.lineTo(hx + 22, hy - 64);
      ctx.stroke();
    } else if (look.weapon === 'blades') {
      for (const [px, py, len, ang] of [[hx, hy, 26, -0.35], [pose.baH[0], pose.baH[1], 20, 0.15]]) {
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(ang);
        ctx.strokeStyle = 'rgba(4,4,3,.6)';
        ctx.lineWidth = 3.4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(len, -2);
        ctx.stroke();
        ctx.strokeStyle = '#cfd6cc';
        ctx.lineWidth = 2.1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(len, -2);
        ctx.stroke();
        ctx.restore();
      }
    } else if (look.weapon === 'fan') {
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(-0.5);
      ctx.fillStyle = 'rgba(216,182,120,.18)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 20, -0.9, 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(216,182,120,.55)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, 20, -0.9, 0.5);
      ctx.stroke();
      for (let i = 0; i < 4; i++) {
        const a = -0.75 + i * 0.33;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * 20, Math.sin(a) * 20);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  drawTargetMarker(ctx) {
    if (!this.targetPart) return;
    const p = this.getPartPos('enemy', this.targetPart);
    const colors = { head: '#e0a786', arms: '#d8b678', torso: '#d76a45', legs: '#9aae5a' };
    const glyphs = { head: '頭', arms: '臂', torso: '胸', legs: '腿' };
    const color = colors[this.targetPart] || '#f0d49a';
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 7);
    const s = this.scale;
    ctx.save();
    ctx.translate(p.x, p.y);
    // outer rotating reticle
    ctx.save();
    ctx.rotate(this.time * 0.9);
    ctx.strokeStyle = rgba(color, 0.5 + pulse * 0.3);
    ctx.lineWidth = 1.4;
    ctx.setLineDash([7, 7]);
    ctx.beginPath();
    ctx.arc(0, 0, (27 + pulse * 4) * s, 0, TAU);
    ctx.stroke();
    ctx.restore();
    // inner ring
    ctx.strokeStyle = rgba(color, 0.85);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, (12 + pulse * 2) * s, 0, TAU);
    ctx.stroke();
    // crosshair
    ctx.strokeStyle = rgba(color, 0.7);
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 16 * s, Math.sin(a) * 16 * s);
      ctx.lineTo(Math.cos(a) * 32 * s, Math.sin(a) * 32 * s);
      ctx.stroke();
    }
    // glyph
    ctx.font = `${Math.round(13 * s)}px "Songti SC","Noto Serif CJK SC",serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = rgba(color, 0.95);
    ctx.fillText(glyphs[this.targetPart] || '', 0, -40 * s);
    ctx.restore();
  }

  drawEffects(ctx) {
    for (const e of this.effects) {
      const a = clamp(e.life / e.max, 0, 1);
      if (e.type === 'spark') {
        ctx.fillStyle = rgba(e.color.startsWith('#') ? e.color : '#f0d49a', a);
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r * (0.6 + a * 0.8), 0, TAU);
        ctx.fill();
      } else if (e.type === 'slash') {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.angle + e.rot);
        ctx.strokeStyle = `rgba(244,228,196,${a * 0.95})`;
        ctx.lineWidth = 2.6 * a + 0.8;
        ctx.beginPath();
        ctx.arc(0, 0, e.size * (1.15 - a * 0.15), -0.85, 0.5);
        ctx.stroke();
        ctx.strokeStyle = `rgba(240,212,154,${a * 0.5})`;
        ctx.lineWidth = 6 * a;
        ctx.beginPath();
        ctx.arc(0, 0, e.size * 0.96, -0.9, 0.45);
        ctx.stroke();
        ctx.restore();
      } else if (e.type === 'ring') {
        const r = e.maxR * (1 - a * 0.72);
        ctx.strokeStyle = rgba(e.color.startsWith('#') ? e.color : '#f0d49a', a * 0.75);
        ctx.lineWidth = 2 + a * 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, r, 0, TAU);
        ctx.stroke();
      } else if (e.type === 'streak') {
        ctx.strokeStyle = `rgba(159,212,205,${a * 0.6})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.x, e.y + e.len);
        ctx.stroke();
      }
    }
  }

  drawVignette(ctx, w, h) {
    const v = ctx.createRadialGradient(w * 0.5, h * 0.48, Math.min(w, h) * 0.25, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
    v.addColorStop(0, 'rgba(5,6,4,0)');
    v.addColorStop(0.72, 'rgba(5,6,4,.16)');
    v.addColorStop(1, 'rgba(5,6,4,.62)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  }
}
