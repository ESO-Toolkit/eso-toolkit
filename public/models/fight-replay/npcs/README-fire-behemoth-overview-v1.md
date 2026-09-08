# Fire Behemoth replay prototype (v1)

This GLB is a project-authorized, fan-project prototype **reconstructed from published screenshots**,
not extracted from the ESO client. (Four assets in this catalog *are* extracted client assets and are
called out separately; this is not one of them.) It renders in the fight replay by default
(barebones quality keeps every actor on the capsule). The repository owner's authorization covers
its use for this prototype; this note is not a claim that Elder Scrolls Online intellectual property is freely
licensed.

- Reference page: <https://esomodelviewer.com/creatures/post/65-fire-behemoth>
- Encounter(s): Fire Behemoth (Rockgrove trash)
- Reference inputs: the reference page's full-body front and back plates at 1920x1080, subject height 998/994 px
- Geometry: Tencent Hunyuan3D-2mv via `tools/fight-replay-models/build-npc-asset.py`, driven by
  `tools/fight-replay-models/npcs/fire-behemoth.json`.
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
| bytes | **324,864** | ~1,700,000-2,300,000 |

1 mesh, 1 material, 1 primitive, one draw call. JPEG q92, 4:4:4 (chroma subsampling disabled).
Vertex attributes are POSITION, NORMAL and TEXCOORD_0 only: no skin, animation, morph target or glTF
extension, so the browser runtime needs no DRACOLoader or meshopt decoder. Minimum Y is exactly 0.0
and the model is centered on X and Z.

- Prepared bounds: 0.9620 x 1.9947 x 0.3290 model units (X x Y x Z).
- Atlas: 74 charts, 73.1% coverage, 4.5% of texels facing neither reference camera.
- PSNR against the lossless atlas: **35.44 dB**.

## Runtime scale

A large humanoid behemoth: `scale: 1.0` puts it at ~1.99 world units, about twice player height. A judgment call, not a measurement.

## The best build of this batch

**4.5% of texels face neither camera** — the lowest figure of any asset in this catalog, boss or
trash — and only **74 charts**, against 394 for the Ash Titan. The lava fissures and glowing eyes
read cleanly.

The in-game flame VFX is additive and drawn on top at runtime, so the plate's **base skin** is the
correct projection input. No attempt was made to bake flames into the atlas; doing so would
double-count the effect wherever the runtime adds its own.

- Intended presentation: a 32-64 px-tall replay actor — a broad colour and silhouette identity cue,
  not a close-up replica.
- Prepared: 2026-09-07

The Elder Scrolls Online name, character design, and related rights remain with their respective
owners, including ZeniMax Media/Bethesda Softworks. Do not reuse this asset outside this project's
authorized fan prototype without conducting a separate rights review.
