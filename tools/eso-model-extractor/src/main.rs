#![allow(dead_code)]
//! ESO Model Extractor — Extract 3D models from ESO's MNF/DAT archives.
//!
//! This CLI tool reads ESO's game archives, identifies GR2 (Granny 3D) model
//! files, and can export them as raw .gr2 files or convert them to glTF format
//! for use in Three.js, Blender, and other 3D applications.
//!
//! # Usage
//!
//! ```bash
//! # List all files in an MNF archive
//! eso-model-extractor list /path/to/game.mnf
//!
//! # List only GR2 (3D model) files
//! eso-model-extractor list /path/to/game.mnf --models-only
//!
//! # Extract all GR2 files to a directory
//! eso-model-extractor extract /path/to/game.mnf --output ./extracted --models-only
//!
//! # Extract and convert a specific file to glTF
//! eso-model-extractor convert /path/to/model.gr2 --output ./model.gltf
//!
//! # Scan a directory of extracted .gr2 files and convert all to glTF
//! eso-model-extractor batch-convert ./extracted/Granny/ --output ./gltf/
//!
//! # Inspect a single GR2 file's structure
//! eso-model-extractor inspect /path/to/model.gr2
//! ```

mod dat;
mod error;
mod gltf_export;
mod gr2;
mod granny;
mod mnf;
mod oodle;
mod zosft;

use clap::{Parser, Subcommand};
use indicatif::{ProgressBar, ProgressStyle};
use std::fs;
use std::path::{Path, PathBuf};

use error::Result;

#[derive(Parser)]
#[command(
    name = "eso-model-extractor",
    about = "Extract 3D models from ESO's MNF/DAT game archives",
    version,
    long_about = "Reads ESO's .mnf manifest files, extracts .gr2 (Granny 3D) model files \
                   from .dat archives, and optionally converts them to glTF format.\n\n\
                   Based on format research by UESP (https://en.uesp.net/wiki/ESO_Mod:EsoExtractData)."
)]
struct Cli {
    #[command(subcommand)]
    command: Commands,

    /// Enable verbose logging
    #[arg(short, long, global = true)]
    verbose: bool,
}

#[derive(Subcommand)]
enum Commands {
    /// List files contained in an MNF archive
    List {
        /// Path to the .mnf file (e.g., game.mnf or eso.mnf)
        mnf_path: PathBuf,

        /// Only show GR2 (3D model) files
        #[arg(long)]
        models_only: bool,

        /// Filter filenames containing this string (case-insensitive)
        #[arg(short, long)]
        filter: Option<String>,

        /// Maximum number of entries to display
        #[arg(short = 'n', long)]
        limit: Option<usize>,
    },

    /// Extract files from an MNF/DAT archive
    Extract {
        /// Path to the .mnf file
        mnf_path: PathBuf,

        /// Output directory for extracted files
        #[arg(short, long, default_value = "./extracted")]
        output: PathBuf,

        /// Only extract GR2 (3D model) files
        #[arg(long)]
        models_only: bool,

        /// Filter by filename substring (case-insensitive)
        #[arg(short, long)]
        filter: Option<String>,

        /// Extract a specific file by index
        #[arg(long)]
        file_index: Option<u32>,

        /// Only extract from a specific DAT archive index
        #[arg(long)]
        archive: Option<u8>,
    },

    /// Convert a .gr2 file to glTF format
    Convert {
        /// Path to the .gr2 file
        gr2_path: PathBuf,

        /// Output path for the .gltf file
        #[arg(short, long)]
        output: Option<PathBuf>,
    },

    /// Batch convert all .gr2 files in a directory to glTF
    BatchConvert {
        /// Directory containing .gr2 files
        input_dir: PathBuf,

        /// Output directory for .gltf files
        #[arg(short, long, default_value = "./gltf")]
        output: PathBuf,

        /// Process subdirectories recursively
        #[arg(short, long)]
        recursive: bool,
    },

    /// Inspect a .gr2 file's internal structure
    Inspect {
        /// Path to the .gr2 file
        gr2_path: PathBuf,

        /// Show full hex dump of sections
        #[arg(long)]
        hex_dump: bool,
    },

    /// Scan extracted files and identify all 3D models
    Scan {
        /// Directory to scan
        dir: PathBuf,

        /// Check file contents (slower but more accurate than extension check)
        #[arg(long)]
        deep: bool,
    },

    /// Scan an MNF archive for GR2 model files by reading magic bytes
    ScanMnf {
        /// Path to the .mnf file
        mnf_path: PathBuf,

        /// Only scan entries from a specific DAT archive index
        #[arg(long)]
        archive: Option<u8>,

        /// Maximum number of entries to scan (default: all)
        #[arg(short = 'n', long)]
        limit: Option<usize>,

        /// Skip the first N unique file entries before scanning
        #[arg(long, default_value = "0")]
        skip: usize,

        /// Only scan entries that have no ZOSFT filename
        #[arg(long)]
        unnamed_only: bool,

        /// Extract found GR2 files to this directory (for later analysis)
        #[arg(long)]
        extract_gr2: Option<PathBuf>,

        /// Search GR2 model/mesh names for this pattern (case-insensitive regex)
        #[arg(long)]
        grep: Option<String>,

        /// List all GR2 model names (one per line, fast — skips Granny SDK)
        #[arg(long)]
        list_names: bool,
    },

