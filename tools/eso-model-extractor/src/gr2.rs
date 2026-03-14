//! GR2 (Granny 3D) file parser.
//!
//! Granny 3D is a proprietary 3D file format by RAD Game Tools.
//! ESO uses it for all 3D models, skeletons, and animations.
//!
//! The format has been partially reverse-engineered by the modding community.
//! This parser handles the common structure used by ESO's variant.
//!
//! References:
//! - UESP EsoExtractData: https://github.com/uesp/uesp-esoapps
//! - Norbyte's lslib (BG3/DOS2 GR2): https://github.com/Norbyte/lslib
//! - Granny format notes from various game modding communities

use byteorder::{LittleEndian, ReadBytesExt};
use std::io::{Cursor, Read, Seek, SeekFrom};

use crate::error::{ExtractError, Result};

// --- Magic bytes ---

/// Primary GR2 magic signature (little-endian)
const GR2_MAGIC_LE: [u8; 4] = [0xB8, 0x67, 0xB0, 0xCA];
const GR2_MAGIC_BE: [u8; 4] = [0xCA, 0xB0, 0x67, 0xB8];

/// GR2 file header size (bytes before section headers)
const GR2_HEADER_SIZE: usize = 56;

// --- Data structures ---

/// Parsed GR2 file with all extracted information
#[derive(Debug, Clone)]
pub struct Gr2File {
    pub header: Gr2Header,
    pub sections: Vec<Gr2Section>,
    pub models: Vec<Gr2Model>,
    pub skeletons: Vec<Gr2Skeleton>,
    pub meshes: Vec<Gr2Mesh>,
    /// Original filename embedded in the GR2 (if found)
    pub original_filename: Option<String>,
}

/// GR2 file header
#[derive(Debug, Clone)]
pub struct Gr2Header {
    /// Magic bytes (should be GR2_MAGIC_LE or GR2_MAGIC_BE)
    pub magic: [u8; 4],
    /// Header size
    pub header_size: u32,
    /// Format version
    pub format: u32,
    /// Total file size
    pub total_size: u64,
    /// CRC32 checksum
    pub crc32: u32,
    /// Number of sections
    pub section_count: u32,
    /// Root type section index
    pub root_type_section: u32,
    /// Root type offset within that section
    pub root_type_offset: u32,
    /// Root object section index  
    pub root_object_section: u32,
    /// Root object offset
    pub root_object_offset: u32,
    /// Tag value (format-specific)
    pub tag: u32,
    /// Extra data (varies by version)
    pub extra: [u32; 4],
    /// Whether byte order is big-endian
    pub is_big_endian: bool,
    /// Pointer size (32 or 64)
    pub pointer_size: u32,
}

/// A section within the GR2 file
#[derive(Debug, Clone)]
pub struct Gr2Section {
    /// Compression type (0=none, 1=oodle, 2=bitknit)
    pub compression: u32,
    /// Offset of this section's data in the file
    pub data_offset: u32,
    /// Compressed data size on disk
    pub data_size: u32,
    /// Uncompressed data size
    pub decompressed_size: u32,
    /// Alignment requirement
    pub alignment: u32,
    /// First 16-bit value
    pub first16bit: u32,
    /// First 8-bit value
    pub first8bit: u32,
    /// Number of pointer fixups
    pub pointer_fixup_count: u32,
    /// Number of mixed-marshal fixups
    pub mixed_marshal_count: u32,
    /// Decompressed section data
    pub data: Vec<u8>,
}

/// A 3D model from the GR2 file
#[derive(Debug, Clone)]
pub struct Gr2Model {
    pub name: String,
    pub skeleton_index: i32,
    pub mesh_bindings: Vec<u32>,
}

/// A skeleton (bone hierarchy)
#[derive(Debug, Clone)]
pub struct Gr2Skeleton {
    pub name: String,
    pub bones: Vec<Gr2Bone>,
}

