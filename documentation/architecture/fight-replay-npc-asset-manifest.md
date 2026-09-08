# Fight replay NPC asset manifest

The durable record of every reconstructed fight-replay actor asset: what shipped, where it came
from, what it costs at runtime, and what is still outstanding. Update this file in the same commit
as any change to `src/features/fight_replay/utils/replayActorModelRegistry.ts`.

Read alongside the [actor model pipeline](./fight-replay-actor-model-pipeline.md) and the
[GPU queue log](./fight-replay-npc-gpu-queue-log.md).

## Licensing posture

There are now **three** distinct rights positions in this catalog. Read this before reusing
anything.

1. **CC0** — the player figure (`coolstickman-walk.glb`) only. Genuinely open.
2. **Project-authorized fan reconstruction** — every asset built by the screenshot pipeline. Modelled
   from published reference screenshots, not extracted. Not CC0, not officially licensed; ships
   behind the `?npcModels=prototype` opt-in while a rights review is pending.
3. **Extracted ESO client assets — NEW, and materially different.** `stonebreaker`,
   `possessed-mantikora`, `foundation-stone-atronach` and `cloudrest-gryphon` are **ESO's own mesh
   and ESO's own hand-authored diffuse atlas, shipped verbatim**. Nothing about them was modelled or
   painted here; the only changes are a uniform scale, a recentre and a container re-export, and the
   JPEG bytes are passed through untouched. **Redistribution of these has not been cleared and the
   repository owner needs to make an explicit call on it.**

Category 3 is filed in the registry under `designation: 'project-authorized-fan-prototype'` **only
because that is the sole value the `StaticReplayActorModelAsset` type admits**. Widening that union
would change a runtime contract that every consumer and the catalog-integrity test rely on, so the
distinction lives here and in each asset's README instead. Do not read the designation field as a
rights determination for those four.

The Elder Scrolls Online name, character designs, and related rights remain with ZeniMax Media /
Bethesda Softworks. Do not reuse any asset in category 2 or 3 outside this project without a
separate rights review.

## Shipped assets

