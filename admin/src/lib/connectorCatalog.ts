// Static catalog of the app connectors Noska supports (mirrors
// src/lib/connections/registry.ts in the main app — the admin app has no
// alias into it). Real per-connector connection counts come from the
// user_connections/connectors tables via useConnectorStats.
export interface CatalogConnector {
  id: string;
  name: string;
  category: string;
  dashboardUrl: string;
}

export const CONNECTOR_CATALOG: CatalogConnector[] = [
  { id: "github", name: "GitHub", category: "Engineering", dashboardUrl: "https://github.com/settings/connections/applications" },
  { id: "gitlab", name: "GitLab", category: "Engineering", dashboardUrl: "https://gitlab.com/-/profile/applications" },
  { id: "jira", name: "Jira", category: "Project Management", dashboardUrl: "https://id.atlassian.com/manage-profile/apps" },
  { id: "linear", name: "Linear", category: "Project Management", dashboardUrl: "https://linear.app/settings/api" },
  { id: "asana", name: "Asana", category: "Project Management", dashboardUrl: "https://app.asana.com/0/myapps" },
  { id: "trello", name: "Trello", category: "Project Management", dashboardUrl: "https://trello.com/power-ups/admin" },
  { id: "slack", name: "Slack", category: "Communication", dashboardUrl: "https://api.slack.com/apps" },
  { id: "discord", name: "Discord", category: "Communication", dashboardUrl: "https://discord.com/developers/applications" },
  { id: "figma", name: "Figma", category: "Design", dashboardUrl: "https://www.figma.com/settings" },
  { id: "google-drive", name: "Google Drive", category: "File Management", dashboardUrl: "https://console.cloud.google.com/apis/credentials" },
  { id: "google-sheets", name: "Google Sheets", category: "File Management", dashboardUrl: "https://console.cloud.google.com/apis/credentials" },
  { id: "dropbox", name: "Dropbox", category: "File Management", dashboardUrl: "https://www.dropbox.com/developers/apps" },
  { id: "zendesk", name: "Zendesk", category: "Productivity", dashboardUrl: "https://www.zendesk.com/developer/apps/" },
  { id: "confluence", name: "Confluence", category: "Productivity", dashboardUrl: "https://id.atlassian.com/manage-profile/apps" },
  { id: "vercel", name: "Vercel", category: "Engineering", dashboardUrl: "https://vercel.com/account/tokens" },
  { id: "sentry", name: "Sentry", category: "Engineering", dashboardUrl: "https://sentry.io/settings/account/api/auth-tokens" },
];
