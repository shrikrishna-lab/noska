import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  FileQuestion, PenLine, Sparkles, Database, Link2, Users, BookOpen, Network,
} from 'lucide-react';

const STEPS = [
  { icon: FileQuestion, title: 'Blank page.', desc: 'Every idea starts with nothing — no template forced on you before you\'ve even thought a thought.' },
  { icon: PenLine, title: 'Write ideas.', desc: 'Type freely, or drop in a block for whatever shape the idea needs — text, table, image, code.' },
  { icon: Sparkles, title: 'AI expands content.', desc: 'Ask Noska AI to draft, continue, or restructure what you\'ve written, right where you\'re working.' },
  { icon: Database, title: 'Create a database.', desc: 'The same rows become a table, a board, or a calendar — structure follows the work, not the other way around.' },
  { icon: Link2, title: 'Connect pages.', desc: 'Link freely. Every reference becomes part of a living map of how your ideas relate.' },
  { icon: Users, title: 'Collaborate.', desc: 'Real-time presence and comments mean the page is never just yours alone.' },
  { icon: BookOpen, title: 'Build your company wiki.', desc: 'What started as one page becomes the place your whole team goes to know things.' },
  { icon: Network, title: 'Everything connected.', desc: 'Notes, docs, projects, and AI — one workspace that remembers how it all fits together.' },
];

/**
 * Apple-style scroll-scrubbed story: a tall spacer section drives a sticky
 * stage where each step crossfades and scales in as the user scrolls past
 * its slice of the section, replacing the referenced Framer "scroll-zoom
 * reveal" component with a native useScroll-driven implementation.
 */
export function ProductStory() {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });

  return (
    <section className="nl-story" ref={sectionRef}>
      <div className="nl-container nl-story-header">
        <span className="nl-eyebrow"><Network size={12} /> Product story</span>
        <h2>From a blank page to a second brain.</h2>
      </div>

      <div className="nl-story-spacer">
        <div className="nl-story-sticky">
          <div className="nl-container">
            <div className="nl-story-steps">
              {STEPS.map((step, i) => (
                <StoryStep key={step.title} step={step} index={i} total={STEPS.length} progress={scrollYProgress} />
              ))}
            </div>
            <StoryProgress progress={scrollYProgress} total={STEPS.length} />
          </div>
        </div>
      </div>
    </section>
  );
}

function StoryStep({ step, index, total, progress }) {
  const Icon = step.icon;
  const start = index / total;
  const end = (index + 1) / total;
  const mid = (start + end) / 2;

  const opacity = useTransform(
    progress,
    [start, start + 0.05 * (1 / total) * total, end - 0.05 * (1 / total) * total, end],
    [0, 1, 1, 0]
  );
  const scale = useTransform(progress, [start, mid, end], [0.92, 1, 0.92]);
  const y = useTransform(progress, [start, mid, end], [24, 0, -24]);

  return (
    <motion.div className="nl-story-step" style={{ opacity, scale, y }}>
      <span className="nl-story-step-num">{String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
      <div className="nl-story-step-icon"><Icon size={26} strokeWidth={1.6} /></div>
      <h3>{step.title}</h3>
      <p>{step.desc}</p>
    </motion.div>
  );
}

function StoryProgress({ progress, total }) {
  return (
    <div className="nl-story-progress">
      {Array.from({ length: total }).map((_, i) => (
        <ProgressDot key={i} index={i} total={total} progress={progress} />
      ))}
    </div>
  );
}

function ProgressDot({ index, total, progress }) {
  const start = index / total;
  const end = (index + 1) / total;
  const fill = useTransform(progress, [start, end], ['0%', '100%'], { clamp: true });
  return (
    <span className="nl-story-progress-dot">
      <motion.span className="nl-story-progress-fill" style={{ width: fill }} />
    </span>
  );
}
