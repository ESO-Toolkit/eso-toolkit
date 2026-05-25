import dashboardReducer, {
  addWidget,
  DashboardState,
  removeWidget,
  resetWidgets,
  setAutoRefreshEnabled,
  setRefreshInterval,
  toggleWidget,
  updateWidgetScope,
  WidgetType,
} from './dashboardSlice';

describe('dashboardSlice', () => {
  const initialState: DashboardState = {
    widgets: [
      { id: '1', type: 'death-causes', scope: 'most-recent', enabled: true },
      { id: '2', type: 'missing-buffs', scope: 'most-recent', enabled: true },
      { id: '3', type: 'build-issues', scope: 'most-recent', enabled: true },
    ],
    autoRefreshEnabled: true,
    refreshInterval: 5000,
  };

  describe('addWidget', () => {
    it('should add a new widget with default scope and enabled state', () => {
      const state = dashboardReducer(initialState, addWidget({ type: 'low-dps' }));

      expect(state.widgets).toHaveLength(4);
      expect(state.widgets[3]).toMatchObject({
        type: 'low-dps',
        scope: 'most-recent',
        enabled: true,
      });
      expect(state.widgets[3].id).toBeDefined();
    });

    it('should generate unique IDs for each widget', () => {
      let state = initialState;
      state = dashboardReducer(state, addWidget({ type: 'low-dps' }));
      state = dashboardReducer(state, addWidget({ type: 'missing-food' }));

      const ids = state.widgets.map((w) => w.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should allow multiple widgets of the same type', () => {
      let state = initialState;
      state = dashboardReducer(state, addWidget({ type: 'death-causes' }));
      state = dashboardReducer(state, addWidget({ type: 'death-causes' }));

      const deathCausesWidgets = state.widgets.filter((w) => w.type === 'death-causes');
      expect(deathCausesWidgets).toHaveLength(3); // 1 from initial + 2 added
    });
  });

  describe('removeWidget', () => {
    it('should remove a widget by ID', () => {
      const state = dashboardReducer(initialState, removeWidget('2'));

      expect(state.widgets).toHaveLength(2);
      expect(state.widgets.find((w) => w.id === '2')).toBeUndefined();
    });

    it('should do nothing if widget ID does not exist', () => {
      const state = dashboardReducer(initialState, removeWidget('non-existent'));

      expect(state.widgets).toHaveLength(3);
      expect(state.widgets).toEqual(initialState.widgets);
    });

    it('should allow removing all widgets', () => {
      let state = initialState;
      state = dashboardReducer(state, removeWidget('1'));
      state = dashboardReducer(state, removeWidget('2'));
      state = dashboardReducer(state, removeWidget('3'));

      expect(state.widgets).toHaveLength(0);
    });
  });

  describe('updateWidgetScope', () => {
    it('should update the scope of a widget', () => {
      const state = dashboardReducer(initialState, updateWidgetScope({ id: '1', scope: 'last-3' }));

      expect(state.widgets[0].scope).toBe('last-3');
    });

    it('should only update the specified widget', () => {
      const state = dashboardReducer(initialState, updateWidgetScope({ id: '2', scope: 'last-5' }));

      expect(state.widgets[0].scope).toBe('most-recent');
      expect(state.widgets[1].scope).toBe('last-5');
      expect(state.widgets[2].scope).toBe('most-recent');
    });

    it('should do nothing if widget ID does not exist', () => {
      const state = dashboardReducer(
        initialState,
        updateWidgetScope({ id: 'non-existent', scope: 'all-fights' }),
      );

      expect(state.widgets).toEqual(initialState.widgets);
    });

    it('should support all scope types', () => {
      let state = initialState;
      state = dashboardReducer(state, updateWidgetScope({ id: '1', scope: 'most-recent' }));
      expect(state.widgets[0].scope).toBe('most-recent');

      state = dashboardReducer(state, updateWidgetScope({ id: '1', scope: 'last-3' }));
      expect(state.widgets[0].scope).toBe('last-3');

      state = dashboardReducer(state, updateWidgetScope({ id: '1', scope: 'last-5' }));
      expect(state.widgets[0].scope).toBe('last-5');

      state = dashboardReducer(state, updateWidgetScope({ id: '1', scope: 'all-fights' }));
      expect(state.widgets[0].scope).toBe('all-fights');
    });
  });

  describe('toggleWidget', () => {
    it('should toggle widget enabled state from true to false', () => {
      const state = dashboardReducer(initialState, toggleWidget('1'));

      expect(state.widgets[0].enabled).toBe(false);
    });

    it('should toggle widget enabled state from false to true', () => {
      const modifiedState: DashboardState = {
        ...initialState,
        widgets: [{ id: '1', type: 'death-causes', scope: 'most-recent', enabled: false }],
      };

      const state = dashboardReducer(modifiedState, toggleWidget('1'));

      expect(state.widgets[0].enabled).toBe(true);
    });

    it('should do nothing if widget ID does not exist', () => {
      const state = dashboardReducer(initialState, toggleWidget('non-existent'));

      expect(state.widgets).toEqual(initialState.widgets);
    });
  });

  describe('setAutoRefreshEnabled', () => {
    it('should enable auto-refresh', () => {
      const state = dashboardReducer(
        { ...initialState, autoRefreshEnabled: false },
        setAutoRefreshEnabled(true),
      );

      expect(state.autoRefreshEnabled).toBe(true);
    });

    it('should disable auto-refresh', () => {
      const state = dashboardReducer(initialState, setAutoRefreshEnabled(false));

      expect(state.autoRefreshEnabled).toBe(false);
    });
  });

  describe('setRefreshInterval', () => {
    it('should update refresh interval', () => {
      const state = dashboardReducer(initialState, setRefreshInterval(10000));

      expect(state.refreshInterval).toBe(10000);
    });

    it('should allow setting to minimum value', () => {
      const state = dashboardReducer(initialState, setRefreshInterval(1000));

      expect(state.refreshInterval).toBe(1000);
    });
  });

  describe('resetWidgets', () => {
    it('should reset to default widgets configuration', () => {
      const modifiedState: DashboardState = {
        widgets: [{ id: '99', type: 'low-dps', scope: 'all-fights', enabled: false }],
        autoRefreshEnabled: false,
        refreshInterval: 10000,
      };

      const state = dashboardReducer(modifiedState, resetWidgets());

      expect(state.widgets).toHaveLength(3);
      expect(state.widgets[0].type).toBe('death-causes');
      expect(state.widgets[1].type).toBe('missing-buffs');
      expect(state.widgets[2].type).toBe('build-issues');
      expect(state.autoRefreshEnabled).toBe(true);
      expect(state.refreshInterval).toBe(5000);
    });
  });

  describe('widget types', () => {
    const widgetTypes: WidgetType[] = [
      'death-causes',
      'missing-buffs',
      'build-issues',
      'low-buff-uptimes',
      'low-dps',
      'missing-food',
    ];

    it('should support all widget types', () => {
      widgetTypes.forEach((type) => {
        const state = dashboardReducer(initialState, addWidget({ type }));
        expect(state.widgets[state.widgets.length - 1].type).toBe(type);
      });
    });
  });
});
