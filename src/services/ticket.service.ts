import { API_ROOT, handleJSON, withQuery } from "./http";

export type TicketDTO = {
  id: number;
  codigo: string;
  fechaCreacion: string;
  estado?: { id: number; nombre: string };
  servicio?: { id: number; nombre: string };
  turno?: { id: number; idVentanilla: number; horaInicio: string | null; horaFin: string | null } | null;
};

export type CrearTicketInput = { idServicio: number; idEstado?: number };
export type ActualizarTicketInput = { idServicio?: number; idEstado?: number };

const API = `${API_ROOT}/ticket`;
const API_KIOSKO = `${API_ROOT}/kiosko`;

function nTicket(d: any): TicketDTO {
  const estadoRaw = d.Estado || d.estado || d.id_estadoNavigation;
  const servicioRaw = d.Servicio || d.servicio || d.id_servicioNavigation;
  const turnoRaw = d.Turno || d.turno;

  return {
    id: Number(d.id ?? 0),
    codigo: String(d.codigo ?? ""),
    fechaCreacion: String(d.fecha_creacion ?? d.fechaCreacion ?? d.fecha ?? ""),
    estado: estadoRaw
      ? { id: Number(estadoRaw.id ?? 0), nombre: String(estadoRaw.nombre ?? estadoRaw.Nombre ?? estadoRaw) }
      : undefined,
    servicio: servicioRaw
      ? { id: Number(servicioRaw.id ?? 0), nombre: String(servicioRaw.nombre ?? servicioRaw.Nombre ?? servicioRaw) }
      : undefined,
    turno: turnoRaw
      ? {
          id: Number(turnoRaw.id ?? 0),
          idVentanilla: Number(turnoRaw.id_ventanilla ?? turnoRaw.idVentanilla ?? 0),
          horaInicio: (turnoRaw.hora_inicio ?? turnoRaw.horaInicio ?? null) as string | null,
          horaFin: (turnoRaw.hora_fin ?? turnoRaw.horaFin ?? null) as string | null,
        }
      : null,
  };
}

export const TicketAPI = {
  // ✅ Soporta { total, items } o arreglo plano
  async listar(params?: { page?: number; pageSize?: number; idEstado?: number; idServicio?: number; fecha?: string }) {
    const url = withQuery(`${API}/Lista`, params ?? {});
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    const raw = await handleJSON<any>(r);

    const itemsRaw = Array.isArray(raw?.items)
      ? raw.items
      : Array.isArray(raw)
      ? raw
      : [];

    const total = typeof raw?.total === "number" ? raw.total : itemsRaw.length;

    return {
      page: Number(raw?.page ?? params?.page ?? 1),
      pageSize: Number(raw?.pageSize ?? params?.pageSize ?? itemsRaw.length),
      total: Number(total ?? 0),
      items: itemsRaw.map(nTicket),
    };
  },

  async buscar(q: string): Promise<TicketDTO[]> {
    const r = await fetch(withQuery(`${API}/buscar`, { q }), { headers: { Accept: "application/json" } });
    const raw = await handleJSON<any[]>(r);
    return (Array.isArray(raw) ? raw : []).map(nTicket);
  },

  async obtener(id: number): Promise<TicketDTO> {
    const r = await fetch(`${API}/${id}`, { headers: { Accept: "application/json" } });
    const raw = await handleJSON<any>(r);
    return nTicket(raw);
  },

  async proximoCodigo(idServicio: number) {
    const r = await fetch(`${API}/proximo-codigo/${idServicio}`, { headers: { Accept: "application/json" } });
    return handleJSON<{ FechaLocal: string; Codigo: string }>(r);
  },

  // Intenta kiosko primero, y si falla y mandan idEstado, usa /ticket/Nuevo
  async crear(input: CrearTicketInput): Promise<TicketDTO> {
    try {
      const urlKiosko = `${API_KIOSKO}/ticket?idServicio=${encodeURIComponent(input.idServicio)}`;
      const rk = await fetch(urlKiosko, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
      });

      if (!rk.ok) {
        const txt = await rk.text().catch(() => "");
        if (rk.status === 422 && (txt.includes("Pendiente") || txt.includes("pendiente"))) {
          throw new Error("⚠️ No se pudo crear el ticket: el estado “Pendiente” no está configurado.");
        }
        throw new Error(txt || `HTTP ${rk.status} ${rk.statusText}`);
      }

      const rawK = await handleJSON<any>(rk);
      return nTicket(rawK);
    } catch (e) {
      if (typeof input.idEstado === "number") {
        const payload = { id_servicio: input.idServicio, id_estado: input.idEstado };
        const ra = await fetch(`${API}/Nuevo`, {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const rawA = await handleJSON<any>(ra);
        return nTicket(rawA);
      }
      throw e;
    }
  },

  actualizar(id: number, input: ActualizarTicketInput) {
    const payload: any = {};
    if (input.idServicio != null) payload.id_servicio = input.idServicio;
    if (input.idEstado != null) payload.id_estado = input.idEstado;

    return fetch(`${API}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    }).then(r => handleJSON<{ message: string }>(r));
  },

  eliminar(id: number) {
    return fetch(`${API}/${id}`, { method: "DELETE", headers: { Accept: "application/json" } })
      .then(r => handleJSON<{ message: string }>(r));
  },
};
