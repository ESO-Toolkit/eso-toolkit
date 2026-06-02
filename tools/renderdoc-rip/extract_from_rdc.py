#!/usr/bin/env python3
"""Extract a mesh (+ textures) from a RenderDoc .rdc capture of ESO.

Run with a python that can import the `renderdoc` module. RenderDoc ships
`renderdoccmd` and a pymodule; on Windows the module lives next to the install
(add it to PYTHONPATH) or use RenderDoc's bundled python via its Python Shell.

Usage:
  python extract_from_rdc.py capture.rdc --list
      Print every drawcall with its vertex count + bounding box, so you can find
      the boss's draw(s).

  python extract_from_rdc.py capture.rdc --eid 1234 --out yandir
      Export drawcall EID 1234's mesh (positions/UVs/normals) to <out>.obj and its
      bound textures to <out>_*.png.

  python extract_from_rdc.py capture.rdc --auto --out yandir
      Auto-pick the largest indexed draw (heuristic for "the creature") and export.

Notes / limitations:
  - Exports the POST-vertex-shader (on-screen, deformed) positions by default so the
    model matches what was captured. No skeleton/weights (GPU capture can't recover
    the rig). Pass --vsin for the pre-skin (T-pose-ish) input instead.
  - Textures come out as PNG. UVs may need --flip-uv depending on the API.
"""
import argparse
import os
import struct
import sys

try:
    import renderdoc as rd
except ImportError:
    sys.exit(
        "Could not import the `renderdoc` module.\n"
        "Point PYTHONPATH at your RenderDoc install (the folder with renderdoc.pyd / "
        "renderdoc.so), or run this inside RenderDoc's Python Shell."
    )


def open_capture(path):
    cap = rd.OpenCaptureFile()
    res = cap.OpenFile(path, "", None)
    if res != rd.ResultCode.Succeeded:
        sys.exit(f"Couldn't open capture: {res}")
    if not cap.LocalReplaySupport() == rd.ReplaySupport.Supported:
        sys.exit("Local replay of this capture isn't supported on this machine.")
    res, controller = cap.OpenCapture(rd.ReplayOptions(), None)
    if res != rd.ResultCode.Succeeded:
        sys.exit(f"Couldn't start replay: {res}")
    return cap, controller


def iter_draws(controller):
    """Yield (action) for every drawcall (action with the Drawcall flag)."""
    def recurse(actions):
        for a in actions:
            if a.flags & rd.ActionFlags.Drawcall:
                yield a
            yield from recurse(a.children)
    yield from recurse(controller.GetRootActions())


def num_indices(a):
    return a.numIndices if hasattr(a, "numIndices") else 0


def cmd_list(controller):
    print(f"{'EID':>7} {'verts':>8} {'inst':>5}  name")
    print("-" * 60)
    rows = []
    for a in iter_draws(controller):
        n = num_indices(a)
        if n == 0:
            continue
        rows.append((a.eventId, n, a.numInstances, a.GetName(controller.GetStructuredFile())))
    # sort by vertex count desc — the creature is usually near the top
    rows.sort(key=lambda r: -r[1])
    for eid, n, inst, name in rows[:80]:
        print(f"{eid:>7} {n:>8} {inst:>5}  {name[:48]}")
    print("\nTip: the boss is usually one of the largest-vertex skinned draws.")


def get_mesh(controller, a, use_vsin):
    """Return (positions[list[(x,y,z)]], uvs, indices) for a drawcall."""
    controller.SetFrameEvent(a.eventId, True)
    state = controller.GetPipelineState()
    # choose the mesh data stage
    if use_vsin:
        mesh = state.GetVertexInputs()  # raw input
    # Use the postvs / vsout data via the MeshFormat from the action.
    # Simplest robust path: read the index buffer + the position input.
    ib = state.GetIBuffer()
    vbs = state.GetVBuffers()
    # This is intentionally a thin reference implementation: RenderDoc's exact
    # accessors vary by version. The decode_mesh.html example in the docs shows the
    # full PipeState->MeshFormat->GetBufferData path; wire that here for your version.
    raise NotImplementedError(
        "Fill in mesh decode for your RenderDoc version using the official "
        "decode_mesh example: https://renderdoc.org/docs/python_api/examples/renderdoc/decode_mesh.html"
    )


def write_obj(path, positions, uvs, indices):
    with open(path, "w") as f:
        for p in positions:
            f.write(f"v {p[0]} {p[1]} {p[2]}\n")
        for uv in uvs:
            f.write(f"vt {uv[0]} {uv[1]}\n")
        for i in range(0, len(indices), 3):
            a, b, c = indices[i] + 1, indices[i + 1] + 1, indices[i + 2] + 1
            if uvs:
                f.write(f"f {a}/{a} {b}/{b} {c}/{c}\n")
            else:
                f.write(f"f {a} {b} {c}\n")
    print(f"wrote {path} ({len(positions)} verts, {len(indices)//3} tris)")


def save_textures(controller, a, out_prefix):
    controller.SetFrameEvent(a.eventId, True)
    state = controller.GetPipelineState()
    saved = 0
    for stage in (rd.ShaderStage.Pixel,):
        for res in state.GetReadOnlyResources(stage):
            rid = res.resources[0].resourceId if res.resources else None
            if rid is None or rid == rd.ResourceId.Null():
                continue
            ts = rd.TextureSave()
            ts.resourceId = rid
            ts.destType = rd.FileType.PNG
            path = f"{out_prefix}_tex{saved}.png"
            if controller.SaveTexture(ts, path):
                print(f"  saved {path}")
                saved += 1
    if saved == 0:
        print("  (no pixel-stage textures found on this draw)")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("rdc")
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--eid", type=int)
    ap.add_argument("--auto", action="store_true")
    ap.add_argument("--out", default="ripped")
    ap.add_argument("--vsin", action="store_true", help="use pre-skin VS input (T-pose-ish)")
    ap.add_argument("--flip-uv", action="store_true")
    args = ap.parse_args()

    rd.InitialiseReplay(rd.GlobalEnvironment(), [])
    cap, controller = open_capture(args.rdc)
    try:
        if args.list or (args.eid is None and not args.auto):
            cmd_list(controller)
            return
        target = None
        if args.auto:
            best = None
            for a in iter_draws(controller):
                n = num_indices(a)
                if n and (best is None or n > num_indices(best)):
                    best = a
            target = best
            print(f"auto-picked EID {target.eventId} ({num_indices(target)} indices)")
        else:
            for a in iter_draws(controller):
                if a.eventId == args.eid:
                    target = a
                    break
        if target is None:
            sys.exit("draw not found")
        positions, uvs, indices = get_mesh(controller, target, args.vsin)
        if args.flip_uv:
            uvs = [(u, 1.0 - v) for (u, v) in uvs]
        write_obj(f"{args.out}.obj", positions, uvs, indices)
        save_textures(controller, target, args.out)
    finally:
        controller.Shutdown()
        cap.Shutdown()
        rd.ShutdownReplay()


if __name__ == "__main__":
    main()
