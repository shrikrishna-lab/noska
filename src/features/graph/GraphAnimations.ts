export const NODE_SPRING = {
  type: "spring" as const,
  stiffness: 260,
  damping: 26,
  mass: 0.8
};

export const BASE_SPRING = {
  type: "spring" as const,
  stiffness: 200,
  damping: 24,
  mass: 0.9
};

export const NODE_VARIANTS = {
  initial: { opacity: 0, scale: 0.6 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: NODE_SPRING
  },
  hover: {
    scale: 1.05,
    y: -2,
    transition: { type: "spring" as const, stiffness: 300, damping: 20 }
  },
  tap: {
    scale: 0.98,
    transition: { type: "spring" as const, stiffness: 400, damping: 15 }
  }
};

export const FADE_IN_VARIANTS = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 220, damping: 22 }
  },
  exit: {
    opacity: 0,
    y: 10,
    transition: { duration: 0.15 }
  }
};
