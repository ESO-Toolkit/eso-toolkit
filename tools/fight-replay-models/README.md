# Fight replay model preparation

This folder contains deterministic Blender post-processing for reconstructed fight-replay assets.
The canonical requirements are in
[`documentation/architecture/fight-replay-yandir-asset.md`](../../documentation/architecture/fight-replay-yandir-asset.md),
the shipped inventory in
[`fight-replay-npc-asset-manifest.md`](../../documentation/architecture/fight-replay-npc-asset-manifest.md),
and the per-attempt GPU record in
[`fight-replay-npc-gpu-queue-log.md`](../../documentation/architecture/fight-replay-npc-gpu-queue-log.md).

## Running these scripts

**There is no standalone Blender install on the current workstation.** The
`blender --background --python ...` form shown below will not run as written. Drive every script
through the Hunyuan environment's interpreter instead, which supplies both CUDA `torch` and `bpy`
as a module:

```powershell
B:/CodexScratch/eso-fight-replay-3d/.venv/Scripts/python.exe `
  tools/fight-replay-models/<script>.py -- <args>
```

The `--` separator is still required: the scripts slice `sys.argv` after it.

GPU work is serialized through a single operator — record the job in the queue log, run one
process, confirm it exited and that VRAM was released, and only then start the next.

## Static boss command

When the generated texture is incomplete, first project four transparent reference views onto the
draft mesh. `left.png` and `right.png` may be carefully generated turnaround references when the
source only exposes front/back captures, but record that derivation in the asset provenance:

```powershell
blender --background --python tools/fight-replay-models/project-reference-atlas.py -- `
  draft.glb front.png back.png left.png right.png projected.glb projected-atlas.png
```

Then use Blender 5.x in background mode to create the runtime LOD:

```powershell
blender --background --python tools/fight-replay-models/prepare-static-boss.py -- `
  input.glb output.glb --max-triangles 16000 --texture-size 1024
```

The script joins mesh objects, applies transforms, centers the model horizontally, grounds its
feet, enforces the triangle budget, downsizes embedded textures, removes unused data, and exports a
plain GLB. Do not enable Draco without adding `DRACOLoader` to the browser runtime.

Keep projection and runtime preparation separate. Projection prioritizes reference fidelity and may
retain a dense source mesh; preparation is the deterministic budget/grounding/export gate.

## Vertex-color overview command

For small overhead actors, prefer a single vertex-colored material when it preserves the important
color blocks. After projecting the reference views with `project-reference-vertex-colors.py`, apply
the identity-specific bounded pass:

```powershell
blender --background --python tools/fight-replay-models/polish-yandir-overview.py -- `
  dense-vertex-colors.glb yandir-the-butcher-static-v1.glb `
  --target-triangles 90891 --keep-first-mesh
```

Yandir is a documented hero-boss exception: one mesh/material/draw call, no texture, 90,891
triangles, 45,448 vertices, and 2,182,640 bytes. The dense geometry preserves the projected vertex
colors that were visibly lost in a 10,000-triangle candidate. `--keep-first-mesh` discards rejected
separate helmet additions. Color grading and silhouette add-ons are opt-in; preserve the projected
source colors by default. Lesser enemies should remain within the normal 5,000-12,000 triangle
budget.

When a dense vertex-colored result is visually acceptable but too expensive, bake those colors to
a conventional texture while simplifying the mesh:

```powershell
python tools/fight-replay-models/bake-vertex-colors-to-texture.py `
  yandir-the-butcher-static-v1.glb yandir-the-butcher-static-v2.glb `
  --target-triangles 45000 --texture-size 512
```

The script transfers the reviewed source colors, creates a non-overlapping UV atlas, pads its
islands, and exports one textured PBR mesh. For replay-scale actors, use 512 px as the shipping
default, 1024 px only when a boss is shown materially larger, and 2048 px as an inspection/bake
master rather than a runtime default. Yandir retained the same visible color blocks at 512 px while
dropping from 90,891 to 45,000 triangles; always inspect front, back, and both sides because a front
comparison alone can hide UV seams.

For a 16 GB RTX 4070 Ti Super, Hunyuan3D-2mv geometry plus Hunyuan3D Paint is a practical local
draft path. Keep the high-detail reconstruction outside `public/`; only the reviewed replay LOD is
a runtime asset.