    /// Read a GR2 file using Granny2 SDK and display model info
    ReadGr2 {
        /// Path to the .gr2 file
        gr2_path: PathBuf,

        /// Convert to glTF (output path, or auto-generates from input name)
        #[arg(long)]
        convert: Option<Option<PathBuf>>,
    },
}

fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();

    // Initialize logging
    let filter = if cli.verbose {
        "eso_model_extractor=debug"
    } else {
        "eso_model_extractor=info"
    };

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new(filter)),
        )
        .with_target(false)
        .init();

    match cli.command {
        Commands::List {
            mnf_path,
            models_only,
            filter,
            limit,
        } => cmd_list(&mnf_path, models_only, filter.as_deref(), limit)?,

        Commands::Extract {
            mnf_path,
            output,
            models_only,
            filter,
            file_index,
            archive,
        } => cmd_extract(
            &mnf_path,
            &output,
            models_only,
            filter.as_deref(),
            file_index,
            archive,
        )?,

        Commands::Convert { gr2_path, output } => {
            cmd_convert(&gr2_path, output.as_deref())?
        }

        Commands::BatchConvert {
            input_dir,
            output,
            recursive,
        } => cmd_batch_convert(&input_dir, &output, recursive)?,

        Commands::Inspect { gr2_path, hex_dump } => cmd_inspect(&gr2_path, hex_dump)?,

        Commands::Scan { dir, deep } => cmd_scan(&dir, deep)?,

        Commands::ScanMnf {
            mnf_path,
            archive,
            limit,
            skip,
            unnamed_only,
            extract_gr2,
            grep,
            list_names,
        } => cmd_scan_mnf(&mnf_path, archive, limit, skip, unnamed_only, extract_gr2.as_deref(), grep.as_deref(), list_names)?,


        Commands::ReadGr2 { gr2_path, convert } => cmd_read_gr2(&gr2_path, convert)?,
    }

    Ok(())
}

// --- Command implementations ---

fn cmd_list(
    mnf_path: &Path,
    models_only: bool,
    filter: Option<&str>,
    limit: Option<usize>,
) -> Result<()> {
    let mnf = mnf::MnfFile::parse(mnf_path)?;
    println!("{}", mnf.summary());
    println!();

    let entries: Vec<_> = mnf
        .entries
        .iter()
        .filter(|e| {
            if models_only {
                e.filename
                    .as_ref()
                    .is_some_and(|f| f.to_lowercase().ends_with(".gr2"))
            } else {
                true
            }
        })
        .filter(|e| {
            if let Some(f) = filter {
                e.filename
                    .as_ref()
                    .is_some_and(|name| name.to_lowercase().contains(&f.to_lowercase()))
            } else {
                true
            }
        })
        .collect();

    let display_count = limit.unwrap_or(entries.len()).min(entries.len());

    println!(
        "Showing {}/{} entries{}:",
        display_count,
        entries.len(),
        if models_only { " (GR2 models only)" } else { "" }
    );
    println!(
        "{:<10} {:<6} {:<12} {:<12} {:<5} {}",
        "Index", "DAT#", "Compressed", "Size", "Comp", "Filename"
    );
    println!("{}", "-".repeat(80));

    for entry in entries.iter().take(display_count) {
        let comp_type = match entry.compression_type {
            0 => "none",
            1 => "zlib",
            2 => "snap",
            _ => "???",
        };

        println!(
            "{:<10} {:<6} {:<12} {:<12} {:<5} {}",
            entry.file_index,
            entry.archive_index,
            entry.compressed_size,
            entry.uncompressed_size,
            comp_type,
            entry.filename.as_deref().unwrap_or("(unnamed)")
        );
    }

    if display_count < entries.len() {
        println!("... and {} more entries", entries.len() - display_count);
    }

    Ok(())
}

