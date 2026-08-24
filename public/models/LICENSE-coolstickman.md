# CoolStickman — asset attribution

`coolstickman-walk.glb` is the shipped static GLB flipbook of the **CoolStickman** avatar, used as
the player figure marker in the 3D fight replay. It contains one idle pose and four walk-cycle
poses (`idle`, `walk1`, `walk2`, `walk3`, and `walk4`) as named meshes.

- **Source avatar:** CoolStickman, project "100Avatars R2"
- **Author:** Polygonal Mind
- **License recorded for the source avatar:** CC0 1.0 (public domain; no attribution required, but
  attribution is retained here)
- **Source page:** https://www.opensourceavatars.com/en/finder?avatar=coolstickman
- **Original format:** VRM 0.x (Mixamo-rigged, ~3,268 tris, 1 material, 1 texture)

## What the shipped asset contains

The original is a skinned VRM. The repository's offline bake produces static BufferGeometry poses:

1. Pose the arms down at the shoulders (T-pose reads as a wide blob from the replay's angled
   camera; arms-down reads as a person).
2. Freeze the skinning into static vertices (no skeleton in the shipped asset).
3. Rotate 180° about Y so the figure faces **+Z** (the replay's forward axis; VRM 0.x faces −Z).
4. Drop the skin texture/UVs — the body is tinted per-instance by the renderer, so a plain
   `MeshStandardMaterial` is used and the texture would only fight the tint.
5. Recenter on X/Z with feet at y=0.

Result: `coolstickman-walk.glb` — five named meshes, one material per pose, feet-anchored and facing
the replay's forward axis. It is instanced as the player body layers in
`src/features/fight_replay/components/InstancedReplayFigures3D.tsx`.
