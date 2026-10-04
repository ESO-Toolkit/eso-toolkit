# Fight-replay NPC reconstruction

Rebuilds an ESO NPC as a runtime-ready GLB from published reference screenshots.
Adding a new NPC is: put the plates somewhere, write one config under `npcs/`,
run one command.

## Interpreter

**There is no standalone Blender in this project.** Every script here runs under
the project's Python interpreter, which supplies both CUDA torch and `bpy`:

```powershell
<venv>/Scripts/python.exe tools/fight-replay-models/build-npc-asset.py `
  tools/fight-replay-models/npcs/captain-vrol.json --workspace <reconstruction-workspace>
```

`blender --background --python ...` will **not** work. Older revisions of this
README documented that form; it was never correct for this environment.

Only `generate-hunyuan-multiview.py` needs the GPU. Everything else is CPU.

## Adding an NPC

1. **Collect plates.** A clean full-body front and back in the same pose,
   lighting and camera. Closeups are optional but are where detail comes from.
2. **Generate geometry** (GPU, once):
   ```
   python generate-hunyuan-multiview.py --front front.jpg --back back.jpg --output draft.glb
   ```
3. **Cut plates and register closeups.** Run the build once to populate
   `<work>/plates`, then:
   ```
   python register-npc-plates.py --references refs/<slug> --plates build/<slug>/plates \
       --closeup view-07.jpg --role torso --view front \
       --closeup view-04.jpg --role helm  --view front --region head
   ```
   It prints the fit and saves a 50% overlay per plate. **Look at every overlay.**
   Paste the printed JSON into the config and set `accepted` yourself, recording
   a reason for anything rejected.
4. **Write `npcs/<slug>.json`** (copy an existing one) and run
   `build-npc-asset.py`. You get the GLB plus `<slug>-build-report.json`.

### Side plates

If the reference page publishes a true left and/or right profile, declare it and
the projection gains that camera:

```json
"side_plates": {
  "available": true,
  "left": { "file": "view-14.jpg", "role": "full-body-left" }
}
```

Absent (every config shipped so far records `"available": false` and why), the
projection runs on two cameras and is numerically unchanged. A config that lists
a file while declaring `available: false` is rejected rather than guessed at.

**Only HEIGHT is registered.** A profile silhouette's width is the subject's
_depth_, which has no counterpart in the front plate's width, so there is nothing
horizontal to match and none is attempted: the side capture is cropped to its own
square sized so the subject fills the same fraction of it as on the base plates
(a uniform scale expressed as a crop, so nothing is resampled). That assumes the
capture shows the same subject, same pose, at full height. A vertically cropped
profile breaks the assumption and is reported as a build warning rather than
silently absorbed.

Before sourcing profile plates, measure whether they would pay:

```
python measure-view-coverage.py <mesh>.glb
```

It reports "neither camera" and grazing fill for two versus four cameras on the
real charts, with no plates and no GPU.

### Registration is deliberately not automatic

Four automatic accept/reject gates were tried and all failed on known cases:
whole-body silhouette width matching, masked NCC on raw greyscale, the same
low-passed, and silhouette precision/recall. Each accepted a helm plate that had
locked onto the torso and/or rejected a torso plate that was visibly correct,
because a frame-cropped closeup collapses to a body-shaped blob under any global
statistic. `--region head` (match only above the shoulder line) fixes the helm
failure mode; human overlay review is the gate. The config records the decision
and the measured error so acceptance is data, not a lost conversation.

## What the engine does

Reference plates are projected **directly into the UV atlas at texel
resolution**. For each texel: unproject to a surface point and normal, test
visibility against per-camera orthographic depth buffers, project into every
supplied plate, sample bilinearly, and blend by how squarely each camera sees
that surface.

There are **up to four cameras**: front and back always, plus left and right
when - and only when - the config supplies real profile plates. See "Side
plates" below.

Load-bearing details, each of which was a bug once:

- **Plates are read at native resolution.** Pre-upsampling manufactured
  staircase detail that measured as sharpness and mipped to mush.
- **Sampling is alpha-weighted bilinear with 2x2 supersampling**, not
  nearest-neighbour.
- **Closeups stay separate native-resolution files** with a recorded
  (scale, row, col) transform. Compositing them into an enlarged canvas costs a
  resample for nothing.
- **The grazing fill is chart-local.** Texels no camera sees squarely (~35%)
  otherwise keep a silhouette-edge pixel smeared sideways. The neighbour search
  is restricted to the same UV chart so colour cannot cross a seam.
- **UV density is weighted toward the head.** The head is unwrapped from an
  enlarged copy of the mesh; the UVs are applied to the untouched original. With
  a uniform unwrap the face renders from about a 100x100 patch, which is the
  whole explanation for "blurry face". The warp must be _local_ - scaling about
  the model centre degenerates the neck into slivers whose area swamps the atlas.
- **Tone matching is area-weighted**, so it does not move when UV area is
  re-allocated.
- **Order matters**: sample -> grazing fill -> tone -> unsharp -> dilate ->
  encode. Sharpening earlier amplifies resampling artefacts.

## Constraints the build report checks

Static reconstruction assets: one mesh, one material, one draw call. No skins, animations, morph targets or
glTF extensions - the browser runtime registers no `DRACOLoader` or meshopt
decoder. 1024 atlas, JPEG q92 with **no chroma subsampling** (these atlases are
flat colour blocks; 4:2:0 smears exactly the boundaries that carry identity).
Feet at y=0, horizontally centred, under 2.5 MB.

`build-npc-asset.py` exits non-zero if any check fails.

## Yandir skeletal pilot

`yandir-rigged-v2.py` adds an authored 17-bone rig to the shipped optimized
`public/models/fight-replay/npcs/yandir-the-butcher-overview-v2.glb`. Run from
the repository root with the same `bpy` interpreter; this step uses CPU only:

```powershell
& 'B:/CodexScratch/eso-fight-replay-3d/.venv/Scripts/python.exe' tools/fight-replay-models/yandir-rigged-v2.py
```

It writes `public/models/fight-replay/npcs/yandir-the-butcher-rigged-v2.glb`:
45,000 triangles, 29,613 exported vertices, one material, the unchanged embedded
1024px JPEG, a 3.2-second `idle` clip (97 samples), and two-second `walk` and
`cast` clips (61 samples each). Rest bounds and orientation are preserved; the
GLB is 2,411,900 bytes. This derivative retains
the original asset's project-authorized fan-prototype provenance. The motion is
authored skeletal animation, not generated by UniMate or another ML service.

Idle uses rotation-only spine, chest, head, and arm motion with planted feet. Cast is
a constant raised-arm pose: the production 600 ms reaction supplies one
sin-squared envelope, avoiding v1's compounded clip/runtime attenuation.

Check the exported asset with the same CPU interpreter:

```powershell
& 'B:/CodexScratch/eso-fight-replay-3d/.venv/Scripts/python.exe' tools/fight-replay-models/check-yandir-rig.py --require-visible
```

The check writes `scratch/yandir-rig-validation.json`. It verifies unchanged
texture bytes and rest bounds, normalized weights, bone-only channels and a
stationary scene root, loop endpoints, and planted idle/cast feet and walk
stance contact. `--require-visible` additionally requires at least one pixel
of idle outer-boundary travel at 48 px projected rest height from each of four
45-degree elevated views. These measurements use the deformed mesh silhouette;
they exclude shading and interior contours. Review the production cast blend
and continuous motion in the replay as well.

The v2 acceptance run measured 2.40–2.77 px maximum idle boundary travel across
the four reviewed views, passing the 1 px minimum. Texture/rest-bounds,
weight, loop, stationary-root, and foot-contact checks passed.

All animation tracks target bones; the scene root stays stationary. The walk
cycle covers 0.6310190558433533 model units before runtime scale. The replay
samples clips using explicit replay time and logged travel distance, with an
independent skeleton and mixer per actor. Review continuous motion with matching
root translation, starts/stops, and backward seeking at replay scale before
releasing a rebuilt rig. Static Yandir is the loading/failure fallback; this
pilot does not change other NPC models or barebones mode.

## Scripts

| script                          | purpose                                                             |
| ------------------------------- | ------------------------------------------------------------------- |
| `build-npc-asset.py`            | orchestrator: config in, GLB + build report out                     |
| `npc_pipeline.py`               | engine: projection, UV density, tone, unsharp, measurement          |
| `npc_references.py`             | plate cutting and registration                                      |
| `register-npc-plates.py`        | fit closeups, emit overlays and config snippets                     |
| `measure-view-coverage.py`      | how much a second camera pair would buy, before sourcing plates     |
| `render-npc-views.py`           | five review views, head crops, clay, replay-distance strip          |
| `measure-npc-asset.py`          | audit an existing GLB without rebuilding it                         |
| `decimate-mesh.py`              | Blender-collapse decimation to a triangle budget                    |
| `prepare-static-boss.py`        | deterministic runtime gate: ground, centre, budget, export          |
| `reencode-glb-texture.py`       | swap the embedded texture at a chosen JPEG quality                  |
| `generate-hunyuan-multiview.py` | GPU: draft geometry from front/back plates                          |
| `yandir-rigged-v2.py`           | CPU: authored Yandir skeletal rig and in-place idle/walk/cast clips |
| `check-yandir-rig.py`           | CPU: exported rig, contact, and replay-scale silhouette checks      |

### Removed

The vertex-colour path was deleted. It carried colour on mesh vertices and baked
it to a texture at the end, capping colour at roughly a ninth of what a 1024
atlas holds, and produced the smeared results that were rejected. Git history
retains it if it is ever needed.

- `project-reference-vertex-colors.py` - superseded; its silhouette
  normalisation survives as `npc_pipeline.projected_u`
- `bake-vertex-colors-to-texture.py` - superseded; also blurred colour across
  thin geometry via an unguarded nearest-neighbour transfer
- `polish-yandir-overview.py` - identity-specific; replaced by `decimate-mesh.py`
- `project-reference-atlas.py` - superseded by the texel projector
- `prepare-reference-cutouts.py` - folded into `npc_references.prepare_base_plates`
- `render-glb-turntable.py` - superseded by `render-npc-views.py`

## Known limitations

- **Without side plates the sides are still undescribed.** Roughly a third of
  texels face neither camera on a two-view build. The grazing fill keeps them
  plausible; it does not invent detail, and profile views stay soft. Most
  reference pages publish no profile, and **synthesising one is not permitted** -
  the answer is fewer cameras, not a generated view.
- **A side camera is not free.** The blend weight is `exp(blend_power * (cos-1))`
  for every camera, so at the default `blend_power` 3.0 a camera 90 degrees away
  still carries `e^-3` = 4.5% raw weight. A four-camera build therefore takes ~9%
  of a perfectly front-facing texel from the two side plates, against ~0.25% from
  the back plate on a two-camera build. Raising `projection.blend_power` is the
  knob for that.
- **More cameras do not fix a near-horizontal limb.** That defect is
  silhouette-normalised `u` breaking where one height slice spans a whole wing,
  and it happens on surfaces the front camera already sees square-on. Measured on
  Falgravn: the side cameras see the wing at |cos| 0.135, so they could never
  carry it. A registered closeup on the limb is the fix.
- **A horizontal discontinuity across the jaw/upper chest remains.** Widening
  the head gate feather (`regions.head_feather`) reduces it. It is _not_ the
  closeup frame feather and _not_ the grazing fill - both were ruled out by
  experiment. The residue appears to be a near-horizontal surface being sampled
  from front-plate rows, which is inherent to this projection.
- **Reference resolution is the ceiling.** A subject ~700 px tall in the source
  gives ~200k usable pixels across both plates; a 1024 atlas is already
  oversampled relative to that. Bigger atlases add bytes, not detail.