fn cmd_extract(
    mnf_path: &Path,
    output_dir: &Path,
    models_only: bool,
    filter: Option<&str>,
    file_index: Option<u32>,
    archive: Option<u8>,
) -> Result<()> {
    let mut mnf = mnf::MnfFile::parse(mnf_path)?;

    // Initialize Oodle decompressor for v3 data
    let oodle = match oodle::OodleDecompressor::new() {
        Ok(o) => {
            tracing::info!("Oodle decompressor loaded");
            Some(o)
        }
        Err(e) => {
            tracing::warn!("Oodle not available: {} — Oodle-compressed files will be skipped", e);
            None
        }
    };

    // Try to load ZOSFT to get filenames
    if let Some(zosft_entry) = mnf::find_zosft_entry(&mnf) {
        let zosft_entry = zosft_entry.clone();
        let dat_path = mnf.dat_path(zosft_entry.archive_index);
        if dat_path.exists() {
            match dat::extract_entry(&dat_path, &zosft_entry, oodle.as_ref()) {
                Ok(zosft_data) => {
                    match zosft::parse_zosft(&zosft_data) {
                        Ok(names) => {
                            let count = names.len();
                            mnf.apply_zosft(&names);
                            println!("  ZOSFT: loaded {} filenames", count);
                        }
                        Err(e) => {
                            tracing::warn!("Failed to parse ZOSFT: {}", e);
                        }
                    }
                }
                Err(e) => {
                    tracing::warn!("Failed to extract ZOSFT entry: {}", e);
                }
            }
        }
    }

    // Track whether we have ZOSFT names
    let has_filenames = mnf.entries.iter().any(|e| e.filename.is_some());

    println!("{}", mnf.summary());

    // Filter entries
    let entries: Vec<_> = mnf
        .entries
        .iter()
        .filter(|e| {
            if let Some(idx) = file_index {
                return e.file_index == idx;
            }
            if let Some(arch) = archive {
                if e.archive_index != arch {
                    return false;
                }
            }
            if models_only {
                if let Some(ref f) = e.filename {
                    return f.to_lowercase().ends_with(".gr2");
                }
                // No filename — only include unnamed files if we have no ZOSFT at all
                return !has_filenames;
            }
            if let Some(f) = filter {
                return e
                    .filename
                    .as_ref()
                    .is_some_and(|name| name.to_lowercase().contains(&f.to_lowercase()));
            }
            true
        })
        .collect();

    println!("\nExtracting {} files to {}...", entries.len(), output_dir.display());
    fs::create_dir_all(output_dir)?;

    let pb = ProgressBar::new(entries.len() as u64);
    pb.set_style(
        ProgressStyle::default_bar()
            .template("{spinner:.green} [{elapsed_precise}] [{bar:40.cyan/blue}] {pos}/{len} ({eta})")
            .unwrap()
            .progress_chars("#>-"),
    );

    let mut extracted = 0u32;
    let mut skipped = 0u32;
    let mut errors = 0u32;

    for entry in &entries {
        pb.inc(1);

        let dat_path = mnf.dat_path(entry.archive_index);
        if !dat_path.exists() {
            tracing::debug!("DAT file not found: {}", dat_path.display());
            skipped += 1;
            continue;
        }

        match dat::extract_entry(&dat_path, entry, oodle.as_ref()) {
            Ok(data) => {
                // Determine output filename
                let file_type = dat::identify_file_type(&data);

                // If models_only and no filename, skip non-GR2 files
                if models_only && entry.filename.is_none() && file_type != "gr2" {
                    skipped += 1;
                    continue;
                }

                let out_path = if let Some(ref name) = entry.filename {
                    // Use original path structure
                    let clean_name = name.trim_start_matches('/');
                    output_dir.join(clean_name)
                } else {
                    // Use archive/index/entry_index naming to avoid overwrites
                    output_dir.join(format!(
                        "{:03}/{:07}_{:07}.{}",
                        entry.archive_index, entry.file_index, entry.index, file_type
                    ))
                };

                if let Some(parent) = out_path.parent() {
                    fs::create_dir_all(parent)?;
                }

                fs::write(&out_path, &data)?;
                extracted += 1;

                tracing::debug!("Extracted: {}", out_path.display());
            }
            Err(e) => {
                tracing::debug!(
                    "Failed to extract file {}: {}",
                    entry.file_index,
                    e
                );
                errors += 1;
            }
        }
    }

    pb.finish_with_message("done");
    println!(
        "\nComplete: {} extracted, {} skipped, {} errors",
        extracted, skipped, errors
    );

    Ok(())
}

fn cmd_convert(gr2_path: &Path, output: Option<&Path>) -> Result<()> {
    let data = fs::read(gr2_path)?;
    let gr2 = gr2::Gr2File::parse(&data)?;

    println!("GR2 file: {}", gr2_path.display());
    if let Some(ref name) = gr2.original_filename {
        println!("  Original: {}", name);
    }
    println!("  Format: v{}", gr2.header.format);
    println!("  Sections: {}", gr2.header.section_count);
    println!("  Meshes found: {}", gr2.meshes.len());

    if gr2.meshes.is_empty() {
        println!("\n⚠ No mesh data could be extracted from this GR2 file.");
        println!("  This file may use compressed sections (Oodle/Bitknit) that");
        println!("  require the Granny SDK for decompression.");
        println!("  The raw .gr2 file can be converted using Noesis or lslib.");
        return Ok(());
    }

    let output_path = output.map(|p| p.to_path_buf()).unwrap_or_else(|| {
        gr2_path.with_extension("gltf")
    });

    gltf_export::export_gltf(&gr2, &output_path)?;
    println!(
        "\n✓ Exported {} mesh(es) to {}",
        gr2.meshes.len(),
        output_path.display()
    );

    Ok(())
}

fn cmd_batch_convert(input_dir: &Path, output_dir: &Path, recursive: bool) -> Result<()> {
    let gr2_files = find_gr2_files(input_dir, recursive)?;

    if gr2_files.is_empty() {
        println!("No .gr2 files found in {}", input_dir.display());
        return Ok(());
    }

    println!(
        "Found {} .gr2 files in {}",
        gr2_files.len(),
        input_dir.display()
    );
    fs::create_dir_all(output_dir)?;

    let pb = ProgressBar::new(gr2_files.len() as u64);
    pb.set_style(
        ProgressStyle::default_bar()
            .template("{spinner:.green} [{elapsed_precise}] [{bar:40.cyan/blue}] {pos}/{len} ({eta})")
            .unwrap()
            .progress_chars("#>-"),
    );

    let mut converted = 0u32;
    let mut no_mesh = 0u32;
    let mut errors = 0u32;

    for gr2_path in &gr2_files {
        pb.inc(1);

        let rel_path = gr2_path
            .strip_prefix(input_dir)
            .unwrap_or(gr2_path.as_path());
        let output_path = output_dir.join(rel_path).with_extension("gltf");

        match fs::read(gr2_path) {
            Ok(data) => match gr2::Gr2File::parse(&data) {
                Ok(gr2) => {
                    if gr2.meshes.is_empty() {
                        no_mesh += 1;
                        tracing::debug!("No mesh data: {}", gr2_path.display());
                    } else {
                        match gltf_export::export_gltf(&gr2, &output_path) {
                            Ok(()) => converted += 1,
                            Err(e) => {
                                tracing::debug!(
                                    "Export failed for {}: {}",
                                    gr2_path.display(),
                                    e
                                );
                                errors += 1;
                            }
                        }
                    }
                }
                Err(e) => {
                    tracing::debug!("Parse failed for {}: {}", gr2_path.display(), e);
                    errors += 1;
                }
            },
            Err(e) => {
                tracing::debug!("Read failed for {}: {}", gr2_path.display(), e);
                errors += 1;
            }
        }
    }

    pb.finish_with_message("done");
    println!(
        "\nComplete: {} converted, {} no mesh data, {} errors",
        converted, no_mesh, errors
    );

    Ok(())
}

