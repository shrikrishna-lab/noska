import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Play,
  Pause,
  Square,
  BookOpen,
  Bookmark,
  BookmarkPlus,
  Highlighter,
  Sliders,
  ListCollapse,
  Copy,
  Trash2
} from "lucide-react";
import { plainText } from "../../utils/helpers";

const THEMES = {
  sepia: {
    name: "Sepia",
    bg: "bg-[#f5f0e6]",
    text: "text-[#4a3728]",
    border: "border-[#e6dfd0]",
    hover: "hover:bg-[#e8dec9]",
    accent: "bg-[#8c6a5c]",
    activeBg: "bg-[#e6dfd0]",
    styles: {
      "--reading-bg": "#f5f0e6",
      "--reading-text": "#4a3728",
      "--reading-border": "#e6dfd0",
      "--reading-hover": "#e8dec9",
      "--reading-accent": "#8c6a5c"
    }
  },
  forest: {
    name: "Forest",
    bg: "bg-[#141e1b]",
    text: "text-[#e1dcd3]",
    border: "border-[#23342f]",
    hover: "hover:bg-[#293d37]",
    accent: "bg-[#5e8b7e]",
    activeBg: "bg-[#293d37]",
    styles: {
      "--reading-bg": "#141e1b",
      "--reading-text": "#e1dcd3",
      "--reading-border": "#23342f",
      "--reading-hover": "#293d37",
      "--reading-accent": "#5e8b7e"
    }
  },
  night: {
    name: "Night",
    bg: "bg-[#090b0d]",
    text: "text-[#f3f4f6]",
    border: "border-[#1f2937]",
    hover: "hover:bg-[#1e293b]",
    accent: "bg-[#3b82f6]",
    activeBg: "bg-[#1e293b]",
    styles: {
      "--reading-bg": "#090b0d",
      "--reading-text": "#f3f4f6",
      "--reading-border": "#1f2937",
      "--reading-hover": "#1e293b",
      "--reading-accent": "#3b82f6"
    }
  },
  day: {
    name: "Day",
    bg: "bg-[#ffffff]",
    text: "text-[#171717]",
    border: "border-[#e5e5e5]",
    hover: "hover:bg-[#f5f5f5]",
    accent: "bg-[#2563eb]",
    activeBg: "bg-[#f5f5f5]",
    styles: {
      "--reading-bg": "#ffffff",
      "--reading-text": "#171717",
      "--reading-border": "#e5e5e5",
      "--reading-hover": "#f5f5f5",
      "--reading-accent": "#2563eb"
    }
  }
};

