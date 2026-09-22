/**
 * Official vendor marks and brand SVG geometry.
 * Shared across Ecosystem Connections, Integrations Settings, Widgets, and AI Tool badges.
 * Logos remain trademarks of their respective owners.
 */
import React from "react";

/**
 * Normalizes any id, slug, or name into a canonical brand key.
 */
export function normalizeBrandKey(id?: string, name?: string): string {
  const raw = `${id || ""} ${name || ""}`.toLowerCase().trim();
  if (!raw) return "custom-mcp";

  // Google ecosystem
  if (raw.includes("gmail") || raw.includes("mail") || raw.includes("inbox")) return "gmail";
  if (raw.includes("calendar") || raw.includes("gcal") || raw.includes("m365_calendar") || raw.includes("event")) return "googlecalendar";
  if (raw.includes("sheets") || raw.includes("spreadsheet") || raw.includes("gsheet")) return "googlesheets";
  if (raw.includes("docs") || raw.includes("gdoc") || raw.includes("document")) return "googledocs";
  if (raw.includes("drive") || raw.includes("gdrive")) return "googledrive";
  if (raw.includes("google") || raw.includes("workspace") || raw.includes("gsuite")) return "google";

  // Microsoft ecosystem
  if (raw.includes("outlook") || raw.includes("mailbox")) return "outlook";
  if (raw.includes("onedrive") || raw.includes("one-drive")) return "onedrive";
  if (raw.includes("sharepoint") || raw.includes("share-point")) return "sharepoint";
  if (raw.includes("teams")) return "teams";
  if (raw.includes("microsoft") || raw.includes("m365") || raw.includes("office")) return "microsoft";

  // Atlassian ecosystem
  if (raw.includes("jira")) return "jira";
  if (raw.includes("confluence")) return "confluence";
  if (raw.includes("trello")) return "trello";
  if (raw.includes("bitbucket")) return "bitbucket";
  if (raw.includes("atlassian")) return "atlassian";

  // Dev & Cloud
  if (raw.includes("github") || raw.includes("repo") || raw.includes("pull_request") || raw.includes("pull request") || raw.includes("branch") || raw.includes("action")) return "github";
  if (raw.includes("gitlab")) return "gitlab";
  if (raw.includes("vercel") || raw.includes("deployment")) return "vercel";
  if (raw.includes("supabase") || raw.includes("database") || raw.includes("postgres") || raw.includes("sql")) return "supabase";
  if (raw.includes("cloudflare") || raw.includes("worker") || raw.includes("dns")) return "cloudflare";
  if (raw.includes("posthog") || raw.includes("analytics") || raw.includes("flag")) return "posthog";
  if (raw.includes("sentry") || raw.includes("error") || raw.includes("issue")) return "sentry";

  // Communication & Productivity
  if (raw.includes("slack") || raw.includes("channel")) return "slack";
  if (raw.includes("discord") || raw.includes("guild")) return "discord";
  if (raw.includes("zoom") || raw.includes("meeting")) return "zoom";
  if (raw.includes("notion") || raw.includes("page")) return "notion";
  if (raw.includes("linear") || raw.includes("cycle")) return "linear";
  if (raw.includes("clickup") || raw.includes("space")) return "clickup";
  if (raw.includes("asana") || raw.includes("portfolio") || raw.includes("task")) return "asana";
  if (raw.includes("figma") || raw.includes("figjam") || raw.includes("design") || raw.includes("token")) return "figma";
  if (raw.includes("dropbox")) return "dropbox";
  if (raw.includes("box") || raw.includes("enterprise file")) return "box";
  if (raw.includes("airtable") || raw.includes("base")) return "airtable";
  if (raw.includes("hubspot") || raw.includes("crm") || raw.includes("contact") || raw.includes("deal")) return "hubspot";
  if (raw.includes("salesforce") || raw.includes("sales_cloud") || raw.includes("lead")) return "salesforce";
  if (raw.includes("intercom") || raw.includes("conversation")) return "intercom";
  if (raw.includes("zendesk") || raw.includes("ticket")) return "zendesk";
  if (raw.includes("stripe") || raw.includes("billing") || raw.includes("payment") || raw.includes("invoice")) return "stripe";
  if (raw.includes("shopify") || raw.includes("store") || raw.includes("order") || raw.includes("product")) return "shopify";
  if (raw.includes("zapier") || raw.includes("zap") || raw.includes("nla")) return "zapier";
  if (raw.includes("make") || raw.includes("integromat") || raw.includes("scenario")) return "make";
  if (raw.includes("n8n") || raw.includes("workflow")) return "n8n";

  if (raw.includes("mcp") || raw.includes("custom") || raw.includes("plug") || raw.includes("tool")) return "custom-mcp";

  // Default fallback matching
  return raw.replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
}

