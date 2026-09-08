# Ozara replay prototype (v1)

- Encounter: Ozara, Sanctum Ophidia (third boss)
- Reference: <https://esomodelviewer.com/creatures/post/117-lamia-red>
- Prepared asset: 45,000 triangles / 27,743 vertices / **1,642,884 bytes** / 1024px JPEG q92 4:4:4 /
  PSNR **37.7 dB** / 353 charts / 67.2% coverage
- 1 mesh, 1 material, 1 primitive, one draw call. POSITION, NORMAL and TEXCOORD_0 only — no skin,
  animation, morph target or glTF extension. Minimum Y exactly 0.0, centered on X and Z.

Completes **Sanctum Ophidia**.

## Reference

The catalog previously pointed Ozara at `115-lamia-golden` and marked it _uncertain_. A sweep of post
**body text** for the extractor's species names, rather than boss names, found `117-lamia-red`, whose
body reads *"… used for generic red Lamias and for the following unique ones: Kuria Laurieae Muiriana
the Dark **Ozara** Sellistrix the Lamia Queen …"*. So the old page was both unverified **and the
wrong colour variant**.

Eleven plates at 1920x1080. `view-01` (front) and `view-03` (back) are a genuine opposed pair — same
arm height, subject heights matching to 6 px (979 / 973) — cut to a shared 1253 px square with the
subject at **985 x 770 px**.

## Why this is a reconstruction and not Route B

`Lamia_A_Boss` exists in the extracted supply, and the manifest suspected it of being a **partial
extraction** because its bbox is 1.14 x 4.08 x 0.46. A clay render settles it: the extraction is
**complete** — torso, arms, head and crest are all present — but the serpent tail is in a
**straight-down bind pose**, so the model is a pencil with the torso crushed into its top fifth. That
is the same failure that blocks Xalvakka's `Harvester_Monstrous_Boss`. Both are resolved by
reconstruction rather than by a deformer.

## Reconstruction risk

The two plates agree on the torso, arms and head but **not on the tail**: the front plate coils it
compactly at the base while the back plate sweeps it out to frame left. The tail is most of this
silhouette, and was recorded in the queue log as the principal risk before reconstruction ran.

Hunyuan3D-2mv resolved the two into a single coherent sweeping tail rather than a blob
(`build/ozara/clay-draft-sheet.jpg`), and the draft was accepted on that clay render, per the
standing rule that geometry is judged untextured before a defect is attributed to the texture.

## Projection measurements

- **14.7% of texels face neither camera.** Only Falgravn (5.6%) and Saint Olms (6.9%) are lower, and
  this is less than half the Route B assets (Oaxiltso 31.4%, Lightning Storm Atronach 31.5%).
- **35.1% neighbour fill** — the pipeline's ordinary rate, not the ~50% the Route B assets carry.
- **353 charts at 127.5 faces each**, the *lowest* chart count of any 45k-triangle asset here (Olms
  744, Shattered Shard 855). A smooth-skinned subject with no spike geometry packs efficiently.
- **The head region gets 76,936 front-facing texels, about a 277x277 patch** — the largest face
  allocation measured on this project.

## The head box, and a shape-specific trap

`regions.head_v_min` is unusable on this subject, and not for the usual reason. Normalised x and z
are dominated by the **tail**, which sweeps the bounding box out to 1.505 x 1.984 x 1.927 while the
entire body sits inside x 0.25-0.62 and z 0.79-0.94. The detector's own suggestion was **0.6249** —
the hips. A `regions.boxes` entry is used instead, with a z floor of 0.85 that deliberately keeps the
boost on the **front** of the head. Verified on a membership render before any projection: red claims
the muzzle, frills, crest and both horns and stops at the neck.

## All six closeups were rejected

Two (`view-04`, `view-11`) returned **NO VIABLE FIT** outright — this gallery's head closeups are
shot from a far nearer camera than its base plates, so no candidate falls inside the registrar's
seeded scale window. `view-06` (a tight crest crop) likewise has no silhouette to lock to. `view-05`
scored 50.80% and landed off the subject entirely; `view-08` scored 12.59% and landed beside the arm.

`view-07` is the significant rejection. At **5.74% it is the lowest error measured on this subject**, and
its overlay carries no gross doubling — but the ghost hands sit about half a hand-width up-left of
the real hands, so the fit is wrong at precisely the feature it would smear. Rejected on the overlay,
per the standing rule. The head does not suffer for it: the box spans v 0.80-1.0 of a 985 px subject,
so the face and crest already occupy roughly 197 px of the base plate.

## Honest limitations

- **The head run-structure warning fires** on 19 of 64 slices (30%) — the lowest rate measured on
  any asset here, but non-zero. The horns and frills break the silhouette into several runs that
  the mesh row and plate row do not always resolve identically.
- **No profile plate exists**, so this ran on two cameras. `view-02` is a three-quarter front,
  `view-09` a pushed-in rear-quarter torso crop and `view-10` a tail-only crop. Accepted rather than
  synthesised.
- **The tail's pose is the model's reconciliation of two disagreeing plates**, not an observed pose.
  It is a plausible lamia coil and it is coherent, but it is not evidence of how Ozara's tail sits.

- Intended presentation: a 32-64 px-tall replay actor.
- Prepared: 2026-09-08

The Elder Scrolls Online name, character design, and related rights remain with their respective
owners, including ZeniMax Media/Bethesda Softworks. Reconstructed from published reference
screenshots for this project's authorized fan prototype; not a claim that the IP is freely licensed.
Do not reuse outside this project without a separate rights review.
