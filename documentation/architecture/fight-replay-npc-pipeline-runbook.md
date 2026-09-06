# Fight replay NPC pipeline — runbook

How to take an ESO NPC from reference screenshots to a runtime-ready GLB in the fight replay, and
the failure modes that cost us real time. This is the operational document; the
[asset manifest](./fight-replay-npc-asset-manifest.md) records what shipped, and the
[GPU queue log](./fight-replay-npc-gpu-queue-log.md) records each attempt.

Read this before building a new NPC. Most of it is hard-won: every "do not" below is something that
already went wrong once.

## The shape of the problem

Reference plates are the binding constraint, not GPU time. Vrol's geometry took **70.9 seconds** on
the GPU and was accepted first time. Everything else — several days of work — was texture, UV
allocation, and one URL bug. Budget accordingly:

| Stage                    | Compute | Typical cost | Where the risk is                       |
| ------------------------ | ------- | ------------ | --------------------------------------- |
| Reference sourcing       | none    | hours        | **Highest risk.** No plates = no model. |
| Geometry (Hunyuan3D-2mv) | **GPU** | ~1-2 min     | Low. Front+back is enough.              |
| Texture projection       | CPU     | minutes      | Moderate — most defects live here.      |
| UV allocation            | CPU     | minutes      | High impact, easy to get wrong.         |
| Runtime integration      | CPU     | minutes      | One silent-failure trap (see below).    |

## Environment

- Interpreter for **every** stage: `B:/CodexScratch/eso-fight-replay-3d/.venv/Scripts/python.exe`
  (Python 3.11, torch cu128, `hy3dgen`, `trimesh`, `xatlas`, `pymeshlab`, `rembg`, `bpy` 5.0.0).
- **There is no standalone Blender on this workstation.** `blender --background --python …` does not
  run. Drive `bpy` through the venv interpreter, passing `--` before script arguments.
- The GPU is a single-worker resource. One job at a time; record it in the queue log first, confirm
  the process exited and VRAM was released before starting another.

## Building one — the short version

```bash
B:/CodexScratch/eso-fight-replay-3d/.venv/Scripts/python.exe   tools/fight-replay-models/build-npc-asset.py tools/fight-replay-models/npcs/<slug>.json
```

Adding an NPC is: drop the reference plates somewhere, run `register-npc-plates.py` to fit the
closeups and print the config block, **look at the overlays it saves**, paste the block into
`npcs/<slug>.json`, then run the orchestrator. It emits the GLB plus a JSON build report carrying
every number a reviewer needs, and exits non-zero if any acceptance check fails.

Registration acceptance is deliberately human — four automatic gates were tried and all of them
accepted a known-bad plate or rejected a known-good one. Someone must look at the overlay.

`uv_density.head_scale` is hand-tuned per NPC (Vrol 5.5, Yandir 8.0) because head-to-body ratio
varies; expect 2-3 trial runs. `leg_scale` is a trap — leave it at 1.0.

## The stages

1. **Source reference plates.** Prefer `esomodelviewer.com`. A usable set is a clean full-body
   **front** and **back** on a plain backdrop. Closeups (torso, helm, legs) are a large bonus — they
   carry roughly 2x the linear resolution of the full-body plate.
2. **Geometry** — `generate-hunyuan-multiview.py`, front + back only. This is the one GPU stage.
3. **Texture** — project the plates **directly into the UV atlas at texel resolution**.
4. **UV allocation** — re-pack with the head weighted up (see below).
5. **Runtime prep** — decimate, ground, export, encode.
6. **Register** in `replayActorModelRegistry.ts` with provenance, and record in the manifest.

## Rules that matter

### Judge a texture by its flat atlas, never by renders

A fragmented or smeared atlas can still render acceptably from whichever angles you happen to check.
Extract the embedded image out of the GLB and look at it. This single omission shipped a bad texture
twice.

### Project into the atlas per texel; never bake from vertex colours

Vertex colours cap surface detail at the vertex count — on a 45k-triangle asset that is roughly
**19x less** colour information than the atlas holds, and the KD-tree blend smears across the surface
and can pull colour through thin limbs. Both bosses shipped once as featureless plastic because of
this. Unproject each texel to its surface point and normal, project into the front and back cameras,
blend by facing angle, reject occluded samples.

### Weight UV allocation towards the face

