/* Tiny procedural sound engine — no external files. */

let ctx = null;
let master = null;
let enabled = true;
let noiseBuffer = null;

function ensure() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.knee.value = 22;
  comp.ratio.value = 6;
  comp.attack.value = 0.003;
  comp.release.value = 0.2;
  master = ctx.createGain();
  master.gain.value = enabled ? 0.24 : 0;
  master.connect(comp);
  comp.connect(ctx.destination);
  noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 1.2), ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return ctx;
}

export function initAudio() { ensure(); }

export function setSound(on) {
  enabled = !!on;
  if (master) master.gain.setTargetAtTime(enabled ? 0.24 : 0, ctx.currentTime, 0.03);
}

export function soundEnabled() { return enabled; }

function tone({ freq = 220, to = null, dur = 0.18, type = 'sine', gain = 0.15, delay = 0, attack = 0.005 }) {
  if (!enabled) return;
  const c = ensure();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise({ dur = 0.14, gain = 0.12, freq = 1800, q = 0.8, delay = 0, type = 'bandpass', to = null }) {
  if (!enabled) return;
  const c = ensure();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer;
  const filter = c.createBiquadFilter();
  filter.type = type;
  filter.frequency.setValueAtTime(freq, t0);
  if (to) filter.frequency.exponentialRampToValueAtTime(Math.max(40, to), t0 + dur);
  filter.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

const recipes = {
  click() {
    tone({ freq: 420, to: 320, dur: 0.05, type: 'triangle', gain: 0.05 });
  },
  card() {
    noise({ dur: 0.13, gain: 0.06, freq: 2200, q: 0.6, type: 'highpass' });
    tone({ freq: 340, to: 510, dur: 0.1, type: 'sine', gain: 0.05 });
  },
  draw() {
    noise({ dur: 0.09, gain: 0.03, freq: 3000, q: 0.5, type: 'highpass' });
  },
  chi() {
    tone({ freq: 660, to: 990, dur: 0.16, type: 'sine', gain: 0.05 });
    tone({ freq: 990, to: 1320, dur: 0.14, type: 'sine', gain: 0.025, delay: 0.04 });
  },
  hit() {
    tone({ freq: 120, to: 52, dur: 0.16, type: 'sine', gain: 0.22 });
    noise({ dur: 0.09, gain: 0.12, freq: 1300, q: 0.7, type: 'bandpass' });
  },
  heavy() {
    tone({ freq: 95, to: 38, dur: 0.28, type: 'sine', gain: 0.28 });
    noise({ dur: 0.18, gain: 0.18, freq: 900, q: 0.5, type: 'lowpass' });
  },
  block() {
    tone({ freq: 740, to: 420, dur: 0.12, type: 'triangle', gain: 0.08 });
    noise({ dur: 0.1, gain: 0.07, freq: 3400, q: 2.5, type: 'bandpass' });
  },
  dodge() {
    noise({ dur: 0.22, gain: 0.07, freq: 700, to: 2600, q: 0.8, type: 'bandpass' });
  },
  heal() {
    tone({ freq: 392, to: 523, dur: 0.3, type: 'sine', gain: 0.06 });
    tone({ freq: 523, to: 784, dur: 0.35, type: 'sine', gain: 0.035, delay: 0.09 });
  },
  buff() {
    tone({ freq: 196, to: 294, dur: 0.25, type: 'triangle', gain: 0.07 });
    tone({ freq: 392, dur: 0.4, type: 'sine', gain: 0.03, delay: 0.08 });
  },
  debuff() {
    tone({ freq: 240, to: 120, dur: 0.3, type: 'sawtooth', gain: 0.035 });
    noise({ dur: 0.2, gain: 0.04, freq: 500, q: 1.2, type: 'bandpass' });
  },
  break() {
    noise({ dur: 0.35, gain: 0.2, freq: 600, to: 90, q: 0.5, type: 'lowpass' });
    tone({ freq: 180, to: 52, dur: 0.5, type: 'sine', gain: 0.24 });
    tone({ freq: 840, to: 310, dur: 0.35, type: 'triangle', gain: 0.06 });
  },
  win() {
    const notes = [220, 293.66, 329.63, 440, 587.33];
    notes.forEach((f, i) => tone({ freq: f, dur: 1.6 - i * 0.08, type: 'sine', gain: 0.075, delay: i * 0.11, attack: 0.01 }));
    tone({ freq: 110, dur: 2.2, type: 'sine', gain: 0.1 });
    noise({ dur: 0.6, gain: 0.05, freq: 2400, q: 0.4, type: 'highpass', delay: 0.05 });
  },
  lose() {
    const notes = [220, 196, 164.81, 110];
    notes.forEach((f, i) => tone({ freq: f, to: f * 0.94, dur: 1.4, type: 'sine', gain: 0.08, delay: i * 0.18 }));
    noise({ dur: 0.8, gain: 0.04, freq: 400, q: 0.7, type: 'lowpass' });
  },
  deny() {
    tone({ freq: 130, to: 92, dur: 0.16, type: 'square', gain: 0.04 });
    tone({ freq: 98, to: 70, dur: 0.2, type: 'triangle', gain: 0.05, delay: 0.05 });
  },
  upgrade() {
    [392, 523.25, 659.25, 783.99].forEach((f, i) => tone({ freq: f, dur: 0.32, type: 'sine', gain: 0.05, delay: i * 0.06 }));
    noise({ dur: 0.22, gain: 0.05, freq: 3200, q: 2, type: 'bandpass' });
  },
  turn() {
    tone({ freq: 147, to: 196, dur: 0.25, type: 'triangle', gain: 0.045 });
  }
};

export function sfx(name) {
  if (!enabled) return;
  if (!ctx) ensure();
  const fn = recipes[name];
  if (fn) {
    try { fn(); } catch { /* ignore audio errors */ }
  }
}
