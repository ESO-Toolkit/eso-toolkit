# Stonebreaker overview replay prototype (v1)

## THIS IS NOT A RECONSTRUCTION — READ FIRST

Every other NPC asset in this directory is a fan reconstruction built from published screenshots.
**This one is not.** Both the geometry and the colour texture are **assets extracted verbatim from
the Elder Scrolls Online game client**. Nothing here was modelled, inferred, or painted by this
project; the only changes are a uniform scale, a recentre, and a container re-export.

- Source blob: `public/models/bosses/Troll_Craglorn_Boss.glb` on the unmerged branch
  `feat/trial-boss-textures` (read with `git show`, never checked out or merged).
- That branch's GLBs came from this project's own `mnf -> gr2 -> glTF` client extractor.
- The embedded 1024x1024 JPEG is ESO's own hand-authored character atlas for this creature,
  carried on the game's own `TEXCOORD_0`. It was passed through byte-for-byte (314,326 bytes in,
  314,326 bytes out) — not re-encoded, not repacked, not reprojected.

**Redistribution has not been cleared.** The registry entry is filed under
`designation: 'project-authorized-fan-prototype'` only because that is the sole value the
`StaticReplayActorModelAsset` type admits; widening that union would change a runtime contract
every consumer and test depends on. Do not read that designation as a rights determination for
this asset. **The `?npcModels=prototype` opt-in was removed on 2026-09-08 at the repository
owner's instruction, and this asset now renders by default.** That opt-in never gated distribution —
the GLB has always been served publicly from the site — so what changed is visibility, not exposure.
The rights position is unchanged and uncleared: this is ESO's own mesh and texture shipped verbatim,
and it must not be reused outside this project without a separate review.

## Why this route was taken

Stonebreaker has **no reference plates on any site** — not esomodelviewer, not the UESP gallery.
The screenshot reconstruction pipeline cannot be run for him at all, at any quality. The extracted
mesh is the only route to this encounter that will ever exist.

## Build

- Encounter: **Stonebreaker**, Sanctum Ophidia (`src/types/trial-encounters.ts`, `boss_2`).
- Command:

  ```
  python tools/fight-replay-models/prepare-static-boss.py \
      Troll_Craglorn_Boss.glb public/models/fight-replay/npcs/stonebreaker-overview-v1.glb \
      --max-triangles 50000 --texture-size 1024 --normalize-height 2.0 --name stonebreaker
  ```

- No decimation ran: the source is 13,474 triangles, well inside the 50,000 boss budget. The
  geometry is therefore the game's, triangle for triangle.
- `--normalize-height` was added to the prepare tool for this batch. Reconstructions arrive from
  Hunyuan already ~2 units tall; extracted meshes arrive in game units (this one 3.46 x 3.56 x
  1.58) and need normalising. Applied factor: **x0.5618** (3.56 -> 2.0).
- No orientation fix was needed. The extracted mesh is already glTF `+Y` up, `+Z` front, feet at
  `y = 0`, confirmed on a CPU-rasterised front/side preview.

## Measured

- 13,474 triangles / 11,620 vertices / **768,420 bytes** (gate: 2.5 MB).
- 1 mesh, 1 material, 1 primitive; attributes `POSITION`, `NORMAL`, `TEXCOORD_0` only.
- No skins, no animations, no morph targets, no glTF extensions.
- Bounds 1.9394 x 2.0 x 0.8871, minimum Y exactly 0.0, centred on X and Z.
- Texture 1024x1024 JPEG, 4:4:4 (not chroma subsampled).

## What the atlas actually looks like

Opened and inspected before shipping, not trusted on metadata. It is a genuine authored ESO
character sheet with chart-by-chart layout: the face (yellow eye, tusked jaw, red war-paint brow
sigil), body fur, pale hide with dark red painted sigils across chest and thighs, leather straps,
and a full set of dark iron armour plates — pauldrons, bracers, greaves and a bladed shoulder.
No tiling detail maps, no near-black charts. Shipping quality with no rework.

The rendered result matches: an armoured troll with layered spiked pauldrons, a horned helm plate,
red war-paint on chest and legs, and shaggy lower legs.

## Presentation

- Intended as a 32–64 px-tall replay actor; a colour/silhouette identity LOD.
- World height 2.49 units at the registry's `scale: 1.25`, matching the rest of the catalog.
- Prepared: 2026-09-07.

The Elder Scrolls Online name, character design, and all related rights remain with their
respective owners, including ZeniMax Media / Bethesda Softworks.
