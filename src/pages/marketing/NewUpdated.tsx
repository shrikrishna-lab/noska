import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  Mic, 
  Layers, 
  Cpu, 
  ShieldCheck, 
  Terminal, 
  ArrowRight, 
  Check, 
  Zap, 
  Search, 
  Clock, 
  ChevronDown, 
  ExternalLink,
  Code2,
  Copy,
  ThumbsUp,
  GitBranch,
  Calendar,
  BellRing,
  Sliders,
  Volume2,
  Play,
  Share2,
  Tag
} from 'lucide-react';
import SEOHead from '../../components/SEOHead';
import { useLanguage } from '../../contexts/LanguageContext';
import './NewUpdated.css';

interface ChangelogItem {
  id: string;
  version: string;
  releaseName: string;
  date: string;
  badge: string;
  badgeType: 'major' | 'feature' | 'patch';
  summary: string;
  heroImage?: string;
  interactiveType?: 'reasoning' | 'voice' | 'mcp';
  categories: ('ai' | 'voice' | 'canvas' | 'mcp' | 'security' | 'infra')[];
  changes: {
    type: 'new' | 'improved' | 'fixed';
    title: string;
    description: string;
    affectedFiles?: string[];
    codeSnippet?: string;
  }[];
  metricsSummary: { label: string; value: string }[];
  reactionsCount: number;
}

