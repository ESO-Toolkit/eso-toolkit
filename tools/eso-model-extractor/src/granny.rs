//! Granny2 SDK FFI wrapper for reading ESO GR2 files.
//!
//! ESO uses 8 custom GR2 magic byte patterns that differ from
//! the standard Granny magic (`0xB867B0CA`). The Granny2 SDK
//! handles all of these variants natively.
//!
//! This module loads `granny2_x64.dll` at runtime and provides
//! safe wrappers around the key functions needed for mesh extraction.

use anyhow::{bail, Context, Result};
use libloading::{Library, Symbol};
use std::ffi::CStr;
use std::os::raw::{c_char, c_int, c_void};

// --- Opaque Granny types (pointers only) ---

#[repr(C)]
struct GrannyFile {
    _opaque: [u8; 0],
}

/// Matches `granny_data_type_definition` — opaque, passed by pointer.
#[repr(C)]
struct GrannyDataTypeDef {
    _opaque: [u8; 0],
}

/// Matches `granny_variant` (pointer + pointer).
/// Granny uses #pragma pack(4), so all structs use packed(4).
#[repr(C, packed(4))]
#[derive(Clone, Copy)]
struct GrannyVariant {
    _type: *const GrannyDataTypeDef,
    _object: *const c_void,
}

// --- Granny struct mirrors (read-only) ---
// Granny SDK uses #pragma pack(4) — all structs must use packed(4).

#[repr(C, packed(4))]
struct GrannyFileInfo {
    art_tool_info: *const c_void,
    exporter_info: *const c_void,
    from_file_name: *const c_char,
    texture_count: c_int,
    textures: *const *const c_void,
    material_count: c_int,
    materials: *const *const c_void,
    skeleton_count: c_int,
    skeletons: *const *const GrannySkeleton,
    vertex_data_count: c_int,
    vertex_datas: *const *const c_void,
    tri_topology_count: c_int,
    tri_topologies: *const *const c_void,
    mesh_count: c_int,
    meshes: *const *const GrannyMesh,
    model_count: c_int,
    models: *const *const GrannyModel,
    track_group_count: c_int,
    track_groups: *const *const c_void,
    animation_count: c_int,
    animations: *const *const GrannyAnimation,
    extended_data: GrannyVariant,
}

#[repr(C, packed(4))]
struct GrannyModel {
    name: *const c_char,
    skeleton: *const GrannySkeleton,
    initial_placement: GrannyTransform,
    mesh_binding_count: c_int,
    mesh_bindings: *const GrannyModelMeshBinding,
}

#[repr(C, packed(4))]
struct GrannyModelMeshBinding {
    mesh: *const GrannyMesh,
}

/// Granny transform: flags + position(3) + orientation(4) + 3×3 scale_shear
#[repr(C, packed(4))]
#[derive(Clone, Copy)]
struct GrannyTransform {
    flags: c_int,
    position: [f32; 3],
    orientation: [f32; 4],
    scale_shear: [f32; 9],
}

#[repr(C, packed(4))]
struct GrannyMesh {
    name: *const c_char,
    primary_vertex_data: *const GrannyVertexData,
    morph_target_count: c_int,
    morph_targets: *const c_void,
    primary_topology: *const GrannyTriTopology,
    material_binding_count: c_int,
    material_bindings: *const c_void,
    bone_binding_count: c_int,
    bone_bindings: *const GrannyBoneBinding,
    extended_data: GrannyVariant,
}

#[repr(C, packed(4))]
struct GrannyVertexData {
    vertex_type: *const GrannyDataTypeDef,
    vertex_count: c_int,
    vertices: *const u8,
    vertex_component_name_count: c_int,
    vertex_component_names: *const *const c_char,
    vertex_annotation_set_count: c_int,
    vertex_annotation_sets: *const c_void,
}

#[repr(C, packed(4))]
struct GrannyTriTopology {
    group_count: c_int,
    groups: *const GrannyTriMaterialGroup,
    index_count: c_int,
    indices: *const c_int,
    index16_count: c_int,
    indices16: *const u16,
    // remaining fields omitted — not needed for extraction
}

