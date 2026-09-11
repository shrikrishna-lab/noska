/**
 * Ecosystem Connector Registry
 *
 * Defines the initial catalog of 28+ ecosystem-first connectors where multiple
 * related services (e.g. Gmail, Drive, Calendar, Docs, Sheets in Google Workspace)
 * live under a single ecosystem connection.
 */

import type { EcosystemConnectorDefinition, EcosystemCategory } from "./types";

export const ECOSYSTEM_CATEGORIES: EcosystemCategory[] = [
  "All",
  "Recommended",
  "Connected",
  "Workspace",
  "Communication",
  "Development",
  "Project Management",
  "Design",
  "Files",
  "Data",
  "Automation",
];

export const ECOSYSTEM_CONNECTORS: EcosystemConnectorDefinition[] = [
  // ── 1. Google Workspace ──────────────────────────────────────────
  {
    id: "google-workspace",
    slug: "google-workspace",
    // The gateway catalog exposes Google as two separate OAuth apps.
    gatewaySlugs: ["gmail", "google-calendar"],
    name: "Google Workspace",
    description: "Connect your entire Google Workspace suite to read emails, manage cloud documents, schedule events, and sync spreadsheets.",
    tagline: "Gmail · Drive · Calendar · Docs · Sheets",
    category: "Workspace",
    secondaryCategories: ["Communication", "Files", "Productivity" as any],
    icon: "google",
    brandColor: "#4285F4",
    authModes: ["oauth"],
    defaultScopes: [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/calendar.readonly",
    ],
    isRecommended: true,
    websiteUrl: "https://workspace.google.com",
    docsUrl: "https://developers.google.com/workspace",
    services: [
      {
        id: "gmail",
        name: "Gmail",
        description: "Search inboxes, read message threads, and draft smart replies.",
        icon: "gmail",
        defaultEnabled: true,
        requiredScopes: ["https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/gmail.compose"],
        permissions: [
          { id: "read", label: "Read mail", description: "Search and inspect email messages and thread content", type: "read" },
          { id: "draft", label: "Create drafts", description: "Draft email replies directly from Noska documents", type: "write" },
          { id: "send", label: "Send email", description: "Send outgoing emails upon explicit user confirmation", type: "write" },
        ],
        resourceTypes: [
          { id: "label", name: "Label / Inbox", pluralName: "Labels", icon: "mail" },
        ],
        toolNames: ["gmail.search", "gmail.read", "gmail.createDraft", "gmail.send"],
      },
      {
        id: "drive",
        name: "Google Drive",
        description: "Browse folders, search team files, and inspect document metadata.",
        icon: "googledrive",
        defaultEnabled: true,
        requiredScopes: ["https://www.googleapis.com/auth/drive.readonly", "https://www.googleapis.com/auth/drive.file"],
        permissions: [
          { id: "read", label: "Read files", description: "Access files in My Drive and Shared Drives", type: "read" },
          { id: "write", label: "Create & edit files", description: "Upload attachments and create cloud files", type: "write" },
        ],
        resourceTypes: [
          { id: "drive", name: "Shared Drive / Folder", pluralName: "Drives & Folders", icon: "folder" },
        ],
        toolNames: ["drive.search", "drive.read", "drive.uploadFile", "drive.listFiles"],
      },
      {
        id: "calendar",
        name: "Google Calendar",
        description: "Check availability schedules, list meetings, and schedule events.",
        icon: "googlecalendar",
        defaultEnabled: true,
        requiredScopes: ["https://www.googleapis.com/auth/calendar.readonly", "https://www.googleapis.com/auth/calendar.events"],
        permissions: [
          { id: "read", label: "Read events", description: "Inspect calendar schedules, free/busy status, and agendas", type: "read" },
          { id: "events", label: "Create & edit events", description: "Schedule calendar invites and update meeting times", type: "write" },
        ],
        resourceTypes: [
          { id: "calendar", name: "Calendar", pluralName: "Calendars", icon: "calendar" },
        ],
        toolNames: ["calendar.listEvents", "calendar.createEvent", "calendar.checkAvailability"],
      },
      {
        id: "docs",
        name: "Google Docs",
        description: "Read, parse, and export cloud documents seamlessly.",
        icon: "googledrive",
        defaultEnabled: false,
        requiredScopes: ["https://www.googleapis.com/auth/documents.readonly"],
        permissions: [
          { id: "read", label: "Read documents", description: "Read Google Doc contents and comments", type: "read" },
          { id: "write", label: "Edit documents", description: "Export Noska pages to Google Docs format", type: "write" },
        ],
        resourceTypes: [
          { id: "document", name: "Document", pluralName: "Documents", icon: "file-text" },
        ],
        toolNames: ["docs.read", "docs.create", "docs.exportPage"],
      },
      {
        id: "sheets",
        name: "Google Sheets",
        description: "Query tabular spreadsheets and append sync rows.",
        icon: "googledrive",
        defaultEnabled: false,
        requiredScopes: ["https://www.googleapis.com/auth/spreadsheets.readonly", "https://www.googleapis.com/auth/spreadsheets"],
        permissions: [
          { id: "read", label: "Read spreadsheets", description: "Extract sheet rows and calculate cell ranges", type: "read" },
          { id: "write", label: "Append & update rows", description: "Write table data directly to Google Sheets", type: "write" },
        ],
        resourceTypes: [
          { id: "sheet", name: "Spreadsheet", pluralName: "Spreadsheets", icon: "table" },
        ],
        toolNames: ["sheets.read", "sheets.appendRow", "sheets.getRange"],
      },
    ],
  },

  // ── 2. Microsoft 365 ─────────────────────────────────────────────
  {
    id: "microsoft-365",
    slug: "microsoft-365",
    name: "Microsoft 365",
    description: "Enterprise connectivity for Outlook email, OneDrive documents, SharePoint sites, Teams messages, and Calendar.",
    tagline: "Outlook · OneDrive · SharePoint · Teams · Calendar",
    category: "Workspace",
    secondaryCategories: ["Communication", "Files"],
    icon: "microsoft",
    brandColor: "#00A4EF",
    authModes: ["oauth"],
    defaultScopes: ["User.Read", "Mail.Read", "Files.Read.All", "Calendars.Read", "offline_access"],
    isRecommended: true,
    websiteUrl: "https://www.microsoft.com/microsoft-365",
    docsUrl: "https://learn.microsoft.com/en-us/graph",
    services: [
      {
        id: "outlook",
        name: "Outlook Mail",
        description: "Search Outlook inboxes, read messages, and create drafts.",
        icon: "microsoft",
        defaultEnabled: true,
        requiredScopes: ["Mail.Read", "Mail.Send"],
        permissions: [
          { id: "read", label: "Read email", description: "Inspect Outlook messages and conversation threads", type: "read" },
          { id: "draft", label: "Create drafts", description: "Prepare message drafts in Outlook", type: "write" },
        ],
        resourceTypes: [{ id: "mailbox", name: "Mailbox / Folder", pluralName: "Mailboxes", icon: "mail" }],
        toolNames: ["outlook.search", "outlook.readMessage", "outlook.createDraft"],
      },
      {
        id: "onedrive",
        name: "OneDrive",
        description: "Browse cloud storage and inspect work documents.",
        icon: "microsoft",
        defaultEnabled: true,
        requiredScopes: ["Files.Read.All", "Files.ReadWrite"],
        permissions: [
          { id: "read", label: "Read files", description: "Search and read files stored in OneDrive", type: "read" },
        ],
        resourceTypes: [{ id: "folder", name: "Folder", pluralName: "Folders", icon: "folder" }],
        toolNames: ["onedrive.search", "onedrive.readFile"],
      },
      {
        id: "sharepoint",
        name: "SharePoint",
        description: "Access team sites, document libraries, and organization assets.",
        icon: "microsoft",
        defaultEnabled: false,
        requiredScopes: ["Sites.Read.All"],
        permissions: [
          { id: "read", label: "Read sites & lists", description: "Query team document libraries and lists", type: "read" },
        ],
        resourceTypes: [{ id: "site", name: "Site / Library", pluralName: "Sites & Libraries", icon: "layers" }],
        toolNames: ["sharepoint.listSites", "sharepoint.searchSite"],
      },
      {
        id: "teams",
        name: "Microsoft Teams",
        description: "Read channel messages and send notifications to channels.",
        icon: "microsoft",
        defaultEnabled: true,
        requiredScopes: ["ChannelMessage.Read.All", "ChatMessage.Send"],
        permissions: [
          { id: "read", label: "Read channels", description: "Read team channel announcements and discussions", type: "read" },
          { id: "post", label: "Post messages", description: "Publish messages to Teams channels", type: "write" },
        ],
        resourceTypes: [{ id: "team_channel", name: "Team / Channel", pluralName: "Teams & Channels", icon: "message-square" }],
        toolNames: ["teams.listChannels", "teams.postMessage"],
      },
      {
        id: "calendar",
        name: "Outlook Calendar",
        description: "View availability schedules and manage event agendas.",
        icon: "microsoft",
        defaultEnabled: true,
        requiredScopes: ["Calendars.Read", "Calendars.ReadWrite"],
        permissions: [
          { id: "read", label: "Read calendar", description: "Inspect upcoming meetings and free/busy slots", type: "read" },
        ],
        resourceTypes: [{ id: "calendar", name: "Calendar", pluralName: "Calendars", icon: "calendar" }],
        toolNames: ["m365_calendar.listEvents", "m365_calendar.createEvent"],
      },
    ],
  },

  // ── 3. Atlassian ─────────────────────────────────────────────────
  {
    id: "atlassian",
    slug: "atlassian",
    name: "Atlassian",
    description: "Link Jira project issues, sprint boards, velocity metrics, and Confluence documentation spaces.",
    tagline: "Jira · Confluence",
    category: "Project Management",
    secondaryCategories: ["Workspace", "Development"],
    icon: "jira",
    brandColor: "#0052CC",
    authModes: ["oauth", "token"],
    defaultScopes: ["read:jira-work", "read:jira-user", "read:confluence-space:summary", "offline_access"],
    isRecommended: true,
    websiteUrl: "https://www.atlassian.com",
    docsUrl: "https://developer.atlassian.com",
    services: [
      {
        id: "jira",
        name: "Jira Software",
        description: "Track issues, sprint cycles, epics, and work milestones.",
        icon: "jira",
        defaultEnabled: true,
        requiredScopes: ["read:jira-work", "write:jira-work"],
        permissions: [
          { id: "read", label: "Read issues & sprints", description: "Query issue keys, boards, and milestones", type: "read" },
          { id: "write", label: "Create & update issues", description: "Create tickets and update assignees/status", type: "write" },
        ],
        resourceTypes: [{ id: "project", name: "Jira Project", pluralName: "Projects", icon: "trello" }],
        toolNames: ["jira.searchIssues", "jira.createIssue", "jira.updateStatus", "jira.getSprint"],
      },
      {
        id: "confluence",
        name: "Confluence",
        description: "Search workspace knowledge bases and sync space documentation.",
        icon: "jira",
        defaultEnabled: true,
        requiredScopes: ["read:confluence-content.summary", "read:confluence-space.summary"],
        permissions: [
          { id: "read", label: "Read spaces & pages", description: "Search Confluence articles and knowledge bases", type: "read" },
        ],
        resourceTypes: [{ id: "space", name: "Confluence Space", pluralName: "Spaces", icon: "book-open" }],
        toolNames: ["confluence.searchPages", "confluence.readPage"],
      },
    ],
  },

  // ── 4. GitHub ────────────────────────────────────────────────────
  {
    id: "github",
    slug: "github",
    name: "GitHub",
    description: "Connect repositories, pull requests, issues, commits, releases, and Actions workflows.",
    tagline: "Repositories · Issues · Pull Requests · Actions",
    category: "Development",
    secondaryCategories: ["Project Management"],
    icon: "github",
    brandColor: "#18181B",
    authModes: ["github_app", "oauth", "token"],
    defaultScopes: ["repo", "read:org", "read:user"],
    isRecommended: true,
    websiteUrl: "https://github.com",
    docsUrl: "https://docs.github.com/en/rest",
    services: [
      {
        id: "repositories",
        name: "Repositories & Code",
        description: "Search repository code, inspect branches, and view commits.",
        icon: "github",
        defaultEnabled: true,
        requiredScopes: ["repo"],
        permissions: [
          { id: "read", label: "Read repository code", description: "Browse files and commit trees for selected repositories", type: "read" },
        ],
        resourceTypes: [{ id: "repository", name: "Repository", pluralName: "Repositories", icon: "git-branch" }],
        toolNames: ["github.searchCode", "github.readFile", "github.listCommits"],
      },
      {
        id: "pull_requests",
        name: "Pull Requests",
        description: "Inspect code diffs, review comments, and PR merge statuses.",
        icon: "github",
        defaultEnabled: true,
        requiredScopes: ["repo"],
        permissions: [
          { id: "read", label: "Read pull requests", description: "Inspect PR statuses and review feedback", type: "read" },
          { id: "comment", label: "Comment on PRs", description: "Post review comments from Noska AI agents", type: "write" },
        ],
        resourceTypes: [{ id: "repository", name: "Repository", pluralName: "Repositories", icon: "git-pull-request" }],
        toolNames: ["github.listPullRequests", "github.getPullRequest", "github.commentOnPR"],
      },
      {
        id: "issues",
        name: "Issues & Discussions",
        description: "Track bug reports, feature requests, labels, and milestones.",
        icon: "github",
        defaultEnabled: true,
        requiredScopes: ["repo"],
        permissions: [
          { id: "read", label: "Read issues", description: "Query issue lists, labels, and assignees", type: "read" },
          { id: "write", label: "Create & update issues", description: "File issues from Noska task lists", type: "write" },
        ],
        resourceTypes: [{ id: "repository", name: "Repository", pluralName: "Repositories", icon: "alert-circle" }],
        toolNames: ["github.listIssues", "github.createIssue", "github.updateIssue"],
      },
      {
        id: "actions",
        name: "GitHub Actions",
        description: "Monitor CI/CD workflow runs and trigger automated build pipelines.",
        icon: "github",
        defaultEnabled: false,
        requiredScopes: ["workflow"],
        permissions: [
          { id: "read", label: "Read workflow runs", description: "Inspect build logs and pipeline statuses", type: "read" },
          { id: "trigger", label: "Dispatch workflows", description: "Trigger workflow dispatch actions", type: "write" },
        ],
        resourceTypes: [{ id: "repository", name: "Repository", pluralName: "Repositories", icon: "play-circle" }],
        toolNames: ["github.listWorkflowRuns", "github.triggerWorkflow"],
      },
    ],
  },

  // ── 5. Slack ─────────────────────────────────────────────────────
  {
    id: "slack",
    slug: "slack",
    name: "Slack",
    description: "Connect workspace channels, send notifications, search message history, and mention docs.",
    tagline: "Channels · Direct Messages · Canvases",
    category: "Communication",
    icon: "slack",
    brandColor: "#4A154B",
    authModes: ["oauth"],
    defaultScopes: ["channels:read", "chat:write", "users:read"],
    websiteUrl: "https://slack.com",
    docsUrl: "https://api.slack.com",
    services: [
      {
        id: "channels",
        name: "Public & Private Channels",
        description: "Read channel messages and post automated updates.",
        icon: "slack",
        defaultEnabled: true,
        requiredScopes: ["channels:read", "chat:write"],
        permissions: [
          { id: "read", label: "Read channel messages", description: "Search message history in authorized channels", type: "read" },
          { id: "post", label: "Post messages", description: "Post updates to selected channels", type: "write" },
        ],
        resourceTypes: [{ id: "channel", name: "Channel", pluralName: "Channels", icon: "hash" }],
        toolNames: ["slack.searchMessages", "slack.postMessage", "slack.listChannels"],
      },
      {
        id: "direct_messages",
        name: "Direct Messages",
        description: "Send direct notifications and DM updates.",
        icon: "slack",
        defaultEnabled: false,
        requiredScopes: ["im:read", "im:write"],
        permissions: [
          { id: "send", label: "Send direct messages", description: "Send bot reminders to workspace users", type: "write" },
        ],
        resourceTypes: [{ id: "user", name: "User", pluralName: "Users", icon: "user" }],
        toolNames: ["slack.sendDM"],
      },
    ],
  },

  // ── 6. Notion ────────────────────────────────────────────────────
  {
    id: "notion",
    slug: "notion",
    name: "Notion",
    description: "Search workspace pages, read and create databases, and sync blocks bi-directionally.",
    tagline: "Pages · Databases · Workspace Search",
    category: "Workspace",
    icon: "notion",
    brandColor: "#1C1B18",
    authModes: ["oauth", "token"],
    defaultScopes: ["read:page:all", "read:database:all", "insert:content", "update:content"],
    websiteUrl: "https://notion.so",
    docsUrl: "https://developers.notion.com",
    services: [
      {
        id: "databases",
        name: "Databases",
        description: "Query Notion database tables, filter rows, and append entries.",
        icon: "notion",
        defaultEnabled: true,
        requiredScopes: ["read:database:all", "insert:content"],
        permissions: [
          { id: "read", label: "Read database rows", description: "Extract database schema and row records", type: "read" },
          { id: "write", label: "Insert & update rows", description: "Sync rows into Notion databases", type: "write" },
        ],
        resourceTypes: [{ id: "database", name: "Database", pluralName: "Databases", icon: "database" }],
        toolNames: ["notion.queryDatabase", "notion.createDatabaseRow"],
      },
      {
        id: "pages",
        name: "Pages & Docs",
        description: "Search and inspect Notion documents and sub-pages.",
        icon: "notion",
        defaultEnabled: true,
        requiredScopes: ["read:page:all"],
        permissions: [
          { id: "read", label: "Read page content", description: "Read block trees and page properties", type: "read" },
        ],
        resourceTypes: [{ id: "page", name: "Page", pluralName: "Pages", icon: "file-text" }],
        toolNames: ["notion.searchPages", "notion.getPage"],
      },
    ],
  },

  // ── 7. Figma ─────────────────────────────────────────────────────
  {
    id: "figma",
    slug: "figma",
    name: "Figma",
    description: "Embed live design frames, inspect UI component tokens, and review designer feedback.",
    tagline: "Design Files · FigJam · Design Tokens",
    category: "Design",
    icon: "figma",
    brandColor: "#A259FF",
    authModes: ["oauth", "token"],
    defaultScopes: ["file_read"],
    websiteUrl: "https://figma.com",
    docsUrl: "https://www.figma.com/developers/api",
    services: [
      {
        id: "design_files",
        name: "Design Files & Frames",
        description: "Live canvas previews, frame node inspections, and comments.",
        icon: "figma",
        defaultEnabled: true,
        requiredScopes: ["file_read"],
        permissions: [
          { id: "read", label: "Read design files", description: "Extract node trees and frame images", type: "read" },
        ],
        resourceTypes: [{ id: "project", name: "Figma Project / Team", pluralName: "Projects & Teams", icon: "layout" }],
        toolNames: ["figma.getFile", "figma.getComments", "figma.getFrameImage"],
      },
      {
        id: "tokens",
        name: "Design Tokens & Styles",
        description: "Extract color palettes, typography scales, and component libraries.",
        icon: "figma",
        defaultEnabled: true,
        requiredScopes: ["file_read"],
        permissions: [
          { id: "read", label: "Read styles & tokens", description: "Extract design tokens for code generation", type: "read" },
        ],
        resourceTypes: [{ id: "library", name: "Component Library", pluralName: "Component Libraries", icon: "palette" }],
        toolNames: ["figma.getTokens", "figma.getStyles"],
      },
    ],
  },

  // ── 8. Linear ────────────────────────────────────────────────────
  {
    id: "linear",
    slug: "linear",
    name: "Linear",
    description: "Streamlined project planning, cycle tracking, issue management, and team roadmaps.",
    tagline: "Issues · Projects · Cycles · Roadmaps",
    category: "Project Management",
    secondaryCategories: ["Development"],
    icon: "linear",
    brandColor: "#5E6AD2",
    authModes: ["oauth", "token"],
    defaultScopes: ["read", "write", "issues:create"],
    websiteUrl: "https://linear.app",
    docsUrl: "https://developers.linear.app",
    services: [
      {
        id: "issues",
        name: "Issues & Cycles",
        description: "Create and update issues, assign cycles, and manage priorities.",
        icon: "linear",
        defaultEnabled: true,
        requiredScopes: ["read", "write"],
        permissions: [
          { id: "read", label: "Read issues & cycles", description: "Query issue boards and cycle backlogs", type: "read" },
          { id: "write", label: "Create issues", description: "Create tickets directly from documents", type: "write" },
        ],
        resourceTypes: [{ id: "team", name: "Team / Project", pluralName: "Teams & Projects", icon: "check-circle" }],
        toolNames: ["linear.searchIssues", "linear.createIssue", "linear.updateIssue", "linear.listCycles"],
      },
    ],
  },

  // ── 9. ClickUp ───────────────────────────────────────────────────
  {
    id: "clickup",
    slug: "clickup",
    name: "ClickUp",
    description: "Manage tasks, spaces, folders, sprint lists, and team goals.",
    tagline: "Tasks · Spaces · Docs · Goals",
    category: "Project Management",
    icon: "clickup",
    brandColor: "#7B68EE",
    authModes: ["oauth", "token"],
    defaultScopes: ["tasks:read", "tasks:write"],
    websiteUrl: "https://clickup.com",
    docsUrl: "https://clickup.com/api",
    services: [
      {
        id: "tasks",
        name: "Tasks & Spaces",
        description: "Track task statuses, assignees, and custom field values.",
        icon: "clickup",
        defaultEnabled: true,
        requiredScopes: ["tasks:read", "tasks:write"],
        permissions: [
          { id: "read", label: "Read tasks", description: "Query task lists and space folders", type: "read" },
          { id: "write", label: "Create tasks", description: "Add new tasks to spaces", type: "write" },
        ],
        resourceTypes: [{ id: "space", name: "Space / List", pluralName: "Spaces & Lists", icon: "check-square" }],
        toolNames: ["clickup.getTasks", "clickup.createTask"],
      },
    ],
  },

  // ── 10. Asana ────────────────────────────────────────────────────
  {
    id: "asana",
    slug: "asana",
    name: "Asana",
    description: "Team projects, task assignments, portfolio milestones, and workflow automation.",
    tagline: "Tasks · Projects · Portfolios",
    category: "Project Management",
    icon: "asana",
    brandColor: "#F06A6A",
    authModes: ["oauth", "token"],
    defaultScopes: ["default"],
    websiteUrl: "https://asana.com",
    docsUrl: "https://developers.asana.com",
    services: [
      {
        id: "tasks",
        name: "Tasks & Projects",
        description: "Create tasks, track project deadlines, and update milestones.",
        icon: "asana",
        defaultEnabled: true,
        requiredScopes: ["default"],
        permissions: [
          { id: "read", label: "Read projects & tasks", description: "Inspect project lists and assignees", type: "read" },
          { id: "write", label: "Create tasks", description: "Create tasks from document highlights", type: "write" },
        ],
        resourceTypes: [{ id: "project", name: "Project", pluralName: "Projects", icon: "check-circle" }],
        toolNames: ["asana.getTasks", "asana.createTask"],
      },
    ],
  },

  // ── 11. Discord ──────────────────────────────────────────────────
  {
    id: "discord",
    slug: "discord",
    name: "Discord",
    description: "Post announcements, manage guild channels, and trigger bot actions.",
    tagline: "Guilds · Channels · Bot Actions",
    category: "Communication",
    icon: "discord",
    brandColor: "#5865F2",
    authModes: ["token", "oauth"],
    defaultScopes: ["bot", "identify", "guilds"],
    websiteUrl: "https://discord.com",
    docsUrl: "https://discord.com/developers/docs",
    services: [
      {
        id: "channels",
        name: "Guild Channels",
        description: "Post release notes and community announcements.",
        icon: "discord",
        defaultEnabled: true,
        requiredScopes: ["bot"],
        permissions: [
          { id: "post", label: "Post messages", description: "Publish messages to guild channels", type: "write" },
        ],
        resourceTypes: [{ id: "guild", name: "Guild / Server", pluralName: "Guilds & Servers", icon: "server" }],
        toolNames: ["discord.sendMessage", "discord.listChannels"],
      },
    ],
  },

  // ── 12. Zoom ─────────────────────────────────────────────────────
  {
    id: "zoom",
    slug: "zoom",
    name: "Zoom",
    description: "Schedule video meetings, retrieve cloud recording transcripts, and generate AI meeting recaps.",
    tagline: "Meetings · Cloud Recordings · Transcripts",
    category: "Communication",
    icon: "zoom",
    brandColor: "#2D8CFF",
    authModes: ["oauth"],
    defaultScopes: ["meeting:read", "meeting:write", "recording:read"],
    websiteUrl: "https://zoom.us",
    docsUrl: "https://developers.zoom.us",
    services: [
      {
        id: "meetings",
        name: "Meetings & Recordings",
        description: "Schedule video calls and extract meeting summaries.",
        icon: "zoom",
        defaultEnabled: true,
        requiredScopes: ["meeting:read", "recording:read"],
        permissions: [
          { id: "read", label: "Read recordings & transcripts", description: "Fetch recording transcripts for meeting notes", type: "read" },
          { id: "create", label: "Schedule meetings", description: "Generate instant meeting links", type: "write" },
        ],
        resourceTypes: [{ id: "user", name: "User Account", pluralName: "User Accounts", icon: "video" }],
        toolNames: ["zoom.createMeeting", "zoom.getTranscripts"],
      },
    ],
  },

  // ── 13. Dropbox ──────────────────────────────────────────────────
  {
    id: "dropbox",
    slug: "dropbox",
    name: "Dropbox",
    description: "Enterprise cloud storage, team folder synchronization, and file access governance.",
    tagline: "Files · Team Folders · Paper",
    category: "Files",
    icon: "dropbox",
    brandColor: "#0061FF",
    authModes: ["oauth", "token"],
    defaultScopes: ["files.content.read", "files.content.write"],
    websiteUrl: "https://dropbox.com",
    docsUrl: "https://www.dropbox.com/developers",
    services: [
      {
        id: "files",
        name: "Files & Folders",
        description: "Preview documents and search cloud files.",
        icon: "dropbox",
        defaultEnabled: true,
        requiredScopes: ["files.content.read"],
        permissions: [
          { id: "read", label: "Read files", description: "Access file contents and shared folders", type: "read" },
        ],
        resourceTypes: [{ id: "folder", name: "Folder", pluralName: "Folders", icon: "folder" }],
        toolNames: ["dropbox.searchFiles", "dropbox.downloadFile"],
      },
    ],
  },

  // ── 14. Box ──────────────────────────────────────────────────────
  {
    id: "box",
    slug: "box",
    name: "Box",
    description: "Enterprise content cloud for secure document previews, search, and DLP governance.",
    tagline: "Files · Notes · Enterprise Content",
    category: "Files",
    icon: "box",
    brandColor: "#0061D5",
    authModes: ["oauth", "token"],
    defaultScopes: ["root_readwrite"],
    websiteUrl: "https://box.com",
    docsUrl: "https://developer.box.com",
    services: [
      {
        id: "files",
        name: "Enterprise Files",
        description: "Preview enterprise files and enforce access policies.",
        icon: "box",
        defaultEnabled: true,
        requiredScopes: ["root_readwrite"],
        permissions: [
          { id: "read", label: "Read enterprise files", description: "Search and preview Box files", type: "read" },
        ],
        resourceTypes: [{ id: "folder", name: "Box Folder", pluralName: "Folders", icon: "folder" }],
        toolNames: ["box.searchFiles", "box.getFile"],
      },
    ],
  },

  // ── 15. Vercel ───────────────────────────────────────────────────
  {
    id: "vercel",
    slug: "vercel",
    name: "Vercel",
    description: "Frontend cloud deployments, deployment logs, project environments, and custom domains.",
    tagline: "Deployments · Projects · Domains",
    category: "Development",
    icon: "vercel",
    brandColor: "#000000",
    authModes: ["oauth", "token"],
    defaultScopes: ["deployments:read", "projects:read"],
    websiteUrl: "https://vercel.com",
    docsUrl: "https://vercel.com/docs/rest-api",
    services: [
      {
        id: "deployments",
        name: "Projects & Deployments",
        description: "Inspect deployment build logs and preview staging URLs.",
        icon: "vercel",
        defaultEnabled: true,
        requiredScopes: ["deployments:read"],
        permissions: [
          { id: "read", label: "Read deployment logs", description: "Inspect build errors and deployment states", type: "read" },
        ],
        resourceTypes: [{ id: "project", name: "Vercel Project", pluralName: "Projects", icon: "globe" }],
        toolNames: ["vercel.listDeployments", "vercel.getDeployment"],
      },
    ],
  },

  // ── 16. Supabase ─────────────────────────────────────────────────
  {
    id: "supabase",
    slug: "supabase",
    name: "Supabase",
    description: "Postgres database querying, table schemas, Auth user administration, and Edge Functions.",
    tagline: "Database SQL · Auth · Storage · Edge Functions",
    category: "Data",
    secondaryCategories: ["Development"],
    icon: "supabase",
    brandColor: "#3ECF8E",
    authModes: ["token", "oauth"],
    defaultScopes: [],
    websiteUrl: "https://supabase.com",
    docsUrl: "https://supabase.com/docs",
    services: [
      {
        id: "database",
        name: "Postgres Database",
        description: "Execute SQL queries, inspect table schemas, and manage indexes.",
        icon: "supabase",
        defaultEnabled: true,
        requiredScopes: [],
        permissions: [
          { id: "read", label: "Query database tables", description: "Run read-only SQL queries via Noska AI", type: "read" },
        ],
        resourceTypes: [{ id: "project", name: "Database Project", pluralName: "Projects", icon: "database" }],
        toolNames: ["supabase.querySql", "supabase.listTables"],
      },
    ],
  },

  // ── 17. Airtable ─────────────────────────────────────────────────
  {
    id: "airtable",
    slug: "airtable",
    name: "Airtable",
    description: "Relational spreadsheet bases, custom records, automations, and interface views.",
    tagline: "Bases · Tables · Records",
    category: "Data",
    secondaryCategories: ["Project Management"],
    icon: "airtable",
    brandColor: "#18BFFF",
    authModes: ["oauth", "token"],
    defaultScopes: ["data.records:read", "data.records:write", "schema.bases:read"],
    websiteUrl: "https://airtable.com",
    docsUrl: "https://airtable.com/developers/web/api/introduction",
    services: [
      {
        id: "bases",
        name: "Bases & Records",
        description: "Query bases, create records, and sync table data.",
        icon: "airtable",
        defaultEnabled: true,
        requiredScopes: ["data.records:read", "data.records:write"],
        permissions: [
          { id: "read", label: "Read records", description: "Fetch rows and schema definitions from Airtable bases", type: "read" },
          { id: "write", label: "Insert & update records", description: "Add rows directly to Airtable tables", type: "write" },
        ],
        resourceTypes: [{ id: "base", name: "Airtable Base", pluralName: "Bases", icon: "grid" }],
        toolNames: ["airtable.getRecords", "airtable.createRecord"],
      },
    ],
  },

  // ── 18. HubSpot ──────────────────────────────────────────────────
  {
    id: "hubspot",
    slug: "hubspot",
    name: "HubSpot",
    description: "Inbound CRM for contacts, company accounts, deal pipelines, and support tickets.",
    tagline: "Contacts · Companies · Deals · Tickets",
    category: "Data",
    secondaryCategories: ["Communication"],
    icon: "hubspot",
    brandColor: "#FF7A59",
    authModes: ["oauth", "token"],
    defaultScopes: ["crm.objects.contacts.read", "crm.objects.companies.read", "crm.objects.deals.read"],
    websiteUrl: "https://hubspot.com",
    docsUrl: "https://developers.hubspot.com",
    services: [
      {
        id: "crm",
        name: "CRM Objects",
        description: "Search contact records and track deal pipeline stages.",
        icon: "hubspot",
        defaultEnabled: true,
        requiredScopes: ["crm.objects.contacts.read", "crm.objects.deals.read"],
        permissions: [
          { id: "read", label: "Read CRM records", description: "Search customer contacts and open deal values", type: "read" },
        ],
        resourceTypes: [{ id: "pipeline", name: "Deal Pipeline", pluralName: "Pipelines", icon: "trending-up" }],
        toolNames: ["hubspot.searchContacts", "hubspot.getDeals"],
      },
    ],
  },

  // ── 19. Salesforce ───────────────────────────────────────────────
  {
    id: "salesforce",
    slug: "salesforce",
    name: "Salesforce",
    description: "Enterprise CRM accounts, sales leads, opportunities, cases, and reporting analytics.",
    tagline: "Accounts · Leads · Opportunities · Reports",
    category: "Data",
    icon: "salesforce",
    brandColor: "#00A1E0",
    authModes: ["oauth"],
    defaultScopes: ["api", "refresh_token", "offline_access"],
    websiteUrl: "https://salesforce.com",
    docsUrl: "https://developer.salesforce.com",
    services: [
      {
        id: "sales_cloud",
        name: "Sales Cloud",
        description: "Query accounts, opportunities, and enterprise lead records.",
        icon: "salesforce",
        defaultEnabled: true,
        requiredScopes: ["api"],
        permissions: [
          { id: "read", label: "Read accounts & opportunities", description: "Extract pipeline numbers and lead contacts", type: "read" },
        ],
        resourceTypes: [{ id: "org", name: "Organization / Sandbox", pluralName: "Orgs & Sandboxes", icon: "cloud" }],
        toolNames: ["salesforce.querySoql", "salesforce.getOpportunity"],
      },
    ],
  },

  // ── 20. Intercom ─────────────────────────────────────────────────
  {
    id: "intercom",
    slug: "intercom",
    name: "Intercom",
    description: "Customer conversation inbox, support chat transcripts, and Help Center articles.",
    tagline: "Conversations · Customers · Articles",
    category: "Communication",
    icon: "intercom",
    brandColor: "#000000",
    authModes: ["oauth", "token"],
    defaultScopes: [],
    websiteUrl: "https://intercom.com",
    docsUrl: "https://developers.intercom.com",
    services: [
      {
        id: "inbox",
        name: "Support Conversations",
        description: "Read customer chat threads and summarize user feedback.",
        icon: "intercom",
        defaultEnabled: true,
        requiredScopes: [],
        permissions: [
          { id: "read", label: "Read conversations", description: "Search customer support tickets and live chats", type: "read" },
        ],
        resourceTypes: [{ id: "inbox", name: "Team Inbox", pluralName: "Inboxes", icon: "message-circle" }],
        toolNames: ["intercom.searchConversations", "intercom.getConversation"],
      },
    ],
  },

  // ── 21. Zendesk ──────────────────────────────────────────────────
  {
    id: "zendesk",
    slug: "zendesk",
    name: "Zendesk",
    description: "Customer support ticket management, satisfaction metrics, macros, and knowledge base.",
    tagline: "Tickets · Help Center · Macros",
    category: "Communication",
    icon: "zendesk",
    brandColor: "#03363D",
    authModes: ["oauth", "token"],
    defaultScopes: ["read", "write"],
    websiteUrl: "https://zendesk.com",
    docsUrl: "https://developer.zendesk.com",
    services: [
      {
        id: "support",
        name: "Zendesk Support",
        description: "Search open tickets, inspect customer issues, and draft answers.",
        icon: "zendesk",
        defaultEnabled: true,
        requiredScopes: ["read"],
        permissions: [
          { id: "read", label: "Read tickets", description: "Inspect customer issue tickets and priority flags", type: "read" },
        ],
        resourceTypes: [{ id: "view", name: "Ticket View / Group", pluralName: "Views & Groups", icon: "inbox" }],
        toolNames: ["zendesk.searchTickets", "zendesk.getTicket"],
      },
    ],
  },

  // ── 22. Stripe ───────────────────────────────────────────────────
  {
    id: "stripe",
    slug: "stripe",
    name: "Stripe",
    description: "Payment transactions, customer subscriptions, invoice lifecycles, and revenue analytics.",
    tagline: "Payments · Subscriptions · Invoices · Customers",
    category: "Data",
    icon: "stripe",
    brandColor: "#635BFF",
    authModes: ["token", "oauth"],
    defaultScopes: ["read_only"],
    websiteUrl: "https://stripe.com",
    docsUrl: "https://stripe.com/docs/api",
    services: [
      {
        id: "billing",
        name: "Billing & Payments",
        description: "Search customer subscription states and invoice balances.",
        icon: "stripe",
        defaultEnabled: true,
        requiredScopes: ["read_only"],
        permissions: [
          { id: "read", label: "Read payment analytics", description: "Inspect subscription plans and customer records", type: "read" },
        ],
        resourceTypes: [{ id: "account", name: "Stripe Account", pluralName: "Accounts", icon: "credit-card" }],
        toolNames: ["stripe.searchCustomers", "stripe.getSubscription", "stripe.listInvoices"],
      },
    ],
  },

  // ── 23. Shopify ──────────────────────────────────────────────────
  {
    id: "shopify",
    slug: "shopify",
    name: "Shopify",
    description: "E-commerce store orders, product catalog inventory, and customer fulfillments.",
    tagline: "Orders · Products · Customers · Inventory",
    category: "Data",
    icon: "shopify",
    brandColor: "#96BF48",
    authModes: ["oauth", "token"],
    defaultScopes: ["read_orders", "read_products"],
    websiteUrl: "https://shopify.com",
    docsUrl: "https://shopify.dev",
    services: [
      {
        id: "store",
        name: "Store Orders & Products",
        description: "Search order fulfillment status and product catalog inventory.",
        icon: "shopify",
        defaultEnabled: true,
        requiredScopes: ["read_orders", "read_products"],
        permissions: [
          { id: "read", label: "Read store data", description: "Query recent order numbers and product counts", type: "read" },
        ],
        resourceTypes: [{ id: "store", name: "Store", pluralName: "Stores", icon: "shopping-bag" }],
        toolNames: ["shopify.listOrders", "shopify.getProducts"],
      },
    ],
  },

  // ── 24. Zapier ───────────────────────────────────────────────────
  {
    id: "zapier",
    slug: "zapier",
    name: "Zapier",
    description: "Trigger multi-app Zaps and run natural language AI actions across 6,000+ cloud tools.",
    tagline: "Zap Triggers · NLA Actions",
    category: "Automation",
    icon: "zapier",
    brandColor: "#FF4A00",
    authModes: ["token", "oauth"],
    defaultScopes: [],
    websiteUrl: "https://zapier.com",
    docsUrl: "https://platform.zapier.com",
    services: [
      {
        id: "nla",
        name: "Natural Language Actions",
        description: "Execute third-party Zapier automation actions via AI agents.",
        icon: "zapier",
        defaultEnabled: true,
        requiredScopes: [],
        permissions: [
          { id: "execute", label: "Execute actions", description: "Trigger configured zapier automation actions", type: "write" },
        ],
        resourceTypes: [{ id: "action", name: "Zapier Action", pluralName: "Actions", icon: "zap" }],
        toolNames: ["zapier.executeAction", "zapier.listActions"],
      },
    ],
  },

  // ── 25. Make ─────────────────────────────────────────────────────
  {
    id: "make",
    slug: "make",
    name: "Make",
    description: "Trigger complex visual automation scenarios and exchange webhook payloads.",
    tagline: "Scenarios · Webhooks",
    category: "Automation",
    icon: "make",
    brandColor: "#6D28D9",
    authModes: ["token"],
    defaultScopes: [],
    websiteUrl: "https://make.com",
    docsUrl: "https://www.make.com/en/api-documentation",
    services: [
      {
        id: "scenarios",
        name: "Scenarios",
        description: "Run Make scenario webhooks and monitor execution status.",
        icon: "make",
        defaultEnabled: true,
        requiredScopes: [],
        permissions: [
          { id: "trigger", label: "Trigger scenarios", description: "Dispatch data payloads to Make scenario endpoints", type: "write" },
        ],
        resourceTypes: [{ id: "scenario", name: "Scenario", pluralName: "Scenarios", icon: "play" }],
        toolNames: ["make.runScenario", "make.listScenarios"],
      },
    ],
  },

  // ── 26. n8n ──────────────────────────────────────────────────────
  {
    id: "n8n",
    slug: "n8n",
    name: "n8n",
    description: "Fair-code visual workflow automation, self-hosted endpoints, and webhook runners.",
    tagline: "Workflows · Webhook Triggers",
    category: "Automation",
    icon: "n8n",
    brandColor: "#EA4B71",
    authModes: ["token"],
    defaultScopes: [],
    websiteUrl: "https://n8n.io",
    docsUrl: "https://docs.n8n.io/api",
    services: [
      {
        id: "workflows",
        name: "Workflows",
        description: "Trigger n8n workflow webhooks and fetch execution status.",
        icon: "n8n",
        defaultEnabled: true,
        requiredScopes: [],
        permissions: [
          { id: "trigger", label: "Trigger workflows", description: "Send event data to n8n webhook nodes", type: "write" },
        ],
        resourceTypes: [{ id: "workflow", name: "Workflow", pluralName: "Workflows", icon: "activity" }],
        toolNames: ["n8n.triggerWorkflow", "n8n.listWorkflows"],
      },
    ],
  },

  // ── 27. GitLab ───────────────────────────────────────────────────
  {
    id: "gitlab",
    slug: "gitlab",
    name: "GitLab",
    description: "Merge requests, repository browsing, issue tracking, and GitLab CI/CD pipeline triggers.",
    tagline: "Projects · Merge Requests · Issues · CI/CD",
    category: "Development",
    icon: "gitlab",
    brandColor: "#FC6D26",
    authModes: ["oauth", "token"],
    defaultScopes: ["read_api", "read_repository"],
    websiteUrl: "https://gitlab.com",
    docsUrl: "https://docs.gitlab.com/ee/api",
    services: [
      {
        id: "projects",
        name: "Projects & Merge Requests",
        description: "Track GitLab merge requests, code diffs, and pipelines.",
        icon: "gitlab",
        defaultEnabled: true,
        requiredScopes: ["read_api"],
        permissions: [
          { id: "read", label: "Read projects & MRs", description: "Inspect merge request status and code changes", type: "read" },
        ],
        resourceTypes: [{ id: "project", name: "GitLab Project", pluralName: "Projects", icon: "git-merge" }],
        toolNames: ["gitlab.listMergeRequests", "gitlab.getProject"],
      },
    ],
  },

  // ── 28. Bitbucket ────────────────────────────────────────────────
  {
    id: "bitbucket",
    slug: "bitbucket",
    name: "Bitbucket",
    description: "Git code repositories, pull requests, branch permissions, and Bitbucket Pipelines.",
    tagline: "Repositories · Pull Requests · Pipelines",
    category: "Development",
    icon: "bitbucket",
    brandColor: "#0052CC",
    authModes: ["oauth", "token"],
    defaultScopes: ["repository", "pullrequest"],
    websiteUrl: "https://bitbucket.org",
    docsUrl: "https://developer.atlassian.com/cloud/bitbucket",
    services: [
      {
        id: "repos",
        name: "Repositories & PRs",
        description: "Inspect Bitbucket pull requests and code commits.",
        icon: "bitbucket",
        defaultEnabled: true,
        requiredScopes: ["repository", "pullrequest"],
        permissions: [
          { id: "read", label: "Read repositories & PRs", description: "View PR status and branch references", type: "read" },
        ],
        resourceTypes: [{ id: "repo", name: "Repository", pluralName: "Repositories", icon: "git-pull-request" }],
        toolNames: ["bitbucket.listPullRequests", "bitbucket.getRepo"],
      },
    ],
  },

  // ── 29. Custom MCP Server ────────────────────────────────────────
  {
    id: "custom-mcp",
    slug: "custom-mcp",
    name: "Custom MCP Server",
    description: "Connect any remote MCP (Model Context Protocol) server over HTTPS with a bearer token. Its tools become available to Noska AI agents automatically.",
    tagline: "Any remote MCP server · Bearer token",
    category: "Automation",
    secondaryCategories: ["Development", "Data"],
    icon: "plug",
    authModes: ["token"],
    defaultScopes: [],
    docsUrl: "https://modelcontextprotocol.io",
    services: [
      {
        id: "mcp_tools",
        name: "Server Tools",
        description: "Every tool the MCP server exposes via tools/list, subject to per-service toggles.",
        icon: "plug",
        defaultEnabled: true,
        requiredScopes: [],
        permissions: [
          { id: "read", label: "List & call server tools", description: "Discover tools and invoke them from Noska AI agents", type: "read" },
        ],
        resourceTypes: [{ id: "tool", name: "Tool", pluralName: "Tools", icon: "zap" }],
        toolNames: [],
      },
    ],
  },

  // ── 30. Supabase ─────────────────────────────────────────────────
  {
    id: "supabase",
    slug: "supabase",
    name: "Supabase",
    description: "Manage Supabase projects, tables, and edge functions, and run read-only SQL against your databases via Supabase's official hosted MCP server.",
    tagline: "Projects · Tables · SQL · Edge Functions",
    category: "Development",
    secondaryCategories: ["Data"],
    icon: "supabase",
    brandColor: "#3FCF8E",
    authModes: ["oauth", "token"],
    defaultScopes: [],
    websiteUrl: "https://supabase.com",
    docsUrl: "https://supabase.com/docs/guides/getting-started/mcp",
    services: [
      {
        id: "supabase",
        name: "Projects & Databases",
        description: "Inspect project config, manage tables, and run read-only SQL queries.",
        icon: "supabase",
        defaultEnabled: true,
        requiredScopes: [],
        permissions: [
          { id: "read", label: "Inspect projects & schema", description: "List projects, tables, and run read-only SQL", type: "read" },
          { id: "write", label: "Manage tables & functions", description: "Apply schema migrations and manage edge functions", type: "write" },
        ],
        resourceTypes: [{ id: "project", name: "Project", pluralName: "Projects", icon: "database" }],
        toolNames: ["supabase.listProjects", "supabase.runSql"],
      },
    ],
  },

  // ── 31. Cloudflare ───────────────────────────────────────────────
  {
    id: "cloudflare",
    slug: "cloudflare",
    name: "Cloudflare",
    description: "Inspect and manage Workers, KV, R2, DNS records and account settings through Cloudflare's official hosted MCP server.",
    tagline: "Workers · KV · R2 · DNS",
    category: "Development",
    icon: "cloudflare",
    brandColor: "#F6821F",
    authModes: ["oauth", "token"],
    defaultScopes: [],
    websiteUrl: "https://developers.cloudflare.com",
    docsUrl: "https://developers.cloudflare.com/agents/model-context-protocol/cloudflare/servers-for-cloudflare/",
    services: [
      {
        id: "cloudflare",
        name: "Workers & Account",
        description: "Inspect and manage Workers scripts, storage bindings, and account-level settings.",
        icon: "cloudflare",
        defaultEnabled: true,
        requiredScopes: [],
        permissions: [
          { id: "read", label: "Read account resources", description: "List Workers, KV namespaces, R2 buckets, and DNS records", type: "read" },
          { id: "write", label: "Manage resources", description: "Update Workers settings and DNS records", type: "write" },
        ],
        resourceTypes: [{ id: "account", name: "Account / Zone", pluralName: "Accounts & Zones", icon: "globe" }],
        toolNames: ["cloudflare.listWorkers"],
      },
    ],
  },

  // ── 32. Stripe ───────────────────────────────────────────────────
  {
    id: "stripe",
    slug: "stripe",
    name: "Stripe",
    description: "Inspect balances, customers, payments, subscriptions and invoices through Stripe's official hosted MCP server. Use a restricted API key for least-privilege access.",
    tagline: "Payments · Customers · Invoices",
    category: "Data",
    secondaryCategories: ["Development"],
    icon: "stripe",
    brandColor: "#635BFF",
    authModes: ["oauth", "token"],
    defaultScopes: [],
    websiteUrl: "https://stripe.com",
    docsUrl: "https://docs.stripe.com/mcp",
    services: [
      {
        id: "stripe",
        name: "Payments & Customers",
        description: "Query balances, inspect payments and refunds, and look up customers.",
        icon: "stripe",
        defaultEnabled: true,
        requiredScopes: [],
        permissions: [
          { id: "read", label: "Read payment data", description: "Inspect balances, payments, subscriptions, and invoices", type: "read" },
          { id: "write", label: "Create resources", description: "Create payment links, invoices, and customers", type: "write" },
        ],
        resourceTypes: [{ id: "account", name: "Account", pluralName: "Accounts", icon: "credit-card" }],
        toolNames: ["stripe.listPayments"],
      },
    ],
  },

  // ── 33. PostHog ──────────────────────────────────────────────────
  {
    id: "posthog",
    slug: "posthog",
    name: "PostHog",
    description: "Query product analytics, manage feature flags and experiments, and inspect session replays through PostHog's official hosted MCP server.",
    tagline: "Analytics · Feature Flags · Replays",
    category: "Data",
    icon: "posthog",
    authModes: ["oauth", "token"],
    defaultScopes: [],
    websiteUrl: "https://posthog.com",
    docsUrl: "https://posthog.com/docs/model-context-protocol/faq",
    services: [
      {
        id: "posthog",
        name: "Analytics & Flags",
        description: "Run insight queries, toggle feature flags, and list session replays.",
        icon: "posthog",
        defaultEnabled: true,
        requiredScopes: [],
        permissions: [
          { id: "read", label: "Query analytics", description: "Read insights, dashboards, experiments, and replays", type: "read" },
          { id: "write", label: "Manage feature flags", description: "Create and update feature flags", type: "write" },
        ],
        resourceTypes: [{ id: "project", name: "Project", pluralName: "Projects", icon: "activity" }],
        toolNames: ["posthog.listInsights"],
      },
    ],
  },

  // ── 34. Zapier ───────────────────────────────────────────────────
  {
    id: "zapier",
    slug: "zapier",
    name: "Zapier",
    description: "Run your Zapier workflows and reach 8,000+ connected apps through Zapier's official MCP server — paste a connection token to connect.",
    tagline: "8,000+ apps · Workflows · Agents",
    category: "Automation",
    icon: "zapier",
    brandColor: "#FF4F00",
    authModes: ["oauth", "token"],
    defaultScopes: [],
    websiteUrl: "https://zapier.com",
    docsUrl: "https://docs.zapier.com/mcp/overview/how-connections-work",
    services: [
      {
        id: "zapier",
        name: "Zaps & Actions",
        description: "Execute Zapier actions and workflows exposed by your MCP connection.",
        icon: "zapier",
        defaultEnabled: true,
        requiredScopes: [],
        permissions: [
          { id: "read", label: "List available actions", description: "Discover which Zapier actions are exposed", type: "read" },
          { id: "write", label: "Run actions", description: "Execute Zapier workflows and app actions", type: "write" },
        ],
        resourceTypes: [{ id: "zap", name: "Zap", pluralName: "Zaps", icon: "zap" }],
        toolNames: ["zapier.runAction"],
      },
    ],
  },
];

