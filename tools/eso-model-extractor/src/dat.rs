//! DAT file reader for ESO archives.
//!
//! DAT files (e.g., game0000.dat, eso0001.dat) contain the actual compressed
//! file data referenced by the MNF manifest. Each DAT file can be several GB.
//!
//! ESO v3 uses two compression layers:
//! - MNF-level: compression_type in the record (0=raw, 1=zlib, 2=snappy)
//! - Data-level: Oodle compression detected by magic bytes (0x8C 0x06 or 0xCC 0x0A)

use flate2::read::ZlibDecoder;
use std::fs::File;
use std::io::{BufReader, Read, Seek, SeekFrom};
use std::path::Path;

use crate::error::{ExtractError, Result};
use crate::mnf::MnfFileEntry;
use crate::oodle::OodleDecompressor;

/// Compression type constants (MNF-level)
const COMPRESS_NONE: u8 = 0;
const COMPRESS_ZLIB: u8 = 1;
const COMPRESS_SNAPPY: u8 = 2;

/// Read and decompress a file entry from a DAT archive.
/// Handles both MNF-level compression and v3 Oodle compression.
pub fn extract_entry(
    dat_path: &Path,
    entry: &MnfFileEntry,
    oodle: Option<&OodleDecompressor>,
) -> Result<Vec<u8>> {
    let file = File::open(dat_path).map_err(|e| {
        ExtractError::FileNotFound(format!("{}: {}", dat_path.display(), e))
    })?;
    let mut reader = BufReader::new(file);

    // Seek to the entry's offset in the DAT file
    reader.seek(SeekFrom::Start(entry.offset))?;

    // Read the compressed data
    let mut raw_data = vec![0u8; entry.compressed_size as usize];
    reader.read_exact(&mut raw_data)?;

    // Step 1: MNF-level decompression
    let mnf_decompressed = decompress(&raw_data, entry.compression_type, entry.uncompressed_size)?;

    // Step 2: Data-level Oodle compression (v3)
    // When compression_type is 0 (raw at MNF level) but compressed_size < uncompressed_size,
    // the data is Oodle-compressed at the data level.
    let needs_oodle = entry.compression_type == 0
        && entry.compressed_size < entry.uncompressed_size
        && entry.uncompressed_size > 0;

    if needs_oodle {
        if let Some(oodle) = oodle {
            // SEH wrapper in oodle.rs catches access violations —
            // safe to call even on non-Oodle data.
            return oodle.decompress(&mnf_decompressed, entry.uncompressed_size as usize);
        }
        tracing::warn!(
            "Entry {}: Oodle-compressed (csz={} < sz={}) but no decompressor",
            entry.index, entry.compressed_size, entry.uncompressed_size
        );
    }

    Ok(mnf_decompressed)
}

/// Decompress data based on the compression type flag.
fn decompress(data: &[u8], compression_type: u8, expected_size: u32) -> Result<Vec<u8>> {
    match compression_type {
        COMPRESS_NONE => Ok(data.to_vec()),

        COMPRESS_ZLIB => {
            let mut decoder = ZlibDecoder::new(data);
            let mut decompressed = Vec::with_capacity(expected_size as usize);
            decoder.read_to_end(&mut decompressed).map_err(|e| {
                ExtractError::DecompressionFailed(format!("zlib: {}", e))
            })?;
            Ok(decompressed)
        }

        COMPRESS_SNAPPY => {
            Err(ExtractError::UnsupportedFormat(
                "Snappy compression not yet supported. Install with: cargo add snap".into(),
            ))
        }

        other => Err(ExtractError::UnsupportedFormat(format!(
            "Unknown compression type: {}",
            other
        ))),
    }
}

/// Check if a DAT file exists and has a valid header.
pub fn validate_dat(path: &Path) -> Result<bool> {
    if !path.exists() {
        return Ok(false);
    }

    let file = File::open(path)?;
    let mut reader = BufReader::new(file);

    // DAT files may have a simple header or be raw data depending on version
    // Try reading first 4 bytes to check for empty files
    let mut buf = [0u8; 4];
    match reader.read_exact(&mut buf) {
        Ok(()) => Ok(true),
        Err(_) => Ok(false), // Empty or too small
    }
}

/// Identify a file's type based on its magic bytes.
/// Returns a file extension hint.
pub fn identify_file_type(data: &[u8]) -> &'static str {
    if data.len() < 4 {
        return "bin";
    }

    // Check for GR2 first (ESO-specific magic patterns)
    if is_gr2_magic(data) {
        return "gr2";
    }

    // Check magic bytes
    match &data[..4] {
        // DDS texture
        [0x44, 0x44, 0x53, 0x20] => "dds",
        // RIFF (audio)
        [0x52, 0x49, 0x46, 0x46] => "riff",
        // PNG
        [0x89, 0x50, 0x4E, 0x47] => "png",
        // Havok physics
        [0x1E, 0x0D, 0x0B, 0xCD] => "hk",
        // Havok packed
        [0x1E, 0x0D, 0xB0, 0xCA] => "hkx",
        // PSB2
        [0x50, 0x53, 0x42, 0x32] => "psb2",
        // XV4 (DDS variant with extra header)
        [0x58, 0x56, 0x34, 0x00] => "xv4",
        // Lua bytecode
        [0x1B, 0x4C, 0x75, 0x61] => "luac",
        // ESO file data
        [0xFA, 0xFA, 0xEB, 0xEB] => "esofiledata",
        // ESO ID data
        [0xFB, 0xFB, 0xEC, 0xEC] => "esoiddata",
        _ => {
            // Check for UTF-8 BOM (text file)
            if data.len() >= 3 && data[..3] == [0xEF, 0xBB, 0xBF] {
                return "txt";
            }
            "bin"
        }
    }
}

/// Check if data starts with any known GR2 magic byte sequence.
/// ESO uses custom GR2 magic bytes (not standard 0xB867B0CA).
pub fn is_gr2_magic(data: &[u8]) -> bool {
    if data.len() < 4 {
        return false;
    }

    // ESO-specific GR2 magic patterns from UESP GuessFileExtension
    let magic_patterns: &[[u8; 4]] = &[
        [0x29, 0xDE, 0x6C, 0xC0],
        [0xE5, 0x9B, 0x49, 0x5E],
        [0x29, 0x75, 0x31, 0x82],
        [0x0E, 0x11, 0x95, 0xB5],
        [0x0E, 0x74, 0xA2, 0x0A],
        [0xE5, 0x2F, 0x4A, 0xE1],
        [0x31, 0x95, 0xD4, 0xE3],
        [0x31, 0xC2, 0x4E, 0x7C],
        // Standard GR2 magic (may appear if not ESO-encrypted)
        [0xB8, 0x67, 0xB0, 0xCA],
        [0xCA, 0xB0, 0x67, 0xB8],
    ];

    let first_four: [u8; 4] = [data[0], data[1], data[2], data[3]];
    magic_patterns.contains(&first_four)
}
