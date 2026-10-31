// Generates the narration with ElevenLabs, one request per line, and records word timings.
//
//   ELEVENLABS_API_KEY=... node scripts/voiceover.mjs          # every line
//   ELEVENLABS_API_KEY=... node scripts/voiceover.mjs gear     # one line
//
// Each line is sent with its neighbours as previous/next text so the delivery flows as one read.
// Output goes to assets/narration/: <id>.mp3 plus words.json (per-word start/end seconds,
// caption text, and when each line's last word ends). The audio is committed so rendering does
// not need the API key.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'assets', 'narration');
const script = JSON.parse(await readFile(path.join(ROOT, 'narration.json'), 'utf8'));
const key = process.env.ELEVENLABS_API_KEY;
if (!key) throw new Error('Set ELEVENLABS_API_KEY');

await mkdir(OUT, { recursive: true });
const only = process.argv[2];
const wordsPath = path.join(OUT, 'words.json');
let words = {};
try {
  words = JSON.parse(await readFile(wordsPath, 'utf8'));
} catch {
  // First run.
}

/** Groups character alignment into words (split on whitespace). */
function toWords(alignment) {
  const {
    characters,
    character_start_times_seconds: starts,
    character_end_times_seconds: ends,
  } = alignment;
  const out = [];
  let cur = null;
  characters.forEach((ch, i) => {
    if (/\s/.test(ch)) {
      if (cur) out.push(cur);
      cur = null;
      return;
    }
    if (!cur) cur = { say: '', start: starts[i], end: ends[i] };
    cur.say += ch;
    cur.end = ends[i];
  });
  if (cur) out.push(cur);
  return out.map((w) => {
    const bare = w.say.replace(/^[^\w-]+|[^\w-]+$/g, '');
    const mapped = script.captions[w.say] ?? script.captions[bare];
    const text = mapped === undefined ? w.say.replace(/E-S-O/g, 'ESO') : mapped;
    return { ...w, text };
  });
}

const lines = script.lines;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (only && line.id !== only) continue;
  console.log(`${line.id}: ${line.say}`);
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${script.voice.id}/with-timestamps?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: line.say,
        model_id: script.model,
        voice_settings: script.settings,
        previous_text: lines[i - 1]?.say,
        next_text: lines[i + 1]?.say,
        seed: 7,
      }),
    },
  );
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const body = await res.json();
  const mp3 = path.join(OUT, `${line.id}.mp3`);
  await writeFile(mp3, Buffer.from(body.audio_base64, 'base64'));
  const w = toWords(body.alignment);
  // When the last word ends (the mp3 carries a little trailing silence after it).
  const duration = w.at(-1).end;
  words[line.id] = { duration, words: w };
  console.log(`  ${w.length} words, ${duration.toFixed(2)}s`);
}

await writeFile(wordsPath, `${JSON.stringify(words, null, 2)}\n`);