#[repr(C, packed(4))]
struct GrannyTriMaterialGroup {
    material_index: c_int,
    tri_first: c_int,
    tri_count: c_int,
}

#[repr(C, packed(4))]
struct GrannyBoneBinding {
    bone_name: *const c_char,
    obb_min: [f32; 3],
    obb_max: [f32; 3],
    triangle_count: c_int,
    triangle_indices: *const c_int,
}

#[repr(C, packed(4))]
struct GrannySkeleton {
    name: *const c_char,
    bone_count: c_int,
    bones: *const GrannyBone,
    lod_type: c_int,
}

#[repr(C, packed(4))]
struct GrannyBone {
    name: *const c_char,
    parent_index: c_int,
    local_transform: GrannyTransform,
    inverse_world_4x4: [f32; 16],
    lod_error: f32,
    // extended_data: GrannyVariant, // omitted for simplicity
}

#[repr(C, packed(4))]
struct GrannyAnimation {
    name: *const c_char,
    // we only need the name
}

/// Granny texture — we only need the filename.
/// Layout: name, encoding, sub_format, layout, image_count, images, extended_data
#[repr(C, packed(4))]
struct GrannyTexture {
    name: *const c_char,
    // remaining fields omitted
}

/// Granny material map — pairs a usage string with a material (which wraps a texture).
#[repr(C, packed(4))]
struct GrannyMaterialMap {
    usage: *const c_char,
    material: *const GrannyMaterial,
}

/// Granny material — has a name, maps array, a texture pointer, and extended data.
#[repr(C, packed(4))]
struct GrannyMaterial {
    name: *const c_char,
    map_count: c_int,
    maps: *const GrannyMaterialMap,
    texture: *const GrannyTexture,
    extended_data: GrannyVariant,
}

// --- PNT332 vertex format: Position(3) + Normal(3) + UV(2) = 32 bytes ---

#[repr(C)]
#[derive(Debug, Clone, Copy, Default)]
pub struct Pnt332Vertex {
    pub position: [f32; 3],
    pub normal: [f32; 3],
    pub uv: [f32; 2],
}

// --- Public API types ---

/// Information about a GR2 file, extracted via Granny SDK.
#[derive(Debug, Clone)]
pub struct Gr2Info {
    pub from_filename: Option<String>,
    pub models: Vec<ModelInfo>,
    pub meshes: Vec<MeshInfo>,
    pub animations: Vec<String>,
    pub skeleton: Option<SkeletonInfo>,
    pub textures: Vec<TextureInfo>,
    pub materials: Vec<MaterialInfo>,
}

#[derive(Debug, Clone)]
pub struct TextureInfo {
    pub name: String,
}

#[derive(Debug, Clone)]
pub struct MaterialInfo {
    pub name: String,
    pub maps: Vec<MaterialMapInfo>,
}

#[derive(Debug, Clone)]
pub struct MaterialMapInfo {
    pub usage: String,
    pub material_name: Option<String>,
}

#[derive(Debug, Clone)]
pub struct ModelInfo {
    pub name: String,
    pub mesh_count: usize,
}

#[derive(Debug, Clone)]
pub struct MeshInfo {
    pub name: String,
    pub vertex_count: usize,
    pub triangle_count: usize,
    pub bone_binding_count: usize,
    pub vertices: Vec<Pnt332Vertex>,
    pub indices: Vec<u32>,
}

#[derive(Debug, Clone)]
pub struct SkeletonInfo {
    pub name: String,
    pub bone_count: usize,
    pub bones: Vec<BoneInfo>,
}

#[derive(Debug, Clone)]
pub struct BoneInfo {
    pub name: String,
    pub parent_index: i32,
    pub position: [f32; 3],
    pub orientation: [f32; 4],
}

// --- Granny2 SDK loader ---

// SEH-protected wrappers from seh_wrapper.c
type GrannyReadFnPtr = unsafe extern "system" fn(c_int, *const c_void) -> *mut GrannyFile;
type GrannyGetFileInfoFnPtr = unsafe extern "system" fn(*mut GrannyFile) -> *mut GrannyFileInfo;
type GrannyFreeFileFnPtr = unsafe extern "system" fn(*mut GrannyFile);
type GrannyGetIntFromMeshFnPtr = unsafe extern "system" fn(*const GrannyMesh) -> c_int;
type GrannyCopyVerticesFnPtr = unsafe extern "system" fn(*const GrannyMesh, *const GrannyDataTypeDef, *mut c_void);
type GrannyCopyIndicesFnPtr = unsafe extern "system" fn(*const GrannyMesh, c_int, *mut c_void);

