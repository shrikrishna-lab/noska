import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { FileText, LayoutGrid, GitBranch, Sparkles } from 'lucide-react';

const STEPS = [
  {
    id: 'docs',
    icon: FileText,
    label: 'Start with a page',
    title: 'Write like it\'s just text.',
    desc: 'Every page starts as a blank document. Type "/" anywhere to drop in one of 33 block types — tables, code, embeds, callouts.',
  },
  {
    id: 'canvas',
    icon: LayoutGrid,
    label: 'Drop into Canvas',
    title: 'Spread it out spatially.',
    desc: 'The same blocks become draggable cards on an infinite, zoomable canvas — for when linear docs stop being the right shape.',
  },
  {
    id: 'graph',
    icon: GitBranch,
    label: 'Zoom out to Graph',
    title: 'See how it all connects.',
    desc: 'The Thought Graph renders every page as a node in a force-directed network, built from real links — not a static sitemap.',
  },
  {
    id: 'ai',
    icon: Sparkles,
    label: 'Ask Noska AI',
    title: 'Query your own workspace.',
    desc: 'Bring your own key from any of 8 providers and ask questions across everything you\'ve written — summarized, not just searched.',
  },
];

/**
 * A scroll-scrubbed product walkthrough: a sticky visual panel on the right
 * whose active state advances as the user scrolls past four real feature
 * steps on the left, each with its own progress indicator. This is the
 * "scrollytelling" pattern (Stripe/Linear/Vercel use it on their product
 * pages) recreated with framer-motion's scroll-linked transforms — no video
 * asset required, and every state shown is a real product state, not a
 * fabricated demo clip.
 */
export function ScrollStory() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  return (
    <section className="scroll-story" ref={containerRef}>
      <div className="mkt-container scroll-story-grid">
        <div className="scroll-story-steps">
          {STEPS.map((step, i) => {
            const start = i / STEPS.length;
            const end = (i + 1) / STEPS.length;
            return <ScrollStoryStep key={step.id} step={step} index={i} progress={scrollYProgress} start={start} end={end} />;
          })}
        </div>

        <div className="scroll-story-sticky">
          <div className="scroll-story-panel">
            {STEPS.map((step, i) => (
              <ScrollStoryVisual
                key={step.id}
                step={step}
                index={i}
                progress={scrollYProgress}
                start={i / STEPS.length}
                end={(i + 1) / STEPS.length}
              />
            ))}
            <div className="scroll-story-progress-track">
              <motion.div
                className="scroll-story-progress-fill"
                style={{ scaleY: scrollYProgress }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ScrollStoryStep({ step, progress, start, end }) {
  const opacity = useTransform(progress, [Math.max(0, start - 0.03), start + 0.05, end - 0.05, Math.min(1, end + 0.03)], [0.3, 1, 1, 0.3]);
  const x = useTransform(progress, [start, start + 0.08], [24, 0]);
  return (
    <motion.div className="scroll-story-step" style={{ opacity, x }}>
      <span className="scroll-story-step-label">{step.label}</span>
      <h3>{step.title}</h3>
      <p>{step.desc}</p>
    </motion.div>
  );
}

function ScrollStoryVisual({ step, index, progress, start, end }) {
  const mid = (start + end) / 2;
  const opacity = useTransform(
    progress,
    [Math.max(0, start - 0.02), start + 0.04, end - 0.04, Math.min(1, end + 0.02)],
    [0, 1, 1, 0]
  );
  const scale = useTransform(progress, [start, mid, end], [0.94, 1, 0.94]);
  const Icon = step.icon;
  return (
    <motion.div className="scroll-story-visual" style={{ opacity, scale }}>
      <div className={`scroll-story-icon-badge tint-${index}`}>
        <Icon size={32} strokeWidth={1.5} />
      </div>
      <span className="scroll-story-visual-label">{step.label}</span>
    </motion.div>
  );
}
