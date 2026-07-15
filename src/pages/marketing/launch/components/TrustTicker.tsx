import { Sparkles } from 'lucide-react';

const ITEMS = [
  'AI Workspace', 'Collaborative Docs', 'Databases', 'Projects',
  'Knowledge Base', 'MCP Ready', 'AI Assistant', 'Real-time Collaboration',
  'Automation', 'Second Brain',
];

/**
 * Infinite horizontal marquee of capability chips — a native CSS-transform
 * loop (duplicated content track) standing in for the Framer "WavyTicker"
 * component. Each item bobs gently and independently for a lively, "wavy"
 * feel without ever colliding into a full bounce.
 */
export function TrustTicker() {
  const track = [...ITEMS, ...ITEMS];
  return (
    <div className="nl-trust-strip">
      <div className="nl-container" style={{ overflow: 'hidden' }}>
        <div className="nl-ticker-track">
          {track.map((item, i) => (
            <span key={i} className="nl-ticker-item wavy" style={{ animationDelay: `${(i % ITEMS.length) * 0.18}s` }}>
              <Sparkles size={13} />
              {item}
              <span className="nl-ticker-dot" style={{ marginLeft: 24 }} />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
