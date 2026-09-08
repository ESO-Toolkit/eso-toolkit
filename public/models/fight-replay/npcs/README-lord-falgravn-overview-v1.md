# Lord Falgravn overview replay prototype (v1)

This GLB is a project-authorized, fan-project prototype reconstructed from screenshots rather than
extracted from the ESO client. The repository owner's authorization covers its use for this
prototype; this note is not a claim that Elder Scrolls Online intellectual property is freely
licensed.

- Reference page: <https://esomodelviewer.com/creatures/post/32-vampire-lord>
- Encounter: Lord Falgravn, third and final boss of the Kyne's Aegis trial
- Reference inputs: the page's full-body front plate (`view-01.jpg`) and back plate (`view-03.jpg`),
  letterboxed to a shared 1311 px square framing, in which the subject is 699 px tall by **884 px
  wide** (back plate 1010 px wide). No closeup plates were accepted or rejected; none were needed.
- Geometry: Tencent Hunyuan3D-2mv (`tencent/Hunyuan3D-2mv`, `hunyuan3d-dit-v2-mv`, fp16) via
  `tools/fight-replay-models/build-npc-asset.py` driven by
  `tools/fight-replay-models/npcs/lord-falgravn.json`. Draft: 240,420 faces in 65.8 s on an
  RTX 4070 Ti Super.
- Color source: both reference plates projected directly into the UV atlas at texel resolution. Each
  texel is unprojected to its surface point and normal, projected into the front and back reference
  cameras, and blended by how squarely the surface faces each camera, with occlusion rejection.

## Identity — this page is Falgravn, and it was nearly missed

The page is titled **"Vampire Lord"** and so was skipped by an earlier title-only sweep, which is why
this encounter was recorded as *blocked on references* for several rounds. The page's body text
states the mesh serves generic Gray Host Vampire Lords **and Lord Falgravn**. That was cross-checked
against the UESP in-game shot (`ON-npc-Lord_Falgravn.jpg`): horned head plate, swept membrane wings,
spiked pauldrons, red sigil loincloth, knee guards and clawed feet all match.

**Plate orientation was verified by eye before projecting**, because this reference set had once been
re-dropped with front and back swapped. `view-01` shows the face, chest sigil, forward-hanging
loincloth and toes; `view-03` shows no face, the spine, shoulder blades, wing roots, rear tassets and
heels. Both plates are the **same pose** — unlike Saint Olms, there is no pose mismatch to work
around. A silently reversed pair would put the back of his head on his face while every downstream
metric still looked healthy, so this check is not optional.

## Region boxes — measured on this mesh, not copied from Olms

The legacy scalar UV-density warp selects the head by a height threshold (`head_v_min`). It cannot
work here: the **wing claws reach normalized y = 1.0 while the horn tips stop at y = 0.902**, so the
top of this silhouette is wing, not head.

| box | extent (x, y, z min -> max) | feather | uv_scale |
| --- | --- | --- | --- |
| skull | `0.43, 0.775, 0.28 -> 0.57, 1.00, 1.00` | 0.04 | 5.0 |
| wing-left | `0.00, 0.70, 0.00 -> 0.365, 1.00, 0.30` | 0.04 | 2.0 |
| wing-right | `0.635, 0.70, 0.00 -> 1.00, 1.00, 0.30` | 0.04 | 2.0 |

These are **not** Olms' numbers. Falgravn is an upright biped where Olms is a low wide construct, and
his wings separate from the body in **both** x and z: at head height the wings sit at z 0.01-0.22
while the head sits at z 0.35-0.79, and the front-half x profile shows the pauldron spikes as
segments at x 0.39-0.418 and 0.582-0.610, cleanly disjoint from the head column at x 0.432-0.568.

Placement was **verified visually on a membership render before spending projection time**
(`build/lord-falgravn/box-check/sheet.png`): red claims the horns, cranium, face and neck; blue and
green claim only the two membranes and their wing arms; torso, arms, loincloth and legs unclaimed.
That check caught a defect immediately — the first placement, `y0 = 0.805`, took the horns and
cranium but **left the whole face outside the box**, and no downstream metric would have reported it.
Re-measuring the neck pinch (the column narrows to x 0.463-0.537 at y 0.77) put the floor at 0.775.

The pauldron spike tips take a weak partial weight from the skull box's feather. They are 96
vertices and sit adjacent to the head in the atlas anyway; it was judged not worth a harder edge in
the density field to exclude them.

## The skull/wing trade, measured

The boxes compete directly for one atlas, so the trade was swept on the decimated mesh (unwrap and
measure only — the region-texel numbers do not depend on the projection, so a sweep does not need to
pay for one):

| skull | wing | skull region | front-facing | wings (both) | front-facing L/R |
| ----- | ---- | ------------ | ------------ | ------------ | ---------------- |
| 4.0 | 2.0 | 233,615 (22.3%) | 246² | 133,944 (12.8%) | 159² / 159² |
| **5.0** | **2.0** | **265,170 (25.3%)** | **265²** | **120,698 (11.5%)** | **150² / 151²** |
| 5.0 | 1.5 | 290,543 (27.7%) | 287² | 84,194 (8.0%) | 125² / 126² |
| 6.0 | 1.6 | 304,677 (29.1%) | 300² | 69,747 (6.7%) | 114² / 116² |

