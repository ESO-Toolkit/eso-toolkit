// Builds the promo soundtrack: synthesized music bed and sound design, the ElevenLabs narration
// on top, the music ducked under the voice, then loudness-normalized with ffmpeg. Every cue
// comes from engine/director.js, so the audio follows the picture exactly. No samples or
// licences: the music and effects are oscillators and seeded noise.
//
//   node scripts/soundtrack.mjs   ->   out/soundtrack.wav
//
// The audio engine keeps processing every node until the render ends, so one context holding
// the whole cut slows down with the square of its length. The track is rendered instead in
// short overlapping windows, each holding only the sounds that start in it (plus a lead-in that
// is discarded), all in parallel, then joined with short crossfades.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import { OfflineAudioContext } from 'node-web-audio-api';
import { CUES, TIMELINE } from '../engine/director.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const SR = 48000;
const DURATION = CUES.duration;
const BEAT = 0.5; // 120 bpm
const BAR = BEAT * 4;
// Window length, the lead-in rendered before each window (longer than any sound plus its
// reverb), and the crossfade between windows, in seconds.
const WINDOW = 12;
const LEAD_IN = 6;
const XFADE = 0.05;

// STEM=music renders the bed without the narration (for checking the voice/music balance).
const STEM = process.env.STEM;

// ---------------------------------------------------------------------------------------------
// Shared data: seeded noise, the reverb impulse, and per-sound randomness keyed on time, so every
// window renders a sound identically.