fn cmd_read_gr2(gr2_path: &Path, convert: Option<Option<PathBuf>>) -> anyhow::Result<()> {
    let data = fs::read(gr2_path)?;
    println!("File: {} ({} bytes)", gr2_path.display(), data.len());
    println!(
        "Magic: 0x{:02X}{:02X}{:02X}{:02X}",
        data[3], data[2], data[1], data[0]
    );

    println!("Loading Granny2 SDK...");
    let sdk = granny::Granny2Sdk::new()?;
    println!("SDK loaded, reading file...");

    let want_convert = convert.is_some();
    let info = if want_convert {
        sdk.read_meshes(&data)?
    } else {
        sdk.read_file_info(&data)?
    };
    println!("File parsed successfully!");

    println!(
        "From filename: {}",
        info.from_filename.as_deref().unwrap_or("(none)")
    );
    println!("Models: {}", info.models.len());
    for (i, m) in info.models.iter().enumerate() {
        println!("  [{}] {} ({} meshes)", i, m.name, m.mesh_count);
    }
    println!("Meshes: {}", info.meshes.len());
    for (i, m) in info.meshes.iter().enumerate() {
        println!(
            "  [{}] {} (verts={}, tris={}, bones={})",
            i, m.name, m.vertex_count, m.triangle_count, m.bone_binding_count
        );
    }
    if let Some(skel) = &info.skeleton {
        println!("Skeleton: {} ({} bones)", skel.name, skel.bone_count);
        for bone in &skel.bones {
            println!(
                "  {} (parent={})",
                bone.name, bone.parent_index
            );
        }
    }
    println!("Animations: {}", info.animations.len());
    for a in &info.animations {
        println!("  {}", a);
    }
    println!("Textures: {}", info.textures.len());
    for (i, t) in info.textures.iter().enumerate() {
        println!("  [{}] {}", i, t.name);
    }
    println!("Materials: {}", info.materials.len());
    for (i, m) in info.materials.iter().enumerate() {
        println!("  [{}] {} ({} maps)", i, m.name, m.maps.len());
        for map in &m.maps {
            println!("    usage={} material={}", map.usage, map.material_name.as_deref().unwrap_or("(none)"));
        }
    }

    if want_convert {
        let output_path = match convert.unwrap() {
            Some(p) => p,
            None => gr2_path.with_extension("glb"),
        };
        let is_glb = output_path.extension().map_or(false, |e| e.eq_ignore_ascii_case("glb"));
        if is_glb {
            gltf_export::export_sdk_glb(&info, &output_path)?;
        } else {
            gltf_export::export_sdk_gltf(&info, &output_path)?;
        }
        println!(
            "\n✓ Exported {} mesh(es) to {}",
            info.meshes.len(),
            output_path.display()
        );
    }

    Ok(())
}

