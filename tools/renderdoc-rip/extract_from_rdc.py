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


class MeshData(rd.MeshFormat):
    indexOffset = 0
    name = ""


def unpackData(fmt, data):
    if fmt.Special():
        raise RuntimeError("Packed vertex formats are not supported")
    formatChars = {
        rd.CompType.UInt: "xBHxIxxxL",
        rd.CompType.SInt: "xbhxixxxl",
        rd.CompType.Float: "xxexfxxxd",
    }
    formatChars[rd.CompType.UNorm] = formatChars[rd.CompType.UInt]
    formatChars[rd.CompType.UScaled] = formatChars[rd.CompType.UInt]
    formatChars[rd.CompType.SNorm] = formatChars[rd.CompType.SInt]
    formatChars[rd.CompType.SScaled] = formatChars[rd.CompType.SInt]
    vfmt = str(fmt.compCount) + formatChars[fmt.compType][fmt.compByteWidth]
    value = struct.unpack_from(vfmt, data, 0)
    if fmt.compType == rd.CompType.UNorm:
        divisor = float((2 ** (fmt.compByteWidth * 8)) - 1)
        value = tuple(float(i) / divisor for i in value)
    elif fmt.compType == rd.CompType.SNorm:
        maxNeg = -float(2 ** (fmt.compByteWidth * 8)) / 2
        divisor = float(-(maxNeg - 1))
        value = tuple((float(i) if i == maxNeg else float(i) / divisor) for i in value)
    if fmt.BGRAOrder():
        value = tuple(value[i] for i in [2, 1, 0, 3])
    return value


def getMeshInputs(controller, draw):
    state = controller.GetPipelineState()
    ib = state.GetIBuffer()
    vbs = state.GetVBuffers()
    attrs = state.GetVertexInputs()
    out = []
    for attr in attrs:
        if attr.perInstance:
            continue
        m = MeshData()
        m.indexResourceId = ib.resourceId
        m.indexByteOffset = ib.byteOffset
        m.indexByteStride = ib.byteStride
        m.baseVertex = draw.baseVertex
        m.indexOffset = draw.indexOffset
        m.numIndices = draw.numIndices
        if not (draw.flags & rd.ActionFlags.Indexed):
            m.indexResourceId = rd.ResourceId.Null()
        vb = vbs[attr.vertexBuffer]
        m.vertexByteOffset = attr.byteOffset + vb.byteOffset + draw.vertexOffset * vb.byteStride
        m.format = attr.format
        m.vertexResourceId = vb.resourceId
        m.vertexByteStride = vb.byteStride
        m.name = attr.name
        out.append(m)
    return out


def getIndices(controller, mesh):
    fmtchar = {1: "B", 2: "H", 4: "I"}.get(mesh.indexByteStride, "B")
    if mesh.indexResourceId != rd.ResourceId.Null():
        ibdata = controller.GetBufferData(mesh.indexResourceId, mesh.indexByteOffset, 0)
        offset = mesh.indexOffset * mesh.indexByteStride
        indices = struct.unpack_from(str(mesh.numIndices) + fmtchar, ibdata, offset)
        return [i + mesh.baseVertex for i in indices]
    return list(range(mesh.numIndices))


def readAttr(controller, meshAttr, vertexIndex):
    offset = meshAttr.vertexByteOffset + meshAttr.vertexByteStride * vertexIndex
    data = controller.GetBufferData(meshAttr.vertexResourceId, offset, 0)
    return unpackData(meshAttr.format, data)


def _pick(attrs, *needles):
    for a in attrs:
        n = (a.name or "").lower()
        if any(k in n for k in needles):
            return a
    return None


def get_mesh(controller, draw, use_vsin):
    """Return (positions, uvs, indices) from a draw's VS-INPUT bindings.

    VS-input is the pre-skin (bind/T-pose-ish) mesh — the cleanest static model and
    most robust across RenderDoc versions. For the deformed on-screen pose instead,
    RenderDoc exposes post-VS data via controller.GetPostVSData(0, 0,
    rd.MeshDataStage.VSOut) — wire that if you specifically need the captured pose.
    """
    controller.SetFrameEvent(draw.eventId, True)
    inputs = getMeshInputs(controller, draw)
    if not inputs:
        raise RuntimeError("no vertex inputs on this draw")
    indices = getIndices(controller, inputs[0])
    pos = _pick(inputs, "position", "pos", "sv_position") or inputs[0]
    uv = _pick(inputs, "texcoord", "uv", "tex")
    uniq = sorted(set(i for i in indices if i >= 0))
    remap = {}
    positions, uvs = [], []
    for newi, vi in enumerate(uniq):
        remap[vi] = newi
        p = readAttr(controller, pos, vi)
        positions.append((p[0], p[1], p[2] if len(p) > 2 else 0.0))
        if uv:
            u = readAttr(controller, uv, vi)
            uvs.append((u[0], u[1] if len(u) > 1 else 0.0))
    indices = [remap[i] for i in indices if i in remap]
    return positions, uvs, indices


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
