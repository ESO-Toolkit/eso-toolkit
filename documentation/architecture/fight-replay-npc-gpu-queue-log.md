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

Three changes together, in rough order of impact:

1. **Direct texel projection instead of vertex-colour baking.** Colour had been carried as vertex
   colours and only baked to a texture at the end, capping detail at ~29k vertex samples instead of
   ~564k texel samples — a 19x difference. Each texel is now unprojected to its surface point and
   normal, projected into the front and back reference cameras, and blended by facing angle with
   occlusion rejection.
2. **Registered closeup plates.** `view-07`/`view-08` (front/back torso, ~2.1x the linear resolution
   of the full-body plates) were registered by matching per-row silhouette width profiles and used to
   sharpen the torso. `view-04` (helm) was correctly **rejected** — its silhouette runs off the frame
   edge, profile matching falsely locked onto the torso, and masked NCC peaked at 0.492 pinned to the
   search boundary. Unverifiable registration must be rejected rather than forced.
3. **Blender collapse decimation instead of trimesh quadric simplification**, then a fresh xatlas
   unwrap with dilated island borders.

A note on evidence: shell counts measured on an exported GLB are **confounded**, because glTF splits
vertices at every UV seam, so an unwrapped export reports roughly one shell per UV island regardless
of mesh health (the accepted v2 also reports 382). Do not use exported-GLB shell count alone as proof
of shredded geometry — measure it on the pre-unwrap mesh. The improvement here is established by
direct visual A/B of the flat atlas and torso renders, which is unambiguous.

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
