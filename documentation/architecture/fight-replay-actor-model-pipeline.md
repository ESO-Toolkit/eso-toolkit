# Fight replay actor-model pipeline

The replay has an opt-in proving ground for enemy and boss models. Add
`?npcModels=prototype` to a replay URL to render hostile actors with the existing licensed
CoolStickman flipbook. Without that exact value, enemies and bosses retain their capsule markers.
Players continue to use CoolStickman in either mode.

This switch tests model loading, selection, instancing, animation, coloring, and fallback behavior.
Named project-authorized fan prototypes may also be selected by the registry; their provenance and
limitations must be recorded beside the asset. A failed or unsupported model always falls back to the
actor's capsule, so an asset failure cannot make combatants disappear.

## Production asset workflow

1. Start with original artwork or source material whose license explicitly permits the intended
   use. The project owner has approved ESO Model Viewer captures as visual and reconstruction
   references for fan prototypes. Record the source page and capture URLs, and label resulting
   assets as project-authorized fan prototypes rather than CC0 or officially licensed ESO assets.
2. Build several consistent views. Tripo, Pixel3D, or another image-to-3D tool can produce a draft,
   but the output still needs artist review, retopology, UV and material cleanup, and scale checks.
3. Rig in Tripo, Blender, AccuRig, or Make-It-Animatable. Mixamo is useful for conventional bipeds;
   unusual creatures generally need a custom rig and animation set.
4. Bake a small deterministic pose set offline and export an optimized GLB. The browser renderer
   keeps the current instanced pose-flipbook design instead of creating an animation mixer for
   every actor.
5. Add the asset to `replayActorModelRegistry.ts` with its source, author, license, and attribution
   file. Add resolver and fallback tests before enabling it for an archetype.

Use three explicit fidelity stages so a large enemy roster can be delegated without unlimited
per-model iteration:

1. **Source draft:** preserve the highest useful reconstruction outside `public/`, including the
   reference views and generator metadata.
2. **Overview identity LOD:** ship a static, single-material GLB whose silhouette and largest color
   zones read at 32-64 px actor height. Lesser enemies should target 5,000-12,000 triangles; standard
   bosses can use 20,000-50,000. A one-at-a-time hero boss may use up to 100,000 triangles when the
   exception is documented, the asset stays one draw call, and replay-scale review proves that a
   lower LOD loses identity-defining vertex-color detail.
3. **Animated version:** return to the source draft only after the overview LOD passes replay review.
   Rig and bake the small deterministic replay pose set into a separately versioned asset rather
   than increasing the static LOD's detail.

For a delegated asset task, provide one reference page, the intended replay height, the geometry and
file-size ceilings, and the exact adjacent provenance filename. The done-condition is a browser-
loadable GLB plus recorded mesh/primitive/material/texture counts, dimensions, byte size, registry
fallback tests, and an owner-visible screenshot. Permit one bounded silhouette/color polish pass
after the first browser render; further close-up polish requires a replay-visible defect.

Needle's Mesh Baker is appropriate after animation when a static pose or distance LOD is desired;
its baked result no longer contains the original rig or animation hierarchy. `motion-bricks.cpp`
targets Unitree G1 robot locomotion and is not part of this browser combat-replay pipeline.

## First reference target

[Yandir the Butcher](https://esomodelviewer.com/characters/post/82-yandir-the-butcher) is the first
boss candidate. The reference page currently provides nine views and reports a source mesh of
22,100 triangles, 11,400 vertices, and dimensions of 1.04 x 2.26 x 0.52 meters. Preserve those
figures as source metadata; they are not the replay asset's required output budget. Any generated
prototype should include its generator, settings, date, source links, and a
`project-authorized-fan-prototype` designation until separate redistribution terms are documented.
The current generated asset, reproducible preparation command, runtime mapping, and handoff status
are documented in [Yandir replay asset](fight-replay-yandir-asset.md).

## Asset acceptance gate

- Written provenance and a redistribution-compatible license are committed with the GLB.
- The model is feet-anchored at `y=0`, faces `+Z`, has a stable real-world scale, and contains every
  pose mesh expected by its renderer.
- Geometry and material counts fit the replay's 50-plus-actor performance budget; hostile crowds
  remain instanced and do not allocate per-actor animation mixers.
- The overview model reads at 32-64 px actor height. Tiny face, carving, and surface details do not
  justify added geometry when they disappear at that presentation size.
- Preserve projected vertex colors by default. Do not apply global grading or aggressive decimation
  when it visibly erases the color samples that carry the asset's armor and clothing detail.
- Idle, movement, death, tinting, picking, and capsule fallback remain deterministic while seeking,
  pausing, and replaying the same timeline.
- A missing or malformed asset is recoverable and never hides the actor.

The registry now supports exact normalized boss-name matching for a static Yandir prototype. The
runtime also supplies allocation-light, whole-model overview motion from replay time: subtle idle
breathing, movement weight, and a grounded death fall. This works on an unrigged one-draw-call boss,
stays deterministic through pause and seek, and is the default first animation stage for reconstructed
bosses.

Do not synthesize stagger from incoming damage: frequent damage would make bosses continuously flinch.
Attack, cast, interrupt, and stagger clips belong to a second stage after the position worker exposes
explicit timestamped animation cues. Skeletal clips are a third, opt-in stage for bosses whose weapons
or silhouette make the additional rigging and runtime cost visible at replay scale. Lesser enemies
should normally share an instanced pose flipbook instead of owning animation mixers.
