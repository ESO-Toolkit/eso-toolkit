import { MotionConfig } from 'framer-motion';
import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';

import { usePerfTier } from '../hooks/usePerfTier';
import { selectPerfTierOverride } from '../store/ui/uiSelectors';
import { setPerfTier } from '../store/ui/uiSlice';
import { useAppDispatch } from '../store/useAppDispatch';
import { detectPerfTier } from '../utils/detectPerfTier';

// Runs async GPU + heuristic detection once on mount, writes the resolved
// tier into Redux (persisted). Also caps framer-motion animations on low
// tier via MotionConfig, which applies to every `motion.*` descendant.
//
// Must sit inside ReduxProvider. Place above the router so MotionConfig
// covers all routed views.
export const PerfTierProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const tier = usePerfTier();
  const override = useSelector(selectPerfTierOverride);
  const dispatch = useAppDispatch();

  // Run detection only when the effective tier is auto-driven. Fires once on
  // first mount with override='auto' (the default) and re-fires whenever the
  // user toggles back to 'auto' so a stale persisted value can't shadow new
  // hardware/OS state. When a manual override is pinned, detection is skipped
  // entirely — the persisted detected tier is irrelevant until the user goes
  // back to 'auto', at which point this effect re-runs.
  useEffect(() => {
    if (override !== 'auto') return;
    let cancelled = false;
    void detectPerfTier().then((detected) => {
      if (cancelled) return;
      dispatch(setPerfTier(detected));
    });
    return () => {
      cancelled = true;
    };
  }, [override, dispatch]);

  // reducedMotion='user' defers to the OS media query so a high-tier desktop
  // user who opted into prefers-reduced-motion still gets quiet animations.
  // 'always' on low tier is the stronger override — the device can't afford
  // motion regardless of OS preference.
  return <MotionConfig reducedMotion={tier === 'low' ? 'always' : 'user'}>{children}</MotionConfig>;
};
