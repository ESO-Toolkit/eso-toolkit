import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import {
  Card,
  CardHeader,
  CardContent,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Box,
  useTheme,
} from '@mui/material';
import React from 'react';

import { WidgetScope } from '../../store/dashboard/dashboardSlice';

export interface BaseWidgetProps {
  id: string;
  title: string;
  scope: WidgetScope;
  onRemove: () => void;
  onScopeChange: (scope: WidgetScope) => void;
  children: React.ReactNode;
  isEmpty?: boolean;
}

const SCOPE_LABELS: Record<WidgetScope, string> = {
  'most-recent': 'Most Recent Fight',
  'last-3': 'Last 3 Fights',
  'last-5': 'Last 5 Fights',
  'all-fights': 'All Fights',
};

export const BaseWidget: React.FC<BaseWidgetProps> = ({
  id: _id,
  title,
  scope,
  onRemove,
  onScopeChange,
  children,
  isEmpty = false,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [scopeMenuAnchor, setScopeMenuAnchor] = React.useState<null | HTMLElement>(null);

  const handleScopeMenuOpen = (event: React.MouseEvent<HTMLElement>): void => {
    setScopeMenuAnchor(event.currentTarget);
  };

  const handleScopeMenuClose = (): void => {
    setScopeMenuAnchor(null);
  };

  const handleScopeSelect = (newScope: WidgetScope): void => {
    onScopeChange(newScope);
    handleScopeMenuClose();
  };

  return (
    <Card
      data-testid={`widget-${_id}`}
      elevation={0}
      sx={{
        minHeight: 200,
        display: 'flex',
        flexDirection: 'column',
        opacity: isEmpty ? 0.6 : 1,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        transition: 'all 0.3s ease',
        '&:hover': {
          borderColor: isDark ? 'rgba(56, 189, 248, 0.3)' : 'rgba(15, 23, 42, 0.15)',
          boxShadow: isDark
            ? '0 10px 40px rgba(0,0,0,0.3), 0 0 60px rgba(56,189,248,0.06)'
            : '0 6px 20px rgba(15,23,42,0.08)',
        },
      }}
    >
      <CardHeader
        title={title}
        titleTypographyProps={{
          variant: 'h6',
          fontWeight: 600,
          fontFamily: 'Space Grotesk, Inter, system-ui',
        }}
        subheader={
          <Typography
            variant="caption"
            sx={{
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              fontSize: '0.65rem',
              cursor: 'pointer',
              color: 'text.secondary',
              transition: 'color 0.2s ease',
              '&:hover': {
                color: isDark ? '#38bdf8' : '#0f172a',
              },
            }}
            onClick={handleScopeMenuOpen}
          >
            {SCOPE_LABELS[scope]}
          </Typography>
        }
        action={
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton
              size="small"
              onClick={handleScopeMenuOpen}
              aria-label="Settings"
              sx={{
                color: 'text.secondary',
                transition: 'all 0.2s ease',
                '&:hover': {
                  color: isDark ? '#38bdf8' : '#0f172a',
                  backgroundColor: isDark ? 'rgba(56, 189, 248, 0.08)' : 'rgba(15, 23, 42, 0.05)',
                },
              }}
            >
              <SettingsIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={onRemove}
              aria-label="Remove widget"
              sx={{
                color: 'text.secondary',
                transition: 'all 0.2s ease',
                '&:hover': {
                  color: isDark ? '#ff8a80' : '#d32f2f',
                  backgroundColor: isDark ? 'rgba(244, 67, 54, 0.08)' : 'rgba(244, 67, 54, 0.05)',
                },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        }
        sx={{
          pb: 1,
          borderBottom: `1px solid ${isDark ? 'rgba(56, 189, 248, 0.1)' : 'rgba(15, 23, 42, 0.06)'}`,
        }}
      />
      <CardContent
        sx={{
          pt: 2,
          pb: 2,
          maxHeight: 500,
          overflow: 'auto',
        }}
      >
        {isEmpty ? (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
            No issues detected
          </Typography>
        ) : (
          children
        )}
      </CardContent>

      {/* Scope Selection Menu */}
      <Menu
        anchorEl={scopeMenuAnchor}
        open={Boolean(scopeMenuAnchor)}
        onClose={handleScopeMenuClose}
      >
        {(Object.keys(SCOPE_LABELS) as WidgetScope[]).map((scopeOption) => (
          <MenuItem
            key={scopeOption}
            selected={scopeOption === scope}
            onClick={() => handleScopeSelect(scopeOption)}
          >
            {SCOPE_LABELS[scopeOption]}
          </MenuItem>
        ))}
      </Menu>
    </Card>
  );
};
