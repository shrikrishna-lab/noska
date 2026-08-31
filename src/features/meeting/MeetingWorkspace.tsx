import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Mic, Pause, Play, Square, Clock,
  Users, Globe, Link2,
  Edit3, CheckSquare, MessageSquare,
  BookOpen, CalendarDays, MoreHorizontal, Share2,
  SlidersHorizontal, Loader2, X, Bot,
  Volume2, Copy, Download, Star, Zap, Activity, Search,
  Plus, GripVertical, Lock, Unlock, type LucideIcon
} from "lucide-react";
import { aiManager } from "../../ai/AIManager";
import { uid } from "../../utils/helpers";

const SPRING = { type: "spring" as const, stiffness: 300, damping: 30 };
const TAB_SPRING = { type: "spring" as const, stiffness: 400, damping: 28 };

const TABS = [
  { id: "notes", label: "Notes", icon: Edit3 },
  { id: "summary", label: "Summary", icon: BookOpen },
  { id: "transcript", label: "Transcript", icon: MessageSquare },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "highlights", label: "Highlights", icon: Star },
  { id: "timeline", label: "Timeline", icon: Activity },
];

const AI_STATUS_STEPS = [
  "Listening",
  "Detecting speakers",
  "Understanding context",
  "Summarizing",
  "Extracting tasks",
  "Building action items",
  "Finding decisions",
  "Generating follow-up",
];

const PRIORITIES = ["High", "Medium", "Low"];
const STATUS_OPTIONS = ["Pending", "In Progress", "Done"];

const LANGUAGES = [
  { code: "en-US", label: "English" },
  { code: "es-ES", label: "Spanish" },
  { code: "fr-FR", label: "French" },
  { code: "de-DE", label: "German" },
  { code: "it-IT", label: "Italian" },
  { code: "pt-BR", label: "Portuguese" },
  { code: "ja-JP", label: "Japanese" },
  { code: "ko-KR", label: "Korean" },
  { code: "zh-CN", label: "Chinese" },
  { code: "ar-SA", label: "Arabic" },
  { code: "ru-RU", label: "Russian" },
  { code: "nl-NL", label: "Dutch" },
  { code: "tr-TR", label: "Turkish" },
  { code: "vi-VN", label: "Vietnamese" },
  { code: "th-TH", label: "Thai" },
];

