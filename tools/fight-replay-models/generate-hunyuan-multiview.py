#!/usr/bin/env python
"""Generate an untextured boss mesh from consistent character reference views.

This script is intentionally separate from the web app's dependencies. Run it from
an environment containing Tencent's Hunyuan3D-2 ``hy3dgen`` package.
"""

from __future__ import annotations

import argparse
import time
from pathlib import Path

import torch
from PIL import Image

from hy3dgen.rembg import BackgroundRemover
from hy3dgen.shapegen import Hunyuan3DDiTFlowMatchingPipeline


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--front", required=True, type=Path)
    parser.add_argument("--back", required=True, type=Path)
    # Side views are optional. Reference pages routinely publish a clean front and back but no true
    # left/right profile, and a real two-view reconstruction beats one padded with a synthesized
    # profile. Supply them when genuine plates exist.
    parser.add_argument("--left", type=Path)
    parser.add_argument("--right", type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--prepared-dir", type=Path)
    parser.add_argument("--model", default="tencent/Hunyuan3D-2mv")
    parser.add_argument("--subfolder", default="hunyuan3d-dit-v2-mv")
    parser.add_argument("--variant", default="fp16")
    parser.add_argument("--steps", type=int, default=50)
    parser.add_argument("--octree-resolution", type=int, default=380)
    parser.add_argument("--num-chunks", type=int, default=20_000)
    parser.add_argument("--seed", type=int, default=12_345)
    return parser.parse_args()


def prepare_references(args: argparse.Namespace) -> dict[str, Image.Image]:
    paths = {"front": args.front, "back": args.back}
    if args.left is not None:
        paths["left"] = args.left
    if args.right is not None:
        paths["right"] = args.right

    remover = BackgroundRemover()
    prepared: dict[str, Image.Image] = {}
    if args.prepared_dir is not None:
        args.prepared_dir.mkdir(parents=True, exist_ok=True)

    for view, path in paths.items():
        image = Image.open(path).convert("RGB")
        image = remover(image)
        prepared[view] = image
        if args.prepared_dir is not None:
            image.save(args.prepared_dir / f"{view}.png")

    return prepared


def main() -> None:
    args = parse_args()
    if not torch.cuda.is_available():
        raise RuntimeError("A CUDA GPU is required for Hunyuan3D-2 generation")

    print(f"GPU: {torch.cuda.get_device_name(0)}")
    images = prepare_references(args)
    pipeline = Hunyuan3DDiTFlowMatchingPipeline.from_pretrained(
        args.model,
        subfolder=args.subfolder,
        variant=args.variant,
    )

    started_at = time.time()
    mesh = pipeline(
        image=images,
        num_inference_steps=args.steps,
        octree_resolution=args.octree_resolution,
        num_chunks=args.num_chunks,
        generator=torch.manual_seed(args.seed),
        output_type="trimesh",
    )[0]

    args.output.parent.mkdir(parents=True, exist_ok=True)
    mesh.export(args.output)
    print(
        f"Saved {args.output} with {len(mesh.faces):,} faces "
        f"in {time.time() - started_at:.1f}s"
    )


if __name__ == "__main__":
    main()
