import AddIcon from '@mui/icons-material/Add';
import { Box, Paper, Typography, Button, Grid } from '@mui/material';
import React, { useState } from 'react';

import { useCurrentFight } from '../../hooks/useCurrentFight';
import { usePlayerData } from '../../hooks/usePlayerData';

import { BuildIssuesWidget } from './widgets/BuildIssuesWidget';
import { CriticalDamagePenetrationWidget } from './widgets/CriticalDamagePenetrationWidget';
import { DeathCauseWidget } from './widgets/DeathCauseWidget';
import { FirstPlayerEventWidget } from './widgets/FirstPlayerEventWidget';
import { SupportSetConflictWidget } from './widgets/SupportSetConflictWidget';
import { TauntUptimeWidget } from './widgets/TauntUptimeWidget';

interface WidgetConfig {
  id: string;
  title: string;
  component: React.ComponentType<{ onRemove: () => void }>;
}

const AVAILABLE_WIDGETS: WidgetConfig[] = [
  {
    id: 'build-issues',
    title: 'Build Issues',
    component: BuildIssuesWidget,
  },
  {
    id: 'critical-damage-penetration',
    title: 'Critical Damage & Penetration',
    component: CriticalDamagePenetrationWidget,
  },
  {
    id: 'support-set-conflicts',
    title: 'Support Set Conflicts',
    component: SupportSetConflictWidget,
  },
  {
    id: 'death-causes',
    title: 'Death Causes',
    component: DeathCauseWidget,
  },
  {
    id: 'first-player-event',
    title: 'First Player Event',
    component: FirstPlayerEventWidget,
  },
  {
    id: 'taunt-uptime',
    title: 'Taunt Uptime',
    component: TauntUptimeWidget,
  },
];

const STORAGE_KEY = 'raidDashboard.activeWidgets';

// Custom hook to manage widget persistence
const usePersistedWidgets = (
  defaultWidgets: string[],
): [string[], React.Dispatch<React.SetStateAction<string[]>>] => {
  const [activeWidgets, setActiveWidgets] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate that stored widgets are still available
        const validWidgets = parsed.filter((id: string) =>
          AVAILABLE_WIDGETS.some((widget) => widget.id === id),
        );
        return validWidgets.length > 0 ? validWidgets : defaultWidgets;
      }
    } catch (error) {
      // Silently handle localStorage errors
    }
    return defaultWidgets;
  });

  // Persist to localStorage whenever activeWidgets changes
  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activeWidgets));
    } catch (error) {
      // Silently handle localStorage errors
    }
  }, [activeWidgets]);

  return [activeWidgets, setActiveWidgets] as const;
};

export const RaidDashboard: React.FC = () => {
  const { fight, isFightLoading } = useCurrentFight();
  const { playerData, isPlayerDataLoading } = usePlayerData();

  const [activeWidgets, setActiveWidgets] = usePersistedWidgets([
    'build-issues',
    'critical-damage-penetration',
    'death-causes',
  ]);
  const [showWidgetSelector, setShowWidgetSelector] = useState(false);

  const addWidget = (widgetId: string): void => {
    if (!activeWidgets.includes(widgetId)) {
      setActiveWidgets((prev) => [...prev, widgetId]);
    }
    setShowWidgetSelector(false);
  };

  const removeWidget = (widgetId: string): void => {
    setActiveWidgets((prev) => prev.filter((id) => id !== widgetId));
  };

  const availableWidgetsToAdd = AVAILABLE_WIDGETS.filter(
    (widget) => !activeWidgets.includes(widget.id),
  );

  // Show loading state
  if (isFightLoading || isPlayerDataLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Raid Lead Dashboard
        </Typography>
        <Typography>Loading fight data...</Typography>
      </Box>
    );
  }

  // Show error state if no fight data
  if (!fight) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Raid Lead Dashboard
        </Typography>
        <Typography>No fight data available</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}
      >
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Raid Lead Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Live-updating widgets to monitor your raid's performance and identify issues in
            real-time.
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Fight: {fight.name} • Duration: {Math.round((fight.endTime - fight.startTime) / 1000)}s
          </Typography>
          {playerData && playerData.playersById && (
            <Typography variant="subtitle2" color="text.secondary">
              Players: {Object.keys(playerData.playersById).length}
            </Typography>
          )}
        </Box>

        {availableWidgetsToAdd.length > 0 && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowWidgetSelector(true)}
            sx={{ flexShrink: 0, ml: 2 }}
          >
            Add Widget
          </Button>
        )}
      </Box>

      {/* Widget Grid */}
      <Grid container spacing={3}>
        {activeWidgets.map((widgetId) => {
          const widgetConfig = AVAILABLE_WIDGETS.find((w) => w.id === widgetId);
          if (!widgetConfig) return null;

          const WidgetComponent = widgetConfig.component;

          return (
            // @ts-expect-error - MUI Grid item prop typing issue
            <Grid item xs={12} sm={6} lg={4} key={widgetId}>
              <WidgetComponent onRemove={() => removeWidget(widgetId)} />
            </Grid>
          );
        })}

        {/* Empty State */}
        {activeWidgets.length === 0 && (
          // @ts-expect-error - MUI Grid item prop typing issue
          <Grid item xs={12}>
            <Paper
              sx={{
                p: 4,
                textAlign: 'center',
                border: '2px dashed',
                borderColor: 'divider',
                backgroundColor: 'background.default',
              }}
            >
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No widgets added yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Add widgets to monitor your raid's performance in real-time
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setShowWidgetSelector(true)}
              >
                Add Your First Widget
              </Button>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Widget Selector */}
      {showWidgetSelector && availableWidgetsToAdd.length > 0 && (
        <Paper
          sx={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: 600,
            p: 3,
            zIndex: 1300,
            boxShadow: 24,
          }}
        >
          <Typography variant="h6" gutterBottom>
            Add Widget
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Choose a widget to add to your dashboard
          </Typography>

          <Grid container spacing={2}>
            {availableWidgetsToAdd.map((widget) => (
              // @ts-expect-error - MUI Grid item prop typing issue
              <Grid item xs={12} sm={6} key={widget.id}>
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{ p: 2, textAlign: 'left', justifyContent: 'flex-start' }}
                  onClick={() => addWidget(widget.id)}
                >
                  <Box>
                    <Typography variant="subtitle2">{widget.title}</Typography>
                  </Box>
                </Button>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => setShowWidgetSelector(false)}>Cancel</Button>
          </Box>
        </Paper>
      )}

      {/* Backdrop */}
      {showWidgetSelector && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1200,
          }}
          onClick={() => setShowWidgetSelector(false)}
        />
      )}
    </Box>
  );
};
