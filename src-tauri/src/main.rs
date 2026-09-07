// Prevents an extra console/terminal window on Windows in all builds.
#![windows_subsystem = "windows"]

fn main() {
    noska_lib::run()
}
