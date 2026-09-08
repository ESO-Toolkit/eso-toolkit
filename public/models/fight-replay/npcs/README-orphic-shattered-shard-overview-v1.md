# Orphic Shattered Shard — build record

First coverage of **Lucent Citadel**, a trial with nothing at all today.

Built into scratch only. Nothing was committed to the repository; the config lives here
(`orphic-shattered-shard.json`) rather than in `tools/fight-replay-models/npcs/`, because other
agents were working the repo concurrently.

Ship candidate: `out/orphic-shattered-shard-overview-v1.glb`.

## Identity — read this before shipping

The reference post is titled for the **species** ("Shattered Shard") and does **not** name the
Orphic variant. Its body text describes them only as *"large, hulking humanoids made of..."*. This is
**family inference, not the certainty we had for Falgravn**, whose page body text named him directly.

- **The base mesh is certain.** A Shattered Shard is a Shattered Shard; the Orphic version is the
  same model.
- **The tint is not.** The Orphic version is most likely a retint, and the blue/violet crystal with
  orange-gold molten seams shipped here comes from the generic species plates. Expect colour to need
  hand-tuning against in-game Lucent Citadel footage before this is treated as final.

## Result

| | |
| --- | --- |
| Triangles / vertices | 44,999 / 32,092 |
| Bytes | **2,025,356** (474,644 under the 2.5 MB gate) |
| Texture | 1024² JPEG, q-table `[3,2,2,3,4,6,8,10]`, chroma subsampling **disabled** |
| PSNR | **35.26 dB** |
| Atlas coverage | 73.4% |
| Charts | **855** (52.6 faces each) |
| Region (skull) texels | 245,282 (23.4% of atlas); front-facing **~261²** |
| Visibility | front 41.3%, back 43.0%, **neither camera 18.1%** |
| Grazing fill | 40.5% of covered texels below cos 0.35; 289,313 filled (37.6%) |
| Dimensions | 1.8087 × 1.9820 × 1.1804, feet at y=0, centred on X and Z |
| Checks | **ALL PASSED** — 1 mesh / 1 material / 1 primitive, POSITION+NORMAL+TEXCOORD_0 only, no skins, animations, morph targets or glTF extensions |

Plate supply was as good as promised: 1920×1080 source, **1005 px tall × 1029 px wide** subject,
letterboxed into a shared 1336 px square. That is the best of anything built here (Yandir 690,
Falgravn 685, Vrol 717).

## Numbers that are worse than the shipped assets — stated plainly

Three of these are noticeably worse than Olms and Falgravn:

- **PSNR 35.26 dB** against Falgravn's 39.87 and Olms's 39.0. About 4 dB down. The atlas is a
  high-frequency crystal mosaic rather than the flat colour blocks JPEG handles well, so q92 has
  more work to do. Not fixable by raising quality — q95+ is on the wasted-effort list.
- **Neither-camera visibility 18.1%**, against Olms 6.9% and Falgravn 5.6%. The subject is hunched
  forward, so the backs of the thighs face *down* rather than backward and neither reference camera
  sees them squarely. This is the direct cause of the smeared grey banding visible on the legs in
  `renders/body/back.png` and on both side views. It is inherent to two-view projection on this pose;
  only a genuine profile plate would fix it, and fabricating one is not permitted.
- **855 charts at 52.6 faces each.** Between Olms (744 at 94) and the rejected Dwarven Colossus
  (1,406 at 17). The several hundred crystal spikes each become their own chart. The flat atlas
  (`out/orphic-shattered-shard-atlas.png`) genuinely looks like confetti — but in this case that is
  the subject, not a smear: colours and plate boundaries are correct, and the elongated streaked
  charts are the spikes carrying grazing fill.

## The head does not resolve its mask — the main shortfall

The build report raises its own warning and it is correct:

> head band shows run-structure mismatch on **44 of 64 slices (69%)**, 42 differing in opaque-run
> count, worst feature displacement 100% of span, p90 48%

This is the Celestial Serpent failure mode from the runbook: silhouette-normalised `u` only
corresponds when the mesh row and the plate row resolve the same features, and at head height this
silhouette is dominated by a wide spiked crest. In `renders/head/front.png` the head reads as
generic crystal mosaic; the faceted mask that the reference closeup shows clearly is **not** legible.

The documented fix is a verified head closeup. **One exists and it was tried and rejected** — see
below. Without it, this is the honest ceiling.

Mitigating: this head is a smooth faceted mask with no eyes, nose or mouth. There is less to lose
than on a subject with a real face, and at replay distance
(`renders/body/replay-distance-strip.png`) the model reads correctly from all five angles.

## Closeups: both registered, both rejected

`plates/registration/` holds the overlays. Both were rejected on the overlay, per the standing rule.

- **`view-04.jpg` (front head).** A genuine head closeup and exactly the fix the warning asks for, so
  it was tried first. Rejected because (a) the fitter's best scale 0.320 fell *outside* the seeded
  window [0.430, 0.958] and the tool flagged the closeup's own shoulder detection as unreliable — the
  shoulders are cropped out of frame; and (b) view-04 is shot from a **low camera looking up**, while
  registration is scale+translate only, so no fit can reconcile the perspective. The overlay shows
  its shoulder line wider and higher than the base plate's. A wrong plate on the face is far worse
  than a soft one.
