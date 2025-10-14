import { useState, useEffect, useCallback } from 'react';
import { DashboardAPI, type SummaryDTO, type RecentItemDTO } from '../services/dashboard.service';
import { DashboardNotificationService } from '../services/dashboard-notification.service';

// Mock data para desarrollo - ahora dinámico
const getMockSummary = (): SummaryDTO => {
  const tempTickets = DashboardNotificationService.getTempTicketCount();
  return {
    ticketsHoy: tempTickets, // Mostrar solo los tickets creados localmente
    enEspera: tempTickets, // Todos los tickets locales están "en espera"
    atendidos: 0, // No hay tickets atendidos en modo mock
    ventanillasActivas: 2 // Mantener las 2 ventanillas que funcionan desde la API real
  };
};

const getMockRecent = (): RecentItemDTO[] => {
  const tempTickets = DashboardNotificationService.getTempTicketCount();
  const recent: RecentItemDTO[] = [];
  
  // Generar tickets recientes dinámicos basados en los tickets creados
  for (let i = 0; i < tempTickets; i++) {
    recent.push({
      id: Date.now() + i,
      codigo: `T${(i + 1).toString().padStart(3, '0')}`,
      ventanilla: null,
      estado: 'GENERADO',
      fecha: new Date(Date.now() - (i * 60000)).toISOString() // Cada ticket 1 minuto antes
    });
  }
  
  return recent;
};

// Configuración  
const USE_MOCK_DATA = false; // Usando datos reales de la base de datos

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
        // Simular delay de red
        await new Promise(resolve => setTimeout(resolve, 500));
        summary = getMockSummary(); // Usar función dinámica
        recent = getMockRecent(); // Usar función dinámica
      } else {
        // Usar API real
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
    // Carga inicial
    loadData(true);
    
    // Suscribirse a notificaciones locales del dashboard (fallback)
    const unsubscribeFromNotifications = DashboardNotificationService.subscribe(() => {
      console.log('[Dashboard] � Actualización solicitada via notificación local');
      loadData(false);
    });
    
    // Auto-refresh cada 30 segundos
    let intervalId: number | undefined;
    if (autoRefresh) {
      intervalId = window.setInterval(() => {
        console.log('[Dashboard] 🔄 Auto-refresh...');
        loadData(false); // No mostrar loading en auto-refresh
      }, 30000); // 30 segundos
    }

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
      // Limpiar suscripción a notificaciones
      unsubscribeFromNotifications();
    };
  }, [loadData, autoRefresh]);

  return {
    ...state,
    refresh,
    clearError
  };
};