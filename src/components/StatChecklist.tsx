import WarningIcon from '@mui/icons-material/Warning';
import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  Checkbox,
  ListItemText,
  Link,
  FormControlLabel,
  Switch,
  Skeleton,
  Tooltip,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import React from 'react';

export interface StatChecklistSource {
  id?: string;
  name: string;
  wasActive: boolean;
  description: string;
  link?: string;
  sourceType?: 'not_implemented' | 'always_on' | string;
  interactive?: boolean;
}

interface StatChecklistProps {
  sources: StatChecklistSource[];
  title?: string;
  loading?: boolean;
  titleSx?: SxProps<Theme>;
  onToggleSource?: (sourceId: string, nextValue: boolean) => void;
}

export const StatChecklist: React.FC<StatChecklistProps> = ({
  sources,
  title = 'Sources',
  loading = false,
  titleSx,
  onToggleSource,
}) => {
  const [showUnchecked, setShowUnchecked] = React.useState(false);
  const missedCount = React.useMemo(() => sources.filter((s) => !s.wasActive).length, [sources]);

  const visibleSources = React.useMemo(
    () => sources.filter((s) => s.wasActive || showUnchecked || s.interactive),
    [sources, showUnchecked],
  );

  if (loading) {
    return (
      <Box sx={{ mb: 3 }}>
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Skeleton variant="text" width={160} height={28} />
          <Skeleton variant="rectangular" width={180} height={28} />
        </Box>
        <Card variant="outlined" className="u-hover-lift u-fade-in-up">
          <CardContent sx={{ p: 2 }}>
            <List dense>
              {Array.from({ length: 5 }).map((_, index) => (
                <ListItem key={index} disablePadding>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Skeleton variant="circular" width={18} height={18} />
                  </ListItemIcon>
                  <ListItemText
                    primary={<Skeleton variant="text" width="60%" />}
                    secondary={<Skeleton variant="text" width="40%" />}
                  />
                </ListItem>
              ))}
            </List>
            <Skeleton variant="text" width="70%" />
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{
          mb: 2,
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 1, sm: 0 },
        }}
      >
        <Typography
          variant="h6"
          sx={[
            {
              textShadow:
                '0 2px 4px rgb(0 0 0 / 0%), 0 4px 8px rgba(0, 0, 0, 0.4), 0 8px 16px rgba(0, 0, 0, 0.2)',
            },
            ...(Array.isArray(titleSx) ? titleSx : titleSx ? [titleSx] : []),
          ]}
        >
          {title}
        </Typography>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={showUnchecked}
              onChange={() => setShowUnchecked((v) => !v)}
              disabled={missedCount === 0}
            />
          }
          label={`Show missed sources${missedCount ? ` (${missedCount})` : ''}`}
          sx={{
            ml: { xs: 0, sm: 2 },
            '& .MuiFormControlLabel-label': {
              fontSize: { xs: '0.875rem', sm: '0.875rem' },
            },
          }}
        />
      </Box>
      <Card variant="outlined" className="u-hover-lift u-fade-in-up">
        <CardContent sx={{ p: 2 }}>
          <List dense>
            {visibleSources.map((source, index) => {
              const isUnimplemented =
                source.sourceType === 'not_implemented' ||
                source.description.includes('[NOT FULLY IMPLEMENTED');
              const isAlwaysOn = source.sourceType === 'always_on';
              const sourceId = source.id ?? source.name;
              const isInteractive = Boolean(source.interactive && onToggleSource);
              const showAlwaysOnLabel = isAlwaysOn && !source.interactive;
              const isFightingFinesse = source.name === 'Fighting Finesse';

              return (
                <ListItem key={index} disablePadding>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Checkbox
                      checked={source.wasActive}
                      disabled={!isInteractive}
                      onChange={(event) => {
                        if (isInteractive) {
                          onToggleSource?.(sourceId, event.target.checked);
                        }
                      }}
                      size="small"
                      color={source.wasActive ? 'success' : 'default'}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            textDecoration: source.wasActive ? 'none' : 'line-through',
                            color: source.wasActive ? 'text.primary' : 'text.disabled',
                          }}
                        >
                          {source.name}
                        </Typography>
                        {isUnimplemented && (
                          <Tooltip title="This source is not fully implemented yet">
                            <WarningIcon
                              sx={{
                                fontSize: 16,
                                color: 'warning.main',
                                ml: 0.5,
                              }}
                            />
                          </Tooltip>
                        )}
                        {showAlwaysOnLabel && (
                          <Tooltip
                            title={
                              isFightingFinesse
                                ? 'This source requires manual toggle (cannot be auto-detected)'
                                : 'This source is treated as always being active'
                            }
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                fontSize: 10,
                                fontWeight: 'bold',
                                color: isFightingFinesse ? 'warning.main' : 'primary.main',
                                backgroundColor: isFightingFinesse
                                  ? 'rgba(245, 124, 0, 0.12)'
                                  : 'rgba(25, 118, 210, 0.12)',
                                px: 0.5,
                                py: 0.25,
                                borderRadius: 0.5,
                                ml: 0.5,
                              }}
                            >
                              {isFightingFinesse ? 'MANUAL TOGGLE' : 'ALWAYS ON'}
                            </Typography>
                          </Tooltip>
                        )}
                      </Box>
                    }
                    secondary={
                      <Typography
                        variant="caption"
                        sx={{
                          color: source.wasActive ? 'text.secondary' : 'text.disabled',
                        }}
                      >
                        {source.description}
                        {source.link && (
                          <Link
                            href={source.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ ml: 1, fontSize: 'inherit' }}
                          >
                            View on ESO Logs
                          </Link>
                        )}
                      </Typography>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            ✓ = Source was active during this fight | ✗ = Source was not used | ⚠ = Not fully
            implemented | ALWAYS ON = Always active when conditions are met | MANUAL TOGGLE =
            Requires manual toggle (cannot be auto-detected)
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};
