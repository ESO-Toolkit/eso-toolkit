# Saint Felms the Bold overview replay prototype (v1)

This GLB is a project-authorized, fan-project prototype reconstructed from screenshots rather than
extracted from the ESO client. It is enabled only by the fight replay's `?npcModels=prototype`
preview flag. The repository owner's authorization covers its use for this prototype; this note is
not a claim that Elder Scrolls Online intellectual property is freely licensed.

- Reference page: <https://esomodelviewer.com/creatures/post/88-saint-felms-the-bold>
- Encounter: Saint Felms the Bold, Asylum Sanctorium trial
- Reference inputs: the page's clean full-body front plate (`view-01.jpg`) and back plate
  (`view-03.jpg`), both 1920x1080. Subject height ~972 px — better than the Kyne's Aegis pair
  had, which is why the head reads well here without any helm closeup.
- Geometry: Tencent Hunyuan3D-2mv, front + back plates only, 397,374-face draft in 59.6 s
  on an RTX 4070 Ti Super.
- Colour: projected directly into the UV atlas at texel resolution — each texel unprojected to its
  surface point and normal, projected into the front and back cameras, blended by facing angle with
  occlusion rejection.
- **All four helm closeups were REJECTED.** When a helm plate has no shoulders in frame the
  registration seed scale is computed from a fallback and the search window excludes the true scale;
  every candidate pinned to the search lower bound. A wide manual sweep reached 4.75% width error but
  the overlay still showed the halo ring doubled by ~3%, so it was rejected rather than forced. The
  head is therefore sourced from the full-body plate alone — which suffices here because the base
  plate carries the head at ~215 px.
- `view-11` (rear legs) was also rejected: it scored the _lowest_ width error of any plate yet
  visibly doubled the greaves and boots. Rear legs are near-parallel columns, so the width profile is
  almost translation-invariant along their length and the row offset is under-determined. Width error
  is not evidence; the overlay is.
- Built through `tools/fight-replay-models/build-npc-asset.py` from `npcs/saint-felms.json`.
- Prepared asset: `saint-felms-overview-v1.glb`; one mesh, one material, one draw call,
  45,000 triangles, 1024x1024 JPEG q92 base-colour texture
  (4:4:4, no chroma subsampling).
- Prepared bounds: 0.9636 x 1.9951 x 0.3868 model units (X x Y x Z), minimum Y exactly 0.0, centred on X and Z.
  POSITION, NORMAL and TEXCOORD_0 only — no skin, animation, morph target or glTF extension.
- Known limitation: this is an **openwork design** (crested helm plus an open halo ring), so two
  cameras see less of it than they do of a solid humanoid — "neither camera" visibility is ~35% and
  the chart-local grazing fill covers 42-47% of texels, against ~15%/35% for Yandir or Vrol. The flat
  atlas therefore carries more smooth fill. That is honest: no plate observed those surfaces.
- Intended presentation: 32-64 px-tall replay actor; a colour/silhouette identity LOD, not a close-up
  replica.
- Prepared: 2026-09-06

The Elder Scrolls Online name, character design, and related rights remain with their respective
owners, including ZeniMax Media/Bethesda Softworks. Do not reuse this asset outside this project's
authorized fan prototype without conducting a separate rights review.
