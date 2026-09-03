# Fight replay actor-model pipeline

The replay has an opt-in proving ground for enemy and boss models. Add
`?npcModels=prototype` to a replay URL to render hostile actors with the existing licensed
CoolStickman flipbook. Without that exact value, enemies and bosses retain their capsule markers.
Players continue to use CoolStickman in either mode.

This switch tests model loading, selection, instancing, animation, coloring, and fallback behavior
without shipping art derived from ESO. A failed or unsupported model always falls back to the
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

## Asset acceptance gate

- Written provenance and a redistribution-compatible license are committed with the GLB.
- The model is feet-anchored at `y=0`, faces `+Z`, has a stable real-world scale, and contains every
  pose mesh expected by its renderer.
- Geometry and material counts fit the replay's 50-plus-actor performance budget; hostile crowds
  remain instanced and do not allocate per-actor animation mixers.
- Idle, movement, death, tinting, picking, and capsule fallback remain deterministic while seeking,
  pausing, and replaying the same timeline.
- A missing or malformed asset is recoverable and never hides the actor.

The next increment should introduce archetype/name matching and per-archetype animation ranges,
then test one clearly licensed biped and one non-humanoid creature before commissioning final art.
