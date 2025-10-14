import { API_ROOT, handleJSON } from "./http";

export type TurnoLlamandoDTO = {
  codigo: string;
  servicio: string;
  ventanilla: string;
  horaInicio: string;
};

export type ResumenEstadoDTO = { id: number; nombre: string; cantidad: number };

export type AtendidoDTO = {
  codigo: string;
  servicio: string;
  ventanilla: string;
  horaInicio: string;
  horaFin: string;
};

const API = `${API_ROOT}/pantalla`;

export const PantallaAPI = {
  async turnosLlamando(): Promise<TurnoLlamandoDTO[]> {
    const raw = await fetch(`${API}/turnos-llamando`).then(r => handleJSON<any[]>(r));
    return (Array.isArray(raw) ? raw : []).map(d => ({
      codigo: String(d.Codigo ?? ""),
      servicio: String(d.Servicio ?? ""),
      ventanilla: String(d.Ventanilla ?? ""),
      horaInicio: String(d.hora_inicio ?? d.horaInicio ?? ""),
    }));
  },
  async resumen(): Promise<ResumenEstadoDTO[]> {
    const raw = await fetch(`${API}/resumen`).then(r => handleJSON<any[]>(r));
    return (Array.isArray(raw) ? raw : []).map(d => ({
      id: Number(d.id ?? 0),
      nombre: String(d.nombre ?? ""),
      cantidad: Number(d.Cantidad ?? d.cantidad ?? 0),
    }));
  },
  async ultimosAtendidos(max = 10): Promise<AtendidoDTO[]> {
    const raw = await fetch(`${API}/ultimos-atendidos?max=${max}`).then(r => handleJSON<any[]>(r));
    return (Array.isArray(raw) ? raw : []).map(d => ({
      codigo: String(d.Codigo ?? ""),
      servicio: String(d.Servicio ?? ""),
      ventanilla: String(d.Ventanilla ?? ""),
      horaInicio: String(d.hora_inicio ?? ""),
      horaFin: String(d.hora_fin ?? ""),
    }));
  },
};
