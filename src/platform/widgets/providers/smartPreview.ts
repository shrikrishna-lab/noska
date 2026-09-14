/**
 * Noska Widget Platform — URL Intelligence & Smart Preview Resolver.
 * Recognizes known SaaS and developer tools (GitHub, Figma, Linear, Jira, Google Drive, Loom, YouTube)
 * and resolves URLs into first-class native widget previews or securely sandboxed embeds.
 */
import { ExternalUrlResolver } from "../../../lib/connections/urlResolver";

export type ResolvedUrlType = "native_widget" | "rich_preview" | "bookmark" | "embed";

export interface SmartUrlResolution {
  originalUrl: string;
  type: ResolvedUrlType;
  provider?: string;
  providerId?: string;
  resourceType?: string;
  title?: string;
  description?: string;
  icon?: string;
  suggestedRepresentation?: ResolvedUrlType;
  suggestedWidgetId?: string;
  suggestedConfig?: Record<string, unknown>;
  embedUrl?: string;
  isSafeForEmbed: boolean;
}

export class SmartPreviewResolver {
  /**
   * Deterministically analyze a pasted URL and suggest the optimal widget representation.
   */
  static resolve(url: string): SmartUrlResolution {
    const trimmed = url.trim();

    // Check YouTube / Loom directly first
    if (/youtube\.com|youtu\.be/i.test(trimmed)) {
      const videoIdMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
      const videoId = videoIdMatch ? videoIdMatch[1] : null;
      return {
        originalUrl: trimmed,
        type: "embed",
        provider: "youtube",
        providerId: "youtube",
        resourceType: "video",
        title: "YouTube Video Player",
        embedUrl: videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : trimmed,
        suggestedRepresentation: "embed",
        suggestedWidgetId: "external-embed",
        suggestedConfig: { url: videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : trimmed },
        isSafeForEmbed: true,
      };
    }

    if (/loom\.com\/share/i.test(trimmed)) {
      const loomMatch = trimmed.match(/loom\.com\/share\/([a-f0-9]+)/i);
      const loomId = loomMatch ? loomMatch[1] : null;
      return {
        originalUrl: trimmed,
        type: "embed",
        provider: "loom",
        providerId: "loom",
        resourceType: "video",
        title: "Loom Screen Recording",
        embedUrl: loomId ? `https://www.loom.com/embed/${loomId}` : trimmed,
        suggestedRepresentation: "embed",
        suggestedWidgetId: "external-embed",
        suggestedConfig: { url: loomId ? `https://www.loom.com/embed/${loomId}` : trimmed },
        isSafeForEmbed: true,
      };
    }

    const match = ExternalUrlResolver.detectUrl(trimmed);

    // 1. Known Provider URL Matches
    if (match) {
      const pId = match.provider.id;
      switch (pId) {
        case "github":
          if (match.resourceType === "pull_request") {
            return {
              originalUrl: trimmed,
              type: "native_widget",
              provider: "github",
              providerId: "github",
              resourceType: "pull_request",
              title: `GitHub PR (${match.displayHint})`,
              suggestedRepresentation: "native_widget",
              suggestedWidgetId: "github-prs",
              suggestedConfig: { url: match.canonicalUrl },
              isSafeForEmbed: false,
            };
          }
          if (match.resourceType === "issue") {
            return {
              originalUrl: trimmed,
              type: "native_widget",
              provider: "github",
              providerId: "github",
              resourceType: "issue",
              title: `GitHub Issue (${match.displayHint})`,
              suggestedRepresentation: "native_widget",
              suggestedWidgetId: "github-issues",
              suggestedConfig: { url: match.canonicalUrl },
              isSafeForEmbed: false,
            };
          }
          return {
            originalUrl: trimmed,
            type: "native_widget",
            provider: "github",
            providerId: "github",
            resourceType: "repository",
            title: `GitHub Repo (${match.displayHint})`,
            suggestedRepresentation: "native_widget",
            suggestedWidgetId: "github-prs",
            suggestedConfig: { url: match.canonicalUrl },
            isSafeForEmbed: false,
          };

        case "figma":
          return {
            originalUrl: trimmed,
            type: "native_widget",
            provider: "figma",
            providerId: "figma",
            resourceType: match.resourceType,
            title: "Figma Live Canvas Preview",
            suggestedRepresentation: "native_widget",
            suggestedWidgetId: "figma-preview",
            suggestedConfig: { url: match.canonicalUrl },
            embedUrl: `https://www.figma.com/embed?embed_host=noska&url=${encodeURIComponent(trimmed)}`,
            isSafeForEmbed: true,
          };

        case "google_drive":
          return {
            originalUrl: trimmed,
            type: "rich_preview",
            provider: "google_drive",
            providerId: "google_drive",
            resourceType: match.resourceType,
            title: "Google Drive Resource",
            suggestedRepresentation: "native_widget",
            suggestedWidgetId: "google-drive",
            suggestedConfig: { url: match.canonicalUrl },
            isSafeForEmbed: false,
          };

        default:
          return {
            originalUrl: trimmed,
            type: "rich_preview",
            provider: pId,
            providerId: pId,
            title: match.displayHint,
            suggestedRepresentation: "native_widget",
            suggestedWidgetId: "external-embed",
            suggestedConfig: { url: trimmed },
            isSafeForEmbed: false,
          };
      }
    }

    // 2. Generic HTTPS Web URLs -> Safe Sandboxed Embed or Bookmark
    const isHttps = /^https:\/\//i.test(trimmed);
    return {
      originalUrl: trimmed,
      type: isHttps ? "embed" : "bookmark",
      provider: "generic",
      providerId: "generic",
      title: trimmed.replace(/^https?:\/\//i, "").split("/")[0],
      suggestedRepresentation: isHttps ? "embed" : "bookmark",
      suggestedWidgetId: "external-embed",
      suggestedConfig: { url: trimmed },
      embedUrl: trimmed,
      isSafeForEmbed: isHttps,
    };
  }
}

