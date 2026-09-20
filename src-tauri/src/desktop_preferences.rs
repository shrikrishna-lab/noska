use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq)]
#[serde(default, rename_all = "camelCase")]
pub struct DesktopPreferences {
    pub close_to_tray: bool,
    pub autostart: bool,
    pub launch_minimized: bool,
    pub notifications_paused: bool,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DesktopPreferencesPatch {
    pub close_to_tray: Option<bool>,
    pub autostart: Option<bool>,
    pub launch_minimized: Option<bool>,
    pub notifications_paused: Option<bool>,
}

impl DesktopPreferences {
    pub fn apply(&mut self, patch: DesktopPreferencesPatch) {
        if let Some(value) = patch.close_to_tray {
            self.close_to_tray = value;
        }
        if let Some(value) = patch.autostart {
            self.autostart = value;
        }
        if let Some(value) = patch.launch_minimized {
            self.launch_minimized = value;
        }
        if let Some(value) = patch.notifications_paused {
            self.notifications_paused = value;
        }
    }

    pub fn hide_on_launch(&self, args: &[String]) -> bool {
        self.autostart
            && self.launch_minimized
            && args.iter().any(|arg| arg == "--autostart")
            && !args.iter().any(|arg| arg.starts_with("noska://"))
    }

    pub fn hide_on_close(&self, label: &str, tray_available: bool) -> bool {
        label == "main" && tray_available && self.close_to_tray
    }
}

pub fn validate_unread_count(count: i64, user_id: Option<&str>) -> Result<u32, String> {
    let Some(user_id) = user_id else { return Ok(0); };
    if user_id.is_empty() || user_id.len() > 128 || user_id.chars().any(|ch| ch.is_whitespace() || ch.is_control()) {
        return Err("Invalid unread account identifier".into());
    }
    if !(0..=9999).contains(&count) {
        return Err("Unread count must be an integer from 0 to 9999".into());
    }
    Ok(count as u32)
}

pub fn apply_unread_count(
    current_user: &mut Option<String>,
    count: i64,
    user_id: Option<String>,
    mut render: impl FnMut(u32) -> Result<(), String>,
) -> Result<(), String> {
    let validated = validate_unread_count(count, user_id.as_deref());
    if validated.is_err() || *current_user != user_id || user_id.is_none() {
        *current_user = None;
        render(0)?;
    }
    let count = validated?;
    render(count)?;
    *current_user = user_id;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn unread_counts_validate_and_logout_clears() {
        assert_eq!(validate_unread_count(12, Some("account-a")), Ok(12));
        assert_eq!(validate_unread_count(9999, Some("account-b")), Ok(9999));
        assert_eq!(validate_unread_count(12, None), Ok(0));
        assert!(validate_unread_count(-1, Some("account-a")).is_err());
        assert!(validate_unread_count(10000, Some("account-a")).is_err());
        assert!(validate_unread_count(1, Some("")).is_err());
        assert!(validate_unread_count(1, Some("account\nname")).is_err());
        assert!(validate_unread_count(1, Some(&"a".repeat(129))).is_err());
    }

    #[test]
    fn defaults_are_opt_in() {
        let preferences = DesktopPreferences::default();
        assert!(!preferences.autostart);
        assert!(!preferences.close_to_tray);
        assert!(!preferences.launch_minimized);
        assert!(!preferences.notifications_paused);
    }

    #[test]
    fn patches_preserve_unspecified_preferences() {
        let mut preferences = DesktopPreferences {
            close_to_tray: true,
            ..Default::default()
        };
        preferences.apply(serde_json::from_str(r#"{"notificationsPaused":true}"#).unwrap());
        assert!(preferences.close_to_tray);
        assert!(preferences.notifications_paused);
        assert!(!preferences.autostart);
    }

    #[test]
    fn only_opted_in_autostart_launches_hide() {
        let preferences = DesktopPreferences {
            autostart: true,
            launch_minimized: true,
            ..Default::default()
        };
        assert!(preferences.hide_on_launch(&["--autostart".into()]));
        assert!(!preferences.hide_on_launch(&[]));
        assert!(!preferences.hide_on_launch(&["--autostart".into(), "noska://auth/callback".into()]));
        assert!(!DesktopPreferences::default().hide_on_launch(&["--autostart".into()]));
    }

    #[test]
    fn closing_auxiliary_windows_never_hides_them() {
        let preferences = DesktopPreferences {
            close_to_tray: true,
            ..Default::default()
        };
        assert!(preferences.hide_on_close("main", true));
        assert!(!preferences.hide_on_close("voice", true));
        assert!(!preferences.hide_on_close("widget", true));
        assert!(!preferences.hide_on_close("main", false));
    }

    #[test]
    fn persisted_preferences_round_trip_and_old_files_default() {
        let preferences: DesktopPreferences = serde_json::from_str(r#"{"closeToTray":true}"#).unwrap();
        assert!(!preferences.autostart);
        assert_eq!(preferences, serde_json::from_str::<DesktopPreferences>(&serde_json::to_string(&preferences).unwrap()).unwrap());
        assert!(serde_json::from_str::<DesktopPreferencesPatch>(r#"{"autostart":"true"}"#).is_err());
        assert!(serde_json::from_str::<DesktopPreferencesPatch>(r#"{"unknown":true}"#).is_err());
    }
}
