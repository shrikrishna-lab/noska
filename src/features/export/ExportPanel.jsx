import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING_PRESETS } from "../motion/MotionSystem";
import {
  Download,
  FileText,
  Code2,
  FileJson,
  Globe,
  Copy,
  Check,
  X,
  Package
} from "lucide-react";

/* ─── block → format converters ─── */

function blocksToMarkdown(blocks, indent = 0) {
  return blocks
    .map((b) => {
      const pad = "  ".repeat(indent);
      switch (b.type) {
        case "h1":       return `${pad}# ${b.text}`;
        case "h2":       return `${pad}## ${b.text}`;
        case "h3":       return `${pad}### ${b.text}`;
        case "bullet":   return `${pad}- ${b.text}`;
        case "number":   return `${pad}1. ${b.text}`;
        case "todo":     return `${pad}- [${b.checked ? "x" : " "}] ${b.text}`;
        case "quote":    return `${pad}> ${b.text}`;
        case "code":     return `${pad}\`\`\`\n${pad}${b.text}\n${pad}\`\`\``;
        case "divider":  return `${pad}---`;
        case "callout":  return `${pad}> ${b.meta?.icon || "💡"} ${b.text}`;
        case "toggle":   return `${pad}<details>\n${pad}  <summary>${b.text}</summary>\n${pad}</details>`;
        case "image":    return `${pad}![image](${b.text})`;
        case "embed":    return `${pad}[${b.text}](${b.text})`;
        case "equation": return `${pad}$$${b.text}$$`;
        case "table":
          if (!b.table?.length) return "";
          return b.table
            .map((row, i) => {
              const cells = `| ${row.join(" | ")} |`;
              if (i === 0) return `${cells}\n| ${row.map(() => "---").join(" | ")} |`;
              return cells;
            })
            .join("\n");
        case "database":
          if (!b.database?.rows?.length) return `${pad}**${b.text}** (database)`;
          const cols = b.database.properties?.map((p) => p.name) || Object.keys(b.database.rows[0]);
          const header = `| ${cols.join(" | ")} |`;
          const sep = `| ${cols.map(() => "---").join(" | ")} |`;
          const rows = b.database.rows
            .map((r) => `| ${cols.map((c) => r[c.toLowerCase()] ?? r[c] ?? "").join(" | ")} |`)
            .join("\n");
          return `${pad}### ${b.text}\n\n${header}\n${sep}\n${rows}`;
        default:         return `${pad}${b.text || ""}`;
      }
    })
    .filter(Boolean)
    .join("\n\n");
}

function blocksToHtml(blocks) {
  return blocks
    .map((b) => {
      switch (b.type) {
        case "h1":       return `<h1>${esc(b.text)}</h1>`;
        case "h2":       return `<h2>${esc(b.text)}</h2>`;
        case "h3":       return `<h3>${esc(b.text)}</h3>`;
        case "bullet":   return `<ul><li>${esc(b.text)}</li></ul>`;
        case "number":   return `<ol><li>${esc(b.text)}</li></ol>`;
        case "todo":     return `<div class="todo"><input type="checkbox" ${b.checked ? "checked" : ""} disabled /> ${esc(b.text)}</div>`;
        case "quote":    return `<blockquote>${esc(b.text)}</blockquote>`;
        case "code":     return `<pre><code>${esc(b.text)}</code></pre>`;
        case "divider":  return `<hr />`;
        case "callout":  return `<aside class="callout"><span>${b.meta?.icon || "💡"}</span> ${esc(b.text)}</aside>`;
        case "toggle":   return `<details><summary>${esc(b.text)}</summary></details>`;
        case "image":    return `<figure><img src="${esc(b.text)}" alt="image" /></figure>`;
        case "embed":    return `<a href="${esc(b.text)}">${esc(b.text)}</a>`;
        case "equation": return `<div class="equation">$$${esc(b.text)}$$</div>`;
        case "table":
          if (!b.table?.length) return "";
          return `<table>${b.table.map((row, i) => `<tr>${row.map((c) => `<${i === 0 ? "th" : "td"}>${esc(c)}</${i === 0 ? "th" : "td"}>`).join("")}</tr>`).join("")}</table>`;
        case "database":
          return `<h3>${esc(b.text)}</h3><p><em>(Database with ${b.database?.rows?.length || 0} rows)</em></p>`;
        default:         return `<p>${esc(b.text || "")}</p>`;
      }
    })
    .filter(Boolean)
    .join("\n");
}

