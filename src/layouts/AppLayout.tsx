import { Box } from '@mui/material';
import Container from '@mui/material/Container';
import React from 'react';
import { Outlet } from 'react-router-dom';

import HeaderBar from '../components/HeaderBar';
import ReduxThemeProvider from '../ReduxThemeProvider';

const AppLayout: React.FC = () => (
  <ReduxThemeProvider>
    <Box sx={{ position: 'relative', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box sx={{ position: 'sticky', top: 0, zIndex: 100 }}>
        <HeaderBar />
      </Box>
      <Container maxWidth="md">
        <Box sx={{ pt: 2, pb: 4, minHeight: 'calc(100vh - 64px)', overflowY: 'auto' }}>
          <Outlet />
        </Box>
      </Container>
    </Box>
  </ReduxThemeProvider>
);

export default AppLayout;
