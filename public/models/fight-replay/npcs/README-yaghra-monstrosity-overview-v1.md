# Yaghra Monstrosity replay prototype (v1)

This GLB is a project-authorized, fan-project prototype **reconstructed from published screenshots**,
not extracted from the ESO client. (Four assets in this catalog *are* extracted client assets and are
called out separately; this is not one of them.) It renders in the fight replay by default
(barebones quality keeps every actor on the capsule). The repository owner's authorization covers
its use for this prototype; this note is not a claim that Elder Scrolls Online intellectual property is freely
licensed.

- Reference page: <https://esomodelviewer.com/creatures/post/120-yaghra-monstrosity>
- Encounter(s): Yaghra Monstrosity (Cloudrest trash — appears in four encounter slots, the highest count of any single lesser-enemy name)
- Reference inputs: the reference page's plates at 1920x1080, subject height 985/987 px. **Note the view numbering does not follow the usual convention here**: `view-01` is a three-quarter and the true head-on front is `view-02`. This was caught by eye during the build; the harvest manifest had recorded `view-01` as the front
- Geometry: Tencent Hunyuan3D-2mv via `tools/fight-replay-models/build-npc-asset.py`, driven by
  `tools/fight-replay-models/npcs/yaghra-monstrosity.json`.
- Color source: both reference plates projected directly into the UV atlas at texel resolution,
  blended by how squarely each texel faces each camera, with occlusion rejection.

## Budget — this is a lesser enemy, not a boss

Trash and mini-boss actors can appear **dozens at a time** where a boss appears once, so this asset
is built to a much smaller budget than the boss profile (45,000-70,000 triangles, 1024px atlas,
~1.7-2.3 MB):

| | this asset | boss profile |
| --- | ---: | ---: |
| triangles | **4,976** | 45,000-70,000 |
| atlas | **512px** | 1024px |
| bytes | **327,324** | ~1,700,000-2,300,000 |

1 mesh, 1 material, 1 primitive, one draw call. JPEG q92, 4:4:4 (chroma subsampling disabled).
Vertex attributes are POSITION, NORMAL and TEXCOORD_0 only: no skin, animation, morph target or glTF
extension, so the browser runtime needs no DRACOLoader or meshopt decoder. Minimum Y is exactly 0.0
and the model is centered on X and Z.

- Prepared bounds: 1.9990 x 1.4680 x 1.8630 model units (X x Y x Z).
- Atlas: 361 charts, 81.1% coverage, 32.6% of texels facing neither reference camera.
- PSNR against the lossless atlas: **36.68 dB**.

## Runtime scale

A sprawling six-legged creature that is wider and deeper than it is tall. `scale: 0.9` puts it at ~1.32 world units tall and ~1.80 wide, against the player's 0.95. A judgment call, not a measurement.

## The weakest of this batch, stated plainly

**32.6% of its texels face neither reference camera** — against 10.7% for the atronachs and 4.5% for
the Fire Behemoth. Six legs splayed sideways from a deep body is close to the worst case for
two-camera projection, and this is the honest ceiling of two views on that shape rather than a bug.

At replay distance the **pale fanged face reads as a bright blob rather than a mouth.** The
silhouette, shell plating, yellow eye nodules and overall colour are all correct, so it works as an
identity cue at 32-64 px — which is what it is for — but it would not survive a close-up.

**Shippable at trash tier, not at boss tier.** If this creature ever needs to read at boss scale it
should be rebuilt with side plates.

## About its head-band warning

The build reports a head-band run-structure mismatch on 23 of 64 slices. That is an artefact of the
metric, not a separate defect: the detector assumes the top of the silhouette is a head, and on this
creature the top edge is shell. It is recorded here so the warning is not re-diagnosed later as a
registration failure.

- Intended presentation: a 32-64 px-tall replay actor — a broad colour and silhouette identity cue,
  not a close-up replica.
- Prepared: 2026-09-07

The Elder Scrolls Online name, character design, and related rights remain with their respective
owners, including ZeniMax Media/Bethesda Softworks. Do not reuse this asset outside this project's
authorized fan prototype without conducting a separate rights review.
