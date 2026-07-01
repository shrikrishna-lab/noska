import React, { useState } from "react";
import { Link, Globe, FolderOpen, ExternalLink, GitFork, MapPinned, Pen, FilePlus, Eye, BarChart3, Monitor, Grid3X3, VideoIcon, FormInput, Code, Hash, Database, Layout, Trash2, Edit2, Play, Music, FileText, BookOpen, MessageSquare } from "lucide-react";
import { Workflow, FileArchive } from "lucide-react";

const PROVIDERS = {
  "embed-generic": { name: "Embed", icon: Globe, placeholder: "Paste any secure web URL..." },
  "google-drive": { name: "Google Drive", icon: FolderOpen, placeholder: "Paste a Google Drive share link..." },
  "google-docs": { name: "Google Docs", icon: FileText, placeholder: "Paste a Google Docs link..." },
  "google-slides": { name: "Google Slides", icon: Monitor, placeholder: "Paste a Google Slides link..." },
  "google-sheets": { name: "Google Sheets", icon: Grid3X3, placeholder: "Paste a Google Sheets link..." },
  "notion": { name: "Notion", icon: BookOpen, placeholder: "Paste a Notion page link..." },
  "tweet": { name: "Tweet / X", icon: ExternalLink, placeholder: "Paste a Tweet or X post URL..." },
  "github-gist": { name: "GitHub Gist", icon: GitFork, placeholder: "Paste a GitHub Gist URL..." },
  "github": { name: "GitHub", icon: Code, placeholder: "Paste a GitHub repo or file link..." },
  "google-maps": { name: "Google Maps", icon: MapPinned, placeholder: "Paste a Google Maps link..." },
  "figma": { name: "Figma", icon: Pen, placeholder: "Paste a Figma file or frame link..." },
  "abstract": { name: "Abstract", icon: FilePlus, placeholder: "Paste an Abstract link..." },
  "invision": { name: "Invision", icon: Eye, placeholder: "Paste an Invision link..." },
  "mixpanel": { name: "Mixpanel", icon: BarChart3, placeholder: "Paste a Mixpanel report link..." },
  "framer": { name: "Framer", icon: Monitor, placeholder: "Paste a Framer preview link..." },
  "whimsical": { name: "Whimsical", icon: Pen, placeholder: "Paste a Whimsical board link..." },
  "miro": { name: "Miro", icon: Grid3X3, placeholder: "Paste a Miro board link..." },
  "sketch": { name: "Sketch", icon: Pen, placeholder: "Paste a Sketch cloud link..." },
  "excalidraw": { name: "Excalidraw", icon: Pen, placeholder: "Paste an Excalidraw link..." },
  "pdf": { name: "PDF", icon: FileText, placeholder: "Paste a direct PDF link..." },
  "loom": { name: "Loom", icon: VideoIcon, placeholder: "Paste a Loom video URL..." },
  "typeform": { name: "Typeform", icon: FormInput, placeholder: "Paste a Typeform link..." },
  "codepen": { name: "CodePen", icon: Code, placeholder: "Paste a CodePen URL..." },
  "replit": { name: "Replit", icon: Code, placeholder: "Paste a Replit URL..." },
  "hex": { name: "Hex", icon: Hash, placeholder: "Paste a Hex project link..." },
  "deepnote": { name: "Deepnote", icon: Database, placeholder: "Paste a Deepnote URL..." },
  "trello": { name: "Trello", icon: Layout, placeholder: "Paste a Trello board or card link..." },
  "dropbox-paper": { name: "Dropbox Paper", icon: FolderOpen, placeholder: "Paste a Dropbox Paper link..." },
  "evernote": { name: "Evernote", icon: FileText, placeholder: "Paste an Evernote note link..." },
  "workflowy": { name: "Workflowy", icon: Workflow, placeholder: "Paste a Workflowy list link..." },
  "word": { name: "Word Document", icon: FileText, placeholder: "Paste an online Word document link..." },
  "monday": { name: "Monday.com", icon: Layout, placeholder: "Paste a Monday board link..." },
  "quip": { name: "Quip", icon: MessageSquare, placeholder: "Paste a Quip document URL..." },
  "zip": { name: "ZIP Archive", icon: FileArchive, placeholder: "Paste a URL to a ZIP archive..." },
  "youtube": { name: "YouTube", icon: VideoIcon, placeholder: "Paste a YouTube link..." },
  "vimeo": { name: "Vimeo", icon: VideoIcon, placeholder: "Paste a Vimeo link..." },
  "spotify": { name: "Spotify", icon: Music, placeholder: "Paste a Spotify track/playlist link..." },
  "apple-music": { name: "Apple Music", icon: Music, placeholder: "Paste an Apple Music link..." },
};

