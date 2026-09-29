// Synthesizes the promo soundtrack (music bed + sound design) offline, locked to the
// video's cue frames in src/timeline.json. No samples, no licences: every sound is built
// from oscillators and seeded noise, so the output is identical on every run.
//
//   node scripts/soundtrack.mjs   ->   public/audio/soundtrack.wav
import { OfflineAudioContext } from 'node-web-audio-api';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const timeline = JSON.parse(readFileSync(new URL('../src/timeline.json', import.meta.url), 'utf8'));
const { fps, bpm, cues, scenes } = timeline;
const SR = 48000;
const DURATION = timeline.durationInFrames / fps;
const BEAT = 60 / bpm;
const BAR = BEAT * 4;
const sec = (frame) => frame / fps;

const ctx = new OfflineAudioContext({
  numberOfChannels: 2,
  length: Math.ceil(DURATION * SR),
  sampleRate: SR,
});

// ---------------------------------------------------------------------------------------------
// Utilities

let seed = 0x5eed;
const rand = () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const noiseBuffer = (seconds, channels = 1) => {
  const buf = ctx.createBuffer(channels, Math.ceil(seconds * SR), SR);
  for (let c = 0; c < channels; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < d.length; i++) d[i] = rand() * 2 - 1;
  }
  return buf;
};
const NOISE = noiseBuffer(4, 2);

const midi = (n) => 440 * 2 ** ((n - 69) / 12);

const gainNode = (value, to) => {
  const g = ctx.createGain();
  g.gain.value = value;
  if (to) g.connect(to);
  return g;
};

const filter = (type, frequency, Q = 0.7, to) => {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = frequency;
  f.Q.value = Q;
  if (to) f.connect(to);
  return f;
};

const noiseSource = (t, dur, to, rate = 1) => {
  const src = ctx.createBufferSource();
  src.buffer = NOISE;
  src.loop = true;
  src.playbackRate.value = rate;
  src.connect(to);
  src.start(t, rand() * 3);
  src.stop(t + dur);
  return src;
};

/** Attack / hold / exponential release envelope on a gain param. */
const envelope = (param, t, { a = 0.005, peak = 1, hold = 0, r = 0.2, floor = 0.0001 }) => {
  param.setValueAtTime(floor, t);
  param.linearRampToValueAtTime(peak, t + a);
  param.setValueAtTime(peak, t + a + hold);
  param.exponentialRampToValueAtTime(floor, t + a + hold + r);
};

// ---------------------------------------------------------------------------------------------
// Buses: music is side-chain ducked by the kick; everything meets in a gentle master compressor.

const comp = ctx.createDynamicsCompressor();
comp.threshold.value = -16;
comp.knee.value = 12;
comp.ratio.value = 3;
comp.attack.value = 0.004;
comp.release.value = 0.22;
comp.connect(ctx.destination);
// Tilt EQ: lean out the lows, lift presence and air so the mix survives laptop speakers.
const lowShelf = filter('lowshelf', 140, 0.7);
lowShelf.gain.value = -3;
const highShelf = filter('highshelf', 3200, 0.7);
highShelf.gain.value = 6;
const rumble = filter('highpass', 30, 0.7, comp);
lowShelf.connect(highShelf).connect(rumble);
const master = gainNode(0.9, lowShelf);

const duck = gainNode(1, master);
const music = gainNode(0.8, duck);
const sfx = gainNode(1, master);

// Plate-ish reverb from decaying stereo noise.
const reverb = ctx.createConvolver();
{
  const len = Math.ceil(3.2 * SR);
  const ir = ctx.createBuffer(2, len, SR);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      d[i] = (rand() * 2 - 1) * Math.exp(-t / 0.75) * (t < 0.012 ? t / 0.012 : 1);
    }
  }
  reverb.buffer = ir;
}
const reverbReturn = gainNode(0.32, master);
reverb.connect(filter('highpass', 180, 0.7, reverbReturn));
const verbSend = (amount) => gainNode(amount, reverb);

