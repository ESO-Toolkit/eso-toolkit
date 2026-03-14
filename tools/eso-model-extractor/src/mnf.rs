//! MNF (Manifest) file parser for ESO archives — MES2 format.
//!
//! MNF files are the top-level index into ESO's asset system. They use the
//! "MES2" container format consisting of:
//! - A header with magic "MES2", version, and metadata
//! - Block structures containing zlib-compressed data sections
//! - A file table built from 3 data sections within a Block3
//!
//! Based on the format implemented in UESP's EsoExtractData tool:
//! https://github.com/uesp/uesp-esoapps (MIT License)

use byteorder::{BigEndian, LittleEndian, ReadBytesExt};
use flate2::read::ZlibDecoder;
use std::collections::HashMap;
use std::fs::File;
use std::io::{BufReader, Cursor, Read};
use std::path::{Path, PathBuf};

use crate::error::{ExtractError, Result};

/// Magic bytes identifying an MES2 file: "MES2" as little-endian u32
const MES2_MAGIC: &[u8; 4] = b"MES2";

/// Block3 record sizes
const BLOCK1_RECORD_SIZE: usize = 4;
const BLOCK2_RECORD_SIZE: usize = 8;
const BLOCK3_RECORD_SIZE: usize = 20;

/// An entry in the MNF file table
#[derive(Debug, Clone)]
pub struct MnfFileEntry {
    /// Sequential index in the file table
    pub index: u32,
    /// ID from Block1 data
    pub id: u32,
    /// File index (used for ZOSFT lookup and file addressing)
    pub file_index: u32,
    /// Which DAT archive this file lives in (0-based)
    pub archive_index: u8,
    /// Offset within the DAT file where data begins
    pub offset: u64,
    /// Compressed size in the DAT file
    pub compressed_size: u32,
    /// Uncompressed size of the data
    pub uncompressed_size: u32,
    /// Compression type: 0=none, 1=zlib, 2=snappy (v3 swaps comp/archive bytes)
    pub compression_type: u8,
    /// Hash identifying the file content
    pub hash: u32,
    /// Resolved filename from ZOSFT (if available)
    pub filename: Option<String>,
}

/// Parsed MNF manifest file
#[derive(Debug)]
pub struct MnfFile {
    /// Path to the MNF file
    pub path: PathBuf,
    /// Directory containing the MNF and DAT files
    pub base_dir: PathBuf,
    /// Base name of the archive (e.g., "game", "eso")
    pub base_name: String,
    /// MES2 version from the header
    pub version: u16,
    /// All file entries in this manifest
    pub entries: Vec<MnfFileEntry>,
    /// Hash → entry index lookup
    hash_map: HashMap<u32, usize>,
    /// FileIndex → entry index lookup
    file_index_map: HashMap<u32, usize>,
}

/// A compressed data block within the MNF
struct BlockData {
    uncompressed_size: u32,
    data: Vec<u8>, // decompressed
}

impl MnfFile {
    /// Parse an MES2 MNF file from disk.
    ///
    /// The MES2 format (Version 3):
    /// ```text
    /// Header:
    ///   [4]  magic       "MES2"
    ///   u16  version     (typically 3)
    ///   u32  file_count  (number of file-type entries)
    ///   [file_count * u16] file_types
    ///   u16  unknown1
    ///   u32  data_size
    ///
    /// Blocks:
    ///   u16  block_id    (0 = optional block0, 3 = file table block)
    ///   Block3 (if block_id == 3):
    ///     u32  unknown1
    ///     u32  record_count_1a
    ///     u32  record_count_1b
    ///     u32  record_count_23
    ///     3x data sections, each:
    ///       u32  uncompressed_size
    ///       u32  compressed_size
    ///       [compressed_size] zlib-compressed data
    /// ```
    pub fn parse(path: &Path) -> Result<Self> {
        let file = File::open(path).map_err(|e| {
            ExtractError::FileNotFound(format!("{}: {}", path.display(), e))
        })?;
        let mut reader = BufReader::new(file);

        // Read and validate magic bytes
        let mut magic = [0u8; 4];
        reader.read_exact(&mut magic)?;
        if &magic != MES2_MAGIC {
            return Err(ExtractError::InvalidMnf(format!(
                "Invalid magic bytes: expected {:?} (\"MES2\"), got {:?} (\"{}\")",
                MES2_MAGIC,
                magic,
                String::from_utf8_lossy(&magic)
            )));
        }

        let version = reader.read_u16::<LittleEndian>()?;
        tracing::info!("MES2 version: {}", version);

        // Version 3+ has a different header layout
        if version >= 3 {
            Self::parse_v3(path, &mut reader, version)
        } else {
            Self::parse_v2(path, &mut reader, version)
        }
    }