/// A single bone in a skeleton
#[derive(Debug, Clone)]
pub struct Gr2Bone {
    pub name: String,
    pub parent_index: i32,
    pub position: [f32; 3],
    pub rotation: [f32; 4],
    pub scale: [f32; 3],
}

/// A mesh with geometry data
#[derive(Debug, Clone)]
pub struct Gr2Mesh {
    pub name: String,
    pub vertices: Vec<Gr2Vertex>,
    pub triangles: Vec<[u32; 3]>,
    pub material_name: Option<String>,
}

/// A vertex with position, normal, and UV coordinates
#[derive(Debug, Clone, Default)]
pub struct Gr2Vertex {
    pub position: [f32; 3],
    pub normal: [f32; 3],
    pub uv: [f32; 2],
    pub bone_indices: [u8; 4],
    pub bone_weights: [u8; 4],
}

// --- Implementation ---

impl Gr2File {
    /// Parse a GR2 file from raw bytes.
    pub fn parse(data: &[u8]) -> Result<Self> {
        if data.len() < GR2_HEADER_SIZE {
            return Err(ExtractError::InvalidGr2(format!(
                "File too small: {} bytes (minimum {})",
                data.len(),
                GR2_HEADER_SIZE
            )));
        }

        let header = Gr2Header::parse(data)?;
        let sections = Self::parse_sections(data, &header)?;

        // Try to extract model/mesh data from sections
        let mut file = Gr2File {
            header,
            sections,
            models: Vec::new(),
            skeletons: Vec::new(),
            meshes: Vec::new(),
            original_filename: None,
        };

        // Try to find the original filename in the root object
        file.original_filename = file.find_original_filename(data);

        // Attempt to parse mesh data from sections
        if let Err(e) = file.parse_geometry(data) {
            tracing::debug!("Could not fully parse GR2 geometry: {}", e);
        }

        Ok(file)
    }

    fn parse_sections(data: &[u8], header: &Gr2Header) -> Result<Vec<Gr2Section>> {
        let mut cursor = Cursor::new(data);
        // Section headers start after the main header
        cursor.seek(SeekFrom::Start(header.header_size as u64))?;

        let mut sections = Vec::with_capacity(header.section_count as usize);

        for i in 0..header.section_count {
            let compression = cursor.read_u32::<LittleEndian>()?;
            let data_offset = cursor.read_u32::<LittleEndian>()?;
            let data_size = cursor.read_u32::<LittleEndian>()?;
            let decompressed_size = cursor.read_u32::<LittleEndian>()?;
            let alignment = cursor.read_u32::<LittleEndian>()?;
            let first16bit = cursor.read_u32::<LittleEndian>()?;
            let first8bit = cursor.read_u32::<LittleEndian>()?;
            let pointer_fixup_count = cursor.read_u32::<LittleEndian>()?;
            let mixed_marshal_count = cursor.read_u32::<LittleEndian>()?;

            // Read section data
            let section_data = if compression == 0 {
                // Uncompressed — read directly
                let start = data_offset as usize;
                let end = start + data_size as usize;
                if end <= data.len() {
                    data[start..end].to_vec()
                } else {
                    tracing::warn!(
                        "Section {} data extends past file end ({}..{}, file={})",
                        i,
                        start,
                        end,
                        data.len()
                    );
                    Vec::new()
                }
            } else {
                // Compressed section — would need Oodle/Bitknit decompression
                tracing::debug!(
                    "Section {} uses compression type {} (not decompressed)",
                    i,
                    compression
                );
                Vec::new()
            };

            sections.push(Gr2Section {
                compression,
                data_offset,
                data_size,
                decompressed_size,
                alignment,
                first16bit,
                first8bit,
                pointer_fixup_count,
                mixed_marshal_count,
                data: section_data,
            });
        }

        Ok(sections)
    }

