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
import { format } from 'date-fns';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useEsoLogsClientInstance } from '../../EsoLogsClientContext';
import { GetLatestReportsQuery, UserReportSummaryFragment } from '../../graphql/generated';
import { GetLatestReportsDocument } from '../../graphql/reports.generated';

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

// Utility functions
const formatDateTime = (timestamp: number): string => {
  return format(new Date(timestamp), 'MMM dd, yyyy HH:mm');
};

const formatDuration = (startTime: number, endTime: number): string => {
  const durationMs = endTime - startTime;
  const totalMinutes = Math.floor(durationMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};

const getVisibilityColor = (
  visibility: string,
): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  switch (visibility) {
    case 'public':
      return 'success';
    case 'private':
      return 'error';
    case 'unlisted':
      return 'warning';
    default:
      return 'default';
  }
};

export const LatestReports: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const client = useEsoLogsClientInstance();

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

  const handleReportClick = (reportCode: string): void => {
    navigate(`/report/${reportCode}`);
  };

  // Loading state
  if (state.loading && state.reports.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Card
        elevation={3}
        sx={{
          borderRadius: 2,
          background: `linear-gradient(135deg, ${theme.palette.primary.main}15 0%, ${theme.palette.secondary.main}15 100%)`,
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <CardContent sx={{ p: 4 }}>
          {/* Header */}
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            flexWrap="wrap"
            gap={2}
            mb={3}
          >
            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                Latest Reports
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Discover the most recent combat logs from the community
              </Typography>
            </Box>

            <Box display="flex" alignItems="center" gap={2}>
              <IconButton
                onClick={handleRefresh}
                disabled={state.loading}
                color="primary"
                sx={{
                  backgroundColor: theme.palette.action.hover,
                  '&:hover': {
                    backgroundColor: theme.palette.action.selected,
                  },
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Box>
          </Box>

          {/* Error state */}
          {state.error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {state.error}
            </Alert>
          )}

          {/* Reports table */}
          {state.reports.length > 0 ? (
            <>
              <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 2, mb: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight="bold">
                          Report
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight="bold">
                          Zone
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight="bold">
                          Owner
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight="bold">
                          Start Time
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight="bold">
                          Duration
                        </Typography>
                      </TableCell>
                      <TableCell>
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
                        <TableCell>
                          <Box>
                            <Typography
                              variant="body2"
                              fontWeight="medium"
                              color="primary.main"
                              noWrap
                              sx={{ maxWidth: 200 }}
                            >
                              {report.title || 'Untitled Report'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {report.code}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {report.zone?.name || 'Unknown Zone'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{report.owner?.name || 'Unknown'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDateTime(report.startTime)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDuration(report.startTime, report.endTime)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={report.visibility}
                            color={getVisibilityColor(report.visibility)}
                            size="small"
                            variant="outlined"
                            sx={{ textTransform: 'capitalize' }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              <Box display="flex" justifyContent="center" mt={3}>
                <Pagination
                  count={state.pagination.totalPages}
                  page={state.pagination.currentPage}
                  onChange={handlePageChange}
                  disabled={state.loading}
                  color="primary"
                  size="large"
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
