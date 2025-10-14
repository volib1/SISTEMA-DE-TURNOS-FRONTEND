import { API_ROOT, handleJSON, withQuery } from "./http";

export type TurnoDTO = {
  id: number;
  ticket: { id: number; codigo: string };
  ventanilla: { id: number; nombre: string };
  horaInicio: string | null;
  horaFin: string | null;
};

export type CrearTurnoInput = { idTicket: number; idVentanilla: number; horaInicio?: string | null };

const API = `${API_ROOT}/turno`;

function nTurno(d: any): TurnoDTO {
  return {
    id: Number(d.id ?? 0),
    ticket: {
      id: Number(d.Ticket?.id ?? 0),
      codigo: String(d.Ticket?.codigo ?? ""),
    },
    ventanilla: {
      id: Number(d.Ventanilla?.id ?? 0),
      nombre: String(d.Ventanilla?.nombre ?? ""),
    },
    horaInicio: (d.hora_inicio ?? d.horaInicio ?? null) as string | null,
    horaFin: (d.hora_fin ?? d.horaFin ?? null) as string | null,
  };
}

export const TurnoAPI = {
  async listar(params?: { idVentanilla?: number; fecha?: string }): Promise<TurnoDTO[]> {
    const raw = await fetch(withQuery(`${API}/Lista`, params ?? {})).then(r => handleJSON<any[]>(r));
    return (Array.isArray(raw) ? raw : []).map(nTurno);
  },
  async obtener(id: number): Promise<TurnoDTO> {
    const raw = await fetch(`${API}/${id}`).then(r => handleJSON<any>(r));
    return nTurno(raw);
  },
  async crear(input: CrearTurnoInput) {
    const payload = {
      id_ticket: input.idTicket,
      id_ventanilla: input.idVentanilla,
      hora_inicio: input.horaInicio ?? null,
    };
    const raw = await fetch(`${API}/Nuevo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(r => handleJSON<any>(r));
    return { id: Number(raw.id ?? 0) };
  },
  cerrar(id: number) {
    return fetch(`${API}/${id}/cerrar`, { method: "PUT" }).then(r => handleJSON<{ message: string }>(r));
  },
  eliminar(id: number) {
    return fetch(`${API}/${id}`, { method: "DELETE" }).then(r => handleJSON<{ message: string }>(r));
  },
};
