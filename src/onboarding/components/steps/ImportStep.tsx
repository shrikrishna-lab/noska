import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, Upload, FileText, Loader2, AlertTriangle, Trash2, ClipboardPaste, CloudDownload } from "lucide-react";
import { C } from "../../theme";
import { useOnboarding } from "../../hooks/useOnboarding";
import { PrimaryBtn, SecondaryBtn } from "../Buttons";
import type { OnboardingImportedPage } from "../../types";
import { parseImportFile, parsePastedText, restampIds, ensureUniqueTitles } from "../../../features/import/parsers";
import { extractNotionId, getSavedNotionToken, importNotionPage, saveNotionToken } from "../../../features/import/notionApi";

const ACCEPT = ".md,.markdown,.txt,.html,.htm,.csv,.json,.zip,.enex";

/**
 * "Bring your notes" — optional import step between Template and Done.
 * Reuses the Import Center's parsers (src/features/import) but renders in
 * the onboarding light theme. Parsed pages are staged on
 * form.importedPages (memory only — stripped before localStorage
 * persistence) and materialized by App.tsx's handleFinalize.
 * Skipping (Continue with nothing staged) behaves exactly like the old
 * flow: just the template starter page.
 */
export default function ImportStep() {
  const { form, setFormField, next, back } = useOnboarding();
  const staged: OnboardingImportedPage[] = form.importedPages || [];
  const [parsing, setParsing] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [notionOpen, setNotionOpen] = useState(false);
  const [notionToken, setNotionToken] = useState(() => getSavedNotionToken());
  const [notionUrl, setNotionUrl] = useState("");
  const [notionBusy, setNotionBusy] = useState(false);
  const [notionError, setNotionError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const stage = (pages: OnboardingImportedPage[]) => {
    if (!pages.length) return;
    setFormField("importedPages", ensureUniqueTitles([...staged, ...pages]).slice(0, 200));
  };

  const handleFiles = async (list: FileList | File[]) => {
    const arr = Array.from(list || []).slice(0, 20);
    if (!arr.length) return;
    setParsing(true);
    setWarnings([]);
    const fresh: OnboardingImportedPage[] = [];
    const warns: string[] = [];
    for (const f of arr) {
      try {
        const r = await parseImportFile(f);
        fresh.push(...r.pages.map((d) => ({ ...d, blocks: restampIds(d.blocks) })));
        warns.push(...r.warnings.map((w) => `${f.name}: ${w}`));
      } catch (e: any) {
        warns.push(`${f.name}: ${e?.message || "couldn't be read"}.`);
      }
    }
    stage(fresh);
    setWarnings(warns);
    setParsing(false);
  };

  const handlePaste = () => {
    const blocks = restampIds(parsePastedText(pasteText, "markdown"));
    if (!blocks.length) return;
    stage([{ title: "Pasted notes", icon: "📋", blocks }]);
    setPasteText("");
    setPasteOpen(false);
  };

  const handleNotion = async () => {
    setNotionError("");
    if (!notionToken.trim()) {
      setNotionError("Paste your Notion integration token first.");
      return;
    }
    if (!extractNotionId(notionUrl)) {
      setNotionError("Paste a Notion page/database URL or ID.");
      return;
    }
    setNotionBusy(true);
    try {
      saveNotionToken(notionToken.trim());
      const result = await importNotionPage(notionToken.trim(), notionUrl.trim());
      stage(result.pages.map((d) => ({ ...d, blocks: restampIds(d.blocks) })));
      if (result.warnings.length) setWarnings((prev) => [...prev, ...result.warnings]);
      setNotionUrl("");
    } catch (e: any) {
      const msg = String(e?.message || "Notion fetch failed");
      setNotionError(
        msg.includes("Failed to fetch")
          ? "Browser blocked the request — export a .zip from Notion instead (Notion → Settings → Export)."
          : msg
      );
    } finally {
      setNotionBusy(false);
    }
  };

  const removeStaged = (idx: number) =>
    setFormField("importedPages", staged.filter((_, i) => i !== idx));

  const totalBlocks = staged.reduce((n, p) => n + p.blocks.length, 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[22px] font-bold tracking-[-0.4px]" style={{ color: C.text }}>Bring your notes with you</h2>
        <p className="text-sm leading-relaxed" style={{ color: C.muted }}>
          Import from Notion, Notepad or files — or skip and start fresh.
        </p>
      </div>

      {/* dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); void handleFiles(e.dataTransfer.files); }}
        onClick={() => fileRef.current?.click()}
        className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors"
        style={{
          borderColor: dragOver ? C.purple : C.border,
          background: dragOver ? C.purpleLight : "#fff",
        }}
      >
        {parsing ? (
          <Loader2 size={22} className="animate-spin" style={{ color: C.purple }} />
        ) : (
          <Upload size={22} style={{ color: C.muted }} />
        )}
        <p className="text-sm font-semibold" style={{ color: C.text }}>
          {parsing ? "Parsing…" : "Drop files or click to browse"}
        </p>
        <p className="text-xs leading-relaxed" style={{ color: C.muted }}>
          Notion .zip · Markdown · .txt · HTML · CSV · JSON · .enex
        </p>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => { if (e.target.files) void handleFiles(e.target.files); e.target.value = ""; }}
        />
      </div>

      {/* paste + notion collapsibles */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setPasteOpen((v) => !v); setNotionOpen(false); }}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors cursor-pointer"
          style={{ background: pasteOpen ? C.purpleLight : "#fff", border: `1.5px solid ${pasteOpen ? C.purple : C.border}`, color: pasteOpen ? C.purple : C.text }}
        >
          <ClipboardPaste size={13} /> Paste text
        </button>
        <button
          type="button"
          onClick={() => { setNotionOpen((v) => !v); setPasteOpen(false); }}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors cursor-pointer"
          style={{ background: notionOpen ? C.purpleLight : "#fff", border: `1.5px solid ${notionOpen ? C.purple : C.border}`, color: notionOpen ? C.purple : C.text }}
        >
          <CloudDownload size={13} /> Notion direct
        </button>
      </div>

      {pasteOpen && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2">
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={5}
            placeholder="Paste Markdown or Notepad text here…"
            className="w-full rounded-xl p-3 font-mono text-xs leading-5 outline-none"
            style={{ background: "#fff", border: `1.5px solid ${C.border}`, color: C.text }}
          />
          <button
            type="button"
            onClick={handlePaste}
            disabled={!pasteText.trim()}
            className="rounded-xl px-3 py-2 text-xs font-semibold text-white disabled:opacity-40 cursor-pointer"
            style={{ background: `linear-gradient(135deg, ${C.purple}, #4f46e5)` }}
          >
            Stage pasted text
          </button>
        </motion.div>
      )}

      {notionOpen && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2">
          <p className="text-[11px] leading-relaxed" style={{ color: C.muted }}>
            Create an integration at notion.so/my-account/integrations, share the page with it (··· → Add connections), then paste below.
          </p>
          <input
            type="password"
            value={notionToken}
            onChange={(e) => setNotionToken(e.target.value)}
            placeholder="Integration token (secret_…)"
            className="w-full rounded-xl px-3 py-2 font-mono text-xs outline-none"
            style={{ background: "#fff", border: `1.5px solid ${C.border}`, color: C.text }}
          />
          <input
            value={notionUrl}
            onChange={(e) => setNotionUrl(e.target.value)}
            placeholder="Notion page / database URL"
            className="w-full rounded-xl px-3 py-2 font-mono text-xs outline-none"
            style={{ background: "#fff", border: `1.5px solid ${C.border}`, color: C.text }}
          />
          {notionError && (
            <div className="flex items-start gap-1.5 rounded-lg px-2.5 py-2 text-[11px]" style={{ background: "rgba(239,68,68,0.08)", color: "#dc2626" }}>
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />{notionError}
            </div>
          )}
          <button
            type="button"
            onClick={handleNotion}
            disabled={notionBusy}
            className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer"
            style={{ background: `linear-gradient(135deg, ${C.purple}, #4f46e5)` }}
          >
            {notionBusy ? <Loader2 size={13} className="animate-spin" /> : <CloudDownload size={13} />}
            {notionBusy ? "Fetching…" : "Fetch from Notion"}
          </button>
        </motion.div>
      )}

      {warnings.length > 0 && (
        <div className="flex flex-col gap-1 rounded-xl px-3 py-2" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)" }}>
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px]" style={{ color: "#b45309" }}>
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />{w}
            </div>
          ))}
        </div>
      )}

      {/* staged list */}
      {staged.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: C.muted }}>
            Ready to import — {staged.length} page{staged.length > 1 ? "s" : ""} · {totalBlocks} blocks
          </p>
          <div className="flex max-h-[160px] flex-col gap-1.5 overflow-y-auto">
            {staged.map((p, i) => (
              <div key={i} className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "#fff", border: `1.5px solid ${C.border}` }}>
                <FileText size={13} className="shrink-0" style={{ color: C.muted }} />
                <span className="flex-1 truncate text-xs font-semibold" style={{ color: C.text }}>{p.title}</span>
                <span className="text-[10px]" style={{ color: C.muted }}>{p.blocks.length} blocks</span>
                <button type="button" onClick={() => removeStaged(i)} className="transition-colors hover:text-red-500 cursor-pointer" style={{ color: C.muted }} aria-label={`Remove ${p.title}`}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <SecondaryBtn onClick={back}>Back</SecondaryBtn>
        <PrimaryBtn onClick={next}>
          {staged.length ? `Continue with ${staged.length} page${staged.length > 1 ? "s" : ""}` : "Skip for now"} <ChevronRight size={15} />
        </PrimaryBtn>
      </div>
    </div>
  );
}
