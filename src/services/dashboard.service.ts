// import { VentanillaAPI } from "./ventanilla.service";
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

// -------- Utilidades de fecha (zona America/El_Salvador) --------
const TZ = "America/El_Salvador";

function getTZDateKey(iso: string | Date, timeZone = TZ): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("es-SV", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);

  const y = parts.find(p => p.type === "year")?.value ?? "0000";
  const m = parts.find(p => p.type === "month")?.value ?? "01";
  const day = parts.find(p => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${day}`;
}

function getTodayKey(timeZone = TZ): string {
  return getTZDateKey(new Date(), timeZone);
}

function classifyEstado(raw: string | undefined | null): "ESPERA" | "ATENDIDO" | null {
  const estado = (raw || "").toLowerCase().trim();

  if (
    !estado ||
    estado === "generado" ||
    estado === "pendiente" ||
    estado === "en espera" ||
    estado === "esperando" ||
    estado.includes("espera") ||
    estado.includes("generado") ||
    estado.includes("pendiente")
  ) {
    return "ESPERA";
  }

  if (
    estado === "atendido" ||
    estado === "completado" ||
    estado === "finalizado" ||
    estado === "terminado" ||
    estado.includes("atendid") ||
    estado.includes("completad") ||
    estado.includes("finalizad") ||
    estado.includes("terminad")
  ) {
    return "ATENDIDO";
  }

  return null;
}

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
  // Resumen del día de HOY (America/El_Salvador)
  async summary(): Promise<SummaryDTO> {
    console.log('[Dashboard] 📊 Obteniendo resumen del sistema (solo HOY)...');

    let ventanillasActivas = 0;
    let ticketsHoy = 0;
    let enEspera = 0;
    let atendidos = 0;

    // Ventanillas activas
    try {
      console.log('[Dashboard] 🏢 Obteniendo ventanillas...');
      const ventanillas = await VentanillaAPI.listar();
      ventanillasActivas = ventanillas.filter((v: any) => !!v.activa).length;
      console.log('[Dashboard] ✅ Ventanillas activas:', ventanillasActivas);
    } catch (error) {
      console.error('[Dashboard] ❌ Error obteniendo ventanillas:', error);
    }

    // Tickets de HOY
    try {
      const todayKey = getTodayKey();
      const fechaHoy = todayKey; // YYYY-MM-DD
      console.log('[Dashboard] 🎫 Obteniendo tickets de hoy:', fechaHoy);

      // 1) Intentar con filtro por fecha (si backend lo soporta)
      let ticketsResp = await TicketAPI.listar({ fecha: fechaHoy, pageSize: 500, page: 1 });

      // 2) Si no hay, traer sin filtro y filtrar localmente
      if (!ticketsResp?.items || ticketsResp.items.length === 0) {
        console.log('[Dashboard] 🔄 Fallback sin filtro. Se filtrará en cliente por zona horaria.');
        ticketsResp = await TicketAPI.listar({ pageSize: 500, page: 1 });
      }

      const allItems: any[] = ticketsResp.items ?? [];
      const todayItems = allItems.filter((t: any) => {
        const fecha = t.fechaCreacion || t.fecha || t.createdAt || t.created_at;
        const key = fecha ? getTZDateKey(fecha, TZ) : "";
        return key === todayKey;
      });

      ticketsHoy = todayItems.length;

      todayItems.forEach((t) => {
        const tipo = classifyEstado(t?.estado?.nombre);
        if (tipo === "ESPERA") enEspera++;
        else if (tipo === "ATENDIDO") atendidos++;
      });

      console.log('[Dashboard] 📈 HOY =>', { ticketsHoy, enEspera, atendidos });

    } catch (error: any) {
      console.error('[Dashboard] ❌ Error obteniendo tickets:', error);
      console.error('[Dashboard] 📄 Detalles del error:', {
        message: error?.message,
        detail: error?.detail,
        stack: error?.stack
      });
      // Se mantienen contadores en 0 si falla
    }

    const resumen: SummaryDTO = {
      ticketsHoy,
      enEspera,
      atendidos,
      ventanillasActivas
    };

    console.log('[Dashboard] ✅ Resumen final (HOY):', resumen);
    return resumen;
  },

  // Actividad reciente: prioriza HOY; si no hay, devuelve últimos
  async recent(limit = 10): Promise<RecentItemDTO[]> {
    console.log('[Dashboard] 🕐 Obteniendo actividad reciente (prioriza HOY)...');

    try {
      const todayKey = getTodayKey();

      const ticketsResponse = await TicketAPI.listar({ pageSize: Math.max(50, limit * 2), page: 1 });

      const items: any[] = ticketsResponse.items ?? [];
      const mapped: RecentItemDTO[] = items.map((ticket: any) => ({
        id: ticket.id,
        codigo: ticket.codigo,
        ventanilla: ticket.turno?.idVentanilla ? `Ventanilla ${ticket.turno.idVentanilla}` : null,
        estado: ticket.estado?.nombre || 'SIN ESTADO',
        fecha: ticket.fechaCreacion || ticket.fecha || new Date().toISOString()
      }));

      const todayItems = mapped
        .filter((i) => getTZDateKey(i.fecha, TZ) === todayKey)
        .sort((a, b) => +new Date(b.fecha) - +new Date(a.fecha))
        .slice(0, limit);

      if (todayItems.length > 0) {
        console.log('[Dashboard] ✅ Actividad de HOY:', todayItems.length);
        return todayItems;
      }

      const fallback = mapped
        .sort((a, b) => +new Date(b.fecha) - +new Date(a.fecha))
        .slice(0, limit);

      console.log('[Dashboard] ⚠️ Sin actividad de hoy; mostrando últimos', fallback.length);
      return fallback;

    } catch (error: any) {
      console.error('[Dashboard] ❌ Error obteniendo actividad reciente:', error);
      console.error('[Dashboard] 📄 Detalles del error:', {
        message: error?.message,
        detail: error?.detail
      });
      return [];
    }
  },
};
