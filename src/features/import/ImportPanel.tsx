import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { SPRING_PRESETS } from "../motion/MotionSystem";
import {
  Upload, FileText,ClipboardPaste, CloudDownload, BookOpen, X, Trash2,
  Loader2, Check, AlertTriangle, FilePlus2, Files, KeyRound,
} from "lucide-react";
import type { Block } from "../../../types/blocks";
import { blockFor } from "../../utils/helpers";
import type { ImportDestination, ImportedPageDraft } from "./importTypes";
import { ensureUniqueTitles, parseImportFile, parsePastedText, restampIds } from "./parsers";
import { extractNotionId, getSavedNotionToken, importNotionPage, saveNotionToken } from "./notionApi";

interface ImportPanelProps {
  open: boolean;
  onClose: () => void;
  currentTitle?: string;
  onAppendBlocks: (blocks: Block[], mode: "append" | "replace") => void;
  onImportPages: (drafts: ImportedPageDraft[]) => void;
  onToast?: (msg: string) => void;
}

type Tab = "files" | "notion" | "evernote" | "paste";

const ACCEPT = ".md,.markdown,.txt,.html,.htm,.csv,.json,.zip,.enex";

export default function ImportPanel({
  open, onClose, currentTitle = "current page", onAppendBlocks, onImportPages, onToast,
}: ImportPanelProps) {
  const [tab, setTab] = useState<Tab>("files");
  const [files, setFiles] = useState<File[]>([]);
  const [drafts, setDrafts] = useState<ImportedPageDraft[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [parsing, setParsing] = useState(false);
  const [destination, setDestination] = useState<ImportDestination>("smart");
  const [replaceCurrent, setReplaceCurrent] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const enexRef = useRef<HTMLInputElement>(null);

  // paste tab
  const [pasteText, setPasteText] = useState("");
  const [pasteFormat, setPasteFormat] = useState<"markdown" | "text" | "html">("markdown");
  const [pasteTitle, setPasteTitle] = useState("");

  // notion tab
  const [notionToken, setNotionToken] = useState("");
  const [notionUrl, setNotionUrl] = useState("");
  const [notionBusy, setNotionBusy] = useState(false);
  const [notionError, setNotionError] = useState("");

  useEffect(() => {
    if (open) setNotionToken(getSavedNotionToken());
  }, [open ]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const parseFiles = useCallback(async (list: File[]) => {
    if (!list.length) {
      setDrafts([]);
      setWarnings([]);
      return;
    }
    setParsing(true);
    setWarnings([]);
    const all: ImportedPageDraft[] = [];
    const warns: string[] = [];
    for (const f of list) {
      try {
        const r = await parseImportFile(f);
        all.push(...r.pages);
        warns.push(...r.warnings.map((w) => `${f.name}: ${w}`));
      } catch (e: any) {
        warns.push(`${f.name}: ${e?.message || "couldn't be read"}.`);
      }
    }
    setDrafts(ensureUniqueTitles(all.map((d) => ({ ...d, blocks: restampIds(d.blocks) }))));
    setWarnings(warns);
    setParsing(false);
  }, []);

  useEffect(() => {
    void parseFiles(files);
  }, [files, parseFiles]);

  const addFiles = useCallback((list: FileList | File[]) => {
    const arr = Array.from(list || []);
    if (!arr.length) return;
    setFiles((prev) => [...prev, ...arr].slice(0, 20));
    setDrafts([]);
  }, []);

  const totalBlocks = useMemo(() => drafts.reduce((n, d) => n + d.blocks.length, 0), [drafts]);

  // Reparsing markdown on every keystroke made the paste box lag on long
  // texts — memoize so it only recomputes when the text/format changes.
  const pasteBlockCount = useMemo(
    () => (pasteText.trim() ? parsePastedText(pasteText, pasteFormat).length : 0),
    [pasteText, pasteFormat]
  );

  const smartLabel = drafts.length > 1 ? "Smart (new pages)" : "Smart (append to page)";

  const removeDraft = (idx: number) => setDrafts((prev) => prev.filter((_, i) => i !== idx));
  const renameDraft = (idx: number, title: string) =>
    setDrafts((prev) => prev.map((d, i) => (i === idx ? { ...d, title } : d)));

  const doImport = () => {
    if (!drafts.length) return;
    const dest = destination === "smart" ? (drafts.length > 1 ? "new" : "append") : destination;
    if (dest === "new") {
      onImportPages(drafts);
      onToast?.(drafts.length === 1 ? `Created “${drafts[0].title}” from import` : `Created ${drafts.length} pages from import`);
    } else {
      // Merge every draft into the current page, separating multi-file
      // imports with an h2 so pages don't blur together.
      const merged: Block[] = [];
      drafts.forEach((d, i) => {
        if (drafts.length > 1) merged.push(blockFor("h2", d.title) as Block);
        merged.push(...d.blocks);
        if (i < drafts.length - 1) merged.push(blockFor("divider") as Block);
      });
      onAppendBlocks(restampIds(merged), replaceCurrent ? "replace" : "append");
      onToast?.(replaceCurrent ? "Replaced page with import" : `Appended ${merged.length} blocks to “${currentTitle}”`);
    }
    onClose();
  };

  const doImportPaste = () => {
    const blocks = restampIds(parsePastedText(pasteText, pasteFormat));
    if (!blocks.length) {
      onToast?.("Nothing to import — paste some text first");
      return;
    }
    const dest = destination === "smart" ? "append" : destination;
    if (dest === "new") {
      onImportPages([{ title: pasteTitle.trim() || "Pasted import", icon: "📋", blocks }]);
      onToast?.("Created page from pasted text");
    } else {
      onAppendBlocks(blocks, replaceCurrent ? "replace" : "append");
      onToast?.(`Appended ${blocks.length} blocks to “${currentTitle}”`);
    }
    setPasteText("");
    onClose();
  };

  const doNotionFetch = async () => {
    setNotionError("");
    const token = notionToken.trim();
    if (!token) {
      setNotionError("Paste your Notion integration token first.");
      return;
    }
    if (!extractNotionId(notionUrl)) {
      setNotionError("Paste a Notion page/database URL or ID.");
      return;
    }
    setNotionBusy(true);
    try {
      saveNotionToken(token);
      const result = await importNotionPage(token, notionUrl.trim());
      setDrafts(ensureUniqueTitles(result.pages.map((d) => ({ ...d, blocks: restampIds(d.blocks) }))));
      setWarnings(result.warnings);
      onToast?.(result.pages.length === 1 ? "Fetched page from Notion" : `Fetched ${result.pages.length} rows from Notion`);
    } catch (e: any) {
      const msg = String(e?.message || "Notion fetch failed");
      if (String(e).includes("Failed to fetch") || msg.includes("Failed to fetch")) {
        setNotionError("Browser blocked the Notion request (network/CORS). Try the Notion export-ZIP route in the Files tab instead.");
      } else {
        setNotionError(msg);
      }
    } finally {
      setNotionBusy(false);
    }
  };

  if (!open) return null;

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: "files", label: "Files", icon: Files },
    { id: "notion", label: "Notion", icon: CloudDownload },
    { id: "evernote", label: "Evernote", icon: BookOpen },
    { id: "paste", label: "Paste text", icon: ClipboardPaste },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-[4px] flex items-center justify-center p-6"
      onMouseDown={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 10 }}
        transition={SPRING_PRESETS.soft}
        className="w-[760px] max-w-full max-h-[calc(100vh-48px)] flex flex-col overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--bg)] shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4">
          <Upload size={18} className="text-[var(--accent)]" />
          <h2 className="flex-1 font-semibold text-[var(--text)]">Import into Noska</h2>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-md text-[var(--secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]">
            <X size={16} />
          </button>
        </div>

        {/* tabs */}
        <div className="flex gap-1 border-b border-[var(--border)] px-5 py-2">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  active ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--secondary)] hover:text-[var(--text)]"
                }`}
              >
                <Icon size={13} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto p-5 min-h-0 space-y-4" style={{ maxHeight: 460 }}>
          {tab === "files" && (
            <>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
                onClick={() => fileRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition ${
                  dragOver ? "border-[var(--accent)] bg-[var(--accent)]/5" : "border-[var(--border)] hover:border-[var(--accent)]/50"
                }`}
              >
                <Upload size={28} className="text-[var(--muted)]" />
                <p className="text-sm font-medium text-[var(--text)]">Drop files here or click to browse</p>
                <p className="text-[11px] text-[var(--muted)]">Notion export .zip · Markdown · Notepad .txt · HTML · CSV · JSON · Evernote .enex</p>
                <input ref={fileRef} type="file" accept={ACCEPT} multiple className="hidden" onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
              </div>
              {files.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {files.map((f, i) => (
                    <span key={`${f.name}-${i}`} className="flex items-center gap-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] px-2.5 py-1 text-[11px] text-[var(--text)]">
                      <FileText size={12} className="text-[var(--muted)]" />
                      {f.name}
                      <button onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))} className="text-[var(--muted)] hover:text-[var(--danger)]"><X size={12} /></button>
                    </span>
                  ))}
                  <button onClick={() => { setFiles([]); setDrafts([]); }} className="text-[11px] text-[var(--muted)] hover:text-[var(--text)] underline">clear all</button>
                </div>
              )}
              <HowToExport />
            </>
          )}

          {tab === "notion" && (
            <div className="space-y-3">
              <div className="rounded-lg bg-[var(--surface)] border border-[var(--border)] p-3 text-xs leading-5 text-[var(--secondary)]">
                <p className="font-semibold text-[var(--text)] mb-1">Option A — fastest: Notion export file</p>
                <p>Notion → Settings → Export → <em>Markdown & CSV</em> → drop the .zip in the <button className="underline" onClick={() => setTab("files")}>Files tab</button>. No token needed, keeps all pages.</p>
                <p className="font-semibold text-[var(--text)] mt-2 mb-1">Option B — direct sync via integration</p>
                <ol className="list-decimal ml-4 space-y-0.5">
                  <li>Go to <span className="font-mono">notion.so/my-account/integrations</span> → New integration → copy the <span className="font-mono">secret_…</span> token.</li>
                  <li>Open the Notion page → <span className="font-mono">··· → Add connections</span> → pick your integration.</li>
                  <li>Paste the token + page/database URL below.</li>
                </ol>
              </div>
              <label className="block">
                <span className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-[var(--muted)]"><KeyRound size={12} /> INTEGRATION TOKEN</span>
                <input
                  type="password"
                  value={notionToken}
                  onChange={(e) => setNotionToken(e.target.value)}
                  placeholder="secret_…"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)] font-mono"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-[var(--muted)]">PAGE / DATABASE URL OR ID</span>
                <input
                  value={notionUrl}
                  onChange={(e) => setNotionUrl(e.target.value)}
                  placeholder="https://www.notion.so/…"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)] font-mono"
                />
              </label>
              {notionError && (
                <div className="flex items-start gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-[11px] text-red-400">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" />{notionError}
                </div>
              )}
              <button
                onClick={doNotionFetch}
                disabled={notionBusy}
                className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-50"
              >
                {notionBusy ? <Loader2 size={13} className="animate-spin" /> : <CloudDownload size={13} />}
                {notionBusy ? "Fetching from Notion…" : "Fetch from Notion"}
              </button>
            </div>
          )}

          {tab === "evernote" && (
            <div className="space-y-3">
              <div className="rounded-lg bg-[var(--surface)] border border-[var(--border)] p-3 text-xs leading-5 text-[var(--secondary)]">
                <p>Evernote → File → <em>Export note(s) as ENEX</em> → pick the <span className="font-mono">.enex</span> file below. Each note becomes a page.</p>
              </div>
              <input ref={enexRef} type="file" accept=".enex" className="hidden" onChange={(e) => { if (e.target.files) { addFiles(e.target.files); setTab("files"); } e.target.value = ""; }} />
              <button onClick={() => enexRef.current?.click()} className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white hover:brightness-110">
                <BookOpen size={13} /> Choose .enex file
              </button>
            </div>
          )}

          {tab === "paste" && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  value={pasteTitle}
                  onChange={(e) => setPasteTitle(e.target.value)}
                  placeholder="Title (only used when creating a new page)"
                  className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)]"
                />
                <div className="flex gap-1 rounded-lg bg-[var(--surface)] p-0.5">
                  {(["markdown", "text", "html"] as const).map((f) => (
                    <button key={f} onClick={() => setPasteFormat(f)} className={`rounded-md px-2.5 py-1.5 text-[11px] font-medium ${pasteFormat === f ? "bg-[var(--hover)] text-[var(--text)]" : "text-[var(--secondary)]"}`}>
                      {f === "markdown" ? "Markdown" : f === "text" ? "Notepad" : "HTML"}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={10}
                placeholder={pasteFormat === "html" ? "Paste HTML here…" : pasteFormat === "text" ? "Paste from Notepad here…" : "Paste Markdown (or Notion-copied markdown) here…"}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 font-mono text-xs leading-5 text-[var(--text)] outline-none focus:border-[var(--accent)]"
              />
              <div className="text-[11px] text-[var(--muted)]">{pasteText.trim() ? `${pasteBlockCount} blocks ready` : "Paste something to see a block count"}</div>
            </div>
          )}

          {/* warnings */}
          {warnings.length > 0 && (
            <div className="space-y-1 rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
              {warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px] text-amber-300"><AlertTriangle size={12} className="mt-0.5 shrink-0" />{w}</div>
              ))}
            </div>
          )}

          {/* preview */}
          {(tab !== "paste") && (
            <div>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                Preview {drafts.length ? `— ${drafts.length} page${drafts.length > 1 ? "s" : ""} · ${totalBlocks} blocks` : ""}
              </div>
              {parsing ? (
                <div className="flex items-center gap-2 text-xs text-[var(--muted)]"><Loader2 size={14} className="animate-spin" /> Parsing files…</div>
              ) : drafts.length === 0 ? (
                <div className="rounded-lg bg-[var(--surface)] p-4 text-center text-xs text-[var(--muted)]">
                  {files.length ? "Nothing importable parsed yet." : tab === "notion" ? "Fetch from Notion above, or drop an export .zip in Files." : "Add files above to preview what will be imported."}
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
                  {drafts.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2">
                      <FilePlus2 size={13} className="shrink-0 text-[var(--muted)]" />
                      <input
                        value={d.title}
                        onChange={(e) => renameDraft(i, e.target.value)}
                        className="flex-1 bg-transparent text-xs font-medium text-[var(--text)] outline-none"
                      />
                      <span className="text-[10px] text-[var(--muted)]">{d.blocks.length} blocks</span>
                      <button onClick={() => removeDraft(i)} className="text-[var(--muted)] hover:text-[var(--danger)]"><Trash2 size={13} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* destination (files + notion + paste) */}
          {(tab === "paste" ? !!pasteText.trim() : drafts.length > 0) && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Destination</div>
              <div className="flex flex-wrap gap-1 rounded-lg bg-[var(--bg)] p-0.5">
                {([
                  { id: "smart", label: smartLabel },
                  { id: "append", label: `Append to “${(currentTitle || "current page").slice(0, 24)}”` },
                  { id: "new", label: "Create new page(s)" },
                ] as { id: ImportDestination; label: string }[]).map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setDestination(o.id)}
                    className={`rounded-md px-3 py-1.5 text-[11px] font-medium ${destination === o.id ? "bg-[var(--hover)] text-[var(--text)] border border-[var(--border-strong)]" : "text-[var(--secondary)]"}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              {(destination === "append" || (destination === "smart" && drafts.length <= 1 && tab !== "paste") || (tab === "paste" && destination !== "new")) && (
                <label className="flex cursor-pointer items-center gap-2 text-[11px] text-[var(--secondary)]">
                  <input type="checkbox" checked={replaceCurrent} onChange={(e) => setReplaceCurrent(e.target.checked)} className="accent-[var(--accent)]" />
                  Replace current page content instead of appending
                </label>
              )}
            </div>
          )}
        </div>

        {/* footer */}
        <div className="flex items-center gap-3 border-t border-[var(--border)] px-5 py-3">
          <div className="flex-1 text-xs text-[var(--muted)]">
            {tab === "paste"
              ? "Paste → blocks, instantly"
              : parsing ? "Parsing…" : drafts.length ? `${drafts.length} page${drafts.length > 1 ? "s" : ""} · ${totalBlocks} blocks` : "No import ready"}
          </div>
          {tab === "paste" ? (
            <button onClick={doImportPaste} disabled={!pasteText.trim()} className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-5 py-2 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-40">
              <Check size={13} /> Import paste
            </button>
          ) : (
            <button onClick={doImport} disabled={!drafts.length || parsing} className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-5 py-2 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-40">
              {parsing ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              Import{drafts.length > 1 ? ` ${drafts.length} pages` : ""}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function HowToExport() {
  return (
    <details className="rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-[11px] text-[var(--secondary)]">
      <summary className="cursor-pointer font-semibold text-[var(--text)]">How do I export from each app?</summary>
      <ul className="mt-1.5 ml-4 list-disc space-y-1 leading-5">
        <li><b>Notion:</b> Settings → Export → <em>Markdown & CSV</em> (include subpages) → drop the .zip here.</li>
        <li><b>Notepad / .txt:</b> just save and drop the file — each paragraph becomes a block.</li>
        <li><b>Google Docs / web pages:</b> save as HTML (or copy → Paste-text tab) and import.</li>
        <li><b>Spreadsheets:</b> save as .csv — becomes a table block.</li>
        <li><b>Evernote:</b> File → Export as .enex (see Evernote tab).</li>
        <li><b>Noska backup:</b> re-import any .json you exported from Noska.</li>
      </ul>
    </details>
  );
}
