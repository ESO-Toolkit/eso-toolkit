import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  Checkbox,
  ListItemText,
  Link,
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
}

const StatChecklist: React.FC<StatChecklistProps> = ({ sources, title = 'Sources' }) => (
  <Box sx={{ mb: 3 }}>
    <Typography variant="h6" sx={{ mb: 2 }}>
      {title}
    </Typography>
    <Paper variant="outlined" sx={{ p: 2 }}>
      <List dense>
        {sources.map((source, index) => (
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
    </Paper>
  </Box>
);

export default StatChecklist;
