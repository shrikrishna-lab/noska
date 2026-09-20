use std::{fs, path::PathBuf, sync::{atomic::{AtomicBool, Ordering}, Mutex}};
use tauri::{menu::CheckMenuItem, AppHandle, Emitter, Manager, WebviewWindow};
use tauri_plugin_autostart::ManagerExt;

use crate::desktop_preferences::{DesktopPreferences, DesktopPreferencesPatch};

pub const PREFERENCES_EVENT: &str = "desktop://preferences-changed";
pub const ACTION_EVENT: &str = "desktop://action";
pub const ERROR_EVENT: &str = "desktop://error";

pub struct DesktopLifecycle {
    preferences: Mutex<DesktopPreferences>,
    pause_item: Mutex<Option<CheckMenuItem<tauri::Wry>>>,
    tray_available: AtomicBool,
    unread_user: Mutex<Option<String>>,
}

fn preferences_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path().app_config_dir()
        .map(|directory| directory.join("desktop-preferences.json"))
        .map_err(|error| format!("Unable to resolve desktop preferences: {error}"))
}

fn persist(app: &AppHandle, preferences: &DesktopPreferences) -> Result<(), String> {
    let path = preferences_path(app)?;
    let directory = path.parent().ok_or("Invalid desktop preferences path")?;
    fs::create_dir_all(directory).map_err(|error| format!("Could not create preferences directory: {error}"))?;
    let temporary = path.with_extension("json.partial");
    let content = serde_json::to_vec_pretty(preferences).map_err(|error| error.to_string())?;
    fs::write(&temporary, content).map_err(|error| format!("Could not save desktop preferences: {error}"))?;
    fs::rename(temporary, path).map_err(|error| format!("Could not activate desktop preferences: {error}"))
}

pub fn initialize(app: &AppHandle) -> Result<(), String> {
    let path = preferences_path(app)?;
    let mut preferences = match fs::read(path) {
        Ok(content) => serde_json::from_slice::<DesktopPreferences>(&content).unwrap_or_default(),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => DesktopPreferences::default(),
        Err(error) => return Err(format!("Could not read desktop preferences: {error}")),
    };
    preferences.autostart = app.autolaunch().is_enabled().unwrap_or(false);
    app.manage(DesktopLifecycle {
        preferences: Mutex::new(preferences),
        pause_item: Mutex::new(None),
        tray_available: AtomicBool::new(false),
        unread_user: Mutex::new(None),
    });
    Ok(())
}

pub fn register_tray(app: &AppHandle, pause_item: CheckMenuItem<tauri::Wry>) {
    let state = app.state::<DesktopLifecycle>();
    if let Ok(mut item) = state.pause_item.lock() {
        *item = Some(pause_item);
    }
    state.tray_available.store(true, Ordering::Relaxed);
}

pub fn preferences(app: &AppHandle) -> Result<DesktopPreferences, String> {
    let state = app.state::<DesktopLifecycle>();
    let mut preferences = state.preferences.lock().map_err(|_| "Desktop preferences are unavailable")?;
    preferences.autostart = app.autolaunch().is_enabled().map_err(|error| error.to_string())?;
    Ok(preferences.clone())
}

fn publish(app: &AppHandle, preferences: &DesktopPreferences) {
    let state = app.state::<DesktopLifecycle>();
    if let Ok(item) = state.pause_item.lock() {
        if let Some(item) = item.as_ref() {
            let _ = item.set_checked(preferences.notifications_paused);
        }
    }
    let _ = app.emit_to("main", PREFERENCES_EVENT, preferences);
}

fn update(app: &AppHandle, patch: DesktopPreferencesPatch) -> Result<DesktopPreferences, String> {
    let state = app.state::<DesktopLifecycle>();
    let mut current = state.preferences.lock().map_err(|_| "Desktop preferences are unavailable")?;
    let previous_autostart = app.autolaunch().is_enabled().map_err(|error| error.to_string())?;
    let mut next = current.clone();
    next.autostart = previous_autostart;
    next.apply(patch);
    if next.autostart != previous_autostart {
        if next.autostart {
            app.autolaunch().enable()
        } else {
            app.autolaunch().disable()
        }.map_err(|error| format!("Could not change autostart: {error}"))?;
    }
    if let Err(error) = persist(app, &next) {
        if next.autostart != previous_autostart {
            let rollback = if previous_autostart {
                app.autolaunch().enable()
            } else {
                app.autolaunch().disable()
            };
            if let Err(rollback_error) = rollback {
                return Err(format!("{error}; autostart rollback failed: {rollback_error}"));
            }
        }
        return Err(error);
    }
    *current = next.clone();
    drop(current);
    publish(app, &next);
    Ok(next)
}