const CHANGELOG_DATA: ChangelogItem[] = [
  {
    id: 'v2-5-2',
    version: 'v2.5.2',
    releaseName: 'Claude 3.7 Hybrid Reasoning & Live Model Catalog',
    date: 'March 13, 2026',
    badge: 'LATEST RELEASE',
    badgeType: 'major',
    interactiveType: 'reasoning',
    summary: 'Introducing Claude 3.7 Sonnet hybrid reasoning with dynamic thinking budget controls, automated OpenRouter & provider catalog discovery, and reactive 17-language internationalization.',
    heroImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    categories: ['ai', 'infra'],
    metricsSummary: [
      { label: 'Reasoning Budget', value: '1K - 64K Tokens' },
      { label: 'Catalog Discovery', value: '<50ms' },
      { label: 'Supported Locales', value: '17 Languages' }
    ],
    reactionsCount: 142,
    changes: [
      {
        type: 'new',
        title: 'Claude 3.7 Sonnet with Reasoning Budget Control',
        description: 'Dial from zero-delay instant responses to deep step-by-step thinking graphs with visible reasoning blocks and token limits.',
        affectedFiles: ['src/services/ModelCatalogService.ts', 'src/components/AIRightPanel.tsx'],
        codeSnippet: `// Dynamic Thinking Budget Configuration
export const REASONING_MODELS = {
  'anthropic/claude-3.7-sonnet:thinking': {
    maxThinkingTokens: 32768,
    supportsStreaming: true,
    supportsArtifacts: true,
  }
};`
      },
      {
        type: 'new',
        title: 'Reactive 17-Language Multilingual System',
        description: 'Engineered a client-side reactive i18n system supporting 17 world languages with instant navbar and footer translation.',
        affectedFiles: ['src/contexts/LanguageContext.tsx', 'src/pages/marketing/components/Footer.tsx']
      },
      {
        type: 'improved',
        title: 'Liquid Glass Footer Geometry & Column Alignment',
        description: 'Broadened marketing footer container to 1380px with balanced 6-column grid spacing and zero header wrapping.',
        affectedFiles: ['src/pages/marketing/components/Footer.css']
      },
      {
        type: 'fixed',
        title: 'Language Selector Sizing & Scroll Reset',
        description: 'Refined compact language pill geometry and restored smooth top-scroll reset on route transitions.',
        affectedFiles: ['src/pages/marketing/MarketingLayout.tsx']
      }
    ]
  },
  {
    id: 'v2-5-0',
    version: 'v2.5.0',
    releaseName: 'Noska Flow: Continuous Voice Dictation & Audio Rewind',
    date: 'February 28, 2026',
    badge: 'FEATURE',
    badgeType: 'feature',
    interactiveType: 'voice',
    summary: 'Fluid voice-to-text dictation engine powered by WebAudio worklet streams, natural voice commands, and intelligent auto-punctuation.',
    heroImage: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=1200&q=80',
    categories: ['voice', 'ai'],
    metricsSummary: [
      { label: 'Stream Latency', value: '<220ms' },
      { label: 'Voice Parsers', value: '45+ Commands' },
      { label: 'Acoustic Accuracy', value: '99.4%' }
    ],
    reactionsCount: 98,
    changes: [
      {
        type: 'new',
        title: 'Low-Latency Streaming Audio Worklet',
        description: 'Streams voice input directly to acoustic transcription models with background noise filtering and zero dropped chunks.',
        affectedFiles: ['src/lib/voice/voice-controller.ts', 'src/components/ui/voice-input.tsx'],
        codeSnippet: `const controller = new VoiceController({
  vadThreshold: 0.85,
  sampleRate: 16000,
  enableAutoPunctuation: true
});`
      },
      {
        type: 'new',
        title: 'Voice-Driven Markdown Formatting',
        description: 'Speak commands like "make heading two", "add bullet", or "create table" to format documentation hands-free.',
        affectedFiles: ['src/lib/voice/rewind-engine.ts']
      },
      {
        type: 'improved',
        title: 'Neural Energy Voice Activity Detection (VAD)',
        description: 'Tuned energy thresholding to reject ambient keyboard clicks and mouse movements.',
        affectedFiles: ['src/lib/voice/voice-controller.ts']
      },
      {
        type: 'fixed',
        title: 'Background Tab Audio Buffer Synchronization',
        description: 'Resolved desync issues when browser tabs are backgrounded using SharedWorker audio ring buffers.',
        affectedFiles: ['src/lib/voice/active-input.ts']
      }
    ]
  },
  {
    id: 'v2-4-8',
    version: 'v2.4.8',
    releaseName: 'Spatial Canvas Engine 2.0 & 120 FPS WebGL Rendering',
    date: 'February 14, 2026',
    badge: 'PERFORMANCE',
    badgeType: 'patch',
    summary: 'Complete architectural rewrite of the 2D infinite spatial canvas with hardware-accelerated WebGL 2.0 and quadtree spatial partitioning.',
    heroImage: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80',
    categories: ['canvas'],
    metricsSummary: [
      { label: 'Frame Rate', value: '120 FPS' },
      { label: 'Viewport Capacity', value: '10,000+ Cards' },
      { label: 'Memory Usage', value: '-42% RAM' }
    ],
    reactionsCount: 115,
    changes: [
      {
        type: 'new',
        title: 'Quadtree Spatial Partitioning Viewport',
        description: 'Only visible canvas nodes are drawn, allowing massive whiteboards with 10,000+ nodes to pan and zoom at 120 FPS.',
        affectedFiles: ['src/features/canvas/CanvasView.tsx'],
        codeSnippet: `const visibleNodes = quadtree.query(camera.viewportBounds);
renderWebGLPass(visibleNodes, camera.transformMatrix);`
      },
      {
        type: 'improved',
        title: 'Bi-Directional Thought Graph Bezier Routing',
        description: 'Interactive connection lines with smart collision avoidance and relationship tags.',
        affectedFiles: ['src/features/canvas/CanvasLinks.tsx']
      },
      {
        type: 'fixed',
        title: 'Precision Touchpad Zoom Scaling Factor',
        description: 'Smoothed logarithmic zoom curves on macOS and Windows 11 precision touchpads.',
        affectedFiles: ['src/features/canvas/CanvasView.tsx']
      }
    ]
  },
  {
    id: 'v2-4-4',
    version: 'v2.4.4',
    releaseName: 'Model Context Protocol (MCP) Server Architecture',
    date: 'January 26, 2026',
    badge: 'DEVELOPER',
    badgeType: 'feature',
    interactiveType: 'mcp',
    summary: 'Standardized Model Context Protocol (MCP) server endpoints allowing Cursor, Claude Desktop, and CLI tools to query and edit Noska notes.',
    heroImage: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=80',
    categories: ['mcp', 'security'],
    metricsSummary: [
      { label: 'Protocol', value: 'MCP 1.0 JSON-RPC' },
      { label: 'IDE Support', value: 'Cursor, Claude, Windsurf' },
      { label: 'Security', value: 'Scoped API Keys' }
    ],
    reactionsCount: 84,
    changes: [
      {
        type: 'new',
        title: 'Native MCP Server Daemon',
        description: 'Exposes tools (search_notes, read_document, append_content) to external AI clients over SSE and stdio transport.',
        affectedFiles: ['src/platform/mcp/server.ts', 'src/pages/marketing/McpDocs.tsx'],
        codeSnippet: `{
  "mcpServers": {
    "noska": {
      "command": "noska-mcp",
      "args": ["--vault", "primary"],
      "env": { "NOSKA_API_KEY": "nsk_live_..." }
    }
  }
}`
      },
      {
        type: 'improved',
        title: 'Scoped Token Least-Privilege Permissions',
        description: 'Create restricted API keys limited to specific workspaces or read-only access.',
        affectedFiles: ['src/pages/marketing/ApiKeys.tsx']
      },
      {
        type: 'fixed',
        title: 'Persistent SSE Heartbeat Auto-Reconnect',
        description: 'Added exponential backoff heartbeats to maintain persistent streams during long agent workflows.',
        affectedFiles: ['src/platform/mcp/transport.ts']
      }
    ]
  },
  {
    id: 'v2-4-0',
    version: 'v2.4.0',
    releaseName: 'Zero-Knowledge Encrypted Vaults & Local SQLite Sync',
    date: 'January 10, 2026',
    badge: 'SECURITY',
    badgeType: 'patch',
    summary: 'Client-side hardware AES-256-GCM encryption with Argon2id key derivation and sub-15ms offline SQLite synchronization.',
    heroImage: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80',
    categories: ['security', 'infra'],
    metricsSummary: [
      { label: 'Cipher', value: 'AES-256-GCM' },
      { label: 'KDF Hardening', value: 'Argon2id' },
      { label: 'Write Latency', value: '<2ms Local SQLite' }
    ],
    reactionsCount: 167,
    changes: [
      {
        type: 'new',
        title: 'Zero-Knowledge WebCrypto Vaults',
        description: 'All notes and canvas diagrams are encrypted client-side before sync. Master keys are never transmitted.',
        affectedFiles: ['src/features/encryption/Encryption.tsx', 'src/lib/crypto/vault.ts']
      },
      {
        type: 'new',
        title: 'Local-First SQLite Persistence',
        description: 'Sub-2ms local writes to on-device SQLite storage with automatic background CRDT delta streaming.',
        affectedFiles: ['src/lib/sync/sqlite-engine.ts']
      },
      {
        type: 'improved',
        title: '64MB Memory Hardened Key Derivation',
        description: 'Upgraded passphrase derivation to high-security Argon2id parameters in a dedicated WebWorker.',
        affectedFiles: ['src/lib/crypto/kdf.ts']
      },
      {
        type: 'fixed',
        title: 'Multi-Device Timestamp Conflict Resolution',
        description: 'Integrated Lamport logical clocks to resolve multi-device sync collisions.',
        affectedFiles: ['src/lib/sync/crdt.ts']
      }
    ]
  }
];