unsafe extern "C" {
    fn safe_granny_read_file(
        read_fn: GrannyReadFnPtr,
        data_size: c_int,
        data: *const c_void,
    ) -> *mut GrannyFile;

    fn safe_granny_get_file_info(
        get_info_fn: GrannyGetFileInfoFnPtr,
        granny_file: *mut GrannyFile,
    ) -> *mut GrannyFileInfo;

    fn safe_granny_free_file(
        free_fn: GrannyFreeFileFnPtr,
        granny_file: *mut GrannyFile,
    );

    fn safe_granny_get_mesh_count(
        fn_ptr: GrannyGetIntFromMeshFnPtr,
        mesh: *const GrannyMesh,
    ) -> c_int;

    fn safe_granny_copy_mesh_vertices(
        fn_ptr: GrannyCopyVerticesFnPtr,
        mesh: *const GrannyMesh,
        vertex_type: *const GrannyDataTypeDef,
        buffer: *mut c_void,
    ) -> c_int;

    fn safe_granny_copy_mesh_indices(
        fn_ptr: GrannyCopyIndicesFnPtr,
        mesh: *const GrannyMesh,
        bytes_per_index: c_int,
        buffer: *mut c_void,
    ) -> c_int;

    /// Generic SEH callback wrapper — runs `fn(context)` inside __try/__except.
    /// Returns -1 on SEH exception (access violation, etc.).
    fn seh_try_call(
        fn_ptr: unsafe extern "C" fn(*mut c_void) -> c_int,
        context: *mut c_void,
    ) -> c_int;
}

/// Granny log message types (from granny.h).
#[repr(C)]
#[derive(Debug, Clone, Copy)]
#[allow(dead_code)]
pub enum GrannyLogMessageType {
    Ignored = 0,
    Note = 1,
    Warning = 2,
    Error = 3,
    OnePastLast = 4,
}

/// Granny log message origins (from granny.h).
#[repr(C)]
#[derive(Debug, Clone, Copy)]
#[allow(dead_code)]
pub enum GrannyLogMessageOrigin {
    NotSet = 0,
    FileReading = 1,
    FileWriting = 2,
    Exporter = 3,
    CompressCurves = 4,
    GameRuntime = 5,
    OnePastLast = 6,
}

/// Log callback type: fn(message_type: i32, origin: i32, message: *const c_char, user_data: *mut c_void)
type GrannyLogCallbackFn = unsafe extern "system" fn(c_int, c_int, *const c_char, *mut c_void);

/// Our log callback — prints Granny SDK diagnostics to stderr.
unsafe extern "system" fn granny_log_callback(
    msg_type: c_int,
    _origin: c_int,
    message: *const c_char,
    _user_data: *mut c_void,
) {
    let type_name = match msg_type {
        1 => "NOTE",
        2 => "WARN",
        3 => "ERROR",
        _ => "???",
    };
    if !message.is_null() {
        let msg = CStr::from_ptr(message).to_string_lossy();
        eprintln!("[Granny/{type_name}] {msg}");
    }
}

pub struct Granny2Sdk {
    #[allow(dead_code)]
    lib: Library,
    fn_read_file: unsafe extern "system" fn(c_int, *const c_void) -> *mut GrannyFile,
    fn_free_file: unsafe extern "system" fn(*mut GrannyFile),
    fn_get_file_info: unsafe extern "system" fn(*mut GrannyFile) -> *mut GrannyFileInfo,
    fn_get_mesh_vertex_count: unsafe extern "system" fn(*const GrannyMesh) -> c_int,
    fn_get_mesh_triangle_count: unsafe extern "system" fn(*const GrannyMesh) -> c_int,
    fn_get_mesh_bytes_per_index: unsafe extern "system" fn(*const GrannyMesh) -> c_int,
    fn_get_mesh_indices: unsafe extern "system" fn(*const GrannyMesh) -> *const c_void,
    fn_get_mesh_vertex_type: unsafe extern "system" fn(*const GrannyMesh) -> *const GrannyDataTypeDef,
    fn_copy_mesh_vertices:
        unsafe extern "system" fn(*const GrannyMesh, *const GrannyDataTypeDef, *mut c_void),
    fn_copy_mesh_indices:
        unsafe extern "system" fn(*const GrannyMesh, c_int, *mut c_void),
    pnt332_type: *const GrannyDataTypeDef,
}

