import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { DashboardWidget, KPIData, LoadingState } from '@/types';
import {
  WebSocketMessage,
  WebSocketStoreIntegration,
  MetricsUpdatePayload,
  isMetricsMessage,
} from '@/types/websocket';

interface DashboardFilters {
  dateRange: {
    start: string;
    end: string;
  };
  clubs: string[];
  courts: string[];
}

interface DashboardStore extends LoadingState, WebSocketStoreIntegration {
  // Widgets
  widgets: DashboardWidget[];
  availableWidgets: DashboardWidget[];

  // Data
  kpiData: KPIData[];
  chartData: Record<string, any>;

  // Filters
  filters: DashboardFilters;

  // Layout state
  isEditMode: boolean;
  draggedWidget: DashboardWidget | null;

  // Real-time data
  realTimeEnabled: boolean;
  lastUpdate: string | null;
  lastWebSocketUpdate: string | null;
  refreshInterval: number;
  metricsUpdateBuffer: Map<string, any>;

  // Widget management
  addWidget: (widget: DashboardWidget) => void;
  removeWidget: (widgetId: string) => void;
  updateWidget: (widgetId: string, updates: Partial<DashboardWidget>) => void;
  moveWidget: (widgetId: string, position: { x: number; y: number }) => void;
  resizeWidget: (
    widgetId: string,
    size: { width: number; height: number }
  ) => void;
  toggleWidgetVisibility: (widgetId: string) => void;

  // Layout management
  setEditMode: (editMode: boolean) => void;
  setDraggedWidget: (widget: DashboardWidget | null) => void;
  resetLayout: () => void;
  saveLayout: () => void;

  // Data management
  setKPIData: (data: KPIData[]) => void;
  updateKPIData: (id: string, data: Partial<KPIData>) => void;
  setChartData: (chartId: string, data: any) => void;
  applyBufferedUpdates: () => void;

  // Filters
  setFilters: (filters: Partial<DashboardFilters>) => void;
  resetFilters: () => void;

  // Real-time
  setRealTimeEnabled: (enabled: boolean) => void;
  updateLastUpdate: () => void;

  // WebSocket integration
  handleWebSocketMessage: (message: WebSocketMessage) => void;

  // Loading and error states
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Widget loading states
  widgetLoadingStates: Record<string, boolean>;
  setWidgetLoading: (widgetId: string, loading: boolean) => void;

  // Quick actions
  quickActions: Array<{
    id: string;
    label: string;
    icon: string;
    action: string;
    color?: string;
  }>;
  setQuickActions: (actions: DashboardStore['quickActions']) => void;
  executeQuickAction: (actionId: string) => void;
}

const defaultFilters: DashboardFilters = {
  dateRange: {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]!,
    end: new Date().toISOString().split('T')[0]!,
  },
  clubs: [],
  courts: [],
};

const defaultWidgets: DashboardWidget[] = [
  {
    id: 'total-reservations',
    type: 'kpi',
    title: 'Total Reservations',
    position: { x: 0, y: 0 },
    size: { width: 1, height: 1 },
    config: { kpiId: 'total-reservations' },
    isVisible: true,
  },
  {
    id: 'revenue',
    type: 'kpi',
    title: 'Revenue',
    position: { x: 1, y: 0 },
    size: { width: 1, height: 1 },
    config: { kpiId: 'revenue' },
    isVisible: true,
  },
  {
    id: 'occupancy-rate',
    type: 'kpi',
    title: 'Court Occupancy',
    position: { x: 2, y: 0 },
    size: { width: 1, height: 1 },
    config: { kpiId: 'occupancy-rate' },
    isVisible: true,
  },
  {
    id: 'active-players',
    type: 'kpi',
    title: 'Active Players',
    position: { x: 3, y: 0 },
    size: { width: 1, height: 1 },
    config: { kpiId: 'active-players' },
    isVisible: true,
  },
  {
    id: 'reservations-chart',
    type: 'chart',
    title: 'Reservations Trend',
    position: { x: 0, y: 1 },
    size: { width: 2, height: 2 },
    config: {
      chartType: 'line',
      dataKey: 'reservations-trend',
      showControls: true,
    },
    isVisible: true,
  },
  {
    id: 'court-usage',
    type: 'chart',
    title: 'Court Usage',
    position: { x: 2, y: 1 },
    size: { width: 2, height: 2 },
    config: {
      chartType: 'bar',
      dataKey: 'court-usage',
      showControls: false,
    },
    isVisible: true,
  },
  {
    id: 'quick-actions',
    type: 'quick-actions',
    title: 'Quick Actions',
    position: { x: 0, y: 3 },
    size: { width: 2, height: 1 },
    config: {},
    isVisible: true,
  },
  {
    id: 'upcoming-reservations',
    type: 'list',
    title: 'Upcoming Reservations',
    position: { x: 2, y: 3 },
    size: { width: 2, height: 1 },
    config: {
      listType: 'reservations',
      limit: 5,
    },
    isVisible: true,
  },
];

