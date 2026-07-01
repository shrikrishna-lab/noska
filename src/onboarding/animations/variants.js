export const containerVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { staggerChildren: 0.06 } },
  exit: { opacity: 0, transition: { duration: 0.12 } }
};

export const stepVariants = {
  initial: { opacity: 0, y: 28, scale: 0.96 },
  animate: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: "spring", stiffness: 200, damping: 26 }
  },
  exit: {
    opacity: 0, y: -18, scale: 0.96,
    transition: { duration: 0.15 }
  }
};

export const cardVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  hover: { y: -4, boxShadow: "0 12px 40px rgba(0,102,255,0.15)" },
  tap: { scale: 0.98 }
};

export const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 }
};

export const scaleIn = {
  initial: { scale: 0, opacity: 0 },
  animate: { scale: 1, opacity: 1, transition: { type: "spring", stiffness: 200, damping: 15 } },
  exit: { scale: 0.8, opacity: 0 }
};

export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } }
};
