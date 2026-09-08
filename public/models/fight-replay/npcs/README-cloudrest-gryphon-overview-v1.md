# Cloudrest Welkynar gryphon overview replay prototype (v1)

## THIS IS NOT A RECONSTRUCTION — READ FIRST

Every other NPC asset in this directory is a fan reconstruction built from published screenshots.
**This one is not.** Both the geometry and the colour texture are **assets extracted verbatim from
the Elder Scrolls Online game client**. Nothing here was modelled, inferred, or painted by this
project; the only changes are a uniform scale, a recentre, and a container re-export.

- Source blob: `public/models/bosses/Gryphon_A_Boss.glb` on the unmerged branch
  `feat/trial-boss-textures` (read with `git show`, never checked out or merged).
- That branch's GLBs came from this project's own `mnf -> gr2 -> glTF` client extractor.
- The embedded 1024x1024 JPEG is ESO's own hand-authored atlas for this creature, carried on the
  game's own `TEXCOORD_0`. It was passed through byte-for-byte (469,250 bytes in, 469,250 bytes
  out) — not re-encoded, not repacked, not reprojected.

**Redistribution has not been cleared.** The registry entry is filed under
`designation: 'project-authorized-fan-prototype'` only because that is the sole value the
`StaticReplayActorModelAsset` type admits. Do not read that designation as a rights determination
for this asset. The rights position is uncleared: this is ESO's own mesh and texture
shipped verbatim, and it must not be reused outside this project without a separate review.

## Build

- Actors: the three Welkynar gryphon mounts in Cloudrest — **Falarielle** (with Shade of Galenwe),
  **Silaeda** (Shade of Siroria) and **Belanaril** (Shade of Relequen). These are not `type: 'boss'`
  rows of their own; ESO Logs tracks each Welkynar-plus-gryphon pair as a single boss.
- Command:

  ```
  python tools/fight-replay-models/prepare-static-boss.py \
      Gryphon_A_Boss.glb public/models/fight-replay/npcs/cloudrest-gryphon-overview-v1.glb \
      --max-triangles 50000 --texture-size 1024 --normalize-height 2.0 --name cloudrest-gryphon
  ```

- No decimation ran: 37,104 triangles, inside the 20,000-50,000 boss budget. The geometry is the
  game's, triangle for triangle.
- Applied scale **x0.3738** (game height 5.35 -> 2.0). Source bounds 19.86 x 5.35 x 10.97 game
  units; the X extent is the spread wingspan.
- No orientation fix needed: already `+Y` up, `+Z` front, feet at `y = 0`, confirmed on a
  CPU-rasterised front/side preview.

## Measured

- 37,104 triangles / 27,650 vertices / **1,578,084 bytes** (gate: 2.5 MB).
- 1 mesh, 1 material, 1 primitive; attributes `POSITION`, `NORMAL`, `TEXCOORD_0` only.
- No skins, no animations, no morph targets, no glTF extensions.
- Bounds 7.4291 x 2.0 x 4.1027, minimum Y exactly 0.0, centred on X and Z.
- Texture 1024x1024 JPEG, 4:4:4 (not chroma subsampled).

## What the atlas actually looks like

Opened and inspected before shipping, not trusted on metadata. A genuine authored ESO creature
sheet: a large head chart with the hooked black-and-gold beak, brown eye and blue-white face
feathering; slate-blue breast and flank plumage; tan-gold scaled talons; two dark eye and pupil
discs; and the lower two thirds given over to long banded primary and secondary flight-feather
charts in blue-grey and gold. No tiling detail maps. The best-looking of the four extracted
atlases.

## Alias note — the one unverified part of this asset

The aliases `falarielle`, `silaeda` and `belanaril` are taken from the curated encounter notes in
`src/types/trial-encounters.ts`, **not** from an observed ESO Logs actor list. If ESO Logs names
them differently the lookup simply misses and the gryphons keep the capsule marker, which is a
silent and harmless failure. Confirm against a real Cloudrest report before treating this as
covered.

## Presentation

- Intended as a 32-64 px-tall replay actor; a colour/silhouette identity LOD.
- World height 2.49 units at the registry's `scale: 1.25`, matching the rest of the catalog. The
  spread wingspan then measures ~9.29 units, which is the game mesh's own 3.7:1
  wingspan-to-height ratio preserved rather than an error.
- Prepared: 2026-09-07.

The Elder Scrolls Online name, character design, and all related rights remain with their
respective owners, including ZeniMax Media / Bethesda Softworks.
