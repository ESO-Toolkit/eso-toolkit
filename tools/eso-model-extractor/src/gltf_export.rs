//! glTF 2.0 export for extracted GR2 mesh data.
//!
//! Converts parsed GR2 meshes into standard glTF/GLB format that can be
//! loaded by Three.js, Blender, and other 3D tools.

use std::fs;
use std::path::Path;

use crate::error::{ExtractError, Result};
use crate::gr2::Gr2File;

/// Export a GR2 file's meshes to a glTF JSON file + separate .bin buffer.
pub fn export_gltf(gr2: &Gr2File, output_path: &Path) -> Result<()> {
    if gr2.meshes.is_empty() {
        return Err(ExtractError::GltfExportError(
            "No mesh data to export".into(),
        ));
    }

    let stem = output_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("model");
    let bin_filename = format!("{}.bin", stem);
    let bin_path = output_path.with_extension("bin");

    // Build the binary buffer containing all vertex and index data
    let mut bin_data: Vec<u8> = Vec::new();
    let mut buffer_views: Vec<serde_json::Value> = Vec::new();
    let mut accessors: Vec<serde_json::Value> = Vec::new();

    let mut gltf_meshes: Vec<serde_json::Value> = Vec::new();
    let mut nodes: Vec<serde_json::Value> = Vec::new();

    let mut accessor_index = 0u32;

    for (mesh_idx, mesh) in gr2.meshes.iter().enumerate() {
        if mesh.vertices.is_empty() {
            continue;
        }

        let vert_offset = bin_data.len();
        let mut pos_min = [f32::MAX; 3];
        let mut pos_max = [f32::MIN; 3];

        // Write vertex positions
        for v in &mesh.vertices {
            for i in 0..3 {
                pos_min[i] = pos_min[i].min(v.position[i]);
                pos_max[i] = pos_max[i].max(v.position[i]);
            }
            bin_data.extend_from_slice(&v.position[0].to_le_bytes());
            bin_data.extend_from_slice(&v.position[1].to_le_bytes());
            bin_data.extend_from_slice(&v.position[2].to_le_bytes());
        }

        let vert_size = bin_data.len() - vert_offset;

        // Position buffer view
        let pos_bv_idx = buffer_views.len();
        buffer_views.push(serde_json::json!({
            "buffer": 0,
            "byteOffset": vert_offset,
            "byteLength": vert_size,
            "target": 34962 // ARRAY_BUFFER
        }));

        // Position accessor
        let pos_acc_idx = accessor_index;
        accessors.push(serde_json::json!({
            "bufferView": pos_bv_idx,
            "componentType": 5126, // FLOAT
            "count": mesh.vertices.len(),
            "type": "VEC3",
            "min": pos_min,
            "max": pos_max
        }));
        accessor_index += 1;

        // Write normals if available
        let has_normals = mesh.vertices.iter().any(|v| {
            v.normal[0] != 0.0 || v.normal[1] != 0.0 || v.normal[2] != 0.0
        });

        let mut normal_acc_idx = None;
        if has_normals {
            let norm_offset = bin_data.len();
            for v in &mesh.vertices {
                bin_data.extend_from_slice(&v.normal[0].to_le_bytes());
                bin_data.extend_from_slice(&v.normal[1].to_le_bytes());
                bin_data.extend_from_slice(&v.normal[2].to_le_bytes());
            }
            let norm_size = bin_data.len() - norm_offset;

            let norm_bv_idx = buffer_views.len();
            buffer_views.push(serde_json::json!({
                "buffer": 0,
                "byteOffset": norm_offset,
                "byteLength": norm_size,
                "target": 34962
            }));

            normal_acc_idx = Some(accessor_index);
            accessors.push(serde_json::json!({
                "bufferView": norm_bv_idx,
                "componentType": 5126,
                "count": mesh.vertices.len(),
                "type": "VEC3"
            }));
            accessor_index += 1;
        }

        // Write UVs if available
        let has_uvs = mesh
            .vertices
            .iter()
            .any(|v| v.uv[0] != 0.0 || v.uv[1] != 0.0);

        let mut uv_acc_idx = None;
        if has_uvs {
            let uv_offset = bin_data.len();
            for v in &mesh.vertices {
                bin_data.extend_from_slice(&v.uv[0].to_le_bytes());
                bin_data.extend_from_slice(&v.uv[1].to_le_bytes());
            }
            let uv_size = bin_data.len() - uv_offset;

            let uv_bv_idx = buffer_views.len();
            buffer_views.push(serde_json::json!({
                "buffer": 0,
                "byteOffset": uv_offset,
                "byteLength": uv_size,
                "target": 34962
            }));

            uv_acc_idx = Some(accessor_index);
            accessors.push(serde_json::json!({
                "bufferView": uv_bv_idx,
                "componentType": 5126,
                "count": mesh.vertices.len(),
                "type": "VEC2"
            }));
            accessor_index += 1;
        }

        // Write index buffer if available
        let mut index_acc_idx = None;
        if !mesh.triangles.is_empty() {
            // Pad to 4-byte alignment
            while bin_data.len() % 4 != 0 {
                bin_data.push(0);
            }

            let idx_offset = bin_data.len();
            let max_idx = mesh.vertices.len() as u32;
            let use_u16 = max_idx <= 65535;

            let index_count = mesh.triangles.len() * 3;

            if use_u16 {
                for tri in &mesh.triangles {
                    bin_data.extend_from_slice(&(tri[0] as u16).to_le_bytes());
                    bin_data.extend_from_slice(&(tri[1] as u16).to_le_bytes());
                    bin_data.extend_from_slice(&(tri[2] as u16).to_le_bytes());
                }
            } else {
                for tri in &mesh.triangles {
                    bin_data.extend_from_slice(&tri[0].to_le_bytes());
                    bin_data.extend_from_slice(&tri[1].to_le_bytes());
                    bin_data.extend_from_slice(&tri[2].to_le_bytes());
                }
            }

            let idx_size = bin_data.len() - idx_offset;

            let idx_bv_idx = buffer_views.len();
            buffer_views.push(serde_json::json!({
                "buffer": 0,
                "byteOffset": idx_offset,
                "byteLength": idx_size,
                "target": 34963 // ELEMENT_ARRAY_BUFFER
            }));

            index_acc_idx = Some(accessor_index);
            accessors.push(serde_json::json!({
                "bufferView": idx_bv_idx,
                "componentType": if use_u16 { 5123 } else { 5125 }, // UNSIGNED_SHORT or UNSIGNED_INT
                "count": index_count,
                "type": "SCALAR"
            }));
            accessor_index += 1;
        }

        // Build primitive attributes
        let mut attributes = serde_json::json!({
            "POSITION": pos_acc_idx
        });

        if let Some(idx) = normal_acc_idx {
            attributes["NORMAL"] = serde_json::json!(idx);
        }
        if let Some(idx) = uv_acc_idx {
            attributes["TEXCOORD_0"] = serde_json::json!(idx);
        }

        let mut primitive = serde_json::json!({
            "attributes": attributes,
            "mode": 4 // TRIANGLES
        });

        if let Some(idx) = index_acc_idx {
            primitive["indices"] = serde_json::json!(idx);
        }

        gltf_meshes.push(serde_json::json!({
            "name": mesh.name,
            "primitives": [primitive]
        }));

        nodes.push(serde_json::json!({
            "name": mesh.name,
            "mesh": mesh_idx
        }));
    }

    if gltf_meshes.is_empty() {
        return Err(ExtractError::GltfExportError(
            "No valid meshes to export".into(),
        ));
    }

    // Build node indices for the scene
    let node_indices: Vec<u32> = (0..nodes.len() as u32).collect();

    // Assemble glTF JSON
    let gltf = serde_json::json!({
        "asset": {
            "version": "2.0",
            "generator": "eso-model-extractor"
        },
        "scene": 0,
        "scenes": [{
            "name": stem,
            "nodes": node_indices
        }],
        "nodes": nodes,
        "meshes": gltf_meshes,
        "accessors": accessors,
        "bufferViews": buffer_views,
        "buffers": [{
            "uri": bin_filename,
            "byteLength": bin_data.len()
        }]
    });

    // Write files
    let gltf_json = serde_json::to_string_pretty(&gltf).map_err(|e| {
        ExtractError::GltfExportError(format!("JSON serialization failed: {}", e))
    })?;

    if let Some(parent) = output_path.parent() {
        fs::create_dir_all(parent)?;
    }

    fs::write(output_path, gltf_json)?;
    fs::write(&bin_path, &bin_data)?;

    tracing::info!(
        "Exported glTF: {} ({} meshes, {} bytes buffer)",
        output_path.display(),
        gltf_meshes.len(),
        bin_data.len()
    );

    Ok(())
}

