# CoolStickman — asset attribution

`coolstickman-baked.glb` is a static, single-mesh, single-material bake of the **CoolStickman**
avatar, used as the player figure marker in the 3D fight replay.

- **Source avatar:** CoolStickman, project "100Avatars R2"
- **Author:** Polygonal Mind
- **License:** CC0 1.0 (public domain — commercial use allowed, no attribution required; we credit anyway)
- **Source page:** https://www.opensourceavatars.com/en/finder?avatar=coolstickman
- **Original format:** VRM 0.x (Mixamo-rigged, ~3,268 tris, 1 material, 1 texture)

## What the bake does

The original is a skinned VRM in a T-pose. We bake it offline (see
`.scratch/bake-stickman.mjs`, kept out of the build) into a **static** BufferGeometry:

1. Pose the arms down at the shoulders (T-pose reads as a wide blob from the replay's angled
   camera; arms-down reads as a person).
2. Freeze the skinning into static vertices (no skeleton in the shipped asset).
3. Rotate 180° about Y so the figure faces **+Z** (the replay's forward axis; VRM 0.x faces −Z).
4. Drop the skin texture/UVs — the body is tinted per-instance by the renderer, so a plain
   `MeshStandardMaterial` is used and the texture would only fight the tint.
5. Recenter on X/Z with feet at y=0.

Result: `coolstickman-baked.glb` — 1 mesh, 1 material, 3,268 tris, feet-anchored, facing +Z.
Instanced as the player body layer in
`src/features/fight_replay/components/InstancedReplayFigures3D.tsx`.
