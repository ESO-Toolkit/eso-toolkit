# Yandir the Butcher overview replay prototype

This GLB is a project-authorized, fan-project prototype reconstructed from screenshots rather than
extracted from the ESO client. It is enabled only by the fight replay's `?npcModels=prototype`
preview flag. The repository owner's authorization covers its use for this prototype; this note is
not a claim that Elder Scrolls Online intellectual property is freely licensed.

- Reference page: <https://esomodelviewer.com/characters/post/82-yandir-the-butcher>
- Encounter: Yandir the Butcher, Kyne's Aegis trial
- Reference inputs: front and back screenshots displayed by the reference page, plus left and right
  silhouette-consistent reference views generated from those captures for texture continuity
- Geometry: Tencent Hunyuan3D-2mv, upstream commit `f8db630`, fast multiview generation
- Color source: four reference views projected into corner-domain vertex colors; the side references
  are derived images and are not additional captures from the game client
- Projection: Blender 5.2.1 using `tools/fight-replay-models/project-reference-vertex-colors.py`
- Replay-distance polish: Blender 5.2.1 using
  `tools/fight-replay-models/polish-yandir-overview.py`
- Runtime optimization: vertex colors baked to an embedded 512 px texture and geometry reduced with
  `tools/fight-replay-models/bake-vertex-colors-to-texture.py`
- Prepared asset: `yandir-the-butcher-overview-v1.glb`; one mesh, one material, one draw call,
  45,000 triangles, 29,397 UV-split vertices, 1,848,216 bytes, SHA-256
  `36B283F937F0EA9899CEF4AA12DA34A968ED4BE73B114FDB94579AC8AD114241`
- Prepared bounds: approximately 0.941 x 0.399 x 1.993 model units
- LOD decision: the 10,000-triangle candidate lost too much surface color detail. The accepted
  45,000-triangle/512 px bake retains the replay-scale identity while cutting the dense draft's
  geometry and file size. Separate generated helmet-curl meshes were removed.
- Intended presentation: 32-64 px-tall replay actor; broad color/silhouette identity LOD rather than
  a close-up replica
- Prepared: 2026-09-03

The Elder Scrolls Online name, character design, and related rights remain with their respective
owners, including ZeniMax Media/Bethesda Softworks. Do not reuse this asset outside this project's
authorized fan prototype without conducting a separate rights review.
