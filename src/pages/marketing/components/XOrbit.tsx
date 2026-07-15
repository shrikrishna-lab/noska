import { motion } from 'framer-motion';

/**
 * A center node with icon satellites orbiting around it on dashed
 * connector lines — native reimplementation of the referenced Framer
 * "XOrbit" component (Framer canvas-only, can't be imported into a
 * standalone app). Generic enough to reuse for any "central thing
 * connected to N other things" visual.
 */
export function XOrbit({ centerIcon: CenterIcon, centerLabel, items, radius = 118, size = 300 }) {
  return (
    <div className="mkt-xorbit" style={{ width: size, height: size }}>
      <svg className="mkt-xorbit-lines" viewBox={`${-radius - 30} ${-radius - 30} ${(radius + 30) * 2} ${(radius + 30) * 2}`}>
        {items.map((_, i) => {
          const angle = (360 / items.length) * i;
          const rad = (angle * Math.PI) / 180;
          const x = Math.cos(rad) * radius;
          const y = Math.sin(rad) * radius;
          return <line key={i} x1="0" y1="0" x2={x} y2={y} className="mkt-xorbit-line" />;
        })}
      </svg>

      {items.map(({ icon: Icon, label }, i) => {
        const angle = (360 / items.length) * i;
        const rad = (angle * Math.PI) / 180;
        const x = Math.cos(rad) * radius;
        const y = Math.sin(rad) * radius;
        return (
          <motion.div
            key={label}
            className="mkt-xorbit-node"
            style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)` }}
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.div
              className="mkt-xorbit-node-inner"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4 + i * 0.3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Icon size={16} strokeWidth={1.8} />
            </motion.div>
            <span className="mkt-xorbit-node-label">{label}</span>
          </motion.div>
        );
      })}

      <motion.div
        className="mkt-xorbit-center"
        initial={{ opacity: 0, scale: 0.85 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <CenterIcon size={24} strokeWidth={1.7} />
        {centerLabel && <span>{centerLabel}</span>}
      </motion.div>
    </div>
  );
}
