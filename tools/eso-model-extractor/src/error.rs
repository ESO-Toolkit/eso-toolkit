use thiserror::Error;

#[derive(Error, Debug)]
pub enum ExtractError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Invalid MNF file: {0}")]
    InvalidMnf(String),

    #[error("Invalid DAT file: {0}")]
    InvalidDat(String),

    #[error("Invalid GR2 file: {0}")]
    InvalidGr2(String),

    #[error("Decompression failed: {0}")]
    DecompressionFailed(String),

    #[error("Unsupported format: {0}")]
    UnsupportedFormat(String),

    #[error("File not found: {0}")]
    FileNotFound(String),

    #[error("ZOSFT parse error: {0}")]
    ZosftError(String),

    #[error("glTF export error: {0}")]
    GltfExportError(String),
}

pub type Result<T> = std::result::Result<T, ExtractError>;
