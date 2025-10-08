import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  IconButton,
  Pagination,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { MemoizedLoadingSpinner } from '../../components/CustomLoadingSpinner';
import { useEsoLogsClientInstance } from '../../EsoLogsClientContext';
import { GetUserReportsQuery, UserReportSummaryFragment } from '../../graphql/generated';
import { GetUserReportsDocument } from '../../graphql/reports.generated';
import { useAuth } from '../auth/AuthContext';
import { ReportListMobile } from '../reports/components/ReportListMobile';
import {
  formatReportDateTime,
  formatReportDuration,
  getReportVisibilityColor,
} from '../reports/reportFormatting';
import { useReportPageLayout } from '../reports/useReportPageLayout';

interface UserReportsState {
  reports: UserReportSummaryFragment[];
  loading: boolean;
  initialLoading: boolean; // Separate flag for initial page load vs pagination
  error: string | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalReports: number;
    perPage: number;
    hasMorePages: boolean;
  };
}

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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Skeleton
            variant="rounded"
            height={24}
            sx={{
              width: { xs: '90%', md: '80%' },
              maxWidth: 60,
            }}
          />
          {/* Small loading indicator to show active loading state */}
          <MemoizedLoadingSpinner size={16} thickness={2} />
        </Box>
      </TableCell>
    </TableRow>
  );
};
ReportsTableSkeletonRow.displayName = 'ReportsTableSkeletonRow';

ReportsTableSkeletonRow.displayName = 'ReportsTableSkeletonRow';

// Memoized skeleton row to prevent unnecessary re-renders
const MemoizedSkeletonRow = React.memo(ReportsTableSkeletonRow);
MemoizedSkeletonRow.displayName = 'MemoizedReportsTableSkeletonRow';

// Memoized loading overlay component to prevent unnecessary re-renders and theme flashing
const LoadingOverlayComponent: React.FC = () => {
  // Get theme mode without React context to avoid re-renders during loading
  const getThemeMode = (): 'dark' | 'light' => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  };

  const isDarkMode = getThemeMode();
  // Make overlay more transparent to allow content to show through
  const overlayBg = isDarkMode ? 'rgba(15, 23, 42, 0.3)' : 'rgba(255, 255, 255, 0.3)';

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: overlayBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        isolation: 'isolate',
        contain: 'strict',
        transition: 'opacity 0.2s ease-in-out',
        animation: 'none !important',
        transform: 'translateZ(0)',
        willChange: 'transform, opacity',
        pointerEvents: 'none',
        // Override any global transitions except opacity
        '&, & *': {
          transition: 'opacity 0.2s ease-in-out !important',
          animation: 'none !important',
        },
      }}
    >
      <MemoizedLoadingSpinner size={30} thickness={3} forceTheme={isDarkMode} />
    </Box>
  );
};

const LoadingOverlay = React.memo(LoadingOverlayComponent);
LoadingOverlay.displayName = 'LoadingOverlay';

