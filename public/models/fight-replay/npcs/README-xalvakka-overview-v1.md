# Xalvakka replay prototype (v1)

- Encounter: Xalvakka, Rockgrove (third boss)
- Reference: <https://esomodelviewer.com/creatures/post/84-harvester-dagonic>
- Prepared asset: 44,998 triangles / 31,232 vertices / **1,765,596 bytes** / 1024px JPEG q92 4:4:4 /
  PSNR **37.26 dB** / 692 charts / 72.7% coverage
- 1 mesh, 1 material, 1 primitive, one draw call. POSITION, NORMAL and TEXCOORD_0 only — no skin,
  animation, morph target or glTF extension. Minimum Y exactly 0.0, centered on X and Z.

## Reference

The post body names him verbatim — *"…for the following unique one: **Xalvakka**"* — so the Dagonic
Harvester variant **is** him, not a same-species stand-in. The catalog previously carried this page
as *uncertain* with the note "Dagonic variant is 1920px but is a different skin"; that was wrong.

Eleven plates at 1920x1080. `view-01` (front) and `view-03` (back) cut to a shared 1057 px square,
subject **994 x 585 px**.

## Why this is a reconstruction rather than Route B — and why the deformer plan is now dead

`Harvester_Monstrous_Boss` is in the extracted supply and is superb geometry on paper: **8 welded
shells, 23.2% unobserved**, the best geometry-with-plates in the whole supply. It was the top-ranked
Route B candidate on the board.

It is unusable, for the same reason `Lamia_A_Boss` is unusable for Ozara: the tail is in a
**straight-down bind pose**. Normalised, it measures 0.594 x 0.377 x 2.0 — a pencil with the torso
crushed into its top quarter (and `ymin = -3.91`, the origin sitting at the torso).

The standing plan was to write a **tail-coil deformer** to rescue it. **That plan is now unnecessary
and should be dropped.** Both bosses it would have unlocked — Ozara and Xalvakka — shipped as
ordinary Route C reconstructions on the same day, because reconstructing from plates sidesteps bind
pose entirely rather than trying to correct it. Reconstruction is the cheaper answer to a bind-pose
problem than deformation, and that generalises past these two.

## The cleanest opposed pair used on this project

Unlike Ozara, whose two plates disagreed about the tail, these agree on **everything**: the coil is
in the same configuration in both views, the four arms are at the same angles, and the subject
heights match. The reconstruction reflects that — the head run-structure warning fires on only
**13 of 64 slices (20%)**, the lowest rate measured on any asset here.

Hunyuan3D-2mv produced 663,362 faces in **60.9 s**, and the clay render was accepted on sight: four
arms, horned skull, plated abdomen and the spined dorsal ridge all resolved.

## The head box, and a diagnosis technique worth reusing

Two placements were rejected before the third was accepted. Rather than nudge one box and re-render
each time, **three adjacent bands were coloured at once** — 0.78-0.83, 0.83-0.88, 0.88-1.0 — so a
single render says directly which band holds the face. It is **v 0.83-0.88**; the horns are
0.88-1.0 and the collar 0.78-0.83.

That render also corrected a misreading of my own: the first two boxes **did** contain the face. This
subject's face is small enough that at contact-sheet scale a box claiming horns *and* face looks like
it claims only horns. The banded probe removes the ambiguity in one pass.

The shoulder detector works on this subject for once, suggesting 0.8034 against the hand-set 0.815.

## All six closeups were rejected

`view-05` is the one that matters. At **5.44% it is the lowest error measured on this subject**, and
zooming its overlay onto the face shows **two pairs of eyes and two tooth rows**, offset down-left by
about a third of a face height, plus a ghost horn crown offset up-right. It is a textbook doubling.
This is the **fifth** independent confirmation on this project that a good width-error metric is not
evidence of correct registration.

`view-04` and `view-11` returned an identical fit to three decimals (21.04%, scale 0.850,
col=-288.9), which means they are near-duplicate frames, and the fit runs off the left edge of the
plate. `view-07`, `view-08` and `view-06` all ghost the arms out to the side.

## Honest limitations

- **This head is genuinely starved, and unlike Ozara's it is not fine.** The face proper spans only
  v 0.83-0.88 of a 994 px subject, so it occupies roughly **50 px** of the base plate — about what a
  humanoid face gets, on a subject whose whole identity is its face. The `uv_scale` 3.5 boost buys it
  back to a ~228x228 patch in the atlas, which is why the head still reads, but **a straight-on
  orthographic head plate is the highest-value follow-up for this asset by a wide margin.**
- **22.9% of texels face neither camera** and **42.9% of covered texels are neighbour fill** —
  between the Route C assets and the Route B ones. The four arms occlude a lot of torso.
- **692 charts at 65 faces each.** The arms and the tail spines fragment the unwrap.
- **No profile plate exists**, so this ran on two cameras. `view-02` and `view-06` are
  three-quarters; `view-09` and `view-10` are tail crops. Accepted rather than synthesised.

At the intended 32-64 px replay size the yellow eyes, horn crown, four arms and coiled tail all read.

- Intended presentation: a 32-64 px-tall replay actor.
- Prepared: 2026-09-08

The Elder Scrolls Online name, character design, and related rights remain with their respective
owners, including ZeniMax Media/Bethesda Softworks. Reconstructed from published reference
screenshots for this project's authorized fan prototype; not a claim that the IP is freely licensed.
Do not reuse outside this project without a separate rights review.
