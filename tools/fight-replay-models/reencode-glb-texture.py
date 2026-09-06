"""Re-encode the base-color texture embedded in a replay GLB, in place.

Only the image bytes change: geometry, UVs, and every accessor are copied verbatim, so this cannot
alter the mesh. Use it to correct an export that wrote the wrong JPEG quality, or to swap a
losslessly-baked atlas into a shipped asset.

Chroma subsampling is disabled by default. These atlases carry identity as flat colour blocks
(armour plate, cloth, fur), and 4:2:0 subsampling smears exactly those boundaries.

    python reencode-glb-texture.py in.glb out.glb --quality 92 [--source atlas.png]
"""

from __future__ import annotations

import argparse
import io
import json
import struct
from pathlib import Path

from PIL import Image

JSON_CHUNK = 0x4E4F534A
BIN_CHUNK = 0x004E4942


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source_glb", type=Path)
    parser.add_argument("destination_glb", type=Path)
    parser.add_argument("--quality", type=int, default=92)
    parser.add_argument(
        "--source",
        type=Path,
        help="Optional lossless image to encode instead of the GLB's current texture. "
        "Prefer this when a PNG master exists: re-encoding an existing JPEG compounds loss.",
    )
    return parser.parse_args()


def read_chunks(data: bytes) -> tuple[dict, bytes]:
    if data[:4] != b"glTF":
        raise ValueError("Not a binary glTF file")
    offset, gltf, binary = 12, None, b""
    while offset < len(data):
        length, kind = struct.unpack("<II", data[offset : offset + 8])
        payload = data[offset + 8 : offset + 8 + length]
        if kind == JSON_CHUNK:
            gltf = json.loads(payload)
        elif kind == BIN_CHUNK:
            binary = payload
        offset += 8 + length
    if gltf is None:
        raise ValueError("glTF JSON chunk missing")
    return gltf, binary


def pad(data: bytes, filler: bytes) -> bytes:
    remainder = len(data) % 4
    return data if remainder == 0 else data + filler * (4 - remainder)


def main() -> None:
    args = parse_args()
    gltf, binary = read_chunks(args.source_glb.read_bytes())

    images = gltf.get("images", [])
    if len(images) != 1:
        raise ValueError(f"Expected exactly one embedded image, found {len(images)}")
    image = images[0]
    if "bufferView" not in image:
        raise ValueError("Image is not embedded in the binary chunk")

    view = gltf["bufferViews"][image["bufferView"]]
    start = view.get("byteOffset", 0)
    end = start + view["byteLength"]

    if args.source is not None:
        picture = Image.open(args.source).convert("RGB")
    else:
        picture = Image.open(io.BytesIO(binary[start:end])).convert("RGB")

    encoded = io.BytesIO()
    picture.save(encoded, "JPEG", quality=args.quality, subsampling=0, optimize=True)
    replacement = encoded.getvalue()

    # Rebuild the binary chunk around the new image, then shift every later view by the delta.
    rebuilt = binary[:start] + replacement + binary[end:]
    delta = len(replacement) - view["byteLength"]
    view["byteLength"] = len(replacement)
    for other in gltf["bufferViews"]:
        if other is not view and other.get("byteOffset", 0) > start:
            other["byteOffset"] = other.get("byteOffset", 0) + delta

    image["mimeType"] = "image/jpeg"
    gltf["buffers"][0]["byteLength"] = len(rebuilt)

    json_chunk = pad(json.dumps(gltf, separators=(",", ":")).encode("utf-8"), b" ")
    bin_chunk = pad(rebuilt, b"\0")
    total = 12 + 8 + len(json_chunk) + 8 + len(bin_chunk)

    out = bytearray()
    out += b"glTF" + struct.pack("<II", 2, total)
    out += struct.pack("<II", len(json_chunk), JSON_CHUNK) + json_chunk
    out += struct.pack("<II", len(bin_chunk), BIN_CHUNK) + bin_chunk

    args.destination_glb.parent.mkdir(parents=True, exist_ok=True)
    args.destination_glb.write_bytes(bytes(out))
    print(
        f"{args.destination_glb.name}: texture {view['byteLength'] - delta:,} -> "
        f"{len(replacement):,} bytes at q{args.quality}; file {len(out):,} bytes"
    )


if __name__ == "__main__":
    main()
