# ESO Toolkit promo video

A 71-second narrated explainer for esotk.com. It walks through the same fight in ESO Logs and in
ESO Toolkit and shows what ESO Toolkit adds. It is rendered in two masters from the same code:
1920×1080 for the site and YouTube, and 1080×1920 for Shorts, Reels and TikTok, both at 60 fps
with burned-in, word-synced captions.

## Story

Every beat is cued from the narration's word timestamps, so each panel moves on the word that
describes it.

| Narration                                        | Picture                                                                                  |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| "Every pull you log is full of answers."         | A particle stream of combat events.                                                      |
| "ESO Logs records all of it…"                    | The stream forms ESO Logs' damage page. Its tabs light on "hit", "heal" and "buff".      |
| "ESO Toolkit reads that same log…"               | The page dissolves into particles that re-form as ESO Toolkit's Insights for that fight. |
| "Just paste the link."                           | The link's domain scrambles from esologs.com to esotk.com. The report code stays put.    |
| "…thirteen items, one per row…"                  | ESO Logs' gear rows for one tank light up one by one.                                    |
| "…groups them into sets, lays out both bars…"    | The rows fly into ESO Toolkit's three set chips; the skill-bar entries become icons.     |
| "…checks the build for common mistakes."         | The full player card assembles; the build check lights green.                            |
| "That scribed skill?…"                           | Leashing Soul opens into ESO Toolkit's detected grimoire, focus, signature and affix.    |
| "ESO Logs replays a fight from above…"           | ESO Logs' 2D replay tips back like a floor and dissolves into ESO Toolkit's 3D replay.   |
| "Then send any build to the editor…"             | The extracted build in the Build Editor, then the Calculators.                           |
| "ESO Logs records the fight. ESO Toolkit helps…" | Both side by side, then everything collapses into the ESO Toolkit mark.                  |

## How it is made

- **Footage:** real stills and clips of esotk.com and esologs.com, all from the same report
  (Tideborn Taleria, veteran hard mode) and the same Saint Olms replay. The capture scripts also
  record where each gear row, set chip, skill icon and tooltip row sits, so panels can move
  between the two sites element by element.
- **Renderer:** hand-written WebGL2 in `engine/`, with no video framework. It places the
  screenshots on 3D cards, runs pixel-particle morphs that carry each image's real colours from
  one card to the next, and draws the particle field for the open and the end card. HDR bloom,
  a neutral tone map and grain follow. Captions and labels are drawn with Canvas2D.
- **Narration:** ElevenLabs Eleven v4, voice "Brian", one request per line with the
  neighbouring lines as context. The audio and word timings are committed in
  `assets/narration/`, so rendering does not need an API key.
- **Soundtrack:** a synthesized music bed and sound design (Web Audio, rendered offline). It is
  ducked about 14 dB under the voice and mastered to -14 LUFS, -1.5 dBTP.

## Workflow

Requires Node 24 and Google Chrome with GPU acceleration.

```bash
npm ci

# 1. Footage. esologs.com shows a human check, which the scripts do not bypass: open a browser
#    with remote debugging, pass the check by hand, then capture through that session.
brave.exe --user-data-dir=out/brave-profile --remote-debugging-port=9334 https://www.esologs.com
npm run capture:esologs
npm run capture:esotk

# 2. Narration (only when the script in narration.json changes).
ELEVENLABS_API_KEY=... npm run narration

# 3. Soundtrack, then the two masters.
npm run soundtrack
npm run render:landscape
npm run render:vertical

# Review single frames: out/stills/
npm run stills -- 1476,2718
node scripts/render.mjs --portrait --stills 1476
```

Captures, the soundtrack and renders are written to the gitignored `out/` folder. To retime the
cut, change the line start times in `timeline.json`; picture, captions and audio all follow.

## Structure

| Path                          | Purpose                                                                    |
| ----------------------------- | -------------------------------------------------------------------------- |
| `narration.json`              | Voice, model, settings and the script, one entry per line.                 |
| `timeline.json`               | When each narration line starts, and the total length.                     |
| `engine/director.js`          | Every beat: cards, morphs, callouts and captions, cued from the narration. |
| `engine/stage.js`             | 3D screenshot cards and the pixel-particle morph.                          |
| `engine/main.js`              | Frame renderer and post-processing.                                        |
| `engine/formations.js`        | Particle layouts for the open and the end card.                            |
| `engine/overlay.js`           | Captions, labels, callouts, the link pill and the end card type.           |
| `scripts/capture-esologs.mjs` | ESO Logs stills, layout data and the replay clip (manual human check).     |
| `scripts/capture-esotk.mjs`   | ESO Toolkit stills, layout data and the 3D replay clip.                    |
| `scripts/voiceover.mjs`       | ElevenLabs narration with word timestamps.                                 |
| `scripts/soundtrack.mjs`      | Music, sound design, narration mix and mastering.                          |
| `scripts/render.mjs`          | Frame-accurate capture in headless Chrome, encoded with ffmpeg.            |

## Content rules

- The narration only says what ESO Toolkit adds to an ESO Logs report. It never says what ESO
  Logs lacks, and it credits ESO Logs for recording the fight.
- ESO Logs is shown only in unedited captures of its own pages, labelled as ESO Logs. Its logo
  is not used.
- The end card carries the independent-fan-project disclaimer.
- The build check lists exactly what ESO Toolkit checks: enchant quality, gear quality, CP 160
  gear and key buffs.
- The replay boss is Saint Olms the Just, whose model is a screenshot-based reconstruction. Do not
  feature the models that `replayActorModelRegistry.ts` marks as extracted game assets.
- Tools that show an "Under Active Development" banner stay out of the video.
