import {
  Avatar,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import { ColumnDef } from '@tanstack/react-table';
import React from 'react';

import { DataGrid } from '../../../components/LazyDataGrid';
import { useReportMasterData } from '../../../hooks';

import { DebuffOverviewData } from './DebuffsOverviewPanel';

interface PlayerOption {
  id: number;
  name: string;
}

interface DebuffsOverviewPanelViewProps {
  debuffOverviewData: DebuffOverviewData[];
  isLoading: boolean;
  error?: string | null;
  selectedTargetId?: number | null;
  selectedPlayerId?: number | null;
  availablePlayers: PlayerOption[];
  onPlayerChange: (playerId: number | null) => void;
}

export const DebuffsOverviewPanelView: React.FC<DebuffsOverviewPanelViewProps> = ({
  debuffOverviewData,
  isLoading,
  error,
  selectedTargetId,
  selectedPlayerId,
  availablePlayers,
  onPlayerChange,
}) => {
  const { reportMasterData } = useReportMasterData();

  // Get target name for display purposes
  const targetName = React.useMemo(() => {
    if (!selectedTargetId || !reportMasterData?.actorsById) {
      return null;
    }

    const target = reportMasterData.actorsById[selectedTargetId];
    return target?.name || `Target ${selectedTargetId}`;
  }, [selectedTargetId, reportMasterData?.actorsById]);

  // Get player name for display purposes
  const playerName = React.useMemo(() => {
    if (!selectedPlayerId) return null;
    const player = availablePlayers.find((p) => p.id === selectedPlayerId);
    return player?.name || `Player ${selectedPlayerId}`;
  }, [selectedPlayerId, availablePlayers]);

  // Handler for player selection change
  const handlePlayerChange = React.useCallback(
    (event: SelectChangeEvent<string>) => {
      const value = event.target.value;
      onPlayerChange(value === 'ALL_PLAYERS' ? null : Number(value));
    },
    [onPlayerChange],
  );
  // Column definitions for the DataGrid
  const columns = React.useMemo<ColumnDef<DebuffOverviewData>[]>(
    () => [
      {
        accessorKey: 'debuffName',
        header: 'Debuff Name',
        size: 300,
        cell: ({ row }) => {
          const { debuffName, icon } = row.original;
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
              {icon && (
                <Avatar
                  src={`https://assets.rpglogs.com/img/eso/abilities/${icon}.png`}
                  alt={debuffName}
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: 1,
                    flexShrink: 0,
                  }}
                />
              )}
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  minWidth: 0,
                  flex: 1,
                }}
              >
                {debuffName}
              </Typography>
            </Box>
          );
        },
      },
      {
        accessorKey: 'debuffId',
        header: 'ID',
        size: 100,
        cell: ({ getValue }) => (
          <Typography
            variant="body2"
            sx={{
              fontVariantNumeric: 'tabular-nums',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              color: 'text.secondary',
            }}
          >
            {getValue() as number}
          </Typography>
        ),
      },
      {
        accessorKey: 'activeTargetsCount',
        header: 'Targets',
        size: 100,
        cell: ({ getValue }) => (
          <Typography
            variant="body2"
            sx={{
              fontVariantNumeric: 'tabular-nums',
              fontWeight: 600,
              color: 'primary.main',
            }}
          >
            {getValue() as number}
          </Typography>
        ),
      },
      {
        accessorKey: 'totalApplications',
        header: 'Applications',
        size: 120,
        cell: ({ getValue }) => (
          <Typography
            variant="body2"
            sx={{
              fontVariantNumeric: 'tabular-nums',
              color: 'text.secondary',
            }}
          >
            {(getValue() as number).toLocaleString()}
          </Typography>
        ),
      },
      {
        accessorKey: 'extraAbilities',
        header: 'Extra Abilities',
        size: 250,
        cell: ({ row }) => {
          const { extraAbilities } = row.original;

          if (!extraAbilities || extraAbilities.length === 0) {
            return (
              <Typography
                variant="body2"
                sx={{
                  color: 'text.disabled',
                  fontStyle: 'italic',
                }}
              >
                —
              </Typography>
            );
          }

          return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0 }}>
              {extraAbilities.map((extraAbility, index) => (
                <Box key={extraAbility.id} sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      minWidth: 0,
                    }}
                  >
                    {extraAbility.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      fontFamily: 'monospace',
                      color: 'text.secondary',
                      fontSize: '0.7rem',
                    }}
                  >
                    ID: {extraAbility.id}
                  </Typography>
                  {index < extraAbilities.length - 1 && <Box sx={{ height: '4px' }} />}
                </Box>
              ))}
            </Box>
          );
        },
      },
    ],
    [],
  );

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography
        variant="h6"
        sx={{
          mb: 2,
          color: 'text.primary',
          fontWeight: 600,
        }}
      >
        {targetName && playerName
          ? `Debuffs Overview - ${targetName} (by ${playerName})`
          : targetName
            ? `Debuffs Overview - ${targetName}`
            : playerName
              ? `Debuffs Overview (by ${playerName})`
              : 'Debuffs Overview'}
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {targetName && playerName
          ? `Shows debuffs applied by ${playerName} to ${targetName} during this fight.`
          : targetName
            ? `Shows all debuffs applied to ${targetName} during this fight. Includes abilities, environmental effects, and status ailments.`
            : playerName
              ? `Shows all debuffs applied by ${playerName} during this fight. Includes abilities, environmental effects, and status ailments.`
              : 'Shows all debuffs applied to players and enemies during this fight. Includes abilities, environmental effects, and status ailments.'}
      </Typography>

      {/* Player Filter */}
      {availablePlayers.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="player-filter-label">Filter by Player</InputLabel>
            <Select
              labelId="player-filter-label"
              value={selectedPlayerId?.toString() || 'ALL_PLAYERS'}
              label="Filter by Player"
              onChange={handlePlayerChange}
            >
              <MenuItem value="ALL_PLAYERS">All Players</MenuItem>
              {availablePlayers.map((player) => (
                <MenuItem key={player.id} value={player.id.toString()}>
                  {player.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      <DataGrid
        data={debuffOverviewData}
        columns={columns as ColumnDef<Record<string, unknown>>[]}
        title={`Debuffs (${debuffOverviewData.length} unique)`}
        height={600}
        initialPageSize={25}
        pageSizeOptions={[10, 25, 50, 100]}
        enableSorting={true}
        enableFiltering={true}
        enablePagination={true}
        loading={isLoading}
        emptyMessage={error || 'No debuff data available'}
      />
    </Box>
  );
};