Shipped **5.0 / 2.0 / 2.0**. Olms deliberately targeted *equal* texel squares (~200² each) because
his skull is ~2% of the surface against his membranes' ~45%. **That target does not transfer.**
Falgravn has a real face — brow, deep-set eyes, nose, fangs — and his membranes are only ~20% of the
mesh, so the correct bias is toward the head. 5.0/2.0 clears the humanoid `face >= 256²` bar at 265²
for a 6% linear cost on each membrane, which carries only low-frequency veined skin.

## Prepared asset

- `lord-falgravn-overview-v1.glb`; one mesh, one material, one draw call, **70,000 triangles**,
  44,724 vertices, 1024x1024 JPEG q92 base-color texture (4:4:4, **no chroma subsampling** —
  verified by reading the sampling factors back out of the shipped file, all `(1, 1)` — 406,526
  bytes, PSNR **39.87 dB** against the lossless atlas), **2,259,112 bytes** total.
- That leaves **240,888 bytes of headroom** under the 2.5 MB runtime gate. 70,000 triangles was
  taken from the approved 70-80k hero band and deliberately not pushed higher: Olms' 75,000-triangle
  build came within 52 KB of the gate for no measurable gain, so headroom beat triangle count there
  and the same choice was made here without re-testing it.
- Atlas: 693 charts at 101 faces per chart, 70.5% coverage, 76.8% xatlas utilization, 24.5% grazing
  fill. Region allocation 374,135 texels (35.7% of atlas), front-facing 112,363 (~335² across all
  three boxes combined).
- Visibility: front 45.5%, back 53.3%, **neither camera only 5.6%** — slightly better than Olms'
  6.9%, for the same reason: broad flat wings face the reference cameras almost squarely.
- Prepared bounds: **1.9933 x 1.4885 x 0.4057** model units (X x Y x Z), minimum Y exactly 0.0,
  centered on X and Z. Vertex attributes are POSITION, NORMAL and TEXCOORD_0 only: no skin,
  animation, morph target or glTF extension, so the browser runtime needs no DRACOLoader or meshopt
  decoder.
- All prepare-step checks passed with **no warnings**.

## Runtime scale

Falgravn is the second subject wider than he is tall, so the prepare step normalized his **wingspan**
to ~2 rather than his height, leaving him 1.4885 units tall. The family's usual `scale: 1.25` would
stand him 1.86 units tall against the catalog's ~2.49, so the registry uses **`scale: 1.6744`**,
restoring ~2.49 world height and putting his wingspan at ~3.34 units.

This is a much milder correction than Olms' 3.372 because Falgravn is an upright biped whose wingspan
is only ~1.34x his height, where Olms' is ~2.7x. Like Olms' it is a judgment call rather than a
measurement — the reference page publishes no real-world dimensions — but the risk is
correspondingly smaller.

## Honest limitations

- **The wing leading edges read too dark.** In the plates the wing arm is pale bone with the pink
  veined membrane below it; in the asset the upper surface of each wing arm carries a dark grey band
  that spreads inboard from the (correctly black) elbow claws for roughly 40% of the arm's length,
  with visible horizontal streaking. This is the projection's silhouette-normalized `u` failing on a
  **near-horizontal** limb: one height slice spans the whole wing, so a small vertical registration
  error smears the claw's plate columns along the arm. It is the same class of defect as the
  documented "silhouette-normalized `u` breaks under wide head ornaments", rotated 90°.

  `envelope_sigma` was tested as a fix and **rejected**: raising it from the default 3.0 to 8.0
  changed the band only marginally (PSNR 39.87 -> 39.97 dB, 2,259,112 -> 2,254,360 bytes) and left
  the dark region inboard of the claw essentially unchanged. The shipped asset keeps the documented
  default of 3.0 rather than carrying an unexplained non-default value. A genuine fix would need a
  registered wing closeup; the membrane itself — the part that dominates the silhouette — is correct
  in both colour and vein detail.
- **The rear tassets are muddy.** The back view's red loincloth panels blur into a single dark red
  mass with a grey streak across the hips, where the plate shows two distinct red tassets flanking a
  central sigil panel.
- **Side views are soft.** Expected with two views and a body this thin front-to-back (0.41 units
  against a 1.99 wingspan); this is the documented irreducible limitation, not a new defect.
- **Head-correspondence detector:** 4 of 64 slices flagged (6.25%), 7 run-count mismatches, no
  warnings emitted. The flagged slices sit at v 0.972-0.981 where the mesh spans ~865 px against the
  plate's 387 px — the reconstruction's wings reach wider at the very top than the plate's do. That
  is above the skull box and does not touch the identity region. Treated as informational, exactly as
  the detector's contract says it should be.
- An extracted `VampireLord_Lurker` mesh (88 shells, 28.1% unobserved) is genuinely this character
  and exists in the scratch inventory. It was **not** used: reconstruction is now 13-for-13, and the
  extracted mesh's shell count is the profile that got the Dwarven Colossus rejected.

## What is good

The head crop is the strongest face in this catalog so far — horns, brow ridge, deep-set eyes, nose,
snarling mouth with visible teeth, pointed ears and cranial ridging all read at closeup. The clay
render confirms the reconstruction itself is clean: separated fingers, wing claws, pauldron spikes,
bracers, knee guards and clawed feet are all modelled rather than implied by texture. At the intended
32-64 px replay height the silhouette is unmistakable.

- Intended presentation: 32-64 px-tall replay actor; broad color/silhouette identity LOD rather than
  a close-up replica.
- Prepared: 2026-09-06

The Elder Scrolls Online name, character design, and related rights remain with their respective
owners, including ZeniMax Media/Bethesda Softworks. Do not reuse this asset outside this project's
authorized fan prototype without conducting a separate rights review.
