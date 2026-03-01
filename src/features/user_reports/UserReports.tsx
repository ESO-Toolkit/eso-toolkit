import ClearIcon from '@mui/icons-material/Clear';
import FilterListIcon from '@mui/icons-material/FilterList';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useLogger } from '../../contexts/LoggerContext';
import { useEsoLogsClientInstance } from '../../EsoLogsClientContext';
import { useAppDispatch } from '../../store/useAppDispatch';
import {
  fetchUserReportsPage,
  fetchAllUserReports,
  setCurrentPage,
  setFilters,
  setSort,
  clearSearchText,
  clearCache,
  selectPaginatedReports,
  selectFilteredCount,
  selectFilteredTotalPages,
  selectLoading,
  selectIsFetchingAll,
  selectError,
  selectCurrentPage,
  selectTotalCount,
  selectFilters,
  selectSort,
  selectHasActiveFilters,
  selectCacheInfo,
  type SortField,
} from '../../store/user_reports';
import { useAuth } from '../auth/AuthContext';
import { ReportListMobile } from '../reports/components/ReportListMobile';
import {
  formatReportDateTime,
  formatReportDuration,
  getReportVisibilityColor,
} from '../reports/reportFormatting';
import { useReportPageLayout } from '../reports/useReportPageLayout';

const REPORTS_PER_PAGE = 10;

// Skeleton row component that matches the exact table structure
const ReportsTableSkeletonRow: React.FC<{ index: number }> = function ReportsTableSkeletonRow({
  index,
}) {
  return (
    <TableRow
      sx={{
        '&:hover': {
          backgroundColor: 'transparent', // No hover effect for skeleton
        },
        // Staggered fade-in animation with shimmer effect
        animation: `fadeInShimmer 0.6s ease-out ${index * 0.1}s both`,
        '@keyframes fadeInShimmer': {
          '0%': {
            opacity: 0,
            transform: 'translateY(-10px)',
          },
          '50%': {
            opacity: 0.7,
          },
          '100%': {
            opacity: 1,
            transform: 'translateY(0)',
          },
        },
        // Add subtle pulse animation to skeleton elements to show loading state
        '& .MuiSkeleton-root': {
          animation: 'pulse 2s ease-in-out infinite',
          '@keyframes pulse': {
            '0%': { opacity: 0.8 },
            '50%': { opacity: 1 },
            '100%': { opacity: 0.8 },
          },
        },
      }}
    >
      <TableCell>
        <Box>
          <Skeleton
            variant="text"
            height={24}
            sx={{
              mb: 0.25,
              width: { xs: '92%', md: '80%' },
              maxWidth: 220,
            }}
          />
          <Skeleton
            variant="text"
            height={20}
            sx={{
              width: { xs: '88%', md: '75%' },
              maxWidth: 120,
            }}
          />
        </Box>
      </TableCell>
      <TableCell>
        <Skeleton
          variant="text"
          height={20}
          sx={{
            width: { xs: '95%', md: '85%' },
            maxWidth: 150,
          }}
        />
      </TableCell>
      <TableCell>
        <Skeleton
          variant="text"
          height={20}
          sx={{
            width: { xs: '90%', md: '80%' },
            maxWidth: 140,
          }}
        />
      </TableCell>
      <TableCell>
        <Skeleton
          variant="text"
          height={20}
          sx={{
            width: { xs: '85%', md: '75%' },
            maxWidth: 80,
          }}
        />
      </TableCell>
      <TableCell>
        <Skeleton
          variant="rounded"
          height={24}
          sx={{
            width: { xs: '90%', md: '80%' },
            maxWidth: 60,
          }}
        />
      </TableCell>
    </TableRow>
  );
};
ReportsTableSkeletonRow.displayName = 'ReportsTableSkeletonRow';

ReportsTableSkeletonRow.displayName = 'ReportsTableSkeletonRow';

// Memoized skeleton row to prevent unnecessary re-renders
const MemoizedSkeletonRow = React.memo(ReportsTableSkeletonRow);
MemoizedSkeletonRow.displayName = 'MemoizedReportsTableSkeletonRow';