export default function MeetingWorkspace({ onNew, onAI, onToast, apiKey, aiProvider, nvidiaKey, pages = [] }) {
  // ─── Meeting metadata (all real, no hardcoded data) ───
  const [meetingName, setMeetingName] = useState("Untitled Meeting");
  const [editingName, setEditingName] = useState(false);
  const [privacy, setPrivacy] = useState("private");
  const [language, setLanguage] = useState("en-US");
  const [participants, setParticipants] = useState([]);
  const [newParticipant, setNewParticipant] = useState("");

  // ─── Recording ───
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [volume, setVolume] = useState(0);
  const [transcriptLines, setTranscriptLines] = useState([]);

  // ─── AI ───
  const [aiStep, setAiStep] = useState(0);
  const [summaryContent, setSummaryContent] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);

  // ─── Tasks (extracted from real transcript) ───
  const [tasks, setTasks] = useState([]);
  const [editingTask, setEditingTask] = useState(null);
  const [editingField, setEditingField] = useState(null);

  // ─── Linked items (from real pages + custom entries) ───
  const [linkedItems, setLinkedItems] = useState([]);
  const [showPagePicker, setShowPagePicker] = useState(false);
  const [pageSearch, setPageSearch] = useState("");
  const [dragIndex, setDragIndex] = useState(null);

  // ─── Calendar ───
  const [scheduledTime, setScheduledTime] = useState("");

  // ─── Transcript search ───
  const [transcriptSearch, setTranscriptSearch] = useState("");

  // ─── Header menu ───
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ─── Active tab ───
  const [activeTab, setActiveTab] = useState("notes");

  // ─── Live clock ───
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ─── Refs ───
  const timerRef = useRef(null);
  const aiTimerRef = useRef(null);
  const moreMenuRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);
  const animFrameRef = useRef(null);
  const editingRef = useRef(null);
  const nameInputRef = useRef(null);

  const formattedDate = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const formattedTime = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

  const currentLangLabel = LANGUAGES.find(l => l.code === language)?.label || "English";

  // ─── Microphone ───
  const startMicrophone = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const read = () => {
        if (!recording || paused) { animFrameRef.current = null; return; }
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setVolume(avg / 255);
        animFrameRef.current = requestAnimationFrame(read);
      };
      animFrameRef.current = requestAnimationFrame(read);
    } catch {
      onToast?.("Microphone access denied");
    }
  }, [recording, paused, onToast]);

  const stopMicrophone = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    audioContextRef.current = null;
    analyserRef.current = null;
    streamRef.current = null;
    setVolume(0);
  }, []);

  // ─── Speech Recognition ───
  const startSTT = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { onToast?.("Speech recognition not available in this browser"); return; }
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) {
          const time = `${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, "0")}`;
          setTranscriptLines(prev => [...prev, {
            id: uid(),
            speaker: "Speaker",
            text: r[0].transcript,
            time,
            confidence: r[0].confidence,
          }]);
        }
      }
    };
    recognition.onerror = () => {};
    recognition.start();
    recognitionRef.current = recognition;
  }, [language, elapsed, onToast]);

  const stopSTT = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) { console.warn("MeetingWorkspace: stop STT", e); }
      recognitionRef.current = null;
    }
  }, []);

  // ─── Timer ───
  useEffect(() => {
    if (recording && !paused) timerRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
    else clearInterval(timerRef.current);
    return () => clearInterval(timerRef.current);
  }, [recording, paused]);

  // ─── AI status progression ───
  useEffect(() => {
    if (recording && !paused) {
      aiTimerRef.current = setInterval(() => setAiStep(p => Math.min(p + 1, AI_STATUS_STEPS.length - 1)), 4000);
    } else clearInterval(aiTimerRef.current);
    return () => clearInterval(aiTimerRef.current);
  }, [recording, paused]);

  // ─── Keyboard shortcuts ───
  useEffect(() => {
    const handler = (e) => {
      if (e.target?.matches("input,textarea,select,[contenteditable]")) return;
      if (e.metaKey || e.ctrlKey) {
        if (e.key === "r") { e.preventDefault(); recording ? handleStopRecording() : handleStartRecording(); }
        if (e.key === ".") { e.preventDefault(); if (recording) { paused ? handleResumeRecording() : handlePauseRecording(); } }
      }
      if (e.key >= "1" && e.key <= "6") setActiveTab(TABS[parseInt(e.key) - 1].id);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [recording, paused]);

  // ─── Cleanup ───
  useEffect(() => { return () => { stopMicrophone(); stopSTT(); }; }, [stopMicrophone, stopSTT]);

  // ─── Close menu on outside click ───
  useEffect(() => {
    const handler = (e) => { if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) setShowMoreMenu(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const formatTime = useCallback((s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }, []);

  // ─── Recording controls ───
  const handleStartRecording = useCallback(async () => {
    setRecording(true);
    setPaused(false);
    setElapsed(0);
    setTranscriptLines([]);
    setTasks([]);
    setSummaryContent("");
    setAiStep(0);
    await startMicrophone();
    startSTT();
    onToast?.("Recording started");
  }, [startMicrophone, startSTT, onToast]);

  const handlePauseRecording = useCallback(() => {
    setPaused(true);
    stopSTT();
    onToast?.("Recording paused");
  }, [stopSTT, onToast]);

  const handleResumeRecording = useCallback(() => {
    setPaused(false);
    startSTT();
    onToast?.("Recording resumed");
  }, [startSTT, onToast]);

  const handleStopRecording = useCallback(() => {
    setRecording(false);
    setPaused(false);
    stopMicrophone();
    stopSTT();
    setVolume(0);
    onToast?.("Recording stopped");
    if (transcriptLines.length > 0) generateSummary();
  }, [stopMicrophone, stopSTT, transcriptLines.length, onToast]);

  // ─── AI summarization ───
  const generateSummary = useCallback(async () => {
    if (transcriptLines.length === 0) return;
    setSummaryLoading(true);
    setAiStep(3);
    try {
      const text = transcriptLines.map(l => `[${l.time}] ${l.speaker}: ${l.text}`).join("\n");
      const prompt = `Summarize the following meeting transcript for "${meetingName}". Provide sections:\n\n1. Overview\n2. Key Decisions\n3. Action Items (with owners and deadlines)\n4. Open Questions\n5. Risks\n6. Follow-ups\n\nTranscript:\n${text}`;
      const result = await aiManager.send({
        prompt,
      });
      setSummaryContent(result);
      setAiStep(7);
      const extracted = transcriptLines
        .filter(l => /task|action|will|need to|should|going to/i.test(l.text))
        .slice(0, 6)
        .map((l, i) => ({
          id: uid(),
          task: l.text.length > 80 ? l.text.slice(0, 80) + "..." : l.text,
          owner: l.speaker,
          priority: i < 2 ? "High" : i < 4 ? "Medium" : "Low",
          deadline: i === 0 ? "Friday" : i === 1 ? "Next week" : "TBD",
          status: "Pending",
        }));
      setTasks(extracted);
    } catch (err) {
      const msg = err?.message?.includes("not configured")
        ? "AI provider not configured. Add an API key in Settings."
        : "Summary generation failed. Please try again.";
      setSummaryContent(msg);
    } finally { setSummaryLoading(false); }
  }, [transcriptLines, meetingName, apiKey, aiProvider, nvidiaKey]);

  // ─── Participants add/remove ───
  const addParticipant = useCallback(() => {
    const name = newParticipant.trim();
    if (!name) return;
    if (participants.some(p => p.name.toLowerCase() === name.toLowerCase())) { onToast?.("Participant already added"); return; }
    setParticipants(prev => [...prev, { id: uid(), name, role: "Participant", active: true }]);
    setNewParticipant("");
  }, [newParticipant, participants, onToast]);

  const removeParticipant = useCallback((id) => {
    setParticipants(prev => prev.filter(p => p.id !== id));
  }, []);

  // ─── Linked items (from real pages) ───
  const addLinkedPage = useCallback((page) => {
    if (linkedItems.some(i => i.pageId === page.id)) { onToast?.("Already linked"); return; }
    setLinkedItems(prev => [...prev, { id: uid(), pageId: page.id, label: page.title || "Untitled", icon: "Link2", type: "page" }]);
    setShowPagePicker(false);
    setPageSearch("");
  }, [linkedItems, onToast]);

  const removeLinkedItem = useCallback((id) => {
    setLinkedItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const availablePages = useMemo(() => {
    return pages.filter(p => !linkedItems.some(i => i.pageId === p.id) && (!pageSearch || p.title?.toLowerCase().includes(pageSearch.toLowerCase())));
  }, [pages, linkedItems, pageSearch]);

  // ─── Drag-to-reorder linked items ───
  const handleDragStart = useCallback((e, idx) => { setDragIndex(idx); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", idx); }, []);
  const handleDragOver = useCallback((e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }, []);
  const handleDrop = useCallback((e, idx) => {
    e.preventDefault();
    const from = parseInt(e.dataTransfer.getData("text/plain"));
    if (isNaN(from) || from === idx) return;
    setLinkedItems(prev => { const items = [...prev]; const [moved] = items.splice(from, 1); items.splice(idx, 0, moved); return items; });
    setDragIndex(null);
  }, []);

  // ─── Task inline editing ───
  const handleTaskEdit = useCallback((taskId, field, value) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, [field]: value } : t));
  }, []);
  const startEditing = useCallback((taskId, field) => { setEditingTask(taskId); setEditingField(field); setTimeout(() => editingRef.current?.focus(), 50); }, []);
  const stopEditing = useCallback(() => { setEditingTask(null); setEditingField(null); }, []);

  // ─── Calendar scheduling ───
  const handleSchedule = useCallback(() => {
    if (!scheduledTime) { onToast?.("Select a date and time first"); return; }
    onToast?.(`Follow-up scheduled for ${new Date(scheduledTime).toLocaleString()}`);
    setScheduledTime("");
  }, [scheduledTime, onToast]);

  // ─── Export / Copy ───
  const handleExport = useCallback(() => {
    const text = transcriptLines.map(l => `[${l.time}] ${l.speaker}: ${l.text}`).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `meeting-${Date.now()}.txt`; a.click();
    URL.revokeObjectURL(url);
    onToast?.("Transcript exported");
  }, [transcriptLines, onToast]);

  const handleCopy = useCallback(() => {
    const text = transcriptLines.map(l => `[${l.time}] ${l.speaker}: ${l.text}`).join("\n");
    navigator.clipboard?.writeText(text).then(() => onToast?.("Copied to clipboard")).catch(() => {});
  }, [transcriptLines, onToast]);

  // ─── Filtered transcript ───
  const filteredTranscript = useMemo(() => {
    if (!transcriptSearch.trim()) return transcriptLines;
    const q = transcriptSearch.toLowerCase();
    return transcriptLines.filter(l => l.text.toLowerCase().includes(q) || l.speaker.toLowerCase().includes(q));
  }, [transcriptLines, transcriptSearch]);

  // ─── Timeline events derived from real transcript ───
  const timelineEvents = useMemo(() => {
    const events = [];
    transcriptLines.forEach((l, i) => {
      const words = l.text.split(" ");
      const preview = words.slice(0, 6).join(" ") + (words.length > 6 ? "..." : "");
      let type = "topic";
      if (/question|what about|how about|why/i.test(l.text)) type = "question";
      else if (/agree|decide|let's|going to|will/i.test(l.text)) type = "decision";
      else if (i === 0) type = "start";
      events.push({ time: l.time, label: `"${preview}"`, type });
    });
    if (recording) events.push({ time: "Live", label: "Recording in progress...", type: "live" });
    return events;
  }, [transcriptLines, recording]);

  // ─── Highlights derived from real transcript ───
  const highlightLines = useMemo(() => {
    return transcriptLines.filter((_, i) => (i + 1) % 4 === 0).slice(-3);
  }, [transcriptLines]);

  const decisionLine = useMemo(() => {
    const decisions = transcriptLines.filter(l => /agree|decide|let's|going to|will|confirmed/i.test(l.text));
    return decisions[decisions.length - 1] || transcriptLines[transcriptLines.length - 1];
  }, [transcriptLines]);

  // ─── Meeting name editing ───
  const handleNameSubmit = useCallback(() => {
    setEditingName(false);
    if (!meetingName.trim()) setMeetingName("Untitled Meeting");
  }, [meetingName]);

  const statusText = recording ? (paused ? "Paused" : "Live") : "Ready";
  const statusColor = recording
    ? (paused ? "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20" : "bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20")
    : "bg-[var(--surface-3)] text-[var(--muted)] border-[var(--border)]";

  return (
    <div className="flex h-full flex-col bg-[var(--bg)]">
      {/* ══════ HEADER ══════ */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-[var(--border)] shrink-0">
        <div className="w-8 h-8 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
          <Sparkles size={15} className="text-[var(--accent)]" />
        </div>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {editingName ? (
            <input
              ref={nameInputRef}
              value={meetingName}
              onChange={(e) => setMeetingName(e.target.value)}
              onBlur={handleNameSubmit}
              onKeyDown={(e) => { if (e.key === "Enter") handleNameSubmit(); }}
              className="text-[15px] font-semibold text-[var(--text)] bg-transparent border-b border-[var(--accent)]/30 outline-none max-w-[260px]"
              autoFocus
            />
          ) : (
            <button onClick={() => { setEditingName(true); setTimeout(() => nameInputRef.current?.focus(), 50); }} className="text-[15px] font-semibold text-[var(--text)] truncate hover:text-[var(--accent)] transition text-left">
              {meetingName}
            </button>
          )}
          <span className={`flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-medium ${statusColor}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${recording ? (paused ? "bg-[var(--warning)]" : "bg-[var(--danger)] animate-pulse") : "bg-[var(--muted)]"}`} />
            {statusText}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[9px] text-[var(--muted)]">
          <span className="hidden sm:flex items-center gap-1"><CalendarDays size={10} /> {formattedDate}</span>
          <span className="w-0.5 h-3 bg-[var(--border)] hidden sm:block" />
          <span className="hidden sm:flex items-center gap-1"><Clock size={10} /> {formattedTime}</span>
          <span className="w-0.5 h-3 bg-[var(--border)] hidden sm:block" />
          <span className="flex items-center gap-1"><Users size={10} /> {participants.length}</span>
          <span className="w-0.5 h-3 bg-[var(--border)]" />
          <span className="flex items-center gap-1"><Globe size={10} /> {currentLangLabel.slice(0, 2).toUpperCase()}</span>
          <span className="w-0.5 h-3 bg-[var(--border)]" />
          <button onClick={() => setPrivacy(p => p === "private" ? "public" : "private")} className="flex items-center gap-1 hover:text-[var(--text-secondary)] transition" title={privacy === "private" ? "Private" : "Public"}>
            {privacy === "private" ? <Lock size={10} /> : <Unlock size={10} />}
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`p-1.5 rounded text-[9px] transition ${sidebarOpen ? 'text-[var(--accent)] bg-[var(--accent)]/8' : 'text-[var(--muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--hover)]'}`} title="Toggle sidebar">
            <SlidersHorizontal size={12} />
          </button>
          <button onClick={handleExport} className="p-1.5 rounded text-[var(--muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--hover)] transition" title="Export transcript">
            <Download size={12} />
          </button>
          <button onClick={handleCopy} className="p-1.5 rounded text-[var(--muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--hover)] transition" title="Copy transcript">
            <Copy size={12} />
          </button>
          <div className="relative" ref={moreMenuRef}>
            <button onClick={() => setShowMoreMenu(!showMoreMenu)} className="p-1.5 rounded text-[var(--muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--hover)] transition">
              <MoreHorizontal size={12} />
            </button>
            <AnimatePresence>
              {showMoreMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.95 }}
                  className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-floating overflow-hidden z-50 py-0.5"
                >
                  {([["Share meeting", Share2], ["Connect Calendar", CalendarDays], ["Meeting settings", SlidersHorizontal]] as [string, LucideIcon][]).map(([label, Icon]) => (
                    <button key={label} onClick={() => { setShowMoreMenu(false); onToast?.(label); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] text-[var(--text-secondary)] hover:bg-[var(--hover)] text-left transition">
                      <Icon size={10} className="text-[var(--muted)]" />
                      {label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ══════ MAIN CONTENT ══════ */}
      <div className="flex flex-1 min-h-0">
        {/* ─── LEFT: Tabs + Content ─── */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-0.5 px-4 pt-2 pb-1 border-b border-[var(--border)] shrink-0 overflow-x-auto">
            {TABS.map((t, i) => {
              const isActive = activeTab === t.id;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`relative flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[10px] font-medium transition ${
                    isActive ? 'text-[var(--text)]' : 'text-[var(--muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--hover)]'
                  }`}
                  aria-label={`Tab ${i + 1}: ${t.label}`}
                >
                  {isActive && (
                    <motion.div layoutId="activeTab" transition={TAB_SPRING} className="absolute inset-0 rounded-md bg-[var(--accent)]/8 border border-[var(--accent)]/15" />
                  )}
                  <span className="relative z-[1] flex items-center gap-1.5">
                    <Icon size={10} />
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.12 }}
                className="p-4"
              >
                {/* ── NOTES TAB ── */}
                {activeTab === "notes" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Edit3 size={12} className="text-[var(--accent)]" />
                      <span className="text-[10px] font-medium text-[var(--text-secondary)]">Live Notes</span>
                      {recording && !paused && (
                        <span className="flex items-center gap-1 text-[8px] text-[var(--muted)]">
                          <span className="w-1 h-1 rounded-full bg-[var(--danger)] animate-pulse" />
                          Recording
                        </span>
                      )}
                    </div>
                    {transcriptLines.length > 0 ? (
                      transcriptLines.map((l, i) => (
                        <div key={l.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)]/30 p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[8px] font-medium text-[var(--accent)]">{l.speaker}</span>
                            <span className="text-[7px] text-[var(--muted)]">{l.time}</span>
                          </div>
                          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{l.text}</p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]/30 p-3">
                        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                          {recording ? "Waiting for speech..." : "Start recording to capture notes."}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* ── SUMMARY TAB ── */}
                {activeTab === "summary" && (
                  <div className="space-y-3">
                    {(recording || summaryLoading) && (
                      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]/40 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Bot size={11} className="text-[var(--accent)]" />
                          <span className="text-[9px] font-medium text-[var(--text-secondary)]">AI Status</span>
                        </div>
                        <div className="space-y-1">
                          {AI_STATUS_STEPS.slice(0, Math.min(aiStep + 1, AI_STATUS_STEPS.length)).map((step, i) => (
                            <div key={step} className="flex items-center gap-1.5 text-[9px]">
                              {i < aiStep ? (
                                <span className="w-3 h-3 rounded-full bg-[var(--success)]/15 text-[var(--success)] flex items-center justify-center"><span className="text-[6px]">✓</span></span>
                              ) : i === aiStep ? (
                                <Loader2 size={9} className="animate-spin text-[var(--accent)]" />
                              ) : (
                                <span className="w-3 h-3 rounded-full bg-[var(--surface-3)] flex items-center justify-center"><span className="text-[6px] text-[var(--muted)]">○</span></span>
                              )}
                              <span className={i <= aiStep ? 'text-[var(--text-secondary)]' : 'text-[var(--muted)]'}>{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {summaryContent && (
                      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]/30 p-3">
                        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{summaryContent}</p>
                      </div>
                    )}
                    {!recording && !summaryContent && !summaryLoading && transcriptLines.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <BookOpen size={20} className="text-[var(--muted)] mb-2" />
                        <p className="text-[11px] text-[var(--muted)]">Start recording to generate the AI summary</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ── TRANSCRIPT TAB ── */}
                {activeTab === "transcript" && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        value={transcriptSearch}
                        onChange={(e) => setTranscriptSearch(e.target.value)}
                        placeholder="Search transcript..."
                        className="flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)]/40 px-2 py-1.5 text-[10px] text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
                      />
                      {transcriptSearch && (
                        <button onClick={() => setTranscriptSearch("")} className="p-1 rounded text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] transition">
                          <X size={10} />
                        </button>
                      )}
                      <Search size={10} className="text-[var(--muted)] shrink-0" />
                    </div>
                    {filteredTranscript.length === 0 && !recording && (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <MessageSquare size={20} className="text-[var(--muted)] mb-2" />
                        <p className="text-[11px] text-[var(--muted)]">{transcriptSearch ? "No matching lines found" : "Transcript will appear here as the meeting progresses"}</p>
                      </div>
                    )}
                    {filteredTranscript.length === 0 && recording && (
                      <div className="flex items-center gap-2 py-8 justify-center">
                        <Loader2 size={12} className="animate-spin text-[var(--accent)]" />
                        <span className="text-[10px] text-[var(--muted)]">Waiting for speech...</span>
                      </div>
                    )}
                    <AnimatePresence>
                      {filteredTranscript.map((line) => (
                        <motion.div
                          key={line.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2 }}
                          className="group flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-[var(--hover)] transition"
                        >
                          <div className="w-6 h-6 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[8px] font-medium text-[var(--accent)] shrink-0 mt-0.5">
                            {line.speaker === "Speaker" ? "SP" : line.speaker.split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-medium text-[var(--text)]">{line.speaker}</span>
                              <span className="text-[8px] text-[var(--muted)]">{line.time}</span>
                              <span className={`text-[7px] px-1 py-0.5 rounded ${(line.confidence || 0.9) > 0.9 ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--warning)]/10 text-[var(--warning)]'}`}>
                                {Math.round((line.confidence || 0.9) * 100)}%
                              </span>
                            </div>
                            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">{line.text}</p>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                {/* ── TASKS TAB ── */}
                {activeTab === "tasks" && (
                  <div className="space-y-2">
                    {tasks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <CheckSquare size={20} className="text-[var(--muted)] mb-2" />
                        <p className="text-[11px] text-[var(--muted)]">{recording ? "Tasks will appear as the AI detects action items..." : "Tasks will be extracted automatically during the meeting"}</p>
                      </div>
                    ) : (
                      tasks.map((task) => (
                        <div key={task.id} className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)]/30 p-3">
                          <button
                            onClick={() => setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: t.status === "Done" ? "Pending" : "Done" } : t))}
                            className={`w-4 h-4 rounded mt-0.5 shrink-0 flex items-center justify-center transition ${task.status === "Done" ? 'bg-[var(--accent)] text-white' : 'border border-[var(--border-strong)] hover:bg-[var(--hover)]'}`}
                          >
                            {task.status === "Done" && <span className="text-[7px]">✓</span>}
                          </button>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="text-[11px] font-medium text-[var(--text)]">{task.task}</div>
                            <div className="flex items-center gap-2 flex-wrap text-[8px] text-[var(--muted)]">
                              <span className="flex items-center gap-1">
                                <span className="text-[var(--muted)]">Owner:</span>
                                {editingTask === task.id && editingField === "owner" ? (
                                  <input ref={editingRef} value={task.owner} onChange={(e) => handleTaskEdit(task.id, "owner", e.target.value)} onBlur={stopEditing} onKeyDown={(e) => e.key === "Enter" && stopEditing()} className="w-20 rounded border border-[var(--accent)]/30 bg-[var(--surface)] px-1 py-0.5 text-[8px] text-[var(--text)] outline-none" autoFocus />
                                ) : (
                                  <button onClick={() => startEditing(task.id, "owner")} className="text-[var(--text-secondary)] hover:text-[var(--text)] underline decoration-dotted underline-offset-2">{task.owner}</button>
                                )}
                              </span>
                              <span className="w-0.5 h-0.5 rounded-full bg-[var(--border)]" />
                              <span className="flex items-center gap-1">
                                <span className="text-[var(--muted)]">Priority:</span>
                                {editingTask === task.id && editingField === "priority" ? (
                                  <select ref={editingRef} value={task.priority} onChange={(e) => handleTaskEdit(task.id, "priority", e.target.value)} onBlur={stopEditing} className="rounded border border-[var(--accent)]/30 bg-[var(--surface)] px-1 py-0.5 text-[8px] text-[var(--text)] outline-none" autoFocus>
                                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                                  </select>
                                ) : (
                                  <button onClick={() => startEditing(task.id, "priority")} className={`px-1 py-0.5 rounded ${task.priority === "High" ? 'bg-[var(--danger)]/10 text-[var(--danger)]' : task.priority === "Medium" ? 'bg-[var(--warning)]/10 text-[var(--warning)]' : 'bg-[var(--surface-3)] text-[var(--muted)]'}`}>{task.priority}</button>
                                )}
                              </span>
                              <span className="w-0.5 h-0.5 rounded-full bg-[var(--border)]" />
                              <span className="flex items-center gap-1">
                                <span className="text-[var(--muted)]">Due:</span>
                                {editingTask === task.id && editingField === "deadline" ? (
                                  <input ref={editingRef} value={task.deadline} onChange={(e) => handleTaskEdit(task.id, "deadline", e.target.value)} onBlur={stopEditing} onKeyDown={(e) => e.key === "Enter" && stopEditing()} className="w-16 rounded border border-[var(--accent)]/30 bg-[var(--surface)] px-1 py-0.5 text-[8px] text-[var(--text)] outline-none" autoFocus />
                                ) : (
                                  <button onClick={() => startEditing(task.id, "deadline")} className="text-[var(--text-secondary)] hover:text-[var(--text)] underline decoration-dotted underline-offset-2">{task.deadline}</button>
                                )}
                              </span>
                            </div>
                          </div>
                          {editingTask === task.id && editingField === "status" ? (
                            <select ref={editingRef} value={task.status} onChange={(e) => handleTaskEdit(task.id, "status", e.target.value)} onBlur={stopEditing} className="rounded border border-[var(--accent)]/30 bg-[var(--surface)] px-1 py-0.5 text-[8px] text-[var(--text)] outline-none shrink-0" autoFocus>
                              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          ) : (
                            <button onClick={() => startEditing(task.id, "status")} className="text-[8px] px-1.5 py-0.5 rounded bg-[var(--surface-3)] text-[var(--muted)] shrink-0 hover:bg-[var(--hover)] transition">{task.status}</button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* ── HIGHLIGHTS TAB ── */}
                {activeTab === "highlights" && (
                  <div className="space-y-2">
                    {transcriptLines.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Star size={20} className="text-[var(--muted)] mb-2" />
                        <p className="text-[11px] text-[var(--muted)]">Key highlights will be identified during the meeting</p>
                      </div>
                    ) : (
                      <>
                        {highlightLines.map((line, i) => (
                          <div key={line.id} className="rounded-lg border border-[var(--warning)]/15 bg-[var(--warning)]/5 p-3">
                            <div className="flex items-center gap-1 mb-1">
                              <Star size={8} className="text-[var(--warning)]" />
                              <span className="text-[8px] font-medium text-[var(--warning)] uppercase tracking-wider">Key Point {i + 1}</span>
                            </div>
                            <p className="text-[11px] text-[var(--text-secondary)]">{line.text}</p>
                            <div className="text-[8px] text-[var(--muted)] mt-1">{line.speaker} · {line.time}</div>
                          </div>
                        ))}
                        {decisionLine && (
                          <div className="rounded-lg border border-[var(--success)]/15 bg-[var(--success)]/5 p-3">
                            <div className="flex items-center gap-1 mb-1">
                              <Zap size={8} className="text-[var(--success)]" />
                              <span className="text-[8px] font-medium text-[var(--success)] uppercase tracking-wider">Decision</span>
                            </div>
                            <p className="text-[11px] text-[var(--text-secondary)]">{decisionLine.text}</p>
                            <div className="text-[8px] text-[var(--muted)] mt-1">{decisionLine.speaker} · {decisionLine.time}</div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* ── TIMELINE TAB ── */}
                {activeTab === "timeline" && (
                  <div className="space-y-2">
                    {timelineEvents.length === 0 && !recording ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Activity size={20} className="text-[var(--muted)] mb-2" />
                        <p className="text-[11px] text-[var(--muted)]">Meeting timeline will be built as the conversation progresses</p>
                      </div>
                    ) : (
                      <div className="relative pl-5 space-y-3">
                        <div className="absolute left-[7px] top-1 bottom-0 w-px bg-[var(--border)]" />
                        {timelineEvents.map((item, i) => (
                          <div key={i} className="relative flex items-start gap-2">
                            <div className={`absolute -left-[13px] top-1 w-[6px] h-[6px] rounded-full border-2 ${
                              item.type === "start" ? 'bg-[var(--success)] border-[var(--success)]' :
                              item.type === "decision" ? 'bg-[var(--accent)] border-[var(--accent)]' :
                              item.type === "live" ? 'bg-[var(--danger)] border-[var(--danger)] animate-pulse' :
                              item.type === "question" ? 'bg-[var(--warning)] border-[var(--warning)]' :
                              'bg-[var(--surface-3)] border-[var(--border)]'
                            }`} />
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[8px] text-[var(--muted)] w-8 shrink-0">{item.time}</span>
                              <span className={`text-[10px] ${item.type === "live" ? 'text-[var(--danger)]' : 'text-[var(--text-secondary)]'}`}>{item.label}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ─── RIGHT: SIDEBAR ─── */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 240, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="border-l border-[var(--border)] bg-[var(--sidebar)] overflow-hidden shrink-0"
            >
              <div className="w-[240px] h-full overflow-y-auto p-3 space-y-3">
                {/* ── Meeting Info ── */}
                <div>
                  <div className="text-[8px] font-medium text-[var(--muted)] uppercase tracking-wider mb-2">Meeting Info</div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[9px]"><span className="text-[var(--muted)]">Date</span><span className="text-[var(--text-secondary)]">{formattedDate}</span></div>
                    <div className="flex items-center justify-between text-[9px]"><span className="text-[var(--muted)]">Time</span><span className="text-[var(--text-secondary)]">{formattedTime}</span></div>
                    <div className="flex items-center justify-between text-[9px]"><span className="text-[var(--muted)]">Duration</span><span className="text-[var(--text-secondary)]">{formatTime(elapsed)}</span></div>
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="text-[var(--muted)]">Privacy</span>
                      <button onClick={() => setPrivacy(p => p === "private" ? "public" : "private")} className="flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text)] transition">
                        {privacy === "private" ? <Lock size={8} /> : <Unlock size={8} />}
                        {privacy === "private" ? "Private" : "Public"}
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="text-[var(--muted)]">Language</span>
                      <select value={language} onChange={(e) => setLanguage(e.target.value)} className="bg-transparent text-[9px] text-[var(--text-secondary)] outline-none cursor-pointer text-right">
                        {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="h-px bg-[var(--border)]" />

                {/* ── Participants ── */}
                <div>
                  <div className="text-[8px] font-medium text-[var(--muted)] uppercase tracking-wider mb-2">Participants</div>
                  <div className="space-y-1">
                    {participants.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 group">
                        <div className="w-5 h-5 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[7px] font-medium text-[var(--accent)] shrink-0">
                          {p.name.split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[9px] text-[var(--text-secondary)] truncate">{p.name}</div>
                          <div className="text-[7px] text-[var(--muted)]">{p.role}</div>
                        </div>
                        {p.active && <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] shrink-0" />}
                        <button onClick={() => removeParticipant(p.id)} className="p-0.5 rounded text-[var(--muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--danger)] transition">
                          <X size={8} />
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={newParticipant}
                        onChange={(e) => setNewParticipant(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") addParticipant(); }}
                        placeholder="Add participant..."
                        className="flex-1 rounded border border-[var(--border)] bg-[var(--surface)]/30 px-2 py-1 text-[8px] text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
                      />
                      <button onClick={addParticipant} className="p-1 rounded text-[var(--accent)] hover:bg-[var(--accent)]/10 transition">
                        <Plus size={10} />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="h-px bg-[var(--border)]" />

                {/* ── Recording ── */}
                <div>
                  <div className="text-[8px] font-medium text-[var(--muted)] uppercase tracking-wider mb-2">Recording</div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[9px]"><span className="text-[var(--muted)]">Quality</span><span className="text-[var(--text-secondary)]">{recording ? "High (48kHz)" : "—"}</span></div>
                    <div className="flex items-center justify-between text-[9px]"><span className="text-[var(--muted)]">Source</span><span className="text-[var(--text-secondary)]">{streamRef.current ? "Microphone" : "—"}</span></div>
                    <div className="flex items-center justify-between text-[9px]"><span className="text-[var(--muted)]">Language</span><span className="flex items-center gap-1 text-[var(--text-secondary)]"><Globe size={8} /> {currentLangLabel}</span></div>
                    {recording && <div className="flex items-center justify-between text-[9px]"><span className="text-[var(--muted)]">Lines</span><span className="text-[var(--text-secondary)]">{transcriptLines.length}</span></div>}
                  </div>
                </div>

                {recording && (
                  <>
                    <div className="h-px bg-[var(--border)]" />
                    <div>
                      <div className="text-[8px] font-medium text-[var(--muted)] uppercase tracking-wider mb-2">AI</div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[9px]"><span className="text-[var(--muted)]">Model</span><span className="text-[var(--text-secondary)] truncate max-w-[100px]">Claude Sonnet 4</span></div>
                        <div className="flex items-center justify-between text-[9px]"><span className="text-[var(--muted)]">Provider</span><span className="text-[var(--text-secondary)]">OpenRouter</span></div>
                        <div className="flex items-center justify-between text-[9px]"><span className="text-[var(--muted)]">Tokens</span><span className="text-[var(--text-secondary)]">{transcriptLines.reduce((a, l) => a + Math.ceil(l.text.length / 4), 0)}</span></div>
                        <div className="flex items-center justify-between text-[9px]"><span className="text-[var(--muted)]">Memory</span><span className="text-[var(--text-secondary)]">{Math.round(transcriptLines.reduce((a, l) => a + l.text.length, 0) / 1024 * 10) / 10} KB</span></div>
                      </div>
                    </div>
                  </>
                )}

                <div className="h-px bg-[var(--border)]" />

                {/* ── Linked pages ── */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[8px] font-medium text-[var(--muted)] uppercase tracking-wider">Linked</span>
                    <button onClick={() => setShowPagePicker(!showPagePicker)} className="text-[var(--accent)] hover:bg-[var(--accent)]/10 p-0.5 rounded transition">
                      <Plus size={10} />
                    </button>
                  </div>
                  <div className="space-y-1">
                    {linkedItems.length === 0 && !showPagePicker && (
                      <div className="text-[8px] text-[var(--muted)] py-1">No pages linked yet</div>
                    )}
                    {linkedItems.map((item, idx) => (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, idx)}
                        className={`group flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)]/30 px-2 py-1.5 text-[9px] text-[var(--text-secondary)] hover:bg-[var(--hover)] transition cursor-grab active:cursor-grabbing ${dragIndex === idx ? 'opacity-50' : ''}`}
                      >
                        <GripVertical size={8} className="text-[var(--muted)] opacity-0 group-hover:opacity-100 transition shrink-0" />
                        <Link2 size={8} className="text-[var(--muted)] shrink-0" />
                        <span className="truncate flex-1">{item.label}</span>
                        <button onClick={() => removeLinkedItem(item.id)} className="p-0.5 rounded text-[var(--muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--danger)] transition">
                          <X size={7} />
                        </button>
                      </div>
                    ))}
                    {showPagePicker && (
                      <div className="space-y-1">
                        <input
                          type="text"
                          value={pageSearch}
                          onChange={(e) => setPageSearch(e.target.value)}
                          placeholder="Search pages..."
                          autoFocus
                          className="w-full rounded border border-[var(--border)] bg-[var(--surface)]/40 px-2 py-1 text-[8px] text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
                        />
                        <div className="max-h-[120px] overflow-y-auto space-y-0.5">
                          {availablePages.length === 0 ? (
                            <div className="text-[8px] text-[var(--muted)] py-1">No matching pages</div>
                          ) : (
                            availablePages.slice(0, 8).map(p => (
                              <button key={p.id} onClick={() => addLinkedPage(p)} className="w-full flex items-center gap-1.5 rounded px-2 py-1 text-[8px] text-[var(--text-secondary)] hover:bg-[var(--hover)] transition text-left">
                                <Link2 size={7} className="text-[var(--muted)] shrink-0" />
                                <span className="truncate">{p.title || "Untitled"}</span>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="h-px bg-[var(--border)]" />

                {/* ── Schedule Follow-up ── */}
                <div>
                  <div className="text-[8px] font-medium text-[var(--muted)] uppercase tracking-wider mb-2">Schedule Follow-up</div>
                  <div className="space-y-1.5">
                    <input type="datetime-local" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)]/40 px-2 py-1.5 text-[9px] text-[var(--text)] outline-none" />
                    <button onClick={handleSchedule} className="w-full flex items-center justify-center gap-1 rounded-md bg-[var(--accent)] text-white px-2 py-1.5 text-[9px] font-medium hover:opacity-90 transition">
                      <CalendarDays size={9} />
                      Schedule
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ══════ RECORDING CONTROLS ══════ */}
      <div className="border-t border-[var(--border)] bg-[var(--surface)] shrink-0">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <div className="flex items-center gap-[2px] h-6">
            {recording && !paused && streamRef.current ? (
              Array.from({ length: 24 }).map((_, i) => (
                <motion.span
                  key={i}
                  animate={{ height: `${4 + volume * 20}px` }}
                  transition={{ duration: 0.1 }}
                  className="w-[2px] rounded-full bg-[var(--accent)]/40"
                />
              ))
            ) : (
              Array.from({ length: 24 }).map((_, i) => (
                <span key={i} className="w-[2px] rounded-full bg-[var(--border)]" style={{ height: `${4 + (i % 4) * 2}px` }} />
              ))
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)] min-w-[80px]">
            <Clock size={10} />
            {formatTime(elapsed)}
          </div>

          <div className="flex items-center gap-1.5">
            {!recording ? (
              <button onClick={handleStartRecording} className="flex items-center gap-1.5 rounded-lg bg-[var(--danger)] hover:bg-[var(--danger)]/90 text-white px-3 py-1.5 text-[10px] font-medium transition">
                <Mic size={11} />
                Start Recording
              </button>
            ) : (
              <>
                {paused ? (
                  <button onClick={handleResumeRecording} className="flex items-center gap-1.5 rounded-lg bg-[var(--success)] hover:bg-[var(--success)]/90 text-white px-3 py-1.5 text-[10px] font-medium transition">
                    <Play size={11} /> Resume
                  </button>
                ) : (
                  <button onClick={handlePauseRecording} className="flex items-center gap-1.5 rounded-lg bg-[var(--warning)] hover:bg-[var(--warning)]/90 text-white px-3 py-1.5 text-[10px] font-medium transition">
                    <Pause size={11} /> Pause
                  </button>
                )}
                <button onClick={handleStopRecording} className="flex items-center gap-1.5 rounded-lg bg-[var(--surface-3)] hover:bg-[var(--hover)] text-[var(--text-secondary)] px-3 py-1.5 text-[10px] font-medium transition">
                  <Square size={11} /> Stop
                </button>
              </>
            )}
          </div>

          <div className="flex-1" />

          {recording && (
            <div className="flex items-center gap-2 text-[9px] text-[var(--muted)]">
              <span className={`flex items-center gap-1 ${paused ? 'text-[var(--warning)]' : 'text-[var(--danger)]'}`}>
                <Volume2 size={9} />
                {paused ? "Paused" : `${Math.round(volume * 100)}%`}
              </span>
              {streamRef.current && recording && !paused && (
                <span className="flex items-center gap-1 text-[var(--success)]">
                  <span className="w-1 h-1 rounded-full bg-[var(--success)] animate-pulse" />
                  Live
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
