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
} from '@mui/material';
import React from 'react';

export interface StatChecklistSource {
  name: string;
  value: number;
  wasActive: boolean;
  description: string;
  link?: string;
}

interface StatChecklistProps {
  sources: StatChecklistSource[];
  title?: string;
  loading?: boolean;
}

const StatChecklist: React.FC<StatChecklistProps> = ({
  sources,
  title = 'Sources',
  loading = false,
}) => {
  const [showUnchecked, setShowUnchecked] = React.useState(false);
  const missedCount = React.useMemo(() => sources.filter((s) => !s.wasActive).length, [sources]);

  const visibleSources = React.useMemo(
    () => sources.filter((s) => s.wasActive || showUnchecked),
    [sources, showUnchecked]
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
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">{title}</Typography>
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
        />
      </Box>
      <Card variant="outlined" className="u-hover-lift u-fade-in-up">
        <CardContent sx={{ p: 2 }}>
          <List dense>
            {visibleSources.map((source, index) => (
              <ListItem key={index} disablePadding>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Checkbox
                    checked={source.wasActive}
                    disabled
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
            ))}
          </List>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            ✓ = Source was active during this fight | ✗ = Source was not used
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default StatChecklist;
export { StatChecklist };