// Ping-pong-ish delay for the arpeggio.
const delay = ctx.createDelay(2);
delay.delayTime.value = BEAT * 0.75;
const delayFb = gainNode(0.32);
const delayOut = gainNode(0.28, music);
delay.connect(delayFb);
delayFb.connect(delay);
delay.connect(filter('lowpass', 3200, 0.7, delayOut));

// ---------------------------------------------------------------------------------------------
// Harmony: D minor, i - VI - III - VII, one chord per bar, resolving to D major on the end card.

const CHORDS = {
  Dm: { bass: 38, notes: [50, 53, 57, 64] },
  Bb: { bass: 34, notes: [46, 50, 53, 57] },
  F: { bass: 41, notes: [53, 57, 60, 64] },
  C: { bass: 36, notes: [48, 52, 55, 62] },
  D: { bass: 38, notes: [50, 54, 57, 64, 69] },
};
const LOOP = ['Dm', 'Bb', 'F', 'C'];
const upgradeTimes = [cues.upgrade1, cues.upgrade2, cues.upgrade3].map(sec);
const ctaHit = sec(cues.logoHit);
const summaryAt = sec(scenes.summary.from);
const padStart = sec(cues.hookLine3) - 0.15;

const chordAtBar = (bar) => LOOP[(bar - 2 + 400) % 4];

const pad = (t, dur, notes, level) => {
  const out = gainNode(0, music);
  out.connect(verbSend(0.5));
  envelope(out.gain, t, { a: 0.9, peak: level, hold: Math.max(0, dur - 0.9), r: 1.6 });
  const lp = filter('lowpass', 2200, 0.8, out);
  lp.frequency.setValueAtTime(1600, t);
  lp.frequency.linearRampToValueAtTime(3200, t + dur);
  // Shimmer: the top of the chord an octave up, high-passed, for air.
  const air = filter('highpass', 1800, 0.7, gainNode(0.35, out));
  for (const n of notes.slice(-2)) {
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = midi(n + 12);
    o.connect(air);
    o.start(t);
    o.stop(t + dur + 1.8);
  }
  for (const n of notes) {
    for (const detune of [-8, 7]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = midi(n);
      o.detune.value = detune;
      const pan = ctx.createStereoPanner();
      pan.pan.value = detune < 0 ? -0.35 : 0.35;
      o.connect(pan).connect(lp);
      o.start(t);
      o.stop(t + dur + 1.8);
    }
  }
};

const bassNote = (t, n, len, level) => {
  const g = gainNode(0, music);
  envelope(g.gain, t, { a: 0.006, peak: level, hold: len * 0.4, r: len * 0.7 });
  const lp = filter('lowpass', 420, 4, g);
  lp.frequency.setValueAtTime(1400, t);
  lp.frequency.exponentialRampToValueAtTime(260, t + len);
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.value = midi(n);
  const sub = ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.value = midi(n - 12);
  o.connect(lp);
  sub.connect(gainNode(0.55, g));
  o.start(t);
  sub.start(t);
  o.stop(t + len + 0.2);
  sub.stop(t + len + 0.2);
};

const pluck = (t, n, level) => {
  const g = gainNode(0, music);
  g.connect(delay);
  g.connect(verbSend(0.2));
  envelope(g.gain, t, { a: 0.003, peak: level, r: 0.22 });
  const lp = filter('lowpass', 4200, 2, g);
  lp.frequency.setValueAtTime(7000, t);
  lp.frequency.exponentialRampToValueAtTime(1600, t + 0.2);
  const o = ctx.createOscillator();
  o.type = 'square';
  o.frequency.value = midi(n);
  const pan = ctx.createStereoPanner();
  pan.pan.value = (rand() - 0.5) * 0.8;
  o.connect(pan).connect(lp);
  o.start(t);
  o.stop(t + 0.35);
};

