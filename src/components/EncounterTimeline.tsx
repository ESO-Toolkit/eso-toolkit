import { Box, Tooltip, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React from 'react';

import type { TrialEncounter, EncounterType } from '../types/trial-encounters';

interface EncounterTimelineProps {
  encounters: readonly TrialEncounter[];
  selectedEncounterId: string | null;
  onSelectEncounter: (encounterId: string) => void;
  /** Set of encounter IDs that have overrides */
  overriddenEncounters?: ReadonlySet<string>;
}

const ENCOUNTER_COLORS: Record<
  EncounterType,
  { bg: string; border: string; bgDark: string; borderDark: string }
> = {
  boss: {
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.5)',
    bgDark: 'rgba(239, 68, 68, 0.18)',
    borderDark: 'rgba(239, 68, 68, 0.6)',
  },
  mini_boss: {
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.5)',
    bgDark: 'rgba(245, 158, 11, 0.18)',
    borderDark: 'rgba(245, 158, 11, 0.6)',
  },
  trash: {
    bg: 'rgba(59, 130, 246, 0.08)',
    border: 'rgba(59, 130, 246, 0.3)',
    bgDark: 'rgba(59, 130, 246, 0.12)',
    borderDark: 'rgba(59, 130, 246, 0.4)',
  },
};

const ENCOUNTER_LABELS: Record<EncounterType, string> = {
  boss: 'Boss',
  mini_boss: 'Mini',
  trash: 'Trash',
};

