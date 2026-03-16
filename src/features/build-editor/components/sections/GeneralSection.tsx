/**
 * General Section — build identity: class, role, game mode, races.
 * Glass-style inputs, accent-themed race chips.
 */

import { Box, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

import { ESO_CLASSES, ESO_GAME_MODES, ESO_RACES, ESO_ROLES } from '../../data/esoStaticData';
import {
  setBuildClass,
  setBuildGameMode,
  setBuildRaces,
  setBuildRole,
} from '../../store/buildEditorSlice';
import type { CombatRole, ESOClass, GameMode } from '../../types/build.types';
import { IconPickerGrid } from '../primitives/IconPickerGrid';

/** Alliance groups — canonical ESO faction colors */
const ALLIANCE_GROUPS = [
  {
    id: 'ebonheart' as const,
    label: 'Ebonheart Pact',
    color: '#ef4444',
    raceIds: ['nord', 'darkelf', 'argonian'],
  },
  {
    id: 'daggerfall' as const,
    label: 'Daggerfall Covenant',
    color: '#3b82f6',
    raceIds: ['breton', 'redguard', 'orc'],
  },
  {
    id: 'aldmeri' as const,
    label: 'Aldmeri Dominion',
    color: '#f59e0b',
    raceIds: ['highelf', 'woodelf', 'khajiit'],
  },
];

/** Shared section label styles */
const sectionLabelSx = {
  fontWeight: 700,
  mb: 0.75,
  display: 'block',
  fontSize: 11,
  letterSpacing: 0.8,
  textTransform: 'uppercase' as const,
  fontFamily: 'Space Grotesk, Inter, system-ui',
};

export const GeneralSection: React.FC = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { build } = useSelector((s: RootState) => s.buildEditor);

  const toggleRace = (raceId: string): void => {
    const next = build.races.includes(raceId)
      ? build.races.filter((r) => r !== raceId)
      : [...build.races, raceId];
    dispatch(setBuildRaces(next));
  };

  return (
    <Stack spacing={2.5}>
      {/* Class — IconPickerGrid */}
      <IconPickerGrid
        label="Class"
        options={ESO_CLASSES.map((c) => ({
          id: c.id,
          label: c.label,
          color: c.color,
        }))}
        value={build.esoClass}
        onChange={(id) => dispatch(setBuildClass(id as ESOClass))}
        columns={4}
      />

      {/* Combat Role — IconPickerGrid */}
      <IconPickerGrid
        label="Combat Role"
        options={ESO_ROLES.map((r) => ({
          id: r.id,
          label: r.shortLabel,
          color: r.color,
          description: r.label,
        }))}
        value={build.role}
        onChange={(id) => dispatch(setBuildRole(id as CombatRole))}
        columns={5}
      />

      {/* Game Mode — IconPickerGrid */}
      <IconPickerGrid
        label="Game Mode"
        options={ESO_GAME_MODES.map((m) => ({
          id: m.id,
          label: m.label,
        }))}
        value={build.gameMode}
        onChange={(id) => dispatch(setBuildGameMode(id as GameMode))}
        columns={2}
      />

      {/* Optimal Races — grouped by alliance */}
      <Box>
        <Typography variant="caption" color="text.secondary" sx={sectionLabelSx}>
          Optimal Races
        </Typography>
        <Stack spacing={1.5}>
          {ALLIANCE_GROUPS.map(({ id: allianceId, label: allianceLabel, color, raceIds }) => {
            const races = ESO_RACES.filter((r) => raceIds.includes(r.id));
            return (
              <Box key={allianceId}>
                {/* Alliance header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: color,
                      boxShadow: `0 0 6px ${alpha(color, 0.55)}`,
                      flexShrink: 0,
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: 0.6,
                      textTransform: 'uppercase',
                      color: alpha(color, isDark ? 0.75 : 0.65),
                      fontFamily: 'Space Grotesk, Inter, system-ui',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {allianceLabel}
                  </Typography>
                  <Box
                    sx={{
                      flex: 1,
                      height: '1px',
                      background: `linear-gradient(to right, ${alpha(color, 0.2)}, transparent)`,
                    }}
                  />
                </Box>

                {/* Race cards grid — 3 per alliance */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 0.75,
                  }}
                >
                  {races.map((race) => {
                    const selected = build.races.includes(race.id);
                    return (
                      <Box key={race.id} sx={{ position: 'relative' }}>
                        <Box
                          component="button"
                          role="checkbox"
                          aria-checked={selected}
                          aria-label={race.label}
                          onClick={() => toggleRace(race.id)}
                          sx={{
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 0.6,
                            py: 1.25,
                            px: 0.75,
                            borderRadius: '10px',
                            width: '100%',
                            fontFamily: 'inherit',
                            background: selected
                              ? alpha(color, isDark ? 0.14 : 0.08)
                              : isDark
                                ? 'rgba(255,255,255,0.03)'
                                : 'rgba(0,0,0,0.02)',
                            outline: selected
                              ? 'none'
                              : `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}`,
                            outlineOffset: -1,
                            boxShadow: selected
                              ? `0 0 14px ${alpha(color, 0.25)}, 0 2px 8px ${alpha(color, 0.12)}`
                              : 'none',
                            transition: 'background 0.2s, box-shadow 0.25s',
                            '&:hover': {
                              background: selected
                                ? alpha(color, isDark ? 0.19 : 0.12)
                                : isDark
                                  ? 'rgba(255,255,255,0.06)'
                                  : 'rgba(0,0,0,0.04)',
                            },
                          }}
                        >
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: color,
                              boxShadow: selected
                                ? `0 0 10px ${alpha(color, 0.7)}, 0 0 4px ${alpha(color, 0.9)}`
                                : `0 0 4px ${alpha(color, 0.2)}`,
                              transition: 'box-shadow 0.25s',
                              flexShrink: 0,
                            }}
                          />
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: selected ? 700 : 500,
                              color: selected ? color : 'text.secondary',
                              lineHeight: 1.2,
                              textAlign: 'center',
                              fontSize: 11,
                              fontFamily: 'Space Grotesk, Inter, system-ui',
                              transition: 'color 0.15s',
                            }}
                          >
                            {race.label}
                          </Typography>
                        </Box>

                        {/* Gradient border mask — selected only */}
                        {selected && (
                          <Box
                            sx={{
                              position: 'absolute',
                              inset: 0,
                              borderRadius: '10px',
                              padding: '1.5px',
                              background: `linear-gradient(135deg, ${alpha(color, 0.7)} 0%, ${alpha(color, 0.15)} 50%, ${alpha(color, 0.4)} 100%)`,
                              WebkitMask:
                                'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                              WebkitMaskComposite: 'xor',
                              mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                              maskComposite: 'exclude',
                              pointerEvents: 'none',
                            }}
                          />
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            );
          })}

          {/* Imperial — spans full width, any alliance */}
          {(() => {
            const imperial = ESO_RACES.find((r) => r.alliance === 'any');
            if (!imperial) return null;
            const selected = build.races.includes(imperial.id);
            const color = '#94a3b8';
            return (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: color,
                      boxShadow: `0 0 6px ${alpha(color, 0.55)}`,
                      flexShrink: 0,
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: 0.6,
                      textTransform: 'uppercase',
                      color: alpha(color, isDark ? 0.75 : 0.65),
                      fontFamily: 'Space Grotesk, Inter, system-ui',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Any Alliance
                  </Typography>
                  <Box
                    sx={{
                      flex: 1,
                      height: '1px',
                      background: `linear-gradient(to right, ${alpha(color, 0.2)}, transparent)`,
                    }}
                  />
                </Box>
                <Box sx={{ position: 'relative' }}>
                  <Box
                    component="button"
                    role="checkbox"
                    aria-checked={selected}
                    aria-label={imperial.label}
                    onClick={() => toggleRace(imperial.id)}
                    sx={{
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                      py: 1,
                      px: 2,
                      borderRadius: '10px',
                      width: '100%',
                      fontFamily: 'inherit',
                      background: selected
                        ? alpha(color, isDark ? 0.14 : 0.08)
                        : isDark
                          ? 'rgba(255,255,255,0.03)'
                          : 'rgba(0,0,0,0.02)',
                      outline: selected
                        ? 'none'
                        : `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}`,
                      outlineOffset: -1,
                      boxShadow: selected
                        ? `0 0 14px ${alpha(color, 0.25)}, 0 2px 8px ${alpha(color, 0.12)}`
                        : 'none',
                      transition: 'background 0.2s, box-shadow 0.25s',
                      '&:hover': {
                        background: selected
                          ? alpha(color, isDark ? 0.19 : 0.12)
                          : isDark
                            ? 'rgba(255,255,255,0.06)'
                            : 'rgba(0,0,0,0.04)',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: color,
                        boxShadow: selected
                          ? `0 0 10px ${alpha(color, 0.7)}, 0 0 4px ${alpha(color, 0.9)}`
                          : `0 0 4px ${alpha(color, 0.2)}`,
                        transition: 'box-shadow 0.25s',
                        flexShrink: 0,
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: selected ? 700 : 500,
                        color: selected ? color : 'text.secondary',
                        fontSize: 11,
                        fontFamily: 'Space Grotesk, Inter, system-ui',
                        transition: 'color 0.15s',
                      }}
                    >
                      {imperial.label}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: 10,
                        color: alpha(color, 0.5),
                        fontFamily: 'Space Grotesk, Inter, system-ui',
                      }}
                    >
                      · playable in any alliance
                    </Typography>
                  </Box>
                  {selected && (
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '10px',
                        padding: '1.5px',
                        background: `linear-gradient(135deg, ${alpha(color, 0.7)} 0%, ${alpha(color, 0.15)} 50%, ${alpha(color, 0.4)} 100%)`,
                        WebkitMask:
                          'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                        WebkitMaskComposite: 'xor',
                        mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                        maskComposite: 'exclude',
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                </Box>
              </Box>
            );
          })()}
        </Stack>
      </Box>

    </Stack>
  );
};
