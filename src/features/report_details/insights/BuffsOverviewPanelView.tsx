import { Avatar, Box, Typography } from '@mui/material';
import { ColumnDef } from '@tanstack/react-table';
import React from 'react';

import { DataGrid } from '../../../components/DataGrid';

import { BuffOverviewData } from './BuffsOverviewPanel';

interface BuffsOverviewPanelViewProps {
  buffsData: BuffOverviewData[];
  isLoading: boolean;
  reportId?: string | null;
  fightId?: string | null;
}

export const BuffsOverviewPanelView: React.FC<BuffsOverviewPanelViewProps> = ({
  buffsData,
  isLoading,
  reportId,
  fightId,
}) => {
  // Column definitions for the DataGrid
  const columns = React.useMemo<ColumnDef<BuffOverviewData>[]>(
    () => [
      {
        accessorKey: 'buffName',
        header: 'Buff Name',
        size: 300,
        cell: ({ row }) => {
          const { buffName, icon } = row.original;
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
              {icon && (
                <Avatar
                  src={icon}
                  alt={buffName}
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
                {buffName}
              </Typography>
            </Box>
          );
        },
      },
      {
        accessorKey: 'buffId',
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
    ],
    []
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
        Buffs Overview
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Shows all buffs applied to friendly players during this fight. Includes abilities,
        consumables, gear effects, and environmental buffs.
      </Typography>

      <DataGrid<BuffOverviewData>
        data={buffsData}
        columns={columns}
        title={`Buffs (${buffsData.length} unique)`}
        height={600}
        initialPageSize={25}
        pageSizeOptions={[10, 25, 50, 100]}
        enableSorting={true}
        enableFiltering={true}
        enablePagination={true}
        loading={isLoading}
        emptyMessage="No buff data available"
      />
    </Box>
  );
};
