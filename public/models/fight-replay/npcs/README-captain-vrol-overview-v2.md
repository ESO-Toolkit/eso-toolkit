# Captain Vrol overview replay prototype (v2)

This GLB is a project-authorized, fan-project prototype reconstructed from screenshots rather than
extracted from the ESO client. It is enabled only by the fight replay's `?npcModels=prototype`
preview flag. The repository owner's authorization covers its use for this prototype; this note is
not a claim that Elder Scrolls Online intellectual property is freely licensed.

- Reference page: <https://esomodelviewer.com/characters/post/83-captain-vrol>
- Encounter: Captain Vrol, second boss of the Kyne's Aegis trial
- Reference inputs: the reference page's clean full-body front plate (`view-02.jpg`) and back plate
  (`view-03.jpg`), both 1366x768. Both were cropped to a single shared 768 px square framing so the
  two views keep identical subject scale, then resampled to 1024x1024. The page's remaining plates
  (`view-01`, `view-04`-`view-10`) are head/torso/leg closeups and were used for visual review only.
- Side references: none. Unlike the Yandir prototype, no left/right profile plate was generated for
  Vrol. The page publishes no true profile capture and a synthesized one was judged more likely to
  invent silhouette than to describe it, so the color projection is a strict two-view blend.
- Geometry: Tencent Hunyuan3D-2mv (`tencent/Hunyuan3D-2mv`, `hunyuan3d-dit-v2-mv`, fp16), 50
  inference steps, octree resolution 380, seed 12,345, via
  `tools/fight-replay-models/generate-hunyuan-multiview.py` with `--front`/`--back` only. Draft:
  343,194 faces in 70.9 s on an RTX 4070 Ti Super.
- Color source: the two reference views projected DIRECTLY INTO THE UV ATLAS at texel resolution.
  Each texel is unprojected to its surface point and normal, projected into the front and back
  reference cameras, and blended by how squarely the surface faces each camera, with occlusion
  rejection. This replaces the earlier vertex-colour path, which capped colour detail at the vertex
  count (29k samples) rather than the texel count (564k samples).
- Closeup plates: `view-07` (front torso) and `view-08` (back torso) were registered onto the
  full-body framing by matching per-row silhouette width profiles (scale 0.470 / 0.530, width error
  5.70% / 4.65%, confirmed visually) and used to sharpen the torso region. They carry about 2.1x the
  linear resolution of the full-body plates. `view-04` (helm) was initially rejected here — its
  silhouette runs off the frame edges, whole-body profile matching falsely locked onto the torso, and
  masked normalized cross-correlation peaked at only 0.492 pinned to the search boundary. It was
  later accepted under **head-band-only** registration; see the v4 head-plate entry below. No detail
  was fabricated.
- Replay-distance polish: bpy 5.0.0 using `tools/fight-replay-models/polish-yandir-overview.py`
  with `--target-triangles 95000 --keep-first-mesh`. The script is identity-named but parameterized;
  no Yandir-specific color grading, shoulder broadening, or helmet curls were enabled.
- Runtime optimization: decimated with Blender's collapse modifier rather than trimesh's quadric
  simplification, then UV-unwrapped with xatlas (382 charts; a sweep of 8 chart configurations could
  not get below ~323 because the marching-cubes surface has deep concavities between tassets, under
  pauldrons, and between fingers). Island borders are dilated so mipmapping cannot bleed background
  into the silhouette.
- Final gate: `tools/fight-replay-models/prepare-static-boss.py -- ... --max-triangles 50000
--texture-size 512`, which joined, applied transforms, centered horizontally, grounded the feet,
  and exported a plain GLB. The script hardcodes Yandir's object name, so the exported GLB's JSON
  chunk was then rewritten in place to rename the node/mesh to `captain-vrol-overview-v1` and the
  material to `CaptainVrolBakedVertexColor`. The binary chunk was copied byte-for-byte, so no
  geometry, UV, or texture data was re-encoded by that rename.
- Prepared asset: `captain-vrol-overview-v2.glb`; one mesh, one material, one draw call, 44,999
  triangles, 28,732 vertices, 1024x1024 JPEG q92 base-color texture (4:4:4, no chroma subsampling), 1,699,852 bytes. Stored as JPEG
  because the same texture as PNG is 2,764,516 bytes, over the 2.5 MB runtime gate; a 512px PNG
  would fit but would discard the closeup detail this pass gained, for the same byte cost.
- Prepared bounds: 0.8591 x 1.9938 x 0.4039 model units (X x Y x Z), minimum Y exactly 0.0, centered
  on X and Z. Vertex attributes are POSITION, NORMAL, and TEXCOORD_0 only: no skin, animation,
  morph target, or glTF extension, so the browser runtime needs no DRACOLoader or meshopt decoder.
- Proportion check: the reference page lists the source model as 1.03 x 2.42 x 0.49 m. The prepared
  asset's width-to-height ratio is 0.431 against the reference's 0.426, and its depth-to-height
  ratio is 0.203 against the reference's 0.202. The thin profile is faithful to the source A-pose
  rather than an artifact of the missing side plates.
- Source ceiling: in the native 1366x768 plates the character is 717 px tall by 289 px wide, about
  100k opaque pixels per view and ~186k native pixels across both. Against 563,769 _covered_ texels
  (46% of the atlas is chart padding) that is roughly **3x** oversampled, and near 1:1 in the torso
  where the registered closeups land. An earlier note said 5x; that compared against the full atlas
  including padding. It still cannot contain more real detail than the plates carry.
