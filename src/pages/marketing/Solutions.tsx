import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Briefcase, GraduationCap, Users, PenTool, ArrowRight, Check,
} from 'lucide-react';
import { Reveal, Stagger, staggerItem } from './components/Reveal';
import './Solutions.css';

const USE_CASES = [
  {
    id: 'personal',
    icon: Briefcase,
    color: 'blue',
    title: 'Personal knowledge',
    tagline: 'Your second brain, actually usable.',
    desc: 'One free workspace for notes, journals, and everything you don\'t want to lose in a dozen scattered apps.',
    points: [
      'Docs, wikis, and databases in the same place',
      'Thought Graph shows how your notes actually connect',
      'Client-side encryption for anything private',
    ],
  },
  {
    id: 'students',
    icon: GraduationCap,
    color: 'purple',
    title: 'Students & researchers',
    tagline: 'Study smarter, not longer.',
    desc: 'Turn any block into a flashcard and let the SM-2 spaced-repetition scheduler decide when you should review it again.',
    points: [
      'Spaced repetition built directly into your notes',
      'Voice capture turns lecture recordings into structured outlines',
      'Databases for reading lists, citations, and deadlines',
    ],
  },
  {
    id: 'teams',
    icon: Users,
    color: 'red',
    title: 'Small teams',
    tagline: 'One workspace, no tab-switching.',
    desc: 'Docs, project boards, and a shared AI workspace — without the multi-workspace/SSO overhead teams of one don\'t need yet.',
    points: [
      '8 database views: table, board, calendar, timeline, and more',
      'Real-time collaborative editing on every page',
      'Bring your own AI key — nothing routed through a third-party model you didn\'t choose',
    ],
  },
  {
    id: 'writers',
    icon: PenTool,
    color: 'yellow',
    title: 'Writers & builders',
    tagline: 'Draft, structure, then ship.',
    desc: 'Long-form drafts, project specs, and a canvas mode for when a linear document stops being the right shape for the idea.',
    points: [
      '33 block types including code, embeds, and callouts',
      'Spatial Canvas with AI clustering, smart connectors & presentation mode',
      'Export to Markdown, HTML, or plain text anytime',
    ],
  },
];

export default function Solutions() {
  return (
    <div className="solutions-wrapper">
      <section className="solutions-hero mkt-container">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1>Built for how you actually work.</h1>
          <p>Four honest starting points — pick the one closest to you, or mix and match. Nothing here requires an enterprise plan.</p>
        </motion.div>
      </section>

      <section className="solutions-list mkt-container">
        {USE_CASES.map((useCase, i) => (
          <SolutionRow key={useCase.id} useCase={useCase} reversed={i % 2 === 1} />
        ))}
      </section>

      <section className="solutions-cta mkt-container">
        <Reveal className="cta-banner">
          <h2>Not sure which fits? Start free and find out.</h2>
          <p>Every plan starts on the Free tier — no card required to see if Noska fits your workflow.</p>
          <div className="cta-btn-group">
            <Link to="/login" className="btn btn-primary btn-lg">
              Get started free <ArrowRight size={16} />
            </Link>
            <Link to="/pricing" className="btn btn-secondary btn-lg">
              Compare plans
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

function SolutionRow({ useCase, reversed }) {
  const { icon: Icon, color, title, tagline, desc, points } = useCase;
  return (
    <Reveal className={`solution-row ${reversed ? 'reversed' : ''}`}>
      <div className="solution-row-visual">
        <div className={`solution-icon-badge tint-${color}`}>
          <Icon size={40} strokeWidth={1.4} />
        </div>
      </div>
      <div className="solution-row-content">
        <span className="solution-eyebrow">{title}</span>
        <h2>{tagline}</h2>
        <p>{desc}</p>
        <Stagger className="solution-points">
          {points.map((point) => (
            <motion.div key={point} variants={staggerItem} className="solution-point">
              <Check size={15} className="check-icon" />
              <span>{point}</span>
            </motion.div>
          ))}
        </Stagger>
      </div>
    </Reveal>
  );
}