- **`view-08.jpg` (back torso).** Rejected despite the **lowest width error measured here, 4.57%** —
  which is the Shade-of-Siroria lesson restated: width error is not a reliability signal, the overlay
  is. Its arms and legs are visibly displaced from the base plate's; it is a three-quarter-ish back
  crop, not an orthographic back view.

If someone can capture a straight-on, orthographic-ish head plate from the model viewer, that is the
single highest-value follow-up for this asset.

## Region box — the check paid off again

`regions.boxes` with one skull box, not a scalar `head_v_min`: at normalized y 0.90–0.92 the mesh
spans x 0.22–0.85, so any height band wide enough to contain the jaw also swallows both spiked
pauldrons and dilutes the boost.

Placement was verified on a membership render **before** spending projection time
(`box-check/sheet.png`), and it caught a Falgravn-class error on the first try:

1. `y0=0.885` (from a slice scan showing x narrowing to 0.40–0.63 only above y=0.95) claimed the
   **crown and crest and left the entire face outside the box**. No downstream metric would have
   reported this — region texels, coverage and PSNR would all have looked healthy.
2. `y0=0.775`, x 0.375–0.645 captured the face but spilled a block onto the inner shoulders.
3. **Shipped:** `[0.398, 0.795, 0.12, 0.622, 1.0, 0.90]`, feather 0.04. The three-quarter membership
   render shows red on the face, crest, jaw and neck and nothing else — torso, arms, hands, legs and
   feet unclaimed. 14,590 of 134,971 vertices (10.8%).

### Scale chosen by measurement, not transfer

Sweep on the decimated mesh (unwrap and measure only, no projection):

| `uv_scale` | head front-facing | body front-facing |
| --- | --- | --- |
| 1.0 | 122² | 364² |
| 2.0 | 209² | 330² |
| 2.5 | 238² | 313² |
| **3.0** | **262²** | **299²** |
| 3.5 | 279² | 286² |
| 4.0 | 293² | 276² |
| 5.0 | 313² | 262² |

Shipped **3.0** — the smallest scale that clears the project's humanoid bar of face ≥ 256², for which
the body pays only 364² → 299². Deliberately not pushed further: the head occupies roughly
206 × 180 px in the source plate, so past about 260² the atlas is oversampling information the
reference does not contain, and every texel beyond that comes out of the crystal-mosaic body surface
where this NPC's identity actually lives.

Do **not** read 3.0 as a Falgravn (5.0) or Olms (4.0) number carried over. Those were tuned against
competing wing boxes on winged subjects. This was re-measured on this mesh.

## Triangle budget: 45,000, and the honest cost

45,000 is the **standard boss band** (20–50k). No hero exception was taken: Falgravn and Olms went to
70k only because thin wing membranes are the weakest case for marching-cubes reconstruction, and this
is a solid humanoid.

The cost is real and visible. The Hunyuan draft came out at **873,740 faces** — by far the highest in
this project, previous high 324,924 — because marching cubes resolves each of the several hundred
crystal spikes individually. Decimating 19.4× rounds the smaller spikes into blobs; compare
`clay/front.png` against the reference. Bytes leave 474 KB of headroom, so a higher-triangle variant
is *affordable*, but it would also push the chart count further toward the Colossus failure mode. I
did not build one. Flagging it as a judgement call for the owner rather than taking the exception
unilaterally.

## Verification performed

- Flat atlas inspected (`out/orphic-shattered-shard-atlas.png`) — not judged from renders.
- Five body views plus a head crop plus the replay-distance strip, all looked at.
- Clay renders of the decimated mesh (`clay/`) before any texture diagnosis.
- Box membership renders before projection (`box-check/`).
- Plate orientation confirmed by eye on `plates/front-native.png` / `back-native.png`.
- Build report checks: all passed, including `no_chroma_subsampling` read back from the GLB's
  quantization table.

**Not** verified, because it cannot be from here: behaviour in the actual replay. The renderer's
`transparent = true` and orient/scale/ground matrix are not reproduced by the viewer, and per the
project notes the replay cannot render on localhost at all.

## Files

```
out/orphic-shattered-shard-overview-v1.glb     ship candidate
out/orphic-shattered-shard-build-report.json   every number a reviewer needs
out/orphic-shattered-shard-atlas.png           lossless master atlas
out/orphic-shattered-shard-atlas-coverage.png  coverage mask
renders/body/{front,three-quarter,right,back,left}.png + replay-distance-strip.png
renders/head/                                  head crops
clay/                                          untextured geometry
box-check/{front,three-quarter,right,back,left}.png + sheet.png
plates/registration/{front-view-04,back-view-08}.png   rejected closeup overlays
orphic-shattered-shard.json                    the config that produced all of it
logs/                                          gpu-geometry, build, register
```

## Rights

The Elder Scrolls Online name, character design and related rights remain with ZeniMax
Media/Bethesda Softworks. Reconstructed from published screenshots for an authorized fan prototype;
not a claim that the IP is freely licensed.
