import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

/**
 * Shared expandable FAQ list — animates height via framer-motion rather
 * than a CSS max-height hack, so answers of any length reveal cleanly.
 * Native reimplementation of the referenced Framer "Expandable-Drawers" /
 * "FAQs" components (both Framer canvas-only, can't be imported into a
 * standalone app). One item open at a time.
 */
export function FaqAccordion({ items, className = '', defaultOpenIndex = -1 }) {
  const [openIndex, setOpenIndex] = useState(defaultOpenIndex);

  return (
    <div className={`mkt-faq-accordion ${className}`}>
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={item.q} className={`mkt-faq-accordion-item ${isOpen ? 'open' : ''}`}>
            <button className="mkt-faq-accordion-question" onClick={() => setOpenIndex(isOpen ? -1 : i)}>
              <span>{item.q}</span>
              <ChevronDown size={16} className={`mkt-faq-accordion-chevron ${isOpen ? 'open' : ''}`} />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  className="mkt-faq-accordion-answer-wrap"
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  <p>{item.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
