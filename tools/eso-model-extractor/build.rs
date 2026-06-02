fn main() {
    println!("cargo:rerun-if-changed=seh_wrapper.c");
    cc::Build::new()
        .file("seh_wrapper.c")
        .compile("seh_wrapper");
}