/// Export to GLB (binary glTF) — a single self-contained file.
pub fn export_glb(gr2: &Gr2File, output_path: &Path) -> Result<()> {
    if gr2.meshes.is_empty() {
        return Err(ExtractError::GltfExportError(
            "No mesh data to export".into(),
        ));
    }

    // Build the same structure as glTF but embed the buffer
    // For now, delegate to glTF and note GLB as future work
    let gltf_path = output_path.with_extension("gltf");
    export_gltf(gr2, &gltf_path)?;

    tracing::info!(
        "GLB export: generated glTF pair at {}. \
         For single-file GLB, use: gltf-transform merge {} {}",
        gltf_path.display(),
        gltf_path.display(),
        output_path.display()
    );

    Ok(())
}

/// Export a Granny SDK Gr2Info (with mesh data) to glTF.
pub fn export_sdk_gltf(info: &crate::granny::Gr2Info, output_path: &Path) -> Result<()> {
    let meshes_with_data: Vec<_> = info.meshes.iter().filter(|m| !m.vertices.is_empty()).collect();
    if meshes_with_data.is_empty() {
        return Err(ExtractError::GltfExportError("No mesh data to export".into()));
    }

    let stem = output_path.file_stem().and_then(|s| s.to_str()).unwrap_or("model");
    let bin_filename = format!("{}.bin", stem);
    let bin_path = output_path.with_extension("bin");

    let mut bin_data: Vec<u8> = Vec::new();
    let mut buffer_views: Vec<serde_json::Value> = Vec::new();
    let mut accessors: Vec<serde_json::Value> = Vec::new();
    let mut gltf_meshes: Vec<serde_json::Value> = Vec::new();
    let mut nodes: Vec<serde_json::Value> = Vec::new();
    let mut accessor_index = 0u32;

    for (mesh_idx, mesh) in meshes_with_data.iter().enumerate() {
        let vert_offset = bin_data.len();
        let mut pos_min = [f32::MAX; 3];
        let mut pos_max = [f32::MIN; 3];

        // Positions
        for v in &mesh.vertices {
            for i in 0..3 {
                pos_min[i] = pos_min[i].min(v.position[i]);
                pos_max[i] = pos_max[i].max(v.position[i]);
            }
            for &c in &v.position {
                bin_data.extend_from_slice(&c.to_le_bytes());
            }
        }
        let vert_size = bin_data.len() - vert_offset;
        let pos_bv = buffer_views.len();
        buffer_views.push(serde_json::json!({"buffer":0,"byteOffset":vert_offset,"byteLength":vert_size,"target":34962}));
        let pos_acc = accessor_index;
        accessors.push(serde_json::json!({"bufferView":pos_bv,"componentType":5126,"count":mesh.vertices.len(),"type":"VEC3","min":pos_min,"max":pos_max}));
        accessor_index += 1;

        // Normals
        let has_normals = mesh.vertices.iter().any(|v| v.normal != [0.0; 3]);
        let mut normal_acc = None;
        if has_normals {
            let off = bin_data.len();
            for v in &mesh.vertices {
                for &c in &v.normal { bin_data.extend_from_slice(&c.to_le_bytes()); }
            }
            let sz = bin_data.len() - off;
            let bv = buffer_views.len();
            buffer_views.push(serde_json::json!({"buffer":0,"byteOffset":off,"byteLength":sz,"target":34962}));
            normal_acc = Some(accessor_index);
            accessors.push(serde_json::json!({"bufferView":bv,"componentType":5126,"count":mesh.vertices.len(),"type":"VEC3"}));
            accessor_index += 1;
        }

        // UVs
        let has_uvs = mesh.vertices.iter().any(|v| v.uv != [0.0; 2]);
        let mut uv_acc = None;
        if has_uvs {
            let off = bin_data.len();
            for v in &mesh.vertices {
                for &c in &v.uv { bin_data.extend_from_slice(&c.to_le_bytes()); }
            }
            let sz = bin_data.len() - off;
            let bv = buffer_views.len();
            buffer_views.push(serde_json::json!({"buffer":0,"byteOffset":off,"byteLength":sz,"target":34962}));
            uv_acc = Some(accessor_index);
            accessors.push(serde_json::json!({"bufferView":bv,"componentType":5126,"count":mesh.vertices.len(),"type":"VEC2"}));
            accessor_index += 1;
        }

        // Indices (flat u32 array → glTF)
        let mut index_acc = None;
        if !mesh.indices.is_empty() {
            while bin_data.len() % 4 != 0 { bin_data.push(0); }
            let off = bin_data.len();
            let max_idx = mesh.vertices.len() as u32;
            let use_u16 = max_idx <= 65535;
            if use_u16 {
                for &idx in &mesh.indices { bin_data.extend_from_slice(&(idx as u16).to_le_bytes()); }
            } else {
                for &idx in &mesh.indices { bin_data.extend_from_slice(&idx.to_le_bytes()); }
            }
            let sz = bin_data.len() - off;
            let bv = buffer_views.len();
            buffer_views.push(serde_json::json!({"buffer":0,"byteOffset":off,"byteLength":sz,"target":34963}));
            index_acc = Some(accessor_index);
            accessors.push(serde_json::json!({"bufferView":bv,"componentType":if use_u16{5123}else{5125},"count":mesh.indices.len(),"type":"SCALAR"}));
            accessor_index += 1;
        }

        let mut attributes = serde_json::json!({"POSITION": pos_acc});
        if let Some(i) = normal_acc { attributes["NORMAL"] = serde_json::json!(i); }
        if let Some(i) = uv_acc { attributes["TEXCOORD_0"] = serde_json::json!(i); }

        let mut primitive = serde_json::json!({"attributes": attributes, "mode": 4});
        if let Some(i) = index_acc { primitive["indices"] = serde_json::json!(i); }

        gltf_meshes.push(serde_json::json!({"name": mesh.name, "primitives": [primitive]}));
        nodes.push(serde_json::json!({"name": mesh.name, "mesh": mesh_idx}));
    }

    let node_indices: Vec<u32> = (0..nodes.len() as u32).collect();
    let gltf = serde_json::json!({
        "asset": {"version": "2.0", "generator": "eso-model-extractor (Granny SDK)"},
        "scene": 0,
        "scenes": [{"name": stem, "nodes": node_indices}],
        "nodes": nodes,
        "meshes": gltf_meshes,
        "accessors": accessors,
        "bufferViews": buffer_views,
        "buffers": [{"uri": bin_filename, "byteLength": bin_data.len()}]
    });

    let gltf_json = serde_json::to_string_pretty(&gltf)
        .map_err(|e| ExtractError::GltfExportError(format!("JSON serialization failed: {}", e)))?;

    if let Some(parent) = output_path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(output_path, gltf_json)?;
    fs::write(&bin_path, &bin_data)?;

    Ok(())
}