| Asset                                    | Actor                           | Renderer                  |   Tris |  Verts | Materials | Texture     | GLB bytes | Reference                                                                           |
| ---------------------------------------- | ------------------------------- | ------------------------- | -----: | -----: | --------: | ----------- | --------: | ----------------------------------------------------------------------------------- |
| `coolstickman-walk.glb`                  | all players                     | `instanced-pose-flipbook` |      — |      — |         1 | —           |         — | CC0, Polygonal Mind                                                                 |
| `yandir-the-butcher-overview-v2.glb`     | Yandir the Butcher              | `static-boss`             | 45,000 | 29,609 |         1 | 1024px JPEG | 1,644,896 | [post 82](https://esomodelviewer.com/characters/post/82-yandir-the-butcher)         |
| `captain-vrol-overview-v2.glb`           | Captain Vrol                    | `static-boss`             | 44,999 | 28,796 |         1 | 1024px JPEG | 1,679,644 | [post 83](https://esomodelviewer.com/characters/post/83-captain-vrol)               |
| `saint-llothis-overview-v1.glb`          | Saint Llothis the Pious         | `static-boss`             | 44,999 | 31,803 |         1 | 1024px JPEG | 1,774,760 | [creature 89](https://esomodelviewer.com/creatures/post/89-saint-llothis-the-pious) |
| `saint-felms-overview-v1.glb`            | Saint Felms the Bold            | `static-boss`             | 45,000 | 30,921 |         1 | 1024px JPEG | 1,704,864 | [creature 88](https://esomodelviewer.com/creatures/post/88-saint-felms-the-bold)    |
| `the-warrior-overview-v1.glb`            | The Warrior                     | `static-boss`             | 44,999 | 28,943 |         1 | 1024px JPEG | 1,672,496 | [post 172](https://esomodelviewer.com/characters/post/172-the-warrior)              |
| `the-mage-overview-v1.glb`               | The Mage                        | `static-boss`             | 45,000 | 29,007 |         1 | 1024px JPEG | 1,722,144 | [post 173](https://esomodelviewer.com/characters/post/173-the-mage)                 |
| `shade-of-galenwe-overview-v1.glb`       | Shade of Galenwe                | `static-boss`             | 44,998 | 29,810 |         1 | 1024px JPEG | 1,743,648 | [post 233](https://esomodelviewer.com/characters/post/233-shade-of-galenwe)         |
| `shade-of-siroria-overview-v1.glb`       | Shade of Siroria                | `static-boss`             | 45,000 | 30,932 |         1 | 1024px JPEG | 1,739,784 | [post 234](https://esomodelviewer.com/characters/post/234-shade-of-siroria)         |
| `shade-of-relequen-overview-v1.glb`      | Shade of Relequen               | `static-boss`             | 45,000 | 32,337 |         1 | 1024px JPEG | 1,741,760 | [post 235](https://esomodelviewer.com/characters/post/235-shade-of-relequen)        |
| `the-serpent-overview-v1.glb`            | The Serpent                     | `static-boss`             | 45,000 | 28,458 |         1 | 1024px JPEG | 1,687,556 | [post 169](https://esomodelviewer.com/characters/post/169-the-serpent)              |
| `varlariel-overview-v1.glb`              | Varlariel                       | `static-boss`             | 45,000 | 30,450 |         1 | 1024px JPEG | 1,702,168 | [creature 74](https://esomodelviewer.com/creatures/post/74-wispmother-light)        |
| `saint-olms-overview-v1.glb`             | Saint Olms the Just             | `static-boss`             | 70,000 | 44,924 |         1 | 1024px JPEG | 2,277,308 | [creature 90](https://esomodelviewer.com/creatures/post/90-saint-olms-the-just)     |
| `orphic-shattered-shard-overview-v1.glb` | Orphic Shattered Shard          | `static-boss`             | 44,999 | 32,092 |         1 | 1024px JPEG | 2,025,356 | [post 180](https://esomodelviewer.com/characters/post/180-shattered-shard)          |
| `bloodknight-overview-v1.glb`            | Blood / Crimson / Bitter Knight | `static-boss`             |  5,000 |      — |         1 | 512px JPEG  |   304,148 | [creature 33](https://esomodelviewer.com/creatures/post/33-bloodknight)             |
| `crystal-atronach-overview-v1.glb`       | Crystal Atronach                | `static-boss`             |  4,996 |      — |         1 | 512px JPEG  |   341,612 | [creature 179](https://esomodelviewer.com/creatures/post/179-crystal-atronach)      |
| `frost-atronach-overview-v1.glb`         | Frost Atronach                  | `static-boss`             |  4,996 |      — |         1 | 512px JPEG  |   320,576 | [creature 153](https://esomodelviewer.com/creatures/post/153-frost-atronach)        |
| `yaghra-monstrosity-overview-v1.glb`     | Yaghra Monstrosity              | `static-boss`             |  4,976 |      — |         1 | 512px JPEG  |   327,324 | [creature 120](https://esomodelviewer.com/creatures/post/120-yaghra-monstrosity)    |
| `ash-titan-overview-v1.glb`              | Ash Titan                       | `static-boss`             |  5,000 |      — |         1 | 512px JPEG  |   330,820 | [creature 112](https://esomodelviewer.com/creatures/post/112-ash-titan)             |
| `fire-behemoth-overview-v1.glb`          | Fire Behemoth                   | `static-boss`             |  5,000 |      — |         1 | 512px JPEG  |   324,864 | [creature 65](https://esomodelviewer.com/creatures/post/65-fire-behemoth)           |
| `lord-falgravn-overview-v1.glb`          | Lord Falgravn                   | `static-boss`             | 70,000 | 44,724 |         1 | 1024px JPEG | 2,259,112 | [creature 32](https://esomodelviewer.com/creatures/post/32-vampire-lord)            |

Extracted client assets (see the licensing posture above — **not reconstructions**):

| Asset                                       | Actor                            | Renderer      |   Tris |  Verts | Materials | Texture     | GLB bytes | Source blob on `feat/trial-boss-textures`       |
| ------------------------------------------- | -------------------------------- | ------------- | -----: | -----: | --------: | ----------- | --------: | ----------------------------------------------- |
| `stonebreaker-overview-v1.glb`              | Stonebreaker                     | `static-boss` | 13,474 | 11,620 |         1 | 1024px JPEG |   768,420 | `public/models/bosses/Troll_Craglorn_Boss.glb`  |
| `possessed-mantikora-overview-v1.glb`       | Possessed Mantikora              | `static-boss` |  9,072 |  6,031 |         1 | 1024px JPEG |   545,372 | `public/models/bosses/Mantikora_B_Boss.glb`     |
| `foundation-stone-atronach-overview-v1.glb` | Foundation Stone Atronach        | `static-boss` |  6,884 |  3,906 |         1 | 1024px JPEG |   519,364 | `public/models/bosses/StoneAtronach_B_Boss.glb` |
| `cloudrest-gryphon-overview-v1.glb`         | Falarielle / Silaeda / Belanaril | `static-boss` | 37,104 | 27,650 |         1 | 1024px JPEG | 1,578,084 | `public/models/bosses/Gryphon_A_Boss.glb`       |

Route B — extracted ESO geometry, colour projected from reference plates (no GPU at any stage):

| Asset                                          | Actor                    | Renderer      |   Tris |  Verts | Materials | Texture     | GLB bytes | Mesh / colour reference                                                            |
| ---------------------------------------------- | ------------------------ | ------------- | -----: | -----: | --------: | ----------- | --------: | ---------------------------------------------------------------------------------- |
| `oaxiltso-overview-v1.glb`                     | Oaxiltso                 | `static-boss` |  8,130 |  6,831 |         1 | 1024px JPEG |   747,916 | `ArgonianBehemoth_A_Red_Basic` / [creature 83](https://esomodelviewer.com/creatures/post/83-oaxiltso)        |
| `tideborn-taleria-overview-v1.glb`             | Tideborn Taleria         | `static-boss` | 19,862 | 20,438 |         1 | 1024px JPEG | 1,288,872 | `AirAtronach_Coral_Boss` / [creature 119](https://esomodelviewer.com/creatures/post/119-tideborn-taleria)    |
| `lightning-storm-atronach-overview-v1.glb`     | Lightning Storm Atronach | `static-boss` |  4,425 |  4,991 |         1 | 1024px JPEG |   600,496 | `StormAtronach_A_Basic` / [creature 154](https://esomodelviewer.com/creatures/post/154-storm-atronach)       |

### Registry entries that ship no new bytes

Two kinds of reuse exist, and they are not the same thing. Neither adds a row above, because neither
adds a GLB.

| Registry entry                     | GLB it reuses                  | Serves                            | Kind                                    |
| ---------------------------------- | ------------------------------ | --------------------------------- | --------------------------------------- |
| `the-serpent-overview-v1` (alias)  | `the-serpent-overview-v1.glb`  | The Serpent's Image               | **Faithful** — same creature, same size |
| `craglorn-troll-trash-overview-v1` | `stonebreaker-overview-v1.glb` | Rockheaver Troll, Berserker Troll | **Species match, wrong tier** — 0.85x   |

A pure alias (row 1) is added to an existing entry's `aliases`. A reuse that needs its own scale
(rows 2-3) must be a **separate catalog entry pointing at the same `path`**, because `transform` is
per-asset. That costs one extra fetch of an already-cached URL and one extra `InstancedMesh`, and it
is the only way to render a lesser enemy at a size that differs from the boss whose body it borrows.
`resolveReplayModelUrl`, the catalog-integrity tests, and the instancing plan all handle shared
paths; the tests additionally assert every catalog `path` exists on disk, so an entry can never be
added ahead of the GLB it names.

### Lesser-enemy budget

The six assets above are **trash and mini bosses, built to a different budget from every boss in
this catalog**: ~5,000 triangles, a 512px atlas and ~300-340 KB each, against the boss profile's
45,000-70,000 triangles, 1024px and ~1.7-2.3 MB. The reason is arithmetic — a boss appears once, but
trash appears dozens at a time, so the boss budget would put well over a million triangles a frame
on screen. Their registry scales are anchored on the player figure (0.95 world units) rather than
the boss convention of ~2.49, so rank-and-file enemies do not render at boss size.

**One build covers three encounters** for the Bloodknights, via per-instance `aliasTints`. That
works only because the base plate measures a near-neutral `#696264`: tint multiplies, so it can
darken a channel but never raise one, and only a neutral base can reach both a warm and a cold
sibling. Only Blood Knight's colour is measured — Crimson and Bitter are name-derived estimates with
no reference plate, and are recorded as such.

**Frost and Crystal Atronach share one geometry generation but ship as two GLBs**, because they
differ in hue rather than value and no multiply tint can turn ice into iridescent glass.

Two further mini bosses, **Haj Mota and Bow Breaker, were not built** and the reason is an input
defect worth recording: their galleries are **mirror arcs of only ~90 degrees**, proven by a
silhouette mirror test (IoU 0.859 between one set's back plate and the other's mirrored). Neither
set contains a 180-degree-opposed pair, so both reconstruction and two-camera projection would paint
head colour onto the tail.

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
| `trash_half_giant_bulwark` | Half-Giant Bulwark | Capsule — ordinary Nord humanoid, deliberately not substituted |
| `trash_half_giant_raider`  | Half-Giant Raider  | Capsule — ordinary Nord humanoid, deliberately not substituted |
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

This encounter was recorded here as _blocked — no adequate reference imagery exists_ for several
rounds. **That was wrong, and the reason is worth keeping.** esomodelviewer does have him: the page
is titled **"Vampire Lord"** (`creatures/post/32-vampire-lord`), and a title-only sweep never matched
it. The page's _body text_ states the mesh serves generic Gray Host Vampire Lords **and Lord
Falgravn**, which was cross-checked against the UESP in-game shot — horned head plate, swept membrane
wings, spiked pauldrons, red sigil loincloth, knee guards and clawed feet all match. The earlier
entry even names this exact page as a "possible proxy for his vampire-lord phase silhouette only". It
was not a proxy; it was him.

**Lesson: search reference-site body text, not just titles.** The block cost more time than the build
did — the whole asset took one 65.8 s GPU job plus CPU work, against several rounds spent concluding
no reference existed.

#### How it actually went

- **Boxes again, and again re-measured rather than copied.** Olms' box numbers do not transfer:
  Falgravn is an upright biped whose wings separate from the body in _both_ x and z (at head height
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
  159²/150²/125²/114² respectively. Shipped 5.0/2.0, which clears the _humanoid_ `face >= 256²` bar
  at 265² for a 6% linear cost per membrane. The rule to carry forward is "decide the bias from the
  region's share of surface area and whether the subject has a face", not a number.
- **The sweep does not need the projection.** Region texels depend only on the density warp and the
  xatlas pack, so a sweep can run unwrap-and-measure only. Four operating points cost a couple of
  minutes instead of four full builds.
- **A defect the pipeline cannot currently fix: near-horizontal limbs.** The wing leading edges carry
  a dark grey band that spreads inboard from the (correctly black) elbow claws for ~40% of the arm,
  with horizontal streaking, where the plates show pale bone. This is silhouette-normalized `u`
  failing on a limb that is nearly _horizontal_: one height slice spans the entire wing, so a small
  vertical registration error smears the claw's plate columns along the arm. It is the documented
  "wide head ornaments" failure rotated 90°. **`envelope_sigma` is not the fix** — raising it 3.0 ->
  8.0 moved PSNR 39.87 -> 39.97 dB and left the band essentially unchanged, so the shipped asset keeps
  the default. A registered wing closeup is the real answer. Recorded so the next operator does not
  re-run that experiment.
- **Two things were easier than Olms and both held:** the plates are the _same pose_ (no smear to
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

**A Half-Giant stand-in on Captain Vrol's GLB was built on 2026-09-07 and then withdrawn the same
day.** It is recorded here because the reasoning is the rule, not the exception. Vrol's reference
post names "the Sea Giant and Half-Giant force that invaded Kyne's Aegis", which made his the
nearest body shipped — but that same sentence _distinguishes_ Half-Giants from Sea Giants, and the
UESP finding above puts them on the standard Nord rig. So the substitution would have put a Sea
Giant in horned armour on a big Nord: a lookalike, not a match.

That is precisely what the "Unknown actors" rule below forbids — **a wrong body misleads more than
an abstract one**. The stand-in was well documented and honestly labelled, and it was still the
wrong call, because a reader of the replay does not see the documentation. Both names keep the
capsule. The Vampire Infuser was never included for the same reason: a robed caster on a Sea Giant
body is a worse depiction than the marker.

The reuses that _did_ ship in that pass are the ones where the body is genuinely right: The
Serpent's Image is the Celestial Serpent's own duplicate, and the Rockheaver and Berserker Trolls
share ESO's own `Troll_Craglorn_Boss` mesh with Stonebreaker, rendered at 0.85x because that asset
is the boss-tier variant.

**The renderer blocker is cleared.** `InstancedReplayFigures3D` used to drive exactly one
non-instanced `<primitive>` per fight, with the resolver taking only the **first** matching actor —
so a Bloodknight asset would have given a mesh to one knight and left its identical siblings as
capsules. It now renders one `InstancedMesh` per registry asset id, sized to every actor that
resolves to it, with an optional per-instance tint (`tint` / `aliasTints` on the registry entry). One
Bloodknight build can therefore serve Blood, Crimson, and Bitter from one draw call.

**Single remaining blocker for the knights:** Bitter Knight has no colour reference — UESP has no
image for it, so its tint is unverified and must not be guessed.

## Coverage status — Asylum Sanctorium

| Encounter | Name                    | Status                                             |
| --------- | ----------------------- | -------------------------------------------------- |
| `boss_1`  | Saint Llothis the Pious | **Shipped**                                        |
| `boss_2`  | Saint Felms the Bold    | **Shipped**                                        |
| `boss_3`  | Saint Olms the Just     | **Shipped** — the non-humanoid path landed (below) |

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
  was confirmed by rendering the mesh coloured by box membership _before_ spending GPU time
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
  the 2.5 MB gate. 70,000 gives 223 KB of headroom at _identical_ region balance, so the extra
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

#### Update 2026-09-07 — for a subset, the texture half is already solved and needs no pipeline

The paragraph above assumes we have to _make_ the texture. For four of these meshes we do not. The
sibling branch **`feat/trial-boss-textures`** is a superset of `feat/trial-boss-models` in which
**10 GLBs carry a material and 7 carry a real embedded image** on the game's own `TEXCOORD_0`. Four
of those images were opened and confirmed to be genuine hand-authored ESO character atlases, and
all four have now shipped: **Stonebreaker, Possessed Mantikora, Foundation Stone Atronach** and the
**Cloudrest gryphon**. No plates, no xatlas, no projection, no GPU — extract the blob, normalise the
height, run `prepare-static-boss.py`, wire the registry. Total cost for all four: minutes of CPU.

Because nothing is projected, the two numbers that gate the projection route are **irrelevant** for
these. Stonebreaker has 359 source shells and ~50% "neither camera" coverage — worse than the
rejected Dwarven Colossus on both — and looks perfect, because it is wearing its own skin.

Consequences worth carrying forward:

- **Shell count and camera coverage only predict failure for the projection route.** Do not screen
  extracted meshes on them when a matching game diffuse exists.
- **Metadata is not proof — open the atlas.** The audit tagged Falgravn's `VampireLord_Lurker` mesh
  as carrying a committed diffuse. It does, and it is a 512x512 tiling moss/bark detail map with no
  charts at all. Wiring it up would have shipped a mossy Falgravn. Every atlas in this batch was
  opened and looked at before shipping.
- **The highest-leverage follow-up is locating the remaining game DDS diffuses.** The extractor's
  `trial_boss_complete.json` records diffuse `file_index` values for 22 of 30 creature models, and
  Tier 2 of the extracted-mesh inventory (`ShatteredShard` at 1 shell, `GrievousTwilight` at 34 and
  covering _two_ encounters, `VaerminaGloamKnight`, `Voriplasm`) is the best geometry in the whole
  supply with no plates to project. A located diffuse turns each of those into a minutes-long CPU
  job.
- **`prepare-static-boss.py` gained `--normalize-height`** for this batch. Reconstructions arrive
  from Hunyuan already ~2 units tall; extracted meshes arrive in game units (3-16) and need it.
- **The rights position changed and it is not a detail.** See the licensing posture at the top.

## Coverage status — Sanctum Ophidia

| Encounter | Name                | Status                                                                |
| --------- | ------------------- | --------------------------------------------------------------------- |
| `boss_1`  | Possessed Mantikora | **Shipped 2026-09-07** — extracted client asset, not a reconstruction |
| `boss_2`  | Stonebreaker        | **Shipped 2026-09-07** — extracted client asset, not a reconstruction |
| `boss_3`  | Ozara               | Blocked — greyscale mask only, plates uncertain (see below)           |
| `boss_4`  | The Serpent         | **Shipped** (reconstruction, hand-registered mask)                    |

| Lesser enemy             | Name                | Status                                                                 |
| ------------------------ | ------------------- | ---------------------------------------------------------------------- |
| `mini_1`                 | The Serpent's Image | **Shipped 2026-09-07** — alias onto `the-serpent-overview-v1`          |
| `trash_rockheaver_troll` | Rockheaver Troll    | **Shipped 2026-09-07** — Craglorn troll body at 0.85x (below); 3 slots |
| `trash_berserker_troll`  | Berserker Troll     | **Shipped 2026-09-07** — Craglorn troll body at 0.85x (below)          |

### Zero-art reuse — Sanctum Ophidia lesser enemies

Three names, no new GLB, no pipeline run. Since PR #1519 the renderer loads **every** distinct
registry asset a fight needs and draws one `InstancedMesh` per asset, so a lesser enemy can claim a
body without stealing the boss' slot — which is exactly what would have happened before it.

- **`The Serpent's Image` is a faithful reuse, not a stand-in.** The mini boss is the Celestial
  Serpent's own duplicate, so it is a plain alias on `the-serpent-overview-v1` at the Serpent's own
  scale — same creature, same size, one array entry.
- **`Rockheaver Troll` / `Berserker Troll` are a species match at the wrong tier.**
  `stonebreaker-overview-v1.glb` is ESO's `Troll_Craglorn_Boss` mesh with the game's own atlas, and
  both trash names are Craglorn trolls, so the body is right. Stonebreaker is the **boss-tier**
  variant, though, so a second catalog entry (`craglorn-troll-trash-overview-v1`) points at the same
  GLB with `scale: 1.0625` (0.85x the boss) — otherwise the fight reads as three Stonebreakers.
  No plate exists for either variant, so **no `aliasTints` is set**: the colour difference between
  them is unmeasured and a guess would be less honest than shipping both as authored.

**Stonebreaker had no reference plates anywhere, on any site.** The screenshot pipeline could never
have built him at any quality. The extracted mesh was the only route to this encounter that will
ever exist, and it cost no GPU time at all.

Ozara's `Lamia_A_Boss` mesh carries a greyscale mask only (ESO tints it at runtime) and its plates
are tagged "uncertain". Its 2 shells and 7.6% unobserved area look like the easiest projection win
in the supply, but its bbox is 1.14 x 4.08 x **0.46** — a near-planar vertical spike with no visible
torso or arms. Verify the mesh is not a partial extraction before spending anything on it.

## Coverage status — Aetherian Archive

| Encounter | Name                      | Status                                                                            |
| --------- | ------------------------- | --------------------------------------------------------------------------------- |
| `boss_1`  | Lightning Storm Atronach  | **Shipped 2026-09-08** — Route B, extracted geometry with projected colour        |
| `boss_2`  | Foundation Stone Atronach | **Shipped 2026-09-07** — extracted client asset, not a reconstruction             |
| `boss_3`  | Varlariel                 | **Shipped** (reconstruction)                                                      |
| `boss_4`  | The Mage                  | **Shipped** (reconstruction)                                                      |

**Aetherian Archive is complete** — the fourth trial fully covered, after Kyne's Aegis, Asylum
Sanctorium and (bar its mounts' alias check) Cloudrest.

The `boss_1` row previously read *"Blocked — greyscale mask only, and 96 shells makes it a poor
projection candidate"*. **Both halves of that were wrong**, and the pair is instructive:

- *"Greyscale mask only"* was true of the **extractor's** texture for `StormAtronach_A_Basic`, which
  rules out **Route A** (ship ESO's own diffuse). It says nothing about Route B, where the colour
  comes from plates and the extracted asset supplies geometry only. The two routes were conflated.
- *"96 shells makes it a poor projection candidate"* applied the shell-count heuristic that Tideborn
  Taleria had **already disproved** (46 shells produced 1,748 charts; 8 shells produced 399). This
  mesh's 96 shells produced **563** charts. Blind area is the number that predicts failure, and at
  31.5% this sits inside the shipped band.

The shape is in fact the strongest possible argument *for* Route B: 96 unconnected levitating stones
have no continuous silhouette for two-view reconstruction to infer, which is exactly the failure mode
exact geometry removes.

## Coverage status — Cloudrest

| Encounter | Name              | Status                                                            |
| --------- | ----------------- | ----------------------------------------------------------------- |
| `boss_1`  | Shade of Galenwe  | **Shipped** (reconstruction). Mount **Falarielle** now has a body |
| `boss_2`  | Shade of Siroria  | **Shipped** (reconstruction). Mount **Silaeda** now has a body    |
| `boss_3`  | Shade of Relequen | **Shipped** (reconstruction). Mount **Belanaril** now has a body  |

The three Welkynar gryphons share one extracted asset, `cloudrest-gryphon-overview-v1.glb`. They are
not their own boss rows — ESO Logs tracks each Welkynar-plus-gryphon pair as a single boss — so they
do not change the boss count. **Their aliases are the one unverified part of this batch:** the names
come from the curated notes in `trial-encounters.ts`, not from an observed ESO Logs actor list. A
mismatch is silent and harmless (the gryphon keeps the capsule), but it should be confirmed against
a real Cloudrest report before Cloudrest is called covered.

**4-view projection was proposed as the unlock. It shipped, and it does not rescue this subject.**
See the next section. On this exact mesh, adding left and right cameras moves "neither camera"
**62.0% -> 53.4%** and grazing fill **51.2% -> 49.2%** — 2.0 points, the worst return of any mesh
measured. The confetti atlas is unchanged. **The premise above was wrong on two counts**, and both
are worth carrying forward:

1. **The reference set has no profile.** All 13 published plates on
   `/creatures/post/96-dwarven-colossus` are front, rear, three-quarter or closeup; the nearest to a
   side is `view-02` at roughly 45 degrees. "The modelviewer sets already include side views" does
   not hold for this page, and a profile is never synthesised. So even a working four-camera engine
   has nothing to feed the side cameras here.
2. **This subject is not camera-limited, it is interior-limited.** Tested against **64 orthographic
   directions** spread over the whole sphere (`build/dwarven-colossus-4view/diagnose2.py`): only
   **71.8%** of its atlas texels are reachable from _any_ direction. **28.2% is interior surface** —
   overlapping armour shells that no photograph of any kind can ever see. 68.9% of the
   right-facing surface is occluded from the right camera, against 60.5% of the front-facing surface
   from the front, so the side cameras land in the same self-occlusion the front pair does. A further
   36.4% of what the four cameras miss faces up or down, where no horizontal camera helps at all.

**So the next thing to build for this tier is geometry cleanup, not cameras**: weld coincident
vertices across shells and drop interior faces before unwrapping. That attacks the chart count
(1,406 charts at 17.4 faces), the interior 28.2%, and the atlas budget at once.

### Four reference cameras — shipped 2026-09-07

The projection takes **up to four orthographic cameras**: front, back, right, left. Front and back
are mandatory. The side pair exists only when a config supplies real profile plates:

```json
"side_plates": { "available": true, "left": { "file": "view-14.jpg", "role": "full-body-left" } }
```

Absent — which is every config shipped so far, each recording `"available": false` and why — the
engine runs the two cameras it always had. A config that lists a profile file while declaring
`available: false` is rejected rather than guessed at. **A side view is never synthesised**; an early
Yandir build carried a generated left profile and it was removed as invented detail. Fewer cameras is
the correct answer.

What changed, in one line each:

- `VIEW_DIRECTIONS` / `ordered_views` / `view_screen_right` / `view_depth_axis` replace the hard-coded
  `[[1,0,0], [-1,0,0]]` screen-right pair. Screen-right is `up x direction`, which reproduces the old
  pair exactly (the cross products are integral).
- `axis_depth_buffers` rasterises a near/far pair per camera **axis** — front/back share the z pair,
  left/right the x pair — and the x pair is only rasterised when a side plate exists. Vertical
  cameras are rejected: a top/bottom pair would need its own screen mapping.
- `blend_views` is the existing rule, unchanged, generalised to N columns:
  `exp(blend_power * (cos - 1))`, occluded cameras attenuated by `1e-4`, then normalised.
- `refs.prepare_side_plates` registers a profile onto the base framing.
- The build report gains `atlas.visibility` with per-view `visible_percent` and `primary_percent`
  (the share of texels a camera actually carries), plus the `neither` figure that was previously only
  printed to the log.

**Registration matches HEIGHT and nothing else, deliberately.** A profile silhouette's width is the
subject's _depth_, which has no counterpart in the front plate's width, so there is nothing
horizontal to match and none is attempted. The side capture is cropped to its own square, sized so
the subject fills the same fraction of it as on the base plates — a uniform scale expressed as a
crop, so nothing is resampled and the "plates are never upsampled" rule still holds. The assumption
that buys is stated in the code and recorded in `plates.json`: same subject, same pose, full height.
A vertically cropped profile invalidates it and is raised as a build warning rather than absorbed.

**A side camera is not free.** At the default `blend_power` 3.0 a camera 90 degrees off still carries
`e^-3` = 4.5% raw weight, so a four-camera build takes ~9% of a perfectly front-facing texel from the
two side plates, against ~0.25% from the back plate on a two-camera build. That is the existing rule
applied to more cameras, not a new one; `projection.blend_power` is the knob if it shows.

#### Regression proof

Saint Llothis rebuilt unchanged, and the noise band measured first by running the **pre-change** code
twice, exactly as this document requires:

|                           |          A (old) |          B (old) |          C (new) |
| ------------------------- | ---------------: | ---------------: | ---------------: |
| charts / utilization      |     776 / 0.7538 |     776 / 0.7538 |     776 / 0.7538 |
| coverage / covered texels | 66.53% / 697,661 | 66.53% / 697,661 | 66.53% / 697,661 |
| grazing fill texels       |          292,061 |          292,067 |      **292,046** |
| face texels / head share  |  67,590 / 25.01% |  67,590 / 25.01% |  67,590 / 25.01% |
| tris / verts              |  44,999 / 31,803 |  44,999 / 31,803 |  44,999 / 31,803 |
| bytes                     |        1,774,604 |        1,774,564 |    **1,774,548** |
| PSNR                      |         38.26 dB |         38.26 dB |         38.26 dB |

Two runs of the _old_ code already differ by 6 grazing texels and 40 bytes. The new code sits 15-21
texels and 16-56 bytes from them — inside that band — and every other number is identical, including
the tone means and all checks. The visibility line still reads `front=37.4% back=35.9% neither=28.9%`.
Test suite: **51 pass**, up from 28, with the new cases covering camera order, the exact reproduction
of the old screen-right pair, the two-view blend arithmetic, occlusion under N cameras, side-plate
framing, a vertically cropped profile, and a config that contradicts itself.

#### What four cameras actually buy, across the extracted-mesh supply

`measure-view-coverage.py` runs the real unwrap, raster and occlusion test with no plates and no GPU,
so this cost minutes rather than builds. It reproduces the Colossus's condemning numbers exactly
(1,406 charts at 17.4 faces, 62.0% neither, 51.2% grazing fill), which is what makes the rest
trustworthy. Grazing fill, two cameras -> four:

| Mesh                             | charts |          neither |     grazing fill |     gain |
| -------------------------------- | -----: | ---------------: | ---------------: | -------: |
| Mantikora (Possessed Mantikora)  |    368 |      31.2 -> 8.4 |     55.5 -> 25.1 | **30.4** |
| Sload (Z'Maja)                   |    415 |      13.6 -> 4.2 |     45.3 -> 19.2 |     26.1 |
| ArgonianBehemoth (Oaxiltso)      |    264 |      14.9 -> 4.4 |     42.2 -> 19.3 |     22.8 |
| Harvester (Xalvakka)             |    406 |     20.7 -> 11.8 |     43.1 -> 20.6 |     22.5 |
| VampireLord (Falgravn)           |  1,185 |     24.0 -> 13.9 |     43.6 -> 27.4 |     16.2 |
| Lamia (Ozara)                    |    141 |       6.3 -> 3.3 |      24.6 -> 9.1 |     15.5 |
| StoneAtronach (Foundation Stone) |    232 |     35.8 -> 22.8 |     50.1 -> 34.8 |     15.4 |
| Chimera                          |  5,134 |     36.8 -> 21.0 |     32.0 -> 18.3 |     13.8 |
| ShatteredShard (Orphic Shard)    |    877 |      15.7 -> 8.8 |     35.5 -> 22.8 |     12.7 |
| ClockWorkTitan                   |  2,680 |      19.6 -> 8.1 |     38.4 -> 27.1 |     11.3 |
| GrievousTwilight (Rakkhat)       |    587 |      12.2 -> 5.4 |     27.0 -> 16.9 |     10.2 |
| WispMother (Varlariel)           |  1,220 |      10.4 -> 5.8 |     49.9 -> 38.5 |     11.4 |
| Giant                            |    494 |     27.4 -> 20.4 |     50.8 -> 43.5 |      7.3 |
| Troll (Stonebreaker)             |  2,227 |     48.7 -> 37.0 |     33.6 -> 31.4 |      2.2 |
| **DwarvenColossus**              |  1,406 | **62.0 -> 53.4** | **51.2 -> 49.2** |  **2.0** |

Read that as a **sourcing priority**, not a promise: it is what the cameras could reach, and every one
of those gains still needs a real profile plate to exist. The deep quadrupeds and serpentine subjects
are where profiles pay for themselves; the Colossus and the Troll are where they do not, and both are
interior-heavy assemblies.

**The four-camera path was also exercised end to end**, on the Colossus with `view-02` supplied as a
left plate purely as a plumbing run (`build/dwarven-colossus-4view/`, suffix `-4view-plumbing`, **not
an asset** — `view-02` is a ~45 degree three-quarter and the colour it lays down is yaw-skewed). It
completed with `cameras: 3 (front, back, left)`, `visibility: front=21.3% back=18.7% left=16.4%
neither=57.6%`, all checks passed. The atlas is **still confetti and visually indistinguishable from
the two-camera one** — the flat atlas, not a render, being the thing to judge.

#### Falgravn's wing band: four cameras cannot fix it either

Analysis only, no rebuild (`build/lord-falgravn/wing-analysis.py`).

- **The mechanism, quantified.** The per-slice horizontal silhouette envelope moves
  **0.14%** of model width per height slice through the legs, **0.27%** through the torso and
  **0.64% mean / 1.29% p90 / 6.62% max** through the wing band. So a one-slice registration error
  costs up to ~6.6% of the model's width horizontally on the wing — 2.4x the torso and 4.6x the legs.
  That is exactly the recorded "one height slice spans the entire wing" failure, now with a number.
- **A side camera could never carry that surface.** The wing texels face the side cameras at |cos|
  **0.135** — only 2.4-2.8% of them clear the 0.35 grazing threshold — against |cos| 0.683 for
  front/back. Raw blend weight 0.083 versus 0.522. The wings are membranes whose normals already
  point at the cameras we have; the defect is in the `u` parameterisation, not in coverage.
- **A top camera does not help either**, which was worth checking and is not what I expected. Slicing
  on depth instead of height makes the envelope _more_ volatile on this subject, 1.71% mean against
  0.67%, because the wing is thin in z. So the conclusion in the Falgravn section stands unchanged: a
  **registered wing closeup** is the fix, and nothing about camera count changes that.

## Unknown actors

Any actor the registry does not recognise by exact normalized name keeps the capsule marker. That
is deliberate: in a tactical replay a wrong body is more misleading than an abstract one, so the
registry never substitutes a lookalike mesh or partial-matches a name.
