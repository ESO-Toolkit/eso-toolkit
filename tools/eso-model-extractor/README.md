# ESO Model Extractor

A Rust CLI tool for extracting 3D models from Elder Scrolls Online's game archives.

Reads ESO's `.mnf` manifest files, extracts `.gr2` (Granny 3D) model files from `.dat` archives, and can convert them to glTF format for use in Three.js, Blender, and other 3D applications.

## Prerequisites

- **Rust 1.75+** with the MSVC toolchain (`stable-x86_64-pc-windows-msvc`)
- **ESO installation** with game data files (`game.mnf`, `eso.mnf`, `*.dat`)

## Building

```bash
cd tools/eso-model-extractor
cargo build --release
```

The binary will be at `target/release/eso-model-extractor.exe`.

## Usage

### List files in an archive

```bash
# List all files in the game archive
eso-model-extractor list "C:\Program Files\ESO\game\client\game.mnf"

# List only 3D model files
eso-model-extractor list "C:\Program Files\ESO\game\client\game.mnf" --models-only

# Filter by name
eso-model-extractor list "C:\Program Files\ESO\game\client\game.mnf" --filter "boss"
```

### Extract files

```bash
# Extract all GR2 model files
eso-model-extractor extract "C:\Program Files\ESO\game\client\game.mnf" \
  --output ./extracted --models-only

# Extract a specific file by index
eso-model-extractor extract "C:\Program Files\ESO\game\client\game.mnf" \
  --file-index 12345 --output ./extracted

# Extract from a specific DAT archive
eso-model-extractor extract "C:\Program Files\ESO\game\client\game.mnf" \
  --archive 5 --output ./extracted
```

### Convert GR2 to glTF

```bash
# Convert a single GR2 file
eso-model-extractor convert ./extracted/model.gr2 --output ./model.gltf

# Batch convert all GR2 files in a directory
eso-model-extractor batch-convert ./extracted/Granny/ --output ./gltf/ --recursive
```

### Inspect a GR2 file

```bash
# Show file structure
eso-model-extractor inspect ./model.gr2

# Include hex dump of sections
eso-model-extractor inspect ./model.gr2 --hex-dump
```

### Scan a directory

```bash
# Quick scan by file extension
eso-model-extractor scan ./extracted/

# Deep scan using magic bytes
eso-model-extractor scan ./extracted/ --deep
```

## ESO File Format Overview

### MNF (Manifest) Files
- Top-level index into ESO's asset system
- Contains file table mapping indices to entries in `.dat` files
- Includes ZOSFT (ZOS File Table) for filename resolution
- Located at: `<ESO>/game/client/game.mnf`, `<ESO>/game/client/eso.mnf`

### DAT (Data) Files
- Actual compressed asset data (e.g., `game0000.dat`, `game0001.dat`)
- Each can be several GB
- Compression: zlib (type 1), Snappy (type 8), Oodle (type 9)

### GR2 (Granny 3D) Files
- 3D model format by RAD Game Tools
- Contains meshes, skeletons, animations, materials
- Magic bytes: `B8 67 B0 CA` (little-endian)

## Known Limitations

1. **Oodle compression**: Files compressed with Oodle (introduced in ESO Update 25+) require `oo2core_8_win64.dll` from the ESO installation directory. Copy it next to the executable to enable support.

2. **GR2 section compression**: Some GR2 files use internal compression (Bitknit) that requires the Granny SDK for full decompression. The tool will still extract raw `.gr2` files which can be converted using Noesis or Norbyte's lslib.

3. **Mesh extraction is heuristic**: Without the full Granny type system, mesh geometry is found via pattern matching. Not all meshes may be detected. For guaranteed extraction, use the raw `.gr2` files with Noesis.

4. **Snappy compression**: Not yet supported. Add the `snap` crate if needed.

## Recommended Workflow

For the most reliable results:

1. **Extract** raw `.gr2` files from the MNF/DAT archives using this tool
2. **Convert** using [Noesis](https://richwhitehouse.com/index.php?content=inc_projects.php&showproject=91) with its GR2 plugin, or [lslib](https://github.com/Norbyte/lslib) for batch conversion
3. **Import** the resulting FBX/glTF files into your target application

This tool's built-in glTF converter works for uncompressed GR2 sections and provides a starting point, but Noesis handles the full range of GR2 variants.

## Credits

- Format research by [UESP](https://en.uesp.net/wiki/ESO_Mod:EsoExtractData) (Dave Humphrey)
- Reference implementation: [uesp-esoapps](https://github.com/uesp/uesp-esoapps) (MIT license)
- GR2 format insights from [Norbyte/lslib](https://github.com/Norbyte/lslib) (MIT license)

## License

MIT — see the project root LICENSE file.
