# Yandir the Butcher overview replay prototype (v2)

This GLB is a project-authorized, fan-project prototype reconstructed from screenshots rather than
extracted from the ESO client. It is enabled only by the fight replay's `?npcModels=prototype`
preview flag. The repository owner's authorization covers its use for this prototype; this note is
not a claim that Elder Scrolls Online intellectual property is freely licensed.

- Reference page: <https://esomodelviewer.com/characters/post/82-yandir-the-butcher>
- Encounter: Yandir the Butcher, Kyne's Aegis trial
- Geometry: **unchanged from v1.** Sourced from the reviewed 90,891-triangle
  `yandir-overview-polish-v17-body-only.glb` produced by Tencent Hunyuan3D-2mv (upstream commit
  `f8db630`, fast multiview generation). v2 is a **texture rebuild only** — no regeneration, no
  re-sculpt, no restyle. Final dimensions match v1 to within a thousandth of a unit.
- Reference inputs: the reference page's full-body front and back plates (1366x768). In those plates
  the character is 690 px tall by 300 px wide, roughly 100k opaque pixels per view and ~200k across
  both.
- Closeup plates: `view-07` (front torso) and `view-08` (back torso) were registered onto the
  full-body framing by matching per-row silhouette width profiles (width error 4.99% and 4.77%,
  composites confirmed visually) and used to sharpen the torso region. Helm closeups were not
  attempted in this pass, because the equivalent plate had failed correlation verification during the
  Captain Vrol build. They were added later under head-band-only registration; see the v4 head-plate
  entry below.
- **Synthesized side views are NOT used.** v1's colour drew on a fabricated left profile
  (`generated-left-profile-v1.png`). That is invented detail, so v2 uses the two genuine plates only.
- Color source: the two reference plates projected **directly into the UV atlas at texel
  resolution**. Each texel is unprojected to its surface point and normal, projected into the front
  and back reference cameras, and blended by how squarely the surface faces each camera, with
  occlusion rejection. Atlas coverage is 571,441 of 1,048,576 texels (54.5%); front visibility 46.5%,
  back 44.8%, neither 11.8%.
- Why v1 was replaced: v1 carried colour as **vertex colours**, baked to a texture only at the end.
  That capped surface detail at ~29k vertex samples against ~571k texel samples, and the
  `transfer_colors` KD-tree inverse-distance blend smoothed across the surface and could pull colour
  through thin limbs. The result was a featureless, plastic-looking surface — a concrete defect
  against the acceptance gate, which is why the geometry-preserving rebuild was authorized. v2
  resolves the rivetted chest plate, scalloped fur trim, quilted sleeves, chainmail bracers, belt
  buckle, fur tassels and pouches, with the same identity (teal cloth, pale fur, brown leather, red
  beard).
