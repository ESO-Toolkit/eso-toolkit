/**
 * AnimatedCounter
 * Spring-animated number display for stats.
 */

import { Typography, type TypographyProps } from '@mui/material';
import { animate, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import React, { useEffect } from 'react';

interface AnimatedCounterProps extends Omit<TypographyProps, 'children'> {
  value: number;
  suffix?: string;
  prefix?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  suffix = '',
  prefix = '',
  ...typographyProps
}) => {
  const prefersReduced = useReducedMotion();
  const motionValue = useMotionValue(prefersReduced ? value : 0);
  const rounded = useTransform(motionValue, (latest) => Math.round(latest));
  const [display, setDisplay] = React.useState(value);

  useEffect(() => {
    if (prefersReduced) {
      setDisplay(value);
      return;
    }
    const controls = animate(motionValue, value, {
      type: 'spring',
      stiffness: 200,
      damping: 30,
    });
    const unsub = rounded.on('change', (v) => setDisplay(v));
    return () => {
      controls.stop();
      unsub();
    };
  }, [value, motionValue, rounded, prefersReduced]);

  return (
    <Typography
      {...typographyProps}
      sx={{
        fontVariantNumeric: 'tabular-nums',
        ...typographyProps.sx,
      }}
    >
      {prefix}
      {display}
      {suffix}
    </Typography>
  );
};