    /// Search for the embedded original filename in the GR2 data.
    /// Many GR2 files contain their original path like "/art/model/npc/boss_01.gr2".
    fn find_original_filename(&self, data: &[u8]) -> Option<String> {
        // Look for common path prefixes in the data
        let prefixes: &[&[u8]] = &[b"/art/", b"art/", b"/models/", b"models/"];

        for prefix in prefixes {
            if let Some(pos) = find_bytes(data, *prefix) {
                // Read until null terminator or non-printable char
                let start = pos;
                let mut end = start;
                while end < data.len() && data[end] != 0 && data[end].is_ascii_graphic() {
                    end += 1;
                }
                if end > start {
                    let name = String::from_utf8_lossy(&data[start..end]).to_string();
                    if name.contains('.') {
                        return Some(name);
                    }
                }
            }
        }

        None
    }

    /// Attempt to parse mesh geometry from the GR2 sections.
    /// This is a best-effort parser — GR2's type system makes it difficult
    /// to parse without the full Granny SDK type definitions.
    fn parse_geometry(&mut self, data: &[u8]) -> Result<()> {
        // GR2 stores type information in the root type section, and actual
        // data in the root object section. The type system is essentially a
        // runtime reflection system that describes the layout of structs.
        //
        // Without the full type definitions, we use heuristics to find
        // vertex and index buffers based on common patterns.

        if self.header.root_object_section as usize >= self.sections.len() {
            return Ok(());
        }

        let root_section = &self.sections[self.header.root_object_section as usize];
        if root_section.data.is_empty() {
            return Ok(());
        }

        // Try to find mesh data by scanning for vertex buffer patterns
        self.find_meshes_heuristic(data)?;

        Ok(())
    }

    /// Heuristic mesh finder: scans binary data for patterns that indicate
    /// vertex buffers (sequences of float triplets in reasonable coordinate ranges).
    fn find_meshes_heuristic(&mut self, data: &[u8]) -> Result<()> {
        // This is intentionally conservative — we'd rather miss data than
        // produce garbage output. For full extraction, use the GR2 SDK.

        // Look for vertex count + stride patterns that precede vertex data
        if data.len() < 100 {
            return Ok(());
        }

        let mut cursor = Cursor::new(data);
        let mut mesh_regions: Vec<(usize, usize, usize)> = Vec::new();

        // Scan for potential vertex buffer headers
        // Pattern: [vertex_count: u32] [vertex_stride: u32] followed by float data
        let search_end = data.len().saturating_sub(32);
        let mut pos = GR2_HEADER_SIZE;

        while pos < search_end {
            cursor.set_position(pos as u64);

            if let (Ok(vert_count), Ok(stride)) = (
                cursor.read_u32::<LittleEndian>(),
                cursor.read_u32::<LittleEndian>(),
            ) {
                // Reasonable vertex counts (1 to 100K) and strides (12 to 80 bytes)
                if (1..=100_000).contains(&vert_count)
                    && (12..=80).contains(&stride)
                    && stride % 4 == 0
                {
                    let data_start = pos + 8;
                    let data_size = vert_count as usize * stride as usize;

                    if data_start + data_size <= data.len() {
                        // Verify: check if first few values look like valid floats
                        let mut valid = true;
                        for i in 0..3.min(vert_count as usize) {
                            let offset = data_start + i * stride as usize;
                            cursor.set_position(offset as u64);
                            if let (Ok(x), Ok(y), Ok(z)) = (
                                cursor.read_f32::<LittleEndian>(),
                                cursor.read_f32::<LittleEndian>(),
                                cursor.read_f32::<LittleEndian>(),
                            ) {
                                // ESO coordinates are typically in a reasonable range
                                if x.is_nan()
                                    || y.is_nan()
                                    || z.is_nan()
                                    || x.abs() > 100_000.0
                                    || y.abs() > 100_000.0
                                    || z.abs() > 100_000.0
                                {
                                    valid = false;
                                    break;
                                }
                            } else {
                                valid = false;
                                break;
                            }
                        }

                        if valid {
                            mesh_regions.push((data_start, vert_count as usize, stride as usize));
                            pos = data_start + data_size;
                            continue;
                        }
                    }
                }
            }

            pos += 4; // Advance by alignment
        }

        // Convert found regions into mesh data
        for (i, &(start, vert_count, stride)) in mesh_regions.iter().enumerate() {
            let mut vertices = Vec::with_capacity(vert_count);
            let mut cursor = Cursor::new(data);

            for v in 0..vert_count {
                let offset = start + v * stride;
                cursor.set_position(offset as u64);

                let x = cursor.read_f32::<LittleEndian>().unwrap_or(0.0);
                let y = cursor.read_f32::<LittleEndian>().unwrap_or(0.0);
                let z = cursor.read_f32::<LittleEndian>().unwrap_or(0.0);

                let mut vertex = Gr2Vertex {
                    position: [x, y, z],
                    ..Default::default()
                };

                // Try to read normal if stride is large enough
                if stride >= 24 {
                    vertex.normal = [
                        cursor.read_f32::<LittleEndian>().unwrap_or(0.0),
                        cursor.read_f32::<LittleEndian>().unwrap_or(0.0),
                        cursor.read_f32::<LittleEndian>().unwrap_or(0.0),
                    ];
                }

                // Try to read UVs if stride is large enough
                if stride >= 32 {
                    vertex.uv = [
                        cursor.read_f32::<LittleEndian>().unwrap_or(0.0),
                        cursor.read_f32::<LittleEndian>().unwrap_or(0.0),
                    ];
                }

                vertices.push(vertex);
            }

            // Look for index buffer after vertex data
            let after_verts = start + vert_count * stride;
            let triangles = self.find_index_buffer(data, after_verts, vert_count as u32);

            self.meshes.push(Gr2Mesh {
                name: format!("mesh_{}", i),
                vertices,
                triangles,
                material_name: None,
            });
        }

        if !self.meshes.is_empty() {
            tracing::info!(
                "Found {} potential mesh(es) via heuristic scan",
                self.meshes.len()
            );
        }

        Ok(())
    }

