# ESO Toolkit promo video

Source for the 55-second esotk.com promo that compares ESO Toolkit with ESO Logs. It renders two
masters from the same timeline: 1920×1080 for the site and YouTube, and 1080×1920 for Shorts,
Reels and TikTok. Both run at 60 fps.

The video is built with [Remotion](https://www.remotion.dev). Product footage is captured from
the live site, and the soundtrack is synthesized locally, so no stock media or music licences are
involved.

## Concept

The comparison is framed as an Elder Scrolls Online item upgrade. "Your ESO Logs report" appears
as an in-game tooltip at Fine quality. Each ESO Toolkit feature raises it one quality tier and
lights one line of an "ESO Toolkit set" bonus:

1. Superior: fight insights.
2. Epic: the 3D fight replay.
3. Legendary: build and scribing detection, the Build Editor and the calculators.

The summary mirrors ESO's own Equipped-versus-new tooltip comparison.

## Workflow

Requires Node 24 and Google Chrome. A GPU is recommended for the replay capture and for rendering.

```bash
npm ci
npm run capture       # esotk.com stills (2x) and the 3D replay clip -> public/captures/
npm run soundtrack    # synthesizes public/audio/soundtrack.wav from src/timeline.json
npm run studio        # preview and scrub in Remotion Studio
npm run render        # out/esotk-vs-esologs-16x9.mp4 and out/esotk-vs-esologs-9x16.mp4
```

Captures and the soundtrack are generated files and are not committed. `npm run capture` reads
the live site, so check the crop keyframes in `src/shots.tsx` after the UI changes. To capture
a single shot, pass part of its id, for example `npm run capture -- replay`.

`scripts/contact-sheet.mjs` lays a folder of stills or rendered frames out on one sheet for quick
review.

## Structure

| Path                     | Purpose                                                                     |
| ------------------------ | --------------------------------------------------------------------------- |
| `src/timeline.json`      | Scene boundaries and cue frames. The video and the soundtrack both read it. |
| `src/Promo.tsx`          | Assembles the scenes, the persistent footage frame and the tooltip.         |
| `src/shots.tsx`          | Footage shots: source, crop keyframes, callouts and the typing overlay.     |
| `src/layout.ts`          | Geometry for the 16:9 and 9:16 stages.                                      |
| `src/components/`        | Tooltip, footage frame, kinetic type, upgrade burst, background, grain.     |
| `src/scenes/`            | The opening hook and the end card.                                          |
| `scripts/capture.mjs`    | Playwright capture of esotk.com.                                            |
| `scripts/soundtrack.mjs` | Offline Web Audio synthesis of the music bed and sound design.              |

To retime the video, change the frames in `src/timeline.json`, then run `npm run soundtrack` so
the audio stays in sync.

## Content rules

- Every on-screen claim has been checked against the codebase and the live site. The copy says
  what ESO Toolkit adds to an ESO Logs report, never what ESO Logs lacks.
- ESO Logs is only named in text. Its logo and UI are not shown.
- The end card carries the independent-fan-project disclaimer.
- The replay shows Saint Olms the Just, whose model is a screenshot-based reconstruction. Do not
  feature the models that `replayActorModelRegistry.ts` marks as extracted game assets.
- Tools that show an "Under Active Development" banner stay out of the video.

## Licensing

Remotion is free for individuals and for companies with up to three people. Larger teams need a
[company licence](https://www.remotion.pro/license).