A default unwrap spends texels in proportion to 3D area, which gave the face **~103 x 103 texels,
about 1% of the atlas**. That is the entire reason a face reads as pixelated, and no amount of
sharpening or JPEG quality can beat it. Unwrap from a **density-warped copy** of the mesh with the
head enlarged, then apply the resulting UVs to the untouched original — geometry never changes.
Result: face texels went 10,782 → 62,393 (Vrol) and 10,506 → 57,113 (Yandir), ~2.4x linear.

Two traps inside this:

- **Warp about the vertical axis, not the model centre.** Centre-scaling displaces the head and turns
  the neck ramp into slivers; scaling then saturates and no amount of pushing helps.
- **Make tone statistics area-weighted.** Re-allocating UV space changes the unweighted atlas mean,
  which silently flips the exposure correction and darkens the whole body.

Do **not** fund the head by shrinking the legs. Two attempts destroyed the tassets and then the boot
trim. Recovered gutter area (padding 4 at pack resolution 2048, coverage 57% → ~73%) pays for it.

### Register closeups on the region band, not the whole silhouette

Whole-body silhouette matching is dominated by the torso, so a helm plate mis-locks onto the chest —
that is why helm closeups were wrongly rejected for a whole round. Match **head rows only** for a
head plate. Confirm every registration with a 50% overlay before use.

**Reject rather than force any registration you cannot verify.** A wrong plate on the face is far
worse than a soft one. Note also that a lower numeric error does not override content: Yandir's face
plate scored better against the _back_ than the front, and following the number would have mapped his
beard onto the back of his head.

### Fill grazing texels, chart-locally

About 34% of texels face neither camera squarely. Left raw they keep silhouette-edge pixels stretched
sideways — visible streaking on shoulder tops and pauldrons, which is exactly where the elevated
replay camera looks. Fill from a **chart-local** neighbour average (restrict the search to the same UV
chart so colour cannot cross a boundary), ramp the blend by `(threshold − observed)/threshold`, and
skip islands with too few well-observed texels. Filled regions read smooth — that is honest, since no
plate observed them.

### Band-limit the silhouette envelopes (`projection.envelope_sigma`)

Both bosses shipped with a hard horizontal bar across the chin/beard and the tops of the pauldrons.
It was assumed for a while to be an irreducible two-view artefact. **It was a bug.**

The horizontal coordinate is silhouette-normalised: a point's x is divided by the _mesh_ silhouette
span in its height slice, then re-expanded by the _plate_ silhouette span at the same v. Both spans
collapse abruptly where the shoulders meet the neck — but at slightly different heights (2-3 slices
apart) and with different shapes, so in that window the two normalisations stop cancelling. Measured
on Yandir, one slice had a mesh/plate span ratio of **2.51**, and a fixed world-space column jumped
**0.23 in u within a single slice** — throwing the sampled plate coordinate **40-70 px sideways in
one texel row**. Vrol had the identical defect at v 0.79-0.82.

The giveaway: the affected band covers the chin _and_ the pauldron tops — disjoint surfaces that
share only a world height. Only a v-driven cause can do that.

Fix: Gaussian-smooth all four envelopes (mesh min/max, plate left/right) along v with one shared
sigma. The normalisation is a deformation field correcting mesh-vs-plate silhouette error, so it
should be band-limited; a step in it corrects nothing and amplifies a small registration error into a
~20% horizontal error. Smoothing both sides identically is self-consistent, so the head still samples
the head. Max per-slice jump drops from ~60 px to ~4 px at sigma 3 (2.3 px is the floor).

Default is **3.0** so a new NPC cannot silently inherit the bug. Raise it if a seam persists (Vrol
needed 6.0). Ruled out by measurement, do not re-test: grazing/no-good-source-view, a source-plate
edge being smeared, and the region gate (which is saturated at 1.0 on both sides of the band — which
is why widening the feather did nothing).

### The shoulder detector breaks on two common shapes

`regions.head_v_min` comes from a detector keyed to the widest upper-body row. Across nine models it
was correct on five and wrong on four, in three distinct modes:

- **Head ornaments that rise above the crown.** All three Cloudrest Shades have feathered
  shoulder pieces taller than the head, so the threshold is crossed at the crown and the detector
  fires far too high (0.96-0.99).
- **Robe cones.** The Mage's widest upper row is the flared robe, so 62% of it is not reached until
  the chest and the detector fires too low (0.647).
- **Wingspans.** Saint Olms returns a 16-28 px head band because the widest row is the wings. For
  that shape the concept fails outright — see the manifest.

