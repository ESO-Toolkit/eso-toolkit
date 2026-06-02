# Trial Boss Model Audit — June 2026

Continuation of PR #877 (`ESO-714/trial-boss-model-mapping`). This audit establishes which of the 54
boss GLB assets are real, which are wrong, and which are placeholders — and specifies how to fix the
gaps. **Scope of this round: model assets only** (no replay wiring, no viewer page).

> **Re-extraction was blocked in the session that produced this audit** — no full ESO install was
> present (only a partial/mid-download `depot/` with `eso0002.dat.solidpartial`, no `game.mnf`, no
> Oodle `oo2core_*.dll`). This document is the precise spec to run once a full install is available.
> The extractor toolchain itself is ported and **builds clean** (Rust 1.94, edition 2024; CLI verified
> runnable).

## TL;DR

PR #877 shipped 54 boss GLBs. They are **not** all real, correct game models. After geometry hashing,
offline rendering, and a per-boss web-research cross-reference against UESP / ESO-Hub:

_(Counts below reconciled against a per-boss correctness audit cross-referencing UESP / eso-hub /
esomodelviewer — see `model_audit_2026_06.json`.)_

| Action | Count | Meaning |
|---|---|---|
| ✅ **Keep** | 14 | Real distinct ESO creature mesh, mapping-trusted as this boss. **Visual match pending your confirmation.** |
| ✅ **Keep (shared)** | 12 | Real mesh legitimately reused across same-species bosses. Pending confirm. |
| 🟠 **Wrong — best available** | 5 | A real but *wrong-species* mesh; **no better mesh exists in the files** so it stands as the closest available (the 4 Factotum bosses → Dwemer Centurion; Reef Guardian → Air-Atronach coral). |
| ❌ **Wrong — needs capture** | 4 | Wrong creature, and the correct one is **not file-extractable** — the 3 Sunspire living dragons (committed mesh is the skeletal Bone Dragon) + Yandir (a Sea Giant armor-humanoid). Needs RenderDoc GPU capture (see `EXTRACTION-GUIDE.md`). |
| ❌ **Fix** | 1 | Overfiend Kazpian — a Ruinach given a Daedroth; no Ruinach mesh exists by name (capture or accept stand-in). |
| 🔲 **Placeholder** | 16 | Humanoid boss built from ESO's modular player skeleton + armor. **No standalone creature mesh** — got a generic stand-in. Needs capture/assembly. |
| 🔍 **Verify** | 2 | Plausible mesh, but needs a human eyeball (The Warrior, The Serpent). |

So **26 of 54 are right or acceptable** (Keep + Keep-shared); **5 are wrong-but-best-available**; **5 are
wrong with no file-extractable fix** (dragons, Yandir, Kazpian — GPU capture); **16 are placeholders**.

### Method note: metadata lies, geometry + eyes don't

The GLB `generator` string (`eso-model-extractor (Granny SDK)` vs `trimesh`) is **not** a reliable
quality signal — several `trimesh`-tagged humanoids are real detailed meshes (just re-meshed), and a
`Granny`-tagged file can still be the wrong creature. Verification here was: (1) hash each POSITION
buffer to find exact shared-mesh groups, (2) render every model to PNG silhouettes for human QA, (3)
research the correct creature identity per boss. The render contact sheet is the artifact for your
manual pass.

## Root causes (the three fix-classes)

1. **Humanoids are not single meshes.** ESO assembles humanoid NPCs (the 16 placeholders + Yandir/Vrol)
   from a player skeleton + swappable armor/body parts. The standalone-creature extractor can't produce
   one mesh for them. **This was investigated exhaustively — see "Assembly investigation" below.**
