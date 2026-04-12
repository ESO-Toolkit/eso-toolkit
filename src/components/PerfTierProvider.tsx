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

  useEffect(() => {
    // When the user has pinned an override, skip detection — the persisted
    // detected tier still updates in the background so toggling back to
    // 'auto' gets a fresh value.
    let cancelled = false;
    void detectPerfTier().then((detected) => {
      if (cancelled) return;
      dispatch(setPerfTier(detected));
    });
    return () => {
      cancelled = true;
    };
    // Intentionally runs once. Re-detecting on override change would waste
    // work — override doesn't affect detection itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Also re-detect when the user switches back to 'auto' so an old
  // persisted value doesn't shadow a newer hardware/OS state.
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