- Known limitation: the left and right profiles remain the weakest views. About 34% of texels face
  neither reference camera squarely. Since the v3 pass these are filled from a chart-local neighbour
  average rather than stretched silhouette pixels, so they read as smooth rather than streaked — but
  smooth is the honest ceiling here, because no plate observed them. An earlier confidence-thresholded
  3D inpaint was tried and rejected; it made the atlas blotchier without improving the render. Only a
  genuine profile plate would add real detail, and fabricating one was judged worse than the
  limitation.
- Superseded: `captain-vrol-overview-v1.glb` (45,000 tris, 512px, 1,575,876 bytes) was withdrawn.
  Its atlas was fragmented and its surface detail smeared, failing the acceptance gate.
- Intended presentation: 32-64 px-tall replay actor; broad color/silhouette identity LOD rather than
  a close-up replica. The horned helm, pale ice hair, dark red-brown leather, blue-grey scaled
  plates, and fur-trimmed boots all remain legible at that size.
- Grazing-texel fill (v3 texture pass, 2026-09-05): about 34% of covered texels face neither
  reference camera within cos 0.35 and were previously left as silhouette-edge pixels stretched
  sideways — visible streaking on shoulder tops and pauldrons, which is exactly where the elevated
  replay camera looks. Those texels (186,317, 32.7% of covered) are now filled from a
  **chart-local** neighbour average: the kd-tree is restricted to texels sharing the same UV chart so
  colour cannot cross a chart boundary, the blend is ramped by `(threshold - observed)/threshold` so
  there is no hard edge at the cutoff, and islands with fewer than 8 well-observed texels are left
  alone rather than filled from a bad neighbour set. Filled regions read smoother than before; that
  is honest, since no plate observed them.
- Sampler (v3): plates are now read at **native resolution** (768x768) with no upsampling anywhere —
  both earlier Lanczos pre-upsample stages are removed. Sampling is alpha-weighted bilinear (4 taps
  weighted by bilinear coefficient and plate alpha, renormalised, nearest-opaque only as a fallback)
  with 2x2 supersampling via a 2048 attribute raster averaged to 1024. The previous nearest-neighbour
  sampling on pre-upscaled plates produced staircase-replicated detail that measured as sharpness but
  mipped to mush. Accepted closeups are sampled as separate native-resolution references with their
  own transform rather than pasted into an upscaled canvas.
- Tone (v3): measured like-for-like against **well-observed** texels only, the atlas was ~3% darker
  than the source subject, not the ~22% an earlier whole-atlas comparison suggested — comparing the
  full atlas to the source subject is biased low because unobserved creases and undersides are
  legitimately dark. Applied contrast 1.08 pivoted on the observed mean (pivoting on 0.5 darkened it
  instead), a capped exposure lift, and saturation 1.10. Observed mean now matches source.
- Masked unsharp (v3): Gaussian sigma 0.7 px, amount 0.45, threshold 4/255, in sRGB, using a
  mask-weighted blur (`gaussian(img*m)/gaussian(m)`) so chart borders cannot pull in dilation colour,
  masked to `coverage & alignment > 0.5` (26.8% of covered texels). Then 24 px dilation, then
  encode. Order matters: sharpening before the sampler fix would amplify the staircase.
- Head plates (v4 texture pass, 2026-09-05): the head was previously the least-sampled region on the
  model — it took its colour from the full-body plate, where it occupies only ~60 px, so the helm read
  as an undifferentiated smear. `view-04` (helm closeup, head-band registration error 2.86%, scale 0.210) is now registered and projected onto head texels.
  Registration matches the **head band only** (top of silhouette down to the detected shoulder row,
  keyed to a fraction of the widest upper-body row so a narrow helm spike or a wide horn span cannot
  seed it wrongly). Whole-body silhouette matching had failed here precisely because the torso
  dominates the correlation — that is what previously mis-locked the helm plate onto the chest. Each
  accepted registration was confirmed by a 50% overlay before use. Projection is gated to texels above
  the shoulder line (v > 0.812), feathered 0.05 in v so the neck has no seam; body texels are untouched.
  Head plates contribute 16.5% of texels.
- Rejected head plates: `view-05` (50.25% error) and `view-06` (72.86%) were rejected as misregistered. Vrol has **no usable back-of-head plate**, so the rear of his helm keeps full-body-plate colour. Registration that cannot be verified is
  rejected rather than forced — a wrong plate on the face is worse than a soft one.
- Head geometry is **unchanged and was not regenerated.** A clay render confirmed both horns, the conical dome, the brow/visor ridge and the ice-beard shard fringe are genuinely reconstructed; the ice-crystal crown and the fine gold fang teeth are not modelled. The projected
  detail is therefore the correct colour pattern on a slightly smooth surface: at extreme close-up the
  crown and tusk detail reads flat, while at replay distance the identity is unmistakable.
- Encoding correction (2026-09-05): the first build of this asset was written at JPEG **q75**, not
  the q92 its notes claimed — the luminance quantization table was PIL's q75 default and PSNR against
  the lossless atlas was 30.84 dB. It was re-encoded from the lossless PNG master at true q92 with
  chroma subsampling disabled, giving **37.83 dB**. Geometry and UVs are bit-identical; only the
  image bytes changed. Chroma subsampling is disabled deliberately: this atlas carries identity as
  flat colour blocks, which 4:2:0 smears. Reproduce with
  `tools/fight-replay-models/reencode-glb-texture.py`.
- Prepared: 2026-09-05 (v2 texture rebuild; v1 was 2026-09-04)

The Elder Scrolls Online name, character design, and related rights remain with their respective
owners, including ZeniMax Media/Bethesda Softworks. Do not reuse this asset outside this project's
authorized fan prototype without conducting a separate rights review.
