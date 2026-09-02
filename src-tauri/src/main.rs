// Tauri is a GUI application: never open an extra console window on Windows.
#![cfg_attr(target_os = "windows", windows_subsystem = "windows")]

fn main() {
    zhishi_lib::run();
}
