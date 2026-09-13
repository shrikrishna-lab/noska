//! Noska native shell (Tauri 2) — desktop AND mobile.
//!
//! Rust is ONLY the native layer: window, tray, deep links, notifications,
//! single-instance, auto-update. All Noska application logic stays in the
//! React + TypeScript frontend under `src/`.
//!
//! Platform split:
//! - Desktop (Windows/macOS/Linux): window menu, tray, single-instance,
//!   window-state, updater, local Whisper transcription, text injection.
//! - Mobile (iOS/Android): deep links + notifications; the desktop-only
//!   commands above resolve to graceful stubs (`mobile_stubs.rs`).

use tauri::{Emitter, Manager};

#[cfg(desktop)]
mod local_transcription;
#[cfg(desktop)]
mod text_injector;
#[cfg(desktop)]
mod voice_dictionary;
#[cfg(mobile)]
mod mobile_stubs;

use tauri_plugin_deep_link::DeepLinkExt;

// Desktop implementations of the shared command surface…
#[cfg(desktop)]
use local_transcription::{
    capability_check, install_local_model, local_model_status, start_local_transcription,
    stop_local_transcription,
};
#[cfg(desktop)]
use text_injector::inject_text;
#[cfg(desktop)]
use voice_dictionary::{load_voice_dictionary, save_voice_dictionary};

// …and the mobile stubs under the same names, so `generate_handler!` is
// identical on every platform.
#[cfg(mobile)]
use mobile_stubs::{
    capability_check, inject_text, install_local_model, load_voice_dictionary,
    local_model_status, save_voice_dictionary, start_local_transcription,
    stop_local_transcription,
};

/// Event emitted to the webview when a tray menu item is clicked.
/// Payload is the raw action id ("new-page" | "new-task" | "open-ai").
const TRAY_ACTION_EVENT: &str = "tray://action";
/// Event emitted to the webview when a `noska://` deep link is opened.
/// Payload: array of URL strings.
const DEEP_LINK_EVENT: &str = "deep-link://open-url";
/// Requests the Voice preferences surface from the native app menu.
const VOICE_SETTINGS_EVENT: &str = "voice://open-settings";

#[cfg(desktop)]
fn focus_main_window(app: &tauri::AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.unminimize();
        let _ = win.set_focus();
    }
}

fn emit_deep_links(app: &tauri::AppHandle, urls: Vec<String>) {
    if urls.is_empty() {
        return;
    }
    // Ensure the window is visible when launched via a deep link (desktop).
    #[cfg(desktop)]
    focus_main_window(app);
    // App-level broadcast — reaches the webview on every platform.
    let _ = app.emit(DEEP_LINK_EVENT, urls);
}

#[cfg(target_os = "macos")]
fn setup_app_menu(app: &tauri::App) -> tauri::Result<()> {
    use tauri::{
        menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    };
    let settings = MenuItem::with_id(app, "voice-settings", "Settings…", true, Some("CmdOrCtrl+,"))?;
    let quit = MenuItem::with_id(app, "quit-app", "Quit Noska", true, Some("CmdOrCtrl+Q"))?;
    let separator = PredefinedMenuItem::separator(app)?;
    let app_menu = Submenu::with_items(app, "Noska", true, &[&settings, &separator, &quit])?;
    let menu = Menu::with_items(app, &[&app_menu])?;
    app.set_menu(menu)?;
    app.on_menu_event(|handle, event| match event.id().as_ref() {
        "quit-app" => handle.exit(0),
        "voice-settings" => {
            focus_main_window(handle);
            if let Some(window) = handle.get_webview_window("main") {
                let _ = window.emit(VOICE_SETTINGS_EVENT, ());
            }
        }
        _ => {}
    });
    Ok(())
}

