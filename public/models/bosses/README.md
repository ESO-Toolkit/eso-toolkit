# Boss GLB Models

Real ESO creature meshes extracted from the game's GR2 archives (PR #877 toolchain), one `.glb` per
creature. Naming: `{model_name}.glb` (e.g. `AirAtronach_Coral_Boss.glb`).

Regenerate one with:
`eso-model-extractor convert --file-index {fi} --output {name}.glb` (see `tools/eso-model-extractor`).

## What's here (and what's deliberately not)

These are the **real, distinct creature meshes** that the June-2026 audit marked **Keep** /
**Keep-shared** — i.e. the extracted geometry is a genuine ESO creature that matches the boss. They are
geometry-verified and research-name-matched, but **pending the maintainer's visual confirmation**
(render the model and eyeball it against the in-game boss). See
`documentation/features/trial-boss-models/MODEL-AUDIT-2026-06.md` for the full per-boss table.

**Not committed here (on purpose):**
- **16 humanoid placeholders** (Xoryn, The Warrior, the Cloudrest Shades, Jynorah & Skorkhif, …). ESO
  builds these from a modular player skeleton + armor; there is no single standalone creature mesh, so
  PR #877 gave them a shared generic-humanoid stand-in. Committing those would mislabel a stand-in as a
  real boss model.
- **10 wrong/mis-mapped creatures** (the 3 Factotum saints, Assembly General, Overfiend Kazpian = a
  Ruinach, Reef Guardian = a Coral Golem, …). These need a corrected extraction before they're real.

## Note on the Sunspire dragons

`Lokkestiiz_Dragon.glb`, `Nahviintaas_Dragon.glb`, and `Yolnahkriin_Dragon.glb` share the ESO dragon
**body** geometry (correct — all three are the same dragon skeleton in-game). They are meant to be
differentiated by **material/texture** (Lokkestiiz frost-white, Yolnahkriin red-fire, Nahviintaas gold),
which is a texture task, not a separate mesh. Treat the geometry as correct and the per-dragon skin as
pending.