// Safety: The Granny DLL is thread-safe for independent files.
unsafe impl Send for Granny2Sdk {}
unsafe impl Sync for Granny2Sdk {}

impl Granny2Sdk {
    /// Load the Granny2 SDK from `granny2_x64.dll`.
    pub fn new() -> Result<Self> {
        let lib = unsafe {
            Library::new("granny2_x64.dll")
                .or_else(|_| Library::new("granny2.dll"))
                .context("Failed to load granny2_x64.dll — place it next to the executable")?
        };

        unsafe {
            // Register log callback so we can see SDK diagnostics
            if let Ok(set_log_cb) = lib.get::<unsafe extern "system" fn(GrannyLogCallbackFn)>(
                b"GrannySetLogCallback\0",
            ) {
                set_log_cb(granny_log_callback);
                eprintln!("[Granny] Log callback registered");
            }

            let fn_read_file: Symbol<unsafe extern "system" fn(c_int, *const c_void) -> *mut GrannyFile> =
                lib.get(b"GrannyReadEntireFileFromMemory\0")?;
            let fn_free_file: Symbol<unsafe extern "system" fn(*mut GrannyFile)> =
                lib.get(b"GrannyFreeFile\0")?;
            let fn_get_file_info: Symbol<unsafe extern "system" fn(*mut GrannyFile) -> *mut GrannyFileInfo> =
                lib.get(b"GrannyGetFileInfo\0")?;
            let fn_get_mesh_vertex_count: Symbol<unsafe extern "system" fn(*const GrannyMesh) -> c_int> =
                lib.get(b"GrannyGetMeshVertexCount\0")?;
            let fn_get_mesh_triangle_count: Symbol<unsafe extern "system" fn(*const GrannyMesh) -> c_int> =
                lib.get(b"GrannyGetMeshTriangleCount\0")?;
            let fn_get_mesh_bytes_per_index: Symbol<unsafe extern "system" fn(*const GrannyMesh) -> c_int> =
                lib.get(b"GrannyGetMeshBytesPerIndex\0")?;
            let fn_get_mesh_indices: Symbol<unsafe extern "system" fn(*const GrannyMesh) -> *const c_void> =
                lib.get(b"GrannyGetMeshIndices\0")?;
            let fn_get_mesh_vertex_type: Symbol<unsafe extern "system" fn(*const GrannyMesh) -> *const GrannyDataTypeDef> =
                lib.get(b"GrannyGetMeshVertexType\0")?;
            let fn_copy_mesh_vertices: Symbol<
                unsafe extern "system" fn(*const GrannyMesh, *const GrannyDataTypeDef, *mut c_void),
            > = lib.get(b"GrannyCopyMeshVertices\0")?;
            let fn_copy_mesh_indices: Symbol<
                unsafe extern "system" fn(*const GrannyMesh, c_int, *mut c_void),
            > = lib.get(b"GrannyCopyMeshIndices\0")?;

            // Get the PNT332VertexType global
            let pnt332_type_ptr: Symbol<*const *const GrannyDataTypeDef> =
                lib.get(b"GrannyPNT332VertexType\0")?;
            let pnt332_type = **pnt332_type_ptr;

            Ok(Self {
                fn_read_file: *fn_read_file,
                fn_free_file: *fn_free_file,
                fn_get_file_info: *fn_get_file_info,
                fn_get_mesh_vertex_count: *fn_get_mesh_vertex_count,
                fn_get_mesh_triangle_count: *fn_get_mesh_triangle_count,
                fn_get_mesh_bytes_per_index: *fn_get_mesh_bytes_per_index,
                fn_get_mesh_indices: *fn_get_mesh_indices,
                fn_get_mesh_vertex_type: *fn_get_mesh_vertex_type,
                fn_copy_mesh_vertices: *fn_copy_mesh_vertices,
                fn_copy_mesh_indices: *fn_copy_mesh_indices,
                pnt332_type,
                lib,
            })
        }
    }

