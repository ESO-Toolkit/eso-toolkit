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

export const UserReports: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { isLoggedIn, currentUser, userLoading, userError } = useAuth();
  const client = useEsoLogsClientInstance();
  const { isDesktop, cardSx, cardContentSx, headerStackSx, actionGroupSx } = useReportPageLayout();

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
    <Container maxWidth="lg" sx={{ py: isDesktop ? 4 : 2 }}>
      <Card elevation={isDesktop ? 4 : 1} sx={cardSx}>
        <CardContent sx={{ ...cardContentSx, position: 'relative' }}>
          {/* Mobile Floating Refresh Button */}
          {!isDesktop && (
            <IconButton
              onClick={handleRefresh}
              disabled={state.loading}
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
                  disabled={state.loading}
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
              Note: Unable to load user profile information from ESO Logs API, but you can still view
              your reports below.
            </Alert>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mb: currentUser ? 2 : 1 }}>
            Total: {state.pagination.totalReports} reports
          </Typography>

          {/* Error Alert */}
          {state.error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {state.error}
            </Alert>
          )}

          {state.reports.length > 0 ? (
            <>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems={isDesktop ? 'center' : 'flex-start'}
                flexDirection={isDesktop ? 'row' : 'column'}
                gap={isDesktop ? 2 : 1.5}
                mb={isDesktop ? 3 : 2}
              >
                <Typography variant="body1" color="text.secondary">
                  Showing page {state.pagination.currentPage} of {state.pagination.totalPages} -{' '}
                  {state.pagination.totalReports} total reports
                </Typography>

                <Chip
                  variant="outlined"
                  color="primary"
                  label={`${state.pagination.perPage} per page`}
                  sx={{ fontWeight: 500 }}
                />
              </Box>

              {isDesktop ? (
                <TableContainer
                  component={Paper}
                  elevation={1}
                  sx={{
                    borderRadius: 2,
                    mb: 3,
                    overflowX: 'hidden',
                  }}
                >
                  <Table sx={{ tableLayout: 'fixed', width: '100%' }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: '35%', whiteSpace: 'normal' }}>
                          <Typography variant="subtitle2" fontWeight="bold">
                            Title
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ width: '35%', whiteSpace: 'normal' }}>
                          <Typography variant="subtitle2" fontWeight="bold">
                            Zone
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ width: '15%', whiteSpace: 'normal' }}>
                          <Typography variant="subtitle2" fontWeight="bold">
                            Duration
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ width: '15%', whiteSpace: 'normal' }}>
                          <Typography variant="subtitle2" fontWeight="bold">
                            Visibility
                          </Typography>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {state.reports.map((report) => (
                        <TableRow
                          key={report.code}
                          hover
                          onClick={() => handleReportClick(report.code)}
                          sx={{
                            cursor: 'pointer',
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': {
                              backgroundColor: theme.palette.action.hover,
                              transform: 'translateX(4px)',
                            },
                          }}
                        >
                          <TableCell sx={{ verticalAlign: 'top', whiteSpace: 'normal' }}>
                            <Box>
                              <Typography
                                variant="body2"
                                fontWeight="medium"
                                color="primary.main"
                                sx={{
                                  overflowWrap: 'anywhere',
                                  wordBreak: 'break-word',
                                  lineHeight: 1.4,
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  textOverflow: 'ellipsis',
                                  overflow: 'hidden',
                                }}
                              >
                                {report.title || 'Untitled Report'}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                  display: 'block',
                                  mt: 0.25,
                                  whiteSpace: 'nowrap',
                                  textOverflow: 'ellipsis',
                                  overflow: 'hidden',
                                }}
                              >
                                {`Owner: ${report.owner?.name || 'Unknown'}`}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                  display: 'block',
                                  mt: 0.25,
                                  whiteSpace: 'nowrap',
                                  textOverflow: 'ellipsis',
                                  overflow: 'hidden',
                                }}
                              >
                                {formatReportDateTime(report.startTime)}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell
                            sx={{
                              verticalAlign: 'top',
                              whiteSpace: 'normal',
                              wordBreak: 'break-word',
                            }}
                          >
                            <Typography variant="body2" sx={{ whiteSpace: 'inherit' }}>
                              {report.zone?.name || 'Unknown Zone'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ verticalAlign: 'top', whiteSpace: 'normal' }}>
                            <Typography variant="body2">
                              {formatReportDuration(report.startTime, report.endTime)}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ verticalAlign: 'top', whiteSpace: 'normal' }}>
                            <Chip
                              label={report.visibility}
                              color={getReportVisibilityColor(report.visibility)}
                              size="small"
                              variant="outlined"
                              sx={{ textTransform: 'capitalize', whiteSpace: 'nowrap' }}
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
            </>
          ) : (
            !state.loading && <Alert severity="info">No reports found.</Alert>
          )}

          {/* Loading overlay */}
          {state.loading && state.reports.length > 0 && (
            <Box
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              display="flex"
              justifyContent="center"
              alignItems="center"
              bgcolor="rgba(255,255,255,0.7)"
              zIndex={1}
            >
              <CircularProgress />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {state.pagination.totalPages > 1 && (
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
          <Pagination
            count={state.pagination.totalPages}
            page={state.pagination.currentPage}
            onChange={handlePageChange}
            color="primary"
            size="large"
            disabled={state.loading}
          />
        </Box>
      )}
    </Container>
  );
};