export const EncounterTimeline: React.FC<EncounterTimelineProps> = React.memo(
  ({ encounters, selectedEncounterId, onSelectEncounter, overriddenEncounters }) => {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
    const optionRefs = React.useRef<Array<HTMLDivElement | null>>([]);

    const handleSelect = (id: string, el: HTMLElement | null): void => {
      onSelectEncounter(id);
      // Center the tapped node so the editor below is comfortably in view.
      el?.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    };

    // The node that carries tabIndex=0 in the roving-tabindex listbox: the
    // selected encounter, or the first node when nothing is selected yet.
    const selectedIndex = encounters.findIndex((e) => e.id === selectedEncounterId);
    const activeIndex = selectedIndex >= 0 ? selectedIndex : 0;

    const focusOption = (index: number): void => {
      const clamped = Math.max(0, Math.min(encounters.length - 1, index));
      const node = optionRefs.current[clamped];
      node?.focus();
      handleSelect(encounters[clamped].id, node);
    };

    const handleKeyDown = (e: React.KeyboardEvent, index: number, id: string): void => {
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          focusOption(index + 1);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          focusOption(index - 1);
          break;
        case 'Home':
          e.preventDefault();
          focusOption(0);
          break;
        case 'End':
          e.preventDefault();
          focusOption(encounters.length - 1);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          handleSelect(id, e.currentTarget as HTMLElement);
          break;
        default:
          break;
      }
    };

    return (
      <Box
        role="listbox"
        aria-label="Encounter timeline — select a fight to customize"
        aria-orientation="horizontal"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          overflowX: 'auto',
          pb: 1,
          // Snap nodes into place on mobile for easier fight-to-fight navigation.
          scrollSnapType: isMobile ? 'x proximity' : 'none',
          // Scrollbar styling
          '&::-webkit-scrollbar': { height: 4 },
          '&::-webkit-scrollbar-track': {
            background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
            borderRadius: 2,
          },
          '&::-webkit-scrollbar-thumb': {
            background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
            borderRadius: 2,
          },
        }}
      >
        {encounters.map((encounter, index) => {
          const isSelected = encounter.id === selectedEncounterId;
          const hasOverride = overriddenEncounters?.has(encounter.id) ?? false;
          const colors = ENCOUNTER_COLORS[encounter.type];
          const isBoss = encounter.type === 'boss';

          return (
            <React.Fragment key={encounter.id}>
              {/* Connector line between nodes */}
              {index > 0 && (
                <Box
                  sx={{
                    width: 20,
                    minWidth: 20,
                    height: 2,
                    background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                    flexShrink: 0,
                  }}
                />
              )}

              {/* Encounter node */}
              <Tooltip
                title={
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {encounter.name}
                    </Typography>
                    {encounter.description && (
                      <Typography variant="caption" sx={{ opacity: 0.85 }}>
                        {encounter.description}
                      </Typography>
                    )}
                  </Box>
                }
                arrow
                placement="top"
              >
                <Box
                  ref={(el: HTMLDivElement | null) => {
                    optionRefs.current[index] = el;
                  }}
                  role="option"
                  aria-selected={isSelected}
                  aria-label={`${encounter.name} — ${ENCOUNTER_LABELS[encounter.type]}${
                    hasOverride ? ', customized' : ''
                  }`}
                  tabIndex={index === activeIndex ? 0 : -1}
                  onClick={(e) => handleSelect(encounter.id, e.currentTarget)}
                  onKeyDown={(e) => handleKeyDown(e, index, encounter.id)}
                  sx={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.5,
                    cursor: 'pointer',
                    flexShrink: 0,
                    minWidth: isBoss ? 80 : 64,
                    scrollSnapAlign: 'center',
                    borderRadius: '12px',
                    // WCAG 2.5.5: ensure a 44px touch target on coarse pointers.
                    '@media (pointer: coarse)': { minHeight: 44 },
                    transition: reduceMotion ? 'none' : 'transform 0.15s ease',
                    '&:hover': {
                      transform: reduceMotion ? 'none' : 'translateY(-2px)',
                    },
                    '&:focus-visible': {
                      outline: '2px solid #38bdf8',
                      outlineOffset: '2px',
                    },
                  }}
                >
                  {/* Node circle */}
                  <Box
                    sx={{
                      width: isBoss ? 40 : 32,
                      height: isBoss ? 40 : 32,
                      borderRadius: isBoss ? '12px' : '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isSelected
                        ? isDark
                          ? colors.borderDark
                          : colors.border
                        : isDark
                          ? colors.bgDark
                          : colors.bg,
                      border: `2px solid ${
                        isSelected
                          ? isDark
                            ? colors.borderDark
                            : colors.border
                          : isDark
                            ? colors.borderDark
                            : colors.border
                      }`,
                      boxShadow: isSelected
                        ? `0 0 0 3px ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}, 0 2px 8px ${colors.border}`
                        : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: isBoss ? '0.6rem' : '0.55rem',
                        fontWeight: 700,
                        letterSpacing: '0.02em',
                        color: isSelected
                          ? '#fff'
                          : isDark
                            ? 'rgba(255,255,255,0.7)'
                            : 'rgba(0,0,0,0.6)',
                        textTransform: 'uppercase',
                      }}
                    >
                      {ENCOUNTER_LABELS[encounter.type]}
                    </Typography>
                  </Box>

                  {/* Override badge */}
                  {hasOverride && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: -2,
                        right: isBoss ? 14 : 10,
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: '#22c55e',
                        border: `2px solid ${isDark ? '#1e1e2e' : '#fff'}`,
                      }}
                    />
                  )}

                  {/* Name label */}
                  <Typography
                    sx={{
                      fontSize: '0.6rem',
                      fontWeight: isSelected ? 600 : 500,
                      color: isSelected
                        ? isDark
                          ? 'rgba(255,255,255,0.9)'
                          : 'rgba(0,0,0,0.85)'
                        : isDark
                          ? 'rgba(255,255,255,0.5)'
                          : 'rgba(0,0,0,0.45)',
                      textAlign: 'center',
                      lineHeight: 1.2,
                      maxWidth: isBoss ? 80 : 64,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      transition: 'color 0.15s ease',
                    }}
                  >
                    {encounter.name}
                  </Typography>
                </Box>
              </Tooltip>
            </React.Fragment>
          );
        })}
      </Box>
    );
  },
);

EncounterTimeline.displayName = 'EncounterTimeline';
