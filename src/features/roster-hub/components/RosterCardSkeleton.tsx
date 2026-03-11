import { Box, Card, CardContent, Skeleton } from '@mui/material';
import React from 'react';

export const RosterCardSkeleton: React.FC = () => (
  <Card
    variant="outlined"
    sx={{ display: 'flex', flexDirection: 'column', width: '100%', borderColor: 'divider' }}
  >
    <CardContent sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, pb: '12px !important' }}>
      {/* Trial badge */}
      <Skeleton variant="rounded" width={36} height={20} sx={{ mb: 1, borderRadius: '10px' }} />
      {/* Title — 2 lines */}
      <Skeleton variant="text" width="90%" height={22} />
      <Skeleton variant="text" width="65%" height={22} sx={{ mb: 0.75 }} />
      {/* Description */}
      <Skeleton variant="text" width="100%" />
      <Skeleton variant="text" width="80%" sx={{ mb: 1 }} />
      {/* Tags */}
      <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
        <Skeleton variant="rounded" width={62} height={22} sx={{ borderRadius: '11px' }} />
        <Skeleton variant="rounded" width={76} height={22} sx={{ borderRadius: '11px' }} />
      </Box>
      {/* Spacer */}
      <Box sx={{ flexGrow: 1, minHeight: 8 }} />
      {/* Author */}
      <Skeleton variant="text" width="55%" height={16} />
    </CardContent>
    <Box
      sx={{
        px: 1.5,
        py: 1,
        borderTop: 1,
        borderColor: 'divider',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <Skeleton variant="rounded" width={58} height={32} sx={{ borderRadius: '16px' }} />
      <Skeleton variant="circular" width={28} height={28} />
    </Box>
  </Card>
);