    /// Try to find an index buffer (triangle list) after vertex data.
    fn find_index_buffer(&self, data: &[u8], start: usize, max_vertex: u32) -> Vec<[u32; 3]> {
        if start + 8 > data.len() {
            return Vec::new();
        }

        let mut cursor = Cursor::new(data);
        cursor.set_position(start as u64);

        // Look for index count header
        let index_count = match cursor.read_u32::<LittleEndian>() {
            Ok(n) if n > 0 && n <= 1_000_000 && n % 3 == 0 => n,
            _ => return Vec::new(),
        };

        // Try 16-bit indices first (more common for game meshes)
        let mut triangles = Vec::new();
        let tri_count = index_count / 3;

        // Check if we have enough data for 16-bit indices
        if start + 4 + (index_count as usize * 2) <= data.len() {
            let mut valid = true;
            let save_pos = cursor.position();

            for _ in 0..tri_count {
                let a = cursor.read_u16::<LittleEndian>().unwrap_or(u16::MAX) as u32;
                let b = cursor.read_u16::<LittleEndian>().unwrap_or(u16::MAX) as u32;
                let c = cursor.read_u16::<LittleEndian>().unwrap_or(u16::MAX) as u32;

                if a >= max_vertex || b >= max_vertex || c >= max_vertex {
                    valid = false;
                    break;
                }
                triangles.push([a, b, c]);
            }

            if valid {
                return triangles;
            }
            triangles.clear();
            cursor.set_position(save_pos);
        }

        // Try 32-bit indices
        if start + 4 + (index_count as usize * 4) <= data.len() {
            for _ in 0..tri_count {
                let a = cursor.read_u32::<LittleEndian>().unwrap_or(u32::MAX);
                let b = cursor.read_u32::<LittleEndian>().unwrap_or(u32::MAX);
                let c = cursor.read_u32::<LittleEndian>().unwrap_or(u32::MAX);

                if a >= max_vertex || b >= max_vertex || c >= max_vertex {
                    return Vec::new();
                }
                triangles.push([a, b, c]);
            }
        }

        triangles
    }
}