export class EcosystemRegistry {
  private static catalogMap = new Map<string, EcosystemConnectorDefinition>(
    ECOSYSTEM_CONNECTORS.map((c) => [c.id.toLowerCase(), c])
  );

  static getAll(): EcosystemConnectorDefinition[] {
    return [...ECOSYSTEM_CONNECTORS];
  }

  static get(id: string): EcosystemConnectorDefinition | undefined {
    return this.catalogMap.get(id.toLowerCase());
  }

  static getCategories(): EcosystemCategory[] {
    return [...ECOSYSTEM_CATEGORIES];
  }

  static filter(category: EcosystemCategory, query?: string): EcosystemConnectorDefinition[] {
    const q = (query || "").trim().toLowerCase();
    return ECOSYSTEM_CONNECTORS.filter((c) => {
      if (category === "Recommended" && !c.isRecommended) return false;
      if (
        category !== "All" &&
        category !== "Recommended" &&
        category !== "Connected" &&
        c.category !== category &&
        !c.secondaryCategories?.includes(category)
      ) {
        return false;
      }
      if (!q) return true;
      const matchName = c.name.toLowerCase().includes(q);
      const matchDesc = c.description.toLowerCase().includes(q);
      const matchTagline = c.tagline.toLowerCase().includes(q);
      const matchServices = c.services.some(
        (s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
      );
      return matchName || matchDesc || matchTagline || matchServices;
    });
  }
}

export const ECOSYSTEM_REGISTRY = EcosystemRegistry;

export function getEcosystemConnector(idOrSlug: string): EcosystemConnectorDefinition | undefined {
  return EcosystemRegistry.get(idOrSlug);
}

/**
 * Map a connector-gateway catalog slug to the ecosystem definition it
 * belongs to. The gateway catalog (gmail, google-calendar, notion, github,
 * slack, custom-mcp, …) uses finer-grained slugs than the ecosystem ids,
 * so a straight id lookup misses most of them.
 */
const GATEWAY_SLUG_TO_ECOSYSTEM: ReadonlyMap<string, string> = new Map([
  ["gmail", "google-workspace"],
  ["google-calendar", "google-workspace"],
  ["google-drive", "google-workspace"],
  ["notion", "notion"],
  ["github", "github"],
  ["slack", "slack"],
  ["custom-mcp", "custom-mcp"],
]);

export function getEcosystemConnectorByGatewaySlug(slug: string): EcosystemConnectorDefinition | undefined {
  const ecosystemId = GATEWAY_SLUG_TO_ECOSYSTEM.get(slug);
  return ecosystemId ? EcosystemRegistry.get(ecosystemId) : EcosystemRegistry.get(slug);
}

export function getAllEcosystemConnectors(): EcosystemConnectorDefinition[] {
  return EcosystemRegistry.getAll();
}

