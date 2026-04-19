import BuildIcon from '@mui/icons-material/Build';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Box, Collapse, Typography } from '@mui/material';
import React from 'react';

import { FightFragment } from '../../graphql/gql/graphql';
import { useDamageEventsLookup } from '../../hooks/events/useDamageEvents';
import { usePlayerData } from '../../hooks/usePlayerData';
import { useBuffLookupTask } from '../../hooks/workerTasks/useBuffLookupTask';
import { WidgetScope } from '../../store/dashboard/dashboardSlice';
import { BuildIssue, detectBuildIssues } from '../../utils/detectBuildIssues';

import { BaseWidget, WidgetPlayerAvatar, WidgetRolePill } from './BaseWidget';

interface BuildIssuesWidgetProps {
  id: string;
  scope: WidgetScope;
  reportId: string;
  fights: FightFragment[];
  onRemove: () => void;
  onScopeChange: (scope: WidgetScope) => void;
}

interface PlayerBuildIssues {
  playerId: number;
  playerName: string;
  playerClass: string;
  playerRole: string;
  issues: BuildIssue[];
}

export const BuildIssuesWidget: React.FC<BuildIssuesWidgetProps> = ({
  id,
  scope,
  reportId,
  fights,
  onRemove,
  onScopeChange,
}) => {
  const fight0 = fights[0];
  const fight1 = fights[1];
  const fight2 = fights[2];
  const fight3 = fights[3];
  const fight4 = fights[4];

  const { buffLookupData: buffs0 } = useBuffLookupTask({
    context: { reportCode: reportId, fightId: fight0?.id ?? -1 },
  });
  const { buffLookupData: buffs1 } = useBuffLookupTask({
    context: { reportCode: reportId, fightId: fight1?.id ?? -1 },
  });
  const { buffLookupData: buffs2 } = useBuffLookupTask({
    context: { reportCode: reportId, fightId: fight2?.id ?? -1 },
  });
  const { buffLookupData: buffs3 } = useBuffLookupTask({
    context: { reportCode: reportId, fightId: fight3?.id ?? -1 },
  });
  const { buffLookupData: buffs4 } = useBuffLookupTask({
    context: { reportCode: reportId, fightId: fight4?.id ?? -1 },
  });

  const { playerData } = usePlayerData({
    context: { reportCode: reportId, fightId: fight0?.id ?? -1 },
  });

  const { damageEventsByPlayer: damage0 } = useDamageEventsLookup({
    context: { reportCode: reportId, fightId: fight0?.id ?? -1 },
  });
  const { damageEventsByPlayer: damage1 } = useDamageEventsLookup({
    context: { reportCode: reportId, fightId: fight1?.id ?? -1 },
  });
  const { damageEventsByPlayer: damage2 } = useDamageEventsLookup({
    context: { reportCode: reportId, fightId: fight2?.id ?? -1 },
  });
  const { damageEventsByPlayer: damage3 } = useDamageEventsLookup({
    context: { reportCode: reportId, fightId: fight3?.id ?? -1 },
  });
  const { damageEventsByPlayer: damage4 } = useDamageEventsLookup({
    context: { reportCode: reportId, fightId: fight4?.id ?? -1 },
  });

  const relevantFights = React.useMemo(() => {
    const allData = [
      { fight: fight0, buffs: buffs0, damage: damage0 },
      { fight: fight1, buffs: buffs1, damage: damage1 },
      { fight: fight2, buffs: buffs2, damage: damage2 },
      { fight: fight3, buffs: buffs3, damage: damage3 },
      { fight: fight4, buffs: buffs4, damage: damage4 },
    ];

    let numFights = fights.length;
    if (scope === 'most-recent') numFights = 1;
    else if (scope === 'last-3') numFights = 3;
    else if (scope === 'last-5') numFights = 5;

    return allData.slice(0, Math.min(numFights, 5));
  }, [
    scope,
    fights.length,
    fight0, fight1, fight2, fight3, fight4,
    buffs0, buffs1, buffs2, buffs3, buffs4,
    damage0, damage1, damage2, damage3, damage4,
  ]);

  const playerBuildIssues = React.useMemo((): PlayerBuildIssues[] => {
    if (!playerData?.playersById) return [];

    const playerIssuesMap = new Map<number, Map<string, BuildIssue>>();

    relevantFights.forEach(({ fight, buffs, damage }) => {
      if (!fight) return;

      Object.values(playerData.playersById).forEach((player) => {
        const gear = player.combatantInfo?.gear;
        const playerDamageEvents = damage?.[player.id] || [];

        const playerResources =
          playerDamageEvents.length > 0
            ? {
                magicka: playerDamageEvents[0]?.sourceResources?.magicka,
                maxMagicka: playerDamageEvents[0]?.sourceResources?.maxMagicka,
                stamina: playerDamageEvents[0]?.sourceResources?.stamina,
                maxStamina: playerDamageEvents[0]?.sourceResources?.maxStamina,
              }
            : undefined;

        const issues = detectBuildIssues(
          gear,
          buffs || undefined,
          fight.startTime,
          fight.endTime ?? fight.startTime,
          [],
          player.role,
          playerDamageEvents,
          player.id,
          playerResources,
        );

        if (issues.length > 0) {
          if (!playerIssuesMap.has(player.id)) {
            playerIssuesMap.set(player.id, new Map());
          }
          const playerIssues = playerIssuesMap.get(player.id)!;
          issues.forEach((issue) => playerIssues.set(issue.message, issue));
        }
      });
    });

    const results: PlayerBuildIssues[] = [];
    playerIssuesMap.forEach((issuesMap, playerId) => {
      const player = playerData.playersById[playerId];
      if (player) {
        results.push({
          playerId,
          playerName: player.name,
          playerClass: player.type,
          playerRole: player.role,
          issues: Array.from(issuesMap.values()),
        });
      }
    });

    return results.sort((a, b) => b.issues.length - a.issues.length);
  }, [playerData, relevantFights]);

  const [openId, setOpenId] = React.useState<number | null>(
    playerBuildIssues[0]?.playerId ?? null,
  );

  React.useEffect(() => {
    if (playerBuildIssues.length > 0 && openId === null) {
      setOpenId(playerBuildIssues[0].playerId);
    }
  }, [playerBuildIssues, openId]);

  const isEmpty = playerBuildIssues.length === 0;

  return (
    <BaseWidget
      id={id}
      title="Build Issues"
      subtitle="Gear · CP · mundus · resources"
      kind="build"
      icon={<BuildIcon />}
      scope={scope}
      onRemove={onRemove}
      onScopeChange={onScopeChange}
      isEmpty={isEmpty}
    >
      {playerBuildIssues.map((row) => {
        const isOpen = openId === row.playerId;
        return (
          <Box
            key={row.playerId}
            sx={{ borderBottom: '1px solid rgba(148,163,184,0.06)', '&:last-child': { borderBottom: 'none' } }}
          >
            {/* Accordion head */}
            <Box
              onClick={() => setOpenId(isOpen ? null : row.playerId)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                p: '10px 16px',
                cursor: 'pointer',
                '&:hover': { background: 'rgba(56,189,248,0.03)' },
              }}
            >
              <ChevronRightIcon
                sx={{
                  width: 14,
                  height: 14,
                  color: 'rgba(255,255,255,0.3)',
                  flexShrink: 0,
                  transition: 'transform 0.2s',
                  transform: isOpen ? 'rotate(90deg)' : 'none',
                }}
              />
              <WidgetPlayerAvatar className={row.playerClass} size={26} />
              <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Typography sx={{ fontWeight: 600, color: '#ffffff', fontSize: 13 }}>
                  {row.playerName}
                </Typography>
                <WidgetRolePill role={row.playerRole} />
              </Box>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 22,
                  height: 22,
                  px: '6px',
                  borderRadius: '9999px',
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  background: 'rgba(255,213,79,0.15)',
                  color: '#ffd54f',
                  border: '1px solid rgba(255,213,79,0.3)',
                }}
              >
                {row.issues.length}
              </Box>
            </Box>

            {/* Accordion body */}
            <Collapse in={isOpen}>
              <Box sx={{ pb: '10px', pl: '44px', pr: '16px' }}>
                {row.issues.map((issue, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      py: '6px',
                      fontSize: 12,
                      lineHeight: 1.5,
                      color: 'rgba(255,255,255,0.72)',
                      '&::before': {
                        content: '""',
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        background: '#ff9a4a',
                        mt: '8px',
                        flexShrink: 0,
                      },
                    }}
                  >
                    <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', lineHeight: 1.5 }}>
                      {issue.message}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Collapse>
          </Box>
        );
      })}
    </BaseWidget>
  );
};
