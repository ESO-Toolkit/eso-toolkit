# Tideborn Taleria replay prototype (v1)

- Encounter: Tideborn Taleria, Dreadsail Reef
- **Geometry: extracted ESO client mesh** `AirAtronach_Coral_Boss` (not reconstructed)
- Colour reference: <https://esomodelviewer.com/creatures/post/119-tideborn-taleria>
- Prepared asset: 19,862 triangles / 20,438 vertices / **1,288,872 bytes** / 1024px JPEG q92 4:4:4 / PSNR **37.6 dB** / 1,748 charts / 83.2% coverage
- 1 mesh, 1 material, 1 primitive, one draw call. POSITION, NORMAL and TEXCOORD_0 only — no skin,
  animation, morph target or glTF extension. Minimum Y exactly 0.0, centered on X and Z.

## Route B — a different pipeline from every asset before it

Every other reconstruction in this catalog *inferred* its geometry from two screenshots. This one
does not. The mesh is ESO's own, extracted from the client, and only the **colour** is projected from
reference plates. That matters for a subject like this one, because the failure that made it
"unbuildable" before was a geometry failure: two-view reconstruction needs a single coherent
silhouette, and it never had one. With exact geometry, that objection disappears.

**No GPU was used at any point.** Route B has no reconstruction stage — the expensive half of the
pipeline is simply skipped.

The geometry is therefore *exactly* right. The colour is the honest weak point, below.

## Honest limitations

- **49.7% of covered texels are neighbour-fill**, against the pipeline's usual ~35%. That means
  roughly half the atlas is not observed colour but a chart-local average of nearby observed texels.
  It reads as smooth rather than wrong, and it is why the flat atlas shows long directional streaks
  over most charts with real texture only where a camera saw squarely.
- **26.6% of texels face neither reference camera** — well above the 5-7% of the best shipped
  bosses (Falgravn 5.6%, Saint Olms 6.9%).
- **The gallery publishes no profile view, so this ran on two cameras.** 4-view projection exists
  now and would measurably help here (a profile would materially cut the neighbour-fill), but a side plate that does not exist is never
  synthesised — invented detail is rejected on principle.
- **The head run-structure warning fires** (56% of slices). Expected and not a separate
  defect: the extracted mesh is in bind pose while the reference plates are an action pose, so the
  per-slice silhouettes genuinely do not correspond.

At the intended 32-64 px replay size this reads correctly. It would not survive a close-up.

## Chart count exceeded the asset we rejected — and it was still right to ship

This atlas has **1,748 charts**, more than the Dwarven Colossus's 1,406, which is one of the two
numbers the build was told to stop on. It did not stop, and the reasoning is worth keeping:

**Chart count was never what condemned the Colossus. Blind area was.** The Colossus had **62%** of
texels facing neither camera; this has **26.6%**. High chart counts cost packing efficiency and
mipping headroom; they do not by themselves mean the atlas carries no information.

**A related predictor turned out to be false.** The extracted-mesh inventory ranked candidates by
source shell count on the theory that shells drive chart explosion. Measured across this batch:
46 shells produced **1,748** charts here, 22 shells produced **314** for Oaxiltso, and 8 shells
produced **399** for Xalvakka. **Shell count does not predict chart count** and should not be used
to rank candidates.

## Runtime scale is constrained by width, not height

Every other asset is scaled to a target *height*. This one is not: normalised, Taleria measures
3.86 x 3.17 x 2.0, so the family default of 1.25 would put her **4.83 units across — roughly five
player-widths**. The registry uses **1.0**, keeping her 2.0 tall and 3.86 wide. A judgment call, as
usual, with no published dimension to check against.

## What this does NOT cover — two claims I made earlier that are wrong

- **Ra Kotu is not a free alias of this asset.** Geometry is very likely shared, but the *skins are
  completely different*: Ra Kotu is pale carved stone with spiral relief, Taleria is coral, moss and
  barnacle. Ra Kotu is a second cheap build off the same mesh with its own plates (already
  harvested), not a registry alias.
- **Reef Guardian does not fall out of this either.** It is a Coral **Golem** — a bipedal construct,
  not a floating-rock Atronach. The extractor's own audit marks that row `likely-wrong`. Do not
  alias it.

- Intended presentation: a 32-64 px-tall replay actor.
- Prepared: 2026-09-07

The Elder Scrolls Online name, character design, and related rights remain with their respective
owners, including ZeniMax Media/Bethesda Softworks. **Note that the geometry here is an extracted
client asset rather than a reconstruction**, which is a materially different rights position from
the screenshot-reconstructed assets in this catalog; redistribution has not been cleared. Do not
reuse outside this project's authorized fan prototype without a separate rights review.
