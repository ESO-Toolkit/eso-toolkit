import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Container,
  IconButton,
  Pagination,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useReportPageLayout } from '../reports/useReportPageLayout';

import { ActiveFilterBar } from './components/ActiveFilterBar';
import type { DateRangeValue } from './components/DateRangeFilter';
import { MobileFilterSheet } from './components/MobileFilterSheet';
import { ReportCardGrid } from './components/ReportCardGrid';
import { ReportsEmptyState, type EmptyStateInput } from './components/ReportsEmptyState';
import { ReportsResultsMeta } from './components/ReportsResultsMeta';
import { ReportsSkeleton } from './components/ReportsSkeleton';
import { ReportsTable } from './components/ReportsTable';
import { ReportsToolbar } from './components/ReportsToolbar';
import { useFilteredReports } from './hooks/useFilteredReports';
import { useLatestReportsQuery } from './hooks/useLatestReportsQuery';
import { hasActiveServerFilter, useLatestReportsUrlState } from './hooks/useLatestReportsUrlState';
import { useReportViewPrefs } from './hooks/useReportViewPrefs';
import { useZoneOptions } from './hooks/useZoneOptions';

const DENSITY_VARS: Record<'comfortable' | 'compact', React.CSSProperties> = {
  comfortable: {
    ['--report-row-height' as string]: '56px',
    ['--report-padding' as string]: '16px',
    ['--report-gap' as string]: '12px',
    ['--report-grid-gap' as string]: '16px',
  },
  compact: {
    ['--report-row-height' as string]: '40px',
    ['--report-padding' as string]: '12px',
    ['--report-gap' as string]: '8px',
    ['--report-grid-gap' as string]: '12px',
  },
};

