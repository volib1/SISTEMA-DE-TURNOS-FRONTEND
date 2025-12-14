import { useState, useEffect, useCallback } from 'react';
import { OperadorAPI } from '../services/operador.service';
import type { TurnoOperadorDTO } from '../services/operador.service';

export interface UseOperadorParams {
  idVentanilla: number;
  idEmpleado?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useOperador({ idVentanilla, idEmpleado, autoRefresh = true, refreshInterval = 5000 }: UseOperadorParams) {
  const [turnoActual, setTurnoActual] = useState<TurnoOperadorDTO | null>(null);
  const [proximosTurnos, setProximosTurnos] = useState<TurnoOperadorDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Carga el turno actual de la ventanilla
   */
  const cargarTurnoActual = useCallback(async () => {
    try {
      const turno = await OperadorAPI.obtenerTurnoActual(idVentanilla);
      setTurnoActual(turno);
      return turno;
    } catch (err) {
      console.error('[useOperador] Error cargando turno actual:', err);
      setError('Error al cargar el turno actual');
      return null;
    }
  }, [idVentanilla]);

  /**
   * Carga los tickets en espera
   */
  const cargarProximosTurnos = useCallback(async () => {
    try {
      const tickets = await OperadorAPI.obtenerTicketsEnEspera(idVentanilla);
      setProximosTurnos(tickets);
      return tickets;
    } catch (err) {
      console.error('[useOperador] Error cargando próximos turnos:', err);
      setError('Error al cargar los próximos turnos');
      return [];
    }
  }, [idVentanilla]);

  /**
   * Carga todos los datos
   */
  const cargarDatos = useCallback(async () => {
    console.log('[useOperador] 🔄 Cargando datos...');
    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        cargarTurnoActual(),
        cargarProximosTurnos()
      ]);
      console.log('[useOperador] ✅ Datos cargados');
    } catch (err) {
      console.error('[useOperador] ❌ Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  }, [cargarTurnoActual, cargarProximosTurnos]);

  /**
   * Llama al siguiente turno en espera
   */
  const llamarTurno = useCallback(async () => {
    if (turnoActual) {
      setError('Ya hay un turno en atención. Finalice la atención actual antes de llamar otro.');
      return;
    }

    if (proximosTurnos.length === 0) {
      setError('No hay turnos en espera');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const siguienteTurno = proximosTurnos[0];
      console.log('[useOperador] 📞 Llamando turno:', siguienteTurno.codigo);
      
      const turno = await OperadorAPI.llamarTurno(siguienteTurno.idTicket, idVentanilla, idEmpleado);
      
      setTurnoActual(turno);
      await cargarProximosTurnos(); // Actualizar lista
      
      console.log('[useOperador] ✅ Turno llamado exitosamente');
    } catch (err: any) {
      console.error('[useOperador] ❌ Error llamando turno:', err);
      setError(err?.message || 'Error al llamar el turno');
    } finally {
      setLoading(false);
    }
  }, [turnoActual, proximosTurnos, idVentanilla, idEmpleado, cargarProximosTurnos]);

  /**
   * Finaliza la atención del turno actual
   */
  const finalizarAtencion = useCallback(async () => {
    if (!turnoActual) {
      setError('No hay un turno en atención');
      return;
    }

    if (!idEmpleado) {
      setError('ID de empleado no disponible');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[useOperador] ✅ Finalizando atención del turno:', turnoActual.codigo);
      
      await OperadorAPI.finalizarAtencion(turnoActual.id, turnoActual.idTicket, idEmpleado);
      
      setTurnoActual(null);
      await cargarProximosTurnos(); // Actualizar lista
      
      console.log('[useOperador] ✅ Atención finalizada exitosamente');
    } catch (err: any) {
      console.error('[useOperador] ❌ Error finalizando atención:', err);
      setError(err?.message || 'Error al finalizar la atención');
    } finally {
      setLoading(false);
    }
  }, [turnoActual, idEmpleado, cargarProximosTurnos]);

  /**
   * Vuelve a llamar el turno actual
   */
  const volverALlamar = useCallback(async () => {
    if (!turnoActual) {
      setError('No hay un turno en atención');
      return;
    }

    if (!idEmpleado) {
      setError('ID de empleado no disponible');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[useOperador] 🔔 Volviendo a llamar turno:', turnoActual.codigo);
      
      await OperadorAPI.volverALlamar(turnoActual.idTicket, idEmpleado);
      
      // Refrescar datos para actualizar el estado
      await cargarDatos();
      
      console.log('[useOperador] ✅ Turno vuelto a llamar exitosamente');
    } catch (err: any) {
      console.error('[useOperador] ❌ Error volviendo a llamar:', err);
      setError(err?.message || 'Error al volver a llamar el turno');
    } finally {
      setLoading(false);
    }
  }, [turnoActual, idEmpleado, cargarDatos]);

  /**
   * Auto-refresh cada X segundos
   */
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      cargarDatos();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, cargarDatos]);

  /**
   * Suscripción a eventos SignalR en tiempo real
   */
  useEffect(() => {
    import('../realtime/turnosHub.client').then(({ createTurnosHubClient }) => {
      const hubConnection = createTurnosHubClient({
        onTicketCreado: (data) => {
          console.log('[useOperador] 🎫 Nuevo ticket creado:', data);
          // Refrescar lista de tickets pendientes
          cargarProximosTurnos();
        },
        onTurnoLlamado: (data) => {
          console.log('[useOperador] 🔔 Turno llamado:', data);
          // Refrescar datos para actualizar el estado
          cargarDatos();
        },
        onTurnoFinalizado: (data) => {
          console.log('[useOperador] ✅ Turno finalizado:', data);
          // Refrescar datos
          cargarDatos();
        },
      });

      hubConnection.start().catch((err) => {
        console.error('[useOperador] ❌ Error conectando a SignalR:', err);
      });

      return () => {
        hubConnection.stop();
      };
    });
  }, [cargarDatos, cargarProximosTurnos]);

  /**
   * Carga inicial
   */
  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  return {
    turnoActual,
    proximosTurnos,
    loading,
    error,
    llamarTurno,
    finalizarAtencion,
    volverALlamar,
    refrescar: cargarDatos,
    limpiarError: () => setError(null),
  };
}
