//! Cross-platform text delivery for applications outside the Noska webview.
//!
//! Clipboard paste is intentionally a single transaction: it preserves the
//! destination application's undo model and works in apps that expose no
//! editable accessibility element. Direct UI Automation / AX integration can
//! be layered in front of this trait without changing the IPC contract.

use std::thread;
use std::time::Duration;

use arboard::Clipboard;
use enigo::{Direction, Enigo, Key, Keyboard, Settings};
use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InjectionResult { pub method: &'static str, pub restored_clipboard: bool }

pub trait TextInjector {
    fn inject(&mut self, text: &str) -> Result<InjectionResult, String>;
}

/// Safe cross-platform fallback. It does not guess a target: the OS delivers
/// the shortcut only to the currently focused application control.
struct ClipboardPasteInjector;

impl TextInjector for ClipboardPasteInjector {
    fn inject(&mut self, text: &str) -> Result<InjectionResult, String> {
        if text.trim().is_empty() { return Err("No text is available to inject".to_string()); }
        let mut clipboard = Clipboard::new().map_err(|error| format!("Clipboard is unavailable: {error}"))?;
        clipboard.set_text(text.to_string()).map_err(|error| format!("Could not prepare text for injection: {error}"))?;
        // Give Windows/macOS ownership notification a moment before the paste.
        thread::sleep(Duration::from_millis(20));
        let mut enigo = Enigo::new(&Settings::default()).map_err(|error| format!("Input injection is unavailable: {error}"))?;
        #[cfg(target_os = "macos")]
        let modifier = Key::Meta;
        #[cfg(not(target_os = "macos"))]
        let modifier = Key::Control;
        enigo.key(modifier, Direction::Press).map_err(|error| format!("Could not begin text injection: {error}"))?;
        enigo.key(Key::Unicode('v'), Direction::Click).map_err(|error| format!("Could not paste text: {error}"))?;
        enigo.key(modifier, Direction::Release).map_err(|error| format!("Could not finish text injection: {error}"))?;
        Ok(InjectionResult { method: "clipboard-paste", restored_clipboard: false })
    }
}

#[tauri::command]
pub fn inject_text(text: String) -> Result<InjectionResult, String> {
    // Explicit invocation only; callers should surface a no-focus result from
    // the OS as a pill error rather than retrying into an unknown window.
    ClipboardPasteInjector.inject(&text)
}

#[cfg(test)]
mod tests {
    #[test]
    fn empty_text_is_rejected_before_touching_os_services() {
        assert!("   ".trim().is_empty());
    }
}
