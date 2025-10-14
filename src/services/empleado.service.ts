import { API_ROOT, handleJSON } from "./http";

export type EmpleadoTicketDTO = {
  idTurno: number;
  ticket: { id: number; codigo: string; estado: string; servicio: string };
  ventanilla: { id: number; nombre: string };
  horaInicio: string | null;
};

const API = `${API_ROOT}/empleado`;

export const EmpleadoAPI = {
  async misTickets(empleadoId: number): Promise<EmpleadoTicketDTO[]> {
    const raw = await fetch(`${API}/mis-tickets?empleadoId=${empleadoId}`).then(r => handleJSON<any[]>(r));
    return (Array.isArray(raw) ? raw : []).map(d => ({
      idTurno: Number(d.id ?? 0),
      ticket: {
        id: Number(d.Ticket?.id ?? 0),
        codigo: String(d.Ticket?.codigo ?? ""),
        estado: String(d.Ticket?.Estado ?? ""),
        servicio: String(d.Ticket?.Servicio ?? ""),
      },
      ventanilla: {
        id: Number(d.Ventanilla?.id ?? 0),
        nombre: String(d.Ventanilla?.nombre ?? ""),
      },
      horaInicio: (d.hora_inicio ?? null) as string | null,
    }));
  },
  llamarTicket(ticketId: number, empleadoId: number) {
    return fetch(`${API}/ticket/${ticketId}/llamar?empleadoId=${empleadoId}`, {
      method: "POST",
    }).then(r => handleJSON<{ message: string; id: number; codigo: string; Ventanilla: string; Estado: string; turnoId: number }>(r));
  },
  cambiarEstado(ticketId: number, empleadoId: number, nuevoEstado: string) {
    const url = `${API}/ticket/${ticketId}/estado?empleadoId=${empleadoId}&nuevoEstado=${encodeURIComponent(nuevoEstado)}`;
    return fetch(url, { method: "POST" }).then(r => handleJSON<{ message: string; ticketId: number; nuevoEstado: string; turnoId: number; hora_fin: string | null }>(r));
  },
};
