import { Container, Typography, Box } from '@mui/material';
import React from 'react';

import { WorkInProgressDisclaimer } from '../../components/WorkInProgressDisclaimer';

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

      <WorkInProgressDisclaimer
        featureName="Damage Dealer Guide"
        message="This comprehensive guide is coming soon. Check back later for DPS builds, rotation advice, and optimization tips!"
      />
    </Container>
  );
};
