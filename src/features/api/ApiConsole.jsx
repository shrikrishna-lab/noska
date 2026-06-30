import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { SPRING_PRESETS } from "../motion/MotionSystem";
import { Terminal, Send, Key, Copy, Check, X, Info } from "lucide-react";

const API_DOCS = [
  {
    id: "get_pages",
    method: "GET",
    path: "/api/pages",
    description: "Retrieve a list of all pages in the workspace.",
    hasBody: false,
    defaultBody: ""
  },
  {
    id: "get_page",
    method: "GET",
    path: "/api/pages/:id",
    description: "Get details and content blocks of a specific page.",
    hasBody: false,
    defaultBody: "",
    requiresId: true
  },
  {
    id: "create_page",
    method: "POST",
    path: "/api/pages",
    description: "Create a new page in the workspace.",
    hasBody: true,
    defaultBody: JSON.stringify({ title: "API Created Page", template: "blank" }, null, 2)
  },
  {
    id: "update_page",
    method: "PATCH",
    path: "/api/pages/:id",
    description: "Update the title, icon, tags, or blocks of a page.",
    hasBody: true,
    defaultBody: JSON.stringify({ title: "Updated Title via API" }, null, 2),
    requiresId: true
  },
  {
    id: "delete_page",
    method: "DELETE",
    path: "/api/pages/:id",
    description: "Move a page to trash.",
    hasBody: false,
    defaultBody: "",
    requiresId: true
  }
];