    /// Parse a GR2 file from memory and extract model/mesh/animation info.
    /// The entire struct traversal is wrapped in SEH protection.
    pub fn read_file_info(&self, data: &[u8]) -> Result<Gr2Info> {
        if data.len() < 16 {
            bail!("GR2 data too small ({} bytes)", data.len());
        }

        let granny_file = unsafe {
            safe_granny_read_file(
                self.fn_read_file,
                data.len() as c_int,
                data.as_ptr() as *const c_void,
            )
        };
        if granny_file.is_null() {
            bail!("GrannyReadEntireFileFromMemory returned null (or SEH crash)");
        }

        let info_ptr = unsafe {
            safe_granny_get_file_info(self.fn_get_file_info, granny_file)
        };
        if info_ptr.is_null() {
            unsafe { safe_granny_free_file(self.fn_free_file, granny_file) };
            bail!("GrannyGetFileInfo returned null (or SEH crash)");
        }

        // Wrap the entire struct traversal in SEH protection
        let mut ctx = SehExtractContext {
            sdk: self as *const Granny2Sdk,
            info_ptr,
            with_mesh_data: false,
            result: None,
        };
        let ret = unsafe {
            seh_try_call(
                seh_extract_callback,
                &mut ctx as *mut SehExtractContext as *mut c_void,
            )
        };

        unsafe { safe_granny_free_file(self.fn_free_file, granny_file) };

        if ret == -1 {
            bail!("SEH exception during GR2 struct traversal (access violation caught)");
        }
        ctx.result.unwrap_or_else(|| bail!("extract returned no result"))
    }

    /// Read just the skeleton from a GR2 file — chases only skeleton pointers.
    /// Returns (skeleton, model_count, mesh_count, animation_count).
    /// Safer than read_file_info since it skips model/mesh/animation name pointers.
    pub fn read_skeleton_only(&self, data: &[u8]) -> Result<(Option<SkeletonInfo>, i32, i32, i32)> {
        if data.len() < 16 {
            bail!("GR2 data too small");
        }
        let granny_file = unsafe {
            safe_granny_read_file(
                self.fn_read_file,
                data.len() as c_int,
                data.as_ptr() as *const c_void,
            )
        };
        if granny_file.is_null() {
            bail!("read returned null");
        }
        let info_ptr = unsafe {
            safe_granny_get_file_info(self.fn_get_file_info, granny_file)
        };
        if info_ptr.is_null() {
            unsafe { safe_granny_free_file(self.fn_free_file, granny_file) };
            bail!("get_file_info returned null");
        }
        let mut ctx = SehSkeletonContext {
            sdk: self as *const Granny2Sdk,
            info_ptr,
            result: None,
        };
        let ret = unsafe {
            seh_try_call(
                seh_skeleton_callback,
                &mut ctx as *mut SehSkeletonContext as *mut c_void,
            )
        };
        unsafe { safe_granny_free_file(self.fn_free_file, granny_file) };
        if ret == -1 {
            bail!("SEH crash reading skeleton");
        }
        ctx.result.unwrap_or_else(|| bail!("no result"))
    }

    /// Read just the integer counts from a GR2 file — no pointer chasing.
    /// Returns (model_count, mesh_count, animation_count) or error.
    /// Much safer than read_file_info since it doesn't follow name pointers.
    pub fn read_file_counts(&self, data: &[u8]) -> Result<(i32, i32, i32)> {
        if data.len() < 16 {
            bail!("GR2 data too small");
        }
        let granny_file = unsafe {
            safe_granny_read_file(
                self.fn_read_file,
                data.len() as c_int,
                data.as_ptr() as *const c_void,
            )
        };
        if granny_file.is_null() {
            bail!("read returned null");
        }
        let info_ptr = unsafe {
            safe_granny_get_file_info(self.fn_get_file_info, granny_file)
        };
        if info_ptr.is_null() {
            unsafe { safe_granny_free_file(self.fn_free_file, granny_file) };
            bail!("get_file_info returned null");
        }
        // Read just the integer count fields — wrapped in SEH for safety
        let mut ctx = SehCountsContext {
            info_ptr,
            result: None,
        };
        let ret = unsafe {
            seh_try_call(
                seh_counts_callback,
                &mut ctx as *mut SehCountsContext as *mut c_void,
            )
        };
        unsafe { safe_granny_free_file(self.fn_free_file, granny_file) };
        if ret == -1 {
            bail!("SEH crash reading counts");
        }
        ctx.result.ok_or_else(|| anyhow::anyhow!("no result"))
    }

