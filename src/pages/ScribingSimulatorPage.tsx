import { Container } from '@mui/material';
import React from 'react';

import { ScribingSimulator } from '@features/scribing/components/ScribingSimulator';

export const ScribingSimulatorPage: React.FC = () => {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <ScribingSimulator />
    </Container>
  );
};
