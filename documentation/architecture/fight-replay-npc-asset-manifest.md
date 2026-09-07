# Fight replay NPC asset manifest

The durable record of every reconstructed fight-replay actor asset: what shipped, where it came
from, what it costs at runtime, and what is still outstanding. Update this file in the same commit
as any change to `src/features/fight_replay/utils/replayActorModelRegistry.ts`.

Read alongside the [actor model pipeline](./fight-replay-actor-model-pipeline.md) and the
[GPU queue log](./fight-replay-npc-gpu-queue-log.md).

## Licensing posture

Every asset below is a **project-authorized fan reconstruction built from published reference
screenshots**, not geometry extracted from the ESO client. The Elder Scrolls Online name, character
designs, and related rights remain with ZeniMax Media / Bethesda Softworks. These assets are not
CC0 and are not officially licensed; they ship behind the `?npcModels=prototype` opt-in while a
rights review is pending. The one exception is the player figure, which is genuinely CC0.

Do not reuse any reconstructed asset outside this project without a separate rights review.

## Shipped assets

| Asset                                | Actor                   | Renderer                  |   Tris |  Verts | Materials | Texture     | GLB bytes | Reference                                                                           |
| ------------------------------------ | ----------------------- | ------------------------- | -----: | -----: | --------: | ----------- | --------: | ----------------------------------------------------------------------------------- |
| `coolstickman-walk.glb`              | all players             | `instanced-pose-flipbook` |      — |      — |         1 | —           |         — | CC0, Polygonal Mind                                                                 |
| `yandir-the-butcher-overview-v2.glb` | Yandir the Butcher      | `static-boss`             | 45,000 | 29,609 |         1 | 1024px JPEG | 1,644,896 | [post 82](https://esomodelviewer.com/characters/post/82-yandir-the-butcher)         |
| `captain-vrol-overview-v2.glb`       | Captain Vrol            | `static-boss`             | 44,999 | 28,796 |         1 | 1024px JPEG | 1,679,644 | [post 83](https://esomodelviewer.com/characters/post/83-captain-vrol)               |
| `saint-llothis-overview-v1.glb`      | Saint Llothis the Pious | `static-boss`             | 44,999 | 31,803 |         1 | 1024px JPEG | 1,774,760 | [creature 89](https://esomodelviewer.com/creatures/post/89-saint-llothis-the-pious) |
| `saint-felms-overview-v1.glb`        | Saint Felms the Bold    | `static-boss`             | 45,000 | 30,921 |         1 | 1024px JPEG | 1,704,864 | [creature 88](https://esomodelviewer.com/creatures/post/88-saint-felms-the-bold)    |
| `the-warrior-overview-v1.glb`        | The Warrior             | `static-boss`             | 44,999 | 28,943 |         1 | 1024px JPEG | 1,672,496 | [post 172](https://esomodelviewer.com/characters/post/172-the-warrior)              |
| `the-mage-overview-v1.glb`           | The Mage                | `static-boss`             | 45,000 | 29,007 |         1 | 1024px JPEG | 1,722,144 | [post 173](https://esomodelviewer.com/characters/post/173-the-mage)                 |
| `shade-of-galenwe-overview-v1.glb`   | Shade of Galenwe        | `static-boss`             | 44,998 | 29,810 |         1 | 1024px JPEG | 1,743,648 | [post 233](https://esomodelviewer.com/characters/post/233-shade-of-galenwe)         |
| `shade-of-siroria-overview-v1.glb`   | Shade of Siroria        | `static-boss`             | 45,000 | 30,932 |         1 | 1024px JPEG | 1,739,784 | [post 234](https://esomodelviewer.com/characters/post/234-shade-of-siroria)         |
| `shade-of-relequen-overview-v1.glb`  | Shade of Relequen       | `static-boss`             | 45,000 | 32,337 |         1 | 1024px JPEG | 1,741,760 | [post 235](https://esomodelviewer.com/characters/post/235-shade-of-relequen)        |
| `the-serpent-overview-v1.glb`        | The Serpent             | `static-boss`             | 45,000 | 28,458 |         1 | 1024px JPEG | 1,687,556 | [post 169](https://esomodelviewer.com/characters/post/169-the-serpent)              |
| `varlariel-overview-v1.glb`          | Varlariel               | `static-boss`             | 45,000 | 30,450 |         1 | 1024px JPEG | 1,702,168 | [creature 74](https://esomodelviewer.com/creatures/post/74-wispmother-light)        |
| `saint-olms-overview-v1.glb`         | Saint Olms the Just     | `static-boss`             | 70,000 | 44,924 |         1 | 1024px JPEG | 2,277,308 | [creature 90](https://esomodelviewer.com/creatures/post/90-saint-olms-the-just)     |
| `lord-falgravn-overview-v1.glb`      | Lord Falgravn           | `static-boss`             | 70,000 | 44,724 |         1 | 1024px JPEG | 2,259,112 | [creature 32](https://esomodelviewer.com/creatures/post/32-vampire-lord)            |

### Runtime budgets

- Lesser enemies: 5,000–12,000 triangles.
- Standard bosses: 20,000–50,000 triangles.
- Hero-boss exception (one at a time, documented): up to 100,000 triangles.
- One mesh, one material, one draw call per asset. No skins, animations, or morph targets.
- Texture 512px by default; 1024px where the reference plates support it (a boss with registered
  closeup captures). Store as JPEG when the equivalent PNG would exceed the size gate — a 1024px
  JPEG carries more real detail than a 512px PNG at comparable bytes. Encode at q92 with chroma
  subsampling **disabled** — these atlases carry identity as flat colour blocks and 4:2:0 smears
  exactly those boundaries. Verify the written quality by reading the JPEG quantization table back
  out of the GLB; an export asking for a quality does not guarantee it honoured one. No Draco or
  meshopt — the browser runtime registers no `DRACOLoader`.
- Colour must be projected into the UV atlas at texel resolution. Baking from vertex colours caps
  detail at the vertex count and produces a visibly smeared surface.
- Weight UV allocation towards the face. A default unwrap spends texels in proportion to 3D surface
  area, which gave the face only ~103x103 texels (about 1% of the atlas) — the single biggest cause
  of a "pixelated, blurry" face, and unfixable by any amount of sharpening or higher JPEG quality.
  Unwrap from a density-warped copy of the mesh (head enlarged) and apply the resulting UVs to the
  untouched original, so geometry is unchanged. Scale about the vertical axis, not the model centre,
  or the neck ramp turns into slivers. Make any tone statistic **area-weighted**, otherwise
  re-allocating UV space silently shifts the exposure correction.
- Asset URLs must be joined to the app base (`resolveReplayModelUrl`). A bare catalog path resolves
  against the current route, and the replay is always nested, so it 404s and falls back to the
  capsule — a silent failure that looks exactly like "this boss has no model".
- Register closeup reference plates and project them onto the region they cover. The head especially:
  in a full-body plate the head is only ~60 px, so without a helm closeup the face reads as a smear,
  and the face is the identity anchor. Match closeups on the **region band** (head rows only for a
  helm plate), not the whole silhouette — whole-body matching is dominated by the torso and will
  mis-lock a helm plate onto the chest. Confirm every registration with a 50% overlay before use, and
  reject rather than force any that cannot be verified.
- glTF `+Y` up, facing `+Z`. The renderer re-grounds from the mesh bounding box every frame, so a
  non-grounded export is tolerated, but exporting feet at `y=0` is still preferred.

## Coverage status — Kyne's Aegis

Names below are verified against `src/types/trial-encounters.ts` (the curated encounter table).

| Encounter                  | Name               | Status                                                         |
| -------------------------- | ------------------ | -------------------------------------------------------------- |
| `boss_1`                   | Yandir the Butcher | **Shipped**                                                    |
| `boss_2`                   | Captain Vrol       | **Shipped**                                                    |
| `boss_3`                   | Lord Falgravn      | **Shipped** — the trial is complete (below)                    |
| `trash_half_giant_bulwark` | Half-Giant Bulwark | Deferred — ordinary humanoid, no bespoke model needed          |
| `trash_half_giant_raider`  | Half-Giant Raider  | Deferred — ordinary humanoid, no bespoke model needed          |
| `trash_vampire_infuser`    | Vampire Infuser    | Deferred — ordinary humanoid, no bespoke model needed          |
| `trash_crimson_knight`     | Crimson Knight     | Blocked on renderer — Bloodknight family recolor               |
| `trash_bitter_knight`      | Bitter Knight      | Blocked on renderer + unverified tint                          |
| `trash_blood_knight`       | Blood Knight       | Blocked on renderer — references secured                       |

### Lord Falgravn — shipped, and the blocker was a search bug

**Shipped 2026-09-06.** 70,000 tris / 44,724 verts / 2,259,112 bytes, 693 charts at 101 faces each,
70.5% coverage, 24.5% grazing fill, PSNR 39.87 dB, all checks passed with **no warnings**.
Visibility: front 45.5%, back 53.3%, **neither camera only 5.6%** — the best of any subject so far,
narrowly beating Olms' 6.9% for the same reason (broad flat wings face the reference cameras almost
squarely). **Kyne's Aegis is now complete for bosses.**

This encounter was recorded here as *blocked — no adequate reference imagery exists* for several
rounds. **That was wrong, and the reason is worth keeping.** esomodelviewer does have him: the page
is titled **"Vampire Lord"** (`creatures/post/32-vampire-lord`), and a title-only sweep never matched
it. The page's *body text* states the mesh serves generic Gray Host Vampire Lords **and Lord
Falgravn**, which was cross-checked against the UESP in-game shot — horned head plate, swept membrane
wings, spiked pauldrons, red sigil loincloth, knee guards and clawed feet all match. The earlier
entry even names this exact page as a "possible proxy for his vampire-lord phase silhouette only". It
was not a proxy; it was him.

**Lesson: search reference-site body text, not just titles.** The block cost more time than the build
did — the whole asset took one 65.8 s GPU job plus CPU work, against several rounds spent concluding
no reference existed.

#### How it actually went

- **Boxes again, and again re-measured rather than copied.** Olms' box numbers do not transfer:
  Falgravn is an upright biped whose wings separate from the body in *both* x and z (at head height
  wings sit at z 0.01-0.22, head at z 0.35-0.79), where Olms is a low wide construct. A scalar
  `head_v_min` is still impossible — the wing claws reach normalized y = 1.0 while the horn tips stop
  at 0.902.
- **The membership render caught a real error, on its first outing as a standing rule.** The first
  placement (`skull y0 = 0.805`) claimed the horns and cranium and **left the entire face outside the
  box**. Every downstream metric would have looked healthy — region texels, coverage, PSNR, all of
  them — and the asset would have shipped with its identity region pointed at the top of the skull.
  Re-measuring the neck pinch (the front-half column narrows to x 0.463-0.537 at y 0.77) put the
  floor at 0.775. **Keep doing this.**
- **The Olms "equal texel squares" target does not generalise; the underlying reasoning does.** Olms
  split the atlas evenly because his skull was ~2% of the surface against ~45% membranes. Falgravn's
  membranes are only ~20% and he has an actual face, so the correct bias is toward the head. Swept
  4.0/2.0 -> 246² skull, 5.0/2.0 -> 265², 5.0/1.5 -> 287², 6.0/1.6 -> 300², with the wings falling
  159²/150²/125²/114² respectively. Shipped 5.0/2.0, which clears the *humanoid* `face >= 256²` bar
  at 265² for a 6% linear cost per membrane. The rule to carry forward is "decide the bias from the
  region's share of surface area and whether the subject has a face", not a number.
- **The sweep does not need the projection.** Region texels depend only on the density warp and the
  xatlas pack, so a sweep can run unwrap-and-measure only. Four operating points cost a couple of
  minutes instead of four full builds.
- **A defect the pipeline cannot currently fix: near-horizontal limbs.** The wing leading edges carry
  a dark grey band that spreads inboard from the (correctly black) elbow claws for ~40% of the arm,
  with horizontal streaking, where the plates show pale bone. This is silhouette-normalized `u`
  failing on a limb that is nearly *horizontal*: one height slice spans the entire wing, so a small
  vertical registration error smears the claw's plate columns along the arm. It is the documented
  "wide head ornaments" failure rotated 90°. **`envelope_sigma` is not the fix** — raising it 3.0 ->
  8.0 moved PSNR 39.87 -> 39.97 dB and left the band essentially unchanged, so the shipped asset keeps
  the default. A registered wing closeup is the real answer. Recorded so the next operator does not
  re-run that experiment.
- **Two things were easier than Olms and both held:** the plates are the *same pose* (no smear to
  reason about), and the wingspan-to-height ratio is only ~1.34x against Olms' ~2.7x, so the runtime
  scale correction is a mild 1.6744 rather than 3.372.
- **An extracted mesh was available and deliberately not used.** `VampireLord_Lurker` (88 shells,
  28.1% unobserved) is genuinely this character, but 88 shells is the profile that got the Dwarven
  Colossus rejected, and reconstruction is now 13-for-13. Noted only as a fallback that was not
  needed.

### Lesser enemies — findings and the blocker

Reference research corrected two premises worth recording.

**The three knights are one creature, not three.** UESP gives Blood Knight, Crimson Knight, and
Bitter Knight all the same Species: **Bloodknight**, all located in Kyne's Aegis, and esomodelviewer
publishes exactly one Bloodknight mesh (`VampireLord_B_Basic`,
[creature post 33](https://esomodelviewer.com/creatures/post/33-bloodknight), 34.7k triangles). Ten
plates were downloaded at 1024x576 to `B:/CodexScratch/eso-fight-replay-3d/bloodknight-references/`
(the page emits 800px `_c` Flickr URLs; substituting `_b` yields 1024px, while `_h`/`_k` return 410).
Despite the `VampireLord` mesh-family name this is **not** a winged vampire lord — it is a bipedal,
wingless, human-proportioned armored humanoid. Its listed `3.55 x 4.46 m` is simply a larger export
unit; the arm-span-to-height ratio of 0.80 is an ordinary A-posed biped. So the correct plan is one
shared reconstruction plus per-variant recolors, not three separate models.

**The Half-Giants and the Vampire Infuser are ordinary humanoids.** UESP lists the Half-Giants as
Sea Giant / **Nord** and the Vampire Infuser as **Nord**; in-game screenshots show human-sized
figures on the standard character rig (Bulwark: mace and round shield; Raider: spiked helm and
greatsword; Infuser: a robed caster). They do not warrant bespoke reconstructions.

**The blocker is the renderer, not the references.** `InstancedReplayFigures3D` drives exactly one
non-instanced `<primitive>` per fight (`bossMeshRef`), and the resolver deliberately takes only the
**first** matching actor. That is correct for a single boss, but Kyne's Aegis trash spawns in packs —
two Half-Giant Raiders, multiple knights. Shipping a Bloodknight asset today would give a mesh to one
knight and leave its identical siblings as capsules, which reads as a bug rather than a feature.

**Single next action for lesser enemies:** extend the static-model path to render N actors from one
shared geometry — an `InstancedMesh` keyed by asset id, with a per-instance tint so the Bloodknight
base can serve Blood, Crimson, and Bitter variants from one draw call. Only then is generating the
asset worthwhile. Bitter Knight additionally needs a colour reference: UESP has no image for it, so
its tint is currently unverified and must not be guessed.

## Coverage status — Asylum Sanctorium

| Encounter | Name                    | Status                                                        |
| --------- | ----------------------- | ------------------------------------------------------------- |
| `boss_1`  | Saint Llothis the Pious | **Shipped**                                                   |
| `boss_2`  | Saint Felms the Bold    | **Shipped**                                                   |
| `boss_3`  | Saint Olms the Just     | **Shipped** — the non-humanoid path landed (below)            |

Llothis and Felms share a base mesh (differing helm crest and tint), and that transferred: Felms hit
its face-texel target on the **first** build reusing Llothis's tuned values, with no re-tuning. Expect
the same for any same-species pair.

### Saint Olms — the non-humanoid path, now shipped

**Shipped 2026-09-06.** 70,000 tris / 44,924 verts / 2,277,308 bytes, 744 charts at 94 faces each,
72.1% coverage, 23.6% grazing fill, PSNR 39.0 dB, all checks passed with no warnings. Visibility:
front 51.2%, back 48.1%, **neither camera only 6.9%** — flat wings face the reference cameras
almost perfectly. The contrast with the rejected Dwarven Colossus (62% neither, 1,406 charts at 17
faces from 234 shells) is the clearest evidence yet that chart explosion, not subject exoticism, is
what actually kills a build.

Olms was originally attempted and **stopped before the GPU job**, because the build would have
produced a clipped model. All three blockers below were fixed, and the record is kept because each
fix is now general machinery:

1. ~~**The plate crop truncates the wings.**~~ **FIXED.** `prepare_base_plates` clamped its square to
   the source height, cutting **44-45% of the wingspan**. It now sizes purely from the subject and
   **letterboxes** with transparent padding when the square exceeds the source (`_framing_centre`
   only clamps the centre when the crop actually fits, so every narrow subject is byte-identical).
   Re-cut on the Olms plates: square **2415 px**, front subject spans columns 307–2107 (**1801 of
   1805 px**), back 280–2135 (**1856 of 1859 px**), and neither edge column is opaque on either
   plate. The 3–4 px shortfall is the alpha threshold (96 for the crop vs 16 for the bounding box),
   not truncation.
2. **The shoulder detector misfires badly.** It keys off the widest upper-body row, which here is the
   wingspan, so it fires at the wing tops and returns head bands of 28 px (3.8%) front and 16 px
   (2.1%) back. Still true; hand-set the region instead (see 3).
3. ~~**The head-band concept does not apply at all.**~~ **ADDRESSED.** For Olms the top of the
   silhouette is _wing_, not head — the skull sits mid-height — and **no scalar threshold selects a
   skull that is not at the top.** `regions.boxes` is now an optional list of normalized
   axis-aligned 3D boxes, `[x0,y0,z0,x1,y1,z1]` in model space with smooth Euclidean falloff, used by
   **both** the density warp (`region_box_warp`, scaling about each box's own centre) and
   `measure_uv_allocation`. Several boxes are supported and are applied in order, so Olms can take
   one at the skull and one at the wing membranes. When boxes are present the reported metric is
   **region texels** and `atlas.uv_allocation.region.kind` reads `boxes`; the `head`/`face` keys are
   retained so existing readers keep working.

   Backwards compatibility is proven, not assumed: rebuilding Saint Llothis unchanged gives face
   **67,590** texels, head **25.0%** of atlas, **776** charts, **66.53%** coverage, 44,999 tris /
   31,803 verts — identical to the shipped report. (Byte count moves by ~150 and the grazing fill by
   ~20 texels between _any_ two runs of the same code, because `raster_attributes` is
   `numba parallel=True` and races on shared texels; two consecutive runs of the new code differ by
   the same amount.) Expressing that same band as a box instead gives 307,951 region texels / 29.4%,
   higher than the scalar's 262,301 / 25.0% because the box warp scales on all three axes about the
   box centre rather than x/z about the vertical axis — so a box is not a drop-in numeric equivalent
   and `uv_scale` needs its own tuning pass.

Two further notes if it is picked up:

- **The two plates are not the same pose.** The front shows the tail short and tucked between the
  legs; the back shows it long and swept down-left with a bladed tip, and the wings sit at a
  different sweep. Two-view reconstruction and the per-slice silhouette registration both assume one
  pose, so even with the above fixed, expect a smeared tail and wrong wing angles unless a
  matched-pose back plate is sourced.
- **Triangle budget:** ask for the hero-boss exception at ~70-80k rather than 45k. Two 1.8 m
  membranes plus a long tail leaves very few triangles per unit area at 45k, and thin sheets are
  already the weakest case for marching-cubes reconstruction.

Evidence: `B:/CodexScratch/eso-fight-replay-3d/build/saint-olms/crop-truncation.png`.

#### How it actually went

- **The pose mismatch did less damage than feared.** The reconstruction settled on a single tail
  pose (long, swept) rather than averaging the two, so the tail is coherent rather than smeared. It
  is still a genuine defect in the inputs and is recorded as unresolved — but "expect a smeared
  tail" overstated it.
- **Boxes had to be verified visually, not numerically.** Placement came from measurement (the
  central column narrows above y~0.70; x-slabs separate membrane from body by Z-thickness), but it
  was confirmed by rendering the mesh coloured by box membership *before* spending GPU time
  (`build/saint-olms/box-check/sheet.png`): red claims only the skull, blue/green only the
  membranes, body and tail unclaimed. **Do this on every future box-driven build** — no scalar
  metric can tell you a box is in the right place.
- **The boxes compete, and the trade must be measured.** Skull 3.0 / wing 2.0 collapsed the skull to
  148²; skull 4.5 / wing 2.0 dropped the wings to 183². The shipped 4.0 / 2.0 / 2.0 lands skull
  202², wings 200² and 211². Pushing either region to 256² starves the other, so the humanoid rule
  of "face >= 256²" does not transfer: identity on a winged subject is split between a small skull
  that anchors closeups and large membranes that dominate the silhouette at replay distance, and
  **equal texel squares are the right target**.
- **Prefer byte headroom over triangles.** A 75,000-tri build came to 2,447,876 bytes — 52 KB under
  the 2.5 MB gate. 70,000 gives 223 KB of headroom at *identical* region balance, so the extra
  triangles bought nothing.
- **Runtime scale needed a departure.** Olms is the first subject wider than tall, so the prepare
  step normalized his wingspan rather than his height, leaving him 0.7384 units tall. The usual
  `scale: 1.25` would stand him 0.92 units tall. The registry uses **`scale: 3.372`** to restore the
  family's ~2.49 world height (wingspan ~6.7 units). This is a judgment call, not a measurement —
  the reference page publishes no real-world dimensions — and is worth confirming by eye against
  another Asylum Sanctorium boss.
- **Head-correspondence detector:** 4 of 64 slices flagged (6.25%), 5 run-count mismatches, no
  warnings. The flagged slices sit at v 0.966-0.972 where the mesh spans ~780 px but the plate only
  ~29 px — the reconstruction's wings reach higher than the plate's. Above the skull box, so the
  identity region is unaffected, but a real correspondence gap that the detector caught correctly.

### The Celestial Serpent — resolved

Shipped. Its gold skull mask initially did not appear, and was first recorded as a failed
reconstruction — **wrongly**. A clay render showed the mask fully modelled at both octree levels.

The real cause generalises and is worth knowing before the next ornamented head: the plate row at
mask height contains **disconnected opaque runs** (horn, gap, mask, gap, horn) while the mesh row at
the same normalized height is a **single run**, because the reconstruction placed the horns closer in
so they merge with the hood. Per-slice normalization maps both to [0,1], so the mesh's centre lands
in the plate's _gap_ and nearest-opaque snapping resolves it to hood. Occlusion was ruled out (97.2%
of front-facing head vertices pass the depth test, against the body's 83.3%).

Fixed by hand-registering the helm plate **on the mask rather than the silhouette**, judged on
eye-socket doubling rather than any width metric — 0.134-0.138 single-images the sockets, third eye
and jaw; outside that they double. `width_error` is recorded as `null` for that plate, since no
meaningful silhouette error exists for the fit.

**Detector implemented — and it does NOT catch this case.** The run-count detector proposed here now
ships (`detect_run_count_mismatch`): it compares opaque runs per slice between the plate row and the
mesh's rasterized front-coverage row across the head band, O(rows), reusing the existing front depth
buffer. Its warning appears in the build report at `atlas.head_run_mismatch` and `warnings`.

The premise above was measured and is **wrong**. It compares _silhouettes_, and the Serpent's mask is
not a silhouette feature. At mask height (v 0.865–0.895) the plate alpha reads horn / gap / **hood** /
gap / horn, and the bright bone occupies at most **42 px inside the ~175 px hood run** — it is never a
separate opaque run, so no alpha-run comparison can see it. The Serpent's horns _do_ appear on both
sides, offset by ~4 slices, but that is a much weaker signal. Measured flagged fraction across all ten
shipped models, front plate, each model's own `head_v_min`:

| siroria | felms | relequen | galenwe | llothis | warrior | vrol | yandir | **serpent** | mage |
| ------: | ----: | -------: | ------: | ------: | ------: | ---: | -----: | ----------: | ---: |
|    0.53 |  0.45 |     0.45 |    0.33 |    0.28 |    0.28 | 0.27 |   0.11 |    **0.09** | 0.05 |

The Serpent ranks **9th of 10**. The detector is therefore useful as a "this head's silhouette does not
correspond, look at the overlay" prompt (it fires on the seven ornamented heads and stays quiet on
Yandir, the Serpent and the Mage) but it is **not** the gate for the Serpent's class of defect. Catching
a recessed interior feature needs a luminance/interior-structure comparison, not a silhouette one.

Two scoring alternatives were tried and disproved, do not re-test:

- **Cumulative-coverage mass transport** (`C_plate⁻¹(C_mesh(u))`). Discontinuous at every gap: two
  near-identical rows whose left runs differ by two cells report a huge error because the mesh's right
  run starts at a mass fraction the plate has not reached. On Vrol at v=0.945 it returned **0.603 for
  rows differing by three pixels**. It did rank the Serpent above Llothis — purely by that artefact.
- **Raw count of mismatched slices**, at every noise threshold from `min_run_frac` 0.03 to 0.12. The
  Serpent stays 7th–9th in all of them.

### Extracted game meshes — tested, and the limit is the texture not the geometry

The unmerged branch `feat/trial-boss-models` holds real extracted ESO meshes under
`public/models/bosses/*.glb` — genuine game geometry with **no materials and no textures**. That is
exactly the gap the projection stage fills, so the Dwarven Colossus was built end-to-end from
`DwarvenColossus_Body_A_Basic.glb` (24,534 tris) as a test.

**The geometry half works perfectly and costs no GPU at all.** Orientation needed no correction — the
mesh was already +Y up, +Z front, feet at y=0 — and only a scale normalisation (x0.12651, 15.730 game
units to 1.99). Its game `TEXCOORD_0` was discarded in favour of our own unwrap, since we have no
matching game texture.

**The texture half failed on this subject, and the atlas is confetti.** Two structural causes:

|                  |             Dwarven Colossus | Varlariel (contrast) |
| ---------------- | ---------------------------: | -------------------: |
| source shells    | **234** (806 boundary edges) |       3 (0 boundary) |
| charts           | **1,406** (17.4 faces/chart) |                  804 |
| "neither camera" |                    **62.0%** |                 ~15% |
| grazing fill     |                    **51.2%** |                34.8% |

Extracted meshes are assembled from many separate armour pieces, so xatlas _must_ emit hundreds of
charts; and a bulky, deep mech has most of its surface facing sideways, so only 21.3% front plus
18.8% back is ever observed. Front and back renders read acceptably — chest face disc, Dwemer key
patterning, correct bronze and verdigris — but three-quarter and side views are badly smeared. **Not
shipped.**

So the verdict on the ~25 extracted GLBs is a qualified yes: **humanoid extracted meshes should work
and would beat reconstructions**, because the geometry is exact rather than inferred. Bulky or deep
non-humanoids will not, with two views.

**The unlock is 4-view projection**, which the engine does not support (front and back only). The
argument is specific and worth acting on: with an _exact_ mesh, side plates would register reliably,
because the silhouette correspondence that broke on the Serpent's reconstruction is precisely what an
extracted mesh guarantees. The modelviewer sets already include side and 3/4 views. For
reconstructions extra views risk misregistration; for extracted meshes they would be safe. Welding
coincident vertices across shells before unwrapping is also worth a probe, to cut the chart count.

## Unknown actors

Any actor the registry does not recognise by exact normalized name keeps the capsule marker. That
is deliberate: in a tactical replay a wrong body is more misleading than an abstract one, so the
registry never substitutes a lookalike mesh or partial-matches a name.
