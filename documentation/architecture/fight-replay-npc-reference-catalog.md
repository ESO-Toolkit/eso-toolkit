# ESO Fight-Replay — NPC 3D Reference Catalog

Demand side: `src/types/trial-encounters.ts` (all 15 trials, verbatim encounter names).
Supply side: full sweep of `esomodelviewer.com/characters/` (18 pages, **423** posts) and
`esomodelviewer.com/creatures/` (8 pages, **190** posts) — **613** reference posts total.

Swept 2026-09-05 with `curl`; raw listings cached in `_cache/`, parsed indexes in
`index-characters.tsv`, `index-creatures.tsv`, `index-all.tsv`. No rate limiting or blocking
was encountered (all 26 listing fetches + 41 post fetches returned HTTP 200).

---

## Correction — the "shared mesh family" shortcuts do not exist

An early pass assumed the three Cloudrest Shades were one build plus two retextures, and implied the
same of the three Celestials. **Both were wrong.** Verified by downloading and viewing every plate:

**The three Shades share a prop and shader family, not a mesh.** Identical black feather
wing-shoulders, bow and quiver, purple glowing eyes and ashen skin — but Galenwe is a male in heavy
gold plate with an articulated skirt, Siroria is a **female base body** in a crimson bodysuit with a
gold corset, and Relequen wears a **floor-length robe with no visible leg geometry**. A retexture
cannot turn a plate-skirted male into a female bodysuit or into a robe cone.

**The three Celestials share only an art theme.** The Warrior is broad bone/stone plate with a horned
skull helm; the Serpent is slimmer red-brown armour with a hooded gold mask; the Mage is essentially a
cone with sleeves — a floor-length black robe under an enormous gold sunburst halo.

So that is **six GPU jobs, not two**. The genuine same-mesh saving found so far is Saint Llothis and
Saint Felms, which did transfer: Felms hit its face-texel target on the first build reusing Llothis's
tuned values. The Kyne's Aegis knights (all UESP species _Bloodknight_) remain a real one-mesh family
on paper, still unverified against plates.

**Lesson: verify mesh-sharing by looking at the plates before planning around it.** A shared species
name, shared props or a shared art theme are not evidence of a shared mesh.

### Verified plate quality for those six

All six are buildable and all plates are 1920x1080. Subject heights are **973-1005 px** — above the
~989 px that gave Saint Llothis an excellent head with no helm closeup, and far above the ~717 px that
left Captain Vrol's face needing one. `view-01` is the clean full-body front and `view-03` the back in
every one of the six posts.

Caveats: all three Shades carry a back-slung bow and quiver that crosses the upper back on `view-03`
(worst on Siroria, mildest on Relequen), so the `view-08` torso-back closeup will be needed to fill
what it hides; the fronts are clean. Shade `view-06` is shot against black feathers and is the weakest
plate in each set. The Celestials carry **no weapons in any plate** and are the cleanest sets in the
batch. Warrior and Serpent additionally have an unhelmed bare-face plate at `view-05`.

## 1. Summary

| Metric                                                                              | Count                                |
| ----------------------------------------------------------------------------------- | ------------------------------------ |
| Trials in `trial-encounters.ts`                                                     | **15**                               |
| Encounters with `type: 'boss'`                                                      | **49**                               |
| Encounters with `type: 'mini_boss'`                                                 | 18                                   |
| Encounters with `type: 'trash'`                                                     | 60                                   |
| Bosses with an **exact named** reference page (confidence: certain)                 | **14**                               |
| Bosses with a **usable base/family mesh** page (confidence: probable)               | **7**                                |
| Bosses where a same-species page exists but is likely the _wrong_ model (uncertain) | **6**                                |
| Bosses with **NO reference page at all** (blocked without in-game capture)          | **22**                               |
| Already shipped                                                                     | 2 (Yandir the Butcher, Captain Vrol) |

So: **21 of 49 bosses (43%) are buildable today** at probable-or-better confidence, of which
**2 are done** and **12 are exact-name certain and untouched**.

### What a post page actually contains

Confirmed by inspecting the markup: post pages carry **no triangle / vertex / dimension
metadata**. What they offer is a **fotorama plate gallery** — 6 to 13 view plates per model.
Plate count and plate resolution are therefore the only supply-side quality signals, and both
are recorded below.

