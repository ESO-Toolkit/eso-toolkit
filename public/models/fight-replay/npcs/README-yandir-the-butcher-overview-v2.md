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
  attempted, because the equivalent plate failed correlation verification during the Captain Vrol
  build and unverifiable registration maps the wrong body part onto the mesh.
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
  45,000 triangles, 28,854 vertices, 1024x1024 JPEG q92 base-color texture (no chroma subsampling),
  1,981,816 bytes. Stored as JPEG because the same texture as PNG is 2,710,356 bytes, over the
  2.5 MB runtime gate.
- Prepared bounds: 0.9414 x 1.9927 x 0.3990 model units (X x Y x Z), minimum Y exactly 0.0, centered
  on X and Z. Vertex attributes are POSITION, NORMAL, and TEXCOORD_0 only: no skin, animation, morph
  target, or glTF extension, so the browser runtime needs no DRACOLoader or meshopt decoder.
- Source ceiling: ~186k native subject pixels across both plates against 563,769 _covered_ texels
  (46% of the atlas is chart padding) — roughly **3x** oversampled, and near 1:1 in the torso where
  the registered closeups land. An earlier note said 5x; that compared against the full atlas
  including padding. No projection method can contain more real detail than the plates carry, but
  there is more headroom here than the 5x figure implied.
- Known limitation: the left and right profiles streak horizontally. About 34% of texels face neither
  reference camera squarely and receive silhouette-edge pixels stretched sideways. This is
  irreducible with two genuine views; only a real profile capture would fix it, and fabricating one
  was judged worse than an honest limitation. The profiles are still substantially better than v1's.
- Intended presentation: 32-64 px-tall replay actor; broad color/silhouette identity LOD rather than
  a close-up replica.
- Encoding correction (2026-09-05): the first build was written at JPEG **q75**, not the q92 its
  notes claimed (PIL default quantization table; 31.60 dB against the lossless atlas). Re-encoded
  from the lossless PNG master at true q92 with chroma subsampling disabled, giving **38.34 dB**.
  Geometry and UVs are bit-identical; only the image bytes changed. Reproduce with
  `tools/fight-replay-models/reencode-glb-texture.py`.
- Prepared: 2026-09-05 (v2 texture rebuild; v1 was 2026-09-03)

The Elder Scrolls Online name, character design, and related rights remain with their respective
owners, including ZeniMax Media/Bethesda Softworks. Do not reuse this asset outside this project's
authorized fan prototype without conducting a separate rights review.