fn cmd_inspect(gr2_path: &Path, hex_dump: bool) -> Result<()> {
    let data = fs::read(gr2_path)?;
    let gr2 = gr2::Gr2File::parse(&data)?;

    println!("═══ GR2 File Inspection ═══");
    println!("File: {}", gr2_path.display());
    println!("Size: {} bytes", data.len());
    println!();

    // Header
    println!("── Header ──");
    println!(
        "  Magic: {:02X} {:02X} {:02X} {:02X} ({})",
        gr2.header.magic[0],
        gr2.header.magic[1],
        gr2.header.magic[2],
        gr2.header.magic[3],
        if gr2.header.is_big_endian {
            "big-endian"
        } else {
            "little-endian"
        }
    );
    println!("  Format version: {}", gr2.header.format);
    println!("  Header size: {} bytes", gr2.header.header_size);
    println!("  Total size: {} bytes", gr2.header.total_size);
    println!("  CRC32: 0x{:08X}", gr2.header.crc32);
    println!("  Pointer size: {}-bit", gr2.header.pointer_size);
    println!("  Sections: {}", gr2.header.section_count);
    println!(
        "  Root type: section {} offset {}",
        gr2.header.root_type_section, gr2.header.root_type_offset
    );
    println!(
        "  Root object: section {} offset {}",
        gr2.header.root_object_section, gr2.header.root_object_offset
    );
    println!("  Tag: 0x{:08X}", gr2.header.tag);

    if let Some(ref name) = gr2.original_filename {
        println!("  Original filename: {}", name);
    }

    // Sections
    println!();
    println!("── Sections ──");
    for (i, section) in gr2.sections.iter().enumerate() {
        let comp_name = match section.compression {
            0 => "none",
            1 => "Oodle0",
            2 => "Oodle1",
            3 => "Bitknit1",
            4 => "Bitknit2",
            _ => "unknown",
        };

        println!(
            "  Section {}: offset={}, size={}, decompressed={}, compression={} ({})",
            i,
            section.data_offset,
            section.data_size,
            section.decompressed_size,
            section.compression,
            comp_name
        );
        println!(
            "    alignment={}, fixups={}, mixed_marshal={}",
            section.alignment, section.pointer_fixup_count, section.mixed_marshal_count
        );
        println!(
            "    data loaded: {} bytes",
            section.data.len()
        );

        if hex_dump && !section.data.is_empty() {
            println!("    Hex dump (first 128 bytes):");
            let dump_len = section.data.len().min(128);
            for row in section.data[..dump_len].chunks(16) {
                let hex: Vec<String> = row.iter().map(|b| format!("{:02X}", b)).collect();
                let ascii: String = row
                    .iter()
                    .map(|&b| {
                        if b.is_ascii_graphic() || b == b' ' {
                            b as char
                        } else {
                            '.'
                        }
                    })
                    .collect();
                println!("      {:48} {}", hex.join(" "), ascii);
            }
        }
    }

    // Geometry
    println!();
    println!("── Geometry ──");
    if gr2.meshes.is_empty() {
        println!("  No mesh data extracted (may need Granny SDK decompression)");
    } else {
        for (i, mesh) in gr2.meshes.iter().enumerate() {
            println!(
                "  Mesh {}: \"{}\" — {} vertices, {} triangles",
                i,
                mesh.name,
                mesh.vertices.len(),
                mesh.triangles.len()
            );

            if !mesh.vertices.is_empty() {
                let v = &mesh.vertices[0];
                println!(
                    "    First vertex: pos=[{:.3}, {:.3}, {:.3}] normal=[{:.3}, {:.3}, {:.3}]",
                    v.position[0],
                    v.position[1],
                    v.position[2],
                    v.normal[0],
                    v.normal[1],
                    v.normal[2]
                );
            }
        }
    }

    if !gr2.skeletons.is_empty() {
        println!();
        println!("── Skeletons ──");
        for (i, skel) in gr2.skeletons.iter().enumerate() {
            println!(
                "  Skeleton {}: \"{}\" — {} bones",
                i,
                skel.name,
                skel.bones.len()
            );
        }
    }

    Ok(())
}

/// Extract meaningful ASCII strings from GR2 file raw bytes.
/// Filters out common Granny internal type names, keeping model/mesh names.
fn extract_gr2_strings(data: &[u8]) -> Vec<String> {
    // Known Granny internal strings to skip
    const SKIP_PREFIXES: &[&str] = &[
        "Granny", "granny", "PWNT", "PNT3", "PWN3", "PNGT", "PNTG",
        "float", "int", "uint", "bool", "string", "real",
        "GR2", "Type", "Section", "Pointer", "Reference",
        "Transform", "Extended", "Variant", "Array",
        "Standard",
    ];

    let mut strings = Vec::new();
    let mut current_str = Vec::new();

    for &b in data {
        if b >= 0x20 && b < 0x7F {
            current_str.push(b);
        } else {
            if current_str.len() >= 6 {
                if let Ok(s) = std::str::from_utf8(&current_str) {
                    let skip = SKIP_PREFIXES.iter().any(|p| s.starts_with(p))
                        || s.chars().all(|c| c.is_ascii_digit() || c == '.' || c == '-' || c == ' ');
                    if !skip {
                        strings.push(s.to_string());
                    }
                }
            }
            current_str.clear();
        }
    }
    // Check last string
    if current_str.len() >= 6 {
        if let Ok(s) = std::str::from_utf8(&current_str) {
            let skip = SKIP_PREFIXES.iter().any(|p| s.starts_with(p))
                || s.chars().all(|c| c.is_ascii_digit() || c == '.' || c == '-' || c == ' ');
            if !skip {
                strings.push(s.to_string());
            }
        }
    }

    // Deduplicate and take first few meaningful ones
    strings.dedup();
    strings.truncate(5);
    strings
}