function esc(s) {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function blocksToPlainText(blocks) {
  return blocks
    .map((b) => {
      switch (b.type) {
        case "h1":       return `${b.text}\n${"=".repeat(b.text?.length || 4)}`;
        case "h2":       return `${b.text}\n${"-".repeat(b.text?.length || 4)}`;
        case "h3":       return `### ${b.text}`;
        case "bullet":   return `  • ${b.text}`;
        case "number":   return `  1. ${b.text}`;
        case "todo":     return `  [${b.checked ? "✓" : " "}] ${b.text}`;
        case "quote":    return `  "${b.text}"`;
        case "divider":  return "────────────────";
        case "callout":  return `  ${b.meta?.icon || "💡"} ${b.text}`;
        case "table":
          return b.table?.map((row) => row.join("\t")).join("\n") || "";
        case "database":
          return `[Database: ${b.text}] — ${b.database?.rows?.length || 0} rows`;
        default:         return b.text || "";
      }
    })
    .filter((l) => l !== "")
    .join("\n");
}

/* ─── format definitions ─── */

const FORMATS = [
  { id: "md",   label: "Markdown",   ext: ".md",   mime: "text/markdown",   icon: FileText },
  { id: "html", label: "HTML",       ext: ".html", mime: "text/html",       icon: Globe },
  { id: "txt",  label: "Plain Text", ext: ".txt",  mime: "text/plain",      icon: Code2 },
  { id: "json", label: "JSON",       ext: ".json", mime: "application/json", icon: FileJson }
];

/* ─── helper: generate content ─── */

function generateContent(page, format) {
  switch (format) {
    case "md":
      return `# ${page.title}\n\n${blocksToMarkdown(page.blocks)}`;
    case "html":
      return `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <title>${esc(page.title)}</title>\n  <style>body{font-family:system-ui,sans-serif;max-width:720px;margin:2rem auto;padding:0 1rem;color:#e0e0e0;background:#1a1a1a}h1,h2,h3{color:#f0f0f0}blockquote{border-left:3px solid #555;padding-left:1rem;color:#aaa}pre{background:#222;padding:1rem;border-radius:8px;overflow-x:auto}hr{border:none;border-top:1px solid #333;margin:2rem 0}.callout{background:#262626;border-left:3px solid #7c3aed;padding:0.75rem 1rem;border-radius:0 8px 8px 0}.todo{display:flex;align-items:center;gap:0.5rem}table{width:100%;border-collapse:collapse}th,td{border:1px solid #333;padding:0.5rem;text-align:left}th{background:#262626}</style>\n</head>\n<body>\n  <h1>${esc(page.title)}</h1>\n  ${blocksToHtml(page.blocks)}\n</body>\n</html>`;
    case "txt":
      return `${page.title}\n${"=".repeat(page.title.length)}\n\n${blocksToPlainText(page.blocks)}`;
    case "json":
      return JSON.stringify({ id: page.id, title: page.title, icon: page.icon, tags: page.tags, updatedAt: page.updatedAt, blocks: page.blocks }, null, 2);
    default:
      return "";
  }
}

/* ─── download helper ─── */

function download(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9_\- ]/g, "").replace(/\s+/g, "_") || "untitled";
}

/* ─── main component ─── */

export default function ExportPanel({ page, pages, onClose, onToast }) {
  const [format, setFormat] = useState("md");
  const [scope, setScope] = useState("current"); // "current" | "all"
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const fmt = FORMATS.find((f) => f.id === format);
  const preview = useMemo(() => {
    if (scope === "all") {
      return pages
        .filter((p) => !p.trashed)
        .map((p) => generateContent(p, format))
        .join("\n\n---\n\n");
    }
    return generateContent(page, format);
  }, [page, pages, format, scope]);

  const handleDownload = () => {
    if (scope === "all") {
      const content = pages
        .filter((p) => !p.trashed)
        .map((p) => generateContent(p, format))
        .join("\n\n---\n\n");
      download(`noska_export${fmt.ext}`, content, fmt.mime);
    } else {
      download(`${sanitizeFilename(page.title)}${fmt.ext}`, preview, fmt.mime);
    }
    onToast?.(`Exported as ${fmt.label}`);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(preview);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onToast?.("Copied to clipboard");
    } catch {
      onToast?.("Failed to copy");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[4px] flex items-center justify-center p-6"
      onMouseDown={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 10 }}
        transition={SPRING_PRESETS.soft}
        className="w-[720px] max-w-full max-h-[calc(100vh-48px)] flex flex-col overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--bg)] shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4">
          <Download size={18} className="text-[var(--accent)]" />
          <h2 className="flex-1 font-semibold text-[var(--text)]">Export</h2>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-md text-[var(--secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]">
            <X size={16} />
          </button>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] px-5 py-3">
          {/* Format selector */}
          <div className="flex gap-1 rounded-lg bg-[var(--surface)] p-0.5">
            {FORMATS.map((f) => {
              const Icon = f.icon;
              const active = format === f.id;
              return (
                <motion.button
                  key={f.id}
                  onClick={() => setFormat(f.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "bg-[var(--accent)] text-white shadow-sm"
                      : "text-[var(--secondary)] hover:text-[var(--text)]"
                  }`}
                >
                  <Icon size={13} />
                  {f.label}
                </motion.button>
              );
            })}
          </div>

          {/* Scope selector */}
          <div className="ml-auto flex gap-1 rounded-lg bg-[var(--surface)] p-0.5">
            <button
              onClick={() => setScope("current")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                scope === "current"
                  ? "bg-[var(--hover)] text-[var(--text)]"
                  : "text-[var(--secondary)] hover:text-[var(--text)]"
              }`}
            >
              This page
            </button>
            <button
              onClick={() => setScope("all")}
              className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                scope === "all"
                  ? "bg-[var(--hover)] text-[var(--text)]"
                  : "text-[var(--secondary)] hover:text-[var(--text)]"
              }`}
            >
              <Package size={12} />
              All pages
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin min-h-0" style={{ maxHeight: "400px" }}>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Preview</div>
          <pre className="overflow-x-auto rounded-lg bg-[var(--surface)] p-4 text-xs leading-5 text-[var(--secondary)] whitespace-pre-wrap break-words font-mono">
            {preview.slice(0, 5000)}
            {preview.length > 5000 && "\n\n... (truncated for preview)"}
          </pre>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 border-t border-[var(--border)] px-5 py-3">
          <div className="flex-1 text-xs text-[var(--muted)]">
            {scope === "all"
              ? `${pages.filter((p) => !p.trashed).length} pages · ${fmt.label}`
              : `${page.title} · ${fmt.label}`}
          </div>
          <motion.button
            onClick={handleCopy}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--text)] hover:bg-[var(--hover)]"
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            {copied ? "Copied" : "Copy"}
          </motion.button>
          <motion.button
            onClick={handleDownload}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-5 py-2 text-xs font-semibold text-white shadow-sm hover:brightness-110"
          >
            <Download size={13} />
            Download{scope === "all" ? " All" : ""}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
