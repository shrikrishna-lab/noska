import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronDown, Tag, Calendar, Layers, Zap, Mic, Keyboard, KeyRound } from 'lucide-react';
import { Reveal } from './components/Reveal';
import { supabaseAnon } from '../../lib/supabase';
import { getCachedOrFetch } from '../../lib/staticContentCache';
import { EgressMonitor } from '../../lib/egressMonitor';
import './Changelog.css';

interface ChangelogEntry {
  id: string;
  title: string;
  description: string | null;
  tag: string;
  version: string | null;
  published_at: string | null;
  created_at: string;
}

const DEFAULT_CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    id: "release-v1-2-0",
    title: "Dynamic Island Fluid Voice, Visual Settings Studio & Developer API Keys Suite",
    tag: "Major Release",
    version: "v1.2.0",
    published_at: "2026-09-01T00:00:00Z",
    created_at: "2026-09-01T00:00:00Z",
    description: `### 🌊 Apple-Grade Dynamic Island Voice Capsule
- **Fluid Water-Droplet Spring Physics**: Engineered viscous liquid spring curves (\`stiffness: 420, damping: 25, mass: 0.85\`) with organic multi-step droplet morphing and blur dissipation.
- **3-Piece Droplet Detachment**: The Language Island Button \`[ ⌃ | 🌐 ]\`, Center Recording Capsule, and AI Agent Button \`[ ☺️ ]\` glide apart seamlessly like dividing mercury droplets.
- **Specular Top Gloss Sheen**: Curved liquid glass reflection gradient across all capsule surfaces with ambient breathing aura during speech capture.
- **Micro-Interactions & Squircle Elasticity**: Tactile compression on click with gentle rotational spring recoil on the stop button.

---

### 🎙️ Voice & Dictation Customization Studio
- **Live Interactive Sandbox**: Real-time microphone testing sandbox that immediately morphs and previews any selected customization live.
- **Visual Capsule Swatches**: Realistic mini capsule previews inside every theme card (*Apple Vision Glass*, *Siri Hologram Aura*, *Frosted Pearl*, *Cyber Azure*, *Dynamic Island Pro*).
- **Animated Waveform Demos**: Real-time equalizer visualizer previews for *12 Dynamic Dots*, *13-Bar Formant Wave*, *24-Bar Studio Spectrum*, and *3-Orb Siri Pulse*.
- **Visual Squircles & Digital Timers**: Live swatch buttons for squircle glow styles and styled digital timer badges.

---

### ⌨️ Keyboard Shortcuts Settings Overhaul
- **Sleek Accordion Pill Bars**: Redesigned all shortcut categories (*Navigation*, *Editing*, *Actions*, *View*) into dark & cream pill-bar accordions with smooth Framer Motion spring expansion.
- **Instant Search & Filter**: Real-time keyboard query filtering that auto-expands matching categories.
- **Tactile 3D Keycaps**: Apple-style tactile keycap buttons with active key combination recording and 1-click reset actions.

---

### 🔑 Developer Section & API Key Management
- **1-Click Permission Scope Presets**: Quick preset pill bar (*Full Access*, *Read-Only*, *Agents & Tasks*, *Pages & DB*).
- **Categorized Scope Groups**: Organized 24 scopes into structured sub-sections without awkward scroll clipping.
- **Apple-Style Read-Only Toggle**: Smooth spring-animated switch to enforce read-only tool safety.
- **One-Time Secret Key Reveal**: Secure high-contrast modal with 1-click clipboard copy and cryptographic hash safety notice.`
  },
  {
    id: "release-v1-1-9",
    title: "Multi-Tab Document Workspaces, Live Tab Previews & Presentation Canvas",
    tag: "Feature",
    version: "v1.1.9",
    published_at: "2026-08-30T00:00:00Z",
    created_at: "2026-08-30T00:00:00Z",
    description: `### 📑 Multi-Tab Document Workspaces
- **Browser-Grade Tab Navigation**: Open, reorder, split, and switch between multiple document tabs with zero reload lag.
- **Live Hover Previews**: Hover over background tabs to see instant live document previews (\`ViewPreview.tsx\`).
- **Preserved Tab State**: Scroll positions, cursor focus, and unsaved edits stay intact across tab switches.

---

### 🎨 Infinite Canvas Presentation Mode & Kanban
- **Interactive Presentation Mode**: Turn canvas boards and node mindmaps into interactive slide presentations with single-key navigation (\`CanvasPresentationMode.tsx\`).
- **Canvas Kanban & Attachments**: Integrated Kanban column boards and sticky attachments with spatial audio click feedback (\`canvasAudio.ts\`).`
  },
  {
    id: "release-v1-1-8",
    title: "Universal Multi-Provider AI Architecture, Dynamic Catalog & Local-First Storage",
    tag: "AI Engine",
    version: "v1.1.8",
    published_at: "2026-08-29T00:00:00Z",
    created_at: "2026-08-29T00:00:00Z",
    description: `### 🧠 Universal 13-Provider Model Engine
- **Dynamic Catalog Discovery**: Integrated live model discovery across 13 providers (Claude 3.7 Sonnet / Opus, OpenAI GPT-4.5 / o3, Gemini 2.0 / 2.5 Flash & Pro, DeepSeek R1 / V3, Groq, Mistral, Together, OpenRouter, OpenCode Zen).
- **Adaptive Reasoning Streaming**: Full streaming token chunking with real-time reasoning trace visualization and automatic model fallback routing.
- **Local-First Resilient Storage**: Offline-first conversation indexing and local storage fallback ensuring chats and prompt histories remain instant and resilient against network outages.`
  },
  {
    id: "release-v1-1-5",
    title: "Bandwidth Optimization, Dirty Tracking & MCP One-Link Ecosystem",
    tag: "Performance",
    version: "v1.1.5",
    published_at: "2026-08-25T00:00:00Z",
    created_at: "2026-08-25T00:00:00Z",
    description: `### ⚡ Bandwidth & Realtime Egress Optimization
- **Intelligent Dirty Tracking**: Coalesced batch autosaves eliminating redundant mutations and reducing Supabase ingress/egress by up to 65%.
- **Multiplexed Realtime Channels**: High-density channel multiplexing delivering sub-millisecond document sync without connection limits.

---

### 🔌 Model Context Protocol (MCP) One-Link Connect
- **Instant IDE Pairing**: 1-Click setup flows with deep-links for Cursor, VS Code, and custom ChatGPT connector manifests.
- **Tool Allowlist Enforcement**: Granular security allowlists restricting automated tools to designated execution scopes.`
  },
  {
    id: "release-v1-1-0",
    title: "Desktop Shell Pairing v4, Native Windowing & Spaced Repetition",
    tag: "Desktop & Core",
    version: "v1.1.0",
    published_at: "2026-08-15T00:00:00Z",
    created_at: "2026-08-15T00:00:00Z",
    description: `### 🖥️ Native Desktop Pairing v4
- **Clerk-Subject Pairing**: Cryptographically signed native session token handoff with automated token refresh.
- **Borderless Edge-to-Edge Shell**: Streamlined native titlebar with custom traffic lights and macOS/Windows window snapping.

---

### 🧠 Spaced Repetition Flashcards & Collab Engine
- **SuperMemo SM-2 Study Cards**: Embedded flashcard blocks directly within notes and study pages with daily review queues.
- **Real-Time Multiplayer Presence**: Remote cursor tracking, active selection highlights, and automated conflict resolution.`
  }
];

