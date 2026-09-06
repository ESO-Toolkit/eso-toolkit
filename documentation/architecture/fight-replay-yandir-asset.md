# Yandir fight-replay asset handoff

This is the canonical Codex and Claude context for the first reconstructed ESO boss asset. Read it
with the general [actor-model pipeline](./fight-replay-actor-model-pipeline.md) before changing the
model, registry, or renderer.

## Current milestone

Yandir the Butcher is the first static boss proof for Kyne's Aegis. The runtime asset is a
project-authorized fan reconstruction made from the reference views on the
[ESO Model Viewer page](https://esomodelviewer.com/characters/post/82-yandir-the-butcher); it is not
an extracted game mesh and is not CC0. See the asset's adjacent provenance file for the exact input,
tooling, measurements, and redistribution status.

The initial mesh is deliberately unrigged. It lazy-loads only for an exact Yandir boss-name match
and only with `?npcModels=prototype`. Loading or parsing failure must leave the capsule visible.
Selection, name, glyph, rings, health state, and the replay's dead treatment remain owned by the
existing actor renderer.

## Runtime contract

- One mesh, one textured PBR material, one embedded 1024 px JPEG texture, and no armature,
  animation, or morph targets. The reviewed closed mesh uses front-side rendering; two-sided
  rendering remains the fallback for reconstructions with thin armor shells.
- The accepted overview LOD (v2) has 45,000 triangles, 28,854 UV-split vertices, and is 1.64 MB. It
  remains one primitive and one draw call. The tighter crowd budgets still apply to lesser enemies.
- glTF `+Y` up, facing `+Z`, feet at `y=0`, horizontally centered, transforms applied.
- Registry matching is actor-type constrained, case-insensitive, whitespace-normalized, and exact.
- The asset is loaded only when a matching actor is present and the explicit prototype query flag is
  enabled. That review flag intentionally wins over automatic quality downgrades so visual testing is
  deterministic on slow or virtualized browsers.
- Embedded GLB textures are decoded through temporary `blob:` URLs by Three.js, so `blob:` must remain
  allowed by both `img-src` and `connect-src` in the app-shell and deployment CSPs.
- No animation mixer or per-actor scene clone is introduced. The static renderer applies only the
  existing death treatment; no idle or movement motion ships with this milestone.

## Acceptance checklist

Inspect an actual Kyne's Aegis Yandir replay in both preview-on and preview-off modes. Confirm scale,
grounding, facing, shadow, click selection, nameplate, rings, death state, and capsule fallback. Also
check barebones/performance mode and compare frame time and memory before enabling the model beyond
the prototype query flag.

The initial live verification target is public report `L7T1zdcCfWNRbQwm`, fight 6 (Yandir the
Butcher / Sea Adder). Geometry, grounding, and combat-log placement were verified there with
`?npcModels=prototype`. The shipped v2 asset was then checked in the in-repo `/replay-models` viewer:
45,000 triangles, 28,854 UV-split vertices, one mesh/material/draw call, a 1024 px embedded JPEG, and
1,715,468 bytes. The virtualized preview is not suitable for a final FPS comparison. Recheck scale,
facing, selection, and death treatment in the full replay when its report-data backend is healthy.

Visual acceptance is at the intended 32-64 px replay height, not close-up orbit-camera fidelity, but
**judge the texture by opening the flat atlas, not only by rendered angles** — a fragmented or smeared
atlas can still render acceptably from whichever angles you happen to check. The two separately
generated helmet curl meshes were rejected and removed; do not recreate them unless a replay-scale
defect justifies it.

### Superseded guidance (kept so it is not repeated)

v1 baked **vertex colours** to a 512 px texture and shipped at 29,397 vertices / 1,848,216 bytes. That
was a mistake: vertex colours cap surface detail at the vertex count, roughly 19x below what the atlas
holds, and the result was a featureless, plastic-looking surface. v1 also concluded that a 1024 px
candidate gave "no useful replay-scale improvement" and that a 10,000-triangle test "removed too many
colour samples" — **both conclusions were artefacts of the vertex-colour carrier, not of resolution or
triangle count.** Once colour is projected per texel, 1024 px is clearly better and fits the size gate
as JPEG. Do not use those earlier findings to argue against a higher-resolution atlas.

Rebuild the current asset by projecting the reference plates directly into the UV atlas (see the
adjacent provenance file for the exact stages), not with the vertex-colour bake. The dense
vertex-coloured source is still the geometry origin:

```powershell
B:/CodexScratch/eso-fight-replay-3d/.venv/Scripts/python.exe `
  tools/fight-replay-models/polish-yandir-overview.py -- `
  source-vertex-colors.glb yandir-the-butcher-overview-v2.glb `
  --target-triangles 90891 --keep-first-mesh
```

There is no standalone Blender on the current workstation, so the `blender --background --python`
form does not run; the venv interpreter above supplies `bpy` as a module. See
[the tooling README](../../tools/fight-replay-models/README.md).

Run the registry unit tests, `npm run validate`, and `npm run test:ci` before updating the PR. Show a
captured in-app result to the project owner before treating the visual milestone as accepted.

## Next version: rigging boundary

Do not rig the shipped static GLB in place. Preserve the high-detail source outside runtime assets,
create a separately versioned rigged GLB, and add an `animated-skinned` renderer with explicit clip
state mapping. Mixamo or another biped auto-rigger can be evaluated after a clean neutral-pose mesh
exists. `motion-bricks.cpp` generates motion rather than a character mesh or rig and is not part of
this static milestone. Needle Mesh Baker is useful for static LODs, but a baked result does not
preserve the original rig hierarchy.

For the next animated version, start again from the preserved high-detail reconstruction, create a
clean neutral A- or T-pose, and rig that mesh with Make-It-Animatable, Mixamo, AccuRig, or Blender.
Do not attempt to infer a useful skeleton from this relaxed-pose runtime LOD. Bake a compact replay
clip set (idle, move, attack/cast, stagger, death) into a separately versioned GLB, then add the
`animated-skinned` runtime path while preserving capsule fallback. A 16 GB RTX 4070 Ti Super is
well suited to local Hunyuan3D multiview drafts and Blender cleanup; use cloud tools such as Tripo
or Pixel3D as alternative draft generators, not as the final acceptance gate.

Before that rigged version, wire explicit cast/interrupt/death cue timestamps into the replay lookup.
Yandir can then use restrained whole-model anticipation/recoil for attacks while the static asset is
still active. Keep cue priority deterministic (`death > interrupt/stagger > attack/cast > move > idle`)
and never drive combat motion from wall-clock time, so pausing and backward scrubbing reproduce the
same pose.