Plate hosting varies by post age and determines maximum usable resolution:

- **Newest posts** (creature id >= ~74, character id >= ~100): `lh3.googleusercontent.com/...=w1920` — **1920px**. Best.
- **Mid posts** (character 82/83/169/172/173, creature 47/48): `live.staticflickr.com/..._h.jpg` / `_k.jpg` — **1600–2048px**. Good. (This is what Yandir and Vrol were built from.)
- **Oldest posts** (creature id < ~40): `live.staticflickr.com/..._c.jpg` — **800px only**. Marginal for texel-projected atlases.

All four hosting patterns were spot-checked live and return HTTP 200 — no dead-link rot.

---

## 2. Full trial-boss table

Confidence key:

- **certain** — the post is unambiguously that named boss.
- **probable** — the post is the correct base mesh/species and the boss is a recolour/rescale of it; expect to hand-tune colour and scale.
- **uncertain** — a same-species page exists but the boss is visually distinct enough that it may waste a build cycle. Verify plates by eye before committing.
- **NONE** — no page exists on either listing.

| Trial                | Encounter (verbatim)            | Reference page                                                          | Plates | Confidence                   | Notes                                                                                                                                                                                           |
| -------------------- | ------------------------------- | ----------------------------------------------------------------------- | ------ | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Aetherian Archive    | Lightning Storm Atronach        | https://esomodelviewer.com/creatures/post/154-storm-atronach            | 10     | probable                     | Boss is an upscaled/recoloured Storm Atronach. No named page.                                                                                                                                   |
| Aetherian Archive    | Foundation Stone Atronach       | https://esomodelviewer.com/creatures/post/160-foundation-stone-atronach | 9      | certain                      | Exact name match.                                                                                                                                                                               |
| Aetherian Archive    | Varlariel                       | https://esomodelviewer.com/creatures/post/74-wispmother-light           | 10     | probable                     | No Varlariel page. Wispmother base mesh; also `/creatures/post/75-wispmother-dark` (10). Varlariel's palette differs.                                                                           |
| Aetherian Archive    | The Mage                        | https://esomodelviewer.com/characters/post/173-the-mage                 | 10     | certain                      | Celestial Mage. Exact.                                                                                                                                                                          |
| Hel Ra Citadel       | Ra Kotu                         | https://esomodelviewer.com/creatures/post/157-air-atronach-boss         | 9      | probable                     | Page is explicitly the _boss_ Air Atronach variant; Ra Kotu is a giant Air Atronach. Flagged: could be a different boss air atronach. Base version at `/creatures/post/156-air-atronach-basic`. |
| Hel Ra Citadel       | The Yokedas                     | NONE                                                                    | –      | NONE                         | No Yokeda Rok'dun / Yokeda Kai page. No Anka-Ra entries at all on the site.                                                                                                                     |
| Hel Ra Citadel       | The Warrior                     | https://esomodelviewer.com/characters/post/172-the-warrior              | 11     | certain                      | Celestial Warrior. Exact.                                                                                                                                                                       |
| Sanctum Ophidia      | Possessed Mantikora             | https://esomodelviewer.com/creatures/post/47-mantikora-adult            | 10     | probable                     | Base mantikora. Also `/creatures/post/108-dagonic-mantikora-boss` (10) and `/creatures/post/106-dagonic-mantikora-basic` — Dagonic is a different skin. Use 47.                                 |
| Sanctum Ophidia      | Stonebreaker                    | NONE                                                                    | –      | NONE                         | No troll base mesh on the site except Frost Troll _polymorphs_ (191/192), which are cosmetic and wrong.                                                                                         |
| Sanctum Ophidia      | Ozara                           | https://esomodelviewer.com/creatures/post/115-lamia-golden              | 10     | uncertain                    | Ozara is a unique oversized Lamia. Base lamias at 115 (golden) / 116 (gray) / 117 (red). Silhouette will be off.                                                                                |
| Sanctum Ophidia      | The Serpent                     | https://esomodelviewer.com/characters/post/169-the-serpent              | 11     | certain                      | Celestial Serpent. Exact.                                                                                                                                                                       |
| Maw of Lorkhaj       | Zhaj'hassa the Forgotten        | NONE                                                                    | –      | NONE                         | No Dro-m'Athra / Sar-m'Athra entries of any kind.                                                                                                                                               |
| Maw of Lorkhaj       | The Twins                       | NONE                                                                    | –      | NONE                         | No S'kinrai / Vashai page.                                                                                                                                                                      |
| Maw of Lorkhaj       | Rakkhat                         | NONE                                                                    | –      | NONE                         |                                                                                                                                                                                                 |
| Halls of Fabrication | The Hunter Killers              | NONE                                                                    | –      | NONE                         | No "fabricant" entries at all on the site.                                                                                                                                                      |
| Halls of Fabrication | Pinnacle Factotum               | NONE                                                                    | –      | NONE                         | No factotum entries.                                                                                                                                                                            |
| Halls of Fabrication | Archcustodian                   | https://esomodelviewer.com/creatures/post/129-dwarven-spider            | 10     | uncertain                    | Archcustodian is a giant unique spider, not the standard Dwarven Spider. Scale and geometry differ substantially.                                                                               |
| Halls of Fabrication | The Refabrication Committee     | NONE                                                                    | –      | NONE                         | Three factotums; no factotum page.                                                                                                                                                              |
| Halls of Fabrication | Assembly General                | https://esomodelviewer.com/creatures/post/96-dwarven-colossus           | 13     | probable                     | Assembly General is a Dwarven Colossus. Highest plate count in the Dwemer family. (Repo already has a verified Dwarven Colossus mesh from the Path-1 extractor.)                                |
| Asylum Sanctorium    | Saint Llothis the Pious         | https://esomodelviewer.com/creatures/post/89-saint-llothis-the-pious    | 11     | certain                      | Exact.                                                                                                                                                                                          |
| Asylum Sanctorium    | Saint Felms the Bold            | https://esomodelviewer.com/creatures/post/88-saint-felms-the-bold       | 11     | certain                      | Exact.                                                                                                                                                                                          |
| Asylum Sanctorium    | Saint Olms the Just             | https://esomodelviewer.com/creatures/post/90-saint-olms-the-just        | 13     | certain                      | Exact. Best plate coverage of the three.                                                                                                                                                        |
| Cloudrest            | Shade of Galenwe                | https://esomodelviewer.com/characters/post/233-shade-of-galenwe         | 10     | certain                      | Humanoid Welkynar. Companion gryphon **Falarielle has NO page**; nearest is `/creatures/post/121-gryphon-brown` / 122 / 123 / `146-blazing-gryphon`.                                            |
| Cloudrest            | Shade of Siroria                | https://esomodelviewer.com/characters/post/234-shade-of-siroria         | 10     | certain                      | Companion gryphon Silaeda: no page (see gryphon family).                                                                                                                                        |
| Cloudrest            | Shade of Relequen               | https://esomodelviewer.com/characters/post/235-shade-of-relequen        | 10     | certain                      | Companion gryphon Belanaril: no page (see gryphon family).                                                                                                                                      |
| Cloudrest            | Z'Maja                          | https://esomodelviewer.com/creatures/post/3-sea-sload                   | 8      | probable                     | Correct species (Sea Sload) but Z'Maja has unique robes/staff. **800px plates only** (old `_c` Flickr) — the weakest supply in the certain/probable tier.                                       |
| Sunspire             | Yolnahkriin                     | https://esomodelviewer.com/creatures/post/8-fire-dragon                 | 7      | uncertain                    | No named-dragon pages. Fire Dragon is the generic base; Yolnahkriin is the red one so this is the closest of the three. **800px plates only.**                                                  |
| Sunspire             | Lokkestiiz                      | https://esomodelviewer.com/creatures/post/8-fire-dragon                 | 7      | uncertain                    | White frost/lightning skin, would need a full recolour off the Fire Dragon base.                                                                                                                |
| Sunspire             | Nahviintaas                     | https://esomodelviewer.com/creatures/post/8-fire-dragon                 | 7      | uncertain                    | Golden skin, same caveat. `/characters/post/305-the-black-dragon` (Kaalgrontiid) is a _character_ post and a different dragon.                                                                  |
| Kyne's Aegis         | Yandir the Butcher              | https://esomodelviewer.com/characters/post/82-yandir-the-butcher        | 10     | certain                      | **SHIPPED (v2).**                                                                                                                                                                               |
| Kyne's Aegis         | Captain Vrol                    | https://esomodelviewer.com/characters/post/83-captain-vrol              | 10     | certain                      | **SHIPPED (v2).**                                                                                                                                                                               |
| Kyne's Aegis         | Lord Falgravn                   | NONE                                                                    | –      | NONE                         | Confirmed absent from both listings. Matches the prior finding that Falgravn has no usable reference.                                                                                           |
| Rockgrove            | Oaxiltso                        | https://esomodelviewer.com/creatures/post/83-oaxiltso                   | 10     | certain                      | Exact name match, 1920px plates.                                                                                                                                                                |
| Rockgrove            | Flame-Herald Bahsei             | NONE                                                                    | –      | NONE                         | No naga entries at all.                                                                                                                                                                         |
| Rockgrove            | Xalvakka                        | https://esomodelviewer.com/creatures/post/84-harvester-dagonic          | 10     | uncertain                    | Xalvakka is a unique giant Daedric Harvester. Base Harvester at `/creatures/post/13-harvester` (7 plates, 800px). Dagonic variant is 1920px but is a different skin.                            |
| Dreadsail Reef       | Lylanar and Turlassil           | NONE                                                                    | –      | NONE                         | Two-model encounter; neither brother has a page.                                                                                                                                                |
| Dreadsail Reef       | Reef Guardian                   | NONE                                                                    | –      | NONE                         |                                                                                                                                                                                                 |
| Dreadsail Reef       | Tideborn Taleria                | https://esomodelviewer.com/creatures/post/158-tideborn-taleria          | 10     | certain                      | Exact name match, 1920px plates.                                                                                                                                                                |
| Sanity's Edge        | Exarchanic Yaseyla              | NONE                                                                    | –      | NONE                         |                                                                                                                                                                                                 |
| Sanity's Edge        | Archwizard Twelvane and Chimera | https://esomodelviewer.com/creatures/post/149-chimera-white             | 13     | probable (Chimera half only) | Chimera has pages: `149-chimera-white` (13) and `150-chimera-red` (13). **Twelvane himself has NO page** — this encounter needs two models and only one is covered.                             |
| Sanity's Edge        | Ansuul the Tormentor            | NONE                                                                    | –      | NONE                         |                                                                                                                                                                                                 |
| Lucent Citadel       | Count Ryelaz and Zilyesset      | NONE                                                                    | –      | NONE                         | Neither half has a page.                                                                                                                                                                        |
| Lucent Citadel       | Cavot Agnan                     | NONE                                                                    | –      | NONE                         | A Breton humanoid; no named page. Could only be approximated from an unrelated generic Breton character post — not a real match.                                                                |
| Lucent Citadel       | Orphic Shattered Shard          | NONE                                                                    | –      | NONE                         |                                                                                                                                                                                                 |
| Lucent Citadel       | Xoryn                           | NONE                                                                    | –      | NONE                         |                                                                                                                                                                                                 |
| Ossein Cage          | Hall of Fleshcraft              | NONE                                                                    | –      | NONE                         | Encounter is the Shapers of Flesh; no entries.                                                                                                                                                  |
| Ossein Cage          | Jynorah and Skorkhif            | NONE                                                                    | –      | NONE                         |                                                                                                                                                                                                 |
| Ossein Cage          | Overfiend Kazpian               | NONE                                                                    | –      | NONE                         | Newest trial; site has no Ossein Cage coverage.                                                                                                                                                 |
| Opulent Ordeal       | Opulent Trio                    | NONE                                                                    | –      | NONE                         | Newest trial; no Opulent Arid Varlet / Knightshade / Web Eater entries.                                                                                                                         |

