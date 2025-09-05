import {
  BugReport as BugReportIcon,
  Clear as ClearIcon,
  Download as DownloadIcon,
  FilterList as FilterListIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useState, useMemo } from 'react';

import { useLogger, useLoggerUtils, LogLevel, LogEntry } from '../contexts/LoggerContext';

interface LoggerDebugPanelProps {
  open: boolean;
  onClose: () => void;
}

export const LoggerDebugPanel: React.FC<LoggerDebugPanelProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const logger = useLogger();
  const { downloadLogs, getLogLevelName, getLogLevelColor } = useLoggerUtils();

  const [filterLevel, setFilterLevel] = useState<LogLevel | 'ALL'>('ALL');
  const [filterContext, setFilterContext] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const entries = logger.getEntries();

  // Memoize filtered entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // Filter by level
      if (filterLevel !== 'ALL' && entry.level !== filterLevel) {
        return false;
      }

      // Filter by context
      if (
        filterContext &&
        (!entry.context || !entry.context.toLowerCase().includes(filterContext.toLowerCase()))
      ) {
        return false;
      }

      // Filter by search term
      if (searchTerm && !entry.message.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [entries, filterLevel, filterContext, searchTerm]);

  // Get unique contexts for filtering
  const contexts = useMemo(() => {
    const uniqueContexts = new Set<string>();
    entries.forEach((entry) => {
      if (entry.context) {
        uniqueContexts.add(entry.context);
      }
    });
    return Array.from(uniqueContexts).sort();
  }, [entries]);

  const handleLevelChange = (newLevel: LogLevel) => {
    logger.setLevel(newLevel);
  };

  const handleClearLogs = () => {
    logger.clearEntries();
  };

  const formatTimestamp = (timestamp: Date): string => {
    return (
      timestamp.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }) + `.${timestamp.getMilliseconds().toString().padStart(3, '0')}`
    );
  };

  const formatEntryData = (entry: LogEntry): string => {
    const parts: string[] = [];

    if (entry.data) {
      parts.push(`Data: ${JSON.stringify(entry.data, null, 2)}`);
    }

    if (entry.error) {
      parts.push(`Error: ${entry.error.message}`);
      if (entry.error.stack) {
        parts.push(`Stack: ${entry.error.stack}`);
      }
    }

    return parts.join('\n');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          height: '80vh',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <BugReportIcon />
            <Typography variant="h6">Logger Debug Panel</Typography>
            <Chip
              label={`${filteredEntries.length} / ${entries.length} entries`}
              size="small"
              color="primary"
            />
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, pb: 0 }}>
        {/* Controls */}
        <Card variant="outlined">
          <CardHeader
            title="Logger Controls"
            titleTypographyProps={{ variant: 'subtitle1' }}
            sx={{ pb: 1 }}
          />
          <CardContent sx={{ pt: 0 }}>
            <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
              {/* Current log level */}
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Log Level</InputLabel>
                <Select
                  value={logger.getLevel()}
                  label="Log Level"
                  onChange={(e) => handleLevelChange(e.target.value as LogLevel)}
                >
                  <MenuItem value={LogLevel.DEBUG}>Debug</MenuItem>
                  <MenuItem value={LogLevel.INFO}>Info</MenuItem>
                  <MenuItem value={LogLevel.WARN}>Warn</MenuItem>
                  <MenuItem value={LogLevel.ERROR}>Error</MenuItem>
                  <MenuItem value={LogLevel.NONE}>None</MenuItem>
                </Select>
              </FormControl>

              {/* Actions */}
              <Button
                startIcon={<DownloadIcon />}
                variant="outlined"
                onClick={downloadLogs}
                disabled={entries.length === 0}
              >
                Export Logs
              </Button>

              <Button
                startIcon={<ClearIcon />}
                variant="outlined"
                color="warning"
                onClick={handleClearLogs}
                disabled={entries.length === 0}
              >
                Clear Logs
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card variant="outlined">
          <CardHeader
            title="Filters"
            titleTypographyProps={{ variant: 'subtitle1' }}
            sx={{ pb: 1 }}
            action={
              <Tooltip title="Clear all filters">
                <IconButton
                  size="small"
                  onClick={() => {
                    setFilterLevel('ALL');
                    setFilterContext('');
                    setSearchTerm('');
                  }}
                >
                  <FilterListIcon />
                </IconButton>
              </Tooltip>
            }
          />
          <CardContent sx={{ pt: 0 }}>
            <Box display="flex" gap={2} flexWrap="wrap">
              {/* Filter by level */}
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Filter Level</InputLabel>
                <Select
                  value={filterLevel}
                  label="Filter Level"
                  onChange={(e) => setFilterLevel(e.target.value as LogLevel | 'ALL')}
                >
                  <MenuItem value="ALL">All Levels</MenuItem>
                  <MenuItem value={LogLevel.DEBUG}>Debug</MenuItem>
                  <MenuItem value={LogLevel.INFO}>Info</MenuItem>
                  <MenuItem value={LogLevel.WARN}>Warn</MenuItem>
                  <MenuItem value={LogLevel.ERROR}>Error</MenuItem>
                </Select>
              </FormControl>

              {/* Filter by context */}
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Context</InputLabel>
                <Select
                  value={filterContext}
                  label="Context"
                  onChange={(e) => setFilterContext(e.target.value)}
                >
                  <MenuItem value="">All Contexts</MenuItem>
                  {contexts.map((context) => (
                    <MenuItem key={context} value={context}>
                      {context}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Search */}
              <TextField
                size="small"
                label="Search messages"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ minWidth: 200 }}
              />
            </Box>
          </CardContent>
        </Card>

        {/* Log entries */}
        <Paper
          variant="outlined"
          sx={{
            flex: 1,
            overflow: 'auto',
            backgroundColor: theme.palette.mode === 'dark' ? '#0a0a0a' : '#fafafa',
          }}
        >
          {filteredEntries.length === 0 ? (
            <Box p={3} textAlign="center">
              <Typography color="text.secondary">
                {entries.length === 0 ? 'No log entries' : 'No entries match current filters'}
              </Typography>
            </Box>
          ) : (
            <List dense sx={{ p: 0 }}>
              {filteredEntries.map((entry, index) => {
                const extraData = formatEntryData(entry);

                return (
                  <ListItem
                    key={index}
                    sx={{
                      borderBottom: `1px solid ${theme.palette.divider}`,
                      alignItems: 'flex-start',
                      py: 1,
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                          <Chip
                            label={getLogLevelName(entry.level)}
                            size="small"
                            sx={{
                              backgroundColor: getLogLevelColor(entry.level),
                              color: 'white',
                              fontSize: '0.7rem',
                              height: 20,
                              minWidth: 50,
                            }}
                          />
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontFamily: 'monospace' }}
                          >
                            {formatTimestamp(entry.timestamp)}
                          </Typography>
                          {entry.context && (
                            <Chip
                              label={entry.context}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.7rem', height: 20 }}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography
                            component="div"
                            variant="body2"
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: '0.8rem',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                            }}
                          >
                            {entry.message}
                          </Typography>
                          {extraData && (
                            <Typography
                              component="div"
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                fontFamily: 'monospace',
                                fontSize: '0.75rem',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                mt: 1,
                                p: 1,
                                backgroundColor: theme.palette.action.hover,
                                borderRadius: 1,
                              }}
                            >
                              {extraData}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
          )}
        </Paper>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
