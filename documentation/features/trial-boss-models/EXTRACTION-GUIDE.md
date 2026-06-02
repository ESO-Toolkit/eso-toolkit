# ESO Boss Model Extraction Guide

How to get accurate 3D models for ESO trial bosses. There are **two fundamentally
different paths** depending on the model type — this is the single most important
thing to understand.

| Model type | Path | Risk | Who can run it |
|---|---|---|---|
| **Creatures** (atronachs, dragons*, giants, spiders, daedra, etc.) | **File extraction** — offline, from the game archives | None | Fully scriptable / agent-runnable |
| **Player-character / NPC / armor humanoids** (Yandir, Xoryn, the Cloudrest Shades, Jynorah & Skorkhif, …) | **Live GPU capture** (RenderDoc / NinjaRipper) | EULA violation, your account | Capture is manual (you); processing is scriptable |

\* The Sunspire *living* dragons are the exception among creatures — their winged
mesh is runtime-assembled and only the skeletal Bone Dragon is file-extractable.
See `MODEL-AUDIT-2026-06.md`. They effectively fall in the humanoid (GPU-capture) bucket.

## Why the split exists (the core finding)

ESO assembles humanoid NPCs **at runtime** from a body skeleton + modular armor
parts (helm, pauldrons, chest, gauntlets, girdle, legs, feet). Two structural
blockers make offline scripted assembly impossible:

1. **The part meshes are unnamed.** ESO's ZOSFT filename table only names
   particle-effect (and some creature) `.gr2` files. Every humanoid body/armor
   piece is an **unnamed numeric art-code blob**, scattered across archive folders
   105–117. (Confirmed by dumping all 92,666 ZOSFT names with EsoExtractData, and
   by the esomodelviewer.com owner — the most experienced ESO ripper — in
   [lslib issue #34](https://github.com/Norbyte/lslib/issues/34).)
2. **There is no NPC→equipment manifest in the files.** Nothing tells a script
   *which* armor pieces a given boss wears — that logic lives inside the game
   engine. The datamined item tables expose only 2D UI icons, not 3D mesh codes.

So even the most-motivated practitioner (esomodelviewer.com's owner, years
invested) does **not** script humanoid assembly. It is structural, not a tooling
gap. For humanoids, live GPU capture of the already-assembled creature is the
only practical route.

---

## Path 1 — Creatures (file extraction) ✅ done in this repo

This is what produced the committed creature GLBs. Fully offline, no risk.

**Tools (all already set up locally):**
- `tools/eso-model-extractor` — our Rust CLI (reads MNF/DAT, Oodle-decompresses,
  reads GR2 via the Granny SDK).
- `oo2core_9_win64.dll` (Oodle) + `granny2_x64.dll` next to the binary.
- ImageMagick (`magick`) for DDS→PNG/JPEG.

**Steps** (per creature):
```bash
EXE=tools/eso-model-extractor/target/release/eso-model-extractor.exe
MNF="B:\SteamLibrary\steamapps\common\Zenimax Online\The Elder Scrolls Online\depot\eso.mnf"

# 1. find the mesh's internal name + file index (slow archive scan; already dumped to
#    .scratch/namedump-depot.txt — grep that instead of re-scanning)
$EXE scan-mnf "$MNF" --grep "Lamia"

# 2. extract the GR2 and convert via the Granny SDK path (NOT the built-in `convert`,
#    which rejects ESO's GR2 magic)
$EXE extract "$MNF" --file-index <fi> --output ./out
$EXE read-gr2 ./out/<file>.gr2 --convert public/models/bosses/<Name>.glb
```

**Textures** (diffuse — see also the channel note below):
```bash
$EXE extract "$MNF" --file-index <diffuse_fi> --output ./tex
magick ./tex/<file>.dds -resize '1024x1024>' -quality 90 diffuse.jpg
node .scratch/embed-texture.mjs public/models/bosses/<Name>.glb diffuse.jpg <Name>.glb
```

### ESO DXT5nm texture channel layout (important)

ESO's `_n` (normal) maps pack channels unconventionally:
- **R = emissive mask** (the glow — atronach cracks, Dwemer energy core, etc.)
- **G = normal G**
- **B = ambient occlusion**
- **A = normal R** (reconstruct Z: `nz = sqrt(1 - nx² - ny²)`)

So to get a creature's *glow*, split the normal map's **R** channel into an emissive
map. (Verified: StoneAtronach / DwemerCenturion / Sload have non-empty R; the dragon's
R is empty because its fire/ice is a runtime shader, not baked.) Pure *animated* energy
effects (lightning, fire) are runtime and not in any texture — approximate them with a
viewer tint if needed.

### Archive folder layout
- **Models + skeletons:** folders 105–117
- **Animations:** folders 96–100

---

## Path 2 — Humanoids & living dragons (GPU capture) ⚠️ your call

The model is captured **from the GPU while the game renders it** — which grabs the
fully runtime-assembled creature (body + armor + wings) that doesn't exist as a file.

### Risk (be honest with yourself before doing this)
- **It is an ESO EULA violation** (injects into the client). No ambiguity.
- **Detection risk is low**: ESO has *no kernel-level or client-side anti-cheat*
  (server-side validation only); it doesn't scan for injected processes. A single
  passive frame capture sends nothing unusual.
- **No record of enforcement** for model-ripping — ZeniMax bans target gameplay
  automation (bots), not passive offline ripping.
- **It's your account.** Low ≠ zero. The conservative choice is to skip it.
- **Result is un-rigged** — a frozen on-screen pose with no skeleton. Fine for a
  static display model, not for future animation.

### Tools
- **RenderDoc** (recommended — a legitimate graphics debugger, less provocative
  than a "ripper"). **Has a Python API** + headless replay, so the capture can be
  processed programmatically.
- **NinjaRipper** — works on ESO but is a closed GUI/injector tool with **no CLI or
  API**; fully manual. Use only if RenderDoc captures come out wrong.
- **Noesis + GR2 Reader plugin** — for the *file*-based assembly alternative (open
  GR2s, combine model + skeleton + animation). Manual GUI work.

### RenderDoc workflow (the automatable split)
**You do (manual, ~2 min, the risk step):**
1. Launch ESO *through* RenderDoc (point it at `eso64.exe`).
2. Get the boss framed clearly on screen (a quiet moment / low VFX helps).
3. Press the capture key (default `F12` / `PrtScrn`) → saves a `.rdc` file.
4. Close the game. Hand over the `.rdc`.

**Then scriptable (RenderDoc Python API — can be agent-run on the `.rdc`):**
5. Replay the capture headless, walk the draw calls, identify the boss's draws by
   bounding box / silhouette.
6. Decode the mesh (`MeshOutput` / `GetBufferData`), pull bound textures, export to
   OBJ/GLB. (Community reference: `raw2obj.py`-style scripts.)

### File-based assembly alternative (no live client, but manual)
Per the community workflow: extract candidate parts with EsoExtractData, use
`GR2Renamer` to rename GR2s by internal name, hex-search for `mshBn`-prefixed bone
names to match a model to its skeleton/animations across folders 105–117 / 96–100,
then combine in **Noesis**. This avoids the account risk but is entirely manual GUI
work and the part-matching is hard (unnamed blobs).

---

## Current status (see MODEL-AUDIT-2026-06.md)
- **34 creature meshes** extracted & committed (Path 1).
- **16 humanoid bosses + Yandir/Vrol (Sea Giants) + 3 Sunspire dragons** need Path 2.
- **~23 creatures** have no texture mapping yet (texture-discovery TODO).