export const UserReports: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { isLoggedIn, currentUser, userLoading, userError } = useAuth();
  const client = useEsoLogsClientInstance();
  const { isDesktop, cardSx, cardContentSx, headerStackSx, actionGroupSx } = useReportPageLayout();

  const renderHeaderContent = (insideCard: boolean): React.ReactElement => (
    <Box sx={{ mb: insideCard ? 3 : isDesktop ? 4 : 3 }}>
      <Box
        sx={{
          ...headerStackSx,
          mb: insideCard ? 1.5 : 1.5,
        }}
      >
        <Box>
          <Typography
            variant={isDesktop ? 'h4' : 'h5'}
            component="h1"
            sx={{ mb: insideCard ? 1.5 : 2 }}
          >
            My Reports
          </Typography>
          {currentUser && (
            <Typography variant="body1" color="text.secondary">
              Reports for {currentUser.name}
              {currentUser.naDisplayName && ` (${currentUser.naDisplayName})`}
              {currentUser.euDisplayName && ` (${currentUser.euDisplayName})`}
            </Typography>
          )}
        </Box>

        <Box sx={actionGroupSx}>
          <IconButton
            onClick={handleRefresh}
            disabled={state.loading}
            aria-label="refresh"
            size={isDesktop ? 'medium' : 'large'}
            sx={{
              backgroundColor: theme.palette.action.hover,
              '&:hover': {
                backgroundColor: theme.palette.action.selected,
              },
              width: isDesktop ? 'auto' : '100%',
            }}
          >
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {!currentUser && !userLoading && (
        <Alert severity="info" sx={{ mb: insideCard ? 2 : 1.5 }}>
          Note: Unable to load user profile information from ESO Logs API, but you can still view
          your reports below.
        </Alert>
      )}

      <Typography variant="body2" color="text.secondary" sx={{ mt: currentUser ? 1 : 0 }}>
        Total: {state.pagination.totalReports} reports
      </Typography>
    </Box>
  );

  const [state, setState] = useState<UserReportsState>({
    reports: [],
    loading: false, // Let useEffect handle initial loading
    initialLoading: true, // Show loading overlay on first load
    error: null,
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalReports: 0,
      perPage: REPORTS_PER_PAGE,
      hasMorePages: false,
    },
  });

  // Fetch functions
  const fetchUserReports = useCallback(
    async (page = 1): Promise<void> => {
      try {
        // Prevent redundant loading state updates to reduce re-renders
        setState((prev) => {
          if (prev.loading && prev.error === null) {
            return prev; // No change needed
          }
          const isInitialLoad = prev.reports.length === 0 && page === 1;
          return {
            ...prev,
            loading: true,
            initialLoading: isInitialLoad, // Only use initialLoading for first page load
            error: null,
          };
        });

        // Get the current user ID for filtering reports from AuthContext
        const userID = currentUser?.id;
        if (!userID) {
          setState((prev) => ({
            ...prev,
            loading: false,
            initialLoading: false,
            error: 'User ID not available. Please ensure you are logged in.',
          }));
          return;
        }

        const reportsResult: GetUserReportsQuery = await client.query({
          query: GetUserReportsDocument,
          variables: {
            limit: REPORTS_PER_PAGE,
            page,
            userID: typeof userID === 'string' ? parseInt(userID, 10) : userID,
          },
        });

        const reportPagination = reportsResult.reportData?.reports;

        if (!reportPagination) {
          setState((prev) => ({
            ...prev,
            loading: false,
            initialLoading: false,
            error: 'No reports data available',
          }));
          return;
        }

        setState((prev) => ({
          ...prev,
          reports: (reportPagination.data || []).filter(
            (report: UserReportSummaryFragment | null): report is UserReportSummaryFragment =>
              report !== null,
          ),
          loading: false,
          initialLoading: false,
          pagination: {
            currentPage: reportPagination.current_page,
            totalPages: reportPagination.last_page,
            totalReports: reportPagination.total,
            perPage: reportPagination.per_page,
            hasMorePages: reportPagination.has_more_pages,
          },
        }));
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch user reports:', error);
        setState((prev) => ({
          ...prev,
          loading: false,
          initialLoading: false,
          error: 'Failed to fetch reports',
        }));
      }
    },
    [client, currentUser?.id],
  );

  // Event handlers
  const handleRefresh = useCallback(() => {
    if (isLoggedIn) {
      fetchUserReports(state.pagination.currentPage);
    }
  }, [isLoggedIn, state.pagination.currentPage, fetchUserReports]);

  const handlePageChange = useCallback(
    (_event: React.ChangeEvent<unknown>, page: number) => {
      fetchUserReports(page);
    },
    [fetchUserReports],
  );

  const handleReportClick = useCallback(
    (reportCode: string) => {
      navigate(`/report/${reportCode}`);
    },
    [navigate],
  );

  useEffect(() => {
    if (!isLoggedIn) {
      setState((prev) => ({
        ...prev,
        reports: [],
        loading: false,
        initialLoading: false,
        error: 'Please log in to view your reports',
      }));
      return;
    }

    // Fetch reports when user is logged in and we have currentUser data
    if (currentUser?.id) {
      fetchUserReports(1);
    } else if (currentUser === null && !userLoading) {
      // Handle case where user is logged in but currentUser is null (failed to load user data)
      setState((prev) => ({
        ...prev,
        loading: false,
        initialLoading: false,
        error: 'User ID not available. Please ensure you are logged in.',
      }));
    } else if (currentUser && !currentUser.id && !userLoading) {
      // Handle case where currentUser exists but has no id field
      setState((prev) => ({
        ...prev,
        loading: false,
        initialLoading: false,
        error: 'User ID not available. Please ensure you are logged in.',
      }));
    }
  }, [isLoggedIn, currentUser, userLoading, fetchUserReports]);

  if (!isLoggedIn) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="warning">Please log in to view your reports.</Alert>
      </Container>
    );
  }

  // Show user loading state - but not if we're already fetching reports (prevents double loading circles)
  if (userLoading && !state.loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
        <CircularProgress size={40} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading user information...
        </Typography>
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
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {!isDesktop && renderHeaderContent(false)}

      {/* Error Alert */}
      {state.error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {state.error}
        </Alert>
      )}

      {/* Reports Table */}
      <Card
        sx={{
          ...cardSx,
          transition: state.initialLoading
            ? 'none !important'
            : 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          ...(state.initialLoading && {
            isolation: 'isolate',
            contain: 'strict',
            '&, & *': {
              transition: 'none !important',
              animation: 'none !important',
            },
          }),
          // Hover effect when not initially loading (allow hover during pagination)
          '&:hover': state.initialLoading
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
            p: isDesktop ? 4 : 0,
            position: 'relative',
          }}
        >
          {isDesktop && renderHeaderContent(true)}

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
                    <TableCell sx={{ width: '37%', whiteSpace: 'normal' }}>Title</TableCell>
                    <TableCell sx={{ width: '33%', whiteSpace: 'normal' }}>Zone</TableCell>
                    <TableCell sx={{ width: '15%', whiteSpace: 'normal' }}>Duration</TableCell>
                    <TableCell sx={{ width: '15%', whiteSpace: 'normal' }}>Visibility</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {state.loading
                    ? Array.from({ length: state.reports.length || REPORTS_PER_PAGE }).map(
                        (_, index) => (
                          <MemoizedSkeletonRow key={`skeleton-${index}`} index={index} />
                        ),
                      )
                    : state.reports.map((report) => (
                        <TableRow
                          key={report.code}
                          hover
                          onClick={() => handleReportClick(report.code)}
                          sx={{
                            cursor: 'pointer',
                            animation: !state.loading ? 'fadeIn 0.3s ease-out both' : 'none',
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
                      ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <ReportListMobile reports={state.reports} onSelect={handleReportClick} showOwner />
          )}

          {/* Loading overlay - only shows during initial load, not pagination */}
          {state.initialLoading && <LoadingOverlay />}
        </CardContent>
      </Card>

      {/* Pagination */}
      {state.pagination.totalPages > 1 && (
        <Box
          sx={{
            mt: 3,
            display: 'flex',
            justifyContent: 'center',
            transition: state.initialLoading
              ? 'none !important'
              : 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            ...(state.initialLoading && {
              isolation: 'isolate',
              contain: 'strict',
              '&, & *': {
                transition: 'none !important',
                animation: 'none !important',
              },
            }),
          }}
        >
          <Pagination
            className="data-grid-pagination"
            count={state.pagination.totalPages}
            page={state.pagination.currentPage}
            onChange={handlePageChange}
            color="primary"
            size="large"
            disabled={state.loading}
            sx={{
              // Enable pagination transitions when not initially loading
              transition: state.initialLoading ? 'none !important' : 'all 0.15s ease-in-out',
              // Enhanced hover effects when not initially loading (allow hover during pagination)
              '& .MuiPaginationItem-root': {
                transition: state.initialLoading ? 'none !important' : 'all 0.15s ease-in-out',
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
              ...(state.initialLoading && {
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
      {!state.loading && state.reports.length === 0 && !state.error && (
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
