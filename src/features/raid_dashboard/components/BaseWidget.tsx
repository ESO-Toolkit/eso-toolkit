import CloseIcon from '@mui/icons-material/Close';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { Box, Card, CardContent, CardHeader, Typography, IconButton } from '@mui/material';
import React from 'react';

export interface WidgetProps {
  onRemove?: () => void;
}

export interface DashboardWidgetConfig {
  id: string;
  title: string;
  component: React.ComponentType<WidgetProps>;
  defaultSize: {
    width: number;
    height: number;
  };
  minSize: {
    width: number;
    height: number;
  };
}

interface BaseWidgetProps extends WidgetProps {
  title: string;
  children: React.ReactNode;
  isLoading?: boolean;
  error?: string | null;
}

/**
 * Base widget wrapper component providing consistent styling and functionality
 */
export const BaseWidget: React.FC<BaseWidgetProps> = ({
  title,
  onRemove,
  children,
  isLoading = false,
  error = null,
}) => {
  return (
    <Card
      elevation={2}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        '&:hover .widget-drag-handle': {
          opacity: 1,
        },
      }}
    >
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DragIndicatorIcon
              className="widget-drag-handle"
              sx={{
                opacity: 0,
                transition: 'opacity 0.2s',
                cursor: 'grab',
                color: 'text.secondary',
                fontSize: '1.2rem',
              }}
            />
            <Typography variant="h6" component="h3" sx={{ fontSize: '1rem' }}>
              {title}
            </Typography>
          </Box>
        }
        action={
          onRemove && (
            <IconButton
              size="small"
              onClick={onRemove}
              sx={{
                opacity: 0.7,
                '&:hover': { opacity: 1 },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          )
        }
        sx={{
          pb: 1,
          '& .MuiCardHeader-title': {
            fontSize: '1rem',
          },
        }}
      />
      <CardContent
        sx={{
          flex: 1,
          pt: 0,
          display: 'flex',
          flexDirection: 'column',
          '&:last-child': { pb: 2 },
        }}
      >
        {error ? (
          <Typography color="error" variant="body2">
            Error: {error}
          </Typography>
        ) : isLoading ? (
          <Typography color="text.secondary" variant="body2">
            Loading...
          </Typography>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
};
