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
  linear resolution of the full-body plates. `view-04` (helm) was REJECTED: its silhouette runs off
  the frame edges, profile matching falsely locked onto the torso, and masked normalized
  cross-correlation peaked at only 0.492 pinned to the search boundary. The head therefore comes
  from the full-body plate alone. No detail was fabricated.
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
  triangles, 28,732 vertices, 1024x1024 JPEG q92 base-color texture (no chroma subsampling), 2,033,380 bytes. Stored as JPEG
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
- Known limitation: the left and right profiles show horizontal streaking. About 34% of texels face
  neither reference camera squarely and receive silhouette-edge pixels stretched sideways. A
  confidence-thresholded 3D inpaint was tried and rejected — it made the atlas blotchier without
  improving the render. This is irreducible with two views; only a genuine profile plate would fix
  it, and fabricating one was judged worse than an honest limitation.
- Superseded: `captain-vrol-overview-v1.glb` (45,000 tris, 512px, 1,575,876 bytes) was withdrawn.
  Its atlas was fragmented and its surface detail smeared, failing the acceptance gate.
- Intended presentation: 32-64 px-tall replay actor; broad color/silhouette identity LOD rather than
  a close-up replica. The horned helm, pale ice hair, dark red-brown leather, blue-grey scaled
  plates, and fur-trimmed boots all remain legible at that size.
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
