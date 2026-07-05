import { motion } from 'framer-motion';

/**
 * A two-option sliding-pill switch (monthly/yearly) — the active pill
 * glides between positions via a shared layoutId rather than a plain
 * background swap. Native reimplementation of the referenced Framer
 * "Price-Switch" component (Framer canvas-only, can't be imported into a
 * standalone app).
 */
export function PriceSwitch({ value, onChange, options }) {
  return (
    <div className="mkt-price-switch">
      {options.map((opt) => (
        <button
          key={opt.value}
          className={`mkt-price-switch-btn ${value === opt.value ? 'active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {value === opt.value && (
            <motion.span
              layoutId="mkt-price-switch-pill"
              className="mkt-price-switch-pill"
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            />
          )}
          <span className="mkt-price-switch-label">
            {opt.label}
            {opt.badge && <span className="mkt-price-switch-badge">{opt.badge}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}