let seed = 0x5eed;
const rand = () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
/** A stable pseudo-random number in [0, 1) for a sound at time t. */
const randAt = (t, k = 0) => {
  const x = Math.sin(t * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

const NOISE_DATA = [0, 1].map(() => {
  const d = new Float32Array(4 * SR);
  for (let i = 0; i < d.length; i++) d[i] = rand() * 2 - 1;
  return d;
});
// Plate-ish reverb from decaying stereo noise.
const IR_DATA = [0, 1].map(() => {
  const d = new Float32Array(Math.ceil(3.2 * SR));
  for (let i = 0; i < d.length; i++) {
    const t = i / SR;
    d[i] = (rand() * 2 - 1) * Math.exp(-t / 0.75) * (t < 0.012 ? t / 0.012 : 1);
  }
  return d;
});

const midi = (n) => 440 * 2 ** ((n - 69) / 12);

// ---------------------------------------------------------------------------------------------
// Narration: decoded once, levelled, and used both as audio and to drive the music ducking.

const decode = (file) => {
  const raw = execFileSync(
    ffmpegPath,
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      file,
      '-f',
      'f32le',
      '-ac',
      '1',
      '-ar',
      String(SR),
      '-',
    ],
    { maxBuffer: 1 << 28 },
  );
  return new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
};
const LINES = Object.entries(TIMELINE.narration).map(([id, start]) => ({
  start,
  pcm: decode(path.join(ROOT, 'assets', 'narration', `${id}.mp3`)),
}));

// Voices are recorded at different levels, so the narration is levelled to -22 LUFS (measured
// across all lines) before the fixed voice gain that sets its balance against the music.
const narrationLufs = (() => {
  const ids = Object.keys(TIMELINE.narration);
  const inputs = ids.flatMap((id) => ['-i', path.join(ROOT, 'assets', 'narration', `${id}.mp3`)]);
  const out = spawnSync(
    ffmpegPath,
    [
      '-hide_banner',
      '-nostats',
      ...inputs,
      '-filter_complex',
      `concat=n=${ids.length}:v=0:a=1,ebur128`,
      '-f',
      'null',
      '-',
    ],
    { encoding: 'utf8' },
  ).stderr;
  return Number(
    out
      .match(/I:\s+(-?[\d.]+) LUFS/g)
      .at(-1)
      .match(/-?[\d.]+/)[0],
  );
})();
const voiceLevel = 2.8 * 10 ** ((-22 - narrationLufs) / 20);

// Voice activity at 100 Hz: RMS in dB mapped to 0..1, with a fast attack and slow release.
const speech = new Float32Array(Math.ceil(DURATION * SR));
for (const { start, pcm } of LINES) {
  const at = Math.round(start * SR);
  speech.set(pcm.subarray(0, Math.max(0, speech.length - at)), at);
}
const HOP = SR / 100;
const activity = new Float32Array(Math.ceil(speech.length / HOP));
{
  let level = 0;
  for (let k = 0; k < activity.length; k++) {
    let sum = 0;
    for (let i = k * HOP; i < Math.min(speech.length, (k + 1) * HOP); i++)
      sum += speech[i] * speech[i];
    const db = 10 * Math.log10(sum / HOP + 1e-12);
    const target = Math.min(1, Math.max(0, (db + 48) / 16));
    level += (target - level) * (target > level ? 0.35 : 0.035);
    activity[k] = level;
  }
}
const MUSIC_DUCK = activity.map((a) => 1 - 0.8 * a);
const SFX_DUCK = activity.map((a) => 1 - 0.7 * a);

// ---------------------------------------------------------------------------------------------
// Arrangement (shared by every window)

// Harmony: D minor, i - VI - III - VII, one chord per bar, resolving to D major on the end card.
const CHORDS = {
  Dm: { bass: 38, notes: [50, 53, 57, 64] },
  Bb: { bass: 34, notes: [46, 50, 53, 57] },
  F: { bass: 41, notes: [53, 57, 60, 64] },
  C: { bass: 36, notes: [48, 52, 55, 62] },
  D: { bass: 38, notes: [50, 54, 57, 64, 69] },
};
const LOOP = ['Dm', 'Bb', 'F', 'C'];
// Pads under ESO Logs; a pulse when ESO Toolkit takes over; light drums while the build is
// decoded; the full groove on the 3D reveal, dropping out for each chapter title; back to pads
// for the outro, resolving on the logo.
const C = CUES;
const padStart = C.formPage - 0.3;
const drop = C.reads + 0.9;
const lift = C.lift;
const full = C.full;
const calm = C.o1 - 0.2;
const ctaHit = C.free + 2.2;

const chordAtBar = (bar) => LOOP[(bar + 400) % 4];
// After the 3D reveal the groove settles a little for the tool chapters, so the narration sits
// clear of it.
const settle = (t) => (t >= C.chapters[0] ? 0.72 : 1);
// The drums rest while a chapter title card is on screen.
const inBreak = (t) => C.chapters.some((c) => t >= c - 0.05 && t < c + 1.35);
const CHIMES = [
  [74, 77, 81],
  [77, 81, 84],
  [81, 86, 89],
  [74, 81, 86],
  [81, 86, 89, 93],
  [74, 78, 81, 86],
];

/**
 * Builds the whole mix into `ctx`, which covers [t0, t1) of the cut: only sounds starting in that
 * span are created, and every time is shifted so that t0 is the context's zero.
 */
function build(ctx, t0, t1) {
  const at = (t) => t - t0;
  const live = (t) => t >= t0 && t < t1;

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
  const NOISE = ctx.createBuffer(2, NOISE_DATA[0].length, SR);
  NOISE_DATA.forEach((d, c) => NOISE.copyToChannel(d, c));
  const noiseSource = (t, dur, to, rate = 1) => {
    const src = ctx.createBufferSource();
    src.buffer = NOISE;
    src.loop = true;
    src.playbackRate.value = rate;
    src.connect(to);
    src.start(at(t), randAt(t, 1) * 3);
    src.stop(at(t + dur));
    return src;
  };
  /** Attack / hold / exponential release envelope on a gain param. */
  const envelope = (param, t, { a = 0.005, peak = 1, hold = 0, r = 0.2, floor = 0.0001 }) => {
    param.setValueAtTime(floor, at(t));
    param.linearRampToValueAtTime(peak, at(t + a));
    param.setValueAtTime(peak, at(t + a + hold));
    param.exponentialRampToValueAtTime(floor, at(t + a + hold + r));
  };

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

  // The music is ducked under the narration (voiceDuck) and by the kick (duck).
  const voiceDuck = gainNode(1, master);
  const duck = gainNode(1, voiceDuck);
  const music = gainNode(0.6, duck);
  const sfxDuck = gainNode(1, master);
  const sfx = gainNode(0.9, sfxDuck);
  const first = Math.floor(t0 * 100);
  const span = (curve) => curve.slice(first, Math.max(first + 2, Math.ceil(t1 * 100) + 1));
  voiceDuck.gain.setValueCurveAtTime(span(MUSIC_DUCK), 0, span(MUSIC_DUCK).length / 100);
  sfxDuck.gain.setValueCurveAtTime(span(SFX_DUCK), 0, span(SFX_DUCK).length / 100);

  // The narration skips the tilt EQ and the bus compressor (ElevenLabs output is already
  // levelled); the final limiter handles the true-peak ceiling.
  const voice = gainNode(
    STEM === 'music' ? 0 : voiceLevel,
    filter('highpass', 70, 0.7, ctx.destination),
  );
  for (const { start, pcm } of LINES) {
    const end = start + pcm.length / SR;
    if (end <= t0 || start >= t1) continue;
    const buf = ctx.createBuffer(1, pcm.length, SR);
    buf.copyToChannel(pcm, 0);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(voice);
    // A line already under way when the window starts plays from the right point.
    src.start(Math.max(0, at(start)), Math.max(0, t0 - start));
  }

  const reverb = ctx.createConvolver();
  const ir = ctx.createBuffer(2, IR_DATA[0].length, SR);
  IR_DATA.forEach((d, c) => ir.copyToChannel(d, c));
  reverb.buffer = ir;
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

  // --- Instruments ---------------------------------------------------------------------------

  const pad = (t, dur, notes, level) => {
    if (!live(t)) return;
    const out = gainNode(0, music);
    out.connect(verbSend(0.5));
    envelope(out.gain, t, { a: 0.9, peak: level, hold: Math.max(0, dur - 0.9), r: 1.6 });
    const lp = filter('lowpass', 2200, 0.8, out);
    lp.frequency.setValueAtTime(1600, at(t));
    lp.frequency.linearRampToValueAtTime(3200, at(t + dur));
    // Shimmer: the top of the chord an octave up, high-passed, for air.
    const air = filter('highpass', 1800, 0.7, gainNode(0.35, out));
    for (const n of notes.slice(-2)) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = midi(n + 12);
      o.connect(air);
      o.start(at(t));
      o.stop(at(t + dur + 1.8));
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
        o.start(at(t));
        o.stop(at(t + dur + 1.8));
      }
    }
  };

  const bassNote = (t, n, len, level) => {
    if (!live(t)) return;
    const g = gainNode(0, music);
    envelope(g.gain, t, { a: 0.006, peak: level, hold: len * 0.4, r: len * 0.7 });
    const lp = filter('lowpass', 420, 4, g);
    lp.frequency.setValueAtTime(1400, at(t));
    lp.frequency.exponentialRampToValueAtTime(260, at(t + len));
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = midi(n);
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = midi(n - 12);
    o.connect(lp);
    sub.connect(gainNode(0.55, g));
    o.start(at(t));
    sub.start(at(t));
    o.stop(at(t + len + 0.2));
    sub.stop(at(t + len + 0.2));
  };

  const pluck = (t, n, level) => {
    if (!live(t)) return;
    const g = gainNode(0, music);
    g.connect(delay);
    g.connect(verbSend(0.2));
    envelope(g.gain, t, { a: 0.003, peak: level, r: 0.22 });
    const lp = filter('lowpass', 4200, 2, g);
    lp.frequency.setValueAtTime(7000, at(t));
    lp.frequency.exponentialRampToValueAtTime(1600, at(t + 0.2));
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = midi(n);
    const pan = ctx.createStereoPanner();
    pan.pan.value = (randAt(t, 2) - 0.5) * 0.8;
    o.connect(pan).connect(lp);
    o.start(at(t));
    o.stop(at(t + 0.35));
  };

  const kick = (t, level = 1) => {
    if (!live(t)) return;
    const g = gainNode(0, sfx);
    envelope(g.gain, t, { a: 0.002, peak: 0.78 * level, r: 0.4 });
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, at(t));
    o.frequency.exponentialRampToValueAtTime(46, at(t + 0.11));
    o.connect(g);
    o.start(at(t));
    o.stop(at(t + 0.5));
    const click = gainNode(0, sfx);
    envelope(click.gain, t, { a: 0.001, peak: 0.3 * level, r: 0.018 });
    noiseSource(t, 0.04, filter('highpass', 3000, 0.7, click));
    // Side-chain the music bus so the kick breathes.
    duck.gain.setValueAtTime(1, at(t));
    duck.gain.linearRampToValueAtTime(0.5, at(t + 0.012));
    duck.gain.linearRampToValueAtTime(1, at(t + 0.26));
  };

  const hat = (t, level = 1, open = false) => {
    if (!live(t)) return;
    const g = gainNode(0, sfx);
    envelope(g.gain, t, { a: 0.001, peak: 0.2 * level, r: open ? 0.24 : 0.05 });
    const pan = ctx.createStereoPanner();
    pan.pan.value = 0.25;
    pan.connect(g);
    noiseSource(t, open ? 0.3 : 0.08, filter('highpass', 6500, 0.8, pan));
  };

  const clap = (t, level = 1) => {
    if (!live(t)) return;
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

  const impact = (t, size = 1) => {
    if (!live(t)) return;
    const g = gainNode(0, sfx);
    g.connect(verbSend(0.4 * size));
    envelope(g.gain, t, { a: 0.003, peak: 0.95 * size, r: 1.5 * size });
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(78, at(t));
    o.frequency.exponentialRampToValueAtTime(30, at(t + 0.9 * size));
    o.connect(g);
    o.start(at(t));
    o.stop(at(t + 2 * size));
    const n = gainNode(0, sfx);
    n.connect(verbSend(0.5));
    envelope(n.gain, t, { a: 0.002, peak: 0.35 * size, r: 0.7 * size });
    const lp = filter('lowpass', 2400, 0.7, n);
    lp.frequency.setValueAtTime(5000, at(t));
    lp.frequency.exponentialRampToValueAtTime(300, at(t + 0.6));
    noiseSource(t, 1.2 * size, lp);
  };

  const crash = (t, level = 1) => {
    if (!live(t)) return;
    const g = gainNode(0, sfx);
    g.connect(verbSend(0.3));
    envelope(g.gain, t, { a: 0.002, peak: 0.16 * level, r: 2.4 });
    const pan = ctx.createStereoPanner();
    pan.pan.value = -0.2;
    pan.connect(g);
    noiseSource(t, 3, filter('highpass', 5200, 0.6, pan), 0.9);
  };

  const riser = (s, e, level = 1) => {
    if (!live(s)) return;
    const dur = e - s;
    const g = gainNode(0, sfx);
    g.gain.setValueAtTime(0.0001, at(s));
    g.gain.exponentialRampToValueAtTime(0.28 * level, at(e - 0.02));
    g.gain.linearRampToValueAtTime(0, at(e));
    const bp = filter('bandpass', 400, 2.2, g);
    bp.frequency.setValueAtTime(350, at(s));
    bp.frequency.exponentialRampToValueAtTime(7500, at(e));
    noiseSource(s, dur, bp);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(180, at(s));
    o.frequency.exponentialRampToValueAtTime(880, at(e));
    const og = gainNode(0, sfx);
    og.gain.setValueAtTime(0.0001, at(s));
    og.gain.exponentialRampToValueAtTime(0.06 * level, at(e - 0.02));
    og.gain.linearRampToValueAtTime(0, at(e));
    o.connect(og);
    o.start(at(s));
    o.stop(at(e));
  };

  const whoosh = (peak, level = 1, dur = 0.7) => {
    const s = peak - dur * 0.6;
    if (!live(s)) return;
    const g = gainNode(0, sfx);
    g.gain.setValueAtTime(0.0001, at(s));
    g.gain.exponentialRampToValueAtTime(0.3 * level, at(peak));
    g.gain.exponentialRampToValueAtTime(0.0001, at(peak + dur * 0.4));
    const pan = ctx.createStereoPanner();
    pan.pan.setValueAtTime(-0.7, at(s));
    pan.pan.linearRampToValueAtTime(0.7, at(peak + dur * 0.4));
    pan.connect(g);
    const bp = filter('bandpass', 500, 1.4, pan);
    bp.frequency.setValueAtTime(300, at(s));
    bp.frequency.exponentialRampToValueAtTime(2600, at(peak));
    bp.frequency.exponentialRampToValueAtTime(600, at(peak + dur * 0.4));
    noiseSource(s, dur + 0.1, bp);
  };

  /** Bell tones: inharmonic partials with fast-decaying highs, like an item upgrade chime. */
  const bell = (t, n, level = 1, decay = 1.8) => {
    if (!live(t)) return;
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
      o.start(at(t));
      o.stop(at(t + decay + 0.1));
    }
  };

  const tick = (t, level = 1, freq = 3200) => {
    if (!live(t)) return;
    const g = gainNode(0, sfx);
    envelope(g.gain, t, { a: 0.0008, peak: 0.12 * level, r: 0.018 });
    noiseSource(t, 0.03, filter('bandpass', freq, 1.5, g));
  };

  const uiClick = (t) => {
    if (!live(t)) return;
    tick(t, 1.6, 2400);
    const g = gainNode(0, sfx);
    envelope(g.gain, t, { a: 0.001, peak: 0.12, r: 0.05 });
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(1500, at(t));
    o.frequency.exponentialRampToValueAtTime(700, at(t + 0.05));
    o.connect(g);
    o.start(at(t));
    o.stop(at(t + 0.08));
  };

  // --- Music -----------------------------------------------------------------------------------

  // Drone under the hook.
  if (live(0)) {
    const g = gainNode(0, music);
    g.gain.setValueAtTime(0.0001, at(0));
    g.gain.linearRampToValueAtTime(0.22, at(1.4));
    g.gain.setValueAtTime(0.22, at(padStart));
    g.gain.linearRampToValueAtTime(0.0001, at(padStart + 2.5));
    const lp = filter('lowpass', 240, 1.2, g);
    lp.frequency.setValueAtTime(180, at(0));
    lp.frequency.linearRampToValueAtTime(520, at(padStart));
    for (const [n, type] of [
      [38, 'sawtooth'],
      [45, 'sawtooth'],
      [50, 'triangle'],
    ]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = midi(n);
      o.connect(lp);
      o.start(at(0));
      o.stop(at(padStart + 3));
    }
  }

  // Pads, bass and arpeggio, bar by bar.
  // Bars are counted from the pad's entry so chord changes land on the scene cuts.
  const barStart = (bar) => padStart + bar * BAR;
  for (let bar = 0; barStart(bar) < ctaHit - 0.05; bar++) {
    const b0 = barStart(bar);
    const b1 = Math.min(barStart(bar + 1), ctaHit);
    const chord = CHORDS[chordAtBar(bar)];
    const inCalm = b0 >= calm - 0.01;
    pad(b0, b1 - b0, chord.notes, inCalm ? 0.05 : 0.06);

    // Pulsing eighth-note bass from the drop.
    for (let i = 0; i < 8; i++) {
      const t = b0 + i * (BEAT / 2);
      if (t < drop - 0.01 || t >= ctaHit - 0.02) continue;
      const accent = i % 2 === 0 ? 1 : 0.7;
      bassNote(t, chord.bass + 12, BEAT / 2, (inCalm ? 0.1 : 0.13) * accent);
    }

    // Sixteenth-note arpeggio while the analysis is on screen.
    const tones = [...chord.notes.map((n) => n + 12), chord.notes[1] + 24];
    for (let i = 0; i < 16; i++) {
      const t = b0 + i * (BEAT / 4);
      if (t < lift - 0.01 || t >= calm - 0.01) continue;
      const n = tones[[0, 2, 1, 3, 4, 3, 1, 2][i % 8]];
      pluck(t, n, (t >= full ? 0.05 : 0.04) * settle(t));
    }
  }

  // End chord: resolve to D major and let it ring out.
  pad(ctaHit, DURATION - ctaHit - 1.2, CHORDS.D.notes, 0.075);
  bassNote(ctaHit, 38, 3.5, 0.2);

  // Drums sit on the pad's bar grid, from the build section until the outro.
  for (let beatIndex = 0; padStart + beatIndex * BEAT < calm - 0.01; beatIndex++) {
    const t = padStart + beatIndex * BEAT;
    if (t < lift - 0.01 || inBreak(t)) continue;
    const big = t >= full;
    kick(t, (big ? 0.9 : 0.55) * settle(t));
    hat(t + BEAT / 2, (big ? 0.9 : 0.6) * settle(t), big && beatIndex % 4 === 3);
    if (big && beatIndex % 2 === 1) clap(t, 0.8 * settle(t));
    if (big) {
      hat(t + BEAT / 4, 0.4);
      hat(t + (BEAT * 3) / 4, 0.4);
    }
  }

  // --- Sound design -----------------------------------------------------------------------------

  // Open: a heartbeat under the drone, then the first spark.
  for (let t = 0.05; t < padStart - 0.1; t += BEAT) kick(t, 0.28);
  bell(0.5, 74, 0.55, 2.4);
  bell(0.58, 81, 0.3, 2.0);

  // Keystrokes in the address bar.
  C.keys.forEach((t, k) => tick(t, 0.5, 3000 + (k % 5) * 180));
  // Gear names landing on set chips, then skill-bar entries landing on icons.
  C.landings.forEach((t, i) => tick(t, 0.45, 1900 + (i % 13) * 60));
  // Highlights as things are named: Insights panels, table columns, scribing rows and the later
  // chapters.
  [C.focus, C.signature, C.affix, ...C.clicks].forEach((t) => uiClick(t));

  // Transitions and reveals.
  C.whooshes.forEach((t) => whoosh(t, 0.5, 0.8));
  C.hits.forEach(({ t, size }, i) => {
    const big = size >= 1.1;
    if (big) {
      riser(t - 1.6, t, 0.75);
      impact(t, size * 0.85);
      crash(t, 0.8);
    }
    CHIMES[i % CHIMES.length].forEach((n, j) =>
      bell(t + 0.02 + j * 0.07, n, big ? 0.9 : 0.5, big ? 2.4 : 1.4),
    );
  });
  // Chapter titles: a swell into the card, a chord as it lands in the rail.
  C.chapters.forEach((t, i) => {
    riser(t - 0.9, t + 0.1, 0.45);
    whoosh(t + 1.15, 0.45, 0.6);
    CHIMES[(i + 2) % CHIMES.length].forEach((n, j) => bell(t + 1.35 + j * 0.06, n, 0.55, 1.6));
  });
}

