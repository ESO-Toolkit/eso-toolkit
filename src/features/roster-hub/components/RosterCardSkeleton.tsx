import { Box, Card, CardContent, Skeleton } from '@mui/material';
import React from 'react';

export const RosterCardSkeleton: React.FC = () => (
  <Card
    variant="outlined"
    sx={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      borderColor: 'divider',
    }}
  >
    <CardContent sx={{ pb: 0, flexGrow: 1 }}>
      {/* Trial badge + title row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Skeleton variant="rounded" width={36} height={22} />
        <Skeleton variant="text" width="60%" height={24} />
      </Box>
      {/* Description */}
      <Skeleton variant="text" width="100%" />
      <Skeleton variant="text" width="80%" sx={{ mb: 1 }} />
      {/* Tags */}
      <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
        <Skeleton variant="rounded" width={60} height={20} />
        <Skeleton variant="rounded" width={72} height={20} />
      </Box>
      {/* Author */}
      <Skeleton variant="text" width="50%" />
    </CardContent>
    <Box sx={{ px: 2, pb: 1.5, pt: 1, display: 'flex', justifyContent: 'space-between' }}>
      <Skeleton variant="rounded" width={60} height={28} />
      <Skeleton variant="circular" width={28} height={28} />
    </Box>
  </Card>
);
