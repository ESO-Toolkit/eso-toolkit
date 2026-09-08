# Saint Olms the Just overview replay prototype (v1)

This GLB is a project-authorized, fan-project prototype reconstructed from screenshots rather than
extracted from the ESO client. The repository owner's authorization covers its use for this
prototype; this note is not a claim that Elder Scrolls Online intellectual property is freely
licensed.

- Reference page: <https://esomodelviewer.com/creatures/post/90-saint-olms-the-just>
- Encounter: Saint Olms the Just, third boss of the Asylum Sanctorium trial
- Reference inputs: the page's full-body front plate (`view-01.jpg`) and back plate (`view-03.jpg`),
  letterboxed to a shared 2415 px square framing. In that framing the subject is 738 px tall by
  **1805 px wide** — this is the first subject in the catalog that is far wider than it is tall, and
  the framing had to change to accommodate it (see below). No closeup plates were accepted or
  rejected; none were needed.
- Geometry: Tencent Hunyuan3D-2mv (`tencent/Hunyuan3D-2mv`, `hunyuan3d-dit-v2-mv`, fp16) via
  `tools/fight-replay-models/build-npc-asset.py` driven by `tools/fight-replay-models/npcs/saint-olms.json`.
  Draft: 194,988 faces in 91.3 s on an RTX 4070 Ti Super.
- Color source: both reference plates projected directly into the UV atlas at texel resolution. Each
  texel is unprojected to its surface point and normal, projected into the front and back reference
  cameras, and blended by how squarely the surface faces each camera, with occlusion rejection.

## Letterboxing — why the framing changed

Every previous subject was taller than it was wide, so the shared square framing could be driven by
subject height. Olms' wingspan fills the frame instead. The plates are letterboxed to a 2415 px
square with 254/242 px of side padding and 648/687 px of vertical padding, giving front and back
subjects of 1801 px and 1856 px with **no opaque edge column** in either. The full wingspan
survives framing rather than being clipped, which is what the earlier centre-cropped framing would
have done.

## Region boxes — why no scalar head warp

The pipeline's legacy UV-density warp selects the head by a height threshold (`head_v_min`). That
cannot work here: **Olms' skull sits mid-height, below the wing shoulders**, so the top of the
silhouette is wing, not head, and no scalar height cutoff selects the right texels. This asset is
the first to use `regions.boxes` instead — explicit axis-aligned boxes in normalized model space:

| box | extent (x, y, z min -> max) | feather | uv_scale |
| --- | --- | --- | --- |
| skull | `0.43, 0.68, 0.68 -> 0.58, 0.92, 1.00` | 0.05 | 4.0 |
| wing-left | `0.00, 0.24, 0.00 -> 0.33, 0.96, 1.00` | 0.05 | 2.0 |
| wing-right | `0.68, 0.24, 0.00 -> 1.00, 0.96, 1.00` | 0.05 | 2.0 |

Placement was measured, not guessed: the central column narrows sharply above y ~ 0.70 (x-spread
0.41-0.59 tightening to 0.457-0.553), and the x-slabs separate membrane from body by Z-thickness
(0.07-0.37 at the edges against 0.66-0.98 in the core). Placement was then **verified visually
before the build** by colouring the mesh by box membership and rendering it
(`build/saint-olms/box-check/sheet.png`): red claims only the horned skull, blue and green only the
two membranes, and body, legs and tail are left unclaimed.

**Target: roughly 200² front-facing texels for the skull _and_ for each membrane** — deliberately
not the humanoid rule of "face >= 256²". There is no single face region on a winged construct:
identity is split between a small skull that anchors it at closeup and two large membranes that
dominate the silhouette at replay distance. Achieved skull 202² (21.5% of the atlas), wings 200²
and 211² (9.0% and 10.1%). Equal texel squares give the skull far higher density per unit area — it
is ~2% of the surface against the wings' ~45% — which is the correct bias.

