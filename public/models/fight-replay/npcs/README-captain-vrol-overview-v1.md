# Captain Vrol overview replay prototype

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
- Color source: the two reference views projected into vertex colors. Sampling reuses
  `tools/fight-replay-models/project-reference-vertex-colors.py` (per-slice silhouette
  normalization, nearest-opaque-pixel snapping, sRGB to linear conversion) through a two-view
  driver, `project-two-view-vertex-colors.py`, kept in the out-of-repo scratch workspace. Vertices
  are blended by normal alignment with the +Z and -Z view directions at blend power 3.0.
- Replay-distance polish: bpy 5.0.0 using `tools/fight-replay-models/polish-yandir-overview.py`
  with `--target-triangles 95000 --keep-first-mesh`. The script is identity-named but parameterized;
  no Yandir-specific color grading, shoulder broadening, or helmet curls were enabled.
- Runtime optimization: vertex colors baked to an embedded 512 px texture and geometry reduced with
  `tools/fight-replay-models/bake-vertex-colors-to-texture.py --target-triangles 45000
  --texture-size 512`.
- Final gate: `tools/fight-replay-models/prepare-static-boss.py -- ... --max-triangles 50000
  --texture-size 512`, which joined, applied transforms, centered horizontally, grounded the feet,
  and exported a plain GLB. The script hardcodes Yandir's object name, so the exported GLB's JSON
  chunk was then rewritten in place to rename the node/mesh to `captain-vrol-overview-v1` and the
  material to `CaptainVrolBakedVertexColor`. The binary chunk was copied byte-for-byte, so no
  geometry, UV, or texture data was re-encoded by that rename.
- Prepared asset: `captain-vrol-overview-v1.glb`; one mesh, one material, one draw call, 45,000
  triangles, 29,253 UV-split vertices, 512x512 RGB base-color texture, 1,575,876 bytes, SHA-256
  `0C0E1F4BCDC1C72542B411DFFE4FAF14ADBF10C762528E85DD10BA01D9D1440E`
- Prepared bounds: 0.8587 x 1.9944 x 0.4041 model units (X x Y x Z), minimum Y exactly 0.0, centered
  on X and Z. Vertex attributes are POSITION, NORMAL, and TEXCOORD_0 only: no skin, animation,
  morph target, or glTF extension, so the browser runtime needs no DRACOLoader or meshopt decoder.
- Proportion check: the reference page lists the source model as 1.03 x 2.42 x 0.49 m. The prepared
  asset's width-to-height ratio is 0.431 against the reference's 0.426, and its depth-to-height
  ratio is 0.203 against the reference's 0.202. The thin profile is faithful to the source A-pose
  rather than an artifact of the missing side plates.
- LOD decision: 45,000 triangles at 512 px, matching the accepted Yandir budget. The two-view color
  projection was verified against the source plates numerically as well as visually: the baked
  atlas averages sRGB 92.5 across sampled UVs versus 89.5 and 87.1 for the front and back plates, so
  the reference's dark leather and blue-grey scale survive the projection and bake without value
  drift.
- Intended presentation: 32-64 px-tall replay actor; broad color/silhouette identity LOD rather than
  a close-up replica. The horned helm, pale ice hair, dark red-brown leather, blue-grey scaled
  plates, and fur-trimmed boots all remain legible at that size.
- Prepared: 2026-09-04

The Elder Scrolls Online name, character design, and related rights remain with their respective
owners, including ZeniMax Media/Bethesda Softworks. Do not reuse this asset outside this project's
authorized fan prototype without conducting a separate rights review.
