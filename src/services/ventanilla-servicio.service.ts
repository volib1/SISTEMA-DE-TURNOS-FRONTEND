import { API_ROOT, handleJSON } from "./http";

export type VentanillaServicioDTO = {
  id: number;
  idVentanilla: number;
  ventanilla: string;
  idServicio: number;
  servicio: string;
  activo: boolean;
};

export type CrearVentanillaServicioInput = { idVentanilla: number; idServicio: number; activo?: boolean };

const API = `${API_ROOT}/ventanillaservicio`;

function nVS(d: any): VentanillaServicioDTO {
  return {
    id: Number(d.id ?? 0),
    // Manejar PascalCase (backend) y camelCase
    idVentanilla: Number(d.idVentanilla ?? d.IdVentanilla ?? d.id_ventanilla ?? 0),
    ventanilla: String(d.ventanilla ?? d.Ventanilla ?? ""),
    idServicio: Number(d.idServicio ?? d.IdServicio ?? d.id_servicio ?? 0),
    servicio: String(d.servicio ?? d.Servicio ?? ""),
    activo: Boolean(d.activo ?? d.Activo ?? false),
  };
}

export const VentanillaServicioAPI = {
  async listar(): Promise<VentanillaServicioDTO[]> {
    const raw = await fetch(`${API}/Lista`).then(r => handleJSON<any[]>(r));
    return (Array.isArray(raw) ? raw : []).map(nVS);
  },
  async crear(input: CrearVentanillaServicioInput) {
    const payload = {
      id_ventanilla: input.idVentanilla,
      id_servicio: input.idServicio,
      activo: input.activo ?? true,
    };
    return fetch(`${API}/Nuevo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(r => handleJSON<{ message: string; id: number }>(r));
  },
  activar(id: number, activo = true) {
    return fetch(`${API}/${id}/activar?activo=${activo}`, { method: "PUT" }).then(r => handleJSON<{ message: string }>(r));
  },
  eliminar(id: number) {
    return fetch(`${API}/${id}`, { method: "DELETE" }).then(r => handleJSON<{ message: string }>(r));
  },
};
