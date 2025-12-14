import { useState, useEffect, useCallback } from 'react';
import { DashboardAPI, type SummaryDTO, type RecentItemDTO } from '../services/dashboard.service';
import { DashboardNotificationService } from '../services/dashboard-notification.service';

// Mock data para desarrollo - ahora dinámico
const getMockSummary = (): SummaryDTO => {
  const tempTickets = DashboardNotificationService.getTempTicketCount();
  return {
    ticketsHoy: tempTickets,
    enEspera: tempTickets,
    atendidos: 0,
    ventanillasActivas: 2
  };
};

const getMockRecent = (): RecentItemDTO[] => {
  const tempTickets = DashboardNotificationService.getTempTicketCount();
  const recent: RecentItemDTO[] = [];
  for (let i = 0; i < tempTickets; i++) {
    recent.push({
      id: Date.now() + i,
      codigo: `T${(i + 1).toString().padStart(3, '0')}`,
      ventanilla: null,
      estado: 'GENERADO',
      fecha: new Date(Date.now() - (i * 60000)).toISOString()
    });
  }
  return recent;
};

// Configuración
const USE_MOCK_DATA = false;

interface DashboardState {
  summary: SummaryDTO | null;
  recent: RecentItemDTO[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface DashboardActions {
  refresh: () => Promise<void>;
  clearError: () => void;
}

type UseDashboardReturn = DashboardState & DashboardActions;

export const useDashboard = (autoRefresh = true): UseDashboardReturn => {
  const [state, setState] = useState<DashboardState>({
    summary: null,
    recent: [],
    loading: true,
    error: null,
    lastUpdated: null
  });

  const loadData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setState(prev => ({ ...prev, loading: true, error: null }));
      }

      let summary: SummaryDTO;
      let recent: RecentItemDTO[];

      if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 300));
        summary = getMockSummary();
        recent = getMockRecent();
      } else {
        const [summaryRes, recentRes] = await Promise.all([
          DashboardAPI.summary(),
          DashboardAPI.recent(10)
        ]);
        summary = summaryRes;
        recent = recentRes;
      }

      setState(prev => ({
        ...prev,
        summary,
        recent,
        loading: false,
        error: null,
        lastUpdated: new Date()
      }));

    } catch (error: any) {
      console.error('Dashboard error:', error);
      const errorMessage = error?.detail?.error || error?.message || 'Error al cargar datos del dashboard';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
    }
  }, []);

  const refresh = useCallback(() => loadData(true), [loadData]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  useEffect(() => {
    loadData(true);

    const unsubscribeFromNotifications = DashboardNotificationService.subscribe(() => {
      console.log('[Dashboard] 🔔 Actualización solicitada via notificación local');
      loadData(false);
    });

    let intervalId: number | undefined;
    if (autoRefresh) {
      intervalId = window.setInterval(() => {
        console.log('[Dashboard] 🔄 Auto-refresh...');
        loadData(false);
      }, 30000);
    }

    return () => {
      if (intervalId) window.clearInterval(intervalId);
      unsubscribeFromNotifications();
    };
  }, [loadData, autoRefresh]);

  return {
    ...state,
    refresh,
    clearError
  };
};
