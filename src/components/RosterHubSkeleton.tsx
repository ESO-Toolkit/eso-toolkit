import { Box, Card, CardActions, CardContent, Container, Grid, Skeleton, useTheme } from '@mui/material';
import React from 'react';

const SKELETON_COUNT = 8;

/**
 * Inline card skeleton — self-contained so this file stays in the main bundle
 * and can be used as a Suspense fallback before the roster-hub lazy chunk loads.
 */
const RosterCardSkeletonInline: React.FC = () => {
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
          ? 'linear-gradient(160deg, rgba(99,102,241,0.07) 0%, rgba(152,131,227,0.07) 45%, rgba(11,18,32,0.6) 100%)'
          : 'linear-gradient(160deg, rgba(99,102,241,0.05) 0%, rgba(152,131,227,0.05) 45%, rgba(255,255,255,0.8) 100%)',
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
      {/* Glowing accent bar */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: isDark
            ? 'linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.35) 20%, rgba(99,102,241,0.5) 50%, rgba(99,102,241,0.35) 80%, transparent 100%)'
            : 'linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.25) 20%, rgba(99,102,241,0.35) 50%, rgba(99,102,241,0.25) 80%, transparent 100%)',
          boxShadow: isDark
            ? '0 0 12px rgba(99,102,241,0.3), 0 0 28px rgba(99,102,241,0.15)'
            : '0 0 8px rgba(99,102,241,0.2), 0 0 20px rgba(99,102,241,0.1)',
          borderRadius: '4px 4px 0 0',
          zIndex: 2,
        }}
        aria-hidden="true"
      />

      <Box sx={{ flexGrow: 1, alignItems: 'flex-start' }}>
        <CardContent
          sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            pt: 3,
            px: 2.5,
            pb: '20px !important',
          }}
        >
          {/* Trial badge */}
          <Skeleton
            variant="rounded"
            width={38}
            height={24}
            sx={{
              mb: 1.75,
              borderRadius: '6px',
              alignSelf: 'flex-start',
              border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.05)',
              bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            }}
          />

          {/* Title — 2 lines */}
          <Skeleton
            variant="text"
            width="85%"
            height={26}
            sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
          />
          <Skeleton
            variant="text"
            width="60%"
            height={26}
            sx={{ mb: 1, bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
          />

          {/* Description — 2 lines */}
          <Skeleton
            variant="text"
            width="100%"
            sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
          />
          <Skeleton
            variant="text"
            width="75%"
            sx={{ mb: 1.75, bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
          />

          {/* Tags */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.75 }}>
            <Skeleton
              variant="rounded"
              width={68}
              height={24}
              sx={{ borderRadius: '6px', bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}
            />
            <Skeleton
              variant="rounded"
              width={82}
              height={24}
              sx={{ borderRadius: '6px', bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}
            />
          </Box>

          <Box sx={{ flexGrow: 1, minHeight: 12 }} />

          {/* Author row */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'stretch',
              mt: 0.5,
              borderRadius: '8px',
              background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.05)',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                width: '3px',
                flexShrink: 0,
                background: isDark
                  ? 'linear-gradient(180deg, rgba(99,102,241,0.5) 0%, rgba(99,102,241,0.2) 100%)'
                  : 'linear-gradient(180deg, rgba(99,102,241,0.35) 0%, rgba(99,102,241,0.12) 100%)',
                boxShadow: isDark ? '0 0 6px rgba(99,102,241,0.2)' : '0 0 4px rgba(99,102,241,0.1)',
              }}
              aria-hidden="true"
            />
            <Box sx={{ minWidth: 0, flex: 1, px: 1.25, py: 0.9 }}>
              <Skeleton
                variant="text"
                width="55%"
                height={18}
                sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }}
              />
              <Skeleton
                variant="text"
                width="30%"
                height={14}
                sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}
              />
            </Box>
          </Box>
        </CardContent>
      </Box>

      {/* Action row */}
      <CardActions
        sx={{
          px: 2.5,
          py: 1,
          borderTop: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.07)',
          background: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.025)',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Skeleton
          variant="rounded"
          width={62}
          height={32}
          sx={{ borderRadius: '999px', bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}
        />
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Skeleton
            variant="circular"
            width={36}
            height={36}
            sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}
          />
        </Box>
      </CardActions>
    </Card>
  );
};

/**
 * Full-page skeleton for the Roster Hub — shown as the Suspense fallback while
 * the lazy-loaded RosterHubPage chunk is downloading. Mirrors the actual page
 * layout: hero header, filter bar, and 8 card skeletons in a 3-column grid.
 */
export const RosterHubSkeleton: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Hero header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          mb: 3,
          px: 2.5,
          py: 2,
          borderRadius: 2,
          background: isDark
            ? 'linear-gradient(135deg, rgba(110,170,240,0.10) 0%, rgba(152,131,227,0.07) 50%, rgba(11,18,32,0.4) 100%)'
            : 'linear-gradient(135deg, rgba(37,99,235,0.06) 0%, rgba(124,58,237,0.04) 50%, rgba(255,255,255,0.6) 100%)',
          border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.06)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Skeleton
            variant="rounded"
            width={40}
            height={40}
            sx={{ borderRadius: '11px', bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', flexShrink: 0 }}
          />
          <Box>
            <Skeleton variant="text" width={70} height={12} sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', mb: 0.5 }} />
            <Skeleton variant="text" width={110} height={26} sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }} />
          </Box>
        </Box>
        <Skeleton
          variant="rounded"
          width={140}
          height={34}
          sx={{ borderRadius: '8px', bgcolor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)', flexShrink: 0 }}
        />
      </Box>

      {/* Filter bar */}
      <Box
        sx={{
          px: 2,
          pt: 1.25,
          pb: 1.75,
          mb: 2.5,
          borderRadius: 3,
          background: isDark ? 'rgba(11,16,26,0.88)' : 'rgba(248,250,252,0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
        }}
      >
        {/* Row 1: search + trial select + sort toggle */}
        <Box sx={{ display: 'flex', gap: 1.25, mb: 1.5 }}>
          <Skeleton
            variant="rounded"
            height={36}
            sx={{ flexGrow: 1, borderRadius: '10px', bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}
          />
          <Skeleton
            variant="rounded"
            width={160}
            height={36}
            sx={{ borderRadius: '10px', bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', flexShrink: 0 }}
          />
          <Skeleton
            variant="rounded"
            width={108}
            height={36}
            sx={{ borderRadius: '999px', bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', flexShrink: 0 }}
          />
        </Box>
        {/* Row 2: tag chips */}
        <Box sx={{ display: 'flex', gap: 0.75 }}>
          {[68, 82, 44, 28].map((w, i) => (
            <Skeleton
              key={i}
              variant="rounded"
              width={w}
              height={26}
              sx={{ borderRadius: '6px', bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}
            />
          ))}
        </Box>
      </Box>

      {/* Card grid */}
      <Grid container spacing={3}>
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }} sx={{ display: 'flex' }}>
            <RosterCardSkeletonInline />
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};
