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

import { useEsoLogsClientInstance } from '../../EsoLogsClientContext';
import {
  GetLatestReportsQuery,
  UserReportSummaryFragment,
  GetLatestReportsDocument,
} from '../../graphql/gql/graphql';
import { ReportListMobile } from '../reports/components/ReportListMobile';
import {
  formatReportDateTime,
  formatReportDuration,
  getReportVisibilityColor,
} from '../reports/reportFormatting';
import { useReportPageLayout } from '../reports/useReportPageLayout';

interface LatestReportsState {
  reports: UserReportSummaryFragment[];
  loading: boolean;
  error: string | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalReports: number;
    perPage: number;
    hasMorePages: boolean;
  };
}

const REPORTS_PER_PAGE = 25;

export const LatestReports: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const client = useEsoLogsClientInstance();
  const { isDesktop, cardSx, cardContentSx, headerStackSx, actionGroupSx } = useReportPageLayout();

  const [state, setState] = useState<LatestReportsState>({
    reports: [],
    loading: true,
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
  const fetchLatestReports = useCallback(
    async (page = 1): Promise<void> => {
      try {
        setState((prev) => ({
          ...prev,
          loading: true,
          error: null,
        }));

        const reportsResult = await client.query<GetLatestReportsQuery>({
          query: GetLatestReportsDocument,
          variables: {
            limit: REPORTS_PER_PAGE,
            page,
          },
          errorPolicy: 'all', // Return both data and errors
        });

        const reportPagination = reportsResult.reportData?.reports;

        if (!reportPagination) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error:
              'No reports data available. This may be due to authentication issues or API limitations.',
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
          pagination: {
            currentPage: reportPagination.current_page || 1,
            totalPages: reportPagination.last_page || 1,
            totalReports: 0, // We don't care about total count
            perPage: reportPagination.per_page || REPORTS_PER_PAGE,
            hasMorePages: reportPagination.has_more_pages || false,
          },
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch latest reports',
        }));
      }
    },
    [client],
  ); // Load initial data
  useEffect(() => {
    fetchLatestReports(1);
  }, [fetchLatestReports]);

  // Event handlers
  const handleRefresh = (): void => {
    fetchLatestReports(state.pagination.currentPage);
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, page: number): void => {
    fetchLatestReports(page);
  };

  const handleReportClick = (reportCode: string, event?: React.MouseEvent): void => {
    const url = `/report/${reportCode}`;

    // Check if middle-click, Ctrl+Click, or Cmd+Click (Mac)
    if (event && (event.button === 1 || event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      navigate(url);
    }
  };

  // Loading state
  if (state.loading && state.reports.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: isDesktop ? 4 : 2 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: isDesktop ? 4 : 2 }}>
      <Card
        elevation={isDesktop ? 4 : 1}
        sx={{
          ...cardSx,
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(0, 225, 255, 0.12) 100%)'
              : 'linear-gradient(135deg, rgba(219, 234, 254, 0.5) 0%, rgba(224, 242, 254, 0.5) 100%)',
        }}
      >
        <CardContent sx={{ ...cardContentSx, position: 'relative' }}>
          {/* Mobile Floating Refresh Button */}
          {!isDesktop && (
            <IconButton
              onClick={handleRefresh}
              disabled={state.loading}
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
                Latest Reports
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{
                  maxWidth: isDesktop ? 'none' : '26ch',
                  pr: isDesktop ? 0 : 1, // Add some right padding on mobile
                }}
              >
                Discover the most recent combat logs from the community
              </Typography>
            </Box>

            {isDesktop && (
              <Box sx={actionGroupSx}>
                <IconButton
                  onClick={handleRefresh}
                  disabled={state.loading}
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

              {/* Pagination */}
              <Box display="flex" justifyContent="center" mt={isDesktop ? 3 : 2}>
                <Pagination
                  count={state.pagination.totalPages}
                  page={state.pagination.currentPage}
                  onChange={handlePageChange}
                  disabled={state.loading}
                  color="primary"
                  size={isDesktop ? 'large' : 'medium'}
                  sx={{
                    '& .MuiPaginationItem-root': {
                      borderRadius: 2,
                    },
                  }}
                />
              </Box>
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
    </Container>
  );
};
