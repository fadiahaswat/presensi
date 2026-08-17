import { Variants, Transition } from "motion/react";

// ─────────────────────────────────────────────────────────────────────────────
// HARDWARE ACCELERATED SPRING & EASE CURVES
// ─────────────────────────────────────────────────────────────────────────────

export const springSmooth: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 30,
  mass: 0.8,
};

export const springBouncy: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 24,
  mass: 0.6,
};

export const easeQuint: Transition = {
  duration: 0.24,
  ease: [0.22, 1, 0.36, 1],
};

// ─────────────────────────────────────────────────────────────────────────────
// PAGE TRANSITIONS
// ─────────────────────────────────────────────────────────────────────────────

export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 8,
    scale: 0.995,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.22,
      ease: [0.25, 1, 0.5, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -6,
    scale: 0.995,
    transition: {
      duration: 0.16,
      ease: [0.4, 0, 1, 1],
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// MODAL & POPUP TRANSITIONS
// ─────────────────────────────────────────────────────────────────────────────

export const modalBackdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { duration: 0.2, ease: "easeOut" }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.16, ease: "easeIn" }
  },
};

export const modalContentVariants: Variants = {
  initial: { 
    opacity: 0, 
    scale: 0.94,
    y: 12,
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
    y: 8,
    transition: { duration: 0.15, ease: "easeIn" }
  },
};

export const sheetVariants: Variants = {
  initial: { y: "100%", opacity: 0.5 },
  animate: { 
    y: 0, 
    opacity: 1, 
    transition: springSmooth,
  },
  exit: { 
    y: "100%", 
    opacity: 0, 
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// STAGGER & LIST ITEM VARIANTS
// ─────────────────────────────────────────────────────────────────────────────

export const staggerContainer = (staggerChildren = 0.035, delayChildren = 0): Variants => ({
  initial: {},
  animate: {
    transition: {
      staggerChildren,
      delayChildren,
    },
  },
});

export const fadeUpItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.25,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export const scaleItem: Variants = {
  initial: { opacity: 0, scale: 0.92 },
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
  initial: { opacity: 0, y: -20, scale: 0.9 },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: springBouncy,
  },
  exit: { 
    opacity: 0, 
    y: -12, 
    scale: 0.95,
    transition: { duration: 0.18, ease: "easeInOut" }
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
        navigator.vibrate(10);
        break;
      case "medium":
        navigator.vibrate(20);
        break;
      case "heavy":
        navigator.vibrate(35);
        break;
      case "success":
        navigator.vibrate([12, 40, 15]);
        break;
      case "warning":
        navigator.vibrate([20, 50, 30]);
        break;
      default:
        navigator.vibrate(10);
    }
  } catch {
    // Ignore any vibration policy denial
  }
}
