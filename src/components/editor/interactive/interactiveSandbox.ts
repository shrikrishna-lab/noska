/**
 * Noska Interactive Sandbox Runtime & Security Bridge
 *
 * Provides safe, isolated execution for interactive HTML/CSS/JS blocks
 * without exposing parent DOM, Supabase auth tokens, or cookies.
 */

export interface ConsoleMessage {
  id: string;
  level: "log" | "warn" | "error" | "info";
  text: string;
  timestamp: number;
}

export interface SandboxOptions {
  html?: string;
  css?: string;
  javascript?: string;
  blockId?: string;
  themeMode?: "inherit" | "custom" | "dark" | "light";
  allowThemeInheritance?: boolean;
  allowStorage?: boolean;
}

export function buildSandboxDocument(options: SandboxOptions): string {
  const {
    html = "",
    css = "",
    javascript = "",
    blockId = "interactive-sandbox",
    allowThemeInheritance = true,
    themeMode = "inherit"
  } = options;

  // Clean and prepare HTML snippet
  let cleanHtml = html.trim();
  const hasFullDoc = /<html[\s\S]*?>/i.test(cleanHtml);

  // Injected console & bridge script
  const bridgeScript = `
    <script>
      (function() {
        // Prevent sandbox escaping / top redirect
        window.onbeforeunload = function() {};
        
        const BLOCK_ID = ${JSON.stringify(blockId)};
        const serialize = function(val) {
          try {
            if (val === null) return "null";
            if (val === undefined) return "undefined";
            if (typeof val === "object") return JSON.stringify(val);
            return String(val);
          } catch(e) {
            return "[Circular/Unserializable]";
          }
        };

        const postMsg = function(level, args) {
          try {
            const formatted = Array.from(args).map(serialize).join(" ");
            window.parent.postMessage({
              type: "NOSKA_INTERACTIVE_CONSOLE",
              blockId: BLOCK_ID,
              level: level,
              text: formatted,
              timestamp: Date.now()
            }, "*");
          } catch(e) {}
        };

        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;
        const originalInfo = console.info;

        console.log = function() { postMsg("log", arguments); originalLog.apply(console, arguments); };
        console.warn = function() { postMsg("warn", arguments); originalWarn.apply(console, arguments); };
        console.error = function() { postMsg("error", arguments); originalError.apply(console, arguments); };
        console.info = function() { postMsg("info", arguments); originalInfo.apply(console, arguments); };

        window.onerror = function(msg, url, line, col, error) {
          const errText = (msg || "Runtime error") + (line ? " (line " + line + ")" : "");
          postMsg("error", [errText]);
          window.parent.postMessage({
            type: "NOSKA_INTERACTIVE_RUNTIME_ERROR",
            blockId: BLOCK_ID,
            message: errText,
            line: line,
            column: col
          }, "*");
          return false;
        };

        window.addEventListener("unhandledrejection", function(event) {
          const reason = event.reason ? (event.reason.message || String(event.reason)) : "Unhandled Promise Rejection";
          postMsg("error", ["[Promise Rejection]", reason]);
        });

        // Safe Noska Bridge API
        window.noska = {
          theme: {
            mode: ${JSON.stringify(themeMode)},
            inherited: ${Boolean(allowThemeInheritance)}
          },
          storage: {
            _store: {},
            get: function(k) { return this._store[k]; },
            set: function(k, v) { this._store[k] = v; }
          }
        };
      })();
    </script>
  `;

  // Theme variable injection matching Noska luxury design tokens
  const isDarkDetected = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  const isExplicitDark = themeMode === "dark" || (themeMode === "inherit" && isDarkDetected);
  const themeClass = isExplicitDark ? 'class="dark"' : "";

  const themeStyles = allowThemeInheritance
    ? `
      :root {
        /* Noska Light Theme Default */
        --noska-bg: #FFFFFF;
        --noska-card: #FFFFFF;
        --noska-surface-1: #F8FAFC;
        --noska-surface-2: #F1F5F9;
        --noska-surface-3: #E2E8F0;
        --noska-surface-4: #CBD5E1;
        --noska-text: #0F172A;
        --noska-text-secondary: #475569;
        --noska-text-muted: #94A3B8;
        --noska-accent: #0066FF;
        --noska-accent-light: #3B82F6;
        --noska-accent-soft: rgba(0, 102, 255, 0.08);
        --noska-accent-glow: rgba(0, 102, 255, 0.20);
        --noska-blue: #0066FF;
        --noska-border: rgba(0, 0, 0, 0.08);
        --noska-border-strong: rgba(0, 0, 0, 0.14);
        --noska-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03);
        --noska-shadow-md: 0 4px 14px -2px rgba(0, 0, 0, 0.07);
        color-scheme: ${isExplicitDark ? "dark" : "light"};
      }

      .dark, :root[data-theme="dark"] {
        /* Noska Dark Theme */
        --noska-bg: #0F1117;
        --noska-card: #171A20;
        --noska-surface-1: #171A20;
        --noska-surface-2: #1E2128;
        --noska-surface-3: #262A33;
        --noska-surface-4: #2E333C;
        --noska-text: #EDEBE5;
        --noska-text-secondary: #9A9892;
        --noska-text-muted: #6B6A66;
        --noska-accent: #E3CFB3;
        --noska-accent-light: #EDE0CC;
        --noska-accent-soft: rgba(227, 207, 179, 0.12);
        --noska-accent-glow: rgba(227, 207, 179, 0.25);
        --noska-blue: #0066FF;
        --noska-border: rgba(255, 255, 255, 0.08);
        --noska-border-strong: rgba(255, 255, 255, 0.14);
        --noska-shadow-sm: 0 2px 8px -1px rgba(0, 0, 0, 0.35);
        --noska-shadow-md: 0 4px 16px -2px rgba(0, 0, 0, 0.45);
        color-scheme: dark;
      }

      @media (prefers-color-scheme: dark) {
        :root:not([data-theme="light"]):not(.light) {
          --noska-bg: #0F1117;
          --noska-card: #171A20;
          --noska-surface-1: #171A20;
          --noska-surface-2: #1E2128;
          --noska-surface-3: #262A33;
          --noska-surface-4: #2E333C;
          --noska-text: #EDEBE5;
          --noska-text-secondary: #9A9892;
          --noska-text-muted: #6B6A66;
          --noska-accent: #E3CFB3;
          --noska-accent-light: #EDE0CC;
          --noska-accent-soft: rgba(227, 207, 179, 0.12);
          --noska-accent-glow: rgba(227, 207, 179, 0.25);
          --noska-blue: #0066FF;
          --noska-border: rgba(255, 255, 255, 0.08);
          --noska-border-strong: rgba(255, 255, 255, 0.14);
          --noska-shadow-sm: 0 2px 8px -1px rgba(0, 0, 0, 0.35);
          --noska-shadow-md: 0 4px 16px -2px rgba(0, 0, 0, 0.45);
        }
      }
    `
    : "";

  const baseContainerCss = `
    html, body {
      margin: 0;
      padding: 0;
      background: var(--noska-bg, ${isExplicitDark ? "#0F1117" : "#FFFFFF"});
      color: var(--noska-text, ${isExplicitDark ? "#EDEBE5" : "#0F172A"});
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      min-height: 100%;
      box-sizing: border-box;
      -webkit-font-smoothing: antialiased;
      overflow-x: hidden;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    /* Clean, modern scrollbars - remove ugly arrow buttons */
    ::-webkit-scrollbar {
      width: 5px;
      height: 5px;
    }
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(120, 120, 120, 0.25);
      border-radius: 9999px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(120, 120, 120, 0.45);
    }
    ::-webkit-scrollbar-button {
      display: none !important;
      width: 0 !important;
      height: 0 !important;
    }
  `;

  if (hasFullDoc) {
    // Inject into head of existing doc
    let doc = cleanHtml;
    if (css.trim()) {
      doc = doc.replace(/<\/head>/i, `<style>${themeStyles}\n${baseContainerCss}\n${css}</style></head>`);
      if (!/<style>/i.test(doc)) {
        doc = `<style>${themeStyles}\n${baseContainerCss}\n${css}</style>` + doc;
      }
    }
    doc = doc.replace(/<head>/i, `<head>${bridgeScript}`);
    if (isExplicitDark && !/<html[^>]*class=/i.test(doc)) {
      doc = doc.replace(/<html/i, '<html class="dark"');
    }
    if (javascript.trim()) {
      doc = doc.replace(/<\/body>/i, `<script>\ntry {\n${javascript}\n} catch(err) { console.error(err); }\n</script></body>`);
    }
    return doc;
  }

  // Construct standard HTML5 container
  return `<!DOCTYPE html>
<html lang="en" ${themeClass}>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  ${bridgeScript}
  <style>
    ${themeStyles}
    ${baseContainerCss}
    ${css}
  </style>
</head>
<body>
  ${cleanHtml}
  <script>
    try {
      ${javascript}
    } catch(err) {
      console.error(err);
    }
  </script>
</body>
</html>`;
}
