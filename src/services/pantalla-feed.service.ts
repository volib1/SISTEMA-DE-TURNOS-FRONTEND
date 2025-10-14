import { API_ROOT, handleJSON } from "./http";

export type TicketLlamadoDto = {
  ventanilla: string;
  ticket: string;
  servicio?: string | null;
  hora?: string | null;
  horaTimestamp?: number; // Para detectar re-llamados
};

const API = `${API_ROOT}/pantalla`;

export const PantallaFeedAPI = {
  async ultimosLlamados(): Promise<TicketLlamadoDto[]> {
    try {
      console.log('[PantallaFeed] 📡 Obteniendo turnos en estado "Llamando"...');
      
      const raw = await fetch(`${API}/turnos-llamando`).then(r => handleJSON<any[]>(r));
      
      console.log('[PantallaFeed] 📊 Datos recibidos del backend:', raw);
      
      // Mapear la respuesta del backend al formato esperado
      const llamados = (Array.isArray(raw) ? raw : []).map((item: any) => ({
        ventanilla: item.Ventanilla || item.ventanilla || 'Sin asignar',
        ticket: item.Codigo || item.codigo || item.ticket || 'N/A',
        servicio: item.Servicio || item.servicio || null,
        hora: item.hora_inicio ? new Date(item.hora_inicio).toLocaleTimeString('es-ES', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }) : null,
        horaTimestamp: item.hora_inicio ? new Date(item.hora_inicio).getTime() : Date.now()
      }));
      
      console.log('[PantallaFeed] ✅ Llamados procesados:', llamados);
      
      return llamados;
    } catch (error) {
      console.error('[PantallaFeed] ❌ Error obteniendo llamados:', error);
      return [];
    }
  },
};
