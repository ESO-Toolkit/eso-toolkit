# Crystal Atronach replay prototype (v1)

This GLB is a project-authorized, fan-project prototype **reconstructed from published screenshots**,
not extracted from the ESO client. (Four assets in this catalog *are* extracted client assets and are
called out separately; this is not one of them.) It is enabled only by the fight replay's
`?npcModels=prototype` preview flag. The repository owner's authorization covers its use for this
prototype; this note is not a claim that Elder Scrolls Online intellectual property is freely
licensed.

- Reference page: <https://esomodelviewer.com/creatures/post/179-crystal-atronach>
- Encounter(s): Crystal Atronach (Lucent Citadel trash)
- Reference inputs: the reference page's full-body front and back plates at 1920x1080, subject height 993/998 px — better plate supply than any shipped boss was built from
- Geometry: Tencent Hunyuan3D-2mv via `tools/fight-replay-models/build-npc-asset.py`, driven by
  `tools/fight-replay-models/npcs/crystal-atronach.json`.
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
| bytes | **341,612** | ~1,700,000-2,300,000 |

1 mesh, 1 material, 1 primitive, one draw call. JPEG q92, 4:4:4 (chroma subsampling disabled).
Vertex attributes are POSITION, NORMAL and TEXCOORD_0 only: no skin, animation, morph target or glTF
extension, so the browser runtime needs no DRACOLoader or meshopt decoder. Minimum Y is exactly 0.0
and the model is centered on X and Z.

- Prepared bounds: 1.3410 x 2.0000 x 0.5449 model units (X x Y x Z).
- Atlas: 158 charts, 78.1% coverage, 10.7% of texels facing neither reference camera.
- PSNR against the lossless atlas: **34.86 dB**.

## Runtime scale

A large construct, rendered at roughly twice player height: `scale: 0.95` puts it at ~1.90 world units against the player's 0.95. A judgment call, not a measurement.

## Why the PSNR is the lowest of the batch, and why that is not a failure

**34.86 dB** is the lowest figure in this group, against 38.16 dB for the Bloodknight. That is the
expected result for this subject rather than a defect: the atlas is thousands of iridescent crystal
facets, which is exactly the high-frequency content JPEG penalises hardest. The flat atlas is clean
when inspected directly — and the flat atlas, not the render, is what a texture should be judged on.

## Shares geometry with the Frost Atronach, but not a tint

`frost-atronach-overview-v1` is the **same mesh**. The Crystal Atronach post says so ("They resemble
Frost Atronachs but are made of crystal glass instead of ice") and the plates corroborate it: all 12
views in both galleries match to within 3 px, same pose, same framing, same lens. The geometry was
generated once and reused verbatim, so the pair cost one reconstruction.

They ship as **two GLBs, not one GLB with two tints.** Per-instance tint multiplies, so it can only
darken; these two differ in **hue** (uniform ice against iridescence), not in value, and no multiply
can turn one into the other. The rule generalises: a tint family only works when the variants differ
in value from a neutral or bright base.

- Intended presentation: a 32-64 px-tall replay actor — a broad colour and silhouette identity cue,
  not a close-up replica.
- Prepared: 2026-09-07

The Elder Scrolls Online name, character design, and related rights remain with their respective
owners, including ZeniMax Media/Bethesda Softworks. Do not reuse this asset outside this project's
authorized fan prototype without conducting a separate rights review.
