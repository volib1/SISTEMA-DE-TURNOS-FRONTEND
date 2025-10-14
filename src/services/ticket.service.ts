import { API_ROOT, handleJSON, withQuery } from "./http";

export type TicketDTO = {
  id: number;
  codigo: string;
  fechaCreacion: string;
  estado?: { id: number; nombre: string };
  servicio?: { id: number; nombre: string };
  turno?: { id: number; idVentanilla: number; horaInicio: string | null; horaFin: string | null } | null;
};

export type CrearTicketInput = { idServicio: number; idEstado: number };
export type ActualizarTicketInput = { idServicio?: number; idEstado?: number };

const API = `${API_ROOT}/ticket`;

function nTicket(d: any): TicketDTO {
  // Debug: Ver estructura del ticket que llega del backend
  console.log('[TicketService] 🔍 Procesando ticket:', {
    id: d.id,
    codigo: d.codigo,
    fecha_raw: d.fecha_creacion || d.fechaCreacion,
    estado_raw: d.Estado || d.estado || d.id_estadoNavigation,
    servicio_raw: d.Servicio || d.servicio || d.id_servicioNavigation
  });

  // Intentar obtener el estado de diferentes posibles campos
  const estadoRaw = d.Estado || d.estado || d.id_estadoNavigation;
  const servicioRaw = d.Servicio || d.servicio || d.id_servicioNavigation;
  
  // Obtener la fecha de creación
  const fechaCreacion = String(d.fecha_creacion ?? d.fechaCreacion ?? "");
  console.log('[TicketService] 📅 Fecha procesada:', fechaCreacion);

  return {
    id: Number(d.id ?? 0),
    codigo: String(d.codigo ?? ""),
    fechaCreacion: fechaCreacion,
    estado: estadoRaw ? { id: Number(estadoRaw.id ?? 0), nombre: String(estadoRaw.nombre ?? "") } : undefined,
    servicio: servicioRaw ? { id: Number(servicioRaw.id ?? 0), nombre: String(servicioRaw.nombre ?? "") } : undefined,
    turno: d.Turno
      ? {
          id: Number(d.Turno.id ?? 0),
          idVentanilla: Number(d.Turno.id_ventanilla ?? d.Turno.idVentanilla ?? 0),
          horaInicio: (d.Turno.hora_inicio ?? null) as string | null,
          horaFin: (d.Turno.hora_fin ?? null) as string | null,
        }
      : null,
  };
}

export const TicketAPI = {
  async listar(params?: { page?: number; pageSize?: number; idEstado?: number; idServicio?: number; fecha?: string }) {
    const raw = await fetch(withQuery(`${API}/Lista`, params ?? {})).then(r => handleJSON<any>(r));
    return {
      page: Number(raw.page ?? 1),
      pageSize: Number(raw.pageSize ?? 20),
      total: Number(raw.total ?? 0),
      items: Array.isArray(raw.items) ? raw.items.map(nTicket) : [],
    };
  },
  async buscar(q: string): Promise<TicketDTO[]> {
    const raw = await fetch(withQuery(`${API}/buscar`, { q })).then(r => handleJSON<any[]>(r));
    return (Array.isArray(raw) ? raw : []).map(nTicket);
  },
  async obtener(id: number): Promise<TicketDTO> {
    const raw = await fetch(`${API}/${id}`).then(r => handleJSON<any>(r));
    return nTicket(raw);
  },
  async proximoCodigo(idServicio: number) {
    return fetch(`${API}/proximo-codigo/${idServicio}`).then(r => handleJSON<{ FechaLocal: string; Codigo: string }>(r));
  },
  async crear(input: CrearTicketInput): Promise<TicketDTO> {
    const payload = { id_servicio: input.idServicio, id_estado: input.idEstado };
    const raw = await fetch(`${API}/Nuevo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(r => handleJSON<any>(r));
    return nTicket(raw);
  },
  actualizar(id: number, input: ActualizarTicketInput) {
    const payload: any = {};
    if (input.idServicio) payload.id_servicio = input.idServicio;
    if (input.idEstado) payload.id_estado = input.idEstado;
    return fetch(`${API}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(r => handleJSON<{ message: string }>(r));
  },
  eliminar(id: number) {
    return fetch(`${API}/${id}`, { method: "DELETE" }).then(r => handleJSON<{ message: string }>(r));
  },
};
