# Fight replay NPC — sequential GPU queue log

The RTX 4070 Ti Super (16,376 MiB) is treated as a **single-worker resource**. Exactly one GPU job
runs at a time, and the next job may not start until the previous process has exited and its VRAM
has been observed released.

Every job is recorded here **before** it starts, with its inputs, exact command, expected outputs,
and estimated VRAM. Attempts that fail are kept, not deleted — the failures are the useful part.

## Environment

- Generator: Tencent **Hunyuan3D-2mv** (`tencent/Hunyuan3D-2mv`, subfolder `hunyuan3d-dit-v2-mv`,
  fp16), repo at `B:/CodexScratch/eso-fight-replay-3d/Hunyuan3D-2/`, weights cached in that tree's
  `hf-cache/` (~17 GB, already downloaded).
- Interpreter: `B:/CodexScratch/eso-fight-replay-3d/.venv/Scripts/python.exe` — Python 3.11.15,
  `torch 2.11.0+cu128` (`cuda.is_available() == True`), `hy3dgen`, `trimesh`, `pymeshlab`, `xatlas`,
  `rembg`, and **`bpy` 5.0.0**.
- **There is no standalone Blender on this machine.** The `blender --background --python …`
  invocations in `tools/fight-replay-models/README.md` do not run as written. Every Blender step
  must be driven through the venv interpreter above, which supplies `bpy` as a module. A `--`
  separator must still be passed because the scripts slice `sys.argv` after it.

## Pre-flight (recorded 2026-09-04, before job 1)

`nvidia-smi` reported 3,063–3,357 MiB in use of 16,376 MiB with **zero compute (`C`) processes** —
every listed PID was `C+G` desktop/browser graphics (Brave, Edge, Xbox Game Bar, NVIDIA App,
Explorer, T3 Code). ~13.0 GiB free. No competing GPU-heavy process; the queue was clear to start.

---

## Job 1 — Captain Vrol, geometry reconstruction