// Drone under the hook.
{
  const g = gainNode(0, music);
  g.gain.setValueAtTime(0.0001, 0);
  g.gain.linearRampToValueAtTime(0.22, 1.4);
  g.gain.setValueAtTime(0.22, padStart);
  g.gain.linearRampToValueAtTime(0.0001, padStart + 2.5);
  const lp = filter('lowpass', 240, 1.2, g);
  lp.frequency.setValueAtTime(180, 0);
  lp.frequency.linearRampToValueAtTime(520, padStart);
  for (const [n, type] of [
    [38, 'sawtooth'],
    [45, 'sawtooth'],
    [50, 'triangle'],
  ]) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = midi(n);
    o.connect(lp);
    o.start(0);
    o.stop(padStart + 3);
  }
}

// Pads, bass and arpeggio, bar by bar.
const totalBars = Math.ceil(DURATION / BAR);
for (let bar = 2; bar < totalBars; bar++) {
  const t0 = Math.max(bar * BAR, bar === 2 ? padStart : 0);
  const t1 = (bar + 1) * BAR;
  if (t0 >= ctaHit - 0.05) break;
  const name = chordAtBar(bar);
  const chord = CHORDS[name];
  const inSummary = t0 >= summaryAt;
  const end = Math.min(t1, ctaHit);
  pad(t0, end - t0, chord.notes, inSummary ? 0.05 : 0.06);

  // Pulsing eighth-note bass from the first bar of the item scene.
  if (bar >= 3) {
    for (let i = 0; i < 8; i++) {
      const t = bar * BAR + i * (BEAT / 2);
      if (t >= ctaHit - 0.02) break;
      const accent = i % 2 === 0 ? 1 : 0.7;
      bassNote(t, chord.bass + 12, BEAT / 2, (inSummary ? 0.12 : 0.16) * accent);
    }
  }

  // Sixteenth-note arpeggio from the Epic upgrade until the summary.
  if (bar * BAR >= upgradeTimes[1] - 0.01 && bar * BAR < summaryAt) {
    const tones = [...chord.notes.map((n) => n + 12), chord.notes[1] + 24];
    for (let i = 0; i < 16; i++) {
      const t = bar * BAR + i * (BEAT / 4);
      const n = tones[[0, 2, 1, 3, 4, 3, 1, 2][i % 8]];
      pluck(t, n, bar * BAR >= upgradeTimes[2] ? 0.05 : 0.04);
    }
  }
}

// End chord: resolve to D major and let it ring out.
pad(ctaHit, DURATION - ctaHit - 1.2, CHORDS.D.notes, 0.075);
bassNote(ctaHit, 38, 3.5, 0.2);

// ---------------------------------------------------------------------------------------------
// Drums

const kick = (t, level = 1) => {
  const g = gainNode(0, sfx);
  envelope(g.gain, t, { a: 0.002, peak: 0.78 * level, r: 0.4 });
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(46, t + 0.11);
  o.connect(g);
  o.start(t);
  o.stop(t + 0.5);
  const click = gainNode(0, sfx);
  envelope(click.gain, t, { a: 0.001, peak: 0.3 * level, r: 0.018 });
  noiseSource(t, 0.04, filter('highpass', 3000, 0.7, click));
  // Side-chain the music bus so the kick breathes.
  duck.gain.setValueAtTime(1, t);
  duck.gain.linearRampToValueAtTime(0.5, t + 0.012);
  duck.gain.linearRampToValueAtTime(1, t + 0.26);
};

const hat = (t, level = 1, open = false) => {
  const g = gainNode(0, sfx);
  envelope(g.gain, t, { a: 0.001, peak: 0.2 * level, r: open ? 0.24 : 0.05 });
  const pan = ctx.createStereoPanner();
  pan.pan.value = 0.25;
  pan.connect(g);
  noiseSource(t, open ? 0.3 : 0.08, filter('highpass', 6500, 0.8, pan));
};

const clap = (t, level = 1) => {
  const g = gainNode(1, sfx);
  g.connect(verbSend(0.35));
  const bp = filter('bandpass', 1300, 1.1, g);
  for (const [off, peak, r] of [
    [0, 0.32, 0.012],
    [0.011, 0.26, 0.012],
    [0.022, 0.34, 0.16],
  ]) {
    const e = gainNode(0, bp);
    envelope(e.gain, t + off, { a: 0.001, peak: peak * level, r });
    noiseSource(t + off, r + 0.05, e);
  }
  const snap = gainNode(0, sfx);
  envelope(snap.gain, t, { a: 0.001, peak: 0.16 * level, r: 0.06 });
  noiseSource(t, 0.1, filter('highpass', 4000, 0.7, snap));
};