    fn parse_v3(path: &Path, reader: &mut BufReader<File>, version: u16) -> Result<Self> {
        // Version 3 header: file_count (u32) + file_types + unknown1 + data_size
        // Header fields are LittleEndian; only block structures use BigEndian
        let file_count = reader.read_u32::<LittleEndian>()?;

        // Read file types array
        for _ in 0..file_count {
            let _file_type = reader.read_u16::<LittleEndian>()?;
        }

        let _unknown1 = reader.read_u16::<LittleEndian>()?;
        let _data_size = reader.read_u32::<LittleEndian>()?;

        // Read blocks
        let block_id = reader.read_u16::<BigEndian>()?;
        tracing::debug!("First block ID: {}", block_id);

        // If block 0, skip it and read next block
        if block_id == 0 {
            Self::skip_block0(reader)?;
            let next_id = reader.read_u16::<BigEndian>()?;
            if next_id != 3 {
                return Err(ExtractError::InvalidMnf(format!(
                    "Expected block 3 after block 0, got block {}",
                    next_id
                )));
            }
        } else if block_id != 3 {
            return Err(ExtractError::InvalidMnf(format!(
                "Expected block 0 or 3, got block {}",
                block_id
            )));
        }

        // Read Block3 header
        let _block3_unknown1 = reader.read_u32::<BigEndian>()?;
        let _record_count_1a = reader.read_u32::<BigEndian>()?;
        let _record_count_1b = reader.read_u32::<BigEndian>()?;
        let record_count_23 = reader.read_u32::<BigEndian>()?;

        tracing::info!(
            "Block3: record_count_23={} (file table entries)",
            record_count_23
        );

        // Read 3 data sections (each: u32 uncompressed, u32 compressed, data[compressed])
        let data1 = Self::read_block_data(reader)?;
        let data2 = Self::read_block_data(reader)?;
        let data3 = Self::read_block_data(reader)?;

        tracing::info!(
            "Block data sizes: {} / {} / {} bytes (decompressed)",
            data1.data.len(),
            data2.data.len(),
            data3.data.len()
        );

        // Build file table from the 3 data sections
        let entries = Self::build_file_table(
            version,
            record_count_23,
            &data1.data,
            &data2.data,
            &data3.data,
        )?;

        let (hash_map, file_index_map) = Self::build_maps(&entries);

        let base_dir = path
            .parent()
            .unwrap_or_else(|| Path::new("."))
            .to_path_buf();
        let base_name = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("game")
            .to_string();

        Ok(Self {
            path: path.to_path_buf(),
            base_dir,
            base_name,
            version,
            entries,
            hash_map,
            file_index_map,
        })
    }

    fn parse_v2(path: &Path, reader: &mut BufReader<File>, version: u16) -> Result<Self> {
        // Version 2 header
        let _file_count = reader.read_u8()? as u32;
        let _type_field = reader.read_u32::<LittleEndian>()?;
        let _data_size = reader.read_u32::<LittleEndian>()?;

        // Read blocks (same block structure)
        let block_id = reader.read_u16::<BigEndian>()?;

        if block_id == 0 {
            Self::skip_block0(reader)?;
            let next_id = reader.read_u16::<BigEndian>()?;
            if next_id != 3 {
                return Err(ExtractError::InvalidMnf(format!(
                    "Expected block 3 after block 0, got block {}",
                    next_id
                )));
            }
        } else if block_id != 3 {
            return Err(ExtractError::InvalidMnf(format!(
                "Expected block 0 or 3, got block {}",
                block_id
            )));
        }

        let _block3_unknown1 = reader.read_u32::<BigEndian>()?;
        let _record_count_1a = reader.read_u32::<BigEndian>()?;
        let _record_count_1b = reader.read_u32::<BigEndian>()?;
        let record_count_23 = reader.read_u32::<BigEndian>()?;

        let data1 = Self::read_block_data(reader)?;
        let data2 = Self::read_block_data(reader)?;
        let data3 = Self::read_block_data(reader)?;

        let entries = Self::build_file_table(
            version,
            record_count_23,
            &data1.data,
            &data2.data,
            &data3.data,
        )?;

        let (hash_map, file_index_map) = Self::build_maps(&entries);

        let base_dir = path
            .parent()
            .unwrap_or_else(|| Path::new("."))
            .to_path_buf();
        let base_name = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("game")
            .to_string();

        Ok(Self {
            path: path.to_path_buf(),
            base_dir,
            base_name,
            version,
            entries,
            hash_map,
            file_index_map,
        })
    }