export const LatestReports: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { isDesktop, cardSx, cardContentSx, headerStackSx, actionGroupSx } = useReportPageLayout();

  useEffect(() => {
    document.title = 'Latest Reports | ESO Toolkit';
  }, []);

  const { filters, setFilters, clearServerFilters } = useLatestReportsUrlState();
  const { viewMode, density, setViewMode, setDensity } = useReportViewPrefs();
  const { zones } = useZoneOptions();

  const { reports, hiddenEmptyCount, loading, error, pagination, refetch } = useLatestReportsQuery({
    page: filters.page,
    zoneId: filters.zoneId,
    range: filters.range,
    customFrom: filters.customFrom,
    customTo: filters.customTo,
  });

  const { filtered, visibleCount, loadedCount, appliedQuery } = useFilteredReports(
    reports,
    filters.q,
  );

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const [announcement, setAnnouncement] = useState('');

  // Effective layout: mobile is always cards; desktop honours the toggle.
  const effectiveViewMode = isDesktop ? viewMode : 'cards';
  const searchActive = appliedQuery.trim().length > 0;
  const serverFilterActive = hasActiveServerFilter(filters);
  const activeServerFilterCount =
    (filters.zoneId !== null ? 1 : 0) + (filters.range !== 'all' ? 1 : 0);

  // --- Handlers ---------------------------------------------------------------

  const handleReportClick = useCallback(
    (reportCode: string, event?: React.MouseEvent): void => {
      const url = `/report/${reportCode}`;
      if (event && (event.button === 1 || event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        navigate(url);
      }
    },
    [navigate],
  );

  const handlePageChange = useCallback(
    (_event: React.ChangeEvent<unknown>, page: number): void => {
      setFilters({ page });
      // Move focus to the results region so keyboard users are not stranded.
      requestAnimationFrame(() => resultsRef.current?.focus());
    },
    [setFilters],
  );

  const handleDateChange = useCallback(
    (value: DateRangeValue): void => {
      setFilters({ range: value.range, customFrom: value.customFrom, customTo: value.customTo });
    },
    [setFilters],
  );

  const handleApplyMobileFilters = useCallback(
    (next: { zoneId: number | null; date: DateRangeValue }): void => {
      setFilters({
        zoneId: next.zoneId,
        range: next.date.range,
        customFrom: next.date.customFrom,
        customTo: next.date.customTo,
      });
    },
    [setFilters],
  );

  // --- Live region announcements (debounced via the filtered hook) ------------

  useEffect(() => {
    if (loading) return;
    let message: string;
    if (searchActive) {
      message =
        visibleCount === 0
          ? `No reports match "${appliedQuery.trim()}". Try clearing the search or adjusting Zone and Date filters.`
          : `Showing ${visibleCount} of ${loadedCount} loaded reports.`;
    } else {
      message = `Showing ${loadedCount} reports on page ${pagination.currentPage} of ${pagination.totalPages}.`;
    }
    setAnnouncement(message);
  }, [
    loading,
    searchActive,
    appliedQuery,
    visibleCount,
    loadedCount,
    pagination.currentPage,
    pagination.totalPages,
  ]);

  const emptyStateInput: EmptyStateInput = useMemo(
    () => ({ serverFilterActive, searchActive, loadedCount, hiddenEmptyCount }),
    [serverFilterActive, searchActive, loadedCount, hiddenEmptyCount],
  );

  const showResults = filtered.length > 0;
  const showEmptyState = !loading && filtered.length === 0;
  const showInitialSkeleton = loading && reports.length === 0;

  // --- Render -----------------------------------------------------------------

  return (
    <Container maxWidth="lg" sx={{ py: isDesktop ? 4 : 2 }}>
      <Card
        elevation={isDesktop ? 4 : 1}
        sx={{
          ...cardSx,
          background: (t: Theme) =>
            t.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(0, 225, 255, 0.12) 100%)'
              : 'linear-gradient(135deg, rgba(219, 234, 254, 0.5) 0%, rgba(224, 242, 254, 0.5) 100%)',
        }}
      >
        <CardContent sx={{ ...cardContentSx, position: 'relative' }}>
          {/* Mobile floating refresh */}
          {!isDesktop && (
            <IconButton
              onClick={refetch}
              disabled={loading}
              aria-label="Refresh reports"
              color="primary"
              sx={{
                position: 'absolute',
                top: 16,
                right: 16,
                zIndex: 2,
                backgroundColor: theme.palette.background.paper,
                boxShadow: theme.shadows[2],
                '&:hover': { backgroundColor: theme.palette.action.hover },
              }}
            >
              <RefreshIcon />
            </IconButton>
          )}

          {/* Header */}
          <Box sx={{ ...headerStackSx, mb: 3 }}>
            <Box>
              <Typography
                variant={isDesktop ? 'h4' : 'h5'}
                component="h1"
                gutterBottom
                sx={{ mb: isDesktop ? 0.5 : 0, pr: isDesktop ? 0 : 5 }}
              >
                Latest Reports
              </Typography>
              <Typography
                variant="body1"
                sx={{ color: 'text.secondary', maxWidth: isDesktop ? 'none' : '26ch' }}
              >
                Discover the most recent combat logs from the community
              </Typography>
            </Box>
            {isDesktop && (
              <Box sx={actionGroupSx}>
                <Tooltip title="Refresh" arrow>
                  {/* span wrapper: a disabled button cannot fire the events the
                      Tooltip needs, so wrap it to keep the tooltip working. */}
                  <span>
                    <IconButton
                      onClick={refetch}
                      disabled={loading}
                      aria-label="Refresh reports"
                      color="primary"
                    >
                      <RefreshIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            )}
          </Box>

          {/* Sticky toolbar */}
          <Box
            sx={{
              position: 'sticky',
              top: 0,
              zIndex: 3,
              py: 1.5,
              backgroundColor: (t: Theme) =>
                t.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(8px)',
              borderBottom: '1px solid',
              borderColor: 'divider',
              mx: isDesktop ? -4 : -2,
              px: isDesktop ? 4 : 2,
            }}
          >
            <ReportsToolbar
              isDesktop={isDesktop}
              filters={filters}
              searchValue={filters.q}
              onSearchChange={(value) => setFilters({ q: value }, { replace: true })}
              onZoneChange={(zoneId) => setFilters({ zoneId })}
              onDateChange={handleDateChange}
              viewMode={effectiveViewMode}
              onViewModeChange={setViewMode}
              density={density}
              onDensityChange={setDensity}
              activeServerFilterCount={activeServerFilterCount}
              onOpenMobileFilters={() => setMobileFiltersOpen(true)}
              searchInputRef={searchInputRef}
            />
          </Box>

          {/* Active filter chips */}
          <ActiveFilterBar
            filters={filters}
            zones={zones}
            visibleCount={visibleCount}
            searchActive={searchActive}
            onRemoveZone={() => setFilters({ zoneId: null })}
            onRemoveDate={() => setFilters({ range: 'all', customFrom: null, customTo: null })}
            onClearAll={clearServerFilters}
            searchInputRef={searchInputRef}
          />

          {/* Results meta */}
          {(reports.length > 0 || hiddenEmptyCount > 0) && (
            <Box sx={{ mt: 1, mb: 2 }}>
              <ReportsResultsMeta
                pagination={pagination}
                hiddenEmptyCount={hiddenEmptyCount}
                isDesktop={isDesktop}
              />
            </Box>
          )}

          {/* Live region (visually hidden) */}
          <Box
            role="status"
            aria-live="polite"
            aria-atomic="true"
            sx={{
              position: 'absolute',
              width: 1,
              height: 1,
              overflow: 'hidden',
              clip: 'rect(0 0 0 0)',
              whiteSpace: 'nowrap',
            }}
          >
            {announcement}
          </Box>

          {/* Results */}
          <Box
            ref={resultsRef}
            tabIndex={-1}
            aria-busy={loading}
            style={DENSITY_VARS[density]}
            sx={{
              outline: 'none',
              scrollPaddingTop: '72px',
              position: 'relative',
              minHeight: 200,
            }}
          >
            {error ? (
              <ReportsEmptyState
                input={{
                  serverFilterActive,
                  searchActive: false,
                  loadedCount: 0,
                  hiddenEmptyCount: 0,
                }}
                query=""
                onClearSearch={() => setFilters({ q: '' })}
                onClearFilters={clearServerFilters}
              />
            ) : showInitialSkeleton ? (
              <ReportsSkeleton viewMode={effectiveViewMode} isDesktop={isDesktop} />
            ) : showResults ? (
              effectiveViewMode === 'table' ? (
                <ReportsTable reports={filtered} onSelect={handleReportClick} />
              ) : (
                <ReportCardGrid reports={filtered} onSelect={handleReportClick} />
              )
            ) : showEmptyState ? (
              <ReportsEmptyState
                input={emptyStateInput}
                query={appliedQuery}
                onClearSearch={() => setFilters({ q: '' })}
                onClearFilters={clearServerFilters}
              />
            ) : null}

            {/* Re-fetch overlay (keeps prior results visible) */}
            {loading && reports.length > 0 && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                  pt: 8,
                  bgcolor: (t: Theme) =>
                    t.palette.mode === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.6)',
                  zIndex: 1,
                }}
              >
                <CircularProgress aria-label="Loading reports" />
              </Box>
            )}
          </Box>

          {/* Error message (when nothing else surfaced it) */}
          {error && (
            <Typography variant="body2" color="error" sx={{ mt: 2, textAlign: 'center' }}>
              {error}
            </Typography>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <Box sx={{ mt: isDesktop ? 3 : 2, display: 'flex', justifyContent: 'center' }}>
              <Pagination
                count={pagination.totalPages}
                page={pagination.currentPage}
                onChange={handlePageChange}
                disabled={loading}
                color="primary"
                size={isDesktop ? 'large' : 'medium'}
                sx={{ '& .MuiPaginationItem-root': { borderRadius: 2 } }}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Mobile filter sheet */}
      {!isDesktop && (
        <MobileFilterSheet
          open={mobileFiltersOpen}
          onClose={() => setMobileFiltersOpen(false)}
          filters={filters}
          onApply={handleApplyMobileFilters}
        />
      )}
    </Container>
  );
};