const FILTER_TAGS = [
  { id: 'all', label: 'All' },
  { id: 'ai', label: 'AI & Models' },
  { id: 'voice', label: 'Voice Flow' },
  { id: 'canvas', label: 'Canvas' },
  { id: 'mcp', label: 'MCP & Dev' },
  { id: 'security', label: 'Security' },
];

export default function NewUpdated() {
  const { t } = useLanguage();
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedSnippets, setExpandedSnippets] = useState<Record<string, boolean>>({});
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [likedReleases, setLikedReleases] = useState<Record<string, boolean>>({});
  const [subscribedEmail, setSubscribedEmail] = useState('');
  const [subscribedSuccess, setSubscribedSuccess] = useState(false);

  // Minimalist Simulator States
  const [thinkingBudget, setThinkingBudget] = useState<number>(16384);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [mcpProtocolTab, setMcpProtocolTab] = useState<'claude' | 'cursor'>('claude');

  const filteredChangelogs = useMemo(() => {
    return CHANGELOG_DATA.filter((item) => {
      const matchesCategory = selectedTag === 'all' || item.categories.includes(selectedTag as any);
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = searchQuery === '' ||
        item.version.toLowerCase().includes(searchLower) ||
        item.releaseName.toLowerCase().includes(searchLower) ||
        item.summary.toLowerCase().includes(searchLower) ||
        item.changes.some(c => 
          c.title.toLowerCase().includes(searchLower) || 
          c.description.toLowerCase().includes(searchLower)
        );

      return matchesCategory && matchesSearch;
    });
  }, [selectedTag, searchQuery]);

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleToggleLike = (id: string) => {
    setLikedReleases(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscribedEmail || !subscribedEmail.includes('@')) return;
    setSubscribedSuccess(true);
    setTimeout(() => {
      setSubscribedEmail('');
      setSubscribedSuccess(false);
    }, 4000);
  };

  return (
    <div className="new-updated-page">
      <SEOHead 
        path="/new-updated" 
        title="What's New in Noska | Product Updates & Changelog"
        description="Explore the latest features, releases, AI models (Claude 3.7 Sonnet, GPT-4.5), spatial canvas improvements, and MCP integrations in Noska."
      />

      {/* Header Container */}
      <header className="nu-minimal-header">
        <div className="nu-header-inner">
          <div className="nu-header-badge">
            <span className="nu-live-dot" />
            <span>Noska Release Stream</span>
          </div>
          <h1 className="nu-page-title">What's New</h1>
          <p className="nu-page-subtitle">
            A continuous log of updates, architectural improvements, and new capabilities in Noska.
          </p>

          {/* Minimalist Filter Navigation */}
          <div className="nu-minimal-nav">
            <div className="nu-filter-pills">
              {FILTER_TAGS.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => setSelectedTag(tag.id)}
                  className={`nu-pill-btn ${selectedTag === tag.id ? 'active' : ''}`}
                >
                  {tag.label}
                </button>
              ))}
            </div>

            <div className="nu-minimal-search">
              <Search size={14} className="nu-search-ico" />
              <input
                type="text"
                placeholder="Search updates…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="nu-search-inp"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="nu-search-clr">
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Stream Feed */}
      <main className="nu-stream-main">
        <div className="nu-stream-container">
          {filteredChangelogs.length === 0 ? (
            <div className="nu-clean-empty">
              <p>No updates found matching your search.</p>
              <button 
                onClick={() => { setSelectedTag('all'); setSearchQuery(''); }}
                className="nu-clean-reset-btn"
              >
                Clear filter
              </button>
            </div>
          ) : (
            <div className="nu-timeline-flow">
              {filteredChangelogs.map((item) => {
                const isLiked = likedReleases[item.id];

                return (
                  <article key={item.id} className="nu-stream-article">
                    {/* Left Timeline Rail (Date & Version) */}
                    <div className="nu-rail-col">
                      <div className="nu-rail-sticky">
                        <span className="nu-rail-date">{item.date}</span>
                        <span className="nu-rail-ver-badge">{item.version}</span>
                      </div>
                    </div>

                    {/* Right Content Body */}
                    <div className="nu-content-col">
                      <div className="nu-post-card">
                        {/* Title Header */}
                        <div className="nu-post-top">
                          <h2 className="nu-post-title">{item.releaseName}</h2>
                          <button 
                            onClick={() => handleToggleLike(item.id)}
                            className={`nu-minimal-like ${isLiked ? 'liked' : ''}`}
                            aria-label="Like this release"
                          >
                            <ThumbsUp size={13} />
                            <span>{item.reactionsCount + (isLiked ? 1 : 0)}</span>
                          </button>
                        </div>

                        <p className="nu-post-lead">{item.summary}</p>

                        {/* Optional Hero Media */}
                        {item.heroImage && (
                          <div className="nu-media-frame">
                            <img src={item.heroImage} alt={item.releaseName} loading="lazy" />
                          </div>
                        )}

                        {/* Minimalist Metrics Strip */}
                        <div className="nu-stats-strip">
                          {item.metricsSummary.map((metric, idx) => (
                            <div key={idx} className="nu-stat-item">
                              <span className="nu-stat-value">{metric.value}</span>
                              <span className="nu-stat-label">{metric.label}</span>
                            </div>
                          ))}
                        </div>

                        {/* Interactive Reasoning Budget Slider Demo (v2.5.2) */}
                        {item.interactiveType === 'reasoning' && (
                          <div className="nu-mini-simulator">
                            <div className="nu-sim-top">
                              <span className="nu-sim-title">
                                <Sliders size={13} className="text-purple-500 inline mr-1.5" />
                                Reasoning Tokens Controller
                              </span>
                              <span className="nu-sim-val">{thinkingBudget.toLocaleString()} tokens</span>
                            </div>
                            <input 
                              type="range" 
                              min="1024" 
                              max="65536" 
                              step="1024"
                              value={thinkingBudget} 
                              onChange={(e) => setThinkingBudget(Number(e.target.value))}
                              className="nu-range-slider"
                            />
                            <div className="nu-sim-note">
                              {thinkingBudget < 8000 
                                ? 'Fast mode: zero extra latency, instant streaming output.' 
                                : 'Deep reasoning: generates formal step-by-step logic and verification graphs.'
                              }
                            </div>
                          </div>
                        )}

                        {/* Interactive Voice Stream Demo (v2.5.0) */}
                        {item.interactiveType === 'voice' && (
                          <div className="nu-mini-simulator">
                            <div className="nu-sim-top">
                              <span className="nu-sim-title">
                                <Volume2 size={13} className="text-emerald-500 inline mr-1.5" />
                                Continuous Audio Stream
                              </span>
                              <button 
                                onClick={() => setIsPlayingVoice(!isPlayingVoice)} 
                                className={`nu-sim-play-btn ${isPlayingVoice ? 'active' : ''}`}
                              >
                                {isPlayingVoice ? 'Pause' : 'Play Demo'}
                              </button>
                            </div>
                            <div className={`nu-audio-bars ${isPlayingVoice ? 'playing' : ''}`}>
                              {[...Array(24)].map((_, i) => (
                                <span key={i} className="nu-bar" style={{ animationDelay: `${(i % 6) * 0.1}s` }} />
                              ))}
                            </div>
                            <p className="nu-audio-text">
                              {isPlayingVoice 
                                ? '"Create a high-level sprint architecture plan with Claude 3.7 and link database records..."'
                                : 'Real-time WebAudio worklet transcription with background noise rejection.'
                              }
                            </p>
                          </div>
                        )}

                        {/* Interactive MCP Config Demo (v2.4.4) */}
                        {item.interactiveType === 'mcp' && (
                          <div className="nu-mini-simulator">
                            <div className="nu-sim-top">
                              <span className="nu-sim-title">
                                <Terminal size={13} className="text-amber-500 inline mr-1.5" />
                                Model Context Protocol Config
                              </span>
                              <div className="nu-mcp-switch">
                                <button 
                                  className={mcpProtocolTab === 'claude' ? 'active' : ''} 
                                  onClick={() => setMcpProtocolTab('claude')}
                                >
                                  Claude
                                </button>
                                <button 
                                  className={mcpProtocolTab === 'cursor' ? 'active' : ''} 
                                  onClick={() => setMcpProtocolTab('cursor')}
                                >
                                  Cursor
                                </button>
                              </div>
                            </div>
                            <pre className="nu-mcp-snippet">
                              <code>
                                {mcpProtocolTab === 'claude' && `// claude_desktop_config.json
{
  "mcpServers": {
    "noska": {
      "command": "npx",
      "args": ["-y", "@noska/mcp-server"],
      "env": { "NOSKA_API_KEY": "nsk_live_..." }
    }
  }
}`}
                                {mcpProtocolTab === 'cursor' && `// .cursor/settings.json
{
  "cursor.mcp.servers": {
    "noska": {
      "type": "stdio",
      "command": "noska-mcp"
    }
  }
}`}
                              </code>
                            </pre>
                          </div>
                        )}

                        {/* Granular Changes List */}
                        <div className="nu-changes-sublist">
                          {item.changes.map((change, changeIdx) => {
                            const snippetKey = `${item.id}-${changeIdx}`;
                            const isSnippetOpen = expandedSnippets[snippetKey];

                            return (
                              <div key={changeIdx} className="nu-change-row">
                                <div className="nu-change-badge-cell">
                                  <span className={`nu-pill-type ${change.type}`}>
                                    {change.type === 'new' && 'New'}
                                    {change.type === 'improved' && 'Improved'}
                                    {change.type === 'fixed' && 'Fix'}
                                  </span>
                                </div>
                                <div className="nu-change-content-cell">
                                  <h3 className="nu-change-heading">{change.title}</h3>
                                  <p className="nu-change-paragraph">{change.description}</p>

                                  {/* Code implementation accordion */}
                                  {change.codeSnippet && (
                                    <div className="nu-code-accordion">
                                      <button 
                                        onClick={() => setExpandedSnippets(prev => ({ ...prev, [snippetKey]: !prev[snippetKey] }))}
                                        className="nu-code-toggle"
                                      >
                                        <Code2 size={12} />
                                        <span>{isSnippetOpen ? 'Hide code' : 'View code'}</span>
                                      </button>
                                      {isSnippetOpen && (
                                        <div className="nu-clean-code-block">
                                          <div className="nu-code-topbar">
                                            <span>Implementation</span>
                                            <button 
                                              onClick={() => handleCopyCode(change.codeSnippet!, snippetKey)}
                                              className="nu-copy-btn"
                                            >
                                              {copiedCode === snippetKey ? 'Copied' : 'Copy'}
                                            </button>
                                          </div>
                                          <pre><code>{change.codeSnippet}</code></pre>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Footer Action */}
                        <div className="nu-card-foot">
                          <Link to="/dashboard" className="nu-open-app-link">
                            <span>Open in Noska</span>
                            <ArrowRight size={12} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Minimalist Newsletter Subscribe Footer */}
      <section className="nu-minimal-subscribe">
        <div className="nu-sub-inner">
          <div className="nu-sub-text">
            <h3>Stay updated on new releases</h3>
            <p>Get notified when new AI models, voice capabilities, or spatial features land.</p>
          </div>
          <form onSubmit={handleSubscribe} className="nu-clean-form">
            <input
              type="email"
              placeholder="Your email address…"
              value={subscribedEmail}
              onChange={(e) => setSubscribedEmail(e.target.value)}
              required
              disabled={subscribedSuccess}
              className="nu-clean-input"
            />
            <button type="submit" className={`nu-clean-btn ${subscribedSuccess ? 'done' : ''}`}>
              {subscribedSuccess ? 'Subscribed!' : 'Subscribe'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
