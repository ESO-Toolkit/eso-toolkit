import { Box, Button, Typography } from '@mui/material';
import { DataGrid, GridColDef, GridToolbar } from '@mui/x-data-grid';
import React from 'react';

import { LogEvent } from '../../../types/combatlogEvents';

interface EventsGridProps {
  events: LogEvent[];
  title?: string;
  height?: number;
}

const EventsGrid: React.FC<EventsGridProps> = ({ events, title = 'Events', height = 600 }) => {
  // Define columns for the DataGrid
  const columns: GridColDef[] = [
    {
      field: 'id',
      headerName: 'ID',
      width: 80,
      type: 'number',
    },
    {
      field: 'timestamp',
      headerName: 'Time',
      width: 120,
      type: 'number',
      valueFormatter: (params) => {
        const date = new Date(params);
        return date.toISOString().substr(11, 12); // HH:mm:ss.sss
      },
    },
    {
      field: 'type',
      headerName: 'Event Type',
      width: 150,
      filterable: true,
    },
    {
      field: 'sourceID',
      headerName: 'Source ID',
      width: 100,
      type: 'number',
    },
    {
      field: 'targetID',
      headerName: 'Target ID',
      width: 100,
      type: 'number',
    },
    {
      field: 'abilityGameID',
      headerName: 'Ability ID',
      width: 100,
      type: 'number',
    },
    {
      field: 'amount',
      headerName: 'Amount',
      width: 100,
      type: 'number',
    },
    {
      field: 'fight',
      headerName: 'Fight',
      width: 80,
      type: 'number',
    },
    {
      field: 'details',
      headerName: 'Event Details',
      width: 150,
      renderCell: (params) => {
        const handleCopyDetails = async () => {
          try {
            const jsonString = JSON.stringify(params.row.originalEvent, null, 2);
            await navigator.clipboard.writeText(jsonString);
            // You could add a toast notification here if desired
          } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            // Fallback: create a temporary textarea element
            const textarea = document.createElement('textarea');
            textarea.value = JSON.stringify(params.row.originalEvent, null, 2);
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
            onClick={handleCopyDetails}
            sx={{ fontSize: '0.75rem' }}
          >
            Copy JSON
          </Button>
        );
      },
    },
  ];

  // Transform events data for the DataGrid
  const rows = React.useMemo(() => {
    return events.map((event, index) => ({
      id: index,
      timestamp: event.timestamp || 0,
      type: event.type || '',
      sourceID: 'sourceID' in event ? event.sourceID : null,
      targetID: 'targetID' in event ? event.targetID : null,
      abilityGameID: 'abilityGameID' in event ? event.abilityGameID : null,
      amount: 'amount' in event ? event.amount : null,
      fight: 'fight' in event ? event.fight : null,
      originalEvent: event, // Store original event for details column
    }));
  }, [events]);

  return (
    <Box mt={2}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {title} ({events.length.toLocaleString()} total)
      </Typography>
      <Box sx={{ height: height, width: '100%' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 25 },
            },
          }}
          pageSizeOptions={[25, 50, 100]}
          slots={{ toolbar: GridToolbar }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 500 },
            },
          }}
          disableRowSelectionOnClick
          sx={{
            '& .MuiDataGrid-cell': {
              fontSize: '0.875rem',
            },
            '& .MuiDataGrid-columnHeader': {
              fontSize: '0.875rem',
              fontWeight: 600,
            },
          }}
        />
      </Box>
    </Box>
  );
};

export default EventsGrid;

