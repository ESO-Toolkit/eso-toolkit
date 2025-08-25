import { Box, Typography } from '@mui/material';
import { DataGrid, GridColDef, GridToolbar } from '@mui/x-data-grid';
import React from 'react';

interface Actor {
  id: string | number;
  name: string;
  displayName: string | null;
  type: string;
  subType: string | null;
  server: string;
  gameID: number;
}

interface ActorsPanelViewProps {
  actors: Actor[];
}

const ActorsPanelView: React.FC<ActorsPanelViewProps> = ({ actors }) => {
  // Define columns for the DataGrid
  const columns: GridColDef[] = [
    {
      field: 'id',
      headerName: 'ID',
      width: 100,
      type: 'string',
    },
    {
      field: 'name',
      headerName: 'Name',
      width: 200,
      type: 'string',
    },
    {
      field: 'displayName',
      headerName: 'Display Name',
      width: 200,
      type: 'string',
    },
    {
      field: 'type',
      headerName: 'Type',
      width: 100,
      type: 'string',
    },
    {
      field: 'subType',
      headerName: 'Sub Type',
      width: 120,
      type: 'string',
    },
    {
      field: 'server',
      headerName: 'Server',
      width: 150,
      type: 'string',
    },
    {
      field: 'gameID',
      headerName: 'Game ID',
      width: 100,
      type: 'number',
    },
  ];

  return (
    <Box mt={2}>
      <Typography variant="h6" gutterBottom>
        All Actors in Report ({actors.length} total)
      </Typography>
      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={actors}
          columns={columns}
          slots={{ toolbar: GridToolbar }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 500 },
            },
          }}
          pageSizeOptions={[25, 50, 100]}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 25 },
            },
            sorting: {
              sortModel: [{ field: 'name', sort: 'asc' }],
            },
          }}
          sx={{
            '& .MuiDataGrid-toolbarContainer': {
              padding: '8px',
              borderBottom: '1px solid',
              borderColor: 'divider',
            },
          }}
        />
      </Box>
    </Box>
  );
};

export default ActorsPanelView;