for (let beatIndex = 0; beatIndex * BEAT < DURATION; beatIndex++) {
  const t = beatIndex * BEAT;
  if (t < upgradeTimes[0] - 0.01 || t >= ctaHit - 0.01) continue;
  const inSummary = t >= summaryAt;
  kick(t, inSummary ? 0.6 : 1);
  if (!inSummary) {
    hat(t + BEAT / 2, t >= upgradeTimes[1] ? 1 : 0.7, t >= upgradeTimes[2] && beatIndex % 4 === 3);
    if (t >= upgradeTimes[1] && beatIndex % 2 === 1) clap(t, t >= upgradeTimes[2] ? 1 : 0.8);
    if (t >= upgradeTimes[2]) {
      hat(t + BEAT / 4, 0.45);
      hat(t + (BEAT * 3) / 4, 0.45);
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Sound design

const impact = (t, size = 1) => {
  const g = gainNode(0, sfx);
  g.connect(verbSend(0.4 * size));
  envelope(g.gain, t, { a: 0.003, peak: 0.95 * size, r: 1.5 * size });
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(78, t);
  o.frequency.exponentialRampToValueAtTime(30, t + 0.9 * size);
  o.connect(g);
  o.start(t);
  o.stop(t + 2 * size);
  const n = gainNode(0, sfx);
  n.connect(verbSend(0.5));
  envelope(n.gain, t, { a: 0.002, peak: 0.35 * size, r: 0.7 * size });
  const lp = filter('lowpass', 2400, 0.7, n);
  lp.frequency.setValueAtTime(5000, t);
  lp.frequency.exponentialRampToValueAtTime(300, t + 0.6);
  noiseSource(t, 1.2 * size, lp);
};

const crash = (t, level = 1) => {
  const g = gainNode(0, sfx);
  g.connect(verbSend(0.3));
  envelope(g.gain, t, { a: 0.002, peak: 0.16 * level, r: 2.4 });
  const pan = ctx.createStereoPanner();
  pan.pan.value = -0.2;
  pan.connect(g);
  noiseSource(t, 3, filter('highpass', 5200, 0.6, pan), 0.9);
};

const riser = (t0, t1, level = 1) => {
  const dur = t1 - t0;
  const g = gainNode(0, sfx);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.28 * level, t1 - 0.02);
  g.gain.linearRampToValueAtTime(0, t1);
  const bp = filter('bandpass', 400, 2.2, g);
  bp.frequency.setValueAtTime(350, t0);
  bp.frequency.exponentialRampToValueAtTime(7500, t1);
  noiseSource(t0, dur, bp);
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(180, t0);
  o.frequency.exponentialRampToValueAtTime(880, t1);
  const og = gainNode(0, sfx);
  og.gain.setValueAtTime(0.0001, t0);
  og.gain.exponentialRampToValueAtTime(0.06 * level, t1 - 0.02);
  og.gain.linearRampToValueAtTime(0, t1);
  o.connect(og);
  o.start(t0);
  o.stop(t1);
};

const whoosh = (peak, level = 1, dur = 0.7) => {
  const t0 = peak - dur * 0.6;
  const g = gainNode(0, sfx);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.3 * level, peak);
  g.gain.exponentialRampToValueAtTime(0.0001, peak + dur * 0.4);
  const pan = ctx.createStereoPanner();
  pan.pan.setValueAtTime(-0.7, t0);
  pan.pan.linearRampToValueAtTime(0.7, peak + dur * 0.4);
  pan.connect(g);
  const bp = filter('bandpass', 500, 1.4, pan);
  bp.frequency.setValueAtTime(300, t0);
  bp.frequency.exponentialRampToValueAtTime(2600, peak);
  bp.frequency.exponentialRampToValueAtTime(600, peak + dur * 0.4);
  noiseSource(t0, dur + 0.1, bp);
};

/** Bell tones: inharmonic partials with fast-decaying highs, like an item upgrade chime. */
const bell = (t, n, level = 1, decay = 1.8) => {
  const out = gainNode(1, sfx);
  out.connect(verbSend(0.6));
  for (const [ratio, amp, d] of [
    [1, 1, 1],
    [2.0, 0.45, 0.7],
    [2.76, 0.3, 0.45],
    [5.4, 0.12, 0.25],
  ]) {
    const g = gainNode(0, out);
    envelope(g.gain, t, { a: 0.002, peak: 0.15 * level * amp, r: decay * d });
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = midi(n) * ratio;
    o.connect(g);
    o.start(t);
    o.stop(t + decay + 0.1);
  }
};

const tick = (t, level = 1, freq = 3200) => {
  const g = gainNode(0, sfx);
  envelope(g.gain, t, { a: 0.0008, peak: 0.12 * level, r: 0.018 });
  noiseSource(t, 0.03, filter('bandpass', freq, 1.5, g));
};

const uiClick = (t) => {
  tick(t, 1.6, 2400);
  const g = gainNode(0, sfx);
  envelope(g.gain, t, { a: 0.001, peak: 0.12, r: 0.05 });
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(1500, t);
  o.frequency.exponentialRampToValueAtTime(700, t + 0.05);
  o.connect(g);
  o.start(t);
  o.stop(t + 0.08);
};

// Hook: heartbeat, the health drain, the wipe.
for (let t = 0.05; t < sec(cues.wipeHit) - 0.1; t += BEAT) {
  kick(t, 0.35);
}
{
  const t0 = sec(4);
  const t1 = sec(cues.wipeHit - 8);
  const g = gainNode(0, sfx);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.14, t0 + 0.2);
  g.gain.exponentialRampToValueAtTime(0.0001, t1 + 0.1);
  const bp = filter('bandpass', 2000, 3, g);
  bp.frequency.setValueAtTime(2600, t0);
  bp.frequency.exponentialRampToValueAtTime(320, t1);
  noiseSource(t0, t1 - t0 + 0.2, bp);
}
impact(sec(cues.wipeHit), 1.25);
bell(sec(cues.wipeHit) + 0.02, 38, 0.5, 2.6);

