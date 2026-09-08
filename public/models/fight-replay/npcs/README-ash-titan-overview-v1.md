# Ash Titan replay prototype (v1)

This GLB is a project-authorized, fan-project prototype **reconstructed from published screenshots**,
not extracted from the ESO client. (Four assets in this catalog *are* extracted client assets and are
called out separately; this is not one of them.) It renders in the fight replay by default
(barebones quality keeps every actor on the capsule). The repository owner's authorization covers
its use for this prototype; this note is not a claim that Elder Scrolls Online intellectual property is freely
licensed.

- Reference page: <https://esomodelviewer.com/creatures/post/112-ash-titan>
- Encounter(s): Ash Titan (Rockgrove mini boss)
- Reference inputs: 14 clean plates at 1920x1080, subject height 753/735 px. That figure reads low against the ~990 px of the other subjects here, but it is measured on an **1825 px-wide** winged quadruped: it is short only because it is wide, and it fills the frame as fully as its silhouette allows. Not a resolution downgrade
- Geometry: Tencent Hunyuan3D-2mv via `tools/fight-replay-models/build-npc-asset.py`, driven by
  `tools/fight-replay-models/npcs/ash-titan.json`.
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
| bytes | **330,820** | ~1,700,000-2,300,000 |

1 mesh, 1 material, 1 primitive, one draw call. JPEG q92, 4:4:4 (chroma subsampling disabled).
Vertex attributes are POSITION, NORMAL and TEXCOORD_0 only: no skin, animation, morph target or glTF
extension, so the browser runtime needs no DRACOLoader or meshopt decoder. Minimum Y is exactly 0.0
and the model is centered on X and Z.

- Prepared bounds: 1.9975 x 0.7279 x 1.2343 model units (X x Y x Z).
- Atlas: 394 charts, 83.3% coverage, 28.7% of texels facing neither reference camera.
- PSNR against the lossless atlas: **36.23 dB**.

## Runtime scale

A wide winged quadruped, so the prepare step normalized its **wingspan** rather than its height, leaving it 0.7279 units tall. `scale: 1.55` restores a ~1.13 world height (against the player's 0.95) and puts the wingspan near 3.1 units. This is the same wider-than-tall case as Saint Olms and Lord Falgravn, and like them it is a judgment call rather than a measurement — worth an eyeball in a real Rockgrove fight.

## Known defect: the tail is soft

The two reference plates are **not in the same pose**. `view-03` has the wings flatter and the tail
fully visible; `view-01` hides the tail behind the body. The projection therefore has only one clean
observation of the tail, and it reads softer than the rest of the model.

This is a Saint-Olms-class input defect — a property of the reference set, not of the pipeline — and
it is unresolved. It is recorded rather than smoothed over.

## Region boxes, and a coordinate-frame trap worth knowing

This subject uses `regions.boxes` (the winged-subject path established by Saint Olms) rather than
the scalar head warp, because a height threshold cannot select a head on a winged silhouette.

Placement took **three attempts**. The first skull box claimed the horns and crown but left the
muzzle, jaw and brow *outside* it — invisible to region texels, coverage and PSNR alike, and caught
only by rendering the mesh coloured by box membership before spending projection time. The wing
boxes also had to be capped in depth, because they were otherwise claiming the forward-reaching
hands.

**Box coordinates are expressed in the draft frame, which is not the export frame.**
`prepare-static-boss.py` swaps the last two axes: the decimated draft measures (1.997, 0.728, 1.234)
while the exported GLB reports (1.9975, 1.2343, 0.7279). In box space, axis 1 is depth and axis 2 is
height. This is recorded in the config as well, because it is an easy and silent mistake.

- Intended presentation: a 32-64 px-tall replay actor — a broad colour and silhouette identity cue,
  not a close-up replica.
- Prepared: 2026-09-07

The Elder Scrolls Online name, character design, and related rights remain with their respective
owners, including ZeniMax Media/Bethesda Softworks. Do not reuse this asset outside this project's
authorized fan prototype without conducting a separate rights review.