#[cfg(desktop)]
fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    use tauri::{
        menu::{Menu, MenuItem, PredefinedMenuItem},
        tray::TrayIconBuilder,
    };
    let open = MenuItem::with_id(app, "open", "Open Noska", true, None::<&str>)?;
    let new_page = MenuItem::with_id(app, "new-page", "New Page", true, None::<&str>)?;
    let new_task = MenuItem::with_id(app, "new-task", "New Task", true, None::<&str>)?;
    let open_ai = MenuItem::with_id(app, "open-ai", "Open AI", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit Noska", true, None::<&str>)?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let sep2 = PredefinedMenuItem::separator(app)?;

    let menu = Menu::with_items(
        app,
        &[&open, &sep1, &new_page, &new_task, &open_ai, &sep2, &quit],
    )?;

    TrayIconBuilder::with_id("noska-tray")
        .icon(app.default_window_icon().expect("missing window icon").clone())
        .tooltip("Noska")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "quit" => app.exit(0),
            "open" => focus_main_window(app),
            action => {
                // Forward to the frontend; routing/validation happens in TS.
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.emit(TRAY_ACTION_EVENT, action);
                }
            }
        })
        .build(app)?;
    Ok(())
}

fn setup_deep_links(app: &tauri::App) {
    let deep_link = app.deep_link();

    // Desktop: register the noska:// scheme at runtime. macOS has no
    // installer hook, so without this the browser cannot hand back to the
    // app (auth flow); on Windows/Linux it also self-heals dev builds and
    // registry drift. On iOS/Android schemes are declared statically in
    // Info.plist / AndroidManifest.xml (see scripts/patch-mobile-manifests.mjs).
    #[cfg(desktop)]
    let _ = deep_link.register_all();

    // Deep links received while this process was the launching process
    // (cold start: desktop argv/open event, or the mobile app being launched
    // via a link).
    if let Ok(Some(urls)) = deep_link.get_current() {
        let urls: Vec<String> = urls.iter().map(|u| u.to_string()).collect();
        if !urls.is_empty() {
            let handle = app.handle().clone();
            // The webview may not be ready yet; retry shortly from a plain
            // thread (never block Tauri's async runtime).
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_millis(1500));
                emit_deep_links(&handle, urls);
            });
        }
    }

    // Runtime deep links while the app is already running.
    let handle = app.handle().clone();
    app.deep_link().on_open_url(move |event| {
        let urls: Vec<String> = event.urls().iter().map(|u| u.to_string()).collect();
        emit_deep_links(&handle, urls);
    });
}

/// Mobile entry point: generates the JNI exports (Rust.create/start) the
/// generated Android shell calls after System.loadLibrary — without this the
/// APK crashes with UnsatisfiedLinkError on launch.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(desktop)]
    let builder = {
        let mut builder = tauri::Builder::default();

        // Second launch: focus the existing window and forward any deep-link
        // argv to it instead of starting a second instance.
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            focus_main_window(app);
            let urls: Vec<String> = argv
                .iter()
                .filter(|a| a.starts_with("noska://"))
                .cloned()
                .collect();
            emit_deep_links(app, urls);
        }));

        // Persist size/position but NOT the maximized flag: restoring
        // "maximized" onto a borderless (decorations:false, shadow:false)
        // window can collapse it to a degenerate size on Windows.
        builder = builder.plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(
                    tauri_plugin_window_state::StateFlags::all()
                        & !tauri_plugin_window_state::StateFlags::MAXIMIZED,
                )
                .build()
        )
            .plugin(tauri_plugin_updater::Builder::new().build())
            .plugin(tauri_plugin_process::init());

        builder
    };

    #[cfg(mobile)]
    let builder = tauri::Builder::default();

    builder
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_deep_link::init())
        .invoke_handler(tauri::generate_handler![
            capability_check,
            local_model_status,
            install_local_model,
            start_local_transcription,
            stop_local_transcription,
            inject_text,
            load_voice_dictionary,
            save_voice_dictionary,
        ])
        .setup(|app| {
            // Deep links work on every platform.
            setup_deep_links(app);

            #[cfg(desktop)]
            {
                #[cfg(target_os = "macos")]
                setup_app_menu(app)?;
                setup_tray(app)?;

                // Self-heal degenerate window-state restores (tiny/offscreen
                // window = corrupted or pre-borderless state file).
                if let Some(win) = app.get_webview_window("main") {
                    let size = win.outer_size().unwrap_or_default();
                    if size.width < 500 || size.height < 400 {
                        let _ = win.unmaximize();
                        let _ = win.set_size(tauri::LogicalSize::new(1280.0, 800.0));
                        let _ = win.center();
                        let _ = win.show();
                        let _ = win.set_focus();
                    }
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Noska");
}