function detectProvider(url) {
  if (!url) return "embed-generic";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("vimeo.com")) return "vimeo";
  if (url.includes("spotify.com")) return "spotify";
  if (url.includes("music.apple.com")) return "apple-music";
  if (url.includes("figma.com")) return "figma";
  if (url.includes("drive.google.com")) return "google-drive";
  if (url.includes("docs.google.com/document")) return "google-docs";
  if (url.includes("docs.google.com/presentation")) return "google-slides";
  if (url.includes("docs.google.com/spreadsheets")) return "google-sheets";
  if (url.includes("maps.google.com") || url.includes("google.com/maps")) return "google-maps";
  if (url.includes("notion.so") || url.includes("notion.site")) return "notion";
  if (url.includes("twitter.com") || url.includes("x.com")) return "tweet";
  if (url.includes("github.com")) {
    if (url.includes("gist.github.com")) return "github-gist";
    return "github";
  }
  if (url.includes("codepen.io")) return "codepen";
  if (url.includes("loom.com")) return "loom";
  if (url.includes("miro.com")) return "miro";
  if (url.includes("framer.com") || url.includes("framer.ai")) return "framer";
  if (url.includes("typeform.com")) return "typeform";
  if (url.includes("trello.com")) return "trello";
  if (url.includes("replit.com")) return "replit";
  if (url.includes("excalidraw.com")) return "excalidraw";
  if (url.includes("whimsical.com")) return "whimsical";
  if (url.includes("sketch.com")) return "sketch";
  if (url.includes("monday.com")) return "monday";
  if (url.match(/\.pdf($|\?)/i)) return "pdf";
  return "embed-generic";
}

