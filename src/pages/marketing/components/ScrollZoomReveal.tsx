import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useMotionValueEvent } from 'framer-motion';
import {
  FileQuestion, PenLine, Sparkles, Database, Link2, Users, BookOpen, Network,
} from 'lucide-react';
import { useMarketingScrollContainer } from './useMarketingScrollContainer';
import { ProductStoryScene } from './ProductStoryScene';

const STEPS = [
  { icon: FileQuestion, label: 'Blank page', title: 'Blank page.', desc: 'Every idea starts with nothing forced on it before you\'ve even thought a thought.' },
  { icon: PenLine, label: 'Write it down', title: 'Write ideas.', desc: 'Type freely, or drop in a block for whatever shape the idea needs.' },
  { icon: Sparkles, label: 'Let AI help', title: 'AI expands it.', desc: 'Ask Noska AI to draft or restructure right where you\'re working.' },
  { icon: Database, label: 'Structure it', title: 'Create a database.', desc: 'The same rows become a table, board, or calendar as understanding changes.' },
  { icon: Link2, label: 'Link pages', title: 'Connect pages.', desc: 'Every link becomes part of a living map of how your ideas relate.' },
  { icon: Users, label: 'Bring your team', title: 'Collaborate.', desc: 'Real-time presence means the page is never just yours alone.' },
  { icon: BookOpen, label: 'Grow the wiki', title: 'Build your wiki.', desc: 'One page becomes the place your whole team goes to know things.' },
  { icon: Network, label: 'See it all', title: 'Everything connected.', desc: 'Notes, docs, and AI — a workspace that remembers how it all fits together.' },
];

/**
 * "Product story" — a scroll-scrubbed walkthrough styled like a real
 * editor screen: numbered steps on the left fade in/out as the reader
 * scrolls, while a sticky recreation of Noska's actual page UI (topbar,
 * cover, content, and the right-hand details/inspector panel — see
 * ProductStoryScene) morphs through the idea-to-wiki narrative on the
 * right, with floating "Ask Noska anything" / "Connected" cards appearing
 * once the story reaches its final, fully-connected state. Native
 * reimplementation of the referenced Framer "scroll-zoom-reveal" component
 * (Framer canvas-only, can't be imported into a standalone app).
 */
export function ScrollZoomReveal() {
  const sectionRef = useRef(null);
  const scrollContainer = useMarketingScrollContainer(sectionRef);
  const [activeStep, setActiveStep] = useState(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    container: scrollContainer || undefined,
    offset: ['start start', 'end end'],
  });

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const idx = Math.min(STEPS.length - 1, Math.max(0, Math.floor(v * STEPS.length)));
    setActiveStep(idx);
  });

  return (
    <section className="mkt-zoom-story" ref={sectionRef}>
      <div className="mkt-container mkt-zoom-story-header">
        <span className="section-eyebrow-pill">Product story</span>
        <h2>From a blank page to a company wiki.</h2>
        <p>Follow one real page as it grows — watch the panel on the right update as the story does.</p>
      </div>

      <div className="mkt-zoom-story-spacer">
        <div className="mkt-zoom-story-sticky">
          <div className="mkt-container mkt-zoom-story-grid">
            <div className="mkt-zoom-story-steps">
              {STEPS.map((step, i) => {
                const start = i / STEPS.length;
                const end = (i + 1) / STEPS.length;
                return <ZoomStep key={step.title} step={step} index={i} total={STEPS.length} progress={scrollYProgress} start={start} end={end} />;
              })}
            </div>

            <div className="mkt-zoom-story-scene">
              <ProductStoryScene stepIndex={activeStep} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ZoomStep({ step, index, total, progress, start, end }) {
  const Icon = step.icon;
  const opacity = useTransform(progress, [Math.max(0, start - 0.02), start + 0.04, end - 0.04, Math.min(1, end + 0.02)], [0.25, 1, 1, 0.25]);
  const x = useTransform(progress, [start, start + 0.06], [16, 0]);
  const tickScale = useTransform(progress, [start, start + 0.02, end - 0.02, end], [0.3, 1, 1, 0.3]);

  return (
    <motion.div className="mkt-zoom-story-step" style={{ opacity, x }}>
      <div className="mkt-zoom-story-step-marker">
        <motion.span className="mkt-zoom-story-tick" style={{ scaleY: tickScale }} />
        <span className="mkt-zoom-story-num">{String(index + 1).padStart(2, '0')}</span>
      </div>
      <div className="mkt-zoom-story-step-body">
        <span className="mkt-zoom-story-step-label"><Icon size={13} strokeWidth={1.8} /> {step.label}</span>
        <h3>{step.title}</h3>
        <p>{step.desc}</p>
      </div>
    </motion.div>
  );
}
