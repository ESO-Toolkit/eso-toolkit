# RenderDoc capture → GLB, for ESO humanoid bosses & the living dragon

These bosses (Yandir, Xoryn, the Cloudrest Shades, Jynorah & Skorkhif, and the
living Sunspire dragons) are **runtime-assembled** and can't be pulled from the
game files. The only way to get the complete model is to capture it from the GPU
while the game renders it on screen, then extract the geometry from the capture.

**The split:** you do the live capture (interactive, ~2 min). The processing of
the `.rdc` file into a GLB is scripted (`extract_from_rdc.py`).

> ⚠️ **Read the risk first.** Launching RenderDoc into a live ESO client is an ESO
> EULA violation (code injection). ESO has no kernel/client anti-cheat (server-side
> only), detection risk is low, and there's no record of bans for model-ripping —
> but it's **your account**, and it's still against the rules. Your call. Use
> RenderDoc (a legitimate debugger), not NinjaRipper. The captured mesh is in its
> on-screen pose and **un-rigged** (fine for a static display model).

## Part 1 — you do this (the live capture)

1. **Install RenderDoc** (free, renderdoc.org) — v1.x.
2. In RenderDoc → **Launch Application** tab:
   - Executable Path → ESO's `eso64.exe`
     (`B:\SteamLibrary\steamapps\common\Zenimax Online\The Elder Scrolls Online\game\client\eso64.exe`).
   - Working Directory → that same `client` folder.
   - Leave capture options default. Click **Launch**.
3. ESO starts with a RenderDoc overlay (top-left text). Log in, get to the boss.
4. **Frame the boss** clearly and large on screen. Tips that make extraction far
   easier:
   - Get it as close/centered as you can; minimise other characters in frame.
   - A quiet moment (few particle effects, boss not mid-cast) → fewer junk draws.
   - Pause/slow moment if possible.
5. Press **`F12`** (or `PrtScrn`) to capture the frame. The overlay confirms a
   capture was taken.
6. You can take several (different angles/poses). Close ESO.
7. RenderDoc shows the captures — **Save** each to a `.rdc` file
   (e.g. `yandir_01.rdc`). Hand those over / drop them in `tools/renderdoc-rip/captures/`.

## Part 2 — scripted extraction (run by the agent / you)

```bash
# RenderDoc ships a python that has the renderdoc module, OR use renderdoccmd.
# List the draw calls so we can find the boss's draws:
python tools/renderdoc-rip/extract_from_rdc.py captures/yandir_01.rdc --list

# Export a specific draw (or auto-pick the biggest skinned mesh) to OBJ+textures:
python tools/renderdoc-rip/extract_from_rdc.py captures/yandir_01.rdc --eid <drawId> --out yandir
```

The script replays the capture headless, decodes the chosen draw's vertex buffer
(positions + UVs + normals), pulls its bound textures, and writes OBJ + PNGs. A
small follow-up step converts OBJ→GLB and drops it into `public/models/bosses/`.

**Identifying the boss's draws** (the one manual-ish bit): the boss is usually one
of the larger skinned draws with many vertices and a humanoid/creature bounding
box. `--list` prints vertex counts + bbox per draw so you can spot it; or `--auto`
picks the biggest skinned draw and you eyeball the result.

## Gotchas (known, from the RenderDoc API docs + community)
- **Pose, not bind:** VS-input gives a T-pose-ish mesh; VS-output gives the
  deformed on-screen pose. The script defaults to VS-output (what you saw on
  screen). Neither carries the skeleton — re-rig later if animation is ever needed.
- **Textures are raw GPU resources** (often BC/DDS) — the script saves them as PNG.
- **UVs** sometimes need a flip; the script has a `--flip-uv` toggle.
- **Whole frame is captured** — isolating one creature is the main effort; capture
  it big and alone to minimise this.