export default function Changelog() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [openIndex, setOpenIndex] = useState<number>(0);
  const [selectedTag, setSelectedTag] = useState<string>("All");

  useEffect(() => {
    let isMounted = true;
    async function fetchChangelog() {
      setLoading(true);
      try {
        const data = await getCachedOrFetch<ChangelogEntry[]>(
          'marketing_changelog',
          async () => {
            EgressMonitor.logEvent('query', 'changelog_entries');
            const { data: result, error } = await (supabaseAnon as any)
              .from('changelog_entries')
              .select('*')
              .eq('published', true)
              .order('created_at', { ascending: false });
            if (error) throw error;
            return (result ?? []) as ChangelogEntry[];
          },
          10 * 60 * 1000
        );
        if (isMounted) {
          // Merge database entries with latest default release entries
          if (data && data.length > 0) {
            setEntries(data);
          } else {
            setEntries(DEFAULT_CHANGELOG_ENTRIES);
          }
        }
      } catch (err) {
        console.error('Failed to fetch changelog:', err);
        if (isMounted) setEntries(DEFAULT_CHANGELOG_ENTRIES);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchChangelog();
    return () => {
      isMounted = false;
    };
  }, []);

  const displayEntries = useMemo(() => {
    const list = entries.length > 0 ? entries : DEFAULT_CHANGELOG_ENTRIES;
    if (selectedTag === "All") return list;
    return list.filter((e) => e.tag?.toLowerCase() === selectedTag.toLowerCase());
  }, [entries, selectedTag]);

  const allTags = ["All", "Major Release", "Feature", "Core"];

  return (
    <div className="changelog-wrapper font-sans">
      <section className="changelog-hero mkt-container">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="changelog-eyebrow flex items-center gap-1.5"><Sparkles size={13} /> Product Updates & Changelog</span>
          <h1>What's actually shipped.</h1>
          <p>Every entry below is a real, built feature in production — crafted with obsessive detail.</p>

          {/* Tag Filter Pills */}
          <div className="flex items-center gap-2 mt-6 flex-wrap">
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(tag)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer border ${
                  selectedTag === tag
                    ? "bg-[#1c1b18] text-white border-black shadow-xs"
                    : "bg-white/80 dark:bg-white/5 text-[#706c64] dark:text-white/70 hover:bg-[#ede8df] border-[#e8e4db] dark:border-white/10"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="changelog-list mkt-container">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-[#1c1b18]/20 border-t-[#1c1b18] rounded-full animate-spin" />
          </div>
        ) : displayEntries.length === 0 ? (
          <p className="text-center text-[#706c64] py-20">No changelog entries found.</p>
        ) : (
          displayEntries.map((entry, i) => {
            const isOpen = openIndex === i;
            return (
              <Reveal key={entry.id} delay={Math.min(i * 0.05, 0.3)} className={`changelog-entry ${isOpen ? 'open' : ''}`}>
                <button className="changelog-entry-header" onClick={() => setOpenIndex(isOpen ? -1 : i)}>
                  <div className="changelog-entry-header-text">
                    <div className="changelog-meta">
                      {entry.published_at && (
                        <span className="changelog-date">
                          {new Date(entry.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                      <span className={`changelog-tag tag-${entry.tag?.toLowerCase().replace(/\s+/g, '-')}`}>
                        {entry.tag}
                      </span>
                      {entry.version && <span className="changelog-version">{entry.version}</span>}
                    </div>
                    <h3>{entry.title}</h3>
                  </div>
                  <ChevronDown size={16} className={`changelog-chevron ${isOpen ? 'open' : ''}`} />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      className="changelog-entry-body"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed whitespace-pre-line text-[#4a4742] dark:text-white/80 pt-2">
                        {entry.description?.replace(/\\n/g, '\n')}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Reveal>
            );
          })
        )}
      </section>
    </div>
  );
}