/// Export a Granny SDK Gr2Info to a single self-contained GLB (binary glTF) file.
pub fn export_sdk_glb(info: &crate::granny::Gr2Info, output_path: &Path) -> Result<()> {
    let meshes_with_data: Vec<_> = info.meshes.iter().filter(|m| !m.vertices.is_empty()).collect();
    if meshes_with_data.is_empty() {
        return Err(ExtractError::GltfExportError("No mesh data to export".into()));
    }

    let stem = output_path.file_stem().and_then(|s| s.to_str()).unwrap_or("model");

    let mut bin_data: Vec<u8> = Vec::new();
    let mut buffer_views: Vec<serde_json::Value> = Vec::new();
    let mut accessors: Vec<serde_json::Value> = Vec::new();
    let mut gltf_meshes: Vec<serde_json::Value> = Vec::new();
    let mut nodes: Vec<serde_json::Value> = Vec::new();
    let mut accessor_index = 0u32;

    for (mesh_idx, mesh) in meshes_with_data.iter().enumerate() {
        let vert_offset = bin_data.len();
        let mut pos_min = [f32::MAX; 3];
        let mut pos_max = [f32::MIN; 3];

        for v in &mesh.vertices {
            for i in 0..3 {
                pos_min[i] = pos_min[i].min(v.position[i]);
                pos_max[i] = pos_max[i].max(v.position[i]);
            }
            for &c in &v.position { bin_data.extend_from_slice(&c.to_le_bytes()); }
        }
        let vert_size = bin_data.len() - vert_offset;
        let pos_bv = buffer_views.len();
        buffer_views.push(serde_json::json!({"buffer":0,"byteOffset":vert_offset,"byteLength":vert_size,"target":34962}));
        let pos_acc = accessor_index;
        accessors.push(serde_json::json!({"bufferView":pos_bv,"componentType":5126,"count":mesh.vertices.len(),"type":"VEC3","min":pos_min,"max":pos_max}));
        accessor_index += 1;

        let has_normals = mesh.vertices.iter().any(|v| v.normal != [0.0; 3]);
        let mut normal_acc = None;
        if has_normals {
            let off = bin_data.len();
            for v in &mesh.vertices { for &c in &v.normal { bin_data.extend_from_slice(&c.to_le_bytes()); } }
            let sz = bin_data.len() - off;
            let bv = buffer_views.len();
            buffer_views.push(serde_json::json!({"buffer":0,"byteOffset":off,"byteLength":sz,"target":34962}));
            normal_acc = Some(accessor_index);
            accessors.push(serde_json::json!({"bufferView":bv,"componentType":5126,"count":mesh.vertices.len(),"type":"VEC3"}));
            accessor_index += 1;
        }

        let has_uvs = mesh.vertices.iter().any(|v| v.uv != [0.0; 2]);
        let mut uv_acc = None;
        if has_uvs {
            let off = bin_data.len();
            for v in &mesh.vertices { for &c in &v.uv { bin_data.extend_from_slice(&c.to_le_bytes()); } }
            let sz = bin_data.len() - off;
            let bv = buffer_views.len();
            buffer_views.push(serde_json::json!({"buffer":0,"byteOffset":off,"byteLength":sz,"target":34962}));
            uv_acc = Some(accessor_index);
            accessors.push(serde_json::json!({"bufferView":bv,"componentType":5126,"count":mesh.vertices.len(),"type":"VEC2"}));
            accessor_index += 1;
        }

        let mut index_acc = None;
        if !mesh.indices.is_empty() {
            while bin_data.len() % 4 != 0 { bin_data.push(0); }
            let off = bin_data.len();
            let max_idx = mesh.vertices.len() as u32;
            let use_u16 = max_idx <= 65535;
            if use_u16 {
                for &idx in &mesh.indices { bin_data.extend_from_slice(&(idx as u16).to_le_bytes()); }
            } else {
                for &idx in &mesh.indices { bin_data.extend_from_slice(&idx.to_le_bytes()); }
            }
            let sz = bin_data.len() - off;
            let bv = buffer_views.len();
            buffer_views.push(serde_json::json!({"buffer":0,"byteOffset":off,"byteLength":sz,"target":34963}));
            index_acc = Some(accessor_index);
            accessors.push(serde_json::json!({"bufferView":bv,"componentType":if use_u16{5123}else{5125},"count":mesh.indices.len(),"type":"SCALAR"}));
            accessor_index += 1;
        }

        let mut attributes = serde_json::json!({"POSITION": pos_acc});
        if let Some(i) = normal_acc { attributes["NORMAL"] = serde_json::json!(i); }
        if let Some(i) = uv_acc { attributes["TEXCOORD_0"] = serde_json::json!(i); }

        let mut primitive = serde_json::json!({"attributes": attributes, "mode": 4});
        if let Some(i) = index_acc { primitive["indices"] = serde_json::json!(i); }

        gltf_meshes.push(serde_json::json!({"name": mesh.name, "primitives": [primitive]}));
        nodes.push(serde_json::json!({"name": mesh.name, "mesh": mesh_idx}));
    }

    let node_indices: Vec<u32> = (0..nodes.len() as u32).collect();

    // GLB: buffer has no URI (embedded)
    let gltf = serde_json::json!({
        "asset": {"version": "2.0", "generator": "eso-model-extractor (Granny SDK)"},
        "scene": 0,
        "scenes": [{"name": stem, "nodes": node_indices}],
        "nodes": nodes,
        "meshes": gltf_meshes,
        "accessors": accessors,
        "bufferViews": buffer_views,
        "buffers": [{"byteLength": bin_data.len()}]
    });

    let json_bytes = serde_json::to_vec(&gltf)
        .map_err(|e| ExtractError::GltfExportError(format!("JSON serialization failed: {}", e)))?;

    // Pad JSON chunk to 4-byte alignment with spaces
    let json_padded_len = (json_bytes.len() + 3) & !3;
    let mut json_chunk = json_bytes;
    json_chunk.resize(json_padded_len, b' ');

    // Pad BIN chunk to 4-byte alignment with zeros
    let bin_padded_len = (bin_data.len() + 3) & !3;
    let mut bin_chunk = bin_data;
    bin_chunk.resize(bin_padded_len, 0);

    // GLB header: magic + version + length
    let total_len = 12 + 8 + json_chunk.len() + 8 + bin_chunk.len();
    let mut glb = Vec::with_capacity(total_len);

    // Header
    glb.extend_from_slice(b"glTF");                          // magic
    glb.extend_from_slice(&2u32.to_le_bytes());               // version
    glb.extend_from_slice(&(total_len as u32).to_le_bytes()); // total length

    // JSON chunk
    glb.extend_from_slice(&(json_chunk.len() as u32).to_le_bytes()); // chunk length
    glb.extend_from_slice(&0x4E4F534Au32.to_le_bytes());             // chunk type "JSON"
    glb.extend_from_slice(&json_chunk);

    // BIN chunk
    glb.extend_from_slice(&(bin_chunk.len() as u32).to_le_bytes()); // chunk length
    glb.extend_from_slice(&0x004E4942u32.to_le_bytes());            // chunk type "BIN\0"
    glb.extend_from_slice(&bin_chunk);

    if let Some(parent) = output_path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(output_path, &glb)?;

    Ok(())
}
