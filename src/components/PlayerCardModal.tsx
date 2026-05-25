import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  Typography,
  useTheme,
} from '@mui/material';
import React, { Suspense } from 'react';

import { usePlayerCardData } from '../hooks/usePlayerCardData';
import type { ReportFightContextInput } from '../store/contextTypes';

const PlayerCard = React.lazy(() =>
  import('../features/report_details/insights/PlayerCard').then((module) => ({
    default: module.PlayerCard,
  })),
);

export interface PlayerCardModalProps {
  open: boolean;
  onClose: () => void;
  /** The currently viewed player ID */
  currentPlayerId: string | number;
  /** Ordered list of player IDs matching the grid's current sort order */
  orderedPlayerIds: Array<string | number>;
  /** Called when the user navigates to a different player */
  onPlayerChange: (playerId: string | number) => void;
  /** Optional context override for data fetching */
  context?: ReportFightContextInput;
}

export const PlayerCardModal: React.FC<PlayerCardModalProps> = ({
  open,
  onClose,
  currentPlayerId,
  orderedPlayerIds,
  onPlayerChange,
  context,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Animation state
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const [displayedPlayerId, setDisplayedPlayerId] = React.useState(currentPlayerId);
  const [fadeStage, setFadeStage] = React.useState<'in' | 'out' | 'none'>('none');

  // Sync displayed player when the external prop changes
  React.useEffect(() => {
    if (!isTransitioning) {
      setDisplayedPlayerId(currentPlayerId);
    }
  }, [currentPlayerId, isTransitioning]);

  // Find current player index in the ordered list
  const currentIndex = React.useMemo(() => {
    return orderedPlayerIds.findIndex((id) => String(id) === String(currentPlayerId));
  }, [orderedPlayerIds, currentPlayerId]);

  const canNavigate = orderedPlayerIds.length > 1;

  const goToPreviousPlayer = React.useCallback(() => {
    if (!canNavigate) return;
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : orderedPlayerIds.length - 1;
    setFadeStage('out');
    setIsTransitioning(true);

    setTimeout(() => {
      const nextId = orderedPlayerIds[prevIndex];
      setDisplayedPlayerId(nextId);
      setFadeStage('in');

      setTimeout(() => {
        onPlayerChange(nextId);
        setFadeStage('none');
        setIsTransitioning(false);
      }, 250);
    }, 250);
  }, [canNavigate, currentIndex, orderedPlayerIds, onPlayerChange]);

  const goToNextPlayer = React.useCallback(() => {
    if (!canNavigate) return;
    const nextIndex = currentIndex < orderedPlayerIds.length - 1 ? currentIndex + 1 : 0;
    setFadeStage('out');
    setIsTransitioning(true);

    setTimeout(() => {
      const nextId = orderedPlayerIds[nextIndex];
      setDisplayedPlayerId(nextId);
      setFadeStage('in');

      setTimeout(() => {
        onPlayerChange(nextId);
        setFadeStage('none');
        setIsTransitioning(false);
      }, 250);
    }, 250);
  }, [canNavigate, currentIndex, orderedPlayerIds, onPlayerChange]);

  // Keyboard navigation
  React.useEffect(() => {
    if (!open || !canNavigate) return;
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'ArrowLeft') goToPreviousPlayer();
      else if (event.key === 'ArrowRight') goToNextPlayer();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, canNavigate, goToPreviousPlayer, goToNextPlayer]);

  // Player position label
  const positionLabel = currentIndex >= 0 ? `${currentIndex + 1} / ${orderedPlayerIds.length}` : '';

  const fadeOpacity = fadeStage === 'out' ? 0 : 1;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            maxHeight: '90vh',
            overflow: 'hidden',
          },
        },
      }}
    >
      {/* Header with navigation */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1,
          borderBottom: `1px solid ${isDark ? 'rgba(56, 189, 248, 0.1)' : 'rgba(15, 23, 42, 0.06)'}`,
        }}
      >
        {/* Left: prev button */}
        <IconButton
          onClick={goToPreviousPlayer}
          disabled={!canNavigate || isTransitioning}
          size="small"
          aria-label="Previous player"
          sx={{
            opacity: canNavigate ? 1 : 0.3,
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: isDark ? 'rgba(56, 189, 248, 0.08)' : 'rgba(15, 23, 42, 0.05)',
              transform: 'translateX(-2px)',
            },
          }}
        >
          <ChevronLeftIcon />
        </IconButton>

        {/* Center: position label */}
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            fontVariantNumeric: 'tabular-nums',
            userSelect: 'none',
            fontSize: '0.7rem',
            letterSpacing: 0.5,
            textTransform: 'uppercase',
          }}
        >
          {positionLabel}
        </Typography>

        {/* Right: next button + close */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton
            onClick={goToNextPlayer}
            disabled={!canNavigate || isTransitioning}
            size="small"
            aria-label="Next player"
            sx={{
              opacity: canNavigate ? 1 : 0.3,
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: isDark ? 'rgba(56, 189, 248, 0.08)' : 'rgba(15, 23, 42, 0.05)',
                transform: 'translateX(2px)',
              },
            }}
          >
            <ChevronRightIcon />
          </IconButton>
          <IconButton
            onClick={onClose}
            size="small"
            aria-label="Close"
            sx={{
              transition: 'all 0.2s ease',
              '&:hover': {
                color: isDark ? '#ff8a80' : '#d32f2f',
                backgroundColor: isDark ? 'rgba(244, 67, 54, 0.08)' : 'rgba(244, 67, 54, 0.05)',
              },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Content: PlayerCard with fade transition */}
      <DialogContent
        sx={{
          p: { xs: 1, sm: 2 },
          opacity: fadeOpacity,
          transition: 'opacity 0.25s ease-in-out',
          overflow: 'auto',
        }}
      >
        <PlayerCardModalContent playerId={displayedPlayerId} context={context} />
      </DialogContent>
    </Dialog>
  );
};