// "ESO Logs has the numbers": a tick per table row.
tick(sec(cues.hookLine2), 1.2, 1800);
for (let i = 0; i < 6; i++) tick(sec(cues.hookLine2 + 14 + i * 5), 0.8, 2600 - i * 120);

// "ESO Toolkit shows you the fight": reverse swell into the pad.
{
  const t1 = sec(cues.hookLine3) + 0.05;
  const t0 = t1 - 1.1;
  const g = gainNode(0, sfx);
  g.connect(verbSend(0.4));
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.22, t1);
  g.gain.linearRampToValueAtTime(0, t1 + 0.03);
  noiseSource(t0, 1.2, filter('highpass', 3000, 0.7, g));
}
whoosh(sec(scenes.item.from), 1.1);

// Item scene: the item appears, docks, the address is typed, Analyze is pressed.
bell(sec(scenes.item.from + 6), 74, 0.5, 1.4);
bell(sec(scenes.item.from + 10), 81, 0.35, 1.4);
whoosh(sec(cues.itemToHud + 14), 0.7);
for (let i = 0; i < 37; i += 1) {
  if (i % 2 === 1 && rand() > 0.5) continue;
  tick(
    sec(cues.typeStart) + (i / 37) * (sec(cues.typeEnd) - sec(cues.typeStart)),
    0.5 + rand() * 0.4,
    2800 + rand() * 1400,
  );
}
uiClick(sec(cues.click));

