// Gradle init script for Windows machines WITHOUT Developer Mode (no
// SeCreateSymbolicLinkPrivilege). The Tauri CLI packages the Rust .so into
// jniLibs via a symbolic link, which unprivileged Windows users cannot
// create. Workaround:
//
//   1. Copy the built library manually:
//      cp src-tauri/target/aarch64-linux-android/debug/libnoska_lib.so \
//         src-tauri/gen/android/app/src/main/jniLibs/arm64-v8a/
//   2. Run Gradle directly, skipping the rustBuild tasks (they would just
//      re-invoke the Tauri CLI and hit the symlink failure):
//
//      cd src-tauri/gen/android
//      ./gradlew assembleArm64Debug \
//        --init-script ../../scripts/android-skip-rust-build.init.gradle.kts
//
// CI (Linux/macOS runners) never needs this.

allprojects {
    afterEvaluate {
        tasks.configureEach {
            if (name.startsWith("rustBuild")) {
                onlyIf { false }
            }
        }
    }
}
