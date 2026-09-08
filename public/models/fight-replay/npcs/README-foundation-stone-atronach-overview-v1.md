# Foundation Stone Atronach overview replay prototype (v1)

## THIS IS NOT A RECONSTRUCTION — READ FIRST

Every other NPC asset in this directory is a fan reconstruction built from published screenshots.
**This one is not.** Both the geometry and the colour texture are **assets extracted verbatim from
the Elder Scrolls Online game client**. Nothing here was modelled, inferred, or painted by this
project; the only changes are a uniform scale, a recentre, and a container re-export.

- Source blob: `public/models/bosses/StoneAtronach_B_Boss.glb` on the unmerged branch
  `feat/trial-boss-textures` (read with `git show`, never checked out or merged).
- That branch's GLBs came from this project's own `mnf -> gr2 -> glTF` client extractor.
- The embedded 1024x1024 JPEG is ESO's own hand-authored atlas for this creature, carried on the
  game's own `TEXCOORD_0`. It was passed through byte-for-byte (351,647 bytes in, 351,647 bytes
  out) — not re-encoded, not repacked, not reprojected.

**Redistribution has not been cleared.** The registry entry is filed under
`designation: 'project-authorized-fan-prototype'` only because that is the sole value the
`StaticReplayActorModelAsset` type admits. Do not read that designation as a rights determination
for this asset. **The `?npcModels=prototype` opt-in was removed on 2026-09-08 at the repository
owner's instruction, and this asset now renders by default.** That opt-in never gated distribution —
the GLB has always been served publicly from the site — so what changed is visibility, not exposure.
The rights position is unchanged and uncleared: this is ESO's own mesh and texture shipped verbatim,
and it must not be reused outside this project without a separate review.

## Build

- Encounter: **Foundation Stone Atronach**, Aetherian Archive (`src/types/trial-encounters.ts`).
- Command:

  ```
  python tools/fight-replay-models/prepare-static-boss.py \
      StoneAtronach_B_Boss.glb \
      public/models/fight-replay/npcs/foundation-stone-atronach-overview-v1.glb \
      --max-triangles 50000 --texture-size 1024 --normalize-height 2.0 \
      --name foundation-stone-atronach
  ```

- No decimation ran: 6,884 triangles, the lightest asset in the catalog. The geometry is the
  game's, triangle for triangle.
- Applied scale **x0.3883** (game height 5.15 -> 2.0). Source bounds 7.75 x 5.15 x 6.11 game units.
- No orientation fix needed: already `+Y` up, `+Z` front, feet at `y = 0`, confirmed on a
  CPU-rasterised front/side preview.

## Measured

- 6,884 triangles / 3,906 vertices / **519,364 bytes** (gate: 2.5 MB).
- 1 mesh, 1 material, 1 primitive; attributes `POSITION`, `NORMAL`, `TEXCOORD_0` only.
- No skins, no animations, no morph targets, no glTF extensions.
- Bounds 3.0079 x 2.0 x 2.3726, minimum Y exactly 0.0, centred on X and Z. It is wider than it is
  tall: a hunched construct with enormous arms and a small low-set head.
- Texture 1024x1024 JPEG, 4:4:4 (not chroma subsampled).

## What the atlas actually looks like

Opened and inspected before shipping, not trusted on metadata. A genuine authored ESO sheet: grey
granite chunk charts with molten orange lava veins running through the cracks, two large
carved-masonry pauldron charts with knotwork and serpent scrollwork, a carved plinth chart with a
glowing lava core, and a small round molten "heart" chart. Chart shapes correspond one-to-one to
the rock plates on the mesh. No tiling detail maps.

The rendered result matches: a hulking rock construct with carved-stone pauldrons over each
shoulder and lava glowing through its fissures.

## Caveat on subject identity

The source file is named `StoneAtronach_B_Boss` — the game's boss-tier stone atronach variant,
which the model audit (`data/trial-boss-models/model_audit_2026_06.json`) classified `KEEP` and
mapped to this encounter. That mapping is a research name match plus a geometry-hash distinctness
check, not a capture taken from the encounter itself. It is the correct creature family and the
correct boss-tier variant; if ZOS gave the Aetherian Archive instance a bespoke recolour, this
would be the generic boss variant of it rather than that recolour.

## Alias note

Aliased **only** to `foundation stone atronach`, not to a bare `stone atronach`. Ordinary stone
atronachs appear as trash in several trials and are a different, smaller creature.

## Presentation

- Intended as a 32-64 px-tall replay actor; a colour/silhouette identity LOD.
- World height 2.49 units at the registry's `scale: 1.25`, matching the rest of the catalog; the
  shoulder span then measures ~3.76 units.
- Prepared: 2026-09-07.

The Elder Scrolls Online name, character design, and all related rights remain with their
respective owners, including ZeniMax Media / Bethesda Softworks.
