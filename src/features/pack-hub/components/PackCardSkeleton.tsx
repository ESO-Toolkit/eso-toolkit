import { Box, Card, CardActions, CardContent, Skeleton, useTheme } from '@mui/material';
import React from 'react';

export const PackCardSkeleton: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Card
      sx={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        position: 'relative',
        background: isDark
          ? 'linear-gradient(160deg, rgba(196,164,74,0.07) 0%, rgba(152,131,227,0.07) 45%, rgba(11,18,32,0.6) 100%)'
          : 'linear-gradient(160deg, rgba(196,164,74,0.05) 0%, rgba(152,131,227,0.05) 45%, rgba(255,255,255,0.8) 100%)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: isDark ? '1px solid rgba(255,255,255,0.09)' : '1px solid rgba(0,0,0,0.09)',
        borderRadius: 3,
        overflow: 'hidden',
        boxShadow: isDark
          ? '0 2px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)'
          : '0 2px 12px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.9)',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: isDark
            ? 'linear-gradient(90deg, transparent 0%, rgba(196,164,74,0.35) 20%, rgba(196,164,74,0.5) 50%, rgba(196,164,74,0.35) 80%, transparent 100%)'
            : 'linear-gradient(90deg, transparent 0%, rgba(196,164,74,0.25) 20%, rgba(196,164,74,0.35) 50%, rgba(196,164,74,0.25) 80%, transparent 100%)',
          borderRadius: '4px 4px 0 0',
          zIndex: 2,
        }}
        aria-hidden="true"
      />
      <Box sx={{ flexGrow: 1 }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', pt: 3, px: 2.5, pb: '20px !important' }}>
          <Skeleton variant="rounded" width={78} height={24} sx={{ mb: 1.75, borderRadius: '6px', bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />
          <Skeleton variant="text" width="80%" height={26} sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />
          <Skeleton variant="text" width="95%" sx={{ mb: 1, bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} />
          <Skeleton variant="text" width="65%" sx={{ mb: 1.75, bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} />
          <Box sx={{ display: 'flex', gap: 0.75, mb: 1.75 }}>
            <Skeleton variant="rounded" width={52} height={24} sx={{ borderRadius: '6px', bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }} />
            <Skeleton variant="rounded" width={44} height={24} sx={{ borderRadius: '6px', bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }} />
          </Box>
          <Box sx={{ flexGrow: 1, minHeight: 12 }} />
          <Box sx={{ display: 'flex', alignItems: 'stretch', mt: 0.5, borderRadius: '8px', background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)', border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            <Box sx={{ width: '3px', flexShrink: 0, background: isDark ? 'linear-gradient(180deg, rgba(196,164,74,0.5) 0%, rgba(196,164,74,0.2) 100%)' : 'linear-gradient(180deg, rgba(196,164,74,0.35) 0%, rgba(196,164,74,0.12) 100%)' }} aria-hidden="true" />
            <Box sx={{ minWidth: 0, flex: 1, px: 1.25, py: 0.9 }}>
              <Skeleton variant="text" width="55%" height={18} sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }} />
              <Skeleton variant="text" width="30%" height={14} sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }} />
            </Box>
          </Box>
        </CardContent>
      </Box>
      <CardActions sx={{ px: 2.5, py: 1, borderTop: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.07)', background: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.025)', justifyContent: 'space-between' }}>
        <Skeleton variant="rounded" width={62} height={32} sx={{ borderRadius: '999px', bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }} />
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Skeleton variant="circular" width={36} height={36} sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }} />
        </Box>
      </CardActions>
    </Card>
  );
};