/**
 * Inner content that fetches data for a single player via usePlayerCardData.
 * Isolated so the hook only runs when the modal is mounted (Dialog lazy-mounts content).
 */
const PlayerCardModalContent: React.FC<{
  playerId: string | number;
  context?: ReportFightContextInput;
}> = ({ playerId, context }) => {
  const data = usePlayerCardData({ playerId, context });

  if (data.loadingStages.core || !data.player) {
    return (
      <Box
        role="status"
        aria-live="polite"
        sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}
      >
        <CircularProgress aria-label="Loading player card" />
      </Box>
    );
  }

  return (
    <Suspense
      fallback={
        <Box
          role="status"
          aria-live="polite"
          sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}
        >
          <CircularProgress aria-label="Loading player card" />
        </Box>
      }
    >
      <PlayerCard
        player={data.player}
        mundusBuffs={data.mundusBuffs}
        championPoints={data.championPoints}
        auras={data.auras}
        scribingSkills={data.scribingSkills}
        buildIssues={data.buildIssues}
        classAnalysis={data.classAnalysis}
        deaths={data.deaths}
        resurrects={data.resurrects}
        cpm={data.cpm}
        maxHealth={data.maxHealth}
        maxStamina={data.maxStamina}
        maxMagicka={data.maxMagicka}
        distanceTraveled={data.distanceTraveled}
        reportId={data.reportId}
        fightId={data.fightId}
        playerGear={data.playerGear}
        dpsValue={data.dpsValue}
        hpsValue={data.hpsValue}
        totalDamage={data.totalDamage}
        totalCritDamage={data.totalCritDamage}
        critDps={data.critDps}
        critChance={data.critChance}
        critDamageSummary={data.critDamageSummary}
        barSwapResult={data.barSwapResult}
        potionStreamResult={data.potionStreamResult}
      />
    </Suspense>
  );
};
