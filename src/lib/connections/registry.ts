/**
 * Integration Provider Registry
 *
 * Central registry of all external connection providers. Defines capabilities,
 * permission scopes translated to readable descriptions, categories, and icons.
 */

import type { IntegrationProviderDefinition, ProviderCategory } from "./types";

const PROVIDERS: IntegrationProviderDefinition[] = [
  {
    id: "github",
    slug: "github",
    name: "GitHub",
    description: "Link pull requests, issues, commits, releases, and browse repositories directly within Noska pages.",
    category: "Engineering",
    icon: "github",
    brandColor: "#24292e",
    aliases: ["git", "code", "repo", "pr", "pull request", "issue", "commit", "copilot"],
    capabilities: {
      oauth: true,
      token: true,
      multiAccount: true,
      linkPreview: true,
      linkMention: true,
      search: true,
      actions: true,
      webhooks: true,
      syncedDatabase: true,
      connectedProperties: true,
    },
    authModes: ["oauth", "token"],
    permissions: [
      "Repository metadata and contents",
      "Pull requests, review comments, and statuses",
      "Issues, labels, and milestones",
      "Commit logs and branch references",
      "Release tags and changelogs",
    ],
    detailedScopes: [
      { key: "repo", label: "Repositories", description: "Read access to public and private code repositories", category: "read" },
      { key: "read:org", label: "Organizations", description: "Read organization team membership and profile data", category: "read" },
    ],
    status: "live",
    websiteUrl: "https://github.com",
    docsUrl: "https://docs.github.com/en/rest",
  },
  {
    id: "jira",
    slug: "jira",
    name: "Jira",
    description: "Embed Jira issues, track sprint progress, and mention tickets seamlessly across your workspace.",
    category: "Project Management",
    icon: "jira",
    brandColor: "#0052CC",
    aliases: ["atlassian", "ticket", "issue", "sprint", "epic", "story", "board"],
    capabilities: {
      oauth: true,
      token: true,
      multiAccount: true,
      linkPreview: true,
      linkMention: true,
      search: true,
      actions: true,
      webhooks: true,
      syncedDatabase: true,
    },
    authModes: ["oauth", "token"],
    permissions: [
      "Projects, boards, and sprint schedules",
      "Issues, epics, stories, and task states",
      "Issue comments and worklog updates",
    ],
    status: "available",
    websiteUrl: "https://www.atlassian.com/software/jira",
  },
  {
    id: "gitlab",
    slug: "gitlab",
    name: "GitLab",
    description: "Preview merge requests, issues, pipelines, and repository files from GitLab.com and self-hosted instances.",
    category: "Engineering",
    icon: "gitlab",
    brandColor: "#FC6D26",
    aliases: ["git", "mr", "merge request", "pipeline", "ci", "code"],
    capabilities: {
      oauth: true,
      token: true,
      multiAccount: true,
      linkPreview: true,
      linkMention: true,
      search: true,
      actions: false,
      webhooks: true,
      syncedDatabase: false,
    },
    authModes: ["oauth", "token"],
    permissions: [
      "Projects and repository contents",
      "Merge requests and pipeline statuses",
      "Issues and milestone trackers",
    ],
    status: "available",
    websiteUrl: "https://gitlab.com",
  },
  {
    id: "slack",
    slug: "slack",
    name: "Slack",
    description: "Mention channels, preview message threads, and send notifications directly from Noska.",
    category: "Communication",
    icon: "slack",
    brandColor: "#4A154B",
    aliases: ["chat", "channel", "message", "thread", "dm", "workspace"],
    capabilities: {
      oauth: true,
      token: false,
      multiAccount: true,
      linkPreview: true,
      linkMention: true,
      search: true,
      actions: true,
      webhooks: true,
      syncedDatabase: false,
    },
    authModes: ["oauth"],
    permissions: [
      "Channel and message read access",
      "Send messages to selected channels",
      "User profile information",
    ],
    status: "live",
    websiteUrl: "https://slack.com",
  },
  {
    id: "linear",
    slug: "linear",
    name: "Linear",
    description: "Sync issues, cycles, projects, and roadmap milestones with high-speed interactive previews.",
    category: "Project Management",
    icon: "linear",
    brandColor: "#5E6AD2",
    aliases: ["issue", "cycle", "project", "roadmap", "ticket", "triage"],
    capabilities: {
      oauth: true,
      token: true,
      multiAccount: true,
      linkPreview: true,
      linkMention: true,
      search: true,
      actions: true,
      webhooks: true,
      syncedDatabase: true,
    },
    authModes: ["oauth", "token"],
    permissions: [
      "Issues, comments, and triage states",
      "Projects, cycles, and initiatives",
      "Team rosters and workflow states",
    ],
    status: "available",
    websiteUrl: "https://linear.app",
  },
  {
    id: "figma",
    slug: "figma",
    name: "Figma",
    description: "Embed live interactive design files, specific frames, and FigJam boards in your documentation.",
    category: "Design",
    icon: "figma",
    brandColor: "#F24E1E",
    aliases: ["design", "frame", "mockup", "ui", "ux", "figjam", "vector", "prototype"],
    capabilities: {
      oauth: true,
      token: true,
      multiAccount: true,
      linkPreview: true,
      linkMention: true,
      search: true,
      actions: false,
      webhooks: true,
      syncedDatabase: false,
    },
    authModes: ["oauth", "token"],
    permissions: [
      "File metadata and frame previews",
      "Comments and design team libraries",
    ],
    status: "available",
    websiteUrl: "https://figma.com",
  },
  {
    id: "google-drive",
    slug: "google-drive",
    name: "Google Drive",
    description: "Browse, preview, and embed Google Docs, Sheets, Slides, and Drive folder items.",
    category: "File Management",
    icon: "google-drive",
    brandColor: "#4285F4",
    aliases: ["google", "docs", "sheets", "slides", "drive", "files", "folder", "gdrive"],
    capabilities: {
      oauth: true,
      token: false,
      multiAccount: true,
      linkPreview: true,
      linkMention: true,
      search: true,
      actions: true,
      webhooks: false,
      syncedDatabase: false,
    },
    authModes: ["oauth"],
    permissions: [
      "View metadata and content of Google Drive files",
      "Read Google Docs, Sheets, and Slides",
    ],
    status: "live",
    websiteUrl: "https://drive.google.com",
  },
  {
    id: "asana",
    slug: "asana",
    name: "Asana",
    description: "Keep tasks, projects, portfolios, and due dates synced directly inside your workspace notes.",
    category: "Project Management",
    icon: "asana",
    brandColor: "#F06A6A",
    aliases: ["task", "project", "portfolio", "due date", "workflow"],
    capabilities: {
      oauth: true,
      token: true,
      multiAccount: true,
      linkPreview: true,
      linkMention: true,
      search: true,
      actions: true,
      webhooks: true,
      syncedDatabase: true,
    },
    authModes: ["oauth", "token"],
    permissions: [
      "Projects, tasks, and subtasks",
      "Assignees and due date milestones",
    ],
    status: "available",
    websiteUrl: "https://asana.com",
  },
  {
    id: "discord",
    slug: "discord",
    name: "Discord",
    description: "Link server channels, voice lounges, and stream live community updates to your documentation.",
    category: "Communication",
    icon: "discord",
    brandColor: "#5865F2",
    aliases: ["server", "community", "bot", "channel", "voice"],
    capabilities: {
      oauth: true,
      token: false,
      multiAccount: true,
      linkPreview: true,
      linkMention: true,
      search: false,
      actions: true,
      webhooks: true,
      syncedDatabase: false,
    },
    authModes: ["oauth"],
    permissions: [
      "Server channel list and permissions",
      "Send messages and bot integrations",
    ],
    status: "available",
    websiteUrl: "https://discord.com",
  },
  {
    id: "trello",
    slug: "trello",
    name: "Trello",
    description: "Embed interactive Kanban cards, boards, and checklists with instant status updates.",
    category: "Project Management",
    icon: "trello",
    brandColor: "#0079BF",
    aliases: ["board", "card", "kanban", "list", "checklist"],
    capabilities: {
      oauth: true,
      token: true,
      multiAccount: true,
      linkPreview: true,
      linkMention: true,
      search: true,
      actions: true,
      webhooks: true,
      syncedDatabase: false,
    },
    authModes: ["oauth", "token"],
    permissions: [
      "Boards, lists, and cards",
      "Card members and checklists",
    ],
    status: "available",
    websiteUrl: "https://trello.com",
  },
  {
    id: "dropbox",
    slug: "dropbox",
    name: "Dropbox",
    description: "Link and preview cloud assets, paper documents, and team shared folders.",
    category: "File Management",
    icon: "dropbox",
    brandColor: "#0061FF",
    aliases: ["files", "storage", "cloud", "paper", "sync"],
    capabilities: {
      oauth: true,
      token: true,
      multiAccount: true,
      linkPreview: true,
      linkMention: true,
      search: true,
      actions: false,
      webhooks: false,
      syncedDatabase: false,
    },
    authModes: ["oauth", "token"],
    permissions: [
      "Read file metadata and previews",
      "Account team folder references",
    ],
    status: "available",
    websiteUrl: "https://dropbox.com",
  },
  {
    id: "zendesk",
    slug: "zendesk",
    name: "Zendesk",
    description: "Reference support tickets, customer satisfaction ratings, and knowledge base articles.",
    category: "Productivity",
    icon: "zendesk",
    brandColor: "#03363D",
    aliases: ["support", "ticket", "helpdesk", "customer", "kb", "article"],
    capabilities: {
      oauth: true,
      token: true,
      multiAccount: true,
      linkPreview: true,
      linkMention: true,
      search: true,
      actions: true,
      webhooks: true,
      syncedDatabase: false,
    },
    authModes: ["oauth", "token"],
    permissions: [
      "Tickets, comments, and priority metrics",
      "Requester and agent assignments",
    ],
    status: "available",
    websiteUrl: "https://zendesk.com",
  },
];

