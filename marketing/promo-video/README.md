# ESO Toolkit promo video

A two-minute narrated explainer for esotk.com in four chapters: reading a log (the same fight in
ESO Logs and in ESO Toolkit), planning a build, running a trial, and managing addons with Kalpa.
It is rendered in two masters from the same code: 1920×1080 for the site and YouTube, and
1080×1920 for Shorts, Reels and TikTok, both at 60 fps with burned-in, word-synced captions.

## Story

Every beat is cued from the narration's word timestamps, so each panel moves on the word that
describes it. A glass rail across the top names the chapters (Read the log, Plan your build, Run
the trial, Your addons); each new chapter opens with a title card that flies up into the rail.

| Narration                                                              | Picture                                                                                                                                                      |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| "Every pull you log is full of answers."                               | A particle stream of combat events.                                                                                                                          |
| "ESO Logs records all of it…"                                          | The stream forms ESO Logs' damage page, full frame. Focus pulls to its tabs on "hit", "heal" and "buff".                                                     |
| "ESO Toolkit reads that same log…"                                     | A lit divider wipes across the frame and reveals ESO Toolkit's Insights for that fight.                                                                      |
| "Just paste the link."                                                 | The page blurs behind a glass link pill. The domain scrambles from esologs.com to esotk.com; the report code stays put.                                      |
| "…thirteen items, one per row…"                                        | A zoom-through lands on ESO Logs' gear table, and a spotlight counts the rows.                                                                               |
| "…groups them into sets, lays out both bars…"                          | The rows lift off the page and fold into ESO Toolkit's three set chips; the skill-bar entries collapse onto their icons.                                     |
| "…checks the build for common mistakes."                               | An iris opens on the full player card and the build check lights green.                                                                                      |
| "That scribed skill?…"                                                 | The camera dives into the Leashing Soul icon and surfaces in its tooltip. Focus steps through the focus, signature and affix scripts.                        |
| "ESO Logs replays a fight from above…"                                 | A whip-pan to ESO Logs' 2D replay, which tips back like a floor and dissolves into ESO Toolkit's 3D replay.                                                  |
| "Found a build worth copying? Send it to the Build Editor…"            | The player card's "Extract build to editor" button, then the extracted build in the Build Editor.                                                            |
| "…The Build Leaderboard sorts top-ranked parses…"                      | The Build Leaderboard for Tideborn Taleria: build patterns, the recommended build, its defining setup, then the class and boss lists.                        |
| "Plan a scribed skill script by script…"                               | The scribing planner rebuilds Leashing Soul one script at a time, then the penetration calculator.                                                           |
| "Leading a trial? The Roster Builder plans the whole group…"           | A community roster in the Roster Builder: role counts, each tank's sets and ultimate, and the builder's warning about a set that does not suit the ultimate. |
| "…even builds for each fight."                                         | Per-fight builds: the Cloudrest encounter timeline, with Z'Maja selected.                                                                                    |
| "Share it as a link, publish it to Roster Hub, or post it to Discord…" | The shared read-only roster flies into its card on Roster Hub, then the Discord roster bot's guide.                                                          |
| "And for your addons, there's Kalpa…"                                  | The Kalpa page and its addon list, the dependency-resolution feature, then an addon pack on Pack Hub.                                                        |
| "ESO Logs records the fight. ESO Toolkit helps…"                       | ESO Logs fills the frame, then squeezes into a split screen as ESO Toolkit slides in. Everything collapses into the ESO Toolkit mark.                        |

## How it is made

- **Footage:** real stills and clips of esotk.com and esologs.com. The log chapter uses one
  report (Tideborn Taleria, veteran hard mode) and one Saint Olms replay; the Build Leaderboard
  shows the same boss, and the scribing planner rebuilds the same skill. The roster chapter uses
  a community roster from Roster Hub. The capture scripts also record where each row, chip, icon,
  card and button sits, so the camera, focus pulls and flights can target them.
- **Renderer:** hand-written WebGL2 in `engine/`, with no video framework. Every scene is a
  full-bleed camera move over real page captures (3× stills), cut together with focus pulls,
  whip-pans, zoom-throughs and a divider wipe. Captions and labels sit on glass that refracts
  the blurred frame behind it. Shared-element flights carry gear rows and skill entries from one
  site's layout to the other's, and pixel-particle morphs carry each image's real colours from
  one page to the next. HDR bloom, a neutral tone map and grain follow.
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
# 4K master of the same layout (3840x2160).
node scripts/render.mjs --scale 2

# Review single frames: out/stills/
npm run stills -- 1476,2718
node scripts/render.mjs --portrait --stills 1476
```

Captures, the soundtrack and renders are written to the gitignored `out/` folder. To retime the
cut, change the line start times in `timeline.json`; picture, captions and audio all follow.

## Structure

| Path                          | Purpose                                                                                       |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| `narration.json`              | Voice, model, settings and the script, one entry per line.                                    |
| `timeline.json`               | When each narration line starts, and the total length.                                        |
| `engine/director.js`          | Every beat: camera views, flights, morphs, focus pulls and captions, cued from the narration. |
| `engine/stage.js`             | Screenshot cards, shared-element flights and the pixel-particle morph.                        |
| `engine/main.js`              | Frame renderer: layers, blur, focus pulls, glass, bloom and tone map.                         |
| `engine/formations.js`        | Particle layouts for the open and the end card.                                               |
| `engine/overlay.js`           | Glass captions and tags, callouts, the link pill and the end card type.                       |
| `scripts/capture-esologs.mjs` | ESO Logs stills, layout data and the replay clip (manual human check).                        |
| `scripts/capture-esotk.mjs`   | ESO Toolkit stills (reports, builds, rosters, Kalpa), layout data and the 3D replay clip.     |
| `scripts/voiceover.mjs`       | ElevenLabs narration with word timestamps.                                                    |
| `scripts/soundtrack.mjs`      | Music, sound design, narration mix and mastering.                                             |
| `scripts/render.mjs`          | Frame-accurate capture in headless Chrome, encoded with ffmpeg.                               |

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
- Tools that show an "Under Active Development" banner stay out of the video, except the Roster
  Builder, which is filmed below its banner.
- The in-game ESOTK addon is not released yet, so the video does not mention importing rosters
  in game.
- The Kalpa window on esotk.com/kalpa is drawn by the page, not captured from the app, so it is
  presented as the Kalpa page.