impl Gr2Header {
    /// Parse the GR2 file header from raw bytes.
    pub fn parse(data: &[u8]) -> Result<Self> {
        if data.len() < GR2_HEADER_SIZE {
            return Err(ExtractError::InvalidGr2("Data too small for GR2 header".into()));
        }

        let mut cursor = Cursor::new(data);

        let mut magic = [0u8; 4];
        cursor.read_exact(&mut magic)?;

        let is_big_endian = magic == GR2_MAGIC_BE;

        if magic != GR2_MAGIC_LE && magic != GR2_MAGIC_BE {
            return Err(ExtractError::InvalidGr2(format!(
                "Invalid GR2 magic: {:02X} {:02X} {:02X} {:02X}",
                magic[0], magic[1], magic[2], magic[3]
            )));
        }

        // Read remaining header fields (always little-endian in ESO's variant)
        let header_size = cursor.read_u32::<LittleEndian>()?;
        let format = cursor.read_u32::<LittleEndian>()?;
        let _reserved1 = cursor.read_u32::<LittleEndian>()?;
        let _reserved2 = cursor.read_u32::<LittleEndian>()?;

        let total_size_lo = cursor.read_u32::<LittleEndian>()? as u64;
        let total_size_hi = cursor.read_u32::<LittleEndian>()? as u64;
        let total_size = total_size_lo | (total_size_hi << 32);

        let crc32 = cursor.read_u32::<LittleEndian>()?;
        let section_count = cursor.read_u32::<LittleEndian>()?;

        let root_type_section = cursor.read_u32::<LittleEndian>()?;
        let root_type_offset = cursor.read_u32::<LittleEndian>()?;
        let root_object_section = cursor.read_u32::<LittleEndian>()?;
        let root_object_offset = cursor.read_u32::<LittleEndian>()?;

        let tag = cursor.read_u32::<LittleEndian>()?;

        let pointer_size = if format >= 7 { 64 } else { 32 };

        let extra = [
            cursor.read_u32::<LittleEndian>().unwrap_or(0),
            cursor.read_u32::<LittleEndian>().unwrap_or(0),
            cursor.read_u32::<LittleEndian>().unwrap_or(0),
            cursor.read_u32::<LittleEndian>().unwrap_or(0),
        ];

        Ok(Gr2Header {
            magic,
            header_size,
            format,
            total_size,
            crc32,
            section_count,
            root_type_section,
            root_type_offset,
            root_object_section,
            root_object_offset,
            tag,
            extra,
            is_big_endian,
            pointer_size,
        })
    }
}

/// Summary information about a GR2 file (for listing/filtering)
#[derive(Debug)]
pub struct Gr2Summary {
    pub original_filename: Option<String>,
    pub format_version: u32,
    pub section_count: u32,
    pub total_size: u64,
    pub mesh_count: usize,
    pub has_skeleton: bool,
}

impl Gr2File {
    /// Generate a summary without full geometry parsing.
    pub fn summary(&self) -> Gr2Summary {
        Gr2Summary {
            original_filename: self.original_filename.clone(),
            format_version: self.header.format,
            section_count: self.header.section_count,
            total_size: self.header.total_size,
            mesh_count: self.meshes.len(),
            has_skeleton: !self.skeletons.is_empty(),
        }
    }
}

/// Find a byte pattern in a buffer (simple Boyer-Moore-ish search).
fn find_bytes(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    haystack
        .windows(needle.len())
        .position(|window| window == needle)
}
