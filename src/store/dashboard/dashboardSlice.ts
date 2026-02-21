import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type WidgetType =
  | 'missing-buffs'
  | 'build-issues'
  | 'low-buff-uptimes'
  | 'death-causes'
  | 'low-dps'
  | 'missing-food';

export type WidgetScope = 'most-recent' | 'last-3' | 'last-5' | 'all-fights';

export interface WidgetConfig {
  id: string; // Unique ID for this widget instance
  type: WidgetType;
  scope: WidgetScope;
  enabled: boolean;
}

export interface DashboardState {
  widgets: WidgetConfig[];
  autoRefreshEnabled: boolean;
  refreshInterval: number; // in milliseconds
}

const initialState: DashboardState = {
  widgets: [
    // Default widgets for a new dashboard
    { id: 'death-causes-1', type: 'death-causes', scope: 'most-recent', enabled: true },
    { id: 'missing-buffs-1', type: 'missing-buffs', scope: 'most-recent', enabled: true },
    { id: 'build-issues-1', type: 'build-issues', scope: 'most-recent', enabled: true },
  ],
  autoRefreshEnabled: true,
  refreshInterval: 5000, // 5 seconds
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    addWidget: (state, action: PayloadAction<{ type: WidgetType; scope?: WidgetScope }>) => {
      const { type, scope = 'most-recent' } = action.payload;
      const id = `${type}-${Date.now()}`;
      state.widgets.push({
        id,
        type,
        scope,
        enabled: true,
      });
    },
    removeWidget: (state, action: PayloadAction<string>) => {
      state.widgets = state.widgets.filter((w) => w.id !== action.payload);
    },
    updateWidgetScope: (state, action: PayloadAction<{ id: string; scope: WidgetScope }>) => {
      const widget = state.widgets.find((w) => w.id === action.payload.id);
      if (widget) {
        widget.scope = action.payload.scope;
      }
    },
    toggleWidget: (state, action: PayloadAction<string>) => {
      const widget = state.widgets.find((w) => w.id === action.payload);
      if (widget) {
        widget.enabled = !widget.enabled;
      }
    },
    setAutoRefreshEnabled: (state, action: PayloadAction<boolean>) => {
      state.autoRefreshEnabled = action.payload;
    },
    setRefreshInterval: (state, action: PayloadAction<number>) => {
      state.refreshInterval = action.payload;
    },
    resetWidgets: (state) => {
      state.widgets = initialState.widgets;
      state.autoRefreshEnabled = initialState.autoRefreshEnabled;
      state.refreshInterval = initialState.refreshInterval;
    },
  },
});

export const {
  addWidget,
  removeWidget,
  updateWidgetScope,
  toggleWidget,
  setAutoRefreshEnabled,
  setRefreshInterval,
  resetWidgets,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;
