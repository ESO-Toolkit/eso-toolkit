//! Oodle decompression via dynamic library loading.
//!
//! ESO v3 data files use Oodle Kraken compression. Data is detected by
//! magic bytes (0x8C 0x06 or 0xCC 0x0A) at the start of the raw data.
//!
//! Requires `oo2core_8_win64.dll` in the executable's directory or PATH.

use crate::error::{ExtractError, Result};

/// Magic byte pairs that indicate Oodle-compressed data in ESO v3 archives.
const OODLE_MAGIC: &[(u8, u8)] = &[(0x8C, 0x06), (0xCC, 0x0A)];

/// Check if data starts with Oodle compression magic bytes.
pub fn is_oodle_compressed(data: &[u8]) -> bool {
    if data.len() < 2 {
        return false;
    }
    OODLE_MAGIC.iter().any(|&(a, b)| data[0] == a && data[1] == b)
}

/// Oodle decompressor that loads the DLL on first use.
pub struct OodleDecompressor {
    _lib: libloading::Library,
    decompress_fn: DecompressFn,
}

// OodleLZ_Decompress function signature (stdcall on Windows)
type DecompressFn = unsafe extern "system" fn(
    compressed: *const u8,
    compressed_size: i32,
    output: *mut u8,
    output_size: i32,
    a: i32,
    b: i32,
    c: i32,
    d: usize,
    e: usize,
    f: usize,
    g: usize,
    h: usize,
    i: usize,
    thread_module: i32,
) -> i32;

// SEH-protected wrapper from seh_wrapper.c
unsafe extern "C" {
    fn safe_oodle_decompress(
        fn_ptr: DecompressFn,
        compressed: *const u8,
        compressed_size: i32,
        output: *mut u8,
        output_size: i32,
    ) -> i32;
}

impl OodleDecompressor {
    /// Load the Oodle DLL and resolve the decompress function.
    ///
    /// Searches for DLL in this order:
    /// 1. oo2core_9_win64.dll (newer version)
    /// 2. oo2core_8_win64.dll (older version)
    pub fn new() -> Result<Self> {
        let dll_names = ["oo2core_9_win64.dll", "oo2core_8_win64.dll"];
        let mut last_err = String::new();

        for dll_name in &dll_names {
            match unsafe { libloading::Library::new(dll_name) } {
                Ok(lib) => {
                    let decompress_fn = unsafe {
                        let func: libloading::Symbol<DecompressFn> =
                            lib.get(b"OodleLZ_Decompress").map_err(|e| {
                                ExtractError::UnsupportedFormat(format!(
                                    "Failed to find OodleLZ_Decompress in {}: {}",
                                    dll_name, e
                                ))
                            })?;
                        *func
                    };
                    tracing::info!("Loaded Oodle from {}", dll_name);
                    return Ok(Self {
                        _lib: lib,
                        decompress_fn,
                    });
                }
                Err(e) => {
                    last_err = format!("{}: {}", dll_name, e);
                    continue;
                }
            }
        }

        Err(ExtractError::UnsupportedFormat(format!(
            "Failed to load Oodle DLL (tried {:?}). Last error: {}. \
             Place oo2core_9_win64.dll or oo2core_8_win64.dll next to the executable.",
            dll_names, last_err
        )))
    }

    /// Decompress Oodle-compressed data.
    ///
    /// `expected_size` is the uncompressed size from the MNF record's Size field.
    pub fn decompress(&self, compressed: &[u8], expected_size: usize) -> Result<Vec<u8>> {
        let mut output = vec![0u8; expected_size];

        let bytes_decompressed = unsafe {
            safe_oodle_decompress(
                self.decompress_fn,
                compressed.as_ptr(),
                compressed.len() as i32,
                output.as_mut_ptr(),
                expected_size as i32,
            )
        };

        if bytes_decompressed == -999 {
            return Err(ExtractError::DecompressionFailed(
                "Oodle SEH exception (access violation caught)".into(),
            ));
        }

        if bytes_decompressed <= 0 {
            return Err(ExtractError::DecompressionFailed(format!(
                "Oodle decompression failed (returned {})",
                bytes_decompressed
            )));
        }

        output.truncate(bytes_decompressed as usize);
        Ok(output)
    }
}