    /// Skip a Block0 (signature/cert data — 2 raw data sections without uncompressed size)
    fn skip_block0(reader: &mut BufReader<File>) -> Result<()> {
        // Block0 header: just a u16 Unknown1
        let _unknown1 = reader.read_u16::<BigEndian>()?;
        // Block0 has 2 data sections, each: u32 compressed_size (BE), data[compressed_size]
        // (Unlike Block3, Block0 does NOT have an uncompressed_size field)
        for _ in 0..2 {
            let data_size = reader.read_u32::<BigEndian>()?;
            let mut skip_buf = vec![0u8; data_size as usize];
            reader.read_exact(&mut skip_buf)?;
        }
        Ok(())
    }

    /// Read a single compressed data block: u32 uncompressed_size, u32 compressed_size, data
    fn read_block_data(reader: &mut impl Read) -> Result<BlockData> {
        let uncompressed_size = reader.read_u32::<BigEndian>()?;
        let compressed_size = reader.read_u32::<BigEndian>()?;

        let mut compressed = vec![0u8; compressed_size as usize];
        reader.read_exact(&mut compressed)?;

        // Decompress with zlib
        let mut decoder = ZlibDecoder::new(&compressed[..]);
        let mut decompressed = Vec::with_capacity(uncompressed_size as usize);
        decoder.read_to_end(&mut decompressed).map_err(|e| {
            ExtractError::DecompressionFailed(format!(
                "Failed to decompress MNF block data: {}",
                e
            ))
        })?;

        if decompressed.len() != uncompressed_size as usize {
            tracing::warn!(
                "Block data size mismatch: expected {} bytes, got {}",
                uncompressed_size,
                decompressed.len()
            );
        }

        Ok(BlockData {
            uncompressed_size,
            data: decompressed,
        })
    }

    /// Build the file table from the 3 decompressed block data sections.
    ///
    /// - data1: 4-byte records (ID/hash entries with 0x80 high-bit markers)
    /// - data2: 8-byte records (FileIndex + Unknown1)
    /// - data3: 20-byte records (Size, CompressedSize, Hash, Offset, CompressType, ArchiveIndex, Unknown2)
    fn build_file_table(
        version: u16,
        record_count: u32,
        data1: &[u8],
        data2: &[u8],
        data3: &[u8],
    ) -> Result<Vec<MnfFileEntry>> {
        let mut entries = Vec::with_capacity(record_count as usize);
        let mut offset1: usize = 0;
        let mut offset2: usize = 0;
        let mut offset3: usize = 0;

        for i in 0..record_count {
            // Data1: read a u32 ID, then advance past consecutive entries
            // until we find the next entry with high bit 0x80 set in byte[3]
            let id = if offset1 + BLOCK1_RECORD_SIZE <= data1.len() {
                let val = (&data1[offset1..]).read_u32::<LittleEndian>()?;
                // Advance offset past this record and any following records
                // without the 0x80 marker in byte 3
                loop {
                    offset1 += BLOCK1_RECORD_SIZE;
                    if offset1 + BLOCK1_RECORD_SIZE > data1.len() {
                        break;
                    }
                    if data1[offset1 + 3] == 0x80 {
                        break;
                    }
                }
                val
            } else {
                0
            };

            // Data2: 8-byte records
            let (file_index, unknown1) = if offset2 + BLOCK2_RECORD_SIZE <= data2.len() {
                let mut cursor = Cursor::new(&data2[offset2..offset2 + BLOCK2_RECORD_SIZE]);
                let fi = cursor.read_u32::<LittleEndian>()?;
                let u1 = cursor.read_u32::<LittleEndian>()?;
                offset2 += BLOCK2_RECORD_SIZE;
                (fi, u1)
            } else {
                (0, 0)
            };

            // Data3: 20-byte records
            let (size, compressed_size, hash, offset, mut comp_type, mut archive_idx, _unknown2) =
                if offset3 + BLOCK3_RECORD_SIZE <= data3.len() {
                    let mut cursor =
                        Cursor::new(&data3[offset3..offset3 + BLOCK3_RECORD_SIZE]);
                    let sz = cursor.read_u32::<LittleEndian>()?;
                    let csz = cursor.read_u32::<LittleEndian>()?;
                    let h = cursor.read_u32::<LittleEndian>()?;
                    let off = cursor.read_u32::<LittleEndian>()?;
                    let ct = cursor.read_u8()?;
                    let ai = cursor.read_u8()?;
                    let u2 = cursor.read_u16::<LittleEndian>()?;
                    offset3 += BLOCK3_RECORD_SIZE;
                    (sz, csz, h, off, ct, ai, u2)
                } else {
                    (0, 0, 0, 0, 0, 0, 0)
                };

            // Version 3+ swaps compression_type and archive_index bytes
            if version >= 3 {
                std::mem::swap(&mut comp_type, &mut archive_idx);
            }

            if i < 5 {
                tracing::debug!(
                    "Record {}: size={} csz={} hash={:#010x} off={} ct={} ai={} fi={}",
                    i, size, compressed_size, hash, offset, comp_type, archive_idx, file_index
                );
            }

            entries.push(MnfFileEntry {
                index: i,
                id,
                file_index,
                archive_index: archive_idx,
                offset: offset as u64,
                compressed_size,
                uncompressed_size: size,
                compression_type: comp_type,
                hash,
                filename: None,
            });

            let _ = unknown1; // suppress unused warning
        }

        tracing::info!("Built file table with {} entries", entries.len());
        Ok(entries)
    }

