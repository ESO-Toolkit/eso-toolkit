"""Remove screenshot backgrounds while preserving source resolution.

Run this with the same external Hunyuan3D environment as mesh generation:

  python prepare-reference-cutouts.py input.jpg output.png [...]
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image

from hy3dgen.rembg import BackgroundRemover


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "paths",
        nargs="+",
        type=Path,
        help="Alternating input image and output PNG paths",
    )
    args = parser.parse_args()
    if len(args.paths) % 2:
        parser.error("Provide an output path for every input image")
    return args


def main() -> None:
    args = parse_args()
    remover = BackgroundRemover()
    for source, destination in zip(args.paths[::2], args.paths[1::2]):
        destination.parent.mkdir(parents=True, exist_ok=True)
        remover(Image.open(source).convert("RGB")).save(destination)
        print(f"Prepared {destination}")


if __name__ == "__main__":
    main()