---

## 3. Shortlist — best next 12 builds

Ordered by (exact-name confidence) x (plate count) x (mesh simplicity / humanoid rigging reuse
from the Yandir + Vrol pipeline).

| #   | Boss                      | Trial | Page                                            | Plates | Res         | Why                                                                                                                                                        |
| --- | ------------------------- | ----- | ----------------------------------------------- | ------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Saint Olms the Just       | AS    | `/creatures/post/90-saint-olms-the-just`        | **13** | 1920        | Highest plate count of any exact match. Giant factotum = broadly humanoid, rigid armour panels, no fur/cloth. Ideal for the texel-projection atlas method. |
| 2   | Saint Llothis the Pious   | AS    | `/creatures/post/89-saint-llothis-the-pious`    | 11     | 1920        | Humanoid, robed, exact match. Same trial as #1 and #3 — one trial fully covered in three builds.                                                           |
| 3   | Saint Felms the Bold      | AS    | `/creatures/post/88-saint-felms-the-bold`       | 11     | 1920        | Humanoid axe-wielder, exact match. Completes Asylum Sanctorium 3/3.                                                                                        |
| 4   | Shade of Galenwe          | CR    | `/characters/post/233-shade-of-galenwe`         | 10     | 1920        | Male, heavy gold plate, articulated plate skirt. Separate build.                                                                                           |
| 5   | Shade of Siroria          | CR    | `/characters/post/234-shade-of-siroria`         | 10     | 1920        | **NOT a retexture of #4** — verified from the plates. Female base body, crimson bodysuit with gold corset, tall greaves. Separate build.                   |
| 6   | Shade of Relequen         | CR    | `/characters/post/235-shade-of-relequen`        | 10     | 1920        | **NOT a retexture either** — floor-length robe with no visible leg geometry. #4-#6 are THREE separate builds; see the correction below.                    |
| 7   | The Warrior               | HRC   | `/characters/post/172-the-warrior`              | **11** | 2048 (`_k`) | Celestial Warrior — humanoid, exact match, highest-resolution plates on the whole site.                                                                    |
| 8   | The Serpent               | SO    | `/characters/post/169-the-serpent`              | **11** | 1600–2048   | Celestial, exact match, good coverage.                                                                                                                     |
| 9   | The Mage                  | AA    | `/characters/post/173-the-mage`                 | 10     | 1600–2048   | Celestial, exact match. #7–#9 are the three Celestials — same visual language, likely shared shader work.                                                  |
| 10  | Tideborn Taleria          | DSR   | `/creatures/post/158-tideborn-taleria`          | 10     | 1920        | Exact name match, humanoid-ish coral monstrosity. Only DSR boss with a reference at all.                                                                   |
| 11  | Oaxiltso                  | RG    | `/creatures/post/83-oaxiltso`                   | 10     | 1920        | Exact name match. Behemoth = big, chunky, low-detail-tolerant. Only RG boss with a reference.                                                              |
| 12  | Foundation Stone Atronach | AA    | `/creatures/post/160-foundation-stone-atronach` | 9      | 1920        | Exact name match. Rock geometry is the most forgiving possible subject for a smeared/imperfect atlas.                                                      |

