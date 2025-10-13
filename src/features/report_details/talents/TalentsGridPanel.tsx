import { Box, Typography, Avatar, Chip, Card, CardContent, Stack, Button } from '@mui/material';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import React, { useMemo } from 'react';

import { DataGrid } from '../../../components/LazyDataGrid';
import { useLogger } from '../../../contexts/LoggerContext';
import { FightFragment } from '../../../graphql/generated';
import { usePlayerData } from '../../../hooks';
import { PlayerTalent } from '../../../types/playerDetails';
import { resolveActorName } from '../../../utils/resolveActorName';

interface TalentsGridPanelProps {
  fight: FightFragment;
}

interface TalentRow {
  guid: number;
  name: string;
  type: number;
  abilityIcon: string;
  flags: number;
  playerCount: number;
  playerNames: string[];
  rawTalentData: PlayerTalent;
}

export const TalentsGridPanel: React.FC<TalentsGridPanelProps> = ({ fight }) => {
  const { playerData } = usePlayerData();
  const logger = useLogger('TalentsGridPanel');

  // Transform talent data for DataGrid
  const talentRows = useMemo((): TalentRow[] => {
    if (!playerData?.playersById || !fight?.friendlyPlayers) return [];

    const talentMap = new Map<number, TalentRow>();

    // Get all friendly players in the fight
    fight.friendlyPlayers?.forEach((fightPlayer) => {
      if (!fightPlayer) return;

      const player = playerData.playersById[String(fightPlayer)];
      if (!player) return;

      const playerName = resolveActorName(player, fightPlayer);
      const combatantInfo = player.combatantInfo;
      const talents = combatantInfo?.talents || [];

      talents.forEach((talent: PlayerTalent) => {
        if (talentMap.has(talent.guid)) {
          const existingTalent = talentMap.get(talent.guid);
          if (existingTalent) {
            existingTalent.playerCount += 1;
            existingTalent.playerNames.push(playerName);
          }
        } else {
          talentMap.set(talent.guid, {
            guid: talent.guid,
            name: talent.name || 'Unknown Talent',
            type: talent.type || 0,
            abilityIcon: talent.abilityIcon || '',
            flags: talent.flags || 0,
            playerCount: 1,
            playerNames: [playerName],
            rawTalentData: talent,
          });
        }
      });
    });

    return Array.from(talentMap.values());
  }, [playerData, fight]);

  // Create column helper
  const columnHelper = createColumnHelper<TalentRow>();

  // Define columns for the table
  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'icon',
        header: 'Icon',
        cell: (info) => (
          <Avatar
            src={info.row.original.abilityIcon}
            sx={{ width: 32, height: 32 }}
            variant="rounded"
          />
        ),
        size: 60,
      }),
      columnHelper.accessor('name', {
        header: 'Talent Name',
        cell: (info) => (
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {info.getValue()}
          </Typography>
        ),
        size: 250,
      }),
      columnHelper.accessor('type', {
        header: 'Type',
        cell: (info) => (
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
            {info.getValue()}
          </Typography>
        ),
        size: 80,
      }),
      columnHelper.accessor('flags', {
        header: 'Flags',
        cell: (info) => (
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
            {info.getValue()}
          </Typography>
        ),
        size: 80,
      }),
      columnHelper.accessor('playerCount', {
        header: 'Players',
        cell: (info) => (
          <Typography variant="body2" sx={{ textAlign: 'center', fontWeight: 600 }}>
            {info.getValue()}
          </Typography>
        ),
        size: 100,
      }),
      columnHelper.accessor('playerNames', {
        header: 'Player Names',
        cell: (info) => (
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
            {info.getValue().map((playerName, index) => (
              <Chip
                key={`${info.row.original.guid}-${index}`}
                label={playerName}
                size="small"
                variant="outlined"
                color="default"
              />
            ))}
          </Stack>
        ),
        size: 300,
        filterFn: (row, columnId, value) => {
          const playerNames = row.getValue(columnId) as string[];
          return playerNames.some((name) => name.toLowerCase().includes(value.toLowerCase()));
        },
      }),
      columnHelper.display({
        id: 'copyJson',
        header: 'Raw JSON',
        cell: (info) => {
          const handleCopyJson = async (): Promise<void> => {
            try {
              const jsonString = JSON.stringify(info.row.original.rawTalentData, null, 2);
              await navigator.clipboard.writeText(jsonString);
            } catch (error) {
              logger.error('Failed to copy talent data to clipboard', error as Error, {
                talentGuid: info.row.original.guid,
              });
              // Fallback: create a temporary textarea element
              const textarea = document.createElement('textarea');
              textarea.value = JSON.stringify(info.row.original.rawTalentData, null, 2);
              document.body.appendChild(textarea);
              textarea.select();
              document.execCommand('copy');
              document.body.removeChild(textarea);
            }
          };

          return (
            <Button
              variant="outlined"
              size="small"
              onClick={handleCopyJson}
              sx={{ fontSize: '0.75rem' }}
            >
              Copy JSON
            </Button>
          );
        },
        size: 120,
      }),
    ],
    [columnHelper, logger],
  );

  if (talentRows.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No talent data available for this fight
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Talent information may not be available for this report or fight.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Player Talents Overview
      </Typography>

      <Stack spacing={3}>
        {/* Summary Stats */}
        <Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Card variant="outlined" sx={{ flex: 1 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary" data-testid="unique-talents-count">
                  {talentRows.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Unique Talents
                </Typography>
              </CardContent>
            </Card>
            <Card variant="outlined" sx={{ flex: 1 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="secondary" data-testid="players-in-fight-count">
                  {fight.friendlyPlayers?.length || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Players in Fight
                </Typography>
              </CardContent>
            </Card>
          </Stack>
        </Box>

        {/* Talents Grid */}
        <Box data-testid="talents-grid-panel">
          <DataGrid
            data={talentRows as unknown as Record<string, unknown>[]}
            columns={columns as ColumnDef<Record<string, unknown>>[]}
            title={`Talents (${talentRows.length} unique)`}
            height={600}
            initialPageSize={25}
            pageSizeOptions={[25, 50, 100]}
            enableSorting={true}
            enableFiltering={true}
            enablePagination={true}
            emptyMessage="No talents found matching your search criteria"
          />
        </Box>
      </Stack>
    </Box>
  );
};