export default function ApiConsole({ pages, activePageId, addPage, updatePage, onClose, onToast }) {
  const [apiKey, setApiKey] = useState("");
  const [selectedRoute, setSelectedRoute] = useState(API_DOCS[0]);
  const [paramId, setParamId] = useState(activePageId || "");
  const [reqBody, setReqBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [respStatus, setRespStatus] = useState("");
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    // Load or generate API Key
    const saved = localStorage.getItem("noska_api_key");
    if (saved) {
      setApiKey(saved);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    // Set default body when route changes
    setReqBody(selectedRoute.defaultBody);
    if (selectedRoute.requiresId && !paramId && pages.length > 0) {
      setParamId(activePageId || pages[0].id);
    }
  }, [selectedRoute, pages, activePageId]);

  const generateKey = () => {
    const key = "nsk_" + Array.from({ length: 32 }, () => Math.random().toString(36)[2]).join("");
    localStorage.setItem("noska_api_key", key);
    setApiKey(key);
    onToast("New API key generated successfully.");
  };

  const copyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
    onToast("API Key copied to clipboard.");
  };

  const executeRequest = async () => {
    if (!apiKey) {
      setResponse({ error: "Unauthorized: Please generate an API Key first." });
      setRespStatus("401 Unauthorized");
      return;
    }

    setLoading(true);
    setResponse(null);
    setRespStatus("");

    // Simulate network delay
    await new Promise((r) => setTimeout(r, 600));

    try {
      let bodyData = {};
      if (selectedRoute.hasBody && reqBody) {
        bodyData = JSON.parse(reqBody);
      }

      const cleanId = paramId.trim();

      switch (selectedRoute.id) {
        case "get_pages": {
          const list = pages.map(({ id, title, icon, tags, updatedAt, favorite, trashed }) => ({
            id,
            title,
            icon,
            tags,
            updatedAt,
            favorite,
            trashed
          }));
          setResponse(list);
          setRespStatus("200 OK");
          break;
        }
        case "get_page": {
          const page = pages.find((p) => p.id === cleanId);
          if (!page) {
            setResponse({ error: `Page with ID ${cleanId} not found.` });
            setRespStatus("404 Not Found");
          } else {
            setResponse(page);
            setRespStatus("200 OK");
          }
          break;
        }
        case "create_page": {
          const { title = "API Created Page", template = "blank" } = bodyData;
          // In App.jsx, addPage returns the new page ID or creates it.
          // Since App.jsx's addPage handles adding and state, let's call it:
          // addPage(template, parentId, options)
          // We can intercept the new page ID by looking at the page list after creation, or creating one.
          addPage(template, null, { title });
          setResponse({
            success: true,
            message: `Created page using template: ${template}`,
            instruction: "A new page will appear in your sidebar."
          });
          setRespStatus("201 Created");
          break;
        }
        case "update_page": {
          const page = pages.find((p) => p.id === cleanId);
          if (!page) {
            setResponse({ error: `Page with ID ${cleanId} not found.` });
            setRespStatus("404 Not Found");
          } else {
            updatePage(cleanId, bodyData);
            setResponse({ success: true, updatedFields: bodyData });
            setRespStatus("200 OK");
          }
          break;
        }
        case "delete_page": {
          const page = pages.find((p) => p.id === cleanId);
          if (!page) {
            setResponse({ error: `Page with ID ${cleanId} not found.` });
            setRespStatus("404 Not Found");
          } else {
            updatePage(cleanId, { trashed: true });
            setResponse({ success: true, message: `Moved page ${cleanId} to trash.` });
            setRespStatus("200 OK");
          }
          break;
        }
        default:
          break;
      }
    } catch (err) {
      setResponse({ error: "Bad Request: " + err.message });
      setRespStatus("400 Bad Request");
    } finally {
      setLoading(false);
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
        className="w-[820px] max-w-full h-[620px] flex flex-col overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--bg)] shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4 shrink-0">
          <Terminal size={18} className="text-[var(--accent)]" />
          <h2 className="flex-1 font-semibold text-[var(--text)]">Open API Console</h2>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-md text-[var(--secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]">
            <X size={16} />
          </button>
        </div>

        {/* API Key Banner */}
        <div className="bg-[var(--surface)] border-b border-[var(--border)] px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <Key size={14} className="text-amber-400" />
            <span className="text-[var(--secondary)]">API Key:</span>
            {apiKey ? (
              <code className="bg-[var(--bg)] border border-[var(--border)] px-2 py-0.5 rounded font-mono text-[var(--text)] text-[11px]">
                {apiKey.substring(0, 10)}...{apiKey.substring(apiKey.length - 4)}
              </code>
            ) : (
              <span className="text-[var(--muted)] font-medium">No active key</span>
            )}
          </div>
          <div className="flex gap-2">
            {apiKey && (
              <button
                onClick={copyKey}
                className="flex items-center gap-1 rounded bg-[var(--bg)] border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--text)] hover:bg-[var(--hover)] font-medium"
              >
                {copiedKey ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                {copiedKey ? "Copied" : "Copy"}
              </button>
            )}
            <button
              onClick={generateKey}
              className="flex items-center gap-1 rounded bg-[var(--accent)] px-2.5 py-1 text-xs font-semibold text-white hover:opacity-90"
            >
              <Key size={12} />
              {apiKey ? "Regenerate Key" : "Generate Key"}
            </button>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="flex-1 flex min-h-0">
          {/* Sidebar - Route Selector */}
          <div className="w-[240px] border-r border-[var(--border)] bg-[var(--surface-dim,var(--bg))] p-3 flex flex-col gap-1 overflow-y-auto">
            <div className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider px-2 py-1 mb-1">
              End-Points
            </div>
            {API_DOCS.map((route) => {
              const isSelected = selectedRoute.id === route.id;
              const methodColors = {
                GET: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                POST: "bg-blue-500/10 text-blue-400 border-blue-500/20",
                PATCH: "bg-amber-500/10 text-amber-400 border-amber-500/20",
                DELETE: "bg-rose-500/10 text-rose-400 border-rose-500/20"
              };
              return (
                <button
                  key={route.id}
                  onClick={() => setSelectedRoute(route)}
                  className={`flex flex-col text-left p-2.5 rounded-lg border text-xs gap-1 transition-all ${
                    isSelected
                      ? "bg-[var(--hover)] border-[var(--border-strong)]"
                      : "bg-transparent border-transparent hover:bg-[var(--hover)]/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold border ${methodColors[route.method]}`}>
                      {route.method}
                    </span>
                    <span className="font-mono text-[var(--text)] font-semibold truncate">
                      {route.path.replace("/:id", "")}
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--muted)] line-clamp-1">{route.description}</span>
                </button>
              );
            })}
          </div>

          {/* Playground / Panel */}
          <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg)]">
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {/* Route Heading */}
              <div>
                <h3 className="font-semibold text-sm text-[var(--text)]">{selectedRoute.description}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-1.5 py-0.5 rounded bg-[var(--surface)] text-[10px] font-mono font-bold text-[var(--secondary)]">
                    {selectedRoute.method}
                  </span>
                  <span className="font-mono text-xs text-[var(--text)] bg-[var(--surface)] px-2 py-0.5 rounded">
                    {selectedRoute.path}
                  </span>
                </div>
              </div>

              {/* Parameters Input */}
              {selectedRoute.requiresId && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">Path Parameter: ID</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={paramId}
                      onChange={(e) => setParamId(e.target.value)}
                      placeholder="Page ID"
                      className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text)] font-mono focus:border-[var(--accent)] focus:outline-none"
                    />
                    <select
                      value={paramId}
                      onChange={(e) => setParamId(e.target.value)}
                      className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs text-[var(--secondary)] focus:outline-none"
                    >
                      <option value="">Select Page...</option>
                      {pages.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.icon} {p.title || "(Untitled)"} ({p.id.substring(0, 6)}...)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Request Body Editor */}
              {selectedRoute.hasBody && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">Request Body (JSON)</label>
                  <textarea
                    value={reqBody}
                    onChange={(e) => setReqBody(e.target.value)}
                    rows={6}
                    className="w-full font-mono text-xs p-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none resize-none"
                  />
                </div>
              )}

              {/* Response Panel */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">Response</label>
                  {respStatus && (
                    <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                      respStatus.startsWith("2") ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                    }`}>
                      {respStatus}
                    </span>
                  )}
                </div>
                <div className="min-h-[160px] bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3 overflow-auto font-mono text-xs text-[var(--text)] relative max-h-[220px]">
                  {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-[var(--surface)]/80">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-5 w-5 animate-spin rounded-full border border-[var(--accent)] border-t-transparent" />
                        <span className="text-[10px] text-[var(--muted)]">Executing request...</span>
                      </div>
                    </div>
                  ) : response ? (
                    <pre className="whitespace-pre-wrap">{JSON.stringify(response, null, 2)}</pre>
                  ) : (
                    <div className="text-[var(--muted)] flex items-center gap-1.5 justify-center h-full pt-12">
                      <Info size={14} />
                      Click "Send Request" to test this endpoint
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sticky Execution Bar */}
            <div className="border-t border-[var(--border)] p-4 bg-[var(--surface-dim,var(--bg))] shrink-0 flex justify-between items-center">
              <span className="text-[10px] text-[var(--muted)] flex items-center gap-1">
                <Info size={12} />
                Executing updates will modify your local workspace.
              </span>
              <button
                onClick={executeRequest}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] hover:opacity-90 px-4 py-2 text-xs font-semibold text-white shadow-sm"
              >
                <Send size={12} />
                Send Request
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