2. **Sunspire dragons are the wrong creature (skeletal Bone Dragon).** See the Sunspire per-boss note
   below — the living winged mesh is not file-extractable. _(Earlier draft of this doc wrongly framed it
   as a texture issue; corrected.)_ The original (now-superseded) note read: all three living dragons share the same body
   GR2 (so the geometry hash is identical, and that's *correct* in-game). In ESO they're differentiated
   by **material/texture** (Lokkestiiz frost-white, Yolnahkriin red-fire, Nahviintaas gold). The fix is
   a **texture pipeline**, not a second mesh extraction. The living-dragon meshes are stored as
   "unnamed multi-part" files, which is why distinct dragon bodies are hard to locate.
3. **A handful of creature `file_index` values are wrong.** Fixable in JSON + re-extract once a full
   install is available.

## Assembly investigation — can the humanoids / living dragons be built from files? (DEFINITIVE: no)

This was pushed hard (multiple research passes + adversarial verification + on-disk tests). The honest,
evidence-backed conclusion: **for the 16 humanoid bosses + Yandir/Vrol + the 3 living Sunspire dragons,
there is no file-based way to produce the correct complete model.** What was actually proven:

- **The parts ARE extractable and named.** Earlier belief that humanoid parts are "unnamed blobs" was
  wrong — `EsoExtractData` reconstructs names (`Mdl_CustomizationSkeleton-Msh_Helmet_B`), and the
  `mshBn_*` bone-name strings are readable in the raw GR2s. The `mshBn` skeleton-matching method is real.
- **…but it can't pick a specific boss's parts.** Every humanoid armor/body piece binds to one shared
  `CustomizationSkeleton` — e.g. `Helmet_B` has exactly **1 bone** (`mshBn_head`), which matches *every*
  humanoid. Bone-matching a humanoid returns the entire armor corpus, with **zero per-boss signal**.
- **The recipe (which parts a boss wears) is in no extractable file.** Verified across: the ESO Lua
  addon API (all 4,344 functions — `GetUnitRace`/`GetUnitGender` + a 2D silhouette icon, but **nothing**
  returns a unit's worn 3D equipment), UESP's datamined tables (2D item icons only), and the gamedata
  NPC-definition binaries (undecoded; reverse-engineering them would be original unpublished work).
- **The living dragon mesh isn't locatable** under any internal Granny name (the on-disk dragon GLB is
  the skeletal `BoneDragon_A_Basic` — a different creature). Can't be *100%* proven absent, but no one —
  including esomodelviewer.com's operator, the most experienced ESO ripper — has found it.
- **Decisive tell:** that operator does **not** assemble humanoids from files; he recommends GPU capture.

**So the only route to the correct geometry for these bosses is a live GPU frame capture** (RenderDoc —
see `EXTRACTION-GUIDE.md` + `tools/renderdoc-rip/`), which is an ESO EULA violation and yields an
un-rigged frozen pose. The two honest endpoints: **(a)** labeled stand-ins (what's committed), or
**(b)** GPU capture when the real geometry is genuinely required. File extraction stays reserved for the
self-contained creature bosses, where it works cleanly.

> ⚠️ **Trust note on the research layer.** The per-boss "real identity" and the specific source-mesh
> filenames below (`CWCfactotem_U_TP`, `DwarvenColossus_Body_A_Basic`, etc.) come from web research that
> reasoned from names — the agents did **not** see the meshes. Treat these filenames as
> **leads, not facts**: one of them (`Harbinger_B_Boss` = Ruinach) was checked against a render and was
> **wrong**. Verify each candidate filename against the archive `list` output / a render before trusting
> it. The *bucketing* (Keep/Fix/Placeholder) is grounded in geometry hashing + renders and is reliable;
> the *replacement filenames* are not.

## Headline corrections found by the research pass

- **3 Factotum bosses** (Pinnacle Factotum, Reactor/Reclaimer/Reducer, Saint Felms) wear
  **Dwemer Centurion / Clockwork Titan** meshes — wrong. Factotums are distinct brass humanoid
  automatons. Saint Llothis's correct mesh was even identified: `CWCfactotem_U_TP`.
- **Assembly General** is a **Dwarven Colossus** (`DwarvenColossus_Body_A_Basic` + arm meshes), not the
  `ClockWorkImperfect` it currently uses.
- **Overfiend Kazpian** is a **Ruinach** (four-armed Daedra), not the Daedroth it currently uses.
  ⚠️ The research pass claimed the Ruinach mesh is already present as `Harbinger_B_Boss.glb` — this was
  **checked against the render and is false**: `Harbinger_B_Boss` is a two-armed horned humanoid Daedra,
  not a four-armed Ruinach. The correct Ruinach mesh still needs to be located and extracted.
- **Reef Guardian** is a **Coral Golem** (Golem family), currently borrowing the Air-Atronach coral
  mesh. Visually close, but a distinct model exists.
- **Zilyesset** (half of "Count Ryelaz & Zilyesset") is a **Fractured Remnant**, not a Grievous
  Twilight — the encounter entry conflates two creatures.
- **Red Witch Gedna Relvel** is a **Lich** (has a standalone creature mesh) — not a player-skeleton
  humanoid, so it moves out of the placeholder bucket into Fix.
- **Flame-Herald Bahsei** is an Argonian who *transforms* into a **Bone Goliath** mid-fight — so the
  `BoneColossus` model is actually correct for the boss form. Kept.

<!-- BEGIN PER-BOSS (generated) -->
## Per-boss results

Action key: **✅ Keep** = real distinct mesh, mapping-trusted, visual confirm pending · **✅ Keep (shared)** = real mesh legitimately reused across same-species bosses · **🐉 Wrong creature** = a real but wrong ESO mesh (the skeletal Bone Dragon for the 3 living dragons); correct mesh not file-extractable · **❌ Fix** = wrong mesh, needs correct extraction · **🔲 Placeholder** = humanoid built from player skeleton+armor, no standalone mesh · **🔍 Verify** = needs a human eyeball.

> **On the "Keep" verdict:** these were classified by geometry hashing (proves the mesh is *distinct*,
> not that it's the *right* creature) + a research identity pass (which is known to occasionally
> hallucinate). Only a handful were eyeball-checked by the agent. So **every Keep is "looks like a real
> ESO creature mesh and the mapping says it's this boss — please confirm visually,"** not a guarantee.
>
> **Sanity's Edge note** (the user flagged "Sanity's Edge models don't look right"): the two wrong ones
> are **Exarchanic Yaseyla** + **Archwizard Twelvane** — both 🔲 placeholders (held back), which is why
> they read wrong (a Redguard woman and a Khajiit mage both rendering as the same generic robed stand-in).
> The other two, **Chimera** and **Ansuul** (Gloam Knight), were render-checked and look like a real
> multi-headed beast / a real bladed wraith respectively — committed, pending your final look.

### Hel Ra Citadel (2014)

| Boss | Action | Current model | Real identity | Note |
|---|---|---|---|---|
| Ra Kotu | ✅ Keep (shared) | AirAtronach_Coral_Boss | Air Atronach (boss-tier elemental Daedra) | shares mesh w/ Reef Guardian, Tideborn Taleria |
| Yokeda Rok'dun | 🔲 Placeholder | — | Anka-Ra undead Redguard warrior — a humanoid Redguard m | player skeleton+armor; no single mesh |
| The Warrior | 🔍 Verify | — |  |  |

### Aetherian Archive (2014)

| Boss | Action | Current model | Real identity | Note |
|---|---|---|---|---|
| Lightning Storm Atronach | ✅ Keep (shared) | StormAtronach_A_Basic | Storm Atronach (Elemental Daedra / Storm Daedra / Thund | shares mesh w/ — |
| Foundation Stone Atronach | ✅ Keep | StoneAtronach_B_Boss | Stone Atronach (Daedric elemental construct), boss vari | A Stone Atronach: a large bipedal stone-golem elemental construct with a broad,  |
| Varlariel | ✅ Keep | WispMother_B_Boss | Wispmother (frost-aligned spectral creature; appears as | A Wispmother: a ghostly, feminine creature in the form of a human/elven female s |
| The Mage | 🔲 Placeholder | — | High Elf (Altmer), Female — a Celestial (embodiment of  | player skeleton+armor; no single mesh |

### Sanctum Ophidia (2014)

| Boss | Action | Current model | Real identity | Note |
|---|---|---|---|---|
| Stonebreaker | ✅ Keep | Troll_Craglorn_Boss | Troll (giant armored troll infused with nirncrux) — a C | A large, hulking ape-like troll — ESO trolls have a hunched knuckle-walking buil |
| Ozara | ✅ Keep (shared) | Lamia_A_Boss | Lamia (boss-tier "Lamia Queen" archetype) — semi-aquati | shares mesh w/ — |
| Possessed Mantikora | ✅ Keep (shared) | Mantikora_B_Boss | Mantikora — a large composite creature (four-legged bea | shares mesh w/ — |
| The Serpent | 🔍 Verify | GiantSnake_A_Basic |  |  |

### Maw of Lorkhaj (2016)

| Boss | Action | Current model | Real identity | Note |
|---|---|---|---|---|
| Zhaj'hassa the Forgotten | 🔲 Placeholder | — | Dro-m'Athra (corrupted Khajiit). Khajiit race, male, cl | player skeleton+armor; no single mesh |
| S'kinrai | 🔲 Placeholder | — | Dro-m'Athra (corrupted "Bent Cat" Khajiit spirit) — mal | player skeleton+armor; no single mesh |
| Vashai | 🔲 Placeholder | — | Khajiit Dro-m'Athra ("Bent Cat") — a Khajiit ancestor-s | player skeleton+armor; no single mesh |
| Rakkhat | ✅ Keep | GrievousTwilight_B_Boss | Grievous Twilight (a winged Daedra / corrupted Winged T | A large Grievous Twilight: a winged Daedra with a brutish, masculine humanoid-da |

### Halls of Fabrication (2017)

| Boss | Action | Current model | Real identity | Note |
|---|---|---|---|---|
| Hunter-Killer Fabricants | ✅ Keep (shared) | VerminousFabricant_A_Basic | Verminous Fabricant (biomechanical reptilian construct  | shares mesh w/ — |
| Pinnacle Factotum | ❌ Fix | DwemerCenturion_B_Basic | Factotum — Sotha Sil's purely-mechanical, bipedal human | Search creature mesh filenames containing the "Factotum" species keyword (Clockwork City / |
| Archcustodian | ✅ Keep (shared) | DwarvenSpider_FrostAtronach_Base | Dwarven Spider (giant Dwemer mechanical spider automato | shares mesh w/ — |
| Assembly General | ❌ Fix | ClockWorkImperfect_A_Basic | Dwarven Colossus (Dwemer/Dwarven Automaton — animunculu | Use the Dwarven Colossus creature mesh: DwarvenColossus_Body_A_Basic plus arm meshes Dwarv |
| Reactor, Reclaimer & Reducer | ❌ Fix | ClockWorkTitan_A_Basic | Factotum | These are creature meshes, not player-skeleton humanoids. The correct base is a humanoid F |

### Asylum Sanctorium (2017)

| Boss | Action | Current model | Real identity | Note |
|---|---|---|---|---|
| Saint Olms the Just | ✅ Keep | ClockWorkTitan_A_Basic | Clockwork Titan (mechanical dragon construct). In lore, | A gigantic mechanical dragon/gargoyle Clockwork Titan construct with wings, tail |
| Saint Felms the Bold | ❌ Fix | DwemerCenturion_B_Basic | Factotum — a giant Sotha Sil clockwork/brass humanoid c | Source the real mesh from the ESO Factotum / ClockWork creature model family (keyword or f |
| Saint Llothis the Pious | ❌ Fix | DwemerCenturion_C_Basic | Giant Factotum (Clockwork City automaton) | The correct mesh is the giant Clockwork City Factotum 'CWCfactotem_U_TP' (per ESO Model Vi |

### Cloudrest (2018)

| Boss | Action | Current model | Real identity | Note |
|---|---|---|---|---|
| Shade of Galenwe | 🔲 Placeholder | — | Altmer (High Elf), male — Welkynar Knight (Galenwe), in | player skeleton+armor; no single mesh |
| Shade of Siroria | 🔲 Placeholder | — | Altmer (High Elf) Welkynar Gryphon Knight shade | player skeleton+armor; no single mesh |
| Shade of Relequen | 🔲 Placeholder | — | Altmer (High Elf) — shadow-corrupted clone of Sir Releq | player skeleton+armor; no single mesh |
| Z'Maja | ✅ Keep (shared) | Sload_A_Basic | Sea Sload (a colorful, bioluminescent aquatic variant o | shares mesh w/ — |
| Gryphon (Welkynar Mounts) | ✅ Keep (shared) | Gryphon_A_Boss | Gryphon — a true creature species in ESO (introduced wi | shares mesh w/ — |

### Sunspire (2019)

| Boss | Action | Current model | Real identity | Note |
|---|---|---|---|---|
| Lokkestiiz | 🐉 Wrong creature | BoneDragon_A_Basic | Dragon — frost/storm | **Skeletal bone dragon, not the living dragon.** Living winged mesh not file-extractable. |
| Yolnahkriin | 🐉 Wrong creature | BoneDragon_A_Basic | Dragon — fire | **Skeletal bone dragon.** Same. |
| Nahviintaas | 🐉 Wrong creature | BoneDragon_A_Basic | Dragon — golden king | **Skeletal bone dragon.** Same. |

> 🐉 **Wrong creature (not a skin issue).** The committed dragon GLBs are `BoneDragon_A_Basic` — a real
> but **different** ESO enemy, the undead *skeletal* Bone Dragon (a filled-silhouette render shows
> ribcage + spine + wing *struts with no membrane*; the ZOSFT even names a `u48_bonedragon_bonebreath`
> ability). The **living winged Sunspire dragon mesh is not locatable via file extraction**:
> - ESO creature *bodies* are unnamed in the ZOSFT filename table — verified by dumping all 92,666 names
>   with UESP's EsoExtractData; even the known-good AirAtronach body isn't named there.
> - No winged-dragon-sized mesh (~15k+ verts with membrane) exists under any internal Granny name in the
>   full 6,000-creature roster dump.
> - Confirmed across **three independent methods** (our `scan-mnf`, EsoExtractData's ZOSFT, the roster dump).
>
> GPU capture (RenderDoc / NinjaRipper) was researched and **ruled out**: it's an ESO EULA violation and
> yields an un-rigged, frozen-pose snapshot — worse than file extraction. The per-dragon color tints in
> the viewer are cosmetic only and do **not** fix the wrong-creature problem. **Decision deferred to the
> maintainer:** accept the labeled skeletal stand-in, or swap to a license-clean generic winged dragon.

### Kyne's Aegis (2020)

| Boss | Action | Current model | Real identity | Note |
|---|---|---|---|---|
| Yandir the Butcher | ✅ Keep | Giant_B_Basic | Sea Giant (a distinct species of giant in ESO — silvery | A large armored Sea Giant warrior (~2.4m tall), blue/grey-skinned, clad in heavy |
| Captain Vrol | ✅ Keep (shared) | Giant_B_Basic | Sea Giant (a distinct giant-kin species; NOT a generic  | shares mesh w/ Yandir the Butcher |
| Lord Falgravn | ✅ Keep (shared) | VampireLord_Lurker_Boss | Vampire Lord (species=VampireLord) | shares mesh w/ — |

### Rockgrove (2021)

| Boss | Action | Current model | Real identity | Note |
|---|---|---|---|---|
| Oaxiltso | ✅ Keep | ArgonianBehemoth_A_Red_Basic | Argonian Behemoth (Xal-Krona / "Sacred Behemoth") — a h | A hulking, monstrous Argonian Behemoth — a massive bipedal reptilian creature wi |
| Flame-Herald Bahsei | ✅ Keep | BoneColossus_A_Basic | Argonian (Naga) warrior-mage of the Sul-Xan tribe who t | A large humanoid skeleton / bone giant — the Bone Goliath (Argonian) creature mo |
| Xalvakka | ✅ Keep | Harvester_Monstrous_Boss | Harvester (Dagonic variant) — a four-armed, serpentine- | A large Harvester Daedra: female humanoid torso fused to a long serpentine (snak |

### Dreadsail Reef (2022)

| Boss | Action | Current model | Real identity | Note |
|---|---|---|---|---|
| Lylanar and Turlassil | 🔲 Placeholder | — | Maormer (sea elves), male humanoid NPCs | player skeleton+armor; no single mesh |
| Reef Guardian | ❌ Fix | AirAtronach_Coral_Boss | Coral Golem (Construct/Golem family). A large bipedal h | Look for a creature mesh in the Golem family rather than the Atronach family: filename pat |
| Tideborn Taleria | ✅ Keep | AirAtronach_Coral_Boss | Air Atronach (Daedra) in-fight form; lore identity Maor | A floating, coral- and water-themed Air Atronach: a roughly humanoid elemental t |

### Sanity's Edge (2023)

| Boss | Action | Current model | Real identity | Note |
|---|---|---|---|---|
| Exarchanic Yaseyla | 🔲 Placeholder | — | Humanoid mortal NPC — Redguard female, leader of the Co | player skeleton+armor; no single mesh |
| Archwizard Twelvane | 🔲 Placeholder | — | Khajiit (female), humanoid mage of the Mages Guild / Dy | player skeleton+armor; no single mesh |
| Chimera | ✅ Keep (shared) | Chimera_A_Basic | Chimera (creature species) | shares mesh w/ — |
| Ansuul the Tormentor | ✅ Keep | VaerminaGloamKnight_A_Basic | Gloam Knight | A tall, armored, wraith-like nightmare Daedra in the form of a Gloam Knight. Sig |

### Lucent Citadel (2024)

| Boss | Action | Current model | Real identity | Note |
|---|---|---|---|---|
| Count Ryelaz & Zilyesset | ❌ Fix | GrievousTwilight_B_Boss | A SINGLE encounter entry covering TWO visually distinct | GrievousTwilight_B_Boss is a correct match for Count Ryelaz (Grievous Twilight). Zilyesset |
| Cavot Agnan | 🔲 Placeholder | — | Breton (Man race) — male humanoid necromancer NPC | player skeleton+armor; no single mesh |
| Orphic Shattered Shard | ✅ Keep | ShatteredShard_A_Basic | Shattered Shard — a crystalline shard golem/construct c | A large, hunched, broad-shouldered bipedal crystalline golem/atronach-type const |
| Xoryn | 🔲 Placeholder | — | Dremora (male humanoid Daedra), Shardborn faction, ligh | player skeleton+armor; no single mesh |

### Ossein Cage (2025)

| Boss | Action | Current model | Real identity | Note |
|---|---|---|---|---|
| Shapers of Flesh | ✅ Keep (shared) | Voriplasm_A_Basic | Voriplasm | shares mesh w/ — |
| Jynorah & Skorkhif | 🔲 Placeholder | — | Xivkyn (humanoid Daedra, Dremora/Xivilai hybrid) — Jyno | player skeleton+armor; no single mesh |
| Overfiend Kazpian | ❌ Fix | Daedroth_Armored_Basic | Ruinach (four-armed Daedra of Mehrunes Dagon) | Locate + extract the Ruinach mesh. (Research's `Harbinger_B_Boss` suggestion was render-checked as WRONG — it's a 2-armed Daedra.) |
| Red Witch Gedna Relvel | ❌ Fix | — | Dark Elf (Dunmer) Lich — undead spellcaster | She is a Lich, not a living humanoid, so ESO uses a dedicated standalone creature mesh — N |
| Tortured Amkaos, Kathutet & Ranyu | 🔲 Placeholder | — | Dremora | player skeleton+armor; no single mesh |
| Blood Drinker Thisa | 🔲 Placeholder | — | Vampire Lord (creature) — UESP infobox Race = "Vampire  | player skeleton+armor; no single mesh |
<!-- END PER-BOSS -->

## Extraction spec (run when a full ESO install is available)

**Prereqs**
- Full ESO install with `game/client/game.mnf` (the model archive — the partial install only had
  `depot/eso.mnf`, which is **not** the same archive).
- `oo2core_8_win64.dll` copied next to the extractor binary (for Oodle-compressed entries, U25+).
- Built extractor: `cd tools/eso-model-extractor && cargo build --release` (verified to compile).

**By fix-class**

- **Wrong creature `file_index` (the ❌ Fix creatures)** — for each, find the correct mesh and re-extract:
  ```bash
  # 1. find candidate meshes by name keyword
  eso-model-extractor list <game.mnf> --filter "Factotum" --models-only
  eso-model-extractor list <game.mnf> --filter "DwarvenColossus" --models-only
  eso-model-extractor list <game.mnf> --filter "Ruinach" --models-only   # or reuse Harbinger_B_Boss
  # 2. extract + convert the right file-index
  eso-model-extractor extract <game.mnf> --file-index <fi> --output ./extracted
  eso-model-extractor convert ./extracted/<file>.gr2 --output public/models/bosses/<Name>.glb
  ```
  Then update that boss's `model` + `file_index` in `data/trial-boss-models/trial_boss_complete.json`.
- **Sunspire dragons (texture differentiation)** — keep the shared body GLB; build/apply the three
  distinct dragon materials (frost / fire / gold). This is a DDS-texture task, not a mesh task. The
  texture `file_index` values are already in `trial_boss_complete.json` for the dragon entry.
- **Placeholders (the 16 humanoids)** — out of scope for single-mesh extraction. Track separately; the
  realistic options are an armor-assembly pipeline or a curated representative model per race. Each
  boss's confirmed race/appearance is in the table above (e.g. Xoryn = Dremora male; Jynorah = Xivkyn;
  the Cloudrest Shades = Altmer Welkynar knights).

## Verification (what needs a human — Chrome MCP is unreliable for dark 3D for the agent)

The agent rendered every model to offline PNGs and a single labeled **contact sheet** (delivered
separately, `.scratch/CONTACT-SHEET.png` during the producing session). For the manual pass, eyeball:
- The 10 ❌ Fix rows — confirm they look wrong before spending extraction effort.
- The 2 🔍 Verify rows (The Warrior, The Serpent).
- Any ✅ Keep you're unsure of — the user already flagged Sanity's Edge and Falgravn's phase as
  suspect; those are captured here (Falgravn = the floor-3 winged form; documented, not a bug).

## What's intentionally NOT done here

- No `BossModelViewerPage` / `/boss-models` route (scope = assets only).
- No fight-replay wiring (PR #1165 wired only Taleria; extending the name→model map is a later round).
- No GLBs committed yet — committing a known-wrong or placeholder mesh as a boss's "real" model would
  re-propagate the exact problem this audit exists to surface. Asset commits follow the corrected
  extraction.