    /// Extract full mesh data (vertices + indices) from a GR2 file.
    /// The entire struct traversal is wrapped in SEH protection.
    pub fn read_meshes(&self, data: &[u8]) -> Result<Gr2Info> {
        if data.len() < 16 {
            bail!("GR2 data too small ({} bytes)", data.len());
        }

        let granny_file = unsafe {
            safe_granny_read_file(
                self.fn_read_file,
                data.len() as c_int,
                data.as_ptr() as *const c_void,
            )
        };
        if granny_file.is_null() {
            bail!("GrannyReadEntireFileFromMemory returned null (or SEH crash)");
        }

        let info_ptr = unsafe {
            safe_granny_get_file_info(self.fn_get_file_info, granny_file)
        };
        if info_ptr.is_null() {
            unsafe { safe_granny_free_file(self.fn_free_file, granny_file) };
            bail!("GrannyGetFileInfo returned null (or SEH crash)");
        }

        let mut ctx = SehExtractContext {
            sdk: self as *const Granny2Sdk,
            info_ptr,
            with_mesh_data: true,
            result: None,
        };
        let ret = unsafe {
            seh_try_call(
                seh_extract_callback,
                &mut ctx as *mut SehExtractContext as *mut c_void,
            )
        };

        unsafe { safe_granny_free_file(self.fn_free_file, granny_file) };

        if ret == -1 {
            bail!("SEH exception during GR2 mesh extraction (access violation caught)");
        }
        ctx.result.unwrap_or_else(|| bail!("extract returned no result"))
    }

    unsafe fn extract_info_from_ptr(&self, info: *mut GrannyFileInfo) -> Result<Gr2Info> {
        let info = &*info;

        let from_filename = if info.from_file_name.is_null() {
            None
        } else {
            let s = CStr::from_ptr(info.from_file_name).to_string_lossy().to_string();
            if s.is_empty() { None } else { Some(s) }
        };

        let models = self.read_models(info);
        let meshes = self.read_mesh_info(info);
        let animations = self.read_animation_names(info);
        let skeleton = self.read_skeleton(info);
        let textures = self.read_textures(info);
        let materials = self.read_materials(info);

        Ok(Gr2Info {
            from_filename,
            models,
            meshes,
            animations,
            skeleton,
            textures,
            materials,
        })
    }

    unsafe fn extract_with_meshes_from_ptr(&self, info: *mut GrannyFileInfo) -> Result<Gr2Info> {
        let info = &*info;

        let from_filename = if info.from_file_name.is_null() {
            None
        } else {
            let s = CStr::from_ptr(info.from_file_name).to_string_lossy().to_string();
            if s.is_empty() { None } else { Some(s) }
        };

        let models = self.read_models(info);
        let meshes = self.read_mesh_data(info);
        let animations = self.read_animation_names(info);
        let skeleton = self.read_skeleton(info);
        let textures = self.read_textures(info);
        let materials = self.read_materials(info);

        Ok(Gr2Info {
            from_filename,
            models,
            meshes,
            animations,
            skeleton,
            textures,
            materials,
        })
    }

    unsafe fn read_models(&self, info: &GrannyFileInfo) -> Vec<ModelInfo> {
        let mut out = Vec::new();
        if info.models.is_null() {
            return out;
        }
        for i in 0..info.model_count {
            let model = *info.models.add(i as usize);
            if model.is_null() {
                continue;
            }
            let model = &*model;
            let name = read_cstr(model.name);
            out.push(ModelInfo {
                name,
                mesh_count: model.mesh_binding_count as usize,
            });
        }
        out
    }