fn cmd_scan_mnf(mnf_path: &Path, archive_filter: Option<u8>, limit: Option<usize>, skip: usize, unnamed_only: bool, extract_gr2_dir: Option<&Path>, grep_pattern: Option<&str>, list_names: bool) -> Result<()> {
    let grep_re = grep_pattern.map(|p| {
        regex::RegexBuilder::new(p)
            .case_insensitive(true)
            .build()
            .unwrap_or_else(|e| {
                eprintln!("Invalid regex '{}': {}", p, e);
                std::process::exit(1);
            })
    });

    let mut mnf = mnf::MnfFile::parse(mnf_path)?;

    let oodle = match oodle::OodleDecompressor::new() {
        Ok(o) => Some(o),
        Err(e) => {
            tracing::warn!("Oodle not available: {}", e);
            None
        }
    };

    // Load ZOSFT for filenames
    if let Some(zosft_entry) = mnf::find_zosft_entry(&mnf) {
        let zosft_entry = zosft_entry.clone();
        let dat_path = mnf.dat_path(zosft_entry.archive_index);
        if dat_path.exists() {
            if let Ok(zosft_data) = dat::extract_entry(&dat_path, &zosft_entry, oodle.as_ref()) {
                if let Ok(names) = zosft::parse_zosft(&zosft_data) {
                    mnf.apply_zosft(&names);
                }
            }
        }
    }

    println!("{}", mnf.summary());

    // Deduplicate: take first entry per file_index (data entry, skip metadata)
    let mut seen_file_indices = std::collections::HashSet::new();
    let entries: Vec<_> = mnf
        .entries
        .iter()
        .filter(|e| {
            if let Some(arch) = archive_filter {
                if e.archive_index != arch {
                    return false;
                }
            }
            if unnamed_only && e.filename.is_some() {
                return false;
            }
            // Only take first entry per file_index
            seen_file_indices.insert(e.file_index)
        })
        .collect();

    let after_skip = if skip < entries.len() { &entries[skip..] } else { &[] as &[_] };
    let scan_count = limit.unwrap_or(after_skip.len()).min(after_skip.len());
    println!("\nScanning {} unique file entries (skip={}, unnamed_only={})...", scan_count, skip, unnamed_only);

    let pb = ProgressBar::new(scan_count as u64);
    pb.set_style(
        ProgressStyle::default_bar()
            .template("{spinner:.green} [{elapsed_precise}] [{bar:40.cyan/blue}] {pos}/{len} ({eta})")
            .unwrap()
            .progress_chars("#>-"),
    );

    let mut gr2_found: Vec<(u32, u8, String, usize, Option<granny::Gr2Info>, Vec<String>)> = Vec::new();
    let mut type_counts: std::collections::HashMap<String, u32> = std::collections::HashMap::new();
    let mut errors = 0u32;
    let mut seh_crashes = 0u32;

    if let Some(dir) = extract_gr2_dir {
        std::fs::create_dir_all(dir)?;
        println!("Will extract GR2 files to {}", dir.display());
    }

    let granny_sdk = if list_names {
        None // Skip Granny SDK in list-names mode (faster, extract strings from bytes)
    } else {
        match granny::Granny2Sdk::new() {
            Ok(sdk) => {
                println!("Granny2 SDK loaded (SEH-protected)");
                Some(sdk)
            }
            Err(e) => {
                println!("Granny2 SDK not available ({}) — size-only scan", e);
                None
            }
        }
    };

    for entry in after_skip.iter().take(scan_count) {
        pb.inc(1);
        let dat_path = mnf.dat_path(entry.archive_index);
        if !dat_path.exists() {
            continue;
        }

        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            match dat::extract_entry(&dat_path, entry, oodle.as_ref()) {
                Ok(data) => {
                    let file_type = dat::identify_file_type(&data);
                    if file_type == "gr2" {
                        let name = entry.filename.clone().unwrap_or_else(|| {
                            format!("unnamed:{:03}/{}", entry.archive_index, entry.file_index)
                        });

                        // List-names mode: extract strings from raw bytes, no SDK needed
                        if list_names {
                            let strings = extract_gr2_strings(&data);
                            if !strings.is_empty() {
                                return (Some(file_type.to_string()), Some((entry.file_index, entry.archive_index, name, data.len(), None, strings)));
                            }
                            return (Some(file_type.to_string()), None);
                        }

                        // If grep is active, use Granny SDK to parse the file,
                        // then search all names (model, mesh, animation, skeleton, bone names)
                        if let Some(ref re) = grep_re {
                            // Try Granny SDK first for parsed names
                            let gr2_info = granny_sdk.as_ref().and_then(|sdk| {
                                sdk.read_file_info(&data).ok().or_else(|| {
                                    // Full traversal crashed — try skeleton-only
                                    sdk.read_skeleton_only(&data).ok().map(|(skeleton, mc, meshc, ac)| {
                                        granny::Gr2Info {
                                            from_filename: None,
                                            models: (0..mc).map(|_| granny::ModelInfo { name: "?".into(), mesh_count: 0 }).collect(),
                                            meshes: (0..meshc).map(|_| granny::MeshInfo {
                                                name: "?".into(), vertex_count: 0, triangle_count: 0,
                                                bone_binding_count: 0, vertices: Vec::new(), indices: Vec::new(),
                                            }).collect(),
                                            animations: (0..ac).map(|_| "?".into()).collect(),
                                            skeleton,
                                            textures: Vec::new(),
                                            materials: Vec::new(),
                                        }
                                    })
                                })
                            });

                            // Search all Granny SDK names for the pattern
                            let matched_strings = if let Some(ref info) = gr2_info {
                                info.all_names().into_iter()
                                    .filter(|n| *n != "?" && *n != "(null)" && re.is_match(n))
                                    .map(|s| s.to_string())
                                    .collect::<Vec<_>>()
                            } else {
                                Vec::new()
                            };

                            if matched_strings.is_empty() {
                                return (Some(file_type.to_string()), None);
                            }

                            // Optionally save matching GR2 to disk
                            if let Some(dir) = extract_gr2_dir {
                                let out_path = dir.join(format!("a{:03}_fi{}.gr2", entry.archive_index, entry.file_index));
                                let _ = std::fs::write(&out_path, &data);
                            }

                            return (Some(file_type.to_string()), Some((entry.file_index, entry.archive_index, name, data.len(), gr2_info, matched_strings)));
                        }

                        // Non-grep mode: extract as before
                        // Optionally save GR2 to disk
                        if let Some(dir) = extract_gr2_dir {
                            let out_path = dir.join(format!("a{:03}_fi{}.gr2", entry.archive_index, entry.file_index));
                            let _ = std::fs::write(&out_path, &data);
                        }
                        // Try Granny SDK for mesh info (SEH-protected)
                        // Fallback chain: full info → skeleton-only + counts → counts-only
                        let gr2_info = granny_sdk.as_ref().and_then(|sdk| {
                            match sdk.read_file_info(&data) {
                                Ok(info) => Some(info),
                                Err(_) => {
                                    // Full traversal crashed — try skeleton-only (fewer pointers)
                                    match sdk.read_skeleton_only(&data) {
                                        Ok((skeleton, mc, meshc, ac)) => {
                                            Some(granny::Gr2Info {
                                                from_filename: None,
                                                models: (0..mc).map(|_| granny::ModelInfo { name: "?".into(), mesh_count: 0 }).collect(),
                                                meshes: (0..meshc).map(|_| granny::MeshInfo {
                                                    name: "?".into(), vertex_count: 0, triangle_count: 0,
                                                    bone_binding_count: 0, vertices: Vec::new(), indices: Vec::new(),
                                                }).collect(),
                                                animations: (0..ac).map(|_| "?".into()).collect(),
                                                skeleton,
                                                textures: Vec::new(),
                                                materials: Vec::new(),
                                            })
                                        }
                                        Err(_) => {
                                            // Skeleton also crashed — fall back to counts-only
                                            sdk.read_file_counts(&data).ok().map(|(mc, meshc, ac)| {
                                                granny::Gr2Info {
                                                    from_filename: None,
                                                    models: (0..mc).map(|_| granny::ModelInfo { name: "?".into(), mesh_count: 0 }).collect(),
                                                    meshes: (0..meshc).map(|_| granny::MeshInfo {
                                                        name: "?".into(), vertex_count: 0, triangle_count: 0,
                                                        bone_binding_count: 0, vertices: Vec::new(), indices: Vec::new(),
                                                    }).collect(),
                                                    animations: (0..ac).map(|_| "?".into()).collect(),
                                                    skeleton: None,
                                                    textures: Vec::new(),
                                                    materials: Vec::new(),
                                                }
                                            })
                                        }
                                    }
                                }
                            }
                        });
                        return (Some(file_type.to_string()), Some((entry.file_index, entry.archive_index, name, data.len(), gr2_info, Vec::new())));
                    }
                    (Some(file_type.to_string()), None)
                }
                Err(_) => (None, None),
            }
        }));

        match result {
            Ok((Some(ft), gr2)) => {
                *type_counts.entry(ft).or_insert(0) += 1;
                if let Some(info) = gr2 {
                    // List-names mode: print one line per GR2 with extracted strings
                    if list_names {
                        pb.suspend(|| {
                            println!("a{:03}/fi{}\t{}KB\t{}", info.1, info.0, info.3 / 1024, info.5.join(" | "));
                        });
                        gr2_found.push(info);
                    }
                    // When grep is active, byte search already filtered in the closure
                    else if grep_re.is_some() && !info.5.is_empty() {
                        pb.suspend(|| {
                            let detail = if let Some(ref gi) = info.4 {
                                let model_names: Vec<_> = gi.models.iter().map(|m| m.name.as_str()).collect();
                                let total_verts: usize = gi.meshes.iter().map(|m| m.vertex_count).sum();
                                let total_tris: usize = gi.meshes.iter().map(|m| m.triangle_count).sum();
                                let skel_str = match &gi.skeleton {
                                    Some(skel) => {
                                        let bone_names: Vec<_> = skel.bones.iter()
                                            .take(5)
                                            .map(|b| b.name.as_str())
                                            .collect();
                                        format!(" | skel=\"{}\" bones({})={:?}", skel.name, skel.bone_count, bone_names)
                                    }
                                    None => String::new(),
                                };
                                format!("models={:?} meshes={} verts={} tris={}{}", model_names, gi.meshes.len(), total_verts, total_tris, skel_str)
                            } else {
                                "Granny SDK failed".into()
                            };
                            println!("  MATCH [a{:03} fi={}] {} ({} KB) | {} | matched={:?}",
                                info.1, info.0, info.2, info.3 / 1024, detail, info.5);
                        });
                        gr2_found.push(info);
                    } else {
                        gr2_found.push(info);
                    }
                }
            }
            Ok((None, _)) => {
                errors += 1;
            }
            Err(_) => {
                errors += 1;
            }
        }
    }

    pb.finish_with_message("done");

    // Count SEH crashes (GR2 found but no Granny info when SDK was available)
    if granny_sdk.is_some() {
        seh_crashes = gr2_found.iter().filter(|(_, _, _, _, info, _)| info.is_none()).count() as u32;
    }

    let with_meshes: Vec<_> = gr2_found
        .iter()
        .filter(|(_, _, _, _, info, _)| info.as_ref().map_or(false, |i| !i.meshes.is_empty()))
        .collect();

    println!("\n── Scan Results ──");
    println!("  Scanned: {}", scan_count);
    println!("  Errors: {}", errors);
    println!("  GR2 files found: {}", gr2_found.len());
    if granny_sdk.is_some() {
        println!("  GR2 with meshes: {}", with_meshes.len());
        println!("  GR2 animation-only: {}", gr2_found.len() - with_meshes.len() - seh_crashes as usize);
        println!("  GR2 SEH crashes (corrupt): {}", seh_crashes);
    }

    if !with_meshes.is_empty() {
        println!("\n  GR2 Mesh Models:");
        for (fi, arch, name, size, info, _) in &with_meshes {
            if let Some(info) = info {
                let model_names: Vec<_> = info.models.iter().map(|m| m.name.as_str()).collect();
                let total_verts: usize = info.meshes.iter().map(|m| m.vertex_count).sum();
                let total_tris: usize = info.meshes.iter().map(|m| m.triangle_count).sum();
                let skel_str = match &info.skeleton {
                    Some(skel) => {
                        let bone_names: Vec<_> = skel.bones.iter()
                            .take(5)
                            .map(|b| b.name.as_str())
                            .collect();
                        let suffix = if skel.bone_count > 5 { format!(" +{} more", skel.bone_count - 5) } else { String::new() };
                        format!(" | skel=\"{}\" bones({})={:?}{}", skel.name, skel.bone_count, bone_names, suffix)
                    }
                    None => String::new(),
                };
                println!(
                    "    [a{:03} fi={}] {} ({} KB) | models={:?} | {} meshes | verts={} tris={}{}",
                    arch, fi, name, size / 1024,
                    model_names, info.meshes.len(), total_verts, total_tris, skel_str
                );
            }
        }
    }

    if !gr2_found.is_empty() {
        // Show largest GR2 files (sorted by size)
        let mut gr2_by_size = gr2_found.clone();
        gr2_by_size.sort_by(|a, b| b.3.cmp(&a.3));

        println!("\n  Largest GR2 files:");
        for (fi, arch, name, size, info, _) in gr2_by_size.iter().take(20) {
            let detail = match info {
                Some(i) => {
                    let skel_str = match &i.skeleton {
                        Some(skel) => {
                            let bone_names: Vec<_> = skel.bones.iter()
                                .take(3)
                                .map(|b| b.name.as_str())
                                .collect();
                            format!(" skel=\"{}\" bones({})={:?}", skel.name, skel.bone_count, bone_names)
                        }
                        None => String::new(),
                    };
                    format!("meshes={} anims={}{}", i.meshes.len(), i.animations.len(), skel_str)
                }
                None => "SEH crash".to_string(),
            };
            println!("    [a{:03} fi={}] {} ({} KB) | {}", arch, fi, name, size / 1024, detail);
        }
    }

    println!("\n  File type distribution:");
    let mut types: Vec<_> = type_counts.iter().collect();
    types.sort_by(|a, b| b.1.cmp(a.1));
    for (ext, count) in types {
        println!("    .{}: {}", ext, count);
    }

    Ok(())
}

