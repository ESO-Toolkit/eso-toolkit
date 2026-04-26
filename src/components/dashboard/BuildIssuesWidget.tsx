import BuildIcon from '@mui/icons-material/Build';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import WarningIcon from '@mui/icons-material/Warning';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import React from 'react';

import { FightFragment } from '../../graphql/gql/graphql';
import { useDamageEventsLookup } from '../../hooks/events/useDamageEvents';
import { usePlayerData } from '../../hooks/usePlayerData';
import { useBuffLookupTask } from '../../hooks/workerTasks/useBuffLookupTask';
import { WidgetScope } from '../../store/dashboard/dashboardSlice';
import { BuildIssue, detectBuildIssues } from '../../utils/detectBuildIssues';

import { BaseWidget } from './BaseWidget';

interface BuildIssuesWidgetProps {
  id: string;
  scope: WidgetScope;
  reportId: string;
  fights: FightFragment[];
  onRemove: () => void;
  onScopeChange: (scope: WidgetScope) => void;
}

interface PlayerBuildIssues {
  playerName: string;
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
  // Always fetch data for up to 5 fights
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

  // Select fights based on scope
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
    fight0,
    fight1,
    fight2,
    fight3,
    fight4,
    buffs0,
    buffs1,
    buffs2,
    buffs3,
    buffs4,
    damage0,
    damage1,
    damage2,
    damage3,
    damage4,
  ]);

  const playerBuildIssues = React.useMemo((): PlayerBuildIssues[] => {
    if (!playerData?.playersById) return [];

    // Aggregate issues across all fights per player, keeping full BuildIssue objects
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
          // Deduplicate by message
          issues.forEach((issue) => playerIssues.set(issue.message, issue));
        }
      });
    });

    // Convert to array format
    const results: PlayerBuildIssues[] = [];
    playerIssuesMap.forEach((issuesMap, playerId) => {
      const player = playerData.playersById[playerId];
      if (player) {
        results.push({
          playerName: player.name,
          issues: Array.from(issuesMap.values()),
        });
      }
    });

    return results.sort((a, b) => b.issues.length - a.issues.length);
  }, [playerData, relevantFights]);

  const isEmpty = playerBuildIssues.length === 0;

  return (
    <BaseWidget
      id={id}
      title="Build Issues"
      scope={scope}
      onRemove={onRemove}
      onScopeChange={onScopeChange}
      isEmpty={isEmpty}
    >
      {playerBuildIssues.map((playerIssue, idx) => (
        <Accordion key={idx} disableGutters elevation={0}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <BuildIcon color="warning" sx={{ mr: 1 }} />
            <Typography>
              {playerIssue.playerName} ({playerIssue.issues.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <List dense>
              {playerIssue.issues.map((issue, issueIdx) => (
                <ListItem key={issueIdx}>
                  <ListItemIcon>
                    <WarningIcon color="warning" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={issue.message}
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      ))}
    </BaseWidget>
  );
};
