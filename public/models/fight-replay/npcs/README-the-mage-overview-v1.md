# The Mage overview replay prototype (v1)

This GLB is a project-authorized, fan-project prototype reconstructed from screenshots rather than
extracted from the ESO client. It is enabled only by the fight replay's `?npcModels=prototype`
preview flag. The repository owner's authorization covers its use for this prototype; this note is
not a claim that Elder Scrolls Online intellectual property is freely licensed.

- Reference page: <https://esomodelviewer.com/characters/post/173-the-mage>
- Encounter: The Mage, Aetherian Archive trial — a floor-length black robe under a gold sunburst halo and a blank silver mask
- Reference inputs: the page's clean full-body front plate (`view-01.jpg`) and back plate
  (`view-03.jpg`), both 1920x1080, subject ~973-1005 px tall. Geometry is generated from those two
  views only.
- Geometry: Tencent Hunyuan3D-2mv, front + back, ~57 s on an RTX 4070 Ti Super.
- Colour: projected directly into the UV atlas at texel resolution — each texel unprojected to its
  surface point and normal, projected into the front and back cameras, blended by facing angle with
  occlusion rejection, then chart-local grazing fill, area-weighted tone match and masked unsharp.
- Registered closeups: **front and back torso only**. Every head and leg closeup was rejected on the
  overlay. The shoulder detector fired too LOW (0.6472) because the widest upper row is the flared robe; `head_v_min` was hand-set and verified on the plate.
- Built through `tools/fight-replay-models/build-npc-asset.py` from `npcs/the-mage.json`, which records
  the accepted and rejected plates with their measured errors.
- Prepared asset: `the-mage-overview-v1.glb`; one mesh, one material, one draw call,
  45,000 triangles, 29,007 vertices, 1024x1024 JPEG q92 base-colour texture
  (4:4:4, no chroma subsampling), 1,722,144 bytes.
- Prepared bounds: model height 1.9928 units, minimum Y exactly 0.0, centred on X and Z.
  POSITION, NORMAL and TEXCOORD_0 only — no skin, animation, morph target or glTF extension.
- Intended presentation: 32-64 px-tall replay actor; a colour/silhouette identity LOD, not a
  close-up replica.
- Prepared: 2026-09-06

The Elder Scrolls Online name, character design, and related rights remain with their respective
owners, including ZeniMax Media/Bethesda Softworks. Do not reuse this asset outside this project's
authorized fan prototype without conducting a separate rights review.
