import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useMotionValueEvent } from 'framer-motion';
import { FileText, LayoutGrid, GitBranch, Sparkles } from 'lucide-react';
import { MacWindow } from './MacWindow';
import { DashboardShell } from './DashboardShell';

const STEPS = [
  {
    id: 'doc',
    icon: FileText,
    label: 'Start with a page',
    title: 'Write like it\'s just text.',
    desc: 'Every page starts blank. Type "/" anywhere to drop in one of 33 block types — tables, code, embeds, callouts — without breaking your train of thought.',
  },
  {
    id: 'canvas',
    icon: LayoutGrid,
    label: 'Drop into Canvas',
    title: 'Spread it out spatially.',
    desc: 'The same rows become draggable cards on a Kanban board or an infinite canvas — for when a linear doc stops being the right shape for the thought.',
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
 * A scroll-scrubbed product walkthrough: Noska's actual workspace chrome
 * (DashboardShell) sits sticky on the right and morphs between its real
 * view modes — Document, Canvas/Board, Graph, Ask AI — as the visitor
 * scrolls past four real feature steps on the left. It behaves like a
 * scrubbed video (the "playhead" is scroll position) but is built entirely
 * from live DOM/CSS, not a video asset, so it stays sharp at any size and
 * respects prefers-reduced-motion.
 */
export function ScrollShowcase() {
  const containerRef = useRef(null);
  const [scrollContainer, setScrollContainer] = useState(null);
  const [activeStep, setActiveStep] = useState(0);

  // The marketing site scrolls inside its own `.marketing` element (see
  // marketing-theme.css), not the window — framer-motion's useScroll needs
  // that element passed explicitly via `container`, otherwise it tracks
  // window scroll (which never changes here) and scroll-linked transforms
  // stay frozen at their initial values.
  useEffect(() => {
    const el = containerRef.current?.closest('.marketing');
    if (el) setScrollContainer({ current: el });
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    container: scrollContainer || undefined,
    offset: ['start start', 'end end'],
  });

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const idx = Math.min(STEPS.length - 1, Math.max(0, Math.floor(v * STEPS.length)));
    setActiveStep(idx);
  });

  return (
    <section className="scroll-showcase" ref={containerRef}>
      <div className="mkt-container scroll-showcase-grid">
        <div className="scroll-showcase-steps">
          {STEPS.map((step, i) => {
            const start = i / STEPS.length;
            const end = (i + 1) / STEPS.length;
            return <ShowcaseStep key={step.id} step={step} index={i} progress={scrollYProgress} start={start} end={end} />;
          })}
        </div>

        <div className="scroll-showcase-sticky">
          <MacWindow title="noska.app" className="scroll-showcase-window">
            <div className="scroll-showcase-dash-stage">
              <DashboardShell mode={STEPS[activeStep].id} instanceId="showcase" />
            </div>
          </MacWindow>
        </div>
      </div>
    </section>
  );
}

function ShowcaseStep({ step, index, progress, start, end }) {
  const opacity = useTransform(progress, [Math.max(0, start - 0.03), start + 0.05, end - 0.05, Math.min(1, end + 0.03)], [0.28, 1, 1, 0.28]);
  const x = useTransform(progress, [start, start + 0.08], [20, 0]);
  const tickScale = useTransform(progress, [start, start + 0.02, end - 0.02, end], [0.4, 1, 1, 0.4]);
  return (
    <motion.div className="scroll-showcase-step" style={{ opacity, x }}>
      <div className="scroll-showcase-step-marker">
        <motion.span className="scroll-showcase-tick" style={{ scaleY: tickScale }} />
        <span className="scroll-showcase-step-num">{String(index + 1).padStart(2, '0')}</span>
      </div>
      <div>
        <span className="scroll-showcase-step-label">{step.label}</span>
        <h3>{step.title}</h3>
        <p>{step.desc}</p>
      </div>
    </motion.div>
  );
}
