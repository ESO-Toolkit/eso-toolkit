/**
 * SEH wrapper for Oodle and Granny2 FFI calls.
 *
 * Windows __try/__except is the only way to catch access violations
 * from DLL calls. Rust's catch_unwind only handles Rust panics.
 */
#include <windows.h>

/* ── Oodle ── */

typedef int (__stdcall *OodleDecompressFn)(
    const unsigned char* compressed, int compressed_size,
    unsigned char* output, int output_size,
    int a, int b, int c,
    size_t d, size_t e, size_t f, size_t g, size_t h, size_t i,
    int thread_module
);

int safe_oodle_decompress(
    OodleDecompressFn fn_ptr,
    const unsigned char* compressed, int compressed_size,
    unsigned char* output, int output_size
) {
    __try {
        return fn_ptr(
            compressed, compressed_size,
            output, output_size,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 3
        );
    } __except(EXCEPTION_EXECUTE_HANDLER) {
        return -999;
    }
}

/* ── Granny2 ── */

typedef void* (__stdcall *GrannyReadEntireFileFromMemoryFn)(int, void*);
typedef void* (__stdcall *GrannyGetFileInfoFn)(void*);
typedef void  (__stdcall *GrannyFreeFileFn)(void*);
typedef int   (__stdcall *GrannyGetIntFromMeshFn)(void*);
typedef void  (__stdcall *GrannyCopyMeshVerticesFn)(void*, void*, void*);
typedef void  (__stdcall *GrannyCopyMeshIndicesFn)(void*, int, void*);

/*
 * Read a GR2 from memory with SEH protection.
 * Returns granny_file pointer (caller must free) or NULL on crash.
 */
void* safe_granny_read_file(
    GrannyReadEntireFileFromMemoryFn read_fn,
    int data_size, void* data
) {
    __try {
        return read_fn(data_size, data);
    } __except(EXCEPTION_EXECUTE_HANDLER) {
        return NULL;
    }
}

/*
 * Get file info with SEH protection.
 * Returns granny_file_info pointer or NULL on crash.
 */
void* safe_granny_get_file_info(
    GrannyGetFileInfoFn get_info_fn,
    void* granny_file
) {
    __try {
        return get_info_fn(granny_file);
    } __except(EXCEPTION_EXECUTE_HANDLER) {
        return NULL;
    }
}

/* Free a granny file with SEH protection. */
void safe_granny_free_file(GrannyFreeFileFn free_fn, void* granny_file) {
    __try {
        if (granny_file) free_fn(granny_file);
    } __except(EXCEPTION_EXECUTE_HANDLER) {
        /* swallow */
    }
}

/* Get mesh vertex count with SEH protection. Returns -1 on crash. */
int safe_granny_get_mesh_count(GrannyGetIntFromMeshFn fn, void* mesh) {
    __try {
        return fn(mesh);
    } __except(EXCEPTION_EXECUTE_HANDLER) {
        return -1;
    }
}

/* Copy mesh vertices with SEH protection. Returns 1 on success, 0 on crash. */
int safe_granny_copy_mesh_vertices(
    GrannyCopyMeshVerticesFn fn, void* mesh, void* vertex_type, void* buffer
) {
    __try {
        fn(mesh, vertex_type, buffer);
        return 1;
    } __except(EXCEPTION_EXECUTE_HANDLER) {
        return 0;
    }
}

/* Copy mesh indices with SEH protection. Returns 1 on success, 0 on crash. */
int safe_granny_copy_mesh_indices(
    GrannyCopyMeshIndicesFn fn, void* mesh, int bytes_per_index, void* buffer
) {
    __try {
        fn(mesh, bytes_per_index, buffer);
        return 1;
    } __except(EXCEPTION_EXECUTE_HANDLER) {
        return 0;
    }
}

/* ── Generic SEH callback wrapper ── */

typedef int (*SafeCallbackFn)(void* context);

/*
 * Execute an arbitrary function pointer inside __try/__except.
 * The callback receives a context pointer and returns 0 on success, nonzero on error.
 * Returns -1 if an SEH exception (access violation, etc.) occurs.
 */
int seh_try_call(SafeCallbackFn fn, void* context) {
    __try {
        return fn(context);
    } __except(EXCEPTION_EXECUTE_HANDLER) {
        return -1;
    }
}
