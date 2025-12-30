import { API_ROOT, handleJSON } from "./http";

export type TicketLlamadoDto = {
  ventanilla: string;
  ticket: string;
  servicio?: string | null;
  hora?: string | null;
  horaTimestamp?: number; // Para detectar re-llamados
  estado?: string; // "Llamando" o "Atendido"
};

const API = `${API_ROOT}/pantalla`;

export const PantallaFeedAPI = {
  async ultimosLlamados(): Promise<TicketLlamadoDto[]> {
    try {
      console.log('[PantallaFeed] 📡 Obteniendo historial de turnos llamados...');

      // Usar el nuevo endpoint que devuelve historial de los últimos 6 turnos
      const raw = await fetch(`${API}/historial-llamados?max=6`).then(r => handleJSON<any[]>(r));

      console.log('[PantallaFeed] 📊 Datos recibidos del backend:', raw);

      // Mapear la respuesta del backend al formato esperado
      const llamados = (Array.isArray(raw) ? raw : []).map((item: any) => {
        // Intentar parsear la hora de inicio
        let horaFormateada: string | null = null;
        let timestamp: number = Date.now();

        if (item.hora_inicio) {
          try {
            const fecha = new Date(item.hora_inicio);
            // Verificar si la fecha es válida
            if (!isNaN(fecha.getTime())) {
              horaFormateada = fecha.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
              });
              timestamp = fecha.getTime();
            } else {
              console.warn('[PantallaFeed] ⚠️ Fecha inválida recibida:', item.hora_inicio);
            }
          } catch (error) {
            console.error('[PantallaFeed] ❌ Error parseando hora_inicio:', error);
          }
        }

        return {
          ventanilla: item.Ventanilla || item.ventanilla || 'Sin asignar',
          ticket: item.Codigo || item.codigo || item.ticket || 'N/A',
          servicio: item.Servicio || item.servicio || null,
          hora: horaFormateada,
          horaTimestamp: timestamp,
          estado: item.Estado || item.estado || 'Llamando'
        };
      });

      console.log('[PantallaFeed] ✅ Llamados procesados:', llamados);

      return llamados;
    } catch (error) {
      console.error('[PantallaFeed] ❌ Error obteniendo llamados:', error);
      return [];
    }
  },
};
