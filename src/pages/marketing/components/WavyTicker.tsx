import { Sparkles } from 'lucide-react';

const ITEMS = [
  'AI Workspace', 'Collaborative Docs', 'Databases', 'Thought Graph',
  'Infinite Canvas', 'Real-Time Sync', 'Encrypted Pages', 'Second Brain',
];

/**
 * Infinite horizontal marquee of capability chips, each bobbing gently and
 * independently — a native reimplementation of the referenced Framer
 * "WavyTicker" component using a duplicated-track CSS transform loop
 * (Framer canvas-only components can't be imported into a standalone app).
 */
export function WavyTicker() {
  const track = [...ITEMS, ...ITEMS];
  return (
    <div className="mkt-wavy-ticker">
      <div className="mkt-container" style={{ overflow: 'hidden' }}>
        <div className="mkt-wavy-track">
          {track.map((item, i) => (
            <span key={i} className="mkt-wavy-item" style={{ animationDelay: `${(i % ITEMS.length) * 0.18}s` }}>
              <Sparkles size={13} />
              {item}
              <span className="mkt-wavy-dot" />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
