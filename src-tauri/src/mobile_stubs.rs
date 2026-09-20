//! Mobile stubs for desktop-only native commands.
//!
//! The frontend keeps a single IPC surface across every platform, so on
//! iOS/Android these stubs report "unavailable" instead of the commands
//! being missing — feature probes (e.g. the voice dictation
//! `capability_check`) degrade gracefully to the browser/SpeechRecognition
//! paths, and users never see an "unknown command" error.

use serde_json::{json, Value};

#[tauri::command]
pub fn set_desktop_unread_count() -> Result<(), String> {
    Err("Desktop unread counts are not available on mobile.".into())
}

#[tauri::command]
pub fn get_desktop_preferences() -> Result<Value, String> {
    Err("Desktop preferences are not available on mobile.".into())
}

#[tauri::command]
pub fn update_desktop_preferences() -> Result<Value, String> {
    Err("Desktop preferences are not available on mobile.".into())
}

#[tauri::command]
pub fn show_desktop_main() -> Result<(), String> {
    Err("Desktop windows are not available on mobile.".into())
}

#[tauri::command]
pub fn capability_check() -> Value {
    json!({
        "available": false,
        "realtime": false,
        "multilingual": false,
        "reason": "Local speech models are not available on mobile; Noska uses the on-device system speech recognizer.",
        "elapsedMs": null,
    })
}

#[tauri::command]
pub fn local_model_status() -> Result<Value, String> {
    Ok(json!({ "installed": false, "path": "", "bytes": null }))
}

#[tauri::command]
pub fn install_local_model() -> Result<(), String> {
    Err("Local speech models are not supported on mobile.".into())
}

#[tauri::command]
pub fn start_local_transcription(_session_id: String, _language: String) -> Result<(), String> {
    Err("Local transcription is not supported on mobile.".into())
}

#[tauri::command]
pub fn stop_local_transcription(_session_id: String) -> Result<(), String> {
    Err("Local transcription is not supported on mobile.".into())
}

#[tauri::command]
pub fn inject_text(_text: String) -> Result<Value, String> {
    Err("Text injection is not supported on mobile.".into())
}

#[tauri::command]
pub fn load_voice_dictionary() -> Result<Value, String> {
    Ok(json!({}))
}

#[tauri::command]
pub fn save_voice_dictionary(_dictionary: Value) -> Result<(), String> {
    Err("The voice dictionary is not persisted on mobile.".into())
}
