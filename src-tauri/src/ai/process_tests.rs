use super::process::{build_arguments, ExecutionPaths};
use std::ffi::OsString;
use std::path::Path;

#[test]
fn live_search_is_a_global_codex_option() {
    let paths = ExecutionPaths {
        work_dir: Path::new("work"),
        schema: Path::new("schema.json"),
        output: Path::new("output.json"),
        codex_home: Path::new("codex-home"),
    };
    let with_search = build_arguments(&paths, &[], true);
    let without_search = build_arguments(&paths, &[], false);
    assert_eq!(with_search.first(), Some(&OsString::from("--search")));
    assert_eq!(with_search.get(1), Some(&OsString::from("exec")));
    assert_eq!(without_search.first(), Some(&OsString::from("exec")));
}
