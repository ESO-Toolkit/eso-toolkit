# Handoff prompt — ESO fight-replay NPC models

Paste everything below the line into a fresh session.

---

Continue the ESO fight-replay NPC model work on branch `t3code/complete-kyne-aegis-models`
(worktree `C:/Users/brayd/.t3/worktrees/ESO-LOG-AG/t3code-1e91418c`, PR #1516).

**Do not merge anything to main — the owner's standing instruction is that nothing merges until the
whole job is done.** Keep committing and pushing to the branch.

## Where it stands

**27 assets shipped, 19 of 47 distinct trial bosses covered.** Kyne's Aegis and Asylum Sanctorium
are complete trials. Also shipped: six lesser enemies at a trash budget, four extracted-game assets,
and the first two Route B assets.

Everything is green: 670 fight-replay tests, `npm run validate`, production build.

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

1. **~10 bosses are buildable now** — see `remaining-trial-bosses.md`. Best: **Rakkhat + Count
   Ryelaz from one build** (`GrievousTwilight_B_Boss`, 34 shells, 18.7% unobserved, plates already
   harvested), then Ozara (`117-lamia-red`, 979/973px, certain), Ra Kotu (`157-air-atronach-boss`,
   own plates — **not** a Taleria alias), Lightning Storm Atronach, Archcustodian, Overfiend Kazpian
   (`87-ruinach-boss`, 1011/1000px).
2. **Skeleton / "Boneman" is the single highest-leverage build on the board** — the largest creature
   archetype in measured dungeon demand (62 names, 822 appearances), and it *does* have reference:
   `creatures-125/126/127-boneman-*` plus three bone-goliath posts. It was missed because the sweep
   searched "skeleton".
3. **Two encounters may cost zero bytes**: Pinnacle Factotum and The Refabrication Committee reuse
   the shipped Saint Llothis Factotum body (verified by eye — Llothis genuinely *is* a clockwork
   Factotum). **Blocked only on verifying the ESO Logs actor strings** (`Reducer`/`Reclaimer`/
   `Reactor`) against a real Halls of Fabrication log. Do not ship guessed aliases.
4. **Xalvakka** needs a tail-coil deformer or a Route C rebuild — its plates are excellent and its
   identity certain, but the mesh's bind pose leaves the tail dead straight, so normalised it is a
   "pencil" (0.594 x 0.377 x 2.0) with the torso crushed into the top quarter.
5. **Assembly General / Dwarven Colossus** needs geometry cleanup (weld across shells, drop interior
   faces), NOT more cameras — 4-view was tested and moved it only 62.0% -> 53.4%.

## Hard-won rules — violating these has cost real time

- **Judge a texture by its FLAT UV ATLAS, not by renders.** An early pass shipped smeared textures
  that looked fine rendered.
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