// ---------------------------------------------------------------------------------------------
// Render the windows in parallel and join them.

const total = Math.ceil(DURATION * SR);
const L = new Float32Array(total);
const R = new Float32Array(total);
const windows = [];
for (let w0 = 0; w0 < DURATION; w0 += WINDOW) {
  const w1 = Math.min(DURATION, w0 + WINDOW);
  const t0 = Math.max(0, w0 - LEAD_IN);
  const t1 = w1 + XFADE;
  const ctx = new OfflineAudioContext({
    numberOfChannels: 2,
    length: Math.ceil((t1 - t0) * SR),
    sampleRate: SR,
  });
  build(ctx, t0, t1);
  windows.push({ w0, w1, t0, ctx });
}
const rendered = await Promise.all(windows.map((w) => w.ctx.startRendering()));
const fadeLen = Math.round(XFADE * SR);
windows.forEach(({ w0, w1, t0 }, k) => {
  const src = [rendered[k].getChannelData(0), rendered[k].getChannelData(1)];
  const from = Math.round(w0 * SR);
  const to = Math.min(total, Math.round(w1 * SR) + (k < windows.length - 1 ? fadeLen : 0));
  const offset = Math.round(t0 * SR);
  for (let i = from; i < to; i++) {
    // Fade in over the previous window's overlap, and out over the next one's.
    let g = 1;
    if (k > 0 && i < from + fadeLen) g = (i - from) / fadeLen;
    if (k < windows.length - 1 && i >= Math.round(w1 * SR))
      g = 1 - (i - Math.round(w1 * SR)) / fadeLen;
    L[i] += src[0][i - offset] * g;
    R[i] += src[1][i - offset] * g;
  }
});

