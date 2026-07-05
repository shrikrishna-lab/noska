import { Fragment } from 'react';
import { motion } from 'framer-motion';
import { PenLine, LayoutGrid, Users2 } from 'lucide-react';

const STEPS = [
  { icon: PenLine, title: 'Create', desc: 'Start a page, a doc, or a database — whatever the thought needs.' },
  { icon: LayoutGrid, title: 'Organize', desc: 'Let structure emerge as tables, boards, or a connected wiki.' },
  { icon: Users2, title: 'Collaborate', desc: 'Bring your team in, with AI helping across every step.' },
];

function Connector() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 64 2" preserveAspectRatio="none">
      <motion.path
        d="M0 1 H64"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  );
}

/**
 * Three-card "Create → Organize → Collaborate" flow with a dashed connector
 * between each, drawn in as the section scrolls into view.
 */
export function HowItWorks() {
  return (
    <section className="nl-how">
      <div className="nl-container">
        <div className="nl-section-header">
          <span className="nl-eyebrow">How Noska works</span>
          <h2>Three steps. One workspace.</h2>
        </div>

        <div className="nl-how-row">
          {STEPS.map((step, i) => (
            <Fragment key={step.title}>
              <motion.div
                className="nl-how-card"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.55, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="nl-how-card-icon"><step.icon size={22} strokeWidth={1.6} /></div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </motion.div>
              {i < STEPS.length - 1 && (
                <div className="nl-how-connector">
                  <Connector />
                </div>
              )}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