The boxes compete directly for atlas area, and the trade was measured rather than assumed: skull 3.0
with wings 2.0 collapsed the skull to 148²; skull 4.5 with wings 2.0 dropped the wings to 183².
Pushing either region to 256² starves the other. Note that `uv_scale` 4.0 on a box is a much
stronger boost than 4.0 on the old scalar warp.

## Prepared asset

- `saint-olms-overview-v1.glb`; one mesh, one material, one draw call, **70,000 triangles**, 44,924
  vertices, 1024x1024 JPEG q92 base-color texture (4:4:4, no chroma subsampling, 418,333 bytes,
  PSNR **39.0 dB** against the lossless atlas), **2,277,308 bytes** total.
- Triangle budget: 70,000 was chosen over 75,000. The 75,000 build came to 2,447,876 bytes — only
  52 KB under the 2.5 MB runtime gate. 70,000 leaves 223 KB of headroom at **identical** region
  balance (202² / 200² / 211²), so the extra triangles bought nothing.
- Atlas: 744 charts at 94 faces per chart, 72.1% coverage, 78.8% xatlas utilization, 23.6% grazing
  fill. Visibility: front 51.2%, back 48.1%, **neither camera only 6.9%**.
- Prepared bounds: **1.9934 x 0.7384 x 0.8711** model units (X x Y x Z), minimum Y exactly 0.0,
  centered on X and Z. Vertex attributes are POSITION, NORMAL and TEXCOORD_0 only: no skin,
  animation, morph target or glTF extension, so the browser runtime needs no DRACOLoader or meshopt
  decoder.
- All prepare-step checks passed with no warnings.

## Runtime scale — a deliberate departure

Every other asset in the catalog is normalized so its **height** is ~1.99, then scaled by 1.25 in
the registry, standing ~2.49 world units tall. Olms is the first subject wider than it is tall, so
the prepare step normalized his **wingspan** to ~2 instead, leaving him 0.7384 units tall. Scaling
him by the usual 1.25 would stand him 0.92 units tall — a flattened bat on the floor.

The registry therefore uses `scale: 3.372`, restoring the family's ~2.49 world height and putting
his wingspan at ~6.7 units. He is genuinely enormous in game, so a footprint several times a
humanoid boss' is expected rather than a defect. **This is a judgment call, not a measurement**: the
reference page publishes no real-world dimensions for him, unlike Captain Vrol's page which lists
metres. It is worth confirming by eye in the replay alongside another Asylum Sanctorium boss.

## Honest limitations

- **The reference plates are in different poses.** The front and back plates do not match, so the
  two silhouettes disagree and registration cannot fully reconcile them. This is unresolved. The
  outcome was better than feared: the reconstruction settled on a single tail pose (long, swept)
  rather than averaging the two, so the tail is coherent rather than smeared. It remains a real
  defect in the inputs, recorded here rather than papered over.
- **Head-correspondence detector:** 4 of 64 slices flagged (6.25%), with 5 run-count mismatches and
  no warnings emitted. The flagged slices sit at v 0.966-0.972, where the mesh spans ~780 px but the
  plate only ~29 px — the reconstruction's wings reach higher than the plate's do. That is above the
  skull box, so it does not affect the identity region, but it is a genuine correspondence gap and
  the detector caught it correctly. Treated as informational.
- **Side views are thin.** That is correct for a wide, flat-winged creature rather than a defect.
- The skull crop is legible and correctly formed, if slightly soft.

For contrast on why this passed where the Dwarven Colossus was rejected: Olms has 6.9% "neither
camera" against the Colossus' 62%, because flat wings face the cameras almost perfectly, and 744
charts at 94 faces each from a single watertight shell against the Colossus' 1,406 charts at 17
faces each from 234 shells.

- Intended presentation: 32-64 px-tall replay actor; broad color/silhouette identity LOD rather than
  a close-up replica.
- Prepared: 2026-09-06

The Elder Scrolls Online name, character design, and related rights remain with their respective
owners, including ZeniMax Media/Bethesda Softworks. Do not reuse this asset outside this project's
authorized fan prototype without conducting a separate rights review.