// ---------------------------------------------------------------------------------------------
// Loudness-normalize to -14 LUFS with ffmpeg (two-pass, linear). The -3 dBFS limiter ceiling and
// the encoders' 18 kHz cutoff keep the AAC true peak under -1.5 dBTP.

let peak = 0;
for (let i = 0; i < L.length; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const scale = STEM ? 1 : 10 ** (-3 / 20) / peak;
const fadeOut = Math.floor(1.2 * SR);
const frames = L.length;
const wav = Buffer.alloc(44 + frames * 8);
wav.write('RIFF', 0);
wav.writeUInt32LE(36 + frames * 8, 4);
wav.write('WAVE', 8);
wav.write('fmt ', 12);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(3, 20); // IEEE float
wav.writeUInt16LE(2, 22);
wav.writeUInt32LE(SR, 24);
wav.writeUInt32LE(SR * 8, 28);
wav.writeUInt16LE(8, 32);
wav.writeUInt16LE(32, 34);
wav.write('data', 36);
wav.writeUInt32LE(frames * 8, 40);
for (let i = 0; i < frames; i++) {
  const fade = i > frames - fadeOut ? (frames - i) / fadeOut : 1;
  wav.writeFloatLE(L[i] * scale * fade, 44 + i * 8);
  wav.writeFloatLE(R[i] * scale * fade, 48 + i * 8);
}
const outDir = path.join(ROOT, 'out');
mkdirSync(outDir, { recursive: true });
const raw = path.join(outDir, STEM ? `stem-${STEM}.wav` : 'soundtrack.raw.wav');
writeFileSync(raw, wav);
if (STEM) {
  console.log(`wrote ${path.relative(ROOT, raw)} (unnormalized)`);
  process.exit(0);
}

/** Integrated loudness (LUFS) of an audio file. */
const loudness = (file) => {
  const out = spawnSync(
    ffmpegPath,
    ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128', '-f', 'null', '-'],
    { encoding: 'utf8' },
  ).stderr;
  return Number(
    out
      .match(/I:\s+(-?[\d.]+) LUFS/g)
      .at(-1)
      .match(/-?[\d.]+/)[0],
  );
};
const finalWav = path.join(outDir, 'soundtrack.wav');
const masterTo = (gainDb) =>
  execFileSync(ffmpegPath, [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-i',
    raw,
    '-af',
    `volume=${gainDb.toFixed(2)}dB,alimiter=limit=0.71:attack=2:release=60:level=disabled`,
    '-ar',
    String(SR),
    '-c:a',
    'pcm_s16le',
    finalWav,
  ]);
// Measure integrated loudness, apply one static gain to -14 LUFS, and catch the few transients
// above the ceiling with a fast limiter (no dynamic loudness riding). The limiter shaves some
// loudness off (more as the gain rises), so the gain is corrected until it lands within 0.15 dB.
const mixLufs = loudness(raw);
let gainDb = -14 - mixLufs;
masterTo(gainDb);
for (let pass = 0, lufs = loudness(finalWav); pass < 3 && Math.abs(-14 - lufs) > 0.15; pass++) {
  gainDb += -14 - lufs;
  masterTo(gainDb);
  lufs = loudness(finalWav);
}
console.log(
  `soundtrack.wav: ${DURATION.toFixed(2)}s, narration ${narrationLufs} LUFS levelled to -22, mix ${mixLufs} LUFS + ${gainDb.toFixed(1)} dB -> ${loudness(finalWav)} LUFS`,
);
