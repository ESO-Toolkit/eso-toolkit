# Boneman replay prototype (v1) — the skeleton archetype

- Covers: **32 ESO Logs actor names across the dungeon corpus**, not a single encounter
- Reference: <https://esomodelviewer.com/creatures/post/125-boneman-man-mer>
- Prepared asset: 4,997 triangles / 4,317 vertices / **287,232 bytes** / 512px JPEG q92 4:4:4 /
  PSNR **37.85 dB** / 223 charts / 76.7% coverage
- 1 mesh, 1 material, 1 primitive, one draw call. POSITION, NORMAL and TEXCOORD_0 only — no skin,
  animation, morph target or glTF extension. Minimum Y exactly 0.0, centered on X and Z.

## Why this asset exists

Every other asset in this catalog is built for one boss. This one is built for an **archetype**.

The replay has no trial gate — it opens for any boss fight — so **100% of dungeon NPCs render as
capsules today**. A 250-report sample of real dungeon logs measured 1,435 distinct enemy names, and
skeletons are the **largest creature archetype in it**: 62 names and 822 fight-appearances by the
report's own keyword bucket, 6.8% of all enemy appearances. No other archetype covers as many
names from a single build.

Earlier reference sweeps missed this family because the model viewer files it under **"Boneman"**;
a search for "skeleton" returns nothing.

## The aliases are measured, and deliberately conservative

The 32 aliases are real ESO Logs actor names, harvested through the site's own client-credentials
GraphQL proxy, and they account for **342 fight-appearances**. For scale, the best-covered entry in
the trial catalog before this one served three names.

A keyword sweep for `skeleton|bone|draugr` matches **79** names. Most of the difference is
deliberately **not** aliased, because a wrong body misleads more than a capsule does:

| Excluded | Why |
| --- | --- |
| Draugr, Draugrkin (~170 appearances) | Nordic undead **with flesh and armour** — a different body |
| Skeletal Bear / Werewolf / Hound / Guar / Senche-Lion / Dire Wolf / Charger | **Quadrupeds** |
| Bone Colossus (97 appearances) | A giant, with its own extracted mesh |
| Flamebreath Skull, Bone Effigy | A floating head and an object, not a figure |
| Blackmarrow *, * Skullguard | Living necromancers and titled humanoids |
| Bonelords (all prefixes) | Floating tentacled creatures, not skeletons |
| Skeletal Destroyer (Boss subType) | Right species, **wrong tier** — this entry is scaled to the player figure, and a boss needs its own entry per the standing rule |

Draugr are the biggest single omission and the most tempting; they are also the clearest wrong body
in the list. They want their own asset.

## The build

Lesser-enemy budget: ~5,000 triangles and a 512px atlas, because skeletons appear dozens at a time.

**A skeleton is mostly holes** — thin bones and gaps that two-view reconstruction was expected to
fuse into a smooth mannequin. It did not. The clay render resolves individual
ribs, the pelvis, a segmented spine, separated fore- and upper-arm bones and articulated hands.

**Screened before spending projection time**: 23.1% blind on two cameras, comfortably inside the
shipped band of 5.6-31.5%. An upright A-pose humanoid is the shape two cameras cover best; by
contrast a floating rock cluster (Ra Kotu, 38.8%) was rejected on the same measurement. Final
measured blind area 24.3%, within 1.2 points of the screen.

**No warnings.** The head-band run-structure detector did not fire at all.

## The skull closeup was accepted

`view-04` is registered and used. Accepted closeups are rare on this project — 15 consecutive
candidates were rejected across the three preceding builds — and this one registered only because
the head band can be hand-set.

The automatic shoulder detector returns **0.7043** on this subject — the **ribcage**. That is a new
failure mode for the detector, distinct from the three already recorded (head ornaments, robe cones,
wingspans): a skeleton's widest upper-body row is its ribs, not its shoulders. Matching at that band
would have fitted ribs to ribs and never looked at the skull. Hand-set to **0.86**, measured off the
mesh (skull at v 0.86-1.0 spanning x 0.40-0.60; shoulders at v 0.82-0.86 spanning x 0.26-0.74).

The overlay shows one skull, one pair of glowing eye sockets, one tooth row and one cervical spine,
with no doubling anywhere. The base-plate skull is about 4% wider at the temples and its chin sits a
few pixels lower — soft rather than doubled, which is the case the runbook prefers to a forced fit.

`view-07` (torso) scored **4.84%, by far the lowest error on this subject, and was rejected**: the
ribcage and pelvis align, but the overlay doubles both hands. Sixth confirmation on this project that
width error is not a reliability signal.

## Honest limitations

- **The ribs are suggested, not resolved.** At 4,997 triangles and 512px the ribcage reads as banded
  relief rather than as separate bones. That is the correct trade for a figure that appears dozens at
  a time, but it is the visible cost.
- **24.3% blind and 45.3% neighbour fill.** No profile plate is published, and a real one would take
  blind area 23.1% → 18.3%. Accepted rather than synthesised.
- **This is the man-mer variant.** The gallery also publishes Argonian (`126`) and Khajiit (`127`)
  skeletons, which differ in skull shape. Every alias here resolves to the man-mer body regardless of
  the victim's race, which is wrong in detail and invisible at 32-64 px.

- Intended presentation: a 32-64 px-tall replay actor, many at once.
- Prepared: 2026-09-08

The Elder Scrolls Online name, character design, and related rights remain with their respective
owners, including ZeniMax Media/Bethesda Softworks. Reconstructed from published reference
screenshots for this project's authorized fan prototype; not a claim that the IP is freely licensed.
Do not reuse outside this project without a separate rights review.
