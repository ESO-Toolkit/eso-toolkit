# Lightning Storm Atronach replay prototype (v1)

- Encounter: Lightning Storm Atronach, Aetherian Archive (first boss)
- **Geometry: extracted ESO client mesh** `StormAtronach_A_Basic` (not reconstructed)
- Colour reference: <https://esomodelviewer.com/creatures/post/154-storm-atronach>
- Prepared asset: 4,425 triangles / 4,991 vertices / **600,496 bytes** / 1024px JPEG q92 4:4:4 /
  PSNR **39.56 dB** / 563 charts / 86.6% coverage
- 1 mesh, 1 material, 1 primitive, one draw call. POSITION, NORMAL and TEXCOORD_0 only — no skin,
  animation, morph target or glTF extension. Minimum Y exactly 0.0, centered on X and Z.

## Route B — a different pipeline from the screenshot reconstructions

The mesh is ESO's own, extracted from the client; only the **colour** is projected from reference
plates. **No GPU was used at any point** — Route B has no reconstruction stage.

That matters more here than for any asset so far. A storm atronach is not one body: it is a cluster
of **96 separate levitating stones** with no continuous silhouette at all. Two-view reconstruction
infers a surface from a pair of outlines, and this subject simply does not have one — the outline
changes identity from slice to slice as different unconnected rocks pass through it. With exact
geometry that objection disappears entirely, and the whole cost of the asset is a CPU projection.

## Reference

The post body names it verbatim — *"used for generic Storm Atronachs and Dread Storm Atronachs, and
for the following unique ones: Bitterwind **Lightning Storm Atronach** Stormfist …"* — so the
identity is certain rather than inferred from a family resemblance.

Ten plates at 1920x1080. `view-01` (front) and `view-03` (back) are true opposed full-body
orthographics on a plain backdrop; the cut subject measures **981 px tall by 816 px wide**, well
above the 660 px bar this project holds plates to. Orientation was confirmed by eye against a clay
render of the mesh before any projection ran.

## The face box, and why a scalar could not have worked

`regions.head_v_min` is derived from a detector keyed to the widest upper-body row. On this shape it
returns **0.9378** — the levitating crown slab, which sits *above* the face. That is the Cloudrest
Shade failure mode, and following it would have spent the entire density-warp budget on a bare rock.

A `regions.boxes` entry is used instead, `[0.42, 0.775, 0.45] – [0.58, 0.945, 1.0]`, and it was
verified **twice before any projection time was spent**: once on a membership render (red claims the
brow, eyes, nose and jaw and stops at the shoulder rocks) and once drawn back onto the front plate
itself. The face ends up with **40,910 front-facing texels, about a 202x202 patch**, and 16.6% of
the atlas.

## All three closeups were rejected — and one of them is the fourth confirmation of a standing rule

- `view-04` was registered twice. With `--region head` the shoulder detector confined matching to the
  top 6% of the subject, so its healthy-looking **7.79%** width error describes a crown-to-crown fit
  that never saw the face at all. Re-run with `--region whole` it scored 20.51% and the overlay put
  the head crop across the **thighs**.
- `view-05`: 23.90%, lands on the legs and pelvis, offset off the left edge of the plate.
- `view-06`: **14.46% — the lowest error of the three, and the worst placement of the three.** The
  overlay puts the shoulder crop across the boots.

That last pair is the fourth independent confirmation that **a good width-error metric is not
evidence of correct registration**. Judge by feature doubling in the overlay.

The cause is the same one that rejected all three of Oaxiltso's closeups: this gallery's closeups are
shot from a **different camera position** than its base plates, and a single scale-plus-translate
cannot reconcile that. Mitigating here: the face already occupies roughly **165 px of the base
plate** — about 2.7x what a humanoid face gets from a full-body plate — because the head band is 17%
of a 981 px subject.

## Honest limitations

- **54.9% of covered texels are neighbour-fill**, against the pipeline's usual ~35%. Roughly half the
  atlas is a chart-local average rather than observed colour. This is the highest fill of any shipped
  asset and it is a direct consequence of the subject's shape: with 96 detached stones, most rock
  faces point sideways or inward, where neither camera sees them squarely.
- **31.5% of texels face neither reference camera**, against 5.6% for Falgravn and 6.9% for Saint
  Olms. Comparable to the other Route B assets (Oaxiltso 31.4%, Taleria 26.6%).
- **The gallery publishes no profile view, so this ran on two cameras.** `measure-view-coverage` puts
  the cost precisely: a real left/right pair would take neither-camera **27.3% → 20.8%** and grazing
  fill **53.2% → 38.6%**. That loss is accepted rather than synthesised — a plate that does not exist
  is never invented.
- **The head run-structure warning fires** on 26 of 64 slices (41%). Expected rather than a separate
  defect: the extracted mesh is in bind pose while the plates are a posed render, so the per-slice
  silhouettes genuinely do not correspond. This is the *lowest* rate of the three Route B assets
  (Oaxiltso 64%, Taleria 56%).
- **Close up, the face is soft.** The carved scowl of the reference reads as relief rather than as
  features. A straight-on orthographic head plate is the single highest-value follow-up.

At the intended 32-64 px replay size it reads unambiguously as a storm atronach: floating stone
cluster, hunched shoulder slabs, banded stone boots, correct grey-brown stone. It would not survive a
close-up.

- Intended presentation: a 32-64 px-tall replay actor.
- Prepared: 2026-09-08

The Elder Scrolls Online name, character design, and related rights remain with their respective
owners, including ZeniMax Media/Bethesda Softworks. **Note that the geometry here is an extracted
client asset rather than a reconstruction**, which is a materially different rights position from the
screenshot-reconstructed assets in this catalog; redistribution has not been cleared. Do not reuse
outside this project's authorized fan prototype without a separate rights review.