    unsafe fn read_mesh_info(&self, info: &GrannyFileInfo) -> Vec<MeshInfo> {
        let mut out = Vec::new();
        if info.meshes.is_null() {
            return out;
        }
        for i in 0..info.mesh_count {
            let mesh = *info.meshes.add(i as usize);
            if mesh.is_null() {
                continue;
            }
            let name = read_cstr((*mesh).name);
            let vc = safe_granny_get_mesh_count(self.fn_get_mesh_vertex_count, mesh) as usize;
            let tc = safe_granny_get_mesh_count(self.fn_get_mesh_triangle_count, mesh) as usize;
            let bbc = (*mesh).bone_binding_count as usize;

            out.push(MeshInfo {
                name,
                vertex_count: vc,
                triangle_count: tc,
                bone_binding_count: bbc,
                vertices: Vec::new(),
                indices: Vec::new(),
            });
        }
        out
    }

    unsafe fn read_mesh_data(&self, info: &GrannyFileInfo) -> Vec<MeshInfo> {
        let mut out = Vec::new();
        for i in 0..info.mesh_count {
            let mesh = *info.meshes.add(i as usize);
            if mesh.is_null() {
                continue;
            }
            let name = read_cstr((*mesh).name);
            let vc = safe_granny_get_mesh_count(self.fn_get_mesh_vertex_count, mesh);
            let tc = safe_granny_get_mesh_count(self.fn_get_mesh_triangle_count, mesh);
            if vc <= 0 || tc <= 0 {
                continue;
            }
            let vc = vc as usize;
            let tc = tc as usize;
            let bbc = (*mesh).bone_binding_count as usize;

            // Copy vertices to PNT332 format
            let mut vertices = vec![Pnt332Vertex::default(); vc];
            let ok = safe_granny_copy_mesh_vertices(
                self.fn_copy_mesh_vertices,
                mesh,
                self.pnt332_type as *const GrannyDataTypeDef,
                vertices.as_mut_ptr() as *mut c_void,
            );
            if ok == 0 {
                continue; // SEH crash during copy
            }

            // Copy indices as 32-bit
            let index_count = tc * 3;
            let mut indices = vec![0u32; index_count];
            let ok = safe_granny_copy_mesh_indices(
                self.fn_copy_mesh_indices,
                mesh,
                4,
                indices.as_mut_ptr() as *mut c_void,
            );
            if ok == 0 {
                continue; // SEH crash during copy
            }

            out.push(MeshInfo {
                name,
                vertex_count: vc,
                triangle_count: tc,
                bone_binding_count: bbc,
                vertices,
                indices,
            });
        }
        out
    }

    unsafe fn read_animation_names(&self, info: &GrannyFileInfo) -> Vec<String> {
        let mut out = Vec::new();
        for i in 0..info.animation_count {
            let anim = *info.animations.add(i as usize);
            if anim.is_null() {
                continue;
            }
            out.push(read_cstr((*anim).name));
        }
        out
    }

    unsafe fn read_skeleton(&self, info: &GrannyFileInfo) -> Option<SkeletonInfo> {
        if info.skeleton_count == 0 {
            return None;
        }
        let skel = *info.skeletons.add(0);
        if skel.is_null() {
            return None;
        }
        let skel = &*skel;
        let name = read_cstr(skel.name);
        let bone_count = skel.bone_count as usize;
        let mut bones = Vec::with_capacity(bone_count);
        for i in 0..bone_count {
            let bone = &*skel.bones.add(i);
            bones.push(BoneInfo {
                name: read_cstr(bone.name),
                parent_index: bone.parent_index,
                position: bone.local_transform.position,
                orientation: bone.local_transform.orientation,
            });
        }
        Some(SkeletonInfo { name, bone_count, bones })
    }

    unsafe fn read_textures(&self, info: &GrannyFileInfo) -> Vec<TextureInfo> {
        let mut out = Vec::new();
        if info.textures.is_null() || info.texture_count <= 0 {
            return out;
        }
        for i in 0..info.texture_count {
            let tex = *info.textures.add(i as usize);
            if tex.is_null() {
                continue;
            }
            let tex = &*(tex as *const GrannyTexture);
            out.push(TextureInfo {
                name: read_cstr(tex.name),
            });
        }
        out
    }

