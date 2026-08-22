import { Variants, Transition } from "motion/react";

// ─────────────────────────────────────────────────────────────────────────────
// HARDWARE ACCELERATED SPRING & EASE CURVES (Zero Layout Cost)
// ─────────────────────────────────────────────────────────────────────────────

export const springSmooth: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 32,
  mass: 0.8,
};

export const springBouncy: Transition = {
  type: "spring",
  stiffness: 440,
  damping: 26,
  mass: 0.6,
};

export const easeSmooth: Transition = {
  duration: 0.2,
  ease: [0.16, 1, 0.3, 1], // Apple-style fluid deceleration
};

export const easeQuint: Transition = {
  duration: 0.22,
  ease: [0.22, 1, 0.36, 1],
};

// ─────────────────────────────────────────────────────────────────────────────
// PAGE TRANSITIONS (60/120 FPS GPU Accelerated)
// ─────────────────────────────────────────────────────────────────────────────

export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 6,
    scale: 0.996,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.2,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -4,
    scale: 0.996,
    transition: {
      duration: 0.14,
      ease: [0.4, 0, 1, 1],
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// MODAL & POPUP TRANSITIONS (Zero Jank on Mobile)
// ─────────────────────────────────────────────────────────────────────────────

export const modalBackdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { duration: 0.18, ease: "easeOut" }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.14, ease: "easeIn" }
  },
};

export const modalContentVariants: Variants = {
  initial: { 
    opacity: 0, 
    scale: 0.95,
    y: 10,
  },
  animate: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: springSmooth,
  },
  exit: { 
    opacity: 0, 
    scale: 0.96,
    y: 6,
    transition: { duration: 0.14, ease: [0.4, 0, 1, 1] }
  },
};

export const sheetVariants: Variants = {
  initial: { y: "100%", opacity: 0.4 },
  animate: { 
    y: 0, 
    opacity: 1, 
    transition: springSmooth,
  },
  exit: { 
    y: "100%", 
    opacity: 0, 
    transition: { duration: 0.18, ease: [0.4, 0, 1, 1] }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// STAGGER & LIST ITEM VARIANTS (Optimized for long lists)
// ─────────────────────────────────────────────────────────────────────────────

export const staggerContainer = (staggerChildren = 0.03, delayChildren = 0): Variants => ({
  initial: {},
  animate: {
    transition: {
      staggerChildren,
      delayChildren,
    },
  },
});

export const fadeUpItem: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.22,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export const scaleItem: Variants = {
  initial: { opacity: 0, scale: 0.94 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: springSmooth,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// TOAST & ALERT VARIANTS
// ─────────────────────────────────────────────────────────────────────────────

export const toastVariants: Variants = {
  initial: { opacity: 0, y: -16, scale: 0.92 },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: springBouncy,
  },
  exit: { 
    opacity: 0, 
    y: -10, 
    scale: 0.96,
    transition: { duration: 0.15, ease: "easeInOut" }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// HAPTIC FEEDBACK (Web Vibration API helper)
// ─────────────────────────────────────────────────────────────────────────────

export function triggerHaptic(type: "light" | "medium" | "heavy" | "success" | "warning" = "light") {
  if (typeof window === "undefined" || !("navigator" in window) || !("vibrate" in navigator)) {
    return;
  }
  try {
    switch (type) {
      case "light":
        navigator.vibrate(8);
        break;
      case "medium":
        navigator.vibrate(16);
        break;
      case "heavy":
        navigator.vibrate(28);
        break;
      case "success":
        navigator.vibrate([10, 30, 12]);
        break;
      case "warning":
        navigator.vibrate([16, 40, 24]);
        break;
      default:
        navigator.vibrate(8);
    }
  } catch {
    // Ignore any vibration policy denial
  }
}

