import { Box, Chip, CircularProgress, Typography } from '@mui/material';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import React from 'react';

import { AbilityIcon } from '../../../components/AbilityIcon';
import { DataGrid } from '../../../components/DataGrid/DataGrid';

interface AbilityData {
  gameID: string | number;
  name: string;
  icon: string;
  type: string;
  damageTypes: string[];
  [key: string]: unknown; // Add index signature for DataGrid compatibility
}

interface AbilitiesDebugPanelViewProps {
  abilities: AbilityData[];
  totalCount: number;
  isLoading: boolean;
}

export const AbilitiesDebugPanelView: React.FC<AbilitiesDebugPanelViewProps> = ({
  abilities,
  totalCount,
  isLoading,
}) => {
  // Create column helper
  const columnHelper = createColumnHelper<AbilityData>();

  // Define columns
  const columns = React.useMemo(
    () => [
      columnHelper.display({
        id: 'icon',
        header: 'Icon',
        cell: (info) => <AbilityIcon abilityId={info.row.original.gameID} />,
        size: 150,
      }),
      columnHelper.accessor('gameID', {
        header: 'Game ID',
        cell: (info) => (
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
            {info.getValue()}
          </Typography>
        ),
        size: 100,
      }),
      columnHelper.accessor('name', {
        header: 'Name',
        cell: (info) => (
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {info.getValue()}
          </Typography>
        ),
        size: 200,
      }),
      columnHelper.accessor('damageTypes', {
        header: 'Damage Types',
        cell: (info) => (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {info.getValue().map((damageType) => (
              <Chip
                key={damageType}
                label={damageType}
                size="small"
                variant="outlined"
                sx={{
                  fontSize: '0.75rem',
                  height: 20,
                  '& .MuiChip-label': { px: 1 },
                }}
              />
            ))}
          </Box>
        ),
        size: 200,
        filterFn: (row, columnId, value) => {
          const damageTypes = row.getValue(columnId) as string[];
          return damageTypes.some((type) => type.toLowerCase().includes(value.toLowerCase()));
        },
        sortingFn: (a, b) => {
          const aTypes = (a.getValue('damageTypes') as string[]).join(', ');
          const bTypes = (b.getValue('damageTypes') as string[]).join(', ');
          return aTypes.localeCompare(bTypes);
        },
      }),
    ],
    [columnHelper]
  );

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>
          Loading abilities data...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Abilities Debug Panel
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Displaying abilities from masterData.abilitiesById ({totalCount} total)
        </Typography>
      </Box>

      <DataGrid
        data={abilities}
        columns={columns as ColumnDef<AbilityData>[]}
        title="Abilities Data"
        height={600}
        initialPageSize={25}
        pageSizeOptions={[10, 25, 50, 100]}
        enableSorting={true}
        enableFiltering={true}
        enablePagination={true}
        emptyMessage="No abilities data available"
      />
    </Box>
  );
};
