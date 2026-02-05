import { Container, Typography, Box } from '@mui/material';
import React from 'react';

import { WorkInProgressDisclaimer } from '../../components/WorkInProgressDisclaimer';

export const TankGuide: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Tank Guide
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Complete guide to playing as a Tank in The Elder Scrolls Online
        </Typography>
      </Box>

      <WorkInProgressDisclaimer 
        featureName="Tank Guide" 
        message="This comprehensive guide is coming soon. Check back later for tips, builds, and strategies for tanking in ESO!"
      />
    </Container>
  );
};
