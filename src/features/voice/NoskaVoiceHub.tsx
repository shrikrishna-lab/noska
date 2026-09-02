import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Copy, Mic, Pencil, Plus, Search, Settings2, Square, Trash2, X } from "lucide-react";
import { globalVoiceController, useVoiceController } from "../../lib/voice/voice-controller";
import { TauriWhisperEngine, type LocalModelStatus } from "../../lib/voice/tauri-whisper-engine";
import { getVoiceSettings, setVoiceSettings } from "../../lib/voice/voice-settings";
import { dictionaryEntryWarning, loadVoiceDictionary, saveVoiceDictionary, type DictionaryEntry, type VoiceDictionary } from "../../lib/voice/dictionary";
import "./noska-voice.css";

type HistoryItem = { id: string; text: string; createdAt: string; correction?: string };
const HISTORY_KEY = "noska_voice_history";

function readHistory(): HistoryItem[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
}
function formatTime(value: string) { return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value)); }

export default function NoskaVoiceHub({ onClose, initialShowSettings = false }: { onClose: () => void; initialShowSettings?: boolean }) {
  const voice = useVoiceController();
  const [history, setHistory] = useState<HistoryItem[]>(readHistory);
  const [dictionary, setDictionary] = useState<VoiceDictionary>({ version: 1, entries: [] });
  const [query, setQuery] = useState("");
  const [dictionaryQuery, setDictionaryQuery] = useState("");
  const [showSettings, setShowSettings] = useState(initialShowSettings);
  const [term, setTerm] = useState("");
  const [heard, setHeard] = useState("");
  const [write, setWrite] = useState("");
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [localModel, setLocalModel] = useState<LocalModelStatus | null>(null);
  const [installingModel, setInstallingModel] = useState(false);
  const [editing, setEditing] = useState<DictionaryEntry | null>(null);
  const transcriptTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestTranscript = useRef("");
  const latestCorrection = useRef<string | undefined>(undefined);

  useEffect(() => { void loadVoiceDictionary().then(setDictionary); }, []);
  useEffect(() => { void TauriWhisperEngine.modelStatus().then(setLocalModel).catch(() => setLocalModel(null)); }, []);
  useEffect(() => {
    const handler = (event: Event) => setDetectedLanguage((event as CustomEvent<{ language?: string }>).detail?.language || null);
    window.addEventListener("noska_voice_language_detected", handler);
    return () => window.removeEventListener("noska_voice_language_detected", handler);
  }, []);
  useEffect(() => {
    const unsubscribe = globalVoiceController.onTranscript((text, correction) => {
      if (!text.trim() || text.startsWith("↺")) return;
      latestTranscript.current = text.trim();
      latestCorrection.current = correction;
      if (transcriptTimer.current) clearTimeout(transcriptTimer.current);
      // Browser recognition emits interim phrases; wait for the phrase to settle.
      transcriptTimer.current = setTimeout(() => {
        const settled = latestTranscript.current;
        const previous = readHistory();
        if (previous[0]?.text === settled) return;
        const next = [{ id: crypto.randomUUID(), text: settled, createdAt: new Date().toISOString(), correction: latestCorrection.current }, ...previous].slice(0, 200);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
        setHistory(next);
      }, 750);
    });
    return () => { unsubscribe(); if (transcriptTimer.current) clearTimeout(transcriptTimer.current); };
  }, []);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === ",") { event.preventDefault(); setShowSettings(true); }
    };
    window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler);
  }, []);

  const level = Math.max(...voice.frequencyLevels, 0);
  const filteredHistory = useMemo(() => history.filter((item) => item.text.toLowerCase().includes(query.toLowerCase())), [history, query]);
  const filteredDictionary = useMemo(() => dictionary.entries.filter((entry) => JSON.stringify(entry).toLowerCase().includes(dictionaryQuery.toLowerCase())), [dictionary, dictionaryQuery]);
  const saveDictionary = async (entries: DictionaryEntry[]) => {
    const next = { version: 1 as const, entries };
    setDictionary(next); await saveVoiceDictionary(next);
  };
  const addTerm = () => { if (!term.trim()) return; void saveDictionary([...dictionary.entries, { id: crypto.randomUUID(), type: "term", value: term.trim(), createdAt: new Date().toISOString() }]); setTerm(""); };
  const addCorrection = () => { if (!heard.trim() || !write.trim()) return; void saveDictionary([...dictionary.entries, { id: crypto.randomUUID(), type: "correction", heard: heard.trim(), write: write.trim(), createdAt: new Date().toISOString() }]); setHeard(""); setWrite(""); };
  const updateEntry = () => {
    if (!editing) return;
    if (editing.type === "term" && !term.trim()) return;
    if (editing.type === "correction" && (!heard.trim() || !write.trim())) return;
    const replacement: DictionaryEntry = editing.type === "term"
      ? { ...editing, value: term.trim() }
      : { ...editing, heard: heard.trim(), write: write.trim() };
    void saveDictionary(dictionary.entries.map((entry) => entry.id === editing.id ? replacement : entry));
    setEditing(null); setTerm(""); setHeard(""); setWrite("");
  };
  const beginEdit = (entry: DictionaryEntry) => { setEditing(entry); setTerm(entry.type === "term" ? entry.value : ""); setHeard(entry.type === "correction" ? entry.heard : ""); setWrite(entry.type === "correction" ? entry.write : ""); };
  const correctionWarning = dictionaryEntryWarning(heard);
  const installMultilingualModel = async () => {
    setInstallingModel(true);
    try { setLocalModel(await TauriWhisperEngine.installModel()); }
    finally { setInstallingModel(false); }
  };

  return <div className="noska-voice fixed inset-0 z-[10001] flex items-center justify-center bg-black/55 p-5 backdrop-blur-sm">
    <main className="nv-shell grid h-[min(760px,92vh)] w-[min(1100px,96vw)] grid-cols-[300px_1fr] overflow-hidden rounded-[10px]">
      <aside className="border-r border-[var(--nv-line)] bg-[#20201e] p-4">
        <div className="mb-6 flex items-center justify-between"><div><p className="nv-label">Portable Dictation</p><h1 className="m-0 mt-1 text-xl font-semibold tracking-tight">Noska Voice</h1></div><button className="nv-button nv-button--quiet" onClick={onClose} aria-label="Close"><X size={16}/></button></div>
        <div className="mb-3 flex items-center gap-2"><Search size={14} color="var(--nv-muted)"/><input className="nv-input" placeholder="Search transcriptions" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
        <p className="nv-label mb-2">Transcriptions</p>
        <div className="max-h-[570px] overflow-auto pr-1">{filteredHistory.length ? filteredHistory.map((item) => <article className="nv-history-item" key={item.id}><div className="flex justify-between gap-2"><span className="font-mono text-[11px] text-[var(--nv-muted)]">{formatTime(item.createdAt)}</span><button className="text-[var(--nv-aluminum)]" onClick={() => navigator.clipboard.writeText(item.text)} aria-label="Copy"><Copy size={14}/></button></div><p className="mb-0 mt-1 text-sm leading-5">{item.text}</p>{item.correction && <p className="nv-correction mb-0 mt-2">CORRECTED · {item.correction}</p>}</article>) : <p className="text-sm text-[var(--nv-muted)]">No transcriptions yet.</p>}</div>
      </aside>
      <section className="min-w-0 overflow-auto p-5">
        <header className="mb-5 flex items-start justify-between gap-3"><div><p className="nv-label">Session Monitor{detectedLanguage ? ` · ${detectedLanguage.toUpperCase()}${voice.isListening ? " detected" : ""}` : ""}</p><h2 className="m-0 mt-1 text-2xl font-semibold">{voice.isListening ? "Recording" : "Ready to record"}</h2></div><button className="nv-button" onClick={() => setShowSettings(!showSettings)}><Settings2 size={14} className="mr-2 inline"/>Settings</button></header>
        <div className="nv-panel mb-5 p-4"><div className="grid grid-cols-[1fr_auto] gap-5"><div className="nv-meter" style={{ "--nv-needle-angle": `${-50 + Math.min(level, 1) * 95}deg` } as CSSProperties}><div className="flex justify-between font-mono text-[10px] text-[var(--nv-muted)]"><span>−20</span><span>−10</span><span>0</span><span>+3</span></div><div className="nv-needle"/><span className="absolute bottom-3 left-3 nv-label">Input level</span></div><div className="font-mono text-3xl tabular-nums text-[var(--nv-cream)]">{String(Math.floor(voice.time / 60)).padStart(2,"0")}:{String(voice.time % 60).padStart(2,"0")}</div></div><div className="mt-4 flex gap-2">{voice.isListening ? <button className="nv-button nv-button--record" onClick={() => globalVoiceController.stop()}><Square size={13} className="mr-2 inline fill-current"/>Stop</button> : <button className="nv-button nv-button--record" onClick={() => globalVoiceController.start()}><Mic size={14} className="mr-2 inline"/>Record</button>}<button className="nv-button" onClick={() => navigator.clipboard.writeText(history[0]?.text || "")}>Copy last</button></div></div>
        <div className="nv-panel p-4"><div className="mb-4 flex items-center justify-between"><div><p className="nv-label">Personal Dictionary</p><p className="mb-0 mt-1 text-sm text-[var(--nv-muted)]">Plain-file, local-first vocabulary and safe corrections.</p></div><div className="w-56"><input className="nv-input" value={dictionaryQuery} onChange={(event) => setDictionaryQuery(event.target.value)} placeholder="Search dictionary"/></div></div>
          <div className="mb-4 grid grid-cols-[1fr_auto] gap-2"><input className="nv-input" value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Word, name, or product — e.g. Supabase"/><button className="nv-button" onClick={editing?.type === "term" ? updateEntry : addTerm}><Plus size={13} className="mr-1 inline"/>{editing?.type === "term" ? "Save" : "Word"}</button></div>
          <div className="mb-1 grid grid-cols-[1fr_1fr_auto] gap-2"><input className="nv-input" value={heard} onChange={(event) => setHeard(event.target.value)} placeholder="Heard — e.g. cloud code"/><input className="nv-input" value={write} onChange={(event) => setWrite(event.target.value)} placeholder="Write — e.g. Claude Code"/><button className="nv-button" onClick={editing?.type === "correction" ? updateEntry : addCorrection}><Plus size={13} className="mr-1 inline"/>{editing?.type === "correction" ? "Save" : "Correct"}</button></div>
          {correctionWarning && <p className="mb-4 text-xs text-[var(--nv-amber)]">{correctionWarning}</p>}
          {editing && <button className="mb-3 text-xs text-[var(--nv-muted)] underline" onClick={() => { setEditing(null); setTerm(""); setHeard(""); setWrite(""); }}>Cancel edit</button>}
          <div>{filteredDictionary.map((entry) => <div className="flex items-center justify-between border-t border-white/10 py-3" key={entry.id}><div><p className="nv-label">{entry.type === "term" ? "Vocabulary" : "Correction"}</p><p className="mb-0 mt-1 text-sm">{entry.type === "term" ? entry.value : <><span className="text-[var(--nv-muted)]">{entry.heard}</span> → {entry.write}</>}</p></div><div className="flex gap-3"><button className="text-[var(--nv-aluminum)]" onClick={() => beginEdit(entry)} aria-label="Edit"><Pencil size={14}/></button><button className="text-[var(--nv-record)]" onClick={() => void saveDictionary(dictionary.entries.filter((candidate) => candidate.id !== entry.id))} aria-label="Delete"><Trash2 size={15}/></button></div></div>)}</div>
        </div>
        {showSettings && <div className="nv-panel mt-5 p-4"><p className="nv-label">Settings</p><div className="mt-3 grid grid-cols-2 gap-3"><label className="text-sm">Hotkey<input className="nv-input mt-1" defaultValue={getVoiceSettings().shortcut} onBlur={(event) => setVoiceSettings({ shortcut: event.target.value })}/></label><label className="text-sm">Model<select className="nv-input mt-1" defaultValue={getVoiceSettings().modelTier} onChange={(event) => setVoiceSettings({ modelTier: event.target.value as any })}><option value="auto">Auto</option><option value="always_local">Local Whisper</option><option value="always_cloud">Cloud</option></select></label></div>{localModel && <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3"><div><p className="nv-label">India multilingual model</p><p className="mb-0 mt-1 text-xs text-[var(--nv-muted)]">{localModel.installed ? "Installed · audio language detection ready" : "Needed for offline Hindi, Hinglish, and language auto-detect"}</p></div>{!localModel.installed && <button className="nv-button" disabled={installingModel} onClick={() => void installMultilingualModel()}>{installingModel ? "Installing…" : "Install model"}</button>}</div>}</div>}
      </section>
    </main>
  </div>;
}
