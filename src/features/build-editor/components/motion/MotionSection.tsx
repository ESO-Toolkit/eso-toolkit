/**
 * MotionSection
 * AnimatePresence wrapper for section-level transitions.
 * Respects prefers-reduced-motion.
 */

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import React from 'react';

import { fadeInUp } from './variants';

interface MotionSectionProps {
  id: string;
  children: React.ReactNode;
}

export const MotionSection: React.FC<MotionSectionProps> = ({ id, children }) => {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div id={id}>{children}</div>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={id}
        id={id}
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        exit="hidden"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
