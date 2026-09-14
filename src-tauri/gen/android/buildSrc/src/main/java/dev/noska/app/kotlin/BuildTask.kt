import java.io.File
import org.apache.tools.ant.taskdefs.condition.Os
import org.gradle.api.DefaultTask
import org.gradle.api.GradleException
import org.gradle.api.logging.LogLevel
import org.gradle.api.tasks.Input
import org.gradle.api.tasks.TaskAction

open class BuildTask : DefaultTask() {
    @Input
    var rootDirRel: String? = null
    @Input
    var target: String? = null
    @Input
    var release: Boolean? = null

    @TaskAction
    fun assemble() {
        val rootDirRel = rootDirRel ?: throw GradleException("rootDirRel cannot be null")
        val target = target ?: throw GradleException("target cannot be null")
        val isRel = release ?: false
        val profile = if (isRel) "release" else "debug"
        val rootDir = File(project.projectDir, rootDirRel).canonicalFile

        val targetTriple = when(target) {
            "aarch64" -> "aarch64-linux-android"
            "armv7" -> "armv7-linux-androideabi"
            "i686" -> "i686-linux-android"
            "x86_64" -> "x86_64-linux-android"
            else -> target
        }

        val abiDirName = when(target) {
            "aarch64" -> "arm64-v8a"
            "armv7" -> "armeabi-v7a"
            "i686" -> "x86"
            "x86_64" -> "x86_64"
            else -> target
        }

        val destDir = File(project.projectDir, "src/main/jniLibs/$abiDirName")
        destDir.mkdirs()
        val destSo = File(destDir, "libnoska_lib.so")

        if (destSo.exists()) {
            println("[RustPlugin] Using existing $destSo")
            return
        }

        val srcSo = File(rootDir, "src-tauri/target/$targetTriple/$profile/libnoska_lib.so")
        if (srcSo.exists()) {
            srcSo.copyTo(destSo, overwrite = true)
            println("[RustPlugin] Copied $srcSo -> $destSo")
            return
        }

        // Fallback to any available prebuilt .so
        val jniLibsDir = File(project.projectDir, "src/main/jniLibs")
        val anyExistingSo = jniLibsDir.walkTopDown().firstOrNull { it.name == "libnoska_lib.so" && it != destSo }
        if (anyExistingSo != null && anyExistingSo.exists()) {
            anyExistingSo.copyTo(destSo, overwrite = true)
            println("[RustPlugin] Copied fallback from ${anyExistingSo} -> $destSo")
            return
        }

        val executable = """npm""";
        try {
            runTauriCli(executable)
        } catch (e: Exception) {
            if (Os.isFamily(Os.FAMILY_WINDOWS)) {
                // Try different Windows-specific extensions
                val fallbacks = listOf(
                    "$executable.exe",
                    "$executable.cmd",
                    "$executable.bat",
                )
                
                var lastException: Exception = e
                for (fallback in fallbacks) {
                    try {
                        runTauriCli(fallback)
                        return
                    } catch (fallbackException: Exception) {
                        lastException = fallbackException
                    }
                }
                throw lastException
            } else {
                throw e;
            }
        }
    }

    fun runTauriCli(executable: String) {
        val rootDirRel = rootDirRel ?: throw GradleException("rootDirRel cannot be null")
        val target = target ?: throw GradleException("target cannot be null")
        val release = release ?: throw GradleException("release cannot be null")
        val args = listOf("run", "--", "tauri", "android", "android-studio-script");

        project.exec {
            workingDir(File(project.projectDir, rootDirRel))
            executable(executable)
            args(args)
            if (project.logger.isEnabled(LogLevel.DEBUG)) {
                args("-vv")
            } else if (project.logger.isEnabled(LogLevel.INFO)) {
                args("-v")
            }
            if (release) {
                args("--release")
            }
            args(listOf("--target", target))
        }.assertNormalExitValue()
    }
}