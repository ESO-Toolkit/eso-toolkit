import NewReleasesIcon from '@mui/icons-material/NewReleases';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Box,
  Chip,
  Container,
  Divider,
  IconButton,
  Link,
  Paper,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import React from 'react';

import { useWhatsNew } from '@/hooks/useWhatsNew';
import type { WhatsNewEntry } from '@/types/whatsNew';

/** Colour map for common GitHub PR labels */
const LABEL_COLORS: Record<string, 'success' | 'info' | 'warning' | 'error' | 'primary'> = {
  bug: 'error',
  fix: 'error',
  bugfix: 'error',
  feature: 'success',
  enhancement: 'success',
  'breaking change': 'warning',
  refactor: 'info',
  chore: 'info',
  documentation: 'info',
  performance: 'primary',
};

function labelColor(name: string): 'success' | 'info' | 'warning' | 'error' | 'primary' | 'default' {
  const lower = name.toLowerCase();
  for (const [key, color] of Object.entries(LABEL_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return 'default';
}

/** Format an ISO date string into a human-readable relative or absolute date */
function formatDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const EntryCard: React.FC<{ entry: WhatsNewEntry }> = ({ entry }) => (
  <Paper
    elevation={0}
    sx={{
      p: { xs: 2.5, md: 3 },
      borderRadius: 2,
      border: (theme) =>
        `1px solid ${
          theme.palette.mode === 'dark' ? 'rgba(148,163,184,0.15)' : 'rgba(148,163,184,0.25)'
        }`,
      transition: 'border-color 0.2s, box-shadow 0.2s',
      '&:hover': {
        borderColor: 'primary.main',
        boxShadow: (theme) =>
          theme.palette.mode === 'dark'
            ? '0 0 0 1px rgba(59,130,246,0.3)'
            : '0 0 0 1px rgba(59,130,246,0.2)',
      },
    }}
  >
    <Stack spacing={1.5}>
      {/* Header row */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
            {entry.title}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25 }}>
            #{entry.id} &middot; {formatDate(entry.mergedAt)} &middot; by {entry.author}
          </Typography>
        </Box>
        <Tooltip title="View on GitHub">
          <IconButton
            component={Link}
            href={entry.url}
            target="_blank"
            rel="noopener noreferrer"
            size="small"
            sx={{ mt: -0.5 }}
          >
            <OpenInNewIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Labels */}
      {entry.labels.length > 0 && (
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          {entry.labels.map((label) => (
            <Chip
              key={label}
              label={label}
              size="small"
              color={labelColor(label)}
              variant="outlined"
              sx={{ fontSize: '0.7rem', height: 22 }}
            />
          ))}
        </Stack>
      )}

      {/* Description */}
      {entry.description && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            whiteSpace: 'pre-line',
            '& a': { color: 'primary.main' },
            maxHeight: 200,
            overflow: 'auto',
          }}
        >
          {entry.description}
        </Typography>
      )}
    </Stack>
  </Paper>
);

const LoadingSkeleton: React.FC = () => (
  <Stack spacing={2}>
    {[1, 2, 3].map((i) => (
      <Paper
        key={i}
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 2,
          border: '1px solid rgba(148,163,184,0.15)',
        }}
      >
        <Skeleton variant="text" width="60%" height={28} />
        <Skeleton variant="text" width="40%" height={16} sx={{ mt: 0.5 }} />
        <Skeleton variant="text" width="100%" height={16} sx={{ mt: 1.5 }} />
        <Skeleton variant="text" width="80%" height={16} />
      </Paper>
    ))}
  </Stack>
);

export const WhatsNewPage: React.FC = () => {
  const { data, loading, error, markSeen } = useWhatsNew();

  // Mark as seen when the page is opened
  React.useEffect(() => {
    if (data && data.entries.length > 0) {
      markSeen();
    }
  }, [data, markSeen]);

  return (
    <Container maxWidth="md" sx={{ py: { xs: 6, md: 8 } }}>
      <Stack spacing={3}>
        {/* Page header */}
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <NewReleasesIcon color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h3" sx={{ fontWeight: 800 }}>
              What&apos;s New
            </Typography>
          </Stack>
          <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 1 }}>
            Recent updates and improvements to ESO Toolkit.
          </Typography>
        </Box>

        <Divider />

        {/* Content */}
        {loading && <LoadingSkeleton />}

        {error && (
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'warning.main',
              bgcolor: 'rgba(245,158,11,0.06)',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Unable to load recent updates. Please try again later.
            </Typography>
          </Paper>
        )}

        {data && data.entries.length === 0 && (
          <Typography variant="body1" color="text.secondary">
            No recent updates to display.
          </Typography>
        )}

        {data && data.entries.length > 0 && (
          <Stack spacing={2}>
            {data.entries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </Stack>
        )}

        {/* Generation timestamp */}
        {data && (
          <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'center', pt: 2 }}>
            Last updated:{' '}
            {new Date(data.generatedAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Typography>
        )}
      </Stack>
    </Container>
  );
};
