import { useSnackbar } from 'notistack';
import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';

import { usePerfTier } from '../hooks/usePerfTier';
import { selectPerfLowNoticeSeen, selectPerfTierOverride } from '../store/ui/uiSelectors';
import { setPerfLowNoticeSeen } from '../store/ui/uiSlice';
import { useAppDispatch } from '../store/useAppDispatch';

/**
 * One-time notice when auto-detection lands a device on the low perf tier:
 * visuals were quietly reduced (blur, animations, background) and the user
 * should know where to change that. Never fires for a pinned override (the
 * user chose it) and persists as seen so it can't nag on every visit.
 *
 * Renders nothing. Must mount inside SnackbarProvider — PerfTierProvider
 * itself sits above it in the tree, so the notice can't live there.
 */
export const PerfLowNotice: React.FC = () => {
  const tier = usePerfTier();
  const override = useSelector(selectPerfTierOverride);
  const seen = useSelector(selectPerfLowNoticeSeen);
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (tier !== 'low' || override !== 'auto' || seen) return;
    enqueueSnackbar(
      'Performance mode is on for a smoother experience — change it under Performance in the profile menu.',
      { variant: 'info', autoHideDuration: 8000 },
    );
    dispatch(setPerfLowNoticeSeen(true));
  }, [tier, override, seen, enqueueSnackbar, dispatch]);

  return null;
};
