# ESO Toolkit promo video

A 40-second esotk.com promo that contrasts ESO Logs' numbers with what ESO Toolkit shows. It is
rendered in two masters from the same code: 1920×1080 for the site and YouTube, and 1080×1920
for Shorts, Reels and TikTok, both at 60 fps.

Every frame is generated from code. There are no screenshots, stock footage, samples or video
templates:

- **Particles.** About 72,000 of them stand in for the combat log's events. They morph between
  formations: a stream of events, a damage table, an arena with players and a boss, uptime
  arcs, a skill bar, a penetration gauge and finally the ESO Toolkit mark.
- **Renderer.** Hand-written WebGL2 in `engine/`. It draws the particles into a 2× supersampled
  HDR buffer with depth of field and 4-sample motion blur, then applies bloom, ACES tone mapping,
  chromatic aberration, vignette and grain.
- **Typography and interface.** Drawn with Canvas2D, in Space Grotesk and Inter.
- **Soundtrack.** The music bed and sound design are synthesized offline with the Web Audio API,
  timed from the same `timeline.json` as the picture.

## Story

| Time      | Beat                                                                    |
| --------- | ----------------------------------------------------------------------- |
| 0–4 s     | A spark becomes a stream: every pull logs thousands of events.          |
| 4–8 s     | The events settle into a damage table: ESO Logs gives you the numbers.  |
| 8–14 s    | The table tips back into a 3D arena: ESO Toolkit shows you the fight.   |
| 14–20 s   | Buff and status uptimes orbit the boss as arcs.                         |
| 20–26.5 s | A skill bar assembles; the build and a detected scribed skill read out. |
| 26.5–32 s | A penetration gauge fills against the PvE cap.                          |
| 32–40 s   | The particles resolve into the ESO Toolkit mark; esotk.com.             |

## Workflow

Requires Node 24 and Google Chrome with GPU acceleration.

```bash
npm ci
npm run soundtrack             # out/soundtrack.wav
npm run render:landscape       # out/esotk-vs-esologs-16x9.mp4
npm run render:vertical        # out/esotk-vs-esologs-9x16.mp4
npm run stills -- 600,1440     # JPEG stills of specific frames in out/stills/
node scripts/render.mjs --range 480,720   # a silent excerpt for quick review
```

To preview a single frame in a browser, serve this folder over HTTP and open
`engine/index.html?t=<seconds>`. Add `&w=1080&h=1920` for the vertical layout.

`scripts/render.mjs` serves the folder, drives headless Chrome frame by frame and pipes the raw
pixels into the ffmpeg binary bundled by `ffmpeg-static`. Nothing depends on wall-clock time, so
every render is identical.

## Structure

| Path                     | Purpose                                                     |
| ------------------------ | ----------------------------------------------------------- |
| `timeline.json`          | Scene boundaries and audio cues, in seconds.                |
| `engine/director.js`     | Morph schedule, camera path, players, overlay choreography. |
| `engine/formations.js`   | The particle layouts, sampled deterministically.            |
| `engine/shaders.js`      | Particle, nebula, bloom and grading shaders.                |
| `engine/overlay.js`      | Kinetic type, labels, chips, panels and the logo.           |
| `engine/data.js`         | Every number shown on screen, with its source.              |
| `scripts/render.mjs`     | Frame-accurate capture and encoding.                        |
| `scripts/soundtrack.mjs` | Offline synthesis of the music bed and sound design.        |

## Content rules

- The numbers in `engine/data.js` come from the public sample report
  (esotk.com/report/F4f2bMwWtgVKxjB9, Tideborn Taleria veteran hard mode kill) and the
  Calculator's defaults. Update the source note if you change them.
- The copy says what ESO Toolkit adds to an ESO Logs report, never what ESO Logs lacks. ESO Logs
  appears in text only, with no logo or interface.
- The end card carries the independent-fan-project disclaimer.
- Tools that show an "Under Active Development" banner stay out of the video.
