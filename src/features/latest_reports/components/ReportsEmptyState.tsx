import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import InboxIcon from '@mui/icons-material/Inbox';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { Box, Button, Typography } from '@mui/material';
import React from 'react';

/**
 * Distinguishes the four reasons the results area can be empty so we can show
 * the right message + recovery action, instead of one generic "No reports".
 */
export type EmptyStateKind = 'search-no-match' | 'filter-no-results' | 'all-hidden' | 'cold-empty';

export interface EmptyStateInput {
  /** A SERVER filter (zone/date) is active. */
  serverFilterActive: boolean;
  /** The (debounced) text query is non-empty. */
  searchActive: boolean;
  /** Reports returned by the server for this page (before text filter). */
  loadedCount: number;
  /** Reports hidden on this page for having no combat data. */
  hiddenEmptyCount: number;
}

export function selectEmptyStateKind(input: EmptyStateInput): EmptyStateKind {
  const { serverFilterActive, searchActive, loadedCount, hiddenEmptyCount } = input;
  // The server returned rows but the client text query filtered them all out.
  if (searchActive && loadedCount > 0) return 'search-no-match';
  // The server returned nothing for the active zone/date filter.
  if (serverFilterActive && loadedCount === 0) return 'filter-no-results';
  // Every row on this page was an empty (no-combat) log.
  if (loadedCount === 0 && hiddenEmptyCount > 0) return 'all-hidden';
  return 'cold-empty';
}

interface ReportsEmptyStateProps {
  input: EmptyStateInput;
  query: string;
  onClearSearch: () => void;
  onClearFilters: () => void;
}

export const ReportsEmptyState: React.FC<ReportsEmptyStateProps> = ({
  input,
  query,
  onClearSearch,
  onClearFilters,
}) => {
  const kind = selectEmptyStateKind(input);

  const config: Record<
    EmptyStateKind,
    {
      icon: React.ReactNode;
      title: string;
      body: string;
      action?: { label: string; onClick: () => void };
    }
  > = {
    'search-no-match': {
      icon: <SearchOffIcon fontSize="large" color="action" />,
      title: `No loaded reports match “${query.trim()}”`,
      body: 'Text search only covers reports on this page. Try clearing the search, or use the Zone and Date filters to load different reports.',
      action: { label: 'Clear search', onClick: onClearSearch },
    },
    'filter-no-results': {
      icon: <FilterAltOffIcon fontSize="large" color="action" />,
      title: 'No reports match your filters',
      body: 'No combat logs were found for the selected zone and date range. Try widening the date range or choosing a different zone.',
      action: { label: 'Clear filters', onClick: onClearFilters },
    },
    'all-hidden': {
      icon: <VisibilityOffIcon fontSize="large" color="action" />,
      title: 'Every report on this page is empty',
      body: 'All logs on this page contain no combat data, so they were hidden. Try another page.',
    },
    'cold-empty': {
      icon: <InboxIcon fontSize="large" color="action" />,
      title: 'No reports found',
      body: 'There are no combat logs to show right now. Check back soon.',
    },
  };

  const current = config[kind];

  return (
    <Box
      role="status"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 1.5,
        py: 6,
        px: 2,
      }}
    >
      {current.icon}
      <Typography component="h2" variant="h6" sx={{ fontWeight: 600 }}>
        {current.title}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 440 }}>
        {current.body}
      </Typography>
      {current.action && (
        <Button variant="outlined" size="small" onClick={current.action.onClick} sx={{ mt: 1 }}>
          {current.action.label}
        </Button>
      )}
    </Box>
  );
};
