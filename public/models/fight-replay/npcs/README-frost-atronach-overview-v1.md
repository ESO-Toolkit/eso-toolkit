# Frost Atronach replay prototype (v1)

This GLB is a project-authorized, fan-project prototype **reconstructed from published screenshots**,
not extracted from the ESO client. (Four assets in this catalog *are* extracted client assets and are
called out separately; this is not one of them.) It is enabled only by the fight replay's
`?npcModels=prototype` preview flag. The repository owner's authorization covers its use for this
prototype; this note is not a claim that Elder Scrolls Online intellectual property is freely
licensed.

- Reference page: <https://esomodelviewer.com/creatures/post/153-frost-atronach>
- Encounter(s): Frost Atronach (Aetherian Archive trash)
- Reference inputs: the reference page's full-body front and back plates at 1920x1080, subject height 993/997 px
- Geometry: Tencent Hunyuan3D-2mv via `tools/fight-replay-models/build-npc-asset.py`, driven by
  `tools/fight-replay-models/npcs/frost-atronach.json`.
- Color source: both reference plates projected directly into the UV atlas at texel resolution,
  blended by how squarely each texel faces each camera, with occlusion rejection.

## Budget — this is a lesser enemy, not a boss

Trash and mini-boss actors can appear **dozens at a time** where a boss appears once, so this asset
is built to a much smaller budget than the boss profile (45,000-70,000 triangles, 1024px atlas,
~1.7-2.3 MB):

| | this asset | boss profile |
| --- | ---: | ---: |
| triangles | **4,996** | 45,000-70,000 |
| atlas | **512px** | 1024px |
| bytes | **320,576** | ~1,700,000-2,300,000 |

1 mesh, 1 material, 1 primitive, one draw call. JPEG q92, 4:4:4 (chroma subsampling disabled).
Vertex attributes are POSITION, NORMAL and TEXCOORD_0 only: no skin, animation, morph target or glTF
extension, so the browser runtime needs no DRACOLoader or meshopt decoder. Minimum Y is exactly 0.0
and the model is centered on X and Z.

- Prepared bounds: 1.3410 x 2.0000 x 0.5449 model units (X x Y x Z).
- Atlas: 158 charts, 78.1% coverage, 10.7% of texels facing neither reference camera.
- PSNR against the lossless atlas: **35.62 dB**.

## Runtime scale

A large construct, rendered at roughly twice player height: `scale: 0.95` puts it at ~1.90 world units against the player's 0.95. A judgment call, not a measurement.

## Shares geometry with the Crystal Atronach, but not a tint

`crystal-atronach-overview-v1` is the **same mesh**, confirmed both by the Crystal Atronach post
text and by all 12 plates in the two galleries matching to within 3 px. The geometry was generated
once and reused verbatim, so the pair cost one reconstruction between them.

They ship as **two GLBs rather than one GLB with two tints**, because per-instance tint multiplies
and can therefore only darken. These two differ in **hue** — uniform ice against iridescent glass —
not in value, so no multiply turns one into the other. See the Crystal Atronach README for the
general form of that rule.

- Intended presentation: a 32-64 px-tall replay actor — a broad colour and silhouette identity cue,
  not a close-up replica.
- Prepared: 2026-09-07

The Elder Scrolls Online name, character design, and related rights remain with their respective
owners, including ZeniMax Media/Bethesda Softworks. Do not reuse this asset outside this project's
authorized fan prototype without conducting a separate rights review.