pub fn toggle_pause(app: &AppHandle) {
    let result = preferences(app).and_then(|current| update(app, DesktopPreferencesPatch {
        notifications_paused: Some(!current.notifications_paused),
        ..Default::default()
    }));
    if let Err(error) = result {
        if let Ok(current) = preferences(app) {
            publish(app, &current);
        }
        let _ = app.emit_to("main", ERROR_EVENT, error);
    }
}

pub fn on_window_event(window: &tauri::Window, event: &tauri::WindowEvent) {
    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
        if let Some(state) = window.app_handle().try_state::<DesktopLifecycle>() {
            let should_hide = state.preferences.lock().map(|preferences| {
                preferences.hide_on_close(window.label(), state.tray_available.load(Ordering::Relaxed))
            }).unwrap_or(false);
            if should_hide && window.hide().is_ok() {
                api.prevent_close();
            }
        }
    }
}

pub fn apply_launch_visibility(app: &AppHandle) {
    let state = app.state::<DesktopLifecycle>();
    let args: Vec<String> = std::env::args().collect();
    let should_hide = state.preferences.lock().map(|preferences| {
        preferences.hide_on_launch(&args) && state.tray_available.load(Ordering::Relaxed)
    }).unwrap_or(false);
    if should_hide {
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.hide();
        }
    } else {
        crate::focus_main_window(app);
    }
}

fn require_main(window: &WebviewWindow) -> Result<(), String> {
    if window.label() == "main" {
        Ok(())
    } else {
        Err("Desktop lifecycle commands are only available in the main window".into())
    }
}

fn render_unread_count(app: &AppHandle, count: u32) -> Result<(), String> {
    let mut errors = Vec::new();
    if let Some(tray) = app.tray_by_id("noska-tray") {
        #[cfg(any(target_os = "windows", target_os = "macos"))]
        {
            let tooltip = if count == 0 { "Noska".to_string() } else { format!("Noska — {count} unread notifications") };
            if let Err(error) = tray.set_tooltip(Some(tooltip)) {
                errors.push(error.to_string());
            }
        }
        #[cfg(any(target_os = "macos", target_os = "linux"))]
        {
            let title = if count == 0 { None } else { Some(count.to_string()) };
            if let Err(error) = tray.set_title(title) {
                errors.push(error.to_string());
            }
        }
    }
    #[cfg(target_os = "macos")]
    if let Some(window) = app.get_webview_window("main") {
        if let Err(error) = window.set_badge_count(if count == 0 { None } else { Some(i64::from(count)) }) {
            errors.push(error.to_string());
        }
    }
    if errors.is_empty() { Ok(()) } else { Err(errors.join("; ")) }
}

#[tauri::command]
pub fn set_desktop_unread_count(app: AppHandle, window: WebviewWindow, count: i64, user_id: Option<String>) -> Result<(), String> {
    require_main(&window)?;
    let state = app.state::<DesktopLifecycle>();
    let mut current_user = state.unread_user.lock().map_err(|_| "Desktop unread state is unavailable")?;
    crate::desktop_preferences::apply_unread_count(&mut current_user, count, user_id, |value| {
        render_unread_count(&app, value)
    })
}

#[tauri::command]
pub fn get_desktop_preferences(app: AppHandle, window: WebviewWindow) -> Result<DesktopPreferences, String> {
    require_main(&window)?;
    preferences(&app)
}

#[tauri::command]
pub fn update_desktop_preferences(app: AppHandle, window: WebviewWindow, patch: DesktopPreferencesPatch) -> Result<DesktopPreferences, String> {
    require_main(&window)?;
    update(&app, patch)
}

#[tauri::command]
pub fn show_desktop_main(app: AppHandle, window: WebviewWindow) -> Result<(), String> {
    require_main(&window)?;
    let main = app.get_webview_window("main").ok_or("Main window is unavailable")?;
    main.show().map_err(|error| error.to_string())?;
    main.unminimize().map_err(|error| error.to_string())?;
    main.set_focus().map_err(|error| error.to_string())
}
