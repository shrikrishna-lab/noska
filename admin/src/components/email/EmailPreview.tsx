import { useState } from "react";
import { Smartphone, Monitor, Moon, Code, FileText } from "lucide-react";

interface EmailPreviewProps {
  html: string;
  plainText?: string;
}

type PreviewMode = "desktop" | "mobile" | "dark" | "html" | "plain";

export function EmailPreview({ html, plainText }: EmailPreviewProps) {
  const [mode, setMode] = useState<PreviewMode>("desktop");

  const modes: { key: PreviewMode; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
    { key: "desktop", icon: Monitor, label: "Desktop" },
    { key: "mobile", icon: Smartphone, label: "Mobile" },
    { key: "dark", icon: Moon, label: "Dark" },
    { key: "html", icon: Code, label: "HTML" },
    { key: "plain", icon: FileText, label: "Plain Text" },
  ];

  if (!html) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        <FileText className="mr-2 h-5 w-5" />
        No content to preview
      </div>
    );
  }

  const previewHtml = mode === "dark"
    ? html.replace('style="background-color:#f4f4f5"', 'style="background-color:#1a1a2e"').replace('#ffffff', '#1e1e2e').replace('#f4f4f5', '#1a1a2e')
    : html;

  return (
    <div className="space-y-3">
      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit">
        {modes.map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${
              mode === m.key ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <m.icon className="h-3.5 w-3.5" />
            {m.label}
          </button>
        ))}
      </div>

      <div
        className={`rounded-lg border overflow-hidden bg-white ${
          mode === "mobile" ? "max-w-[375px] mx-auto" : "w-full"
        } ${mode === "dark" ? "bg-[#1a1a2e]" : ""}`}
      >
        {mode === "html" ? (
          <pre className="p-4 text-xs overflow-auto max-h-96 bg-[#1e1e2e] text-emerald-400 rounded-lg font-mono">
            {html.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
          </pre>
        ) : mode === "plain" ? (
          <pre className="p-4 text-sm overflow-auto max-h-96 whitespace-pre-wrap font-sans">
            {plainText || "No plain text version"}
          </pre>
        ) : (
          <iframe
            className={`w-full h-[500px] ${mode === "mobile" ? "border-x" : ""}`}
            srcDoc={previewHtml}
            title="Email Preview"
            style={{ background: mode === "dark" ? "#1a1a2e" : "#fff" }}
          />
        )}
      </div>
    </div>
  );
}
