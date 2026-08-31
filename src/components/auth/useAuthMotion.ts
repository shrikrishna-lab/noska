// Premium spring physics and motion definitions for Noska Loader and Auth
export const SPRING_PREMIUM = { type: "spring", stiffness: 220, damping: 28 } as const;
export const SPRING_GENTLE = { type: "spring", stiffness: 180, damping: 24 } as const;

export const logoVariants = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { 
    scale: 1, 
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 150,
      damping: 20,
    }
  },
  breath: {
    y: [0, -6, 0],
    scale: [1, 1.015, 1],
    opacity: [0.93, 1, 0.93],
    filter: [
      "drop-shadow(0 4px 12px rgba(0, 102, 255, 0.15))",
      "drop-shadow(0 8px 24px rgba(0, 102, 255, 0.35))",
      "drop-shadow(0 4px 12px rgba(0, 102, 255, 0.15))"
    ],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut" as const,
    }
  }
};

export const revealVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 160,
      damping: 24,
      staggerChildren: 0.08,
      delayChildren: 0.12,
    }
  },
  exit: {
    opacity: 0,
    y: -12,
    scale: 0.99,
    transition: {
      type: "tween" as const,
      ease: [0.7, 0, 0.84, 0] as const, // expo-in
      duration: 0.3,
    }
  }
};

export const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { 
      type: "spring" as const, 
      stiffness: 200, 
      damping: 22 
    }
  }
};

export const screenTransitionVariants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1, 
    transition: { duration: 0.5, ease: "easeOut" as const } 
  },
  exit: { 
    opacity: 0, 
    transition: { duration: 0.4, ease: "easeIn" as const } 
  }
};
