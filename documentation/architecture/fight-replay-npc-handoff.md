# Handoff prompt — ESO fight-replay NPC models

Paste everything below the line into a fresh session.

---

Continue the ESO fight-replay NPC model work on branch `t3code/complete-kyne-aegis-models`
(worktree `C:/Users/brayd/.t3/worktrees/ESO-LOG-AG/t3code-1e91418c`, PR #1516).

**Do not merge anything to main — the owner's standing instruction is that nothing merges until the
whole job is done.** Keep committing and pushing to the branch.

## Where it stands

**30 assets shipped, 22 of 47 distinct trial bosses covered.** **Four complete trials**: Kyne's
Aegis, Asylum Sanctorium, **Aetherian Archive** and **Sanctum Ophidia**. Rockgrove is complete except
Flame-Herald Bahsei. Also shipped: six lesser enemies at a trash budget, four extracted-game assets,
and three Route B assets.

Everything is green: 670 fight-replay tests, `npm run validate`.

### Added 2026-09-08

- **Lightning Storm Atronach** (Route B) — completes Aetherian Archive.
- **Ozara** (Route C) — completes Sanctum Ophidia.
- **Xalvakka** (Route C) — Rockgrove now needs only Bahsei.

Four things that change the plan, each recorded in the manifest and queue log:

1. **Rakkhat and Count Ryelaz are blocked, not "the best build on the board".** All eight plates in
   `7-dread-grievous-twilight` are pushed-in detail crops with no full-body front and no orthographic
   back. The measured "front 672 px / back 699 px" that ranked them first is real but measures a
   *cropped* subject, because the bbox script measures the visible blob. See rule 8 below.
2. **The tail-coil deformer is cancelled.** It existed to rescue `Harvester_Monstrous_Boss`
   (Xalvakka) and, after this session's diagnosis, `Lamia_A_Boss` (Ozara). Both shipped as Route C
   reconstructions instead. **Reconstruction sidesteps a bind pose; deformation tries to correct
   one.** A minute of GPU beat an open-ended piece of tooling.
3. **Check the extracted supply before assigning Route C.** The Lightning Storm Atronach was filed
   as Route C and is actually Route B — `StormAtronach_A_Basic` is in the extract, so the
   96-floating-shell problem that would defeat reconstruction never arose.
4. **Overfiend Kazpian is downgraded to uncertain.** `87-ruinach-boss` has a clean full-body pair,
   but the page contradicts itself — its body calls Ruinachs four-armed while every plate shows a
   two-armed horned brute on mesh `Harbinger_B_Boss` — and never names Kazpian.

## Read these first — they carry the real state

- `documentation/architecture/fight-replay-npc-asset-manifest.md` — shipped inventory, budgets,
  per-trial coverage, licensing posture
- `documentation/architecture/fight-replay-npc-pipeline-runbook.md` — operational rules
- `documentation/architecture/fight-replay-npc-gpu-queue-log.md` — per-job records
- `B:/CodexScratch/eso-fight-replay-3d/remaining-trial-bosses.md` — **all 30 then-missing bosses
  with a route, evidence and confidence each; this is the worklist**
- `B:/CodexScratch/eso-fight-replay-3d/extracted-mesh-inventory.md`
- `B:/CodexScratch/eso-fight-replay-3d/mini-boss-and-trash-report.md`
- `B:/CodexScratch/eso-fight-replay-3d/dungeon-demand-report.md` and
  `dungeon-enemy-frequency.md` — the dungeon surface
- `B:/CodexScratch/eso-fight-replay-3d/alternate-sources-report.md` — **§1 and §2 are technique, not
  history: body-text matching and the Flickr full-resolution trick**

## The four build routes

- **A — real game texture.** An extracted mesh already carrying ESO's own diffuse on ESO's own UVs.
  No plates, no projection, no GPU. Shipped: Stonebreaker, Possessed Mantikora, Foundation Stone
  Atronach, Cloudrest Gryphon.
- **B — extracted mesh + projected plates.** Geometry is exact and free; only colour is projected.
  **Uses no GPU at all.** Shipped: Oaxiltso, Tideborn Taleria. This is the unlock for the extracted
  supply and the route most worth pushing.
- **C — full screenshot pipeline.** Reconstruct from two plates, then project. What the first 11 used.
- **D — renderer/registry work.** Aliases and per-instance tint.

## Next work, in leverage order

1. **Remaining buildable bosses, re-ranked after this session** — see `remaining-trial-bosses.md`,
   whose ranking now carries a correction banner. **Open the plate set before ranking anything.**
   - ~~**Ra Kotu**~~ — **BUILT AND REJECTED 2026-09-08.** Reference is certain and the front/back
     pair is clean, but the reconstruction produced a confetti atlas (38.8% blind, 44.4% fill) and
     was rejected on it, *after* the renders had already looked fine. He is **camera-limited, not
     interior-limited** — four cameras take blind 40.1% -> 18.8%, the largest gain measured on this
     project — so **one profile capture unlocks him**. Also settled: he cannot ride Taleria's mesh.
   - **Archcustodian** (`129-dwarven-spider`, body names him, 11 plates). Wide low subject; the
     front/back pairing still needs an eyeball.
   - **Chimera** (`149-chimera-white` / `150-chimera-red`, 13 plates) — half of Sanity's Edge boss 2,
     independently buildable. Resolve white vs red against in-game footage first.
   - **Overfiend Kazpian** — downgraded, see above. Do not build it without a picture of Kazpian.
   - **Rakkhat / Count Ryelaz / Baron Rize** — blocked on plate framing, not geometry.
2. **Skeleton / "Boneman" is the single highest-leverage build on the board** — the largest creature
   archetype in measured dungeon demand (62 names, 822 appearances), and it *does* have reference:
   `creatures-125/126/127-boneman-*` plus three bone-goliath posts. It was missed because the sweep
   searched "skeleton".
3. **Two encounters may cost zero bytes — now the single best-value item left**: Pinnacle Factotum
   and The Refabrication Committee reuse the shipped Saint Llothis Factotum body (verified by eye —
   Llothis genuinely *is* a clockwork Factotum). **Blocked only on verifying the ESO Logs actor
   strings** (`Reducer`/`Reclaimer`/`Reactor`) against a real Halls of Fabrication log. Do not ship
   guessed aliases.
4. ~~**Xalvakka** needs a tail-coil deformer or a Route C rebuild.~~ **Done 2026-09-08** — Route C.
   The deformer is cancelled; see the state section above.
5. **Assembly General / Dwarven Colossus** needs geometry cleanup (weld across shells, drop interior
   faces), NOT more cameras — 4-view was tested and moved it only 62.0% -> 53.4%.

## Hard-won rules — violating these has cost real time

- **Judge a texture by its FLAT UV ATLAS, not by renders.** An early pass shipped smeared textures
  that looked fine rendered.
- **Verify plate FRAMING, not just orientation.** A whole gallery can be detail crops, and the
  measured subject height will not tell you — it measures the visible blob, so a tight crop scores
  like a large subject. This cost the top-ranked build on the board (Rakkhat). Open the plates.
- **When an extracted mesh is unusable for its POSE rather than its topology, reconstruct.** Do not
  write a deformer. Two bosses were blocked on straight-tail bind poses and both took about a minute
  of GPU each to solve the other way.
- **Place a region box by colouring three adjacent bands at once**, not by nudging one box and
  re-rendering. One membership render then says which band holds the face. On a small-headed subject
  a box claiming horns *and* face looks, at contact-sheet scale, like a box claiming horns only.
- **`register-npc-plates.py` has no `--head-v-min` override.** When the shoulder detector is wrong
  (it returned 0.9378 on the Storm Atronach's crown and 0.6249 on Ozara's hips), `--region head`
  silently matches the wrong band and reports a healthy error for it. Adding that flag is the only
  reason the Storm Atronach has no head plate.
- **Verify region-box placement with a membership render BEFORE spending GPU time.** This has caught
  a face-outside-the-box error on **four consecutive builds**, each invisible to region texels,
  coverage and PSNR.
- **A good width-error metric is NOT evidence of correct registration.** Three times the closeup with
  the *lowest* error was the wrong plate. Judge by feature doubling in an overlay.
- **Verify plate orientation by eye.** Gallery display order differs from alphabetical URL order, and
  at least one gallery (Yaghra) does not follow the `view-01`-is-front convention at all.
- **Shell count does NOT predict chart count.** Measured: 46 shells -> 1,748 charts; 22 -> 314;
  8 -> 399. Do not rank candidates on it. **Blind area ("neither camera") is the number that
  actually predicts failure** — the rejected Dwarven Colossus was 62%; shipped assets are 5-31%.
- **Never synthesise a missing view.** Invented detail is rejected on principle.
- **Do not substitute a lookalike mesh.** A Half-Giant stand-in on Captain Vrol's body was built,
  documented and then reverted: the catalog's own rule is that a wrong body misleads more than an
  abstract capsule, and nobody reading the replay sees the documentation.
- **`unset NODE_ENV` before `vite build`** — a stale `NODE_ENV=development` silently emits a dev JSX
  runtime and a broken bundle.
- **Leave `tsconfig.json` and `tsconfig/scripts.json` unstaged** — pre-existing CRLF normalization
  debt, can never be made clean.
- **Aliases are stored pre-normalized lowercase**, and `aliasTints` keys are matched **without**
  normalization — a title-case key silently never matches and raises no type error.

## Searching for references — the technique matters more than effort

"No reference exists" has been **wrong three times**, each time because the method changed:

1. Matching post **titles** only hid Lord Falgravn inside a post called "Vampire Lord".
2. Searching the keyword "skeleton" missed the entire archetype, catalogued as **"Boneman"**.
3. Searching **boss** names missed Ozara, Xalvakka and Overfiend Kazpian — searching the extractor's
   **species** names in post **body text** found all three.

So: grep the **body text** of the cached corpus (`B:/CodexScratch/eso-fight-replay-3d/_cache/`, 613
posts, use `_body.py` which isolates the article block — whole-page HTML gives false positives from
the nav sidebar), and search **species and mesh names**, not just boss names.

Also: 2020-era plates are **1366x768, not 800px**. Flickr's larger renditions use a *different
per-size secret*, so swapping `_c`->`_h` returns HTTP 410 and looks like no larger copy exists.
Fetch `https://www.flickr.com/photo.gne?id=<id>` and read the `sizes` block.

## Testing the replay locally

Dev server: `npm run dev` (port 3001, inside the worker's CORS allowlist of 3000-3003 + 5173).

```
http://localhost:3001/report/<CODE>/fight/<N>/replay?npcModels=prototype
```

**`?npcModels=prototype` is required** — models are gated behind it and it is read once at mount.

**Kyne's Aegis test report with all three bosses: `pnLfGNzYbJPVTA89`, Yandir is fight 6.**
Verified working: the GLB fetches 200 and Yandir renders.

Model picker for isolated inspection: `http://localhost:3002/replay-models` (`vite preview`).

**If the arena renders black, build `main` locally first.** Comparing localhost against production
conflates code and host; building main locally isolates it in one step. The troika `importScripts`
blob errors in the console are real but harmless — they are not the cause.

## GPU and RAM safety — a hard rule

Exactly **one** agent may run heavy pipeline work at a time. The RTX 4070 Ti Super is a single-worker
resource, and **so is system RAM**: `onnxruntime` here is CPU-only, so `rembg` is the memory hog, not
the GPU. Measured peaks: **9.3 GB** for a two-plate cut, **13.2 GB** when registering three closeups
in one process (free RAM hit 0.6 GB of 31.7). **Register one closeup per process.** Check free memory
before each stage; log every job; confirm the process exited and VRAM released before the next.

## Blocked on the owner

Needs in-game capture — front + back, same pose, plain backdrop, **>=660px measured subject height**,
no VFX, plus a head closeup:

**Ra Kotu needs only ONE full-body PROFILE** (left or right, same pose, plain backdrop, >=660 px) —
no front, no back, no closeup, because his front/back pair is already good. That is the cheapest ask
on this list and the highest yield: it takes his blind area 40.1% -> 18.8%, straight into the shipped
band. Do this one first.

The rest need the full set — front + back, same pose, plain backdrop, **>=660px measured subject
height**, no VFX, plus a head closeup:

**Xoryn**, the three Sunspire dragons (the extracted mesh is the wrong creature — a skeletal Bone
Dragon), The Yokedas, Lylanar and Turlassil, Exarchanic Yaseyla, Cavot Agnan, the Opulent Trio, the
Hunter Killers, Bahsei's base Naga form, Archwizard Twelvane. Plus **zombie** (real measured dungeon
demand), scamp, banekin, gargoyle.

**Ansuul the Tormentor** and **Hall of Fleshcraft** are a different problem: excellent geometry, zero
colour source of any kind. A screenshot will not fix them — they need a texture capture.

**Treat every one of these as an upper bound, not a fact** (see the search-technique section).

## Two open questions for the owner

- **Jira was never updated.** Not a tooling gap: `.github/workflows/jira-sync.yml` transitions
  tickets automatically, but only from a branch named `ESO-NNN/...`. This branch has no ticket key,
  so the job silently skips. Needs a ticket number.
- **Licensing** — the owner has said this is a free personal project and is not worried. The four
  extracted-game assets ship ESO's own mesh and texture verbatim (a different posture from the
  screenshot reconstructions); it is documented in each README and the manifest. No action needed
  unless he changes his mind.

## Dungeons — scope before building

The replay has **no trial gate**; it opens for any boss fight, so **100% of dungeon NPCs are capsules
today**. ~47-58 dungeons, ~800 distinct enemy names, 6.5-9x the trial lesser-enemy surface. ESO Logs
collapses all dungeons into super-zone 10, so there is no API boss list.

**Do not attempt name-complete coverage.** The measured recommendation is archetype-first: ~20-30
species assets each aliased to 20-50 names. 221 names (14.9%) are ordinary humanoids that should be a
documented permanent "never build", and 53 names are not creatures at all — `Ice Barrier` is the most
frequent name in the entire corpus.