// Upgrades: riser, impact, crash and a rising three-note chime per tier.
const CHIMES = [
  [74, 77, 81],
  [77, 81, 84],
  [81, 86, 89, 93],
];
upgradeTimes.forEach((t, i) => {
  riser(t - (i === 0 ? 1.1 : 1.8), t, 0.8 + i * 0.15);
  impact(t, 0.8 + i * 0.25);
  crash(t, 0.8 + i * 0.3);
  CHIMES[i].forEach((n, j) => bell(t + 0.02 + j * 0.07, n, 0.9 + i * 0.1, 1.6 + i * 0.5));
  if (i === 2) [98, 101, 105].forEach((n, j) => bell(t + 0.32 + j * 0.05, n, 0.35, 1.2));
});

// Shot changes inside scenes get a light swish; bigger moves get a full whoosh.
[
  cues.insightsBeat2,
  cues.insightsBeat3,
  cues.buildsBeat2,
  cues.buildsBeat3,
  cues.buildsBeat4,
].forEach((f) => whoosh(sec(f), 0.4, 0.45));
whoosh(sec(cues.upgrade2 + 52), 0.6, 0.8);
whoosh(sec(cues.replayOut + 20), 0.6, 0.8);
whoosh(sec(scenes.summary.from + 12), 0.8);
bell(sec(cues.compareIn + 4), 69, 0.45, 1.6);

// End card.
riser(ctaHit - 1.4, ctaHit, 0.7);
whoosh(sec(scenes.cta.from), 0.8);
impact(ctaHit, 1.1);
crash(ctaHit, 0.9);
[74, 78, 81, 86].forEach((n, j) => bell(ctaHit + 0.03 + j * 0.06, n, 0.8, 2.6));

// ---------------------------------------------------------------------------------------------
// Render, normalise, fade and write a 16-bit WAV.

const rendered = await ctx.startRendering();
const L = rendered.getChannelData(0);
const R = rendered.getChannelData(1);

let sumSq = 0;
for (let i = 0; i < L.length; i++) sumSq += L[i] * L[i] + R[i] * R[i];
const rms = Math.sqrt(sumSq / (L.length * 2));
const targetRms = 10 ** (-15.5 / 20);
const gain = targetRms / rms;
const ceiling = 10 ** (-1 / 20);
const soft = (x) => {
  const y = x * gain;
  const a = Math.abs(y);
  if (a <= 0.8 * ceiling) return y;
  // Smooth knee into the ceiling.
  const over = (a - 0.8 * ceiling) / (0.2 * ceiling);
  return Math.sign(y) * (0.8 * ceiling + 0.2 * ceiling * Math.tanh(over));
};

const fadeOut = Math.floor(1.2 * SR);
const frames = L.length;
const pcm = Buffer.alloc(44 + frames * 4);
pcm.write('RIFF', 0);
pcm.writeUInt32LE(36 + frames * 4, 4);
pcm.write('WAVE', 8);
pcm.write('fmt ', 12);
pcm.writeUInt32LE(16, 16);
pcm.writeUInt16LE(1, 20);
pcm.writeUInt16LE(2, 22);
pcm.writeUInt32LE(SR, 24);
pcm.writeUInt32LE(SR * 4, 28);
pcm.writeUInt16LE(4, 32);
pcm.writeUInt16LE(16, 34);
pcm.write('data', 36);
pcm.writeUInt32LE(frames * 4, 40);
let peak = 0;
for (let i = 0; i < frames; i++) {
  const fade = i > frames - fadeOut ? (frames - i) / fadeOut : 1;
  const l = soft(L[i]) * fade;
  const r = soft(R[i]) * fade;
  peak = Math.max(peak, Math.abs(l), Math.abs(r));
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, l)) * 32767), 44 + i * 4);
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, r)) * 32767), 46 + i * 4);
}

mkdirSync(new URL('../public/audio/', import.meta.url), { recursive: true });
writeFileSync(new URL('../public/audio/soundtrack.wav', import.meta.url), pcm);
console.log(
  `soundtrack.wav: ${DURATION.toFixed(2)}s, pre-gain RMS ${(20 * Math.log10(rms)).toFixed(1)} dBFS, ` +
    `gain ${(20 * Math.log10(gain)).toFixed(1)} dB, peak ${(20 * Math.log10(peak)).toFixed(1)} dBFS`,
);
