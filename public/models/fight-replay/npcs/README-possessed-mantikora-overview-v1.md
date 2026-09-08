# Possessed Mantikora overview replay prototype (v1)

## THIS IS NOT A RECONSTRUCTION — READ FIRST

Every other NPC asset in this directory is a fan reconstruction built from published screenshots.
**This one is not.** Both the geometry and the colour texture are **assets extracted verbatim from
the Elder Scrolls Online game client**. Nothing here was modelled, inferred, or painted by this
project; the only changes are a uniform scale, a recentre, and a container re-export.

- Source blob: `public/models/bosses/Mantikora_B_Boss.glb` on the unmerged branch
  `feat/trial-boss-textures` (read with `git show`, never checked out or merged).
- That branch's GLBs came from this project's own `mnf -> gr2 -> glTF` client extractor.
- The embedded 1024x1024 JPEG is ESO's own hand-authored character atlas for this creature,
  carried on the game's own `TEXCOORD_0`. It was passed through byte-for-byte (296,546 bytes in,
  296,546 bytes out) — not re-encoded, not repacked, not reprojected.

**Redistribution has not been cleared.** The registry entry is filed under
`designation: 'project-authorized-fan-prototype'` only because that is the sole value the
`StaticReplayActorModelAsset` type admits. Do not read that designation as a rights determination
for this asset. **The `?npcModels=prototype` opt-in was removed on 2026-09-08 at the repository
owner's instruction, and this asset now renders by default.** That opt-in never gated distribution —
the GLB has always been served publicly from the site — so what changed is visibility, not exposure.
The rights position is unchanged and uncleared: this is ESO's own mesh and texture shipped verbatim,
and it must not be reused outside this project without a separate review.

## Build

- Encounter: **Possessed Mantikora**, Sanctum Ophidia (`src/types/trial-encounters.ts`).
- Command:

  ```
  python tools/fight-replay-models/prepare-static-boss.py \
      Mantikora_B_Boss.glb public/models/fight-replay/npcs/possessed-mantikora-overview-v1.glb \
      --max-triangles 50000 --texture-size 1024 --normalize-height 2.0 --name possessed-mantikora
  ```

- No decimation ran: 9,072 triangles, well inside the 50,000 boss budget. The geometry is the
  game's, triangle for triangle.
- Applied scale **x0.3953** (game height 5.06 -> 2.0). Source bounds 2.91 x 5.06 x 7.82 game units.
- No orientation fix needed: already `+Y` up, `+Z` front, feet at `y = 0`, confirmed on a
  CPU-rasterised front/side preview (the bladed tail trails behind on `-Z`, as it should).

## Measured

- 9,072 triangles / 6,031 vertices / **545,372 bytes** (gate: 2.5 MB).
- 1 mesh, 1 material, 1 primitive; attributes `POSITION`, `NORMAL`, `TEXCOORD_0` only.
- No skins, no animations, no morph targets, no glTF extensions.
- Bounds 1.1491 x 2.0 x 3.0868, minimum Y exactly 0.0, centred on X and Z. It is longer than it is
  tall — the tail accounts for most of the Z extent.
- Texture 1024x1024 JPEG, 4:4:4 (not chroma subsampled).

## What the atlas actually looks like

Opened and inspected before shipping, not trusted on metadata. A genuine authored ESO creature
sheet on a black background: mauve and pink banded hide charts, pale mane fur, the horned face with
its eye and teeth laid out as a distinct chart, orange-tan shell and carapace plates, clawed feet,
and two dark steel blade charts for the tail spikes plus a wood-grain haft strip. No tiling detail
maps, no near-black charts.

The rendered result matches: a horned, spined bipedal beast with a long segmented tail ending in a
blade.

## Alias note

Aliased **only** to `possessed mantikora`, deliberately not to a bare `mantikora`. Sanctum Ophidia's
Celestial Serpent encounter spawns ordinary Mantikora adds, and handing them the boss body would
misrepresent the fight. The registry's matching is exact, never substring, so this stays a real
distinction.

## Presentation

- Intended as a 32-64 px-tall replay actor; a colour/silhouette identity LOD.
- World height 2.49 units at the registry's `scale: 1.25`, matching the rest of the catalog; the
  body then measures ~3.86 units nose to tail.
- Prepared: 2026-09-07.

The Elder Scrolls Online name, character design, and all related rights remain with their
respective owners, including ZeniMax Media / Bethesda Softworks.