**Bench (do next, lower confidence or non-humanoid):** Assembly General via
`/creatures/post/96-dwarven-colossus` (13 plates — and the repo already has a _verified_
Dwarven Colossus GLB from the Path-1 mnf->gr2 extractor, so this may not need the
screenshot pipeline at all); Ra Kotu via `/creatures/post/157-air-atronach-boss` (9);
Lightning Storm Atronach via `/creatures/post/154-storm-atronach` (10).

---

## 4. Bosses with NO reference page (22) — permanently blocked without in-game capture

**Hel Ra Citadel**

- The Yokedas (Yokeda Rok'dun + Yokeda Kai)

**Sanctum Ophidia**

- Stonebreaker

**Maw of Lorkhaj — entire trial blocked (3/3)**

- Zhaj'hassa the Forgotten
- The Twins (S'kinrai + Vashai)
- Rakkhat

**Halls of Fabrication**

- The Hunter Killers (Positrox + Negatrix)
- Pinnacle Factotum
- The Refabrication Committee

**Kyne's Aegis**

- Lord Falgravn

**Rockgrove**

- Flame-Herald Bahsei

**Dreadsail Reef**

- Lylanar and Turlassil
- Reef Guardian

**Sanity's Edge**

- Exarchanic Yaseyla
- Ansuul the Tormentor
- (Archwizard Twelvane — the non-Chimera half of `boss_2`)

**Lucent Citadel — entire trial blocked (4/4)**

- Count Ryelaz and Zilyesset
- Cavot Agnan
- Orphic Shattered Shard
- Xoryn

**Ossein Cage — entire trial blocked (3/3)**

- Hall of Fleshcraft
- Jynorah and Skorkhif
- Overfiend Kazpian

**Opulent Ordeal — entire trial blocked (1/1)**

- Opulent Trio

Pattern: esomodelviewer's coverage effectively **stops after the Blackwood / High Isle era**.
Everything from Necrom onward — Sanity's Edge, Lucent Citadel, Ossein Cage, Opulent Ordeal —
is essentially uncovered, as is the entire Maw of Lorkhaj Dro-m'Athra family and the whole
Halls of Fabrication fabricant/factotum family. That is 11 of the 22 blocked bosses in four
trials.

---

## 5. One-mesh-covers-many families (highest leverage)

| Family                        | Reference page(s)                                                                             | Covers                                                                                             | Notes                                                                                                                                                                                                                                                                                     |
| ----------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **KA Vampire Knights**        | `/creatures/post/33-bloodknight` (10 plates, **800px**)                                       | KA trash: **Blood Knight**, **Bitter Knight**, **Crimson Knight** (3 encounters)                   | The listing name is "Bloodknight", one word — do not search for "Blood Knight". All three KA knights share ONE mesh, differing only by tint. 3 encounters for 1 build. Caveat: oldest-era post, 800px plates only.                                                                        |
| **Cloudrest Welkynar Shades** | `/characters/post/233`, `/234`, `/235` (10 plates each)                                       | Shade of Galenwe, Shade of Siroria, Shade of Relequen (3 bosses)                                   | Three separate pages, but one body/armour mesh with element recolours. Build once, retexture twice.                                                                                                                                                                                       |
| **Celestials**                | `/characters/post/169-the-serpent`, `/172-the-warrior`, `/173-the-mage`                       | The Serpent (SO), The Warrior (HRC), The Mage (AA) (3 bosses)                                      | Shared celestial constellation-shader look; `/characters/post/167-the-thief` also exists for future non-trial use.                                                                                                                                                                        |
| **Asylum Saints**             | `/creatures/post/88`, `/89`, `/90`                                                            | Saint Felms, Saint Llothis, Saint Olms (3 bosses)                                                  | Distinct meshes but one trial, one art style, one shipping batch.                                                                                                                                                                                                                         |
| **Sunspire Dragons**          | `/creatures/post/8-fire-dragon` (7 plates, 800px)                                             | Yolnahkriin, Lokkestiiz, Nahviintaas (3 bosses)                                                    | One dragon mesh, three recolours in-game. Highest theoretical leverage of any family — 3 bosses from 1 build — but the _only_ available reference is the 7-plate 800px generic Fire Dragon, so confidence is **uncertain**. Biggest single win if in-game capture ever becomes available. |
| **Atronachs (AA)**            | `/creatures/post/154-storm-atronach`, `/160-foundation-stone-atronach`, `/153-frost-atronach` | AA `boss_1`, AA `boss_2`, AA trash Frost Atronach                                                  | AA is almost entirely atronachs; `/creatures/post/151-flame-atronach`, `/155-iron-atronach`, `/179-crystal-atronach` additionally cover Sunspire / Rockgrove / Lucent Citadel _adds_.                                                                                                     |
| **Gryphons (CR companions)**  | `/creatures/post/121-gryphon-brown` (+`/122`, `/123`, `/146-blazing-gryphon`)                 | Falarielle, Silaeda, Belanaril — the three gryphons paired with the Cloudrest shades               | Named gryphons have no pages, but the base gryphon does in three colourways, which maps neatly onto three shades. Confidence: probable.                                                                                                                                                   |
| **Mantikoras**                | `/creatures/post/47-mantikora-adult`                                                          | SO Possessed Mantikora (boss) + Mantikora adds in The Serpent                                      |                                                                                                                                                                                                                                                                                           |
| **Haj Motas**                 | `/creatures/post/139-coral-haj-mota` (11) + `/creatures/post/49-haj-mota-small`               | DSR mini "Bow Breaker" (literally a Coral Haj Mota) + RG mini "Haj Mota" + DSR small Haj Mota adds | Best mini-boss match on the site.                                                                                                                                                                                                                                                         |
| **Ogres (MoL trash)**         | `/creatures/post/72-ogre-shaman-diseased` (+`/70`, `/71`)                                     | MoL trash "Ogre Shaman"                                                                            | Only MoL asset with any reference at all.                                                                                                                                                                                                                                                 |

### Bonus: mini-boss matches found while sweeping

| Mini-boss                             | Trial | Page                                                                                      | Plates      | Confidence                                                            |
| ------------------------------------- | ----- | ----------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------- |
| Ash Titan                             | RG    | `/creatures/post/112-ash-titan`                                                           | **13**      | certain (exact name)                                                  |
| Bow Breaker                           | DSR   | `/creatures/post/139-coral-haj-mota`                                                      | 11          | probable (the encounter _is_ a Coral Haj Mota)                        |
| Miserilnear                           | LC    | `/creatures/post/12-bone-colossus`                                                        | 8           | probable (the encounter is a bone colossus; 800px)                    |
| Baron Rize                            | LC    | `/creatures/post/7-dread-grievous-twilight`                                               | not fetched | probable (the encounter is a Grievous Twilight)                       |
| Red Witch Gedna Relvel                | OSC   | `/creatures/post/16-lich`                                                                 | 7           | uncertain (species only, 800px)                                       |
| Blood Drinker Thisa                   | OSC   | `/creatures/post/32-vampire-lord`                                                         | 10          | uncertain (species only, 800px)                                       |
| Dreadful Abductor (x3)                | OSC   | `/creatures/post/2-watcher-green` (also `/81-watcher-dagonic`, `/172-watcher-apocryphal`) | 6           | uncertain (species only)                                              |
| Haj Mota                              | RG    | `/creatures/post/49-haj-mota-small`                                                       | not fetched | probable                                                              |
| The Serpent's Image                   | SO    | NONE                                                                                      | –           | NONE                                                                  |
| Spiral Descender / The Hollow One     | SE    | NONE                                                                                      | –           | NONE                                                                  |
| Sail Ripper                           | DSR   | NONE                                                                                      | –           | NONE                                                                  |
| Basks-In-Snakes                       | RG    | NONE                                                                                      | –           | NONE                                                                  |
| Dariel Lemonds / Jresazzel & Xynizata | LC    | NONE                                                                                      | –           | NONE                                                                  |
| Tortured Amkaos, Kathutet & Ranyu     | OSC   | NONE                                                                                      | –           | NONE (`/characters/post/32-dremora-male-1` is a generic dremora only) |

---

## 6. Traps confirmed / to watch

1. **`grep -c` lies about plate counts.** Plate URLs are multiple-per-line; count with `grep -o ... | wc -l`.
2. **Two gallery markup generations.** New posts use `data-full="..."`; posts with creature id below ~40 use bare `live.staticflickr.com/..._c.jpg` links with _no_ `data-full` attribute and only 800px images. A naive `data-full` count reports **0 plates** for Bloodknight, Sea Sload, Lich, Vampire Lord, Watcher, Bone Colossus, Harvester, Fire Dragon and Wraith-of-Crows — all of which actually have 6–10 plates.
3. **Name normalization.** "Blood Knight" (encounter) vs "Bloodknight" (page). Space-insensitive matching is required.
4. **Same species != same boss.** Ozara/Lamia, Archcustodian/Dwarven Spider, Xalvakka/Harvester and all three Sunspire dragons are species matches only and are marked _uncertain_ deliberately — verify the plates by eye before spending a build cycle.
5. **Multi-model encounters.** Lylanar and Turlassil (2, neither covered), Count Ryelaz and Zilyesset (2, neither covered), Jynorah and Skorkhif (2, neither covered), Archwizard Twelvane and Chimera (2, **one** covered), The Yokedas (2, neither covered), The Hunter Killers (2, neither covered), The Refabrication Committee (3, none covered), Opulent Trio (3, none covered), and each Cloudrest shade + its gryphon (2, shade covered / gryphon family-only). Yandir's Sea Adder / Gryphon pets: Sea Adder has NO page; gryphon pets can use `/creatures/post/121-gryphon-brown`.
6. **No mesh statistics anywhere.** Do not plan around listed triangle or vertex counts — the site does not publish them. Plate count and plate resolution are the only supply metrics.
7. **Reproducing the sweep.** Listings are `https://esomodelviewer.com/characters/?page=N` (N=1..18) and `https://esomodelviewer.com/creatures/?page=N` (N=1..8); items are `<a href="/characters/post/{id}-{slug}">{Display Name}</a>`. A trailing slash is required (`/characters` 301s to `/characters/`).