// Thin skeleton bar that sits at the top of the card during initial load
export const UserReports: React.FC = () => {
  const logger = useLogger('UserReports');
  const theme = useTheme();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isLoggedIn, currentUser, userLoading, userError } = useAuth();
  const client = useEsoLogsClientInstance();
  const { isDesktop, cardSx, cardContentSx, headerStackSx, actionGroupSx } = useReportPageLayout();

  // Redux selectors
  const paginatedReports = useSelector(selectPaginatedReports);
  const filteredCount = useSelector(selectFilteredCount);
  const filteredTotalPages = useSelector(selectFilteredTotalPages);
  const loading = useSelector(selectLoading);
  const isFetchingAll = useSelector(selectIsFetchingAll);
  const error = useSelector(selectError);
  const currentPage = useSelector(selectCurrentPage);
  const totalCount = useSelector(selectTotalCount);
  const filters = useSelector(selectFilters);
  const sort = useSelector(selectSort);
  const hasActiveFilters = useSelector(selectHasActiveFilters);
  const cacheInfo = useSelector(selectCacheInfo);

  // Get the current page from URL query parameter
  const currentPageFromUrl = parseInt(searchParams.get('page') || '1', 10);
  const pageToUse = isNaN(currentPageFromUrl) || currentPageFromUrl < 1 ? 1 : currentPageFromUrl;

  // Track initial loading state
  const [initialLoading, setInitialLoading] = React.useState(true);

  // Fetch page data
  const fetchPage = useCallback(
    async (page: number) => {
      const userID = currentUser?.id;
      if (!userID) {
        logger.error('Cannot fetch reports: User ID not available');
        return;
      }

      try {
        await dispatch(
          fetchUserReportsPage({
            client,
            userId: userID,
            page,
            limit: 100, // Fetch 100 at a time for better caching
          }),
        ).unwrap();
      } catch (err) {
        logger.error(
          'Failed to fetch user reports',
          err instanceof Error ? err : new Error(String(err)),
        );
      }
    },
    [client, currentUser?.id, dispatch, logger],
  );

  // Event handlers
  const handleRefresh = useCallback(() => {
    if (isLoggedIn && currentUser?.id) {
      dispatch(clearCache());
      dispatch(setCurrentPage(1));
      setSearchParams({ page: '1' });
      // Fetch all reports again
      dispatch(
        fetchAllUserReports({
          client,
          userId: currentUser.id,
          limit: 100,
        }),
      );
    }
  }, [isLoggedIn, currentUser?.id, dispatch, setSearchParams, client]);

  const handlePageChange = useCallback(
    (_event: React.ChangeEvent<unknown>, page: number) => {
      // Update Redux state
      dispatch(setCurrentPage(page));
      // Update URL query parameter
      setSearchParams({ page: page.toString() });
      // Fetch page if not cached (check pages map directly)
      // We need to access state, so we'll fetch unconditionally for simplicity
      // The async thunk will handle checking if data exists
      fetchPage(page);
    },
    [dispatch, setSearchParams, fetchPage],
  );

  const handleReportClick = useCallback(
    (reportCode: string, event?: React.MouseEvent) => {
      const url = `/report/${reportCode}`;

      // Check if middle-click, Ctrl+Click, or Cmd+Click (Mac)
      if (event && (event.button === 1 || event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        navigate(url);
      }
    },
    [navigate],
  );

  // Filter and sort handlers
  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      dispatch(setFilters({ searchText: event.target.value }));
    },
    [dispatch],
  );

  const handleClearSearch = useCallback(() => {
    dispatch(clearSearchText());
  }, [dispatch]);

  const handleVisibilityFilterChange = useCallback(
    (event: { target: { value: string } }) => {
      dispatch(
        setFilters({ visibility: event.target.value as 'all' | 'public' | 'private' | 'unlisted' }),
      );
    },
    [dispatch],
  );

  const handleSortChange = useCallback(
    (field: SortField) => {
      dispatch(
        setSort({
          field,
          order: sort.field === field && sort.order === 'asc' ? 'desc' : 'asc',
        }),
      );
    },
    [dispatch, sort],
  );

  // Sync URL page parameter with Redux state
  useEffect(() => {
    if (pageToUse !== currentPage) {
      dispatch(setCurrentPage(pageToUse));
    }
  }, [pageToUse, currentPage, dispatch]);

  // Initial data loading - fetch all reports
  useEffect(() => {
    if (!isLoggedIn) {
      setInitialLoading(false);
      return;
    }

    // Fetch all reports when user is logged in and we have currentUser data.
    // Guard with hasFetchedAll (not totalCachedReports) so we don't re-dispatch
    // after a failed fetch or when the user genuinely has zero reports (ESO-595).
    if (currentUser?.id && !cacheInfo.hasFetchedAll && !isFetchingAll) {
      dispatch(
        fetchAllUserReports({
          client,
          userId: currentUser.id,
          limit: 100,
        }),
      )
        .unwrap()
        .catch((err) => {
          logger.error(
            'Failed to fetch all reports',
            err instanceof Error ? err : new Error(String(err)),
          );
        })
        .finally(() => {
          setInitialLoading(false);
        });
    } else if (currentUser === null && !userLoading) {
      // Handle case where user is logged in but currentUser is null
      setInitialLoading(false);
    } else if (cacheInfo.hasFetchedAll) {
      setInitialLoading(false);
    }
  }, [
    isLoggedIn,
    currentUser,
    userLoading,
    cacheInfo.hasFetchedAll,
    isFetchingAll,
    dispatch,
    client,
    logger,
  ]);

  if (!isLoggedIn) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="warning">Please log in to view your reports.</Alert>
      </Container>
    );
  }

  // Show user loading state — skeleton mirrors the actual page structure exactly
  if (userLoading && !loading) {
    return (
      <Container maxWidth="lg" sx={{ py: isDesktop ? 4 : 2 }}>
        <Card
          elevation={isDesktop ? 4 : 1}
          sx={{
            ...cardSx,
            background: (t) =>
              t.palette.mode === 'dark'
                ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(0, 225, 255, 0.12) 100%)'
                : 'linear-gradient(135deg, rgba(219, 234, 254, 0.5) 0%, rgba(224, 242, 254, 0.5) 100%)',
          }}
        >
          <CardContent sx={{ ...cardContentSx, position: 'relative' }}>
            {/* Mobile: floating refresh button placeholder */}
            {!isDesktop && (
              <Skeleton
                variant="circular"
                width={40}
                height={40}
                sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1 }}
              />
            )}

            {/* Header — uses same headerStackSx as real page */}
            <Box sx={{ ...headerStackSx, mb: 3 }}>
              <Box>
                <Skeleton
                  variant="text"
                  width={isDesktop ? 200 : 160}
                  height={isDesktop ? 52 : 40}
                  sx={{ mb: 0.5 }}
                />
                <Skeleton variant="text" width={isDesktop ? 280 : 220} height={24} />
              </Box>
              {isDesktop && (
                <Box sx={actionGroupSx}>
                  <Skeleton variant="circular" width={40} height={40} />
                </Box>
              )}
            </Box>

            {/* Filter controls — Stack spacing={2} mb={3} */}
            <Stack spacing={2} sx={{ mb: 3 }}>
              <Stack direction={isDesktop ? 'row' : 'column'} spacing={2}>
                <Skeleton variant="rounded" height={40} sx={{ flex: 1 }} />
                <Skeleton
                  variant="rounded"
                  height={40}
                  sx={{ width: isDesktop ? 220 : '100%', flexShrink: 0 }}
                />
              </Stack>
              {/* "Total: X reports" count row */}
              <Skeleton variant="text" width={120} height={20} />
            </Stack>

            {/* Desktop: full table with header columns at correct widths */}
            {isDesktop ? (
              <TableContainer component={Paper} elevation={0} sx={{ overflowX: 'hidden' }}>
                <Table sx={{ tableLayout: 'fixed', width: '100%' }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: '37%' }}>
                        <Skeleton variant="text" width={34} height={20} />
                      </TableCell>
                      <TableCell sx={{ width: '33%' }}>
                        <Skeleton variant="text" width={32} height={20} />
                      </TableCell>
                      <TableCell sx={{ width: '15%' }}>
                        <Skeleton variant="text" width={56} height={20} />
                      </TableCell>
                      <TableCell sx={{ width: '15%' }}>
                        <Skeleton variant="text" width={66} height={20} />
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Array.from({ length: REPORTS_PER_PAGE }).map((_, i) => (
                      <MemoizedSkeletonRow key={`user-skel-${i}`} index={i} />
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              /* Mobile: card list matching ReportListMobile structure */
              <Stack spacing={2} sx={{ mt: 2 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Paper
                    key={i}
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1.5,
                      opacity: 1 - i * 0.1,
                    }}
                  >
                    <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={1}>
                      <Box flex={1} minWidth={0}>
                        <Skeleton variant="text" width="72%" height={22} />
                        <Skeleton variant="text" width="40%" height={16} sx={{ mt: 0.25 }} />
                      </Box>
                      <Skeleton variant="rounded" width={62} height={22} sx={{ flexShrink: 0 }} />
                    </Box>
                    <Box display="flex" gap={2}>
                      <Skeleton variant="text" width="48%" height={18} />
                      <Skeleton variant="text" width="28%" height={18} />
                    </Box>
                  </Paper>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Container>
    );
  }

  // Show user error state
  if (userError) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{userError}</Alert>
      </Container>
    );
  }

  // Note: Removed initial loading state to prevent multiple loading indicators during pagination
  // The overlay loading (line ~382) handles all loading states including initial load

  return (
    <Container maxWidth="lg" sx={{ py: isDesktop ? 4 : 2 }}>
      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Reports Table */}
      <Card
        elevation={isDesktop ? 4 : 1}
        sx={{
          ...cardSx,
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(0, 225, 255, 0.12) 100%)'
              : 'linear-gradient(135deg, rgba(219, 234, 254, 0.5) 0%, rgba(224, 242, 254, 0.5) 100%)',
          transition: initialLoading ? 'none !important' : 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          ...(initialLoading && {
            isolation: 'isolate',
            '&, & *': {
              transition: 'none !important',
              animation: 'none !important',
            },
          }),
          // Hover effect when not initially loading (allow hover during pagination)
          '&:hover': initialLoading
            ? {}
            : {
                transform: 'translateY(-2px)',
                boxShadow: (theme) =>
                  theme.palette.mode === 'dark'
                    ? '0 8px 32px rgba(56, 189, 248, 0.15)'
                    : '0 8px 32px rgba(25, 118, 210, 0.1)',
              },
        }}
      >
        <CardContent
          sx={{
            ...cardContentSx,
            position: 'relative',
          }}
        >
          {/* Mobile Floating Refresh Button */}
          {!isDesktop && (
            <IconButton
              onClick={handleRefresh}
              disabled={loading}
              aria-label="refresh"
              color="primary"
              sx={{
                position: 'absolute',
                top: 16,
                right: 16,
                zIndex: 1,
                backgroundColor: theme.palette.background.paper,
                boxShadow: theme.shadows[2],
                '&:hover': {
                  backgroundColor: theme.palette.action.hover,
                },
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
                sx={{ mb: isDesktop ? 0.5 : 0, pr: isDesktop ? 0 : 5 }} // Add right padding on mobile to account for floating button
              >
                My Reports
              </Typography>
              {currentUser && (
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{
                    maxWidth: isDesktop ? 'none' : '26ch',
                    pr: isDesktop ? 0 : 1, // Add some right padding on mobile
                  }}
                >
                  Reports for {currentUser.name}
                  {currentUser.naDisplayName && ` (${currentUser.naDisplayName})`}
                  {currentUser.euDisplayName && ` (${currentUser.euDisplayName})`}
                </Typography>
              )}
            </Box>

            {isDesktop && (
              <Box sx={actionGroupSx}>
                <IconButton
                  onClick={handleRefresh}
                  disabled={loading}
                  aria-label="refresh"
                  color="primary"
                  sx={{
                    width: 'auto',
                  }}
                >
                  <RefreshIcon />
                </IconButton>
              </Box>
            )}
          </Box>

          {!currentUser && !userLoading && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Note: Unable to load user profile information from ESO Logs API, but you can still
              view your reports below.
            </Alert>
          )}

          {/* Filter Controls */}
          <Stack spacing={2} sx={{ mb: 3 }}>
            <Stack direction={isDesktop ? 'row' : 'column'} spacing={2}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by title or zone..."
                value={filters.searchText}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: filters.searchText && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={handleClearSearch}
                        edge="end"
                        aria-label="clear search"
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <FormControl size="small" sx={{ minWidth: isDesktop ? 200 : '100%' }}>
                <InputLabel>Visibility</InputLabel>
                <Select
                  value={filters.visibility}
                  label="Visibility"
                  onChange={handleVisibilityFilterChange}
                  startAdornment={
                    <InputAdornment position="start">
                      <FilterListIcon fontSize="small" />
                    </InputAdornment>
                  }
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="public">Public</MenuItem>
                  <MenuItem value="private">Private</MenuItem>
                  <MenuItem value="unlisted">Unlisted</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {filteredCount === totalCount
                  ? `Total: ${totalCount} reports`
                  : `Showing ${filteredCount} of ${totalCount} reports`}
              </Typography>
              {hasActiveFilters && (
                <Chip
                  size="small"
                  label="Filters active"
                  onDelete={() => {
                    dispatch(setFilters({ searchText: '', visibility: 'all' }));
                  }}
                  color="primary"
                  variant="outlined"
                />
              )}
            </Box>
          </Stack>

          {isDesktop ? (
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{
                transition: 'none',
                overflowX: 'hidden',
              }}
            >
              <Table sx={{ tableLayout: 'fixed', width: '100%' }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: '37%', whiteSpace: 'normal' }}>
                      <TableSortLabel
                        active={sort.field === 'title'}
                        direction={sort.field === 'title' ? sort.order : 'asc'}
                        onClick={() => handleSortChange('title')}
                      >
                        Title
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ width: '33%', whiteSpace: 'normal' }}>
                      <TableSortLabel
                        active={sort.field === 'zone'}
                        direction={sort.field === 'zone' ? sort.order : 'asc'}
                        onClick={() => handleSortChange('zone')}
                      >
                        Zone
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ width: '15%', whiteSpace: 'normal' }}>
                      <TableSortLabel
                        active={sort.field === 'duration'}
                        direction={sort.field === 'duration' ? sort.order : 'asc'}
                        onClick={() => handleSortChange('duration')}
                      >
                        Duration
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ width: '15%', whiteSpace: 'normal' }}>
                      <TableSortLabel
                        active={sort.field === 'visibility'}
                        direction={sort.field === 'visibility' ? sort.order : 'asc'}
                        onClick={() => handleSortChange('visibility')}
                      >
                        Visibility
                      </TableSortLabel>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    Array.from({ length: REPORTS_PER_PAGE }).map((_, index) => (
                      <MemoizedSkeletonRow key={`skeleton-${index}`} index={index} />
                    ))
                  ) : paginatedReports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 8 }}>
                        <Typography variant="body1" color="text.secondary">
                          {totalCount === 0
                            ? 'No reports found'
                            : 'No reports found matching your filters'}
                        </Typography>
                        {totalCount > 0 && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            Try adjusting your search or filter criteria
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedReports.map((report) => (
                      <TableRow
                        key={report.code}
                        hover
                        onClick={(e) => handleReportClick(report.code, e)}
                        onMouseDown={(e) => {
                          // Handle middle-click
                          if (e.button === 1) {
                            e.preventDefault();
                            handleReportClick(report.code, e);
                          }
                        }}
                        sx={{
                          cursor: 'pointer',
                          animation: !loading ? 'fadeIn 0.3s ease-out both' : 'none',
                          '@keyframes fadeIn': {
                            '0%': { opacity: 0 },
                            '100%': { opacity: 1 },
                          },
                          transition: 'all 0.15s ease-in-out',
                          '&:hover': {
                            backgroundColor: (theme) =>
                              theme.palette.mode === 'dark'
                                ? 'rgba(56, 189, 248, 0.05)'
                                : 'rgba(25, 118, 210, 0.04)',
                            boxShadow: (theme) =>
                              theme.palette.mode === 'dark'
                                ? '0 2px 8px rgba(56, 189, 248, 0.15)'
                                : '0 2px 8px rgba(25, 118, 210, 0.1)',
                          },
                        }}
                      >
                        <TableCell>
                          <Box>
                            <Typography variant="body1" fontWeight="medium">
                              {report.title || 'Untitled Report'}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ mt: 0.25, display: 'block' }}
                            >
                              {formatReportDateTime(report.startTime)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {report.zone?.name || 'Unknown Zone'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatReportDuration(report.startTime, report.endTime)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={report.visibility}
                            size="small"
                            color={getReportVisibilityColor(report.visibility)}
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <>
              {paginatedReports.length === 0 ? (
                <Box sx={{ py: 8, textAlign: 'center' }}>
                  <Typography variant="body1" color="text.secondary">
                    {totalCount === 0
                      ? 'No reports found'
                      : 'No reports found matching your filters'}
                  </Typography>
                  {totalCount > 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Try adjusting your search or filter criteria
                    </Typography>
                  )}
                </Box>
              ) : (
                <ReportListMobile
                  reports={paginatedReports}
                  onSelect={handleReportClick}
                  showOwner
                />
              )}
            </>
          )}

        </CardContent>
      </Card>

      {/* Pagination */}
      {filteredTotalPages > 1 && (
        <Box
          sx={{
            mt: 3,
            display: 'flex',
            justifyContent: 'center',
            transition: initialLoading
              ? 'none !important'
              : 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            ...(initialLoading && {
              isolation: 'isolate',
              '&, & *': {
                transition: 'none !important',
                animation: 'none !important',
              },
            }),
          }}
        >
          <Pagination
            className="data-grid-pagination"
            count={filteredTotalPages}
            page={currentPage}
            onChange={handlePageChange}
            color="primary"
            size={isDesktop ? 'large' : 'large'}
            boundaryCount={isDesktop ? 2 : 0}
            siblingCount={isDesktop ? 2 : 0}
            disabled={loading}
            sx={{
              // Enable pagination transitions when not initially loading
              transition: initialLoading ? 'none !important' : 'all 0.15s ease-in-out',
              // Responsive spacing only for mobile
              mx: isDesktop ? 0 : 1,
              // Enhanced hover effects when not initially loading (allow hover during pagination)
              '& .MuiPaginationItem-root': {
                borderRadius: isDesktop ? '50%' : 2,
                transition: initialLoading ? 'none !important' : 'all 0.15s ease-in-out',
                // Larger touch targets only for mobile accessibility, fixed dimensions for desktop circles
                minWidth: isDesktop ? 40 : 44,
                minHeight: isDesktop ? 40 : 44,
                width: isDesktop ? 40 : 'auto',
                height: isDesktop ? 40 : 'auto',
                padding: isDesktop ? '0' : '0 8px',
                '&:hover:not(.Mui-selected):not(:disabled)': {
                  transform: 'translateY(-1px)',
                  boxShadow: (theme) =>
                    theme.palette.mode === 'dark'
                      ? '0 4px 12px rgba(56, 189, 248, 0.25)'
                      : '0 4px 12px rgba(25, 118, 210, 0.2)',
                },
                '&.Mui-selected': {
                  backgroundColor: (theme) =>
                    theme.palette.mode === 'dark'
                      ? 'rgba(56, 189, 248, 0.15)'
                      : 'rgba(25, 118, 210, 0.15)',
                  boxShadow: (theme) =>
                    theme.palette.mode === 'dark'
                      ? '0 4px 12px rgba(56, 189, 248, 0.3)'
                      : '0 4px 12px rgba(25, 118, 210, 0.2)',
                },
              },
              // Force isolation during initial load only
              ...(initialLoading && {
                '&, & *': {
                  transition: 'none !important',
                  animation: 'none !important',
                },
              }),
            }}
          />
        </Box>
      )}

      {/* Empty state */}
      {!loading && paginatedReports.length === 0 && !error && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No reports found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You haven&apos;t uploaded any reports yet, or they may not be visible with your current
            permissions.
          </Typography>
        </Box>
      )}
    </Container>
  );
};
