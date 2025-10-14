import { VentanillaAPI } from "./ventanilla.service";
import { TicketAPI } from "./ticket.service";

export type SummaryDTO = {
  ticketsHoy: number;
  enEspera: number;
  atendidos: number;
  ventanillasActivas: number;
};

export type RecentItemDTO = {
  id: number;
  codigo: string;
  ventanilla: string | null;
  estado: string;
  fecha: string; // ISO
};

export async function fetchJSON<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const r = await fetch(input, init);
  const ct = r.headers.get("content-type") ?? "";
  const data = ct.includes("application/json") ? await r.json() : await r.text();
  if (!r.ok) {
    const e: any = new Error(`HTTP ${r.status} ${r.statusText}`);
    e.detail = data;
    throw e;
  }
  return data as T;
}

export const DashboardAPI = {
  async summary(): Promise<SummaryDTO> {
    console.log('[Dashboard] 📊 Obteniendo resumen del sistema...');
    
    // Inicializar con valores por defecto
    let ventanillasActivas = 0;
    let ticketsHoy = 0;
    let enEspera = 0;
    let atendidos = 0;

    // Obtener ventanillas (esto debería funcionar)
    try {
      console.log('[Dashboard] 🏢 Obteniendo ventanillas...');
      const ventanillas = await VentanillaAPI.listar();
      console.log('[Dashboard] ✅ Ventanillas obtenidas:', ventanillas.length);
      console.log('[Dashboard] 📋 Ventanillas completas:', ventanillas);

      ventanillasActivas = ventanillas.filter(v => {
        console.log('[Dashboard] 🔍 Verificando ventanilla:', { id: v.id, nombre: v.nombre, activa: v.activa, tipo: typeof v.activa });
        return v.activa;
      }).length;
      
      console.log('[Dashboard] 📊 Ventanillas activas encontradas:', ventanillasActivas);
    } catch (error) {
      console.error('[Dashboard] ❌ Error obteniendo ventanillas:', error);
    }

    // Obtener tickets (puede fallar, pero no afecta ventanillas)
    try {
      console.log('[Dashboard] 🎫 Obteniendo tickets...');
      const fechaHoy = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      console.log('[Dashboard] 📅 Consultando tickets para fecha:', fechaHoy);
      
      const tickets = await TicketAPI.listar({ fecha: fechaHoy });
      console.log('[Dashboard] ✅ Tickets obtenidos desde API:', tickets.total);
      console.log('[Dashboard] 📋 Detalles de tickets:', { 
        total: tickets.total, 
        items: tickets.items?.length || 0,
        fechaConsultada: fechaHoy,
        estructura: tickets.items?.[0] || 'No hay tickets'
      });
      
      // Mostrar todos los tickets para debug
      if (tickets.items && tickets.items.length > 0) {
        console.log('[Dashboard] 📋 Todos los tickets de hoy:');
        tickets.items.forEach((ticket: any, index: number) => {
          console.log(`  ${index + 1}. ${ticket.codigo} - Estado: ${ticket.estado?.nombre || 'Sin estado'} - Servicio: ${ticket.servicio?.nombre || 'Sin servicio'}`);
        });
      } else {
        console.log('[Dashboard] 📋 No hay tickets para mostrar hoy');
      }
      
      ticketsHoy = tickets.total; // Solo tickets reales de la API
      const ticketsArray = tickets.items || [];
      
      // Contar tickets por estado (solo de la API)
      enEspera = ticketsArray.filter((t: any) => {
        const estado = t.estado?.nombre?.toLowerCase() || '';
        const esEspera = estado.includes('espera') || 
                       estado.includes('generado') ||
                       estado.includes('pendiente') ||
                       estado.includes('esperando') ||
                       estado === 'pendiente';
        if (esEspera) {
          console.log(`[Dashboard] 🟡 Ticket en espera: ${t.codigo} - Estado: "${t.estado?.nombre}"`);
        }
        return esEspera;
      }).length;
      
      atendidos = ticketsArray.filter((t: any) => {
        const estado = t.estado?.nombre?.toLowerCase() || '';
        const esAtendido = estado.includes('atendido') ||
                          estado.includes('completado') ||
                          estado.includes('finalizado') ||
                          estado.includes('atención') ||
                          estado === 'atendido';
        if (esAtendido) {
          console.log(`[Dashboard] 🟢 Ticket atendido: ${t.codigo} - Estado: "${t.estado?.nombre}"`);
        }
        return esAtendido;
      }).length;

      console.log('[Dashboard] 🎫 Estadísticas finales (solo API):', { 
        ticketsHoy, 
        enEspera, 
        atendidos,
        apiTotal: tickets.total 
      });
      
    } catch (error) {
      console.warn('[Dashboard] ⚠️ Error obteniendo tickets (usando valores por defecto):', error);
      
      // Si hay error en la API, mantener valores en 0 (no usar contadores temporales)
      console.log('[Dashboard] 🚫 Error en API - mostrando solo datos confirmados (0)');
    }

    const resumen = {
      ticketsHoy,
      enEspera,
      atendidos,
      ventanillasActivas
    };

    console.log('[Dashboard] 📈 Resumen final calculado:', resumen);
    return resumen;
  },

  async recent(limit = 10): Promise<RecentItemDTO[]> {
    console.log('[Dashboard] 🕐 Obteniendo actividad reciente...');
    
    try {
      // Obtener tickets recientes
      const ticketsResponse = await TicketAPI.listar({ 
        pageSize: limit,
        page: 1
      });
      
      const recentItems: RecentItemDTO[] = (ticketsResponse.items || []).map((ticket: any) => ({
        id: ticket.id,
        codigo: ticket.codigo,
        ventanilla: ticket.turno?.idVentanilla ? `Ventanilla ${ticket.turno.idVentanilla}` : null,
        estado: ticket.estado?.nombre || 'DESCONOCIDO',
        fecha: ticket.fechaCreacion
      }));

      console.log('[Dashboard] ✅ Actividad reciente obtenida:', recentItems.length, 'items');
      return recentItems;
      
    } catch (error) {
      console.warn('[Dashboard] ⚠️ Error obteniendo actividad reciente:', error);
      // Fallback con datos simulados si hay errores
      return [
        { 
          id: 1, 
          codigo: 'T001', 
          ventanilla: null, 
          estado: 'GENERADO', 
          fecha: new Date().toISOString() 
        }
      ];
    }
  },
};