fn cmd_scan(dir: &Path, deep: bool) -> Result<()> {
    println!("Scanning {} for 3D model files...", dir.display());

    let mut gr2_by_ext = 0u32;
    let mut gr2_by_magic = 0u32;
    let mut other_types: std::collections::HashMap<String, u32> = std::collections::HashMap::new();
    let mut total_files = 0u32;

    scan_directory(dir, deep, &mut |path, is_gr2_ext, file_type| {
        total_files += 1;

        if is_gr2_ext {
            gr2_by_ext += 1;
        }

        if file_type == "gr2" && !is_gr2_ext {
            gr2_by_magic += 1;
            println!("  [GR2 by magic] {}", path.display());
        }

        *other_types.entry(file_type.to_string()).or_insert(0) += 1;
    })?;

    println!("\n── Scan Results ──");
    println!("  Total files: {}", total_files);
    println!("  GR2 by extension: {}", gr2_by_ext);
    if deep {
        println!("  GR2 by magic bytes: {}", gr2_by_magic);
    }
    println!("\n  File types:");
    let mut types: Vec<_> = other_types.iter().collect();
    types.sort_by(|a, b| b.1.cmp(a.1));
    for (ext, count) in types {
        println!("    .{}: {}", ext, count);
    }

    Ok(())
}