export function BrandIcon({
  id,
  name,
  className = "h-4 w-4",
}: {
  id?: string;
  name?: string;
  className?: string;
}) {
  const brand = normalizeBrandKey(id, name);

  switch (brand) {
    // ── Google ──
    case "google":
    case "google-workspace":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-label={name || "Google"} className={className}>
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            fill="#EA4335"
          />
        </svg>
      );

    case "gmail":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-label={name || "Gmail"} className={className}>
          <path d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6z" fill="#F2F2F2" />
          <path d="M22 6l-10 7L2 6v12h3V9.5l7 5 7-5V18h3V6z" fill="#EA4335" />
          <path d="M2 6l10 7 10-7h-2.5L12 11 4.5 6H2z" fill="#DB4437" />
          <path d="M19 18h3V6l-3 2.1v9.9z" fill="#C5221F" />
          <path d="M2 6v12h3V8.1L2 6z" fill="#C5221F" />
        </svg>
      );

    case "googledrive":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-label={name || "Google Drive"} className={className}>
          <path d="M7.7 2h8.6l5.7 9.8h-8.6z" fill="#FFBA00" />
          <path d="M13.4 11.8l5.7 9.8H10.5L4.8 11.8z" fill="#00AC47" />
          <path d="M2 21.6l5.7-9.8h8.6L10.6 21.6z" fill="#2684FF" />
        </svg>
      );

    case "googlecalendar":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-label={name || "Google Calendar"} className={className}>
          <rect x="2.5" y="3.5" width="19" height="17.5" rx="3.5" fill="#FFFFFF" stroke="#4285F4" strokeWidth="1.8" />
          <path d="M2.5 5.5a2 2 0 0 1 2-2h15a2 2 0 0 1 2 2V8.5h-19V5.5z" fill="#4285F4" />
          <text x="12" y="17" textAnchor="middle" fill="#1A73E8" fontSize="9.5" fontWeight="bold" fontFamily="system-ui, -apple-system, sans-serif">31</text>
          <path d="M7 2v3M17 2v3" stroke="#4285F4" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case "googledocs":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-label={name || "Google Docs"} className={className}>
          <path d="M14.5 2H5.5A2.5 2.5 0 0 0 3 4.5v15A2.5 2.5 0 0 0 5.5 22h13a2.5 2.5 0 0 0 2.5-2.5V8L14.5 2z" fill="#4285F4" />
          <path d="M14 2v6h6.5" fill="#A1C2FA" />
          <path d="M7 12h10M7 15.5h10M7 19h6.5" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );

    case "googlesheets":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-label={name || "Google Sheets"} className={className}>
          <path d="M14.5 2H5.5A2.5 2.5 0 0 0 3 4.5v15A2.5 2.5 0 0 0 5.5 22h13a2.5 2.5 0 0 0 2.5-2.5V8L14.5 2z" fill="#0F9D58" />
          <path d="M14 2v6h6.5" fill="#87CEAC" />
          <rect x="6.5" y="11" width="11" height="8.5" rx="0.5" fill="none" stroke="#FFFFFF" strokeWidth="1.4" />
          <path d="M6.5 15.2h11M12 11v8.5" stroke="#FFFFFF" strokeWidth="1.4" />
        </svg>
      );

    // ── Microsoft ──
    case "microsoft":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-label={name || "Microsoft"} className={className}>
          <rect x="1.5" y="1.5" width="9.8" height="9.8" fill="#F25022" />
          <rect x="12.7" y="1.5" width="9.8" height="9.8" fill="#7FBA00" />
          <rect x="1.5" y="12.7" width="9.8" height="9.8" fill="#00A4EF" />
          <rect x="12.7" y="12.7" width="9.8" height="9.8" fill="#FFB900" />
        </svg>
      );

    case "outlook":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-label={name || "Outlook"} className={className}>
          <path d="M22 6.5A2.5 2.5 0 0 0 19.5 4H8.5A2.5 2.5 0 0 0 6 6.5v11A2.5 2.5 0 0 0 8.5 20h11a2.5 2.5 0 0 0 2.5-2.5v-11z" fill="#0078D4" />
          <path d="M6 7l8 5.5L22 7" stroke="#FFFFFF" strokeWidth="1.5" fill="none" />
          <rect x="2" y="6.5" width="10" height="11" rx="2" fill="#106EBE" />
          <circle cx="7" cy="12" r="2.8" stroke="#FFFFFF" strokeWidth="1.6" fill="none" />
        </svg>
      );

    case "onedrive":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-label={name || "OneDrive"} className={className}>
          <path d="M19.4 13.5a4.2 4.2 0 0 0-4-3 4.4 4.4 0 0 0-4.3 3.5 3.3 3.3 0 0 0-2.8-.5 3.4 3.4 0 0 0-2.7 3.3c0 .2 0 .4.1.6A3.8 3.8 0 0 0 2 20.8h17.4a3.8 3.8 0 0 0 0-7.3z" fill="#0078D4" />
          <path d="M16 8.5a4.4 4.4 0 0 0-3.8 2.2 4.3 4.3 0 0 1 3.2 2.8 4.2 4.2 0 0 1 4 3 3.8 3.8 0 0 0 .6-2.2 4.4 4.4 0 0 0-4-5.8z" fill="#28A8EA" />
        </svg>
      );

    case "sharepoint":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-label={name || "SharePoint"} className={className}>
          <circle cx="14" cy="9" r="5.5" fill="#038387" />
          <circle cx="16.5" cy="14.5" r="4.5" fill="#00B294" />
          <circle cx="10.5" cy="15" r="5" fill="#004E5B" />
          <rect x="2" y="7" width="9" height="10" rx="2" fill="#007579" />
          <path d="M8 10a1.5 1.5 0 0 0-3 0c0 1.5 3 1.5 3 3a1.5 1.5 0 0 1-3 0" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" fill="none" />
        </svg>
      );

    case "teams":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-label={name || "Microsoft Teams"} className={className}>
          <rect x="7" y="5" width="14" height="14" rx="3" fill="#6264A7" />
          <circle cx="17" cy="10" r="1.8" fill="#FFFFFF" />
          <path d="M13.5 16.5v-1a2 2 0 0 1 4 0v1" fill="#FFFFFF" />
          <rect x="2.5" y="7" width="9.5" height="10" rx="2" fill="#464EB8" />
          <path d="M5 10.5h4.5M7.25 10.5v4.5" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );

    // ── Atlassian ──
    case "atlassian":
    case "jira":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-label={name || "Jira"} className={className} fill="#0052CC">
          <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.001 1.001 0 0 0 23.013 0Z" />
        </svg>
      );

    case "confluence":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-label={name || "Confluence"} className={className} fill="#0052CC">
          <path d="M.52 17.51a3.67 3.67 0 0 0 2.22 4.79l6.39 2.21a3.67 3.67 0 0 0 4.7-1.92l2.7-6.07a16.66 16.66 0 0 1-7.14-2.89L.52 17.51zM23.48 6.49a3.67 3.67 0 0 0-2.22-4.79l-6.39-2.21a3.67 3.67 0 0 0-4.7 1.92l-2.7 6.07a16.66 16.66 0 0 1 7.14 2.89l8.87-3.88z" />
        </svg>
      );

    case "trello":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-label={name || "Trello"} className={className}>
          <rect width="24" height="24" rx="4.5" fill="#0079BF" />
          <rect x="3.8" y="4" width="7" height="13.5" rx="1.5" fill="#FFFFFF" />
          <rect x="13.2" y="4" width="7" height="8.5" rx="1.5" fill="#FFFFFF" />
        </svg>
      );

    case "bitbucket":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-label={name || "Bitbucket"} className={className} fill="#0052CC">
          <path d="M.78 1.21a.77.77 0 0 0-.77.89l3.26 19.81c.09.5.52.87 1.02.87H20a.77.77 0 0 0 .77-.65l3.27-20.03a.77.77 0 0 0-.77-.89zM14.52 15.53H9.52L8.17 8.47h7.56z" />
        </svg>
      );

    // ── Dev Platforms ──
    case "github":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-label={name || "GitHub"} className={className} fill="currentColor">
          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
        </svg>
      );

    case "gitlab":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-label={name || "GitLab"} className={className}>
          <path d="M23.6 9.6l-.03-.09L20.3 1a.85.85 0 0 0-1.34.05.87.87 0 0 0-.29.44l-2.2 6.75H7.54L5.33 1.49a.86.86 0 0 0-.29-.44.87.87 0 0 0-1-.05.86.86 0 0 0-.34.4L.43 9.5l-.03.09a6.07 6.07 0 0 0 2.01 7.01l7.48 5.61 1.5 1.13a1.01 1.01 0 0 0 1.22 0l1.5-1.13 7.48-5.61a6.07 6.07 0 0 0 2.01-7z" fill="#E24329" />
          <path d="M12 23.33l-4.46-13.74h8.92L12 23.33z" fill="#E24329" />
          <path d="M.43 9.5L7.54 9.59 5.33 1.49a.86.86 0 0 0-.29-.44.87.87 0 0 0-1-.05.86.86 0 0 0-.34.4L.43 9.5z" fill="#FC6D26" />
          <path d="M23.57 9.5l-7.11.09 2.21-8.1a.86.86 0 0 1 .29-.44.87.87 0 0 1 1-.05.86.86 0 0 1 .34.4l3.27 8.1z" fill="#FC6D26" />
          <path d="M12 23.33L7.54 9.59H.43a6.07 6.07 0 0 0 2.01 7.01l9.56 6.73z" fill="#FCA326" />
          <path d="M12 23.33l4.46-13.74h7.11a6.07 6.07 0 0 1-2.01 7.01l-9.56 6.73z" fill="#FCA326" />
        </svg>
      );

    case "vercel":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-label={name || "Vercel"} className={className} fill="currentColor">
          <path d="M12 2L23 21H1L12 2z" />
        </svg>
      );

    case "supabase":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-label={name || "Supabase"} className={className} fill="#3ECF8E">
          <path d="M12.97 1.03c-.02-.98-1.26-1.4-1.87-.63L1.84 12.05c-1.1 1.37-.12 3.4 1.64 3.4h9.58l.11 7.51c.02.99 1.26 1.41 1.88.64l9.26-11.65c1.09-1.38.11-3.41-1.65-3.41h-9.64z" />
        </svg>
      );

    case "cloudflare":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-label={name || "Cloudflare"} className={className}>
          <path d="M19.3 11.2a5.5 5.5 0 0 0-10.4-1.6 4.3 4.3 0 0 0-4.1 4.3c0 .3 0 .5.1.8A3.3 3.3 0 0 0 5.7 21h13.6a3.9 3.9 0 0 0 0-7.8c0-.7-.2-1.4-.6-2z" fill="#F38020" />
          <path d="M18.7 13.8a3.2 3.2 0 0 0-3-2.1c-.6 0-1.2.2-1.7.5a4.2 4.2 0 0 1 3.8 4.8h1.2a1.8 1.8 0 0 0-.3-3.2z" fill="#FAAE40" />
        </svg>
      );

    case "posthog":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-label={name || "PostHog"} className={className}>
          <path d="M3 13a4.5 4.5 0 0 1 9 0v1H3v-1zM13 8.5a4.5 4.5 0 0 1 9 0V14h-9V8.5z" fill="#F54E00" />
          <path d="M3 16h19v2.5a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V16z" fill="#1c1b18" />
          <circle cx="7.5" cy="11.5" r="1.2" fill="#1c1b18" />
          <circle cx="17.5" cy="7" r="1.2" fill="#1c1b18" />
        </svg>
      );

    case "sentry":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-label={name || "Sentry"} className={className}>
          <path d="M13.2 2.3a1.5 1.5 0 0 0-2.4 0L2.4 15.2a1.5 1.5 0 0 0 1.2 2.3h3.5a5.5 5.5 0 0 1 8.9-3.8l-1.8-3.1a2 2 0 0 0-3.4 0l-.8 1.4a2 2 0 1 1-3.5-2l1.9-3.3 4.8-4.4z" fill="#362D59" />
          <path d="M21.4 15.2L16.6 6.8a1.5 1.5 0 0 0-2.6 0l-1 1.7 1.8 3.1a5.5 5.5 0 0 1 4.3 5.9h2.3a1.5 1.5 0 0 0 1.2-2.3z" fill="#E1567C" />
          <circle cx="12" cy="17.5" r="2.5" fill="#362D59" />
        </svg>
      );

    // ── Communication & Productivity ──
    case "slack":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-label={name || "Slack"} className={className}>
          <g fill="#E01E5A">
            <path d="M5.04 13.9a2.52 2.52 0 1 0-2.52 2.52h2.52v-2.52z" />
            <path d="M6.3 13.9a2.52 2.52 0 0 0 5.04 0V7.6a2.52 2.52 0 0 0-5.04 0v6.3z" />
          </g>
          <g fill="#36C5F0">
            <path d="M10.1 5.04a2.52 2.52 0 1 0-2.52-2.52v2.52h2.52z" />
            <path d="M10.1 6.3a2.52 2.52 0 0 0 0 5.04h6.3a2.52 2.52 0 0 0 0-5.04h-6.3z" />
          </g>
          <g fill="#2EB67D">
            <path d="M18.96 10.1a2.52 2.52 0 1 0 2.52-2.52h-2.52v2.52z" />
            <path d="M17.7 10.1a2.52 2.52 0 0 0-5.04 0v6.3a2.52 2.52 0 0 0 5.04 0v-6.3z" />
          </g>
          <g fill="#ECB22E">
            <path d="M13.9 18.96a2.52 2.52 0 1 0 2.52 2.52v-2.52h-2.52z" />
            <path d="M13.9 17.7a2.52 2.52 0 0 0 0-5.04H7.6a2.52 2.52 0 0 0 0 5.04h6.3z" />
          </g>
        </svg>
      );

    case "discord":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-label={name || "Discord"} className={className} fill="#5865F2">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
      );

    case "zoom":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-label={name || "Zoom"} className={className} fill="#2D8CFF">
          <rect x="2" y="5" width="13" height="14" rx="3.5" />
          <path d="M15 9.8l6.8-4.2a.5.5 0 0 1 .7.4v12a.5.5 0 0 1-.7.4L15 14.2v-4.4z" />
        </svg>
      );

    case "notion":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-label={name || "Notion"} className={className} fill="currentColor">
          <path d="M4.46 4.21c.75.6 1.03.56 2.43.46l13.22-.79c.28 0 .05-.28-.05-.33L17.86 1.97c-.42-.33-.98-.7-2.06-.61L3.01 2.3c-.47.04-.56.28-.37.46zm.79 3.08v13.9c0 .75.38 1.03 1.22.98l14.52-.84c.84-.05.94-.56.94-1.17V6.35c0-.6-.24-.93-.75-.89l-15.18.89c-.56.05-.75.33-.75.93zm14.34.75c.09.42 0 .84-.42.88l-.7.14v10.27c-.61.33-1.17.51-1.64.51-.75 0-.93-.23-1.5-.93l-4.57-7.19v6.95L12.21 19s0 .84-1.17.84l-3.22.19c-.1-.19 0-.66.33-.75l.84-.24V9.85l-1.17-.09c-.1-.42.14-1.03.8-1.08l3.45-.23 4.76 7.28v-6.44l-1.21-.14c-.1-.51.28-.89.74-.93zM1.94 1.03l13.3-.98c1.64-.14 2.06-.05 3.09.7l4.25 2.99c.7.51.93.65.93 1.21v16.38c0 1.03-.37 1.63-1.68 1.73l-15.46.93c-.98.05-1.45-.09-1.96-.75l-3.13-4.06c-.56-.75-.79-1.3-.79-1.96V2.67c0-.84.37-1.54 1.45-1.64z" />
        </svg>
      );

    case "linear":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-label={name || "Linear"} className={className} fill="#5E6AD2">
          <path d="M2.89 4.18A11.98 11.98 0 0 1 12 0c6.63 0 12 5.38 12 12.01 0 3.64-1.62 6.9-4.18 9.1L2.89 4.18zm-1.07 1.45l16.56 16.55c-.53.33-1.08.62-1.65.87L.95 7.28c.25-.58.54-1.13.87-1.65zm-1.5 3.53l14.52 14.52c-.71.17-1.45.28-2.2.32L0 11.36a12 12 0 0 1 .32-2.2zm-.17 4.86l9.82 9.83a12.02 12.02 0 0 1-9.82-9.83z" />
        </svg>
      );

    case "clickup":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-label={name || "ClickUp"} className={className}>
          <path d="M2.5 18.5l3.5-2.7c1.8 2.4 3.8 3.5 6 3.5s4.2-1.1 6-3.5l3.5 2.7C18.8 22 15.7 23.8 12 23.8s-6.8-1.8-9.5-5.3z" fill="#7B68EE" />
          <path d="M12 4.5l6.5 5.5-2.3 2.7L12 9l-4.2 3.7-2.3-2.7L12 4.5z" fill="#FF007A" />
        </svg>
      );

    case "asana":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-label={name || "Asana"} className={className} fill="#F06A6A">
          <circle cx="12" cy="7.2" r="4.2" />
          <circle cx="6.5" cy="16.5" r="4.2" />
          <circle cx="17.5" cy="16.5" r="4.2" />
        </svg>
      );

    case "figma":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-label={name || "Figma"} className={className}>
          <path d="M5 5a3.5 3.5 0 0 1 3.5-3.5H12v7H8.5A3.5 3.5 0 0 1 5 5z" fill="#F24E1E" />
          <path d="M12 1.5h3.5a3.5 3.5 0 1 1 0 7H12v-7z" fill="#FF7262" />
          <path d="M5 12a3.5 3.5 0 0 1 3.5-3.5H12v7H8.5A3.5 3.5 0 0 1 5 12z" fill="#A259FF" />
          <circle cx="15.5" cy="12" r="3.5" fill="#1ABCFE" />
          <path d="M5 19a3.5 3.5 0 0 1 3.5-3.5H12v3.5a3.5 3.5 0 1 1-7 0z" fill="#0ACF83" />
        </svg>
      );

    case "dropbox":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-label={name || "Dropbox"} className={className} fill="#0061FF">
          <path d="M6 3L1 7.2l5 4 5-4L6 3zm12 0l-5 4.2 5 4 5-4L18 3zM1 14.8l5 4 5-4-5-4-5 4zm17-4l-5 4 5 4 5-4-5-4zM6 19.8l6 4.2 6-4.2-5-4-1 .8-1-.8-5 4z" />
        </svg>
      );

    case "box":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-label={name || "Box"} className={className} fill="#0061D5">
          <path d="M19.78 7.37c-.36-.45-.85-.8-1.42-1.02-.57-.22-1.2-.33-1.87-.33-.94 0-1.78.23-2.49.68-.71.45-1.28 1.09-1.68 1.89-.4-.8-.97-1.44-1.68-1.89-.71-.45-1.55-.68-2.49-.68-.67 0-1.3.11-1.87.33-.57.22-1.06.57-1.42 1.02C4.16 7.82 3.8 8.4 3.58 9.08 3.36 9.76 3.25 10.5 3.25 11.28c0 .78.11 1.52.33 2.2.22.68.58 1.26 1.04 1.71.46.45 1.02.8 1.67 1.02.65.22 1.37.33 2.16.33.94 0 1.78-.23 2.49-.68.71-.45 1.28-1.09 1.68-1.89.4.8.97 1.44 1.68 1.89.71.45 1.55.68 2.49.68.79 0 1.51-.11 2.16-.33.65-.22 1.21-.57 1.67-1.02.46-.45.82-1.03 1.04-1.71.22-.68.33-1.42.33-2.2 0-.78-.11-1.52-.33-2.2-.22-.68-.58-1.26-1.04-1.71zm-9.33 5.4c-.21.36-.51.64-.89.84-.38.2-.82.3-1.31.3-.49 0-.93-.1-1.31-.3-.38-.2-.68-.48-.89-.84-.21-.36-.32-.78-.32-1.26 0-.48.11-.9.32-1.26.21-.36.51-.64.89-.84.38-.2.82-.3 1.31-.3.49 0 .93.1 1.31.3.38.2.68.48.89.84.21.36.32.78.32 1.26 0 .48-.11.9-.32 1.26zm8.1 0c-.21.36-.51.64-.89.84-.38.2-.82.3-1.31.3-.49 0-.93-.1-1.31-.3-.38-.2-.68-.48-.89-.84-.21-.36-.32-.78-.32-1.26 0-.48.11-.9.32-1.26.21-.36.51-.64.89-.84.38-.2.82-.3 1.31-.3.49 0 .93.1 1.31.3.38.2.68.48.89.84.21.36.32.78.32 1.26 0 .48-.11.9-.32 1.26z" />
        </svg>
      );

    case "airtable":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-label={name || "Airtable"} className={className}>
          <path d="M12 2L1.8 5.9a.6.6 0 0 0 0 1.1l10.2 3.8 10.2-3.8a.6.6 0 0 0 0-1.1L12 2z" fill="#18BFFF" />
          <path d="M13 12v9.3a.6.6 0 0 0 .8.6l9.6-3.8a.6.6 0 0 0 .4-.6V8.6l-10.8 3.4z" fill="#F82B60" />
          <path d="M11 12L.2 8.6v8.9a.6.6 0 0 0 .4.6l9.6 3.8a.6.6 0 0 0 .8-.6V12z" fill="#FFBF00" />
        </svg>
      );

    case "hubspot":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-label={name || "HubSpot"} className={className} fill="#FF7A59">
          <path d="M18.16 7.93V5.08a2.2 2.2 0 0 0 1.27-1.98v-.07A2.2 2.2 0 0 0 17.24.85h-.07a2.2 2.2 0 0 0-2.19 2.19v.07a2.2 2.2 0 0 0 1.25 1.97v2.85a6.22 6.22 0 0 0-2.97 1.31L5.43 3.14A2.5 2.5 0 1 0 4.3 4.66l7.7 5.99a6.18 6.18 0 0 0-1.04 3.45c0 1.34.43 2.59 1.15 3.61l-2.34 2.34a2 2 0 0 0-.58-.1 2.03 2.03 0 1 0 2.03 2.04 1.98 1.98 0 0 0-.1-.6l2.32-2.32a6.25 6.25 0 1 0 4.78-11.14zm-.96 9.38a3.21 3.21 0 1 1 3.21-3.21 3.21 3.21 0 0 1-3.21 3.21z" />
        </svg>
      );

    case "salesforce":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-label={name || "Salesforce"} className={className} fill="#00A1E0">
          <path d="M10.01 5.42a4.2 4.2 0 0 1 3.04-1.31c1.56 0 2.95.9 3.69 2.21.63-.3 1.35-.45 2.1-.45 2.85 0 5.16 2.34 5.16 5.22s-2.31 5.22-5.18 5.22c-.34 0-.69-.04-1.02-.1a3.75 3.75 0 0 1-3.3 1.95c-.6 0-1.15-.15-1.65-.38A4.31 4.31 0 0 1 8.88 20.4a4.3 4.3 0 0 1-4.05-2.82 4.05 4.05 0 0 1-.82.08 4.05 4.05 0 0 1-4-4.05c0-1.5.81-2.81 2.01-3.51-.26-.57-.39-1.2-.39-1.85 0-2.58 2.1-4.65 4.65-4.65 1.53 0 2.85.7 3.73 1.82z" />
        </svg>
      );

    case "intercom":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-label={name || "Intercom"} className={className} fill="#286EFA">
          <path d="M21 0H3C1.34 0 0 1.34 0 3v18c0 1.66 1.34 3 3 3h18c1.66 0 3-1.34 3-3V3c0-1.66-1.34-3-3-3zm-5.8 4.4c0-.44.36-.8.8-.8s.8.36.8.8v10.69c0 .44-.36.8-.8.8s-.8-.36-.8-.8V4.4zm-4-.4c0-.44.36-.8.8-.8s.8.36.8.8v11.6c0 .44-.36.8-.8.8s-.8-.36-.8-.8V4zm-4 .4c0-.44.36-.8.8-.8s.8.36.8.8v10.69c0 .44-.36.8-.8.8s-.8-.36-.8-.8V4.4zM3.2 6c0-.44.36-.8.8-.8s.8.36.8.8v7.2c0 .44-.36.8-.8.8s-.8-.36-.8-.8V6zm17.32 12.2c-.12.1-3.08 2.6-8.52 2.6s-8.4-2.5-8.52-2.6a.79.79 0 0 1-.09-1.12.8.8 0 0 1 1.13-.1c.05.04 2.7 2.22 7.48 2.22 4.85 0 7.46-2.19 7.48-2.21a.8.8 0 0 1 1.13.08.8.8 0 0 1-.09 1.13zm.28-5c0 .44-.36.8-.8.8s-.8-.36-.8-.8V6c0-.44.36-.8.8-.8s.8.36.8.8v7.2z" />
        </svg>
      );

    case "zendesk":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-label={name || "Zendesk"} className={className} fill="#03363D">
          <path d="M12.91 2.9v13.39L24 2.9H12.91zM0 2.91C0 5.97 2.48 8.45 5.54 8.45s5.54-2.48 5.54-5.54H0zm11.09 4.81L0 21.1h11.09V7.72zm7.37 7.84c-3.06 0-5.54 2.48-5.54 5.54H24c0-3.06-2.48-5.54-5.54-5.54z" />
        </svg>
      );

    case "stripe":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-label={name || "Stripe"} className={className} fill="#635BFF">
          <path d="M13.98 9.15c-2.17-.8-3.36-1.43-3.36-2.4 0-.84.68-1.31 1.9-1.31 2.23 0 4.52.86 6.09 1.63l.89-5.5C18.25.98 15.7 0 12.17 0 9.67 0 7.59.65 6.1 1.87 4.56 3.15 3.76 5 3.76 7.22c0 4.04 2.46 5.76 6.47 7.22 2.59.92 3.45 1.57 3.45 2.58 0 .98-.84 1.55-2.35 1.55-1.88 0-4.97-.92-6.99-2.11l-.9 5.56C5.18 23 8.39 24 11.71 24c2.64 0 4.84-.62 6.33-1.81 1.66-1.3 2.53-3.24 2.53-5.73 0-4.13-2.53-5.85-6.6-7.31z" />
        </svg>
      );

    case "shopify":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-label={name || "Shopify"} className={className} fill="#95BF47">
          <path d="M15.34 23.98l7.21-1.56s-2.6-17.61-2.62-17.73c-.02-.12-.12-.2-.21-.2s-1.93-.13-1.93-.13-1.28-1.27-1.44-1.41a.3.3 0 0 0-.12-.08l-.92 21.11h.03zm-3.63-12.67s-.8-.43-1.77-.43c-1.45 0-1.5.9-1.5 1.14 0 1.23 3.24 1.72 3.24 4.63 0 2.3-1.44 3.76-3.4 3.76-2.36 0-3.55-1.47-3.55-1.47l.65-2.08s1.24 1.06 2.28 1.06c.67 0 .97-.54.97-.93 0-1.62-2.65-1.7-2.65-4.36 0-2.24 1.57-4.42 4.83-4.42 1.25 0 1.87.36 1.87.36l-.94 2.72h-.03zm-.54-10.48c.14 0 .27.04.4.14-.98.46-2.06 1.64-2.5 4-.66.2-1.3.4-1.9.57.8-1.79 2.05-4.7 4.27-4.7v-.01zm1.24 2.95v.13c-.76.23-1.59.49-2.4.74.47-1.78 1.34-2.65 2.09-2.97.2.5.31 1.18.31 2.1zm.54-2.23c.7.07 1.14.86 1.43 1.75-.35.12-.74.23-1.16.37v-.25c0-.76-.1-1.38-.27-1.87zm2.99 1.29c-.02 0-.06.02-.08.02s-.29.08-.71.21c-.43-1.23-1.18-2.37-2.51-2.37h-.12C12.13.21 11.67 0 11.26 0 8.16 0 6.68 3.88 6.21 5.85c-1.2.36-2.06.63-2.16.67-.68.21-.7.23-.77.87-.08.46-1.83 14.06-1.83 14.06L15.01 24l.93-21.17z" />
        </svg>
      );

    case "zapier":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-label={name || "Zapier"} className={className}>
          <g stroke="#FF4F00" strokeWidth="2.8" strokeLinecap="round">
            <line x1="12" y1="12" x2="21.5" y2="12" />
            <line x1="12" y1="12" x2="2.5" y2="12" />
            <line x1="12" y1="12" x2="12" y2="21.5" />
            <line x1="12" y1="12" x2="12" y2="2.5" />
            <line x1="12" y1="12" x2="18.7" y2="18.7" />
            <line x1="12" y1="12" x2="5.3" y2="5.3" />
            <line x1="12" y1="12" x2="5.3" y2="18.7" />
            <line x1="12" y1="12" x2="18.7" y2="5.3" />
          </g>
          <circle cx="12" cy="12" r="2.2" fill="#FF4F00" />
        </svg>
      );

    case "make":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-label={name || "Make"} className={className} fill="#6D00CC">
          <path d="M13.38 3.5c-.27 0-.51.19-.57.46L9.85 18.99a.58.58 0 0 0 .45.68l4.1.82a.58.58 0 0 0 .68-.45l2.96-15.02a.58.58 0 0 0-.45-.68l-4.1-.83a.59.59 0 0 0-.11-.01zm-5.88.1a.58.58 0 0 0-.51.32L.06 17.7a.58.58 0 0 0 .26.77l3.73 1.88a.58.58 0 0 0 .78-.26l6.92-13.78a.58.58 0 0 0-.25-.78L7.76 3.66a.57.57 0 0 0-.26-.06zm11.74.12a.58.58 0 0 0-.58.57v15.43c0 .32.26.58.58.58h4.18a.58.58 0 0 0 .58-.58V4.29a.58.58 0 0 0-.58-.58z" />
        </svg>
      );

    case "n8n":
      return (
        <svg viewBox="0 0 24 24" role="img" aria-label={name || "n8n"} className={className} fill="#EA4B71">
          <path d="M21.47 5.68a2.45 2.45 0 0 0-2.44 1.9H16.14a2.49 2.49 0 0 0-2.49 2.1l-.1.63a1.26 1.26 0 0 1-1.25 1.06H11.3a2.45 2.45 0 0 0-4.89 0H4.97a2.45 2.45 0 1 0 0 1.26h1.43a2.45 2.45 0 0 0 4.89 0h1.01a1.26 1.26 0 0 1 1.24 1.06l.1.62c.2 1.22 1.26 2.11 2.5 2.11h.37a2.45 2.45 0 1 0 2.44-2.52c-1.17 0-2.16.8-2.44 1.9h-.37a1.26 1.26 0 0 1-1.25-1.06l-.1-.62A2.52 2.52 0 0 0 13.96 12c0-.57.2-1.1.82-1.48l.1-.62a1.26 1.26 0 0 1 1.25-1.06h2.9a2.45 2.45 0 1 0 2.44-3.16z" />
        </svg>
      );

    case "custom-mcp":
    default:
      return (
        <svg viewBox="0 0 24 24" role="img" aria-label={name || id || "Custom MCP"} className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.2" />
        </svg>
      );
  }
}

/**
 * Returns true if the brand has a recognized vector logo in the registry.
 */
export function hasBrandIcon(id?: string, name?: string): boolean {
  const brand = normalizeBrandKey(id, name);
  return brand.length > 0;
}