| Field             | Value                                                                                                                                                                                                                                                                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NPC / model name  | Captain Vrol (Kyne's Aegis `boss_2`)                                                                                                                                                                                                                                                                                                     |
| Stage             | 1 of 4 — multiview geometry                                                                                                                                                                                                                                                                                                              |
| Status            | **complete — accepted**                                                                                                                                                                                                                                                                                                                  |
| Input assets      | `B:/CodexScratch/eso-fight-replay-3d/vrol-references/view-02.jpg` (front, full-body A-pose), `view-03.jpg` (back). Source: <https://esomodelviewer.com/characters/post/83-captain-vrol>, 10 plates at 1366x768 downloaded to that folder. Reference metadata reported by the page: 18.4k triangles, 9.4k vertices, 1.03 x 2.42 x 0.49 m. |
| Expected outputs  | `B:/CodexScratch/eso-fight-replay-3d/vrol-hunyuan/vrol-mv-raw.glb` (untextured draft mesh), plus background-removed plates in `.../vrol-hunyuan/prepared/`                                                                                                                                                                               |
| Estimated VRAM    | ~6–8 GiB (fp16 DiT, octree resolution 380, 50 steps). Fits in the ~13.0 GiB free.                                                                                                                                                                                                                                                        |
| Exit verification | process return code recorded; `nvidia-smi` re-checked for zero `C` processes and a return to desktop-only VRAM                                                                                                                                                                                                                           |

Command (single GPU process, run to completion before anything else touches the GPU):

```powershell
B:/CodexScratch/eso-fight-replay-3d/.venv/Scripts/python.exe `
  tools/fight-replay-models/generate-hunyuan-multiview.py `
  --front B:/CodexScratch/eso-fight-replay-3d/vrol-references/view-02.jpg `
  --back  B:/CodexScratch/eso-fight-replay-3d/vrol-references/view-03.jpg `
  --output B:/CodexScratch/eso-fight-replay-3d/vrol-hunyuan/vrol-mv-raw.glb `
  --prepared-dir B:/CodexScratch/eso-fight-replay-3d/vrol-hunyuan/prepared
```

Note on views: the reference set has a clean front and back but **no true left/right profile** —
the same gap Yandir hit, where a side plate was synthesized
(`yandir-references/generated-left-profile-v1.png`). Front + back only is attempted first because
real plates beat synthesized ones; a synthetic profile is the documented fallback if the silhouette
comes out flat in depth.

### Result

**Success on the first attempt, one GPU process, exit code 0.** Ran front + back only — no
synthesized side plate was needed or used. Draft mesh: 343,194 faces in **70.9 s** on the
RTX 4070 Ti Super (plus a ~100 s one-time model download). VRAM afterwards returned to 2,706 MiB
with **no compute process**, verifying release before any later stage started.

This was the only GPU stage the asset required. Stages 2–5 below are CPU/`bpy` work (~90 s total),
so the GPU sat idle from this point on.

| Stage       | Tool                                                                           | Compute         | Outcome                          |
| ----------- | ------------------------------------------------------------------------------ | --------------- | -------------------------------- |
| 1. Geometry | `generate-hunyuan-multiview.py`                                                | **GPU**, 70.9 s | 343,194-face draft               |
| 2. Color    | `project-two-view-vertex-colors.py`                                            | CPU             | Two-view vertex-color projection |
| 3. Polish   | `polish-yandir-overview.py --target-triangles 95000 --keep-first-mesh`         | CPU (`bpy`)     | Identity LOD                     |
| 4. Bake     | `bake-vertex-colors-to-texture.py --target-triangles 45000 --texture-size 512` | CPU             | 512px atlas                      |
| 5. Gate     | `prepare-static-boss.py --max-triangles 50000 --texture-size 512`              | CPU (`bpy`)     | Grounded, centered GLB           |

Final asset — independently re-parsed from the GLB container rather than taken from the operator's
report: 1 mesh / 1 primitive / **1 material** / 1 texture, **45,000 triangles**, 29,253 vertices,
512x512 PNG (368,340 bytes embedded), **1,575,876 bytes** total, bounds
`0.8587 x 1.9944 x 0.4041` with **min Y exactly 0** and X/Z centered, no skins, no animations, and
**no glTF extensions** (so no DRACOLoader requirement). Within every budget.

**Visual review (front, back, left, right, three-quarter, lit and unlit albedo, plus a 64 px
replay-distance strip):** silhouette, proportions, grounding, orientation, and scale are all
correct. The horned helm, pale ice hair, shoulder plates, tassets, bracers, and fur-trimmed boots
read clearly. **Texture is coherent — no fragmentation, speckling, or visible UV seams**, which was
the explicit failure mode to avoid. Identity is legible at replay distance from every angle.

Accepted limitation: the left/right views are the weakest — flanks are soft because the color is a
front↔back interpolation with no side plate. The _thinness_ is faithful rather than a defect
(depth:height 0.203 vs the reference page's 0.202; width:height 0.431 vs 0.426). Colors are muted
relative to the reference plates, but the accepted Yandir asset renders identically through the same
script, and the baked atlas was checked numerically (mean sRGB 92.5 vs 89.5/87.1 for the source
plates), so there is no value drift to correct.

---

## Pipeline lessons

Recorded as they are learned, so the next NPC does not repay the same cost.

1. **Blender is not installed.** The committed README's `blender --background` commands are wrong
   for this machine; drive `bpy` through the venv interpreter instead. The Yandir provenance claims
   Blender 5.2.1 while the installed `bpy` is 5.0.0, so the environment has already drifted from
   what produced the shipped asset.
2. **Reference imagery, not GPU time, is the real constraint.** Of the nine Kyne's Aegis actors,
   only Yandir and Vrol have studio-quality multiview plates. Confirm reference availability before
   scheduling any GPU work — a boss with one in-game screenshot cannot be reconstructed to the
   acceptance gate no matter how much GPU time it gets.
3. **Do not trust an untextured or single-angle render.** Yandir's history shows a 10,000-triangle
   candidate that visibly lost its projected colors, and a front-only comparison that hid UV seams.
   Always review front, back, both sides, and three-quarter.
4. **Two clean plates beat three plates where one is synthesized.** Yandir needed twelve GPU-heavy
   iterations partly because a fabricated left profile invented silhouette. Vrol ran front+back only
   and was accepted on the **first** attempt in 70.9 s. Prefer honest missing data over invented
   data; `--left`/`--right` are now optional in `generate-hunyuan-multiview.py` for this reason.
5. **Calibrate a suspected color problem against an already-accepted asset before "fixing" it.**
   The Vrol bake looked washed out, then looked dark; rendering the accepted Yandir GLB through the
   same script reproduced both, proving the renderer — not the atlas — was responsible. A blind
   correction here would have permanently damaged a correct texture.
6. **Judge a texture by its flat atlas, never by renders alone.** A fragmented atlas can still
   render acceptably from the angles you happen to check. Extract the embedded image and look at it.
7. **Prefer texel-space projection over vertex-colour baking.** Vertex colours cap surface detail at
   the vertex count; on a 45k-triangle asset that is roughly 19x less colour information than the
   atlas can hold.
8. **Reject reference plates whose registration you cannot verify.** A closeup that will not register
   reliably (silhouette running off-frame, correlation peak pinned to the search boundary) must be
   dropped, not forced — forcing it maps the wrong body part onto the mesh.
9. **The polish/export scripts hardcode Yandir's identity.** `prepare-static-boss.py` sets the
   object name and `bake-vertex-colors-to-texture.py` names the material `YandirBakedVertexColor`,
   so every new NPC inherits Yandir naming. Vrol's GLB was corrected by rewriting only the JSON
   chunk (binary copied byte-for-byte). Parameterize these names before the next asset.

---

## Job 2 — Captain Vrol, texture rebuild (v2)

**Status: complete — accepted, supersedes v1.**

v1 was **rejected on review**. Extracting its embedded atlas and looking at the flat texture (rather
than only at rendered angles) showed hundreds of tiny fragmented islands of smeared colour — exactly
the "fragmented/speckled UV projection" this gate forbids. The rendered views concealed it. **Always
open the flat atlas; renders can hide a broken texture.**

### What actually fixed it

**The cause was the colour carrier, and only the colour carrier.**

Colour had been carried as vertex colours and only baked to a texture at the end, capping detail at
~29k vertex samples against the ~571k texel samples a 1024px atlas holds — a 19x difference.
`transfer_colors`' KD-tree inverse-distance blend compounded it by smoothing across the surface and
pulling colour through thin limbs. The atlas was mush because the colour data was mush.

The fix is texel-space projection: each texel is unprojected to its surface point and normal,
projected into the front and back reference cameras, and blended by facing angle with occlusion
rejection.

A secondary real gain came from **registered closeup plates**: `view-07`/`view-08` (front/back torso,
~2.1x the linear resolution of the full-body plates) registered by silhouette-profile matching.
`view-04` (helm) was correctly **rejected** — its silhouette runs off the frame edge, profile matching
falsely locked onto the torso, and masked NCC peaked at 0.492 pinned to the search boundary.
Registration that cannot be verified must be rejected, not forced.

### A false lead, recorded so it is not repeated

An initial diagnosis blamed `trimesh.simplify_quadric_decimation` for shredding the mesh into
hundreds of disconnected shells. **That was wrong.** The measurement was confounded:
`trimesh.merge_vertices()` on a mesh carrying UVs welds only vertices matching in _both_ position and
UV, so every UV chart boundary reads as a mesh boundary. Welding on POSITION alone shows the shipped
geometry was always sound:

| Asset             | as-stored shells / boundary | POSITION-welded shells / boundary |
| ----------------- | --------------------------- | --------------------------------- |
| Yandir shipped v1 | 491 / 13,020                | **4 / 0**                         |
| Yandir rebuilt v2 | 350 / 12,056                | **2 / 0**                         |
| Vrol rebuilt v2   | 382 / 11,757                | **3 / 3**                         |

Testing the decimator directly confirms it: 3 shells in, 4–5 shells out, **0 boundary edges**. It does
not damage topology. Swapping to Blender's collapse modifier was therefore **neutral**, and the island
reduction (491 → 350) came from xatlas option tuning, which is worth little on its own.

**Never compare shell counts between a UV-mapped mesh and a UV-less one, and never read shell count
off an exported GLB** — glTF splits vertices at every UV seam, so an unwrapped export reports roughly
one shell per chart regardless of mesh health.

### Candidate rejected: Hunyuan3D Paint

**Blocked, and would have been wrong anyway.** Its pipeline hard-requires the `custom_rasterizer`
CUDA extension with no fallback branch; this machine has no CUDA Toolkit (`nvcc` absent) and no MSVC,
so building it needs a multi-GB toolchain install. It never allocated GPU memory — it failed at
pipeline construction. Independently: Hunyuan3D Paint is conditioned on a **single front image** and
diffuses the remaining surfaces, so it would have hallucinated a back and sides while we hold a
genuine back plate. That conflicts with the no-fabrication rule.

### Result

44,999 triangles, 28,732 vertices, 1 mesh / 1 material / 1 draw call, 1024x1024 JPEG q92,
**1,746,004 bytes**, bounds 0.8591 x 1.9938 x 0.4039, min Y exactly 0, no skins/animations/extensions.
Stored as JPEG because the identical texture as PNG is 2,764,516 bytes — over the 2.5 MB gate.

Reviewed front, back, left, right, three-quarter, the flat atlas, and a v1-vs-v2 torso A/B. The chest
ornament is now symmetric and defined, chainmail rings resolve individually, and the fringe and scale
armour are crisp. Accepted.

**Honest residual defect:** the left and right profiles streak horizontally. ~34% of texels face
neither camera squarely and receive silhouette-edge pixels stretched sideways. A confidence-
thresholded 3D inpaint was attempted and dropped — it made the atlas blotchier without improving the
render. Irreducible with two views.

**Source ceiling:** the character occupies 717 x 289 px in the 1366x768 plates, ~200k opaque pixels
across both views, against 1,048,576 texels in a 1024px atlas — roughly 5x oversampled. No projection
method can exceed what the plates carry.

---

## Job 3 — Yandir the Butcher, texture rebuild (v2)

**Status: complete — accepted, supersedes v1. No GPU compute required.**

Yandir shipped with the same vertex-colour defect as Vrol v1: a featureless, plastic-looking surface
with no readable detail. That is a concrete, documented defect, which is the only condition under
which the standing instruction permits replacing existing Yandir work.

**Geometry was not touched.** The rebuild starts from the reviewed 90,891-triangle
`yandir-overview-polish-v17-body-only.glb` named in the existing provenance — no regeneration, no
re-sculpt, no restyle. Final dimensions `0.9414 x 1.9927 x 0.3990` match the shipped
`0.941 x 0.399 x 1.993`. Because the geometry was reused, this job needed **no GPU compute at all**;
it was entirely CPU/`bpy` work, and VRAM stayed at desktop-only levels throughout.

| Metric                                    | v1 shipped | v2 rebuilt                      |
| ----------------------------------------- | ---------- | ------------------------------- |
| Triangles                                 | 45,000     | 45,000                          |
| Vertices                                  | 29,397     | 28,854                          |
| Texture                                   | 512px PNG  | **1024px JPEG q92**             |
| Bytes                                     | 1,848,216  | **1,715,468**                   |
| UV islands                                | 491        | **350** (mean 128.6 faces each) |
| Shells / boundary edges (POSITION-welded) | 4 / 0      | **2 / 0**                       |

Source subject resolution: 690 px tall by 300 px wide in the 1366x768 plates, ~200k opaque pixels
across both views — the same ~5x oversampling ceiling at 1024² that Vrol has. Atlas coverage 571,441
of 1,048,576 texels (54.5%); front visibility 46.5%, back 44.8%, neither 11.8%.

Closeup plates `view-07`/`view-08` registered at 4.99% and 4.77% width error and were used. Helm
closeups were not attempted, following Vrol's failed NCC verification.

**The synthesized left profile was deliberately not used.** v1's colour drew on the fabricated
`generated-left-profile-v1.png`; the gate forbids invented detail, so v2 uses the two genuine plates
only. The stated consequence is that the side views streak, as Vrol's do — though they still beat
v1's noticeably.

Reviewed the flat atlas, all five angles, and a v1-vs-v2 A/B. The improvement is larger than Vrol's:
v1 is a smooth blob with no readable feature; v2 resolves the rivetted chest plate, scalloped fur
trim, quilted sleeves, chainmail bracers, belt buckle, fur tassels and pouches — same identity
throughout (teal cloth, pale fur, brown leather, red beard). Accepted.

---

## Job — Saint Olms the Just (2026-09-06)

Single GPU job, one operator, no concurrent GPU work.

- **Input:** config `tools/fight-replay-models/npcs/saint-olms.json`; plates
  `saint-olms-references/view-01.jpg` (front) and `view-03.jpg` (back), letterboxed to a shared
  2415 px square.
- **Command:** `tools/fight-replay-models/build-npc-asset.py` driven by that config.
- **Reconstruction:** Hunyuan3D-2mv, 194,988 faces, **91.3 s**, exit 0, VRAM released and confirmed
  idle before any further work.
- **Output:** `build/saint-olms/out/saint-olms-overview-v1.glb` — 70,000 tris, 44,924 verts,
  2,277,308 bytes, 744 charts, 72.1% coverage, PSNR 39.0 dB. All checks passed, no warnings.
- **Accepted.** Shipped as `public/models/fight-replay/npcs/saint-olms-overview-v1.glb`.

Two engine features had their first real use here and both held up: **letterboxed framing** (the
first subject wider than tall — 1805 px of wingspan against 738 px of height) and **`regions.boxes`**
(the first subject whose head is not at the top of the silhouette, so no scalar `head_v_min` could
select it). Box placement was verified with a membership render _before_ the GPU job rather than
inferred from metrics afterwards; that check is now the standing rule for box-driven builds.

A 75,000-triangle variant was built first and rejected — 2,447,876 bytes, only 52 KB under the
2.5 MB gate, at identical region balance. Byte headroom beat triangle count.

## Job — Lord Falgravn (2026-09-06) — INTERRUPTED, no output

Started immediately after Olms. Plates were prepared and orientation verified by eye
(`build/lord-falgravn/lord-falgravn.json` records the evidence, because this plate set had once been
re-dropped with front and back swapped). The process was **killed by the host, not by a failure**,
just after the Hunyuan model finished loading — `build/lord-falgravn/logs/gpu-geometry.log` ends
there and `build/lord-falgravn/out/` is empty. GPU returned to idle (~2.4 GB, no compute process),
so no cleanup was required and the job is safe to restart from the existing config.

## Job — Lord Falgravn (2026-09-06) — completed

Single operator, no concurrent GPU work. GPU confirmed idle before starting (2.8 GB, all
compositing, no compute process).

**Correction to the interrupted-attempt entry above.** It records the kill as landing "just after the
Hunyuan model finished loading". Re-reading `build/lord-falgravn/logs/gpu-geometry.log` in full, its
final line is `Saved build\lord-falgravn\lord-falgravn-draft.glb with 240,420 faces in 65.8s` — the
**GPU stage had already completed** and the draft mesh was on disk. Only `out/` was empty. So this
session ran **no GPU reconstruction at all**; the remaining work was CPU-side (decimate, unwrap,
projection, prepare, encode) plus EEVEE review renders.

- **Input:** config `tools/fight-replay-models/npcs/lord-falgravn.json`; plates
  `lord-falgravn-references/view-01.jpg` (front) and `view-03.jpg` (back), letterboxed to a shared
  1311 px square. Orientation re-verified by eye on `plates/front-native.png` and
  `plates/back-native.png` before any projection.
- **Command:** `tools/fight-replay-models/build-npc-asset.py` driven by that config.
- **Reconstruction:** Hunyuan3D-2mv, 240,420 faces, **65.8 s** — carried over from the interrupted
  session, not re-run.
- **Output:** `build/lord-falgravn/out/lord-falgravn-overview-v1.glb` — 70,000 tris, 44,724 verts,
  2,259,112 bytes (240,888 under the 2.5 MB gate), 693 charts, 70.5% coverage, PSNR 39.87 dB,
  visibility neither-camera 5.6%. All checks passed, no warnings.
- **Accepted.** Shipped as `public/models/fight-replay/npcs/lord-falgravn-overview-v1.glb`. Kyne's
  Aegis bosses are now complete.

Box placement was verified on a membership render before the projection, per the standing rule from
Olms, and it immediately paid: the first skull box claimed the horns and cranium but **left the face
outside it**, which no metric in the build report would have revealed.

One extra CPU build was run and rejected: `envelope_sigma` 8.0 against the default 3.0, testing
whether the dark band on the wing leading edges is the v-driven envelope defect. It is not — PSNR
moved 39.87 -> 39.97 dB and the band was essentially unchanged, so the default was kept. The variant
lives at `build/falgravn-sigma8/` as evidence. Do not re-run it; the real fix is a registered wing
closeup.

---

## Job — Orphic Shattered Shard (2026-09-07)

First coverage of **Lucent Citadel**, a trial that previously had nothing.

- **Input:** config `tools/fight-replay-models/npcs/orphic-shattered-shard.json`; plates from
  `orphic-shattered-shard-references/` (1920x1080, subject 1005 x 1029 px — the best plate supply
  of any asset built so far), letterboxed to a 1336 px square.
- **Output:** 44,999 tris / 32,092 verts / 2,025,356 bytes (474 KB under the gate), 855 charts,
  73.4% coverage, PSNR 35.26 dB. All checks passed; one warning, recorded below.
- **Accepted**, with the caveats below stated rather than smoothed over.

**Three numbers are worse than the shipped set, and each has a known cause:**

1. **PSNR 35.26 dB** against Falgravn's 39.87 and Olms' 39.0. This is not a projection failure —
   the atlas is a high-frequency crystal mosaic, which is the content JPEG handles worst. The flat
   colour blocks that let the humanoid assets reach 39 dB simply are not present here.
2. **18.1% "neither camera"** against Olms' 6.9% and Falgravn's 5.6%. The subject is hunched, so
   the backs of its thighs face _downward_ and no front or back camera sees them. This is the grey
   banding visible on the legs in the back and side renders, and it is inherent to two views on
   this pose rather than a bug.
3. **855 charts at 52.6 faces each**, between Olms (744 at 94) and the rejected Dwarven Colossus
   (1,406 at 17). Several hundred crystal spikes, each becoming its own chart.

**The head mask does not resolve.** The build's own detector flagged a head-band run mismatch on
**44 of 64 slices (69%)** — the Celestial Serpent failure mode, where a wide spiked crest breaks
silhouette-normalised `u`. Two head closeups were tried and both rejected: `view-04` because its
best scale fell outside the seeded window and the shoulder detection was flagged unreliable, and
`view-08` **despite it having the lowest width error measured on this subject (4.57%)** — the
Siroria lesson, that a good width metric is not evidence of correct registration. Mitigating: this
head has no face to lose, and at replay distance all five angles read correctly. A straight-on
orthographic head plate is the single highest-value follow-up for this asset.

**The box check caught a defect for the second consecutive build.** The first placement
(`y0=0.885`) claimed the crown and crest and left the entire face outside the box — invisible to
every downstream metric. Caught on the membership render before any projection time was spent.

**Triangle budget was deliberately left at 45k rather than taken as a hero exception.** The Hunyuan
draft was **873,740 faces**, 2.7x the previous project high, because marching cubes resolves every
crystal spike. Decimating 19.4x visibly rounds the smaller spikes, and there are 474 KB of byte
headroom, so a higher-triangle variant is affordable — but it would push chart count toward the
Colossus failure mode. Worth revisiting deliberately rather than by default.

**Operational finding: the GPU was never the bottleneck here — system RAM was.** The first
plate-cut died with an onnxruntime out-of-memory because another agent was concurrently running
`build-npc-asset.py` for the Saint Llothis regression check (8.9 GB working set, 1.3 GB free of
31.7 GB). `onnxruntime` in this environment is **CPU-only**, so rembg is a 6-9 GB _system RAM_
consumer, not a GPU one. **The single-worker rule covers the GPU but not the CPU stages, and the
CPU stages are the memory-hungry ones.** Extend the rule accordingly.

---

## Job — Lightning Storm Atronach (2026-09-08) — **no GPU used**

Route B. Logged here anyway so the record of attempts stays in one place: the point of this entry is
that the expensive stage was **skipped**, not that it succeeded.

- **Input:** config `tools/fight-replay-models/npcs/lightning-storm-atronach.json`; geometry
  `StormAtronach_A_Basic.glb` off `feat/trial-boss-models` (4,425 tris, 96 welded shells, arrived
  +Y up / +Z front / feet at y=0 in game units, normalised to height 2.0 by `prepare-static-boss.py`);
  plates `storm-atronach-references/view-01.jpg` (front) and `view-03.jpg` (back) at 1920x1080, cut to
  a shared 1059 px square, subject **981 x 816 px**.
- **Reconstruction:** none. Hunyuan was not loaded, no CUDA context was created, VRAM was untouched.
  Peak system RAM was ordinary CPU projection use; `rembg` ran on two plates only.
- **Output:** `out/lightning-storm-atronach-overview-v1.glb` — 4,425 tris / 4,991 verts /
  600,496 bytes (1.9 MB under the gate), 563 charts, 86.6% coverage, **PSNR 39.56 dB**, neither-camera
  31.5%, grazing fill 54.9%. All checks passed; one warning (head run mismatch, 41% of slices).
- **Accepted.** Completes **Aetherian Archive**.

**The box check caught a defect for the third consecutive build**, in a new form. The first placement
(`y0 = 0.72`) claimed the whole shoulder-rock yoke and the crown, not the face; the membership render
showed it immediately and no downstream metric would have. The final box was then verified a second
time by drawing it back onto the front plate, which is worth adopting generally — it costs one crop
and it tests the box in the space the projection actually samples.

**The automatic shoulder detector returned 0.9378 on this shape** (the levitating crown slab sits
above the face — the Cloudrest Shade failure mode). That also silently broke `--region head`
registration: it confined matching to the top 6% of the subject, so `view-04` scored a healthy-looking
**7.79%** on a crown-to-crown fit that never saw the face. `register-npc-plates.py` has **no
`--head-v-min` override**, so there is currently no way to hand-correct the band for a closeup
registration. Worth adding; it is the only reason this asset has no head plate.

All three closeups were rejected on their overlays. `view-06` scored the **lowest** error of the
three (14.46%) and had the **worst** placement (across the boots) — the fourth independent
confirmation that width error is not a reliability signal.

---

## Job — Ozara (2026-09-08) — GPU reconstruction

Queued as the sole heavy worker. Free system RAM before start **15.9 GB of 31.7**; VRAM 2.9 GB of
16.4 in use by the desktop. Route C, because the extracted `Lamia_A_Boss` cannot be used.

**Why the extracted mesh is out, and a correction to the manifest.** The manifest suspected
`Lamia_A_Boss` of being a _partial extraction_ on the basis of its bbox (1.14 x 4.08 x 0.46) and told
the next session to verify that before spending anything. It was verified, on a clay render, and the
suspicion is wrong: the extraction is **complete** — torso, arms, head and crest are all present —
but the serpent tail is in a **straight-down bind pose**, so the model is a pencil with the torso
crushed into its top fifth. Identical failure to Xalvakka's `Harvester_Monstrous_Boss`. That makes a
tail-coil deformer worth **two** bosses rather than one, which changes its value considerably.

- **Input:** `ozara-lamia-red-references/view-01.jpg` (front) and `view-03.jpg` (back), 1920x1080,
  cut to a shared 1253 px square, subject **985 x 770 px**. Letterboxed rather than clamped.
- **Reference risk, recorded before the run:** the torso, arms and head correspond well between the
  two plates and the subject heights match to 6 px (979 / 973), but the **tail does not** — the front
  plate shows it coiled compactly at the base while the back plate shows it sweeping far out to frame
  left. The tail is most of this silhouette, so this is the one thing that can sink the
  reconstruction. Judged worth 90 s of GPU to find out rather than more analysis.

- **Reconstruction:** Hunyuan3D-2mv, fp16, 50 steps, octree 380, seed 12345. **495,594 faces in
  68.0 s.** Process exited cleanly; VRAM returned to 2.87 GB (desktop baseline) before the next
  stage. Peak free RAM never fell below the safe band — only two plates went through `rembg`.
- **The stated risk did not materialise.** Judged on the clay render before any texture work, per the
  standing rule: the model reconciled the two disagreeing tails into one coherent sweeping tail
  rather than a blob. Draft accepted.
- **Output:** `out/ozara-overview-v1.glb` — 45,000 tris / 27,743 verts / 1,642,884 bytes (857 KB
  under the gate), 353 charts, 67.2% coverage, **PSNR 37.7 dB**, neither-camera **14.7%**, grazing
  fill 35.1%, head region **76,936 front-facing texels (~277²)**. All checks passed; one warning
  (head run mismatch, 30% of slices — the lowest rate measured on any asset here).
- **Accepted.** Completes **Sanctum Ophidia**.

**A new head-box trap, distinct from the shoulder-detector one.** `head_v_min` failed here not
because of a crest or a wingspan but because the **tail** dominates the normalised bounding box: it
sweeps the bbox to 1.505 x 1.984 x 1.927 while the entire body sits inside x 0.25-0.62, z 0.79-0.94.
The detector suggested **0.6249**, which is the hips. Any subject with a long limb, tail or wing well
away from the body will do this, and no scalar can survive it — reach for `regions.boxes`
immediately rather than testing the detector first.

**All six closeups rejected, and two of them in a way not seen before:** `view-04` and `view-11`
returned **NO VIABLE FIT** — no candidate scale inside the registrar's seeded window at all, because
this gallery's head closeups sit at a far nearer camera than its base plates. That is a cleaner
failure than a confident wrong answer and is worth preferring. `view-07` scored **5.74%, the lowest
error on this subject**, and was still rejected: its ghost hands sit half a hand-width up-left of the
real hands.

---

## Job — Xalvakka (2026-09-08) — GPU reconstruction

Queued after Ozara, sequentially, never concurrently. Free RAM before start **13.1 GB of 31.7**;
VRAM confirmed back at the 2.33 GB desktop baseline after the Ozara job exited before this one began.

- **Input:** `xalvakka-harvester-dagonic-references/view-01.jpg` (front) and `view-03.jpg` (back),
  1920x1080, cut to a shared 1057 px square, subject **994 x 585 px**.
- **Reconstruction:** Hunyuan3D-2mv, fp16, 50 steps, octree 380, seed 12345. **663,362 faces in
  60.9 s.** VRAM returned to baseline (2.34 GB) immediately after.
- **This was the cleanest opposed pair used on this project.** Both plates agree on the tail coil,
  the four arm angles and the subject height. The reconstruction shows it: the head run-structure
  warning fires on only **13 of 64 slices (20%)**, the lowest rate of any asset built here.
- **Output:** `out/xalvakka-overview-v1.glb` — 44,998 tris / 31,232 verts / 1,765,596 bytes,
  692 charts, 72.7% coverage, PSNR 37.26 dB, neither-camera 22.9%, grazing fill 42.9%, head region
  52,228 front-facing texels (~228²). All checks passed; one warning.
- **Accepted.** Rockgrove is now complete except Flame-Herald Bahsei.

**The tail-coil deformer is cancelled.** It was planned to rescue `Harvester_Monstrous_Boss`
and, after the Ozara diagnosis, `Lamia_A_Boss` too. Both bosses shipped today as Route C
reconstructions instead. Reconstructing from plates sidesteps a bind pose rather than correcting it,
and it costs about a minute of GPU against an unknown amount of deformer work.

**A box-placement technique worth adopting.** Two placements were rejected here before the third was
accepted, and the fix was not to nudge and re-render. Colour **three adjacent bands at once** in
`boxes.json` and read off which one holds the face from a single membership render. It also caught a
misreading: the first two boxes _did_ contain the face, but on a subject with a small head, a box
claiming horns and face looks at contact-sheet scale like a box claiming horns only.

**Fifth confirmation that width error is not a reliability signal.** `view-05` scored **5.44%, the
lowest on this subject**, and its overlay shows two pairs of eyes and two tooth rows. Also new:
`view-04` and `view-11` returned fits identical to three decimal places, which is how you find out
two gallery frames are duplicates.

---

## Job — Ra Kotu (2026-09-08) — GPU reconstruction, **REJECTED**

Built, measured, and not shipped. Recorded so nobody spends the GPU minute again, and because the
measurement produced the most actionable outstanding capture request.

- **Input:** `air-atronach-boss-references/view-01.jpg` / `view-03.jpg`, 1920x1080, cut to a shared
  1569 px square, subject **996 x 950 px**. The post body names "Parel Nirus **Ra Kotu**", so the
  reference is certain; this was never a reference problem.
- **Reconstruction:** Hunyuan3D-2mv, 50 steps, octree 380, seed 12345. **1,644,516 faces in 62.0 s**
  — nearly double the previous project high of 873,740, because the subject is a cluster of
  unconnected levitating stones and marching cubes resolves every one. Decimation to budget is
  **36.5x**, the steepest attempted here.
- **Result:** 45,000 tris, 824 charts, 71.1% coverage, PSNR 38.3 dB, **neither-camera 38.8%**,
  57.0% of covered texels below the grazing threshold, **44.4% neighbour fill**.
- **Rejected on the flat atlas.** The five review renders and the replay-distance strip both read
  acceptably — carved stone, spiral relief, blue eye glow — and on those alone this would have
  shipped. The atlas says otherwise: it is almost entirely directional smear and sub-chart confetti,
  with the eye glow strewn across dozens of charts and essentially no legible carved relief anywhere.
  That is the Dwarven Colossus signature. **Fresh confirmation of the standing rule: judge a texture
  by its flat UV atlas, never by renders.** This is the first time on this project that the rule has
  overturned a decision that the renders had already won.
- 38.8% blind also sits outside the shipped band (5.6%-31.5%).

**Do not re-run this as a two-view build, and do not try more cameras on the reconstruction.** But
**do not file it with the Colossus either — the diagnosis is the opposite one.** The Colossus was
_interior_-limited: four cameras moved it 62.0% -> 53.4%, 2.0 points, the worst return measured.
Ra Kotu is **camera-limited**: `measure-view-coverage` puts four cameras at **40.1% -> 18.8%** blind
and grazing fill at 53.8% -> 34.1%. That **21.3-point** gain is the **largest measured on this
project**, and 18.8% would put him comfortably inside the shipped band.

**So Ra Kotu is unblocked by exactly one thing: a single full-body PROFILE capture** (left or right,
same pose, plain backdrop, >=660 px subject). That is a far cheaper ask than the front/back/closeup
set every other blocked boss needs, and it is the highest-yield item on the capture list.

**Also settled: Ra Kotu cannot be built on Tideborn Taleria's mesh.** The standing note said the two
share geometry and differ only in skin, making him "a second cheap build off the same mesh". They do
not. Normalised, `AirAtronach_Coral_Boss` is **3.86 x 3.17 x 2.0** with the arms splayed far out to
the sides; Ra Kotu's plates show a compact roughly 1:1 subject (996 x 950 px) with the arms hanging
close to the torso. Different geometry, not a recolour. Neither an alias nor a Route B host.

---

## Screened out without a GPU job — Archcustodian and Chimera (2026-09-08)

Directly after the Ra Kotu rejection, the same measurement was run **before** committing any GPU
time, on the extracted client mesh of each species. No reconstruction was attempted for either.

| Candidate     | Mesh screened                      | 2-camera blind | 4-camera blind |
| ------------- | ---------------------------------- | -------------: | -------------: |
| Ra Kotu       | (its own reconstruction)           |      **40.1%** |          18.8% |
| Archcustodian | `DwarvenSpider_FrostAtronach_Base` |      **40.4%** |          26.0% |
| Chimera       | `Chimera_A_Basic`                  |      **37.7%** |          21.6% |

All three sit above the top of the shipped band (31.5%), and the screen's error is asymmetric in the
direction that makes a high reading trustworthy (see the runbook). Ra Kotu confirmed the reading
empirically: screened 40.1%, built 38.8%, rejected on its atlas.

**The important part is that these three are not three coincidences.** Every remaining Route C trial
boss with usable plates is a **quadruped, an arachnid or a floating cluster** — shapes whose limbs
point at the cameras and are foreshortened to nothing in both views. The bipedal and humanoid
subjects, which two views cover at 5.6-31.5%, have all been built already. **The residue of this
project is systematically the shape that two-view projection cannot do.**

So the next unit of progress on trial bosses is **not another two-view build**. It is a **profile
plate** — one per subject, which is a much smaller ask than the front/back/closeup set the fully
blocked bosses need, and the pipeline already supports left/right cameras via
`reference.side_plates`. Ranked by what a single profile buys:

| Subject       | Blind now | Blind with profiles |            Gain |
| ------------- | --------: | ------------------: | --------------: |
| Ra Kotu       |     40.1% |               18.8% | **21.3 points** |
| Archcustodian |     40.4% |               26.0% |     14.4 points |
| Chimera       |     37.7% |               21.6% |     16.1 points |

Note the gallery caveat that applies to all three: `dwarven-spider-references/view-05` looks like a
profile in a contact sheet and is not one - it is elevated and pushed in, looking down at the body.
Verify framing, not just angle.

---

## Job — Boneman / skeleton archetype (2026-09-08) — GPU reconstruction

The first **archetype** build: one body for a measured family of 32 dungeon actor names, rather than
for one encounter.

- **Input:** `boneman-references/view-01.jpg` (front) and `view-03.jpg` (back), 1920x1080, cut to a
  shared 1052 px square, subject **994 x 466 px**. A textbook set — clean opposed A-pose, level
  camera, plain backdrop, plus skull and torso closeups.
- **Reconstruction:** Hunyuan3D-2mv, 50 steps, octree 380, seed 12345. **287,774 faces in 84.1 s.**
- **Screened before any projection time: 23.1% blind**, inside the shipped band. Final measured
  **24.3%** — the screen was within **1.2 points**, its second consecutive accurate call.
- **Output:** `out/boneman-overview-v1.glb` — 4,997 tris / 4,317 verts / **287,232 bytes**, 223
  charts, 76.7% coverage, PSNR 37.85 dB, 45.3% neighbour fill. All checks passed, **no warnings** —
  the head run-structure detector did not fire at all.
- **Accepted.**

**The expected failure did not occur.** A skeleton is mostly holes, and two-view reconstruction was
expected to fuse the ribs and gaps into a smooth mannequin. It
resolved individual ribs, the pelvis, a segmented spine, separated arm bones and articulated hands.
Marching cubes handles a concave, perforated subject better than the intuition suggests, at least
when the silhouette is unambiguous.

**A fourth shoulder-detector failure mode: the RIBCAGE.** The detector returned **0.7043** here,
because a skeleton's widest upper-body row is its ribs, not its shoulders. The three modes previously
recorded are head ornaments, robe cones and wingspans; add this one. Hand-set to 0.86 with the new
`--head-v-min`, measured off the mesh.

**That produced the first accepted closeup since the Saints.** `view-04` registers cleanly on the
skull — one skull, one pair of eye sockets, one tooth row, no doubling — after **15 consecutive
rejections** across the three preceding boss builds. It would not have been possible
before `--head-v-min` existed, which retires the "the band might have been the problem" ambiguity for
good.

`view-07` scored **4.84%, the lowest error on this subject, and was rejected** — the overlay doubles
both hands. Sixth confirmation that width error is not a reliability signal.

## 2026-10-04 — serialized continuation and lesser-enemy expansion

Operator: Codex root in `t3code-7c9dfcb6`; reference agents perform CPU-only research.
The owner's new request expands the target to lesser enemies and trial adds. Research outputs live
in `scratch/lesser-enemy-models-2026-10-04/`; all generated meshes remain unaccepted drafts until
geometry, texture registration, and identity have been reviewed.

Prelaunch checkpoint: RTX 4070 Ti SUPER, 16,376 MiB total, 13,480 MiB free, 18% utilization.
Estimated reconstruction allocation is 6–8 GiB. Root serializes these prepared jobs through:

```powershell
& 'B:/CodexScratch/eso-fight-replay-3d/.venv/Scripts/python.exe' 'scratch/lesser-enemy-models-2026-10-04/run_gpu_queue.py' --generate
```

The immutable source configs are in
`scratch/trial-reference-research/continuation-batch/shape-round2/generation-prep/queue.json`:

1. `archcustodian-four-native.config.json`: four complete native camera-matched views.
2. `count-ryelaz-complete-folded-front.config.json`: complete native folded-wing front.
3. `yaseyla-main-phase-lower-res-experimental.config.json`: explicitly lower-resolution main-phase
   reference; exploratory only.

New outputs are isolated under `scratch/lesser-enemy-models-2026-10-04/geometry/<config-name>/`.
`gpu-events.jsonl` records exact prepared commands, input config and launcher SHA-256 hashes,
start/exit events, output hashes, and observed post-exit free VRAM before the next launch. Each
child requires at least 8,192 MiB free and utilization no higher than 25%; failed jobs stop the queue.
The log is recorded before any launch. No earlier experiment is overwritten.

All three continuation children exited successfully and released VRAM before the next child.
Raw geometry output hashes and timings are recorded in `gpu-events.jsonl`; none is accepted for
runtime. Archcustodian's CPU clay review preserves six segmented legs, with three tiny fragments
requiring inspection. Appearance and exact encounter skin remain unverified.

### Lesser-enemy queue, prepared before launch

Observed preflight: 16,376 MiB total, 13,648 MiB free, 8% utilization. Root launches the same
serialized runner with `--configs scratch/lesser-enemy-models-2026-10-04/generation-prep/lesser-queue.json`.
Expected allocation remains 6–8 GiB per child, with the same release guard and stop-on-failure.

1. Green Ogrim: native full-body front/back, approximately 1,000 px body height.
2. Dwarven Centurion: full front/rear three-quarter pair; conditioning is approximate.
3. Dwarven Sphere: full front/rear three-quarter pair; conditioning is approximate.
4. Haj Mota: full front/rear three-quarter pair; experimental camera assignment.
5. Coral Haj Mota: separate variant, full front/rear three-quarter pair.
6. Gray Wolf: one complete native front-left three-quarter view; unseen surfaces inferred.

The Dwarven Spider uses the new Archcustodian family geometry for review rather than launching
the identical four input plates a second time. This is proposed generic-species reuse only;
neither exact Archcustodian skin nor runtime acceptance is established.

### Additional lesser-enemy queue, prepared before launch

The next root-operated batch uses `generation-prep/additional-queue.json` in the same research
directory and the same serialized launcher, 8,192 MiB free-memory guard, utilization guard, and
observed post-child release. Configs preserve native RGB and record original source hashes.

1. Flame Atronach: complete near-cardinal front/back; native body heights 1,001/999 px.
2. Strangler: complete native front, 1,312 px body height; back and profile inferred.
3. Golden Lamia: complete native front, 999 px body height; oblique rear excluded from conditioning.
4. Bull-Horned Magma Frog: complete native front, 1,013 px body height; rear inferred.

These are unaccepted research drafts. Front-only jobs cannot establish unseen morphology or
texture coverage. Root records the actual preflight in `gpu-events.jsonl` immediately before
launch and stops instead of starting another process if the guard fails.

### Third lesser-enemy queue, prepared before launch

The next serialized batch is `generation-prep/third-queue.json`. Root remains the only GPU
operator and uses the same preflight, stop-on-failure, and observed memory-release guards.
Every prepared plate preserves original RGB, with CPU-only alpha extraction and padding.

1. Ordinary green Argonian Behemoth: native front and elevated rear three-quarter pair,
   1,013/1,010 px body height; exact rear camera is uncalibrated.
2. Generic Stone Atronach: single complete oblique view, 993 px body height.
3. Red folded-wing Harpy: single complete front, 696 px body height; rear inferred.
4. Crouched Banekin: single complete oblique front, 936 px body height.
5. Brown Bear: single complete oblique front, 860 px body height; source red effects recorded.
6. Crocodile: single high dorsal/front oblique view, 907 px body height.
7. Kwama Warrior: single dark oblique front, 880 px body height; small residual background flecks.

Prelaunch independent inspection deferred Nix-Hound: its mouth/antenna tip meets the native
image boundary, so a complete silhouette is not established despite 861 px body height.
The root launch list is `generation-prep/third-queue-reviewed.json`, containing these seven
jobs. The original eight-entry preparation list is retained as provenance and is not launched.

The first two lesser batches completed ten geometry jobs with observed memory release after
every child. Independent pixel auditing then found altered foreground RGB in the four Haj Mota
and Coral Haj Mota prepared plates. Those two first-pass drafts are explicitly invalidated for
strict native-RGB provenance. Corrected plates and separate reruns will preserve original RGB
plus the existing alpha without resizing or overwriting the first pass.

These jobs are exploratory drafts, not runtime registrations or broad alias assignments.
Imp, organic Spider and orange Senche failed full-body reference/mask checks and are deferred.
The exact native source, camera limitations, configuration hash, output hash and child timings
remain in the research manifests and `gpu-events.jsonl`.

### Recovery and exact-RGB reruns, recorded before launch

The third queue completed Behemoth, Stone Atronach and Harpy. Banekin's first
child exited with Windows access violation `3221225477` during model loading,
without a mesh; the queue stopped. Concurrent CPU processes also reported
allocation failures. This suggests host-memory pressure, without establishing
the precise crash cause. Root stopped the CPU review/projection workers and
observed the failed child exit, 13,658 MiB free VRAM, and approximately 20 GiB
free physical memory before preparing recovery.

`generation-prep/recovery-and-exact-rgb-queue.json` contains Banekin's single
retry, Brown Bear, Crocodile and Kwama Warrior, followed by distinct
`haj-mota-exact-rgb-pair` and `coral-haj-mota-exact-rgb-pair` reruns. The four
corrected Haj Mota plates preserve every visible native RGB pixel and retain
the original alpha masks and dimensions. Their first-pass drafts remain
invalidated; new outputs do not replace them.

Root continues as the sole GPU operator. The runner now also requires at least
12,288 MiB free physical memory and 16,384 MiB available system commit, in
addition to the existing VRAM/utilization guards. Heavy CPU review and texture
jobs remain paused while the recovery queue runs. The failed Banekin logs are
preserved separately before its one retry. A further failure stops the queue
for investigation.

### Fourth lesser-enemy queue, recorded before launch

The recovery queue completed all six children and observed GPU release after
each exit. CPU review found the strongest anatomy in Brown Bear, an extra
central leg-like appendage in Kwama Warrior, and persistent underside failures
in both corrected Haj Mota variants. None is accepted for runtime.

Root's next serialized list is
`scratch/lesser-enemy-models-2026-10-04/generation-prep/fourth-wave-reviewed-queue.json`:

1. Green Wamasu: complete native front/rear obliques, 736/930 px body height.
2. Green Daedroth: complete front/rear obliques, 984/1,013 px body height.
3. Brown Gryphon: compatible folded-wing obliques, 1,005/964 px body height.
4. Blue Daedric Titan: winged oblique pair, 756/734 px body height; torn wing
   openings preserved in alpha.
5. Iron Atronach: corrected native pair, approximately 1,000 px body height.
6. Storm Atronach: corrected native pair; separate floating rocks preserved.
7. Frost Atronach: corrected native pair, approximately 1,000 px body height.

The original four-Atronach preparation attempt remains blocked and preserved.
Root created separate Iron/Storm/Frost plates by removing connected neutral
backdrop, including the verified native leg-gap seed `(960,700)`. An independent
pixel comparison found zero visible RGB differences; no image resizing or
synthetic anatomy was used. Root visually inspected the corrected pairs.
Crystal Atronach remains deferred because pale silhouette edges are eroded.

The same root-only runner, VRAM/utilization guards, physical-memory/commit
guards, child-exit checks and observed post-exit release apply. Heavy CPU
processing remains paused until this queue completes. These inputs are
experimental conditioning: oblique cameras are uncalibrated, unseen surfaces
are inferred, and small neutral-edge/shadow ambiguity remains. Source hashes,
preparation manifests and actual launch events stay with the research batch.

### Final zombie experiment, recorded before launch

The seven-job fourth queue completed with a raw mesh and observed post-child
GPU release for every job. Root inspected a final native 1,200-square UESP
capture of the exact armored female Dark Elf zombie, plus its white/dark alpha
reviews. Its 1,154 px complete body retains original RGB with alpha-only manual
background removal; the seated skeleton, books, floor and vegetation are excluded.
Hard traced edges and some finger-edge ambiguity remain. This front attack pose
has no back capture, so the entire rear is inferred.

`generation-prep/final-zombie-reviewed-queue.json` contains this single experimental
job. Root remains the sole GPU operator, with the same VRAM, utilization, host
memory, child-exit and release guards. Heavy CPU jobs remain paused. The runner
now also requires a raw output file of at least 100 bytes after a successful
child exit; output validity is checked separately. All earlier successful
jobs have individually verified raw outputs. No runtime
registration or broader zombie identity is established.

### Lesser-enemy batch outcome

The final zombie child completed on 2026-10-04 at 09:22:32 UTC, left a verified
raw output, and released GPU memory before CPU review resumed. Across this
continuation, the event log records 30 successful geometry jobs and one failed
Banekin attempt. Two first-pass Haj Mota jobs remain invalidated for altered
foreground RGB. The remaining 28 valid-input research candidates comprise
25 lesser-enemy variants and three trial-boss continuations. All are unaccepted;
zero new assets or aliases have been registered in fight replay.

The lesser-enemy variants are Ogrim, Dwarven Centurion, Dwarven Sphere, Gray
Wolf, Flame Atronach, Strangler, Golden Lamia, Bull-Horned Magma Frog, Argonian
Behemoth, Stone Atronach, Harpy, Banekin, Brown Bear, Crocodile, Kwama Warrior,
Haj Mota, Coral Haj Mota, Green Wamasu, Green Daedroth, Brown Gryphon, Blue
Daedric Titan, Iron Atronach, Storm Atronach, Frost Atronach, and the armored
female Dark Elf zombie. Proposed Dwarven Spider reuse of Archcustodian is not
counted as an additional generated lesser-enemy mesh.

Raw meshes, bounded static exports, native/clay comparisons, source provenance,
failed attempts, and appearance diagnostics are retained under
`scratch/lesser-enemy-models-2026-10-04/`. `batch-outcomes.json` derives counts
from actual child exits and verifies every successful raw SHA-256 against the
event log. `gallery.html` exposes the references and review products; its file
counts are not counts of unique enemies or accepted assets.

Review found major underside defects in both Haj Mota reruns, an extra central
appendage in Kwama Warrior, ragged feather sheets in Gryphon, incomplete thin
wing surfaces in Titan, and debris-like connections in Storm Atronach. Other
meshes also retain coarse details, uncertain oblique orientation, or inferred
surfaces. Texture projection alone does not establish appearance acceptance.
Alit, ordinary Kagouti, ordinary Minotaur, Nix-Hound, and other remaining
families still need complete matching native captures. The 1,679-name inventory
across 57 families remains a backlog; these representatives do not prove broad
actor aliases or completion of all lesser enemies.

The durable checkpoint destination is
`B:/CodexScratch/eso-fight-replay-3d/research-checkpoints/lesser-enemy-models-2026-10-04-t3code-7c9dfcb6`.
Once copying completes, its manifest will provide evidence of copy completion
and per-file byte/SHA-256 verification. Retained scripts/configs contain original absolute paths and are
research snapshots rather than a portable executable package.

### Final remaining native construct assessment

Cached complete native references were assessed for the exact Blue Lurcher,
Sylvan Spriggan, and Ashen Spriggan variants. Two neutral-background mask
attempts removed gray subject material. A separate final root assessment
preserved original RGB but retained broad studio background and floor shadows.
Root and independent visual review rejected all three sets; their generation
and launch flags remain false. No GPU jobs were launched from these plates.
The final 1,080 px opaque envelope includes background and is explicitly not
a certified body-height measurement. First-attempt manifests and contacts
survive, but their prepared RGBA files were overwritten by the second attempt;
the historical hashes do not describe current plates.

This assessment stops after three failed mask attempts. These variants require
a clean subject mask or alternate complete native capture before generation.
The exact variants do not establish broader Lurcher or Spriggan aliases. The
final readiness inventory records 22 represented families and 35 without a
generated representative, with no overlooked certified generation input.

Repository validation completed after installing the existing lockfile's
development dependencies into this worktree. `npm run validate` passed;
`npm run test:ci -- --maxWorkers=2` passed 527 suites, 6,568 tests and
34 snapshots, with one suite and 13 tests skipped. Initial environment-failure
logs remain alongside the passing results. SHA-256 checks confirmed the two
pre-existing modified sample reports and `public/schema.graphql` were unchanged.
