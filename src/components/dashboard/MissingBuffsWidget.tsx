import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { Box, CircularProgress, Typography } from '@mui/material';
import React from 'react';

import { FightFragment } from '../../graphql/gql/graphql';
import { usePlayerData } from '../../hooks/usePlayerData';
import { useMultiFightBuffLookup } from '../../hooks/workerTasks/useMultiFightBuffLookup';
import { WidgetScope } from '../../store/dashboard/dashboardSlice';
import { isBuffActiveOnTarget } from '../../utils/BuffLookupUtils';

import { BaseWidget } from './BaseWidget';

interface MissingBuffsWidgetProps {
  id: string;
  scope: WidgetScope;
  reportId: string;
  fights: FightFragment[];
  onRemove: () => void;
  onScopeChange: (scope: WidgetScope) => void;
}

const IMPORTANT_BUFFS = [
  { id: 61746, name: 'Major Brutality', sub: 'DPS · checked @ midpoint', roles: ['dps' as const] },
  { id: 61747, name: 'Major Sorcery', sub: 'DPS · checked @ midpoint', roles: ['dps' as const] },
  { id: 61744, name: 'Minor Berserk', sub: 'DPS · checked @ midpoint', roles: ['dps' as const] },
];

interface BuffMissingInfo {
  buffName: string;
  sub: string;
  playerNames: string[];
}

export const MissingBuffsWidget: React.FC<MissingBuffsWidgetProps> = ({
  id,
  scope,
  reportId,
  fights,
  onRemove,
  onScopeChange,
}) => {
  const { fightBuffData, isLoading: isBuffDataLoading } = useMultiFightBuffLookup({
    reportCode: reportId,
    fights,
    scope,
  });

  const mostRecentFight = fights[0];
  const { playerData } = usePlayerData({
    context: { reportCode: reportId, fightId: mostRecentFight?.id ?? -1 },
  });

  const missingBuffs = React.useMemo((): BuffMissingInfo[] => {
    if (!playerData?.playersById || fightBuffData.size === 0) return [];

    const analyzedFights = fights.filter((fight) => fightBuffData.has(fight.id));
    if (analyzedFights.length === 0) return [];

    const buffToPlayersMap = new Map<string, Set<string>>();

    analyzedFights.forEach((fight) => {
      const buffLookupData = fightBuffData.get(fight.id);
      if (!buffLookupData) return;

      const fightMidpoint = (fight.startTime + (fight.endTime ?? fight.startTime)) / 2;

      Object.values(playerData.playersById).forEach((player) => {
        IMPORTANT_BUFFS.forEach((buff) => {
          if (!(buff.roles as readonly string[]).includes(player.role)) return;

          const hasBuffAtMidpoint = isBuffActiveOnTarget(
            buffLookupData,
            buff.id,
            fightMidpoint,
            player.id,
          );

          if (!hasBuffAtMidpoint) {
            if (!buffToPlayersMap.has(buff.name)) {
              buffToPlayersMap.set(buff.name, new Set());
            }
            buffToPlayersMap.get(buff.name)!.add(player.name);
          }
        });
      });
    });

    return IMPORTANT_BUFFS.map((buff) => ({
      buffName: buff.name,
      sub: buff.sub,
      playerNames: Array.from(buffToPlayersMap.get(buff.name) ?? []).sort(),
    }));
  }, [playerData, fightBuffData, fights]);

  const isEmpty =
    missingBuffs.length === 0 || missingBuffs.every((b) => b.playerNames.length === 0);

  return (
    <BaseWidget
      id={id}
      title="Missing Buffs"
      subtitle="At fight midpoint"
      kind="buffs"
      icon={<AutoAwesomeIcon />}
      scope={scope}
      onRemove={onRemove}
      onScopeChange={onScopeChange}
      isEmpty={isEmpty}
    >
      {isBuffDataLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
          <CircularProgress size={32} />
        </Box>
      ) : (
        missingBuffs.map((item) => (
          <Box
            key={item.buffName}
            sx={{
              p: '10px 16px',
              borderBottom: '1px solid rgba(148,163,184,0.06)',
              '&:last-child': { borderBottom: 'none' },
            }}
          >
            {/* Buff label row */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', mb: '6px' }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#ffd54f',
                  boxShadow: '0 0 6px rgba(255,213,79,0.5)',
                  flexShrink: 0,
                }}
              />
              <Typography
                sx={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.005em', color: '#ffffff' }}
              >
                {item.buffName}
              </Typography>
              <Typography
                sx={{
                  ml: 'auto',
                  fontSize: 10,
                  fontWeight: 500,
                  fontFamily: 'monospace',
                  letterSpacing: '0.04em',
                  color: 'rgba(255,255,255,0.3)',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.playerNames.length > 0 ? `${item.playerNames.length} missing` : item.sub}
              </Typography>
            </Box>

            {/* Players */}
            {item.playerNames.length === 0 ? (
              <Typography
                sx={{ pl: '16px', fontSize: 11, color: '#5ce572', fontFamily: 'monospace' }}
              >
                ✓ all players active
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '4px', pl: '16px' }}>
                {item.playerNames.map((name) => (
                  <Box
                    key={name}
                    component="span"
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      px: '8px',
                      py: '3px',
                      borderRadius: '9999px',
                      background: 'rgba(255,102,102,0.08)',
                      border: '1px solid rgba(255,102,102,0.22)',
                      fontSize: 11,
                      color: '#ffc5c5',
                    }}
                  >
                    {name.split(' ')[0]}
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        ))
      )}
    </BaseWidget>
  );
};
