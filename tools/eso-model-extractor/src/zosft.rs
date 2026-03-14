//! ZOSFT (ZOS File Table) parser.
//!
//! The ZOSFT is a block-structured file table embedded within the MNF/DAT system
//! that maps file indices to their original filenames (paths like "/art/model/npc/boss.gr2").
//!
//! Format (all LE unless noted):
//!   Header (19 bytes):  "ZOSFT"(5) + u16 version + u32 unk2 + u32 unk3 + u32 record_count
//!   3 × Block3:         u16 block_id + u32 unk + u32 cnt_1a + u32 cnt_1b + u32 cnt_23
//!                        + 3 × data section (u32 uncomp + u32 comp + zlib_data[comp])
//!   FileData:           u32 size + byte[size] (null-separated filenames)
//!   Footer (5 bytes):   "ZOSFT"

use byteorder::{LittleEndian, ReadBytesExt};
use flate2::read::ZlibDecoder;
use std::io::{Cursor, Read};

use crate::error::{ExtractError, Result};

const ZOSFT_MAGIC: &[u8; 5] = b"ZOSFT";
const ZOSFT_HEADER_SIZE: usize = 19; // 5 + 2 + 4 + 4 + 4

/// Parse a ZOSFT data blob into (file_index, filename) mappings.
pub fn parse_zosft(data: &[u8]) -> Result<Vec<(u32, String)>> {
    if data.len() < ZOSFT_HEADER_SIZE {
        return Err(ExtractError::ZosftError("Data too small for ZOSFT".into()));
    }

    // Verify magic
    if &data[0..5] != ZOSFT_MAGIC {
        return Err(ExtractError::ZosftError(format!(
            "Invalid ZOSFT magic: {:?}",
            &data[0..5]
        )));
    }

    let mut cursor = Cursor::new(data);
    cursor.set_position(5); // skip magic

    let version = cursor.read_u16::<LittleEndian>()?;
    let _unknown2 = cursor.read_u32::<LittleEndian>()?;
    let _unknown3 = cursor.read_u32::<LittleEndian>()?;
    let record_count = cursor.read_u32::<LittleEndian>()?;

    tracing::info!(
        "ZOSFT: version={}, record_count={}",
        version,
        record_count
    );

    // Read 3 blocks (each Block3 with LE headers)
    let mut blocks: Vec<Vec<Vec<u8>>> = Vec::new(); // blocks[block_idx][data_section_idx]
    for block_idx in 0..3 {
        let block_id = cursor.read_u16::<LittleEndian>()?;
        let _unknown1 = cursor.read_u32::<LittleEndian>()?;
        let count_1a = cursor.read_u32::<LittleEndian>()?;
        let count_1b = cursor.read_u32::<LittleEndian>()?;
        let count_23 = cursor.read_u32::<LittleEndian>()?;

        tracing::debug!(
            "ZOSFT block {}: id={}, counts=({}, {}, {})",
            block_idx,
            block_id,
            count_1a,
            count_1b,
            count_23
        );

        // Read 3 data sections per block
        let mut sections = Vec::new();
        for section_idx in 0..3 {
            // Skip sections 1+ if count_23 == 0
            if section_idx >= 1 && count_23 == 0 {
                tracing::debug!("ZOSFT block {} section {}: skipped (count_23=0)", block_idx, section_idx);
                sections.push(Vec::new());
                continue;
            }

            let uncomp_size = cursor.read_u32::<LittleEndian>()?;
            let comp_size = cursor.read_u32::<LittleEndian>()?;

            let mut compressed = vec![0u8; comp_size as usize];
            cursor.read_exact(&mut compressed)?;

            // Decompress zlib
            let decompressed = if comp_size < uncomp_size && uncomp_size > 0 {
                let mut decoder = ZlibDecoder::new(&compressed[..]);
                let mut buf = Vec::with_capacity(uncomp_size as usize);
                decoder.read_to_end(&mut buf).map_err(|e| {
                    ExtractError::ZosftError(format!(
                        "ZOSFT block {} section {} zlib error: {}",
                        block_idx, section_idx, e
                    ))
                })?;
                buf
            } else {
                compressed
            };

            tracing::debug!(
                "ZOSFT block {} section {}: {} bytes",
                block_idx,
                section_idx,
                decompressed.len()
            );
            sections.push(decompressed);
        }
        blocks.push(sections);
    }

    // Read file data (null-separated filenames)
    let raw_file_data_size = cursor.read_u32::<LittleEndian>()?;
    let mut raw_file_data = vec![0u8; raw_file_data_size as usize];
    cursor.read_exact(&mut raw_file_data)?;

    tracing::info!(
        "ZOSFT: raw filename data = {} bytes",
        raw_file_data_size
    );

    // Build file table from Block 1 (index 1) Data section 2 (index 2)
    // Each record: u32 FileIndex + u32 FilenameOffset + u64 FileID = 16 bytes
    let data23 = &blocks[1][2];
    let record_size = 16usize;
    let actual_records = data23.len() / record_size;

    if actual_records == 0 {
        return Err(ExtractError::ZosftError(
            "ZOSFT block 1 data section 2 is empty".into(),
        ));
    }

    tracing::info!(
        "ZOSFT: {} records in block1/data2 ({} bytes)",
        actual_records,
        data23.len()
    );

    let mut result = Vec::with_capacity(actual_records);
    let mut offset = 0usize;

    for _ in 0..actual_records {
        if offset + record_size > data23.len() {
            break;
        }
        let mut rec = Cursor::new(&data23[offset..offset + record_size]);
        let file_index = rec.read_u32::<LittleEndian>()?;
        let filename_offset = rec.read_u32::<LittleEndian>()?;
        let _file_id = rec.read_u64::<LittleEndian>()?;
        offset += record_size;

        // Resolve filename from raw file data
        let fname_start = filename_offset as usize;
        if fname_start >= raw_file_data.len() {
            continue;
        }
        let fname_bytes = &raw_file_data[fname_start..];
        let fname_end = fname_bytes
            .iter()
            .position(|&b| b == 0)
            .unwrap_or(fname_bytes.len());
        let filename = String::from_utf8_lossy(&fname_bytes[..fname_end]).to_string();

        if !filename.is_empty() {
            result.push((file_index, filename));
        }
    }

    tracing::info!("ZOSFT: resolved {} filenames", result.len());
    Ok(result)
}
