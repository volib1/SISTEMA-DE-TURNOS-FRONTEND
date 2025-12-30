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
   * ⚠️ IMPORTANTE: Esta función SOLO se ejecuta cuando el usuario presiona el botón "Llamar Siguiente Turno"
   */
  const llamarTurno = useCallback(async () => {
    console.log('[useOperador] 🔴 LLAMADA MANUAL POR EL USUARIO - Botón presionado');

    if (turnoActual) {
      setError('Ya hay un turno en atención. Finalice la atención actual antes de llamar otro.');
      return;
    }

    if (proximosTurnos.length === 0) {
      setError('No hay turnos en espera');
      return;
    }

    const siguienteTurno = proximosTurnos[0];

    // ✅ OPTIMIZACIÓN: Actualización optimista de UI
    // Actualizar UI inmediatamente sin esperar al servidor para mejor UX
    setProximosTurnos(prev => prev.slice(1)); // Remover primer turno de la lista
    setLoading(true);
    setError(null);

    try {
      console.log('[useOperador] 📞 *** LLAMANDO TURNO (ACCIÓN MANUAL) ***:', siguienteTurno.codigo);

      const turno = await OperadorAPI.llamarTurno(siguienteTurno.idTicket, idVentanilla, idEmpleado);

      setTurnoActual(turno);
      // ✅ OPTIMIZACIÓN: No esperar la recarga, el auto-refresh lo hará
      // Esto hace la UI más rápida y responsive
      cargarProximosTurnos(); // Sin await - ejecuta en background

      console.log('[useOperador] ✅ *** TURNO LLAMADO EXITOSAMENTE (ACCIÓN MANUAL) ***');
    } catch (err: any) {
      console.error('[useOperador] ❌ Error llamando turno:', err);
      setError(err?.message || 'Error al llamar el turno');
      // Revertir cambio optimista en caso de error
      await cargarProximosTurnos();
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

    // ✅ OPTIMIZACIÓN: Limpiar UI inmediatamente
    const turnoAnterior = turnoActual;
    setTurnoActual(null);
    setLoading(true);
    setError(null);

    try {
      console.log('[useOperador] ✅ Finalizando atención del turno:', turnoAnterior.codigo);

      await OperadorAPI.finalizarAtencion(turnoAnterior.id, turnoAnterior.idTicket, idEmpleado);

      // ✅ OPTIMIZACIÓN: Cargar en background sin esperar
      cargarProximosTurnos();

      console.log('[useOperador] ✅ Atención finalizada exitosamente');
    } catch (err: any) {
      console.error('[useOperador] ❌ Error finalizando atención:', err);
      setError(err?.message || 'Error al finalizar la atención');
      // Revertir cambio optimista
      setTurnoActual(turnoAnterior);
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

      // ✅ OPTIMIZACIÓN: No esperar la recarga, solo notificar éxito
      // El auto-refresh actualizará los datos automáticamente
      console.log('[useOperador] ✅ Turno vuelto a llamar exitosamente');
    } catch (err: any) {
      console.error('[useOperador] ❌ Error volviendo a llamar:', err);
      setError(err?.message || 'Error al volver a llamar el turno');
    } finally {
      setLoading(false);
    }
  }, [turnoActual, idEmpleado]);

  /**
   * Omite el turno actual marcándolo como "No se presentó"
   * Permite al operador pasar al siguiente turno cuando el cliente no se presenta
   */
  const omitirTurno = useCallback(async () => {
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
      console.log('[useOperador] ⏭️ Omitiendo turno (No se presentó):', turnoActual.codigo);

      await OperadorAPI.omitirTurno(turnoActual.idTicket, idEmpleado);

      setTurnoActual(null);
      await cargarProximosTurnos(); // Actualizar lista

      console.log('[useOperador] ✅ Turno omitido exitosamente');
    } catch (err: any) {
      console.error('[useOperador] ❌ Error omitiendo turno:', err);
      setError(err?.message || 'Error al omitir el turno');
    } finally {
      setLoading(false);
    }
  }, [turnoActual, idEmpleado, cargarProximosTurnos]);

  /**
   * Auto-refresh cada X segundos - SOLO CARGA DATOS, NO LLAMA TURNOS
   */
  useEffect(() => {
    if (!autoRefresh) return;

    console.log('[useOperador] ⚙️ Auto-refresh habilitado (solo carga datos, NO llama turnos automáticamente)');

    const interval = setInterval(() => {
      console.log('[useOperador] 🔄 Auto-refresh: Cargando datos (sin llamar turnos)...');
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
    omitirTurno,
    refrescar: cargarDatos,
    limpiarError: () => setError(null),
  };
}
