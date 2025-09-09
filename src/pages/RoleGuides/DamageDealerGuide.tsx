import { Container, Typography, Box } from '@mui/material';
import React from 'react';

export const DamageDealerGuide: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Damage Dealer Guide
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Complete guide to playing as a Damage Dealer in The Elder Scrolls Online
        </Typography>
      </Box>

      <Box sx={{ textAlign: 'center', mt: 8 }}>
        <Typography variant="h5" color="text.secondary">
          Coming Soon
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
          This guide is currently under development.
        </Typography>
      </Box>
    </Container>
  );
};
