# Oaxiltso replay prototype (v1)

- Encounter: Oaxiltso, Rockgrove
- **Geometry: extracted ESO client mesh** `ArgonianBehemoth_A_Red_Basic` (not reconstructed)
- Colour reference: <https://esomodelviewer.com/creatures/post/83-oaxiltso>
- Prepared asset: 8,130 triangles / 6,831 vertices / **747,916 bytes** / 1024px JPEG q92 4:4:4 / PSNR **37.62 dB** / 314 charts / 75.2% coverage
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

- **49.6% of covered texels are neighbour-fill**, against the pipeline's usual ~35%. That means
  roughly half the atlas is not observed colour but a chart-local average of nearby observed texels.
  It reads as smooth rather than wrong, and it is why the flat atlas shows long directional streaks
  over most charts with real texture only where a camera saw squarely.
- **31.4% of texels face neither reference camera** — well above the 5-7% of the best shipped
  bosses (Falgravn 5.6%, Saint Olms 6.9%).
- **The gallery publishes no profile view, so this ran on two cameras.** 4-view projection exists
  now and would measurably help here (grazing fill would drop 42.6% to 19.3%), but a side plate that does not exist is never
  synthesised — invented detail is rejected on principle.
- **The head run-structure warning fires** (64% of slices). Expected and not a separate
  defect: the extracted mesh is in bind pose while the reference plates are an action pose, so the
  per-slice silhouettes genuinely do not correspond.

At the intended 32-64 px replay size this reads correctly. It would not survive a close-up.

## Why this one mattered

Oaxiltso was previously filed as unbuildable because **every published plate is an action pose**, so
there was no neutral front/back pair to reconstruct from. Route B makes that irrelevant: pose only
has to be matched well enough to carry colour, not inferred into three dimensions.

The mesh arrived already +Y up, +Z front, feet at y=0, needing only a x0.501 scale — 22 shells and
8,130 triangles, the lightest serious candidate in the supply. The post body also confirms the
colour variant: *"Bahsei corrupted him ... resulting in his scales becoming red"*, which matches the
`_Red_` mesh exactly.

## All three closeups were rejected, and one of them is worth noting

`view-04` measured a **healthy 4.96% head-region error** — and the overlay shows **three eyes**, a
doubled crown-spike row and a doubled jaw. This is the third time on this project that the closeup
with the best numeric score has been the wrong plate. The gallery's closeups sit at a different
camera position from the base plates, and a scale-plus-translate registration cannot reconcile that.
`view-07` (16.72%) and `view-06` (16.02%) double the whole body.

**Judge a registration by feature doubling in an overlay, never by its width error.**

- Intended presentation: a 32-64 px-tall replay actor.
- Prepared: 2026-09-07

The Elder Scrolls Online name, character design, and related rights remain with their respective
owners, including ZeniMax Media/Bethesda Softworks. **Note that the geometry here is an extracted
client asset rather than a reconstruction**, which is a materially different rights position from
the screenshot-reconstructed assets in this catalog; redistribution has not been cleared. Do not
reuse outside this project's authorized fan prototype without a separate rights review.
