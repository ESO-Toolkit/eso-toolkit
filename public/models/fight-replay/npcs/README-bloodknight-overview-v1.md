# Bloodknight replay prototype (v1)

This GLB is a project-authorized, fan-project prototype **reconstructed from published screenshots**,
not extracted from the ESO client. (Four assets in this catalog *are* extracted client assets and are
called out separately; this is not one of them.) It is enabled only by the fight replay's
`?npcModels=prototype` preview flag. The repository owner's authorization covers its use for this
prototype; this note is not a claim that Elder Scrolls Online intellectual property is freely
licensed.

- Reference page: <https://esomodelviewer.com/creatures/post/33-bloodknight>
- Encounter(s): Blood Knight, Crimson Knight and Bitter Knight (Kyne's Aegis trash)
- Reference inputs: the reference page's full-body front and back plates at 1366x768, subject height 626-687 px. Harvested at true full resolution: the page's own `<img>` tags serve only an 800px rendition, and Flickr's larger sizes use a different per-size secret, so naively swapping the suffix returns HTTP 410 and looks like no larger copy exists
- Geometry: Tencent Hunyuan3D-2mv via `tools/fight-replay-models/build-npc-asset.py`, driven by
  `tools/fight-replay-models/npcs/bloodknight.json`.
- Color source: both reference plates projected directly into the UV atlas at texel resolution,
  blended by how squarely each texel faces each camera, with occlusion rejection.

## Budget — this is a lesser enemy, not a boss

Trash and mini-boss actors can appear **dozens at a time** where a boss appears once, so this asset
is built to a much smaller budget than the boss profile (45,000-70,000 triangles, 1024px atlas,
~1.7-2.3 MB):

| | this asset | boss profile |
| --- | ---: | ---: |
| triangles | **5,000** | 45,000-70,000 |
| atlas | **512px** | 1024px |
| bytes | **304,148** | ~1,700,000-2,300,000 |

1 mesh, 1 material, 1 primitive, one draw call. JPEG q92, 4:4:4 (chroma subsampling disabled).
Vertex attributes are POSITION, NORMAL and TEXCOORD_0 only: no skin, animation, morph target or glTF
extension, so the browser runtime needs no DRACOLoader or meshopt decoder. Minimum Y is exactly 0.0
and the model is centered on X and Z.

- Prepared bounds: 1.5878 x 1.9974 x 0.5184 model units (X x Y x Z).
- Atlas: 236 charts, 82.2% coverage, 17.7% of texels facing neither reference camera.
- PSNR against the lossless atlas: **38.16 dB**.

## Runtime scale

These are rank-and-file humanoid knights, so they render near player height rather than boss height. The player figure is 0.95 world units tall and a boss is ~2.49; `scale: 0.55` puts a knight at ~1.10, slightly above a player. This is a judgment call rather than a measurement — the reference page publishes no real-world dimensions — and is worth confirming by eye next to a player marker.

## One build, three encounters — and the honest gap in it

The reference post states outright that this model serves generic Bloodknights, Gray Host
Bloodknights, **Bitter Knights** and **Crimson Knights**. So one GLB covers three encounters through
per-instance tint (`aliasTints`), at one draw call.

That works here specifically because the base plate measures **`#696264`** — a near-neutral
desaturated steel. Per-instance tint **multiplies**, so it can darken a channel but never raise one;
a neutral base can reach both a warm red and a cold blue sibling, where a strongly-hued base could
not.

**Only Blood Knight's colour is measured.** No reference plate exists for Crimson or Bitter, so
their tints (`[1.00, 0.55, 0.55]` and `[0.72, 0.84, 1.00]`) are **name-derived estimates** and must
be eyeballed in game. They are recorded as estimates rather than quietly presented as data.

- Intended presentation: a 32-64 px-tall replay actor — a broad colour and silhouette identity cue,
  not a close-up replica.
- Prepared: 2026-09-07

The Elder Scrolls Online name, character design, and related rights remain with their respective
owners, including ZeniMax Media/Bethesda Softworks. Do not reuse this asset outside this project's
authorized fan prototype without conducting a separate rights review.