A neck-minimum detector was tried as a general replacement and was **worse** (erratic on back plates:
Warrior 0.669, Galenwe 0.624). Until something better exists, **verify the detected row by drawing it
on the plate** and hand-set `head_v_min` when it is wrong. Record which value was hand-set and why in
the config; both shipped batches do.

### Width error is not a reliability signal — the overlay is

Four independent confirmations now, and the strongest is worth stating: **Shade of Siroria's head
plate scored 0.75% width error — the lowest measured anywhere in this project — and its overlay was
grossly oversized.** In the same batch a head plate at 6.80% was rejected and a torso plate at 10.61%
was accepted, purely on the overlays.

An earlier attempt to gate this on profile variance was **disproved against the plates that actually
failed**: the rear-leg plate that doubled the greaves on two models had the _highest_ variation of any
plate (0.401 against 0.17-0.39) while scoring the lowest error. `profile_variation` is therefore
reported as information only. The caveat is attached by role instead — leg, tail and wing plates carry
a standing warning.

Leg plates have now misregistered on **6 of 6** models where they were attempted, with the same
signature: the overlay's boots overshoot below the base plate's feet.

### Concave recessed features may not reconstruct

Two-view marching-cubes reconstruction produces convex hulls where a reference has a recess. The
Celestial Serpent's gold mask, set back inside a hood opening, came out as a smooth convex hood cone
from every angle — the projection then correctly painted the hood's engraving onto that cone. This is
a **geometry** failure and cannot be fixed in the texture stage. Raising octree resolution, adding a
third view that sees into the cavity, or more inference steps are the levers.

### Encode deliberately, then verify

q92, chroma subsampling **disabled** (these atlases carry identity as flat colour blocks, which 4:2:0
smears). **Read the quantization table back out of the GLB** — an exporter asking for a quality does
not guarantee it honoured one. Both assets shipped at q75 while their provenance claimed q92, worth
about 7 dB.

### Join asset URLs to the app base

Use `resolveReplayModelUrl(path, import.meta.env.BASE_URL)`. A bare catalog path resolves against the
_current route_, and the replay is always nested, so it 404s, the loader errors, and the capsule
fallback takes over. That failure is **silent and looks exactly like "this boss has no model"** — it
hid a completely broken model path through several rounds of review.

## Verification gate

Before accepting any asset:

- Open the **flat atlas** and confirm it is not fragmented or smeared.
- Review front, back, left, right, three-quarter, plus a head crop and a replay-distance strip.
- Check the build report: face texels, chart count, coverage, tris, bytes, PSNR, quant table, minY.
- Confirm in the **actual replay**, not just the `/replay-models` viewer — the viewer does not
  reproduce the renderer's `transparent = true` or the orient/scale/ground matrix.
- Confirm the capsule fallback still works for an unknown NPC.

## Known limits — do not spend effort here

- **Side profiles are irreducibly soft** with two views (this is real; the chin/pauldron _seam_ was
  not — see `envelope_sigma` above). ~34% of texels are unobserved; the fill makes
  them smooth, not detailed. Only a genuine profile plate adds real information, and fabricating one
  was judged worse than the limitation.
- **Source resolution is the ceiling.** The character occupies ~700 x 300 px in a full-body plate. The
  atlas is ~3x oversampled against that (46% of it is chart padding), near 1:1 in regions a closeup
  covers.
- Wasted effort, already tested: 2048 atlases, 4x or diffusion upscales, more triangles, q95+,
  deconvolution, unmasked global unsharp, runtime CAS or LOD-bias shaders, xatlas chart-count tuning.
- **Hunyuan3D Paint is unusable here** — it needs a CUDA extension that will not build on this box (no
  `nvcc`, no MSVC), and it is conditioned on a single front image, so it hallucinates back and sides.
- Some NPCs have no face to resolve. Vrol's helm is an eye slit, nose-guard, fangs and an ice beard;
  making those individually legible is the correct outcome and no texture work yields a "face".

## Scaling beyond one boss at a time

The current runtime renders exactly **one** non-instanced `<primitive>` per fight and takes only the
first matching actor. That is correct for a single boss but wrong for trash, which spawns in packs —
one knight would get a mesh and its identical siblings would stay capsules.

Before shipping any lesser enemy, extend the static-model path to render N actors from one shared
geometry: an `InstancedMesh` keyed by asset id, with a per-instance tint so one reconstruction can
serve recolour variants (the three Kyne's Aegis knights are all UESP species _Bloodknight_ — one mesh,
three tints).