    unsafe fn read_materials(&self, info: &GrannyFileInfo) -> Vec<MaterialInfo> {
        let mut out = Vec::new();
        if info.materials.is_null() || info.material_count <= 0 {
            return out;
        }
        for i in 0..info.material_count {
            let mat = *info.materials.add(i as usize);
            if mat.is_null() {
                continue;
            }
            let mat = &*(mat as *const GrannyMaterial);
            let name = read_cstr(mat.name);
            let mut maps = Vec::new();
            if !mat.maps.is_null() && mat.map_count > 0 {
                for j in 0..mat.map_count {
                    let map = &*mat.maps.add(j as usize);
                    let usage = read_cstr(map.usage);
                    let material_name = if map.material.is_null() {
                        None
                    } else {
                        let sub_mat = &*map.material;
                        Some(read_cstr(sub_mat.name))
                    };
                    maps.push(MaterialMapInfo { usage, material_name });
                }
            }
            out.push(MaterialInfo { name, maps });
        }
        out
    }
}

// --- SEH-protected callback for struct traversal ---

/// Context passed through the C SEH wrapper to the extraction callback.
struct SehExtractContext {
    sdk: *const Granny2Sdk,
    info_ptr: *mut GrannyFileInfo,
    with_mesh_data: bool,
    result: Option<Result<Gr2Info>>,
}

/// Callback invoked inside C `__try/__except` by `seh_try_call`.
/// This function does all the dangerous raw pointer traversal.
unsafe extern "C" fn seh_extract_callback(context: *mut c_void) -> c_int {
    let ctx = &mut *(context as *mut SehExtractContext);
    let sdk = &*ctx.sdk;
    let result = if ctx.with_mesh_data {
        sdk.extract_with_meshes_from_ptr(ctx.info_ptr)
    } else {
        sdk.extract_info_from_ptr(ctx.info_ptr)
    };
    ctx.result = Some(result);
    0
}

/// Minimal context for reading just the integer counts.
struct SehCountsContext {
    info_ptr: *mut GrannyFileInfo,
    result: Option<(i32, i32, i32)>,
}

/// SEH-protected callback that reads only integer count fields.
unsafe extern "C" fn seh_counts_callback(context: *mut c_void) -> c_int {
    let ctx = &mut *(context as *mut SehCountsContext);
    let info = &*ctx.info_ptr;
    ctx.result = Some((info.model_count, info.mesh_count, info.animation_count));
    0
}

/// Context for skeleton-only extraction (minimal pointer chasing).
struct SehSkeletonContext {
    sdk: *const Granny2Sdk,
    info_ptr: *mut GrannyFileInfo,
    result: Option<Result<(Option<SkeletonInfo>, i32, i32, i32)>>,
}

/// SEH-protected callback that reads only skeleton + counts.
unsafe extern "C" fn seh_skeleton_callback(context: *mut c_void) -> c_int {
    let ctx = &mut *(context as *mut SehSkeletonContext);
    let sdk = &*ctx.sdk;
    let info = &*ctx.info_ptr;
    let skeleton = sdk.read_skeleton(info);
    ctx.result = Some(Ok((skeleton, info.model_count, info.mesh_count, info.animation_count)));
    0
}

/// Read a C string pointer, returning "(null)" for null pointers.
unsafe fn read_cstr(ptr: *const c_char) -> String {
    if ptr.is_null() {
        return "(null)".to_string();
    }
    CStr::from_ptr(ptr).to_string_lossy().to_string()
}

impl Gr2Info {
    /// Collect all searchable strings: model names, mesh names, animation names,
    /// skeleton name, and bone names.
    pub fn all_names(&self) -> Vec<&str> {
        let mut names = Vec::new();
        for m in &self.models {
            names.push(m.name.as_str());
        }
        for m in &self.meshes {
            names.push(m.name.as_str());
        }
        for a in &self.animations {
            names.push(a.as_str());
        }
        if let Some(ref skel) = self.skeleton {
            names.push(skel.name.as_str());
            for b in &skel.bones {
                names.push(b.name.as_str());
            }
        }
        names
    }
}
