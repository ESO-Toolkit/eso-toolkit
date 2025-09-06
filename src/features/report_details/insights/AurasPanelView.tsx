import { Avatar, Box, Chip, Popover, Typography } from '@mui/material';
import { ColumnDef, Row } from '@tanstack/react-table';
import React from 'react';

import { DataGrid } from '../../../components/LazyDataGrid';
import { LazySkillTooltip as SkillTooltip } from '../../../components/LazySkillTooltip';

import { AuraData } from './AurasPanel';

interface AurasPanelViewProps {
  aurasData: AuraData[];
  isLoading: boolean;
  reportId?: string | null;
  fightId?: string | null;
}

export const AurasPanelView: React.FC<AurasPanelViewProps> = ({
  aurasData,
  isLoading,
  reportId,
  fightId,
}) => {
  const [tooltipAnchor, setTooltipAnchor] = React.useState<{
    element: HTMLElement;
    abilityId: number;
    icon?: string;
    name: string;
  } | null>(null);

  const handleTooltipOpen = (event: React.MouseEvent<HTMLElement>, aura: AuraData): void => {
    setTooltipAnchor({
      element: event.currentTarget,
      abilityId: aura.auraId,
      icon: aura.icon,
      name: aura.auraName,
    });
  };

  const handleTooltipClose = (): void => {
    setTooltipAnchor(null);
  };

  // Column definitions for the DataGrid
  const columns = React.useMemo<ColumnDef<AuraData>[]>(
    () => [
      {
        accessorKey: 'auraName',
        header: 'Aura',
        size: 250,
        cell: ({ row }) => {
          const { auraName, icon } = row.original;
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
              <Avatar
                src={icon}
                alt={auraName}
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1,
                  flexShrink: 0,
                  cursor: 'help',
                }}
                onClick={(event) => handleTooltipOpen(event, row.original)}
              />
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
                {auraName}
              </Typography>
            </Box>
          );
        },
      },
      {
        accessorKey: 'auraId',
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
        accessorKey: 'playerCount',
        header: 'Player Count',
        size: 120,
        cell: ({ getValue }) => (
          <Chip
            label={getValue() as number}
            size="small"
            variant="outlined"
            color={
              (getValue() as number) >= 5
                ? 'success'
                : (getValue() as number) >= 3
                  ? 'warning'
                  : 'default'
            }
            sx={{ fontWeight: 600 }}
          />
        ),
      },
      {
        accessorKey: 'players',
        header: 'Players',
        size: 300,
        cell: ({ getValue }) => {
          const players = getValue() as string[];
          if (players.length === 0) return <Typography variant="body2">None</Typography>;

          return (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxWidth: '100%' }}>
              {players.slice(0, 4).map((playerName: string) => (
                <Chip
                  key={playerName}
                  label={playerName}
                  size="small"
                  variant="outlined"
                  sx={{
                    fontSize: '0.75rem',
                    maxWidth: 120,
                    '& .MuiChip-label': {
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    },
                  }}
                />
              ))}
              {players.length > 4 && (
                <Chip
                  label={`+${players.length - 4} more`}
                  size="small"
                  variant="filled"
                  color="primary"
                  sx={{ fontSize: '0.75rem' }}
                />
              )}
            </Box>
          );
        },
        enableSorting: false, // Arrays are not easily sortable
        filterFn: (row: Row<AuraData>, columnId: string, value: string) => {
          const players = row.getValue(columnId) as string[];
          return players.some((player: string) =>
            player.toLowerCase().includes(value.toLowerCase()),
          );
        },
      },
      {
        accessorKey: 'maxStacks',
        header: 'Max Stacks',
        size: 100,
        cell: ({ getValue }) => {
          const maxStacks = getValue() as number;
          return (
            <Typography
              variant="body2"
              sx={{
                fontVariantNumeric: 'tabular-nums',
                color: maxStacks > 1 ? 'warning.main' : 'text.secondary',
                fontWeight: maxStacks > 1 ? 600 : 400,
              }}
            >
              {maxStacks}
            </Typography>
          );
        },
      },
      {
        accessorKey: 'totalStacks',
        header: 'Total Stacks',
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
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        🔮 Experimental: Auras Overview
        <Chip
          label="BETA"
          size="small"
          color="warning"
          variant="outlined"
          sx={{ fontSize: '0.7rem', height: 20 }}
        />
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Shows all auras/buffs detected on players during this fight. Includes consumables,
        abilities, gear effects, and environmental buffs.
      </Typography>

      <DataGrid
        data={aurasData}
        columns={columns as ColumnDef<Record<string, unknown>>[]}
        title={`Auras (${aurasData.length} unique)`}
        height={600}
        initialPageSize={25}
        pageSizeOptions={[10, 25, 50, 100]}
        enableSorting={true}
        enableFiltering={true}
        enablePagination={true}
        loading={isLoading}
        emptyMessage="No aura data available"
      />

      {/* Tooltip Popover */}
      <Popover
        open={Boolean(tooltipAnchor)}
        anchorEl={tooltipAnchor?.element}
        onClose={handleTooltipClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        sx={{
          pointerEvents: 'none',
        }}
        PaperProps={{
          sx: {
            maxWidth: 400,
            pointerEvents: 'auto',
          },
        }}
      >
        {tooltipAnchor && (
          <Box sx={{ p: 1 }}>
            <SkillTooltip
              abilityId={tooltipAnchor.abilityId}
              iconUrl={tooltipAnchor.icon}
              name={tooltipAnchor.name}
              description="Aura/buff effect detected on players during combat."
            />
          </Box>
        )}
      </Popover>
    </Box>
  );
};