    fn build_maps(entries: &[MnfFileEntry]) -> (HashMap<u32, usize>, HashMap<u32, usize>) {
        let mut hash_map = HashMap::with_capacity(entries.len());
        let mut file_index_map = HashMap::with_capacity(entries.len());

        for (i, entry) in entries.iter().enumerate() {
            hash_map.insert(entry.hash, i);
            file_index_map.insert(entry.file_index, i);
        }

        (hash_map, file_index_map)
    }

    /// Get the path to a specific DAT file for this manifest.
    /// e.g., for "game.mnf" archive_index=5 → "game0005.dat"
    pub fn dat_path(&self, archive_index: u8) -> PathBuf {
        self.base_dir
            .join(format!("{}{:04}.dat", self.base_name, archive_index))
    }

    /// Find all entries that are likely GR2 (3D model) files,
    /// based on file extension.
    pub fn find_gr2_entries(&self) -> Vec<&MnfFileEntry> {
        self.entries
            .iter()
            .filter(|e| {
                e.filename
                    .as_ref()
                    .is_some_and(|f| f.to_lowercase().ends_with(".gr2"))
            })
            .collect()
    }

    /// Look up an entry by file index
    pub fn find_by_file_index(&self, file_index: u32) -> Option<&MnfFileEntry> {
        self.file_index_map
            .get(&file_index)
            .map(|&i| &self.entries[i])
    }

    /// Look up an entry by hash
    pub fn find_by_hash(&self, hash: u32) -> Option<&MnfFileEntry> {
        self.hash_map.get(&hash).map(|&i| &self.entries[i])
    }

    /// Apply ZOSFT filename mappings to our entries
    pub fn apply_zosft(&mut self, zosft: &[(u32, String)]) {
        let lookup: HashMap<u32, &str> =
            zosft.iter().map(|(idx, name)| (*idx, name.as_str())).collect();

        for entry in &mut self.entries {
            if let Some(name) = lookup.get(&entry.file_index) {
                entry.filename = Some((*name).to_string());
            }
        }

        // Rebuild maps since entries haven't changed structurally
        let named = self.entries.iter().filter(|e| e.filename.is_some()).count();
        tracing::info!("Applied ZOSFT: {} of {} files now have names", named, self.entries.len());
    }

    /// List summary statistics about the archive
    pub fn summary(&self) -> String {
        let total = self.entries.len();
        let gr2_count = self.find_gr2_entries().len();
        let named = self.entries.iter().filter(|e| e.filename.is_some()).count();

        // Count unique archive indices
        let max_archive = self
            .entries
            .iter()
            .map(|e| e.archive_index)
            .max()
            .unwrap_or(0);

        format!(
            "MNF: {} (MES2 v{})\n  Total files: {}\n  Named files: {}\n  GR2 models: {}\n  DAT archives: 0..{}",
            self.path.display(),
            self.version,
            total,
            named,
            gr2_count,
            max_archive
        )
    }
}

/// Find the ZOSFT file entry within the MNF.
/// For game.mnf: file_index 0
/// For eso.mnf: file_index 0xFFFFFF, 0xFFFFF
pub fn find_zosft_entry(mnf: &MnfFile) -> Option<&MnfFileEntry> {
    let is_game = mnf
        .base_name
        .to_lowercase()
        .contains("game");

    if is_game {
        // game.mnf: ZOSFT is at file_index 0
        if let Some(entry) = mnf.find_by_file_index(0) {
            return Some(entry);
        }
    }

    // eso.mnf: try known indices
    for &zosft_index in &[0x00FF_FFFF_u32, 0x000F_FFFF_u32, 0x0000_FFFF_u32] {
        if let Some(entry) = mnf.find_by_file_index(zosft_index) {
            return Some(entry);
        }
    }

    // Fallback: try known hashes
    for &hash in &[0x201F_2232_u32, 0xF969_BEE8, 0xA16B_BD50, 0x3001_A8A2] {
        if let Some(entry) = mnf.find_by_hash(hash) {
            return Some(entry);
        }
    }

    None
}