- Runtime optimization: decimated to 45,000 triangles with Blender's collapse modifier (2 shells,
  0 boundary edges — fully watertight), re-unwrapped with xatlas to 350 UV islands (mean 128.6 faces
  per island, down from v1's 491), island borders dilated so mipmapping cannot bleed background into
  the silhouette.
- Prepared asset: `yandir-the-butcher-overview-v2.glb`; one mesh, one material, one draw call,
  45,000 triangles, 29,609 vertices, 1024x1024 JPEG q92 base-color texture (4:4:4, no chroma
  subsampling), 1,644,896 bytes. Stored as JPEG because the same texture as PNG is 2,710,356 bytes, over the
  2.5 MB runtime gate.
- Prepared bounds: 0.9414 x 1.9927 x 0.3990 model units (X x Y x Z), minimum Y exactly 0.0, centered
  on X and Z. Vertex attributes are POSITION, NORMAL, and TEXCOORD_0 only: no skin, animation, morph
  target, or glTF extension, so the browser runtime needs no DRACOLoader or meshopt decoder.
- Source ceiling: ~186k native subject pixels across both plates against 563,769 _covered_ texels
  (46% of the atlas is chart padding) — roughly **3x** oversampled, and near 1:1 in the torso where
  the registered closeups land. An earlier note said 5x; that compared against the full atlas
  including padding. No projection method can contain more real detail than the plates carry, but
  there is more headroom here than the 5x figure implied.
- Known limitation: the left and right profiles remain the weakest views. About 34% of texels face
  neither reference camera squarely; since the v3 pass they are filled from a chart-local neighbour
  average rather than stretched silhouette pixels, so they read as smooth rather than streaked. This is
  irreducible with two genuine views; only a real profile capture would fix it, and fabricating one
  was judged worse than an honest limitation. The profiles are still substantially better than v1's.
- Intended presentation: 32-64 px-tall replay actor; broad color/silhouette identity LOD rather than
  a close-up replica.
- Grazing-texel fill (v3 texture pass, 2026-09-05): about 34% of covered texels face neither
  reference camera within cos 0.35 and were previously left as silhouette-edge pixels stretched
  sideways — visible streaking on shoulder tops and pauldrons, which is exactly where the elevated
  replay camera looks. Those texels (189,379, 32.8% of covered) are now filled from a
  **chart-local** neighbour average: the kd-tree is restricted to texels sharing the same UV chart so
  colour cannot cross a chart boundary, the blend is ramped by `(threshold - observed)/threshold` so
  there is no hard edge at the cutoff, and islands with fewer than 8 well-observed texels are left
  alone rather than filled from a bad neighbour set. Filled regions read smoother than before; that
  is honest, since no plate observed them.
- Sampler (v3): plates are now read at **native resolution** (731x731) with no upsampling anywhere —
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
  masked to `coverage & alignment > 0.5` (22.5% of covered texels). Then 24 px dilation, then
  encode. Order matters: sharpening before the sampler fix would amplify the staircase.
- Head plates (v4 texture pass, 2026-09-05): the head was previously the least-sampled region on the
  model — it took its colour from the full-body plate, where it occupies only ~60 px, so the helm read
  as an undifferentiated smear. `view-04` (front helm, head-band error 3.53%, scale 0.208) and `view-06` (back of head, 5.16%, scale 0.246) are now registered and projected onto head texels.
  Registration matches the **head band only** (top of silhouette down to the detected shoulder row,
  keyed to a fraction of the widest upper-body row so a narrow helm spike or a wide horn span cannot
  seed it wrongly). Whole-body silhouette matching had failed here precisely because the torso
  dominates the correlation — that is what previously mis-locked the helm plate onto the chest. Each
  accepted registration was confirmed by a 50% overlay before use. Projection is gated to texels above
  the shoulder line (v > 0.856 front, v > 0.855 back), feathered 0.05 in v so the neck has no seam; body texels are untouched.
  Head plates contribute 17.3% and 16.0% of texels.
- Rejected head plates: `view-05` registered acceptably (6.60%) but was redundant with view-04 and skipped. Note that view-04 scored a _lower_ numeric error against the **back** plate (2.58%) than the front (3.53%); it was assigned to the front regardless, because it is a face — content overrides a marginally better score, and following the number would have mapped the beard onto the back of his head. Registration that cannot be verified is
  rejected rather than forced — a wrong plate on the face is worse than a soft one.
- Head geometry is **unchanged and was not regenerated.** A clay render shows a smooth hood/onion form with a sculpted brow, nose, cheeks and beard mass; the tusked cheek guards and helm scales are not modelled. The projected
  detail is therefore the correct colour pattern on a slightly smooth surface: at extreme close-up the
  crown and tusk detail reads flat, while at replay distance the identity is unmistakable.
- Encoding correction (2026-09-05): the first build was written at JPEG **q75**, not the q92 its
  notes claimed (PIL default quantization table; 31.60 dB against the lossless atlas). Re-encoded
  from the lossless PNG master at true q92 with chroma subsampling disabled, giving **38.34 dB**.
  Geometry and UVs are bit-identical; only the image bytes changed. Reproduce with
  `tools/fight-replay-models/reencode-glb-texture.py`.
- Seam fix (2026-09-06): rebuilt with `projection.envelope_sigma` band-limiting the mesh and
  plate silhouette envelopes. This removed the hard horizontal bar across the chin/beard and
  the ghosting on the pauldron trim — a projection bug, not the two-view limitation it was
  previously documented as. Geometry, UVs and all other settings unchanged.
- Prepared: 2026-09-05 (v2 texture rebuild; v1 was 2026-09-03)

The Elder Scrolls Online name, character design, and related rights remain with their respective
owners, including ZeniMax Media/Bethesda Softworks. Do not reuse this asset outside this project's
authorized fan prototype without conducting a separate rights review.