function getEmbedUrl(url, type) {
  if (!url) return "";

  if (type === "youtube" || (!type && (url.includes("youtube.com") || url.includes("youtu.be")))) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2]?.length === 11) {
      return `https://www.youtube.com/embed/${match[2]}?rel=0&modestbranding=1`;
    }
  }

  if (type === "vimeo" || (!type && url.includes("vimeo.com"))) {
    const match = url.match(/vimeo\.com\/(\d+)/);
    if (match) return `https://player.vimeo.com/video/${match[1]}`;
  }

  if (type === "figma" && (url.includes("figma.com/file/") || url.includes("figma.com/design/"))) {
    return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`;
  }

  if (type === "google-maps") {
    if (url.includes("maps.google.com") || url.includes("google.com/maps")) {
      return `${url}&output=embed`;
    }
    return `https://maps.google.com/maps?q=${encodeURIComponent(url)}&output=embed`;
  }

  if (type === "google-docs") {
    return `https://docs.google.com/document/d/${extractGoogleId(url, "document")}/preview`;
  }

  if (type === "google-slides") {
    return `https://docs.google.com/presentation/d/${extractGoogleId(url, "presentation")}/embed`;
  }

  if (type === "google-sheets") {
    return `https://docs.google.com/spreadsheets/d/${extractGoogleId(url, "spreadsheets")}/preview`;
  }

  if (type === "codepen" && url.includes("codepen.io")) {
    return url.replace("/pen/", "/embed/");
  }

  if (type === "loom" && url.includes("loom.com/share/")) {
    return url.replace("/share/", "/embed/");
  }

  if (type === "notion") {
    return `https://notion.so/${extractNotionPageId(url)}`;
  }

  if (type === "spotify") {
    const trackMatch = url.match(/track\/([a-zA-Z0-9]+)/);
    const playlistMatch = url.match(/playlist\/([a-zA-Z0-9]+)/);
    if (trackMatch) return `https://open.spotify.com/embed/track/${trackMatch[1]}`;
    if (playlistMatch) return `https://open.spotify.com/embed/playlist/${playlistMatch[1]}`;
  }

  if (type === "apple-music") {
    const match = url.match(/\/album\/[^/]+\/(\d+)/);
    if (match) {
      return `https://embed.music.apple.com/us/album/${match[1]}`;
    }
  }

  if (type === "tweet") {
    const match = url.match(/\/status\/(\d+)/);
    if (match) return `https://platform.twitter.com/embed/Tweet.html?id=${match[1]}`;
  }

  if (type === "pdf") return url;

  if (type === "word" && (url.includes("sharepoint.com") || url.includes("office.com"))) {
    return `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
  }

  return url;
}

function extractGoogleId(url, type) {
  const regex = new RegExp(`${type}/d/([a-zA-Z0-9_-]+)`);
  const match = url.match(regex);
  return match ? match[1] : "";
}

function extractNotionPageId(url) {
  const match = url.match(/([a-f0-9]{32})/);
  if (match) return match[1];
  const parts = url.split("/").pop()?.split("-");
  const last = parts?.[parts.length - 1];
  if (last && last.length >= 8) return last;
  return encodeURIComponent(url);
}

export default function EmbedBlock({ block, onPatch, onKeyDown, onDelete }) {
  const type = block.type || "embed-generic";
  const provider = PROVIDERS[type] || PROVIDERS["embed-generic"];
  const ProviderIcon = provider.icon;

  const [inputUrl, setInputUrl] = useState(block.text || "");
  const [mode, setMode] = useState("url");
  const hasUrl = !!block.text;
  const detectedType = hasUrl ? detectProvider(block.text) : type;

  const handleEmbed = (e) => {
    e?.preventDefault();
    if (inputUrl.trim()) {
      const detected = detectProvider(inputUrl.trim());
      onPatch({ text: inputUrl.trim(), type: detected });
    }
  };

  return (
    <div className="my-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] shadow-sm relative group/embed">
      {!hasUrl ? (
        <form onSubmit={handleEmbed} className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
            <ProviderIcon size={16} className="text-[var(--accent)]" />
            <span>Embed {provider.name}</span>
          </div>
          <div className="flex gap-1 bg-[var(--surface)] rounded-lg border border-[var(--border)] p-0.5 self-start">
            <button
              type="button"
              onClick={() => setMode("url")}
              className={`rounded-md px-3 py-1 text-[10px] font-medium transition cursor-pointer ${
                mode === "url" ? "bg-[var(--accent)] text-white" : "text-[var(--secondary)] hover:text-[var(--text)]"
              }`}
            >
              Link
            </button>
            <button
              type="button"
              onClick={() => setMode("embed")}
              className={`rounded-md px-3 py-1 text-[10px] font-medium transition cursor-pointer ${
                mode === "embed" ? "bg-[var(--accent)] text-white" : "text-[var(--secondary)] hover:text-[var(--text)]"
              }`}
            >
              Embed code
            </button>
          </div>
          {mode === "url" ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleEmbed();
                  else onKeyDown?.(e);
                }}
                placeholder={provider.placeholder}
                className="flex-1 rounded-lg border border-[var(--border-strong)] bg-[var(--bg)] px-3.5 py-2 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)]"
                autoFocus
              />
              <button
                type="submit"
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition"
              >
                Embed
              </button>
            </div>
          ) : (
            <textarea
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Paste embed iframe code..."
              rows={3}
              className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg)] px-3.5 py-2 text-xs font-mono text-[var(--text)] outline-none focus:border-[var(--accent)] resize-none"
            />
          )}
        </form>
      ) : (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <div className="flex items-center gap-2 text-xs font-medium text-[var(--secondary)]">
              <ProviderIcon size={14} className="text-[var(--accent)]" />
              <span>{PROVIDERS[detectedType]?.name || "Embed"} Link</span>
              <span className="text-[10px] text-[var(--muted)] truncate max-w-[200px]">{block.text}</span>
            </div>
            <div className="flex gap-1">
              <a
                href={block.text}
                target="_blank"
                rel="noreferrer"
                className="rounded p-1 text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition"
                title="Open original link"
              >
                <Play size={12} />
              </a>
              <button
                onClick={() => { setInputUrl(""); onPatch({ text: "" }); }}
                className="rounded p-1 text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--danger)] transition"
                title="Clear embed"
              >
                <Trash2 size={12} />
              </button>
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="rounded p-1 text-[var(--muted)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] transition"
                  title="Delete block"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="mx-4 mb-4 overflow-hidden rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] h-[360px] relative">
            {detectedType === "notion" ? (
              <div className="flex items-center justify-center h-full bg-[var(--surface-2)]">
                <div className="text-center p-6">
                  <BookOpen size={32} className="mx-auto text-[var(--muted)] mb-2" />
                  <div className="text-sm font-medium text-[var(--text)]">Notion Page Preview</div>
                  <a href={block.text} target="_blank" rel="noreferrer" className="text-xs text-[var(--accent)] hover:underline mt-1 inline-block">
                    Open in Notion
                  </a>
                </div>
              </div>
            ) : (
              <iframe
                src={getEmbedUrl(block.text, type)}
                title={`${PROVIDERS[detectedType]?.name || "Embed"} Preview`}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
                loading="lazy"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
