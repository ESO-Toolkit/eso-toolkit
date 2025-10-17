import { ContentCopy } from '@mui/icons-material';
import { IconButton, Tooltip, Typography } from '@mui/material';
import { createColumnHelper, ColumnDef } from '@tanstack/react-table';
import React from 'react';

import { DataGrid } from '../../../components/LazyDataGrid';
import { ReportActorFragment } from '../../../graphql/gql/graphql';
import { PlayerDetailsWithRole } from '../../../store/player_data/playerDataSlice';
import { CombatantInfoEvent } from '../../../types/combatlogEvents';

interface Actor {
  id: string | number;
  name: string;
  displayName: string | null;
  type: string;
  subType: string | null;
  server: string;
  gameID: number;
  [key: string]: unknown; // Add index signature for DataGrid compatibility
}

interface ActorsPanelViewProps {
  actors: Actor[];
  playersById: Record<string | number, PlayerDetailsWithRole> | undefined;
  actorsById: Record<string | number, ReportActorFragment> | undefined;
  combatantInfoEvents: CombatantInfoEvent[];
}

export const ActorsPanelView: React.FC<ActorsPanelViewProps> = ({
  actors,
  playersById,
  actorsById,
  combatantInfoEvents,
}) => {
  // Function to copy playersById entry to clipboard
  const copyPlayerData = React.useCallback(
    async (actorId: string | number) => {
      if (!playersById) {
        return;
      }

      const playerData = playersById[actorId];
      if (playerData) {
        try {
          await navigator.clipboard.writeText(JSON.stringify(playerData, null, 2));
        } catch {
          // Fallback: create a temporary textarea element
          const textArea = document.createElement('textarea');
          textArea.value = JSON.stringify(playerData, null, 2);
          document.body.appendChild(textArea);
          textArea.select();
          try {
            document.execCommand('copy');
          } catch {
            // Copy command failed - fallback already created textarea
          }
          document.body.removeChild(textArea);
        }
      }
    },
    [playersById],
  );

  // Function to copy actorsById entry to clipboard
  const copyActorData = React.useCallback(
    async (actorId: string | number) => {
      if (!actorsById) {
        return;
      }

      const actorData = actorsById[actorId];
      if (actorData) {
        try {
          await navigator.clipboard.writeText(JSON.stringify(actorData, null, 2));
        } catch {
          // Fallback: create a temporary textarea element
          const textArea = document.createElement('textarea');
          textArea.value = JSON.stringify(actorData, null, 2);
          document.body.appendChild(textArea);
          textArea.select();
          try {
            document.execCommand('copy');
          } catch {
            // Copy command failed - fallback already created textarea
          }
          document.body.removeChild(textArea);
        }
      }
    },
    [actorsById],
  );

  // Function to copy combatant info events for a specific player
  const copyCombatantInfoEvents = React.useCallback(
    async (actorId: string | number) => {
      // Filter combatant info events for this specific actor
      const playerCombatantInfoEvents = combatantInfoEvents.filter(
        (event) => String(event.sourceID) === String(actorId),
      );

      if (playerCombatantInfoEvents.length === 0) {
        return;
      }

      try {
        await navigator.clipboard.writeText(JSON.stringify(playerCombatantInfoEvents, null, 2));
      } catch {
        // Fallback: create a temporary textarea element
        const textArea = document.createElement('textarea');
        textArea.value = JSON.stringify(playerCombatantInfoEvents, null, 2);
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
        } catch {
          // Copy command failed - fallback already created textarea
        }
        document.body.removeChild(textArea);
      }
    },
    [combatantInfoEvents],
  );

  // Create column helper
  const columnHelper = createColumnHelper<Actor>();

  // Define columns for the table
  const columns = React.useMemo(
    () => [
      columnHelper.accessor('id', {
        header: 'ID',
        size: 100,
      }),
      columnHelper.accessor('name', {
        header: 'Name',
        size: 200,
      }),
      columnHelper.accessor('displayName', {
        header: 'Display Name',
        size: 200,
        cell: (info) => info.getValue() ?? '-',
      }),
      columnHelper.accessor('type', {
        header: 'Type',
        size: 100,
      }),
      columnHelper.accessor('subType', {
        header: 'Sub Type',
        size: 120,
        cell: (info) => info.getValue() ?? '-',
      }),
      columnHelper.accessor('server', {
        header: 'Server',
        size: 150,
      }),
      columnHelper.accessor('gameID', {
        header: 'Game ID',
        size: 100,
      }),
      // Copy PlayersById Entry column
      columnHelper.display({
        id: 'copyPlayerData',
        header: 'Copy Player Data',
        size: 150,
        cell: (info) => {
          const actorId = info.row.original.id;

          if (!playersById) {
            return (
              <Typography variant="body2" color="text.secondary">
                No data
              </Typography>
            );
          }

          const playerData = playersById[actorId];

          if (!playerData) {
            return (
              <Typography variant="body2" color="text.secondary">
                No data
              </Typography>
            );
          }

          return (
            <Tooltip title="Copy playersById entry to clipboard">
              <IconButton size="small" onClick={() => copyPlayerData(actorId)} color="primary">
                <ContentCopy fontSize="small" />
              </IconButton>
            </Tooltip>
          );
        },
      }),
      // Copy ActorsById Entry column
      columnHelper.display({
        id: 'copyActorData',
        header: 'Copy Actor Data',
        size: 150,
        cell: (info) => {
          const actorId = info.row.original.id;
          const actorData = actorsById && actorsById[actorId];

          if (!actorData) {
            return (
              <Typography variant="body2" color="text.secondary">
                No data
              </Typography>
            );
          }

          return (
            <Tooltip title="Copy actorsById entry to clipboard">
              <IconButton size="small" onClick={() => copyActorData(actorId)} color="secondary">
                <ContentCopy fontSize="small" />
              </IconButton>
            </Tooltip>
          );
        },
      }),
      // Copy Combatant Info Events column
      columnHelper.display({
        id: 'copyCombatantInfo',
        header: 'Copy Combatant Info',
        size: 160,
        cell: (info) => {
          const actorId = info.row.original.id;
          const playerCombatantInfoEvents = combatantInfoEvents.filter(
            (event) => String(event.sourceID) === String(actorId),
          );

          if (playerCombatantInfoEvents.length === 0) {
            return (
              <Typography variant="body2" color="text.secondary">
                No events
              </Typography>
            );
          }

          return (
            <Tooltip
              title={`Copy ${playerCombatantInfoEvents.length} combatant info event(s) to clipboard`}
            >
              <IconButton
                size="small"
                onClick={() => copyCombatantInfoEvents(actorId)}
                color="info"
              >
                <ContentCopy fontSize="small" />
              </IconButton>
            </Tooltip>
          );
        },
      }),
    ],
    [
      columnHelper,
      playersById,
      copyPlayerData,
      actorsById,
      copyActorData,
      combatantInfoEvents,
      copyCombatantInfoEvents,
    ],
  );

  return (
    <DataGrid
      data={actors}
      columns={columns as ColumnDef<Record<string, unknown>>[]}
      title={`All Actors in Report (${actors.length} total)`}
      height={600}
      initialPageSize={25}
      pageSizeOptions={[25, 50, 100]}
      enableSorting={true}
      enableFiltering={true}
      enablePagination={true}
      emptyMessage="No actors found"
    />
  );
};
