import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

/**
 * A card that tilts gently in 3D toward the cursor on hover and lifts with
 * a soft shadow — the "premium hover elevation" pattern used across the
 * capability grid. Tilt range is intentionally small (±6deg) to stay calm.
 */
export function TiltCard({ children, className = '', as = 'div', ...rest }) {
  const ref = useRef(null);
  const rx = useSpring(useMotionValue(0), { stiffness: 220, damping: 22 });
  const ry = useSpring(useMotionValue(0), { stiffness: 220, damping: 22 });
  const lift = useSpring(useMotionValue(0), { stiffness: 220, damping: 22 });

  const handleMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    ry.set(px * 8);
    rx.set(py * -8);
    lift.set(-6);
  };

  const reset = () => {
    rx.set(0);
    ry.set(0);
    lift.set(0);
  };

  const Tag = motion[as] || motion.div;

  return (
    <Tag
      ref={ref}
      className={`tilt-card ${className}`}
      style={{ rotateX: rx, rotateY: ry, y: lift, transformPerspective: 800 }}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      {...rest}
    >
      {children}
    </Tag>
  );
}
