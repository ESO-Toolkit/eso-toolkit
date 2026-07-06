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
  /**
   * How many hidden empties are recent uploads plausibly still parsing on
   * ESO Logs. When zero, the all-hidden copy must not promise that refreshing
   * in a few minutes will surface them — old empties are permanent parse
   * failures that never heal.
   */
  hiddenRecentCount?: number;
}

export function selectEmptyStateKind(input: EmptyStateInput): EmptyStateKind {
  const { serverFilterActive, searchActive, loadedCount, hiddenEmptyCount } = input;
  // The server returned rows but the client text query filtered them all out.
  if (searchActive && loadedCount > 0) return 'search-no-match';
  // Every row on this page was an empty (no-combat) log, hidden by
  // `useLatestReportsQuery` (empty logs open to "No fights available", so the
  // list never shows them). This must win over `filter-no-results`: rows DID
  // come back for the active filters — they just have no combat data yet.
  if (loadedCount === 0 && hiddenEmptyCount > 0) return 'all-hidden';
  // The server returned nothing for the active zone/date filter.
  if (serverFilterActive && loadedCount === 0) return 'filter-no-results';
  return 'cold-empty';
}

interface ReportsEmptyStateProps {
  input: EmptyStateInput;
  query: string;
  onClearSearch: () => void;
  onClearFilters: () => void;
  /** Revalidates the list from the network (the `all-hidden` recovery action). */
  onRefresh?: () => void;
}

export const ReportsEmptyState: React.FC<ReportsEmptyStateProps> = ({
  input,
  query,
  onClearSearch,
  onClearFilters,
  onRefresh,
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
    'all-hidden':
      (input.hiddenRecentCount ?? 0) > 0
        ? {
            icon: <VisibilityOffIcon fontSize="large" color="action" />,
            title:
              input.hiddenEmptyCount === 1
                ? 'The only log on this page has no combat data yet'
                : `All ${input.hiddenEmptyCount} logs on this page have no combat data yet`,
            body: 'They were hidden because opening one would only show an empty report. Just-uploaded logs usually finish processing on ESO Logs within a few minutes — refresh to check again, or browse another page.',
            action: onRefresh ? { label: 'Refresh', onClick: onRefresh } : undefined,
          }
        : {
            icon: <VisibilityOffIcon fontSize="large" color="action" />,
            title:
              input.hiddenEmptyCount === 1
                ? 'The only log on this page contains no combat data'
                : `None of the ${input.hiddenEmptyCount} logs on this page contain combat data`,
            // These are old uploads whose fights never parsed — refreshing
            // cannot surface them, so offer a real way out instead.
            body: 'They were hidden because opening one would only show an empty report. These are older uploads whose combat data never parsed on ESO Logs, so refreshing will not change them — try another page or different filters.',
            action: input.serverFilterActive
              ? { label: 'Clear filters', onClick: onClearFilters }
              : undefined,
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
