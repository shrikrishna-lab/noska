//! Plain-file persistence for Noska Voice's personal dictionary.
use std::{fs, path::PathBuf};
use serde_json::Value;
use tauri::{AppHandle, Manager};

fn dictionary_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path().app_data_dir()
        .map(|directory| directory.join("dictionary.json"))
        .map_err(|error| format!("Unable to resolve dictionary path: {error}"))
}

#[tauri::command]
pub fn load_voice_dictionary(app: AppHandle) -> Result<Value, String> {
    let path = dictionary_path(&app)?;
    if !path.exists() { return Ok(serde_json::json!({ "version": 1, "entries": [] })); }
    let source = fs::read_to_string(path).map_err(|error| format!("Could not read dictionary: {error}"))?;
    serde_json::from_str(&source).map_err(|error| format!("Dictionary file is invalid JSON: {error}"))
}

#[tauri::command]
pub fn save_voice_dictionary(app: AppHandle, dictionary: Value) -> Result<(), String> {
    let path = dictionary_path(&app)?;
    let directory = path.parent().ok_or_else(|| "Invalid dictionary path".to_string())?;
    fs::create_dir_all(directory).map_err(|error| format!("Could not create dictionary directory: {error}"))?;
    let temporary = path.with_extension("json.partial");
    let content = serde_json::to_string_pretty(&dictionary).map_err(|error| format!("Could not encode dictionary: {error}"))?;
    fs::write(&temporary, content).map_err(|error| format!("Could not save dictionary: {error}"))?;
    fs::rename(temporary, path).map_err(|error| format!("Could not activate dictionary: {error}"))
}
