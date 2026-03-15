/**
 * Shared Framer Motion Variants
 * Used across build editor components for consistent animation.
 */

import type { Variants } from 'framer-motion';

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.04,
    },
  },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export const hoverGlow = {
  rest: { boxShadow: '0 0 0 0 rgba(var(--be-accent-rgb, 56, 189, 248), 0)' },
  hover: {
    boxShadow: '0 0 20px 2px rgba(var(--be-accent-rgb, 56, 189, 248), 0.25)',
    transition: { duration: 0.2 },
  },
};

export const pulseKeyframes = {
  scale: [1, 1.04, 1],
  transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
};