const defaultQuickActions = [
  {
    id: 'new-reservation',
    label: 'New Reservation',
    icon: 'plus',
    action: 'navigate:/reservations/new',
    color: 'blue',
  },
  {
    id: 'view-calendar',
    label: 'View Calendar',
    icon: 'calendar',
    action: 'navigate:/reservations?view=calendar',
  },
  {
    id: 'player-stats',
    label: 'Player Statistics',
    icon: 'users',
    action: 'navigate:/players/statistics',
  },
  {
    id: 'export-data',
    label: 'Export Data',
    icon: 'download',
    action: 'export:reservations',
  },
];

export const useDashboardStore = create<DashboardStore>()(
  persist(
    immer((set, get) => ({
      // Initial state
      widgets: defaultWidgets,
      availableWidgets: [],
      kpiData: [],
      chartData: {},
      filters: defaultFilters,
      isEditMode: false,
      draggedWidget: null,
      realTimeEnabled: true,
      lastUpdate: null,
      lastWebSocketUpdate: null,
      refreshInterval: 30000, // 30 seconds
      isLoading: false,
      error: null,
      widgetLoadingStates: {},
      quickActions: defaultQuickActions,
      metricsUpdateBuffer: new Map(),

      // WebSocket integration
      messageTypes: ['metrics:update'],

      handleMessage: (message: WebSocketMessage) => {
        if (!isMetricsMessage(message)) return;

        const payload = message.payload as MetricsUpdatePayload;

        set((state) => {
          state.lastWebSocketUpdate = new Date().toISOString();

          // Buffer updates for batch processing
          if (payload.type === 'realtime') {
            // For real-time updates, buffer them to avoid too frequent re-renders
            state.metricsUpdateBuffer.set(message.id, payload);

            // Apply buffered updates after a short delay
            setTimeout(() => {
              get().applyBufferedUpdates();
            }, 100);
          } else {
            // For non-real-time updates, apply immediately
            if (payload.kpiUpdates) {
              payload.kpiUpdates.forEach((kpi) => {
                get().updateKPIData(kpi.id, kpi);
              });
            }

            if (payload.metrics) {
              // Update relevant chart data based on metrics
              Object.entries(payload.metrics).forEach(([key, value]) => {
                if (key === 'revenue' && value) {
                  get().setChartData('revenue-chart', value);
                } else if (key === 'reservations' && value) {
                  get().setChartData('reservations-trend', value);
                } else if (key === 'occupancy' && value) {
                  get().setChartData('court-usage', value);
                }
              });
            }
          }

          // Update last update timestamp
          get().updateLastUpdate();
        });
      },

      handleWebSocketMessage: (message: WebSocketMessage) => {
        get().handleMessage(message);
      },

      applyBufferedUpdates: () =>
        set((state) => {
          if (state.metricsUpdateBuffer.size === 0) return;

          // Process all buffered updates
          state.metricsUpdateBuffer.forEach((payload) => {
            if (payload.kpiUpdates) {
              payload.kpiUpdates.forEach((kpi) => {
                const index = state.kpiData.findIndex((k) => k.id === kpi.id);
                if (index !== -1) {
                  Object.assign(state.kpiData[index], kpi);
                } else {
                  state.kpiData.push(kpi);
                }
              });
            }
          });

          // Clear the buffer
          state.metricsUpdateBuffer.clear();
        }),

      // Widget management
      addWidget: (widget) =>
        set((state) => {
          state.widgets.push(widget);
        }),

      removeWidget: (widgetId) =>
        set((state) => {
          state.widgets = state.widgets.filter((w) => w.id !== widgetId);
        }),

      updateWidget: (widgetId, updates) =>
        set((state) => {
          const index = state.widgets.findIndex((w) => w.id === widgetId);
          if (index !== -1 && state.widgets[index]) {
            Object.assign(state.widgets[index], updates);
          }
        }),

      moveWidget: (widgetId, position) =>
        set((state) => {
          const widget = state.widgets.find((w) => w.id === widgetId);
          if (widget) {
            widget.position = position;
          }
        }),

      resizeWidget: (widgetId, size) =>
        set((state) => {
          const widget = state.widgets.find((w) => w.id === widgetId);
          if (widget) {
            widget.size = size;
          }
        }),

      toggleWidgetVisibility: (widgetId) =>
        set((state) => {
          const widget = state.widgets.find((w) => w.id === widgetId);
          if (widget) {
            widget.isVisible = !widget.isVisible;
          }
        }),

      // Layout management
      setEditMode: (editMode) =>
        set((state) => {
          state.isEditMode = editMode;
          if (!editMode) {
            state.draggedWidget = null;
          }
        }),

      setDraggedWidget: (widget) =>
        set((state) => {
          state.draggedWidget = widget;
        }),

      resetLayout: () =>
        set((state) => {
          state.widgets = defaultWidgets;
          state.isEditMode = false;
          state.draggedWidget = null;
        }),

      saveLayout: () => {
        // This would typically save to an API
        // For now, the persist middleware handles local storage
        set((state) => {
          state.isEditMode = false;
          state.draggedWidget = null;
        });
      },

      // Data management
      setKPIData: (data) =>
        set((state) => {
          state.kpiData = data;
        }),

      updateKPIData: (id, data) =>
        set((state) => {
          const index = state.kpiData.findIndex((kpi) => kpi.id === id);
          if (index !== -1 && state.kpiData[index]) {
            Object.assign(state.kpiData[index], data);
          } else {
            state.kpiData.push({ id, ...data } as KPIData);
          }
        }),

      setChartData: (chartId, data) =>
        set((state) => {
          state.chartData[chartId] = data;
        }),

      // Filters
      setFilters: (filters) =>
        set((state) => {
          Object.assign(state.filters, filters);
        }),

      resetFilters: () =>
        set((state) => {
          state.filters = defaultFilters;
        }),

      // Real-time
      setRealTimeEnabled: (enabled) =>
        set((state) => {
          state.realTimeEnabled = enabled;
        }),

      updateLastUpdate: () =>
        set((state) => {
          state.lastUpdate = new Date().toISOString();
        }),

      // Loading and error states
      setLoading: (loading) =>
        set((state) => {
          state.isLoading = loading;
        }),

      setError: (error) =>
        set((state) => {
          state.error = error;
        }),

      setWidgetLoading: (widgetId, loading) =>
        set((state) => {
          if (loading) {
            state.widgetLoadingStates[widgetId] = true;
          } else {
            delete state.widgetLoadingStates[widgetId];
          }
        }),

      // Quick actions
      setQuickActions: (actions) =>
        set((state) => {
          state.quickActions = actions;
        }),

      executeQuickAction: (actionId) => {
        const action = get().quickActions.find((a) => a.id === actionId);
        if (action) {
          // Handle different action types
          if (action.action.startsWith('navigate:')) {
            const path = action.action.replace('navigate:', '');
            // This would typically use router.push(path)
          } else if (action.action.startsWith('export:')) {
            const type = action.action.replace('export:', '');
            // This would typically trigger an export
          }
        }
      },
    })),
    {
      name: 'dashboard-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        widgets: state.widgets,
        filters: state.filters,
        realTimeEnabled: state.realTimeEnabled,
        quickActions: state.quickActions,
      }),
    }
  )
);
