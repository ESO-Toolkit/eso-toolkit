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
      elevation={3}
      sx={{
        minHeight: 200,
        display: 'flex',
        flexDirection: 'column',
        opacity: isEmpty ? 0.6 : 1,
        borderRadius: 2,
        transition: 'all 0.3s ease',
        '&:hover': {
          elevation: 6,
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardHeader
        title={title}
        titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
        subheader={
          <Typography
            variant="caption"
            sx={{
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              cursor: 'pointer',
              '&:hover': { textDecoration: 'underline' },
            }}
            onClick={handleScopeMenuOpen}
          >
            {SCOPE_LABELS[scope]}
          </Typography>
        }
        action={
          <Box>
            <IconButton size="small" onClick={handleScopeMenuOpen} aria-label="Settings">
              <SettingsIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={onRemove} aria-label="Remove widget">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        }
        sx={{
          pb: 1,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      />
      <CardContent
        sx={{
          pt: 2,
          pb: 2,
          maxHeight: 500,
          overflow: 'auto',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'rgba(0,0,0,0.05)',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: '4px',
            '&:hover': {
              backgroundColor: 'rgba(0,0,0,0.3)',
            },
          },
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