export const CATEGORIES: ProviderCategory[] = [
  "Engineering",
  "Project Management",
  "Communication",
  "Design",
  "Productivity",
  "File Management",
  "Analytics",
  "Security",
  "Collaboration",
];

export class IntegrationRegistry {
  private static providersMap = new Map<string, IntegrationProviderDefinition>(
    PROVIDERS.map((p) => [p.id, p])
  );

  static getAll(): IntegrationProviderDefinition[] {
    return [...PROVIDERS];
  }

  static get(id: string): IntegrationProviderDefinition | undefined {
    return this.providersMap.get(id.toLowerCase());
  }

  static getCategories(): ProviderCategory[] {
    return [...CATEGORIES];
  }

  static search(query: string, category?: string | null): IntegrationProviderDefinition[] {
    const q = query.trim().toLowerCase();
    return PROVIDERS.filter((p) => {
      if (category && category !== "all" && p.category.toLowerCase() !== category.toLowerCase()) {
        return false;
      }
      if (!q) return true;

      const nameMatch = p.name.toLowerCase().includes(q);
      const descMatch = p.description.toLowerCase().includes(q);
      const catMatch = p.category.toLowerCase().includes(q);
      const aliasMatch = p.aliases.some((a) => a.toLowerCase().includes(q));

      // Capability matching, e.g. searching "preview" or "oauth" or "sync"
      const capabilityMatch =
        (q.includes("preview") && p.capabilities.linkPreview) ||
        (q.includes("mention") && p.capabilities.linkMention) ||
        (q.includes("search") && p.capabilities.search) ||
        (q.includes("webhook") && p.capabilities.webhooks) ||
        (q.includes("oauth") && p.capabilities.oauth) ||
        (q.includes("database") && p.capabilities.syncedDatabase);

      return nameMatch || descMatch || catMatch || aliasMatch || capabilityMatch;
    });
  }
}