// --- Helpers ---

fn find_gr2_files(dir: &Path, recursive: bool) -> Result<Vec<PathBuf>> {
    let mut results = Vec::new();

    if !dir.is_dir() {
        return Err(error::ExtractError::FileNotFound(format!(
            "Not a directory: {}",
            dir.display()
        )));
    }

    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();

        if path.is_file() {
            if let Some(ext) = path.extension() {
                if ext.to_string_lossy().to_lowercase() == "gr2" {
                    results.push(path);
                }
            }
        } else if path.is_dir() && recursive {
            results.extend(find_gr2_files(&path, true)?);
        }
    }

    Ok(results)
}

fn scan_directory(
    dir: &Path,
    deep: bool,
    callback: &mut dyn FnMut(&Path, bool, &str),
) -> Result<()> {
    if !dir.is_dir() {
        return Ok(());
    }

    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();

        if path.is_file() {
            let is_gr2_ext = path
                .extension()
                .is_some_and(|ext| ext.to_string_lossy().to_lowercase() == "gr2");

            let file_type = if deep {
                // Read first bytes to check magic
                let mut buf = [0u8; 16];
                if let Ok(mut f) = fs::File::open(&path) {
                    use std::io::Read;
                    let _ = f.read(&mut buf);
                }
                dat::identify_file_type(&buf).to_string()
            } else {
                path.extension()
                    .map(|e| e.to_string_lossy().to_lowercase())
                    .unwrap_or_else(|| "bin".into())
                    .to_string()
            };

            callback(&path, is_gr2_ext, &file_type);
        } else if path.is_dir() {
            scan_directory(&path, deep, callback)?;
        }
    }

    Ok(())
}