export default function ReadingMode({ page, onClose, onPagePatch }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const [theme, setTheme] = useState("sepia");
  const [fontSize, setFontSize] = useState(18); // px font size
  const [lineHeight, setLineHeight] = useState(1.6);
  const [fontFamily, setFontFamily] = useState("serif"); // "serif" or "sans"
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  // Text-To-Speech states
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [ttsSpeed, setTtsSpeed] = useState(1.0);
  const [voices, setVoices] = useState([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState("");

  // Highlights state
  const [selection, setSelection] = useState(null);
  const [selectionBox, setSelectionBox] = useState({ top: 0, left: 0 });

  const contentRef = useRef(null);
  const containerRef = useRef(null);

  const highlights = page.highlights || [];
  const isBookmarked = page.bookmarked || false;

  const fullText = plainText(page);

  // Load Speech Voices
  useEffect(() => {
    const synth = window.speechSynthesis;
    const loadVoices = () => {
      const allVoices = synth.getVoices();
      setVoices(allVoices);
      // Try to select a default English voice
      const defaultVoice = allVoices.find((v) => v.lang.startsWith("en")) || allVoices[0];
      if (defaultVoice) {
        setSelectedVoiceName(defaultVoice.name);
      }
    };
    loadVoices();
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = loadVoices;
    }
    return () => {
      synth.cancel();
    };
  }, []);

  // Update Scroll Progress Bar
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const el = containerRef.current;
      const total = el.scrollHeight - el.clientHeight;
      if (total > 0) {
        setScrollProgress((el.scrollTop / total) * 100);
      }
    };
    const el = containerRef.current;
    if (el) el.addEventListener("scroll", handleScroll);
    return () => {
      if (el) el.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Handle Text Selection for Highlights
  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const text = sel.toString().trim();
    if (text.length > 0 && contentRef.current?.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      // Position the highlight button slightly above the selection
      setSelection(text);
      setSelectionBox({
        top: rect.top + window.scrollY - 40,
        left: rect.left + window.scrollX + rect.width / 2
      });
    } else {
      setSelection(null);
    }
  };

  const clearSelection = () => {
    window.getSelection()?.removeAllRanges();
    setSelection(null);
  };

  const addHighlight = () => {
    if (!selection) return;
    const cleanSelection = selection.replace(/\r?\n|\r/g, " ");
    if (!highlights.includes(cleanSelection)) {
      onPagePatch(page.id, {
        highlights: [...highlights, cleanSelection]
      });
    }
    clearSelection();
  };

  const removeHighlight = (textToRemove) => {
    onPagePatch(page.id, {
      highlights: highlights.filter((h) => h !== textToRemove)
    });
  };

  // TTS Actions
  const handlePlayTTS = () => {
    const synth = window.speechSynthesis;
    if (isPaused) {
      synth.resume();
      setIsPaused(false);
      setIsSpeaking(true);
      return;
    }

    synth.cancel(); // Stop any currently speaking audio
    if (!fullText) return;

    const utterance = new SpeechSynthesisUtterance(fullText);
    const chosenVoice = voices.find((v) => v.name === selectedVoiceName);
    if (chosenVoice) utterance.voice = chosenVoice;
    utterance.rate = ttsSpeed;

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    synth.speak(utterance);
    setIsSpeaking(true);
    setIsPaused(false);
  };

  const handlePauseTTS = () => {
    window.speechSynthesis.pause();
    setIsPaused(true);
    setIsSpeaking(false);
  };

  const handleStopTTS = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  };

  const toggleBookmark = () => {
    onPagePatch(page.id, {
      bookmarked: !isBookmarked
    });
  };

  // Render different block types for styling
  const renderBlock = (block) => {
    switch (block.type) {
      case "h1":
        return <h1 key={block.id} className="mt-8 mb-4 text-3xl font-bold font-serif leading-tight text-[var(--reading-text)]">{block.text || "Untitled Section"}</h1>;
      case "h2":
        return <h2 key={block.id} className="mt-7 mb-3 text-2xl font-semibold font-serif leading-snug text-[var(--reading-text)] border-b border-[var(--reading-border)] pb-1">{block.text}</h2>;
      case "h3":
        return <h3 key={block.id} className="mt-6 mb-2 text-xl font-medium font-serif leading-snug text-[var(--reading-text)]">{block.text}</h3>;
      case "quote":
        return (
          <blockquote key={block.id} className="my-4 border-l-4 border-[var(--reading-accent)] pl-4 italic text-[var(--reading-text)] opacity-90">
            {block.text}
          </blockquote>
        );
      case "code":
        return (
          <pre key={block.id} className="my-4 overflow-x-auto rounded bg-black/10 dark:bg-white/5 p-4 font-mono text-sm border border-[var(--reading-border)] text-[var(--reading-text)]">
            <code>{block.text}</code>
          </pre>
        );
      case "callout":
        return (
          <div key={block.id} className="my-4 flex gap-3 rounded-lg border border-[var(--reading-border)] bg-black/5 dark:bg-white/5 p-4 text-[var(--reading-text)]">
            {block.meta?.icon && <span className="text-lg select-none">{block.meta.icon}</span>}
            <div className="flex-1">{block.text}</div>
          </div>
        );
      case "bullet":
        return (
          <li key={block.id} className="ml-5 list-disc my-1 text-[var(--reading-text)] leading-relaxed">
            {block.text}
          </li>
        );
      case "numbered":
        return (
          <li key={block.id} className="ml-5 list-decimal my-1 text-[var(--reading-text)] leading-relaxed">
            {block.text}
          </li>
        );
      case "todo":
        return (
          <div key={block.id} className="flex items-center gap-2.5 my-1.5 text-[var(--reading-text)]">
            <input
              type="checkbox"
              checked={block.checked || false}
              disabled
              className="h-4.5 w-4.5 rounded border-[var(--reading-border)] text-[var(--reading-accent)] focus:ring-0 focus:ring-offset-0 pointer-events-none"
            />
            <span className={block.checked ? "line-through opacity-50" : ""}>{block.text}</span>
          </div>
        );
      case "divider":
        return <hr key={block.id} className="my-6 border-t border-[var(--reading-border)]" />;
      case "text":
      default:
        return (
          <p key={block.id} className="my-3.5 leading-relaxed text-[var(--reading-text)] text-justify">
            {block.text || "\u00A0"}
          </p>
        );
    }
  };

  const selectedTheme = THEMES[theme] || THEMES.sepia;

  return (
    <div
      style={selectedTheme.styles}
      className={`fixed inset-0 z-50 flex flex-col ${selectedTheme.bg} ${selectedTheme.text} transition-colors duration-200 select-text`}
    >
      {/* Scroll Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 z-50 bg-black/10 dark:bg-white/10">
        <div
          className="h-full bg-[var(--reading-accent)] transition-all duration-75"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Main Top Header Controls */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--reading-border)] px-4 bg-black/[0.02] dark:bg-white/[0.02] select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition"
            title="Exit Reading Mode"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--reading-text)] opacity-70">
            <BookOpen size={14} />
            <span>Reading Mode</span>
          </div>
        </div>

        {/* Floating Settings Bar & Bookmarks & Sidebar Toggles */}
        <div className="flex items-center gap-1.5">
          {/* TTS Controls Directly Available */}
          <div className="flex items-center border-r border-[var(--reading-border)] pr-2 mr-2 gap-1">
            <button
              onClick={isSpeaking ? handlePauseTTS : handlePlayTTS}
              className="grid h-8 w-8 place-items-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[var(--reading-text)] transition"
              title={isSpeaking ? "Pause Audio" : "Play Text-To-Speech"}
            >
              {isSpeaking ? <Pause size={15} /> : <Play size={15} />}
            </button>
            {(isSpeaking || isPaused) && (
              <button
                onClick={handleStopTTS}
                className="grid h-8 w-8 place-items-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[var(--reading-text)] transition"
                title="Stop Audio"
              >
                <Square size={14} />
              </button>
            )}
          </div>

          <button
            onClick={toggleBookmark}
            className="grid h-8 w-8 place-items-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition text-[var(--reading-text)]"
            title={isBookmarked ? "Remove Bookmark" : "Add Bookmark"}
          >
            {isBookmarked ? (
              <Bookmark className="fill-[var(--reading-accent)] text-[var(--reading-accent)]" size={17} />
            ) : (
              <BookmarkPlus size={17} />
            )}
          </button>

          <button
            onClick={() => {
              setShowSettings(!showSettings);
              setShowSidebar(false);
            }}
            className={`grid h-8 w-8 place-items-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition ${
              showSettings ? "bg-black/5 dark:bg-white/5" : ""
            }`}
            title="Formatting & Voice Settings"
          >
            <Sliders size={16} />
          </button>

          <button
            onClick={() => {
              setShowSidebar(!showSidebar);
              setShowSettings(false);
            }}
            className={`grid h-8 w-8 place-items-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition ${
              showSidebar ? "bg-black/5 dark:bg-white/5" : ""
            }`}
            title="View Highlights & Bookmarks"
          >
            <ListCollapse size={16} />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left/Right settings sidebar overlay */}
        {showSettings && (
          <div className="absolute right-4 top-2 z-40 w-80 rounded-xl border border-[var(--reading-border)] bg-[var(--reading-bg)] shadow-2xl p-4 flex flex-col gap-4 select-none animate-in fade-in slide-in-from-top-2 duration-150">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--reading-text)] opacity-60 mb-2">Theme</h4>
              <div className="grid grid-cols-4 gap-1.5">
                {Object.entries(THEMES).map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => setTheme(key)}
                    className={`flex flex-col items-center py-2 rounded-lg text-xs font-medium border border-transparent transition ${
                      theme === key ? "border-[var(--reading-accent)] bg-black/5 dark:bg-white/5" : "hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full ${value.bg} border border-[var(--reading-border)] mb-1`} />
                    <span className="opacity-80">{value.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--reading-text)] opacity-60 mb-2">Font Typography</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => setFontFamily("serif")}
                  className={`flex-1 py-1.5 text-center text-xs font-serif font-semibold rounded-lg border border-[var(--reading-border)] transition ${
                    fontFamily === "serif" ? "bg-[var(--reading-accent)] text-[var(--reading-bg)]" : "hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  Serif Font
                </button>
                <button
                  onClick={() => setFontFamily("sans")}
                  className={`flex-1 py-1.5 text-center text-xs font-sans font-semibold rounded-lg border border-[var(--reading-border)] transition ${
                    fontFamily === "sans" ? "bg-[var(--reading-accent)] text-[var(--reading-bg)]" : "hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  Sans Font
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--reading-text)] opacity-60 mb-2">Typography Details</h4>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span>Size: {fontSize}px</span>
                  <div className="flex border border-[var(--reading-border)] rounded overflow-hidden">
                    <button
                      onClick={() => setFontSize(Math.max(14, fontSize - 2))}
                      className="px-2.5 py-1 hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      A-
                    </button>
                    <button
                      onClick={() => setFontSize(Math.min(28, fontSize + 2))}
                      className="px-2.5 py-1 border-l border-[var(--reading-border)] hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      A+
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span>Line spacing: {lineHeight.toFixed(1)}</span>
                  <div className="flex border border-[var(--reading-border)] rounded overflow-hidden">
                    <button
                      onClick={() => setLineHeight(Math.max(1.2, lineHeight - 0.2))}
                      className="px-2.5 py-1 hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      Narrow
                    </button>
                    <button
                      onClick={() => setLineHeight(Math.min(2.2, lineHeight + 0.2))}
                      className="px-2.5 py-1 border-l border-[var(--reading-border)] hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      Wide
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--reading-text)] opacity-60 mb-2">Voice & Audio Reader</h4>
              <div className="flex flex-col gap-2.5">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-[var(--reading-text)] opacity-70">Voice Select</span>
                  <select
                    className="w-full text-xs p-1.5 rounded border border-[var(--reading-border)] bg-[var(--reading-bg)] text-[var(--reading-text)] outline-none"
                    value={selectedVoiceName}
                    onChange={(e) => setSelectedVoiceName(e.target.value)}
                  >
                    {voices.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] text-[var(--reading-text)] opacity-70">
                    <span>Reading Speed</span>
                    <span>{ttsSpeed.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={ttsSpeed}
                    onChange={(e) => setTtsSpeed(parseFloat(e.target.value))}
                    className="w-full accent-[var(--reading-accent)] bg-black/10 dark:bg-white/10 h-1 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Side Panel: Highlights and Bookmarks */}
        {showSidebar && (
          <div className="absolute right-4 top-2 z-40 w-80 h-[80%] rounded-xl border border-[var(--reading-border)] bg-[var(--reading-bg)] shadow-2xl p-4 flex flex-col overflow-hidden select-none animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between border-b border-[var(--reading-border)] pb-2 mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--reading-text)] opacity-70 flex items-center gap-1.5">
                <Highlighter size={13} />
                <span>Notes & Highlights ({highlights.length})</span>
              </h3>
              <button
                onClick={() => setShowSidebar(false)}
                className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3.5 scrollbar-thin pr-1 select-text">
              {highlights.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <Highlighter size={28} className="opacity-30 mb-2" />
                  <p className="text-xs text-[var(--reading-text)] opacity-50">Select any text inside the reader and click highlight to save annotations here.</p>
                </div>
              ) : (
                highlights.map((h, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg border border-[var(--reading-border)] bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] flex flex-col gap-2 transition group relative"
                  >
                    <p className="text-xs italic leading-relaxed text-[var(--reading-text)]">"{h}"</p>
                    <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(h);
                        }}
                        className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded text-[var(--reading-text)] opacity-70 hover:opacity-100 transition"
                        title="Copy Highlight"
                      >
                        <Copy size={12} />
                      </button>
                      <button
                        onClick={() => removeHighlight(h)}
                        className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded text-red-500 hover:text-red-600 transition"
                        title="Delete Highlight"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Main Text Content Area */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden flex justify-center py-10 px-6 scrollbar-thin"
        >
          {/* Highlight tooltip menu button */}
          {selection && (
            <div
              style={{
                top: `${selectionBox.top}px`,
                left: `${selectionBox.left}px`,
                transform: "translateX(-50%)"
              }}
              className="absolute z-[999] flex overflow-hidden rounded-lg bg-[var(--reading-text)] text-[var(--reading-bg)] shadow-xl animate-in zoom-in-95 duration-100 select-none border border-[var(--reading-border)]"
            >
              <button
                onClick={addHighlight}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold hover:bg-black/10 dark:hover:bg-white/10 transition border-r border-[var(--reading-border)]/20"
              >
                <Highlighter size={13} />
                Highlight
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selection);
                  clearSelection();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold hover:bg-black/10 dark:hover:bg-white/10 transition"
              >
                <Copy size={13} />
                Copy
              </button>
            </div>
          )}

          <article
            ref={contentRef}
            onMouseUp={handleMouseUp}
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: lineHeight,
              maxWidth: fontFamily === "serif" ? "42rem" : "44rem"
            }}
            className={`w-full ${
              fontFamily === "serif" ? "font-serif" : "font-sans"
            } transition-[font-size,line-height] selection:bg-[var(--reading-accent)]/30`}
          >
            {/* Cover and Header */}
            {page.cover && (
              <div className="w-full h-44 rounded-xl overflow-hidden mb-6 select-none border border-[var(--reading-border)]">
                <img
                  src={page.cover}
                  alt="Page Cover"
                  className="w-full h-full object-cover opacity-80"
                />
              </div>
            )}

            <header className="mb-8 border-b border-[var(--reading-border)] pb-5 select-none">
              <div className="flex items-center gap-2.5 text-4xl mb-3">
                <span>{page.icon || "📄"}</span>
                <h1 className="font-extrabold tracking-tight text-[var(--reading-text)]">
                  {page.title || "Untitled Note"}
                </h1>
              </div>
              <div className="flex items-center gap-3 text-xs text-[var(--reading-text)] opacity-60">
                {isBookmarked && (
                  <span className="flex items-center gap-1 text-[var(--reading-accent)] font-semibold">
                    <Bookmark size={12} className="fill-[var(--reading-accent)]" />
                    Bookmarked
                  </span>
                )}
                <span>{fullText.trim().split(/\s+/).filter(Boolean).length} words</span>
                <span>·</span>
                <span>{Math.max(1, Math.ceil(fullText.trim().split(/\s+/).filter(Boolean).length / 220))} min read</span>
              </div>
            </header>

            {/* Document Blocks Content */}
            <div className="space-y-1">
              {page.blocks && page.blocks.length > 0 ? (
                page.blocks.map((block) => renderBlock(block))
              ) : (
                <p className="italic opacity-50">Empty document</p>
              )}
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
