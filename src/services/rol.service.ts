import { API_ROOT, handleJSON, withQuery } from "./http";

export type RolDTO = {
  id: number;
  nombre: string;
};

export type CrearRolInput = { nombre: string };
export type ActualizarRolInput = { nombre: string };

const API = `${API_ROOT}/rol`;

function nRol(d: any): RolDTO {
  return {
    id: Number(d.id ?? d.Id ?? 0),
    nombre: String(d.nombre ?? d.Nombre ?? ""),
  };
}

function toPayloadCrear(x: CrearRolInput) {
  return { nombre: x.nombre?.trim() };
}
function toPayloadActualizar(x: ActualizarRolInput) {
  return { nombre: x.nombre?.trim() };
}

export const RolAPI = {
  async listar(): Promise<RolDTO[]> {
    const raw = await fetch(`${API}/Lista`).then(r => handleJSON<any[]>(r));
    return (Array.isArray(raw) ? raw : []).map(nRol);
  },
  async buscar(q: string): Promise<RolDTO[]> {
    const raw = await fetch(withQuery(`${API}/buscar`, { q })).then(r => handleJSON<any[]>(r));
    return (Array.isArray(raw) ? raw : []).map(nRol);
  },
  async obtener(id: number): Promise<{ id: number; nombre: string; usuarios: { id: number; nombre: string; correo: string }[] }> {
    const raw = await fetch(`${API}/${id}`).then(r => handleJSON<any>(r));
    return {
      id: Number(raw.id ?? 0),
      nombre: String(raw.nombre ?? ""),
      usuarios: Array.isArray(raw.Usuarios) ? raw.Usuarios.map((u: any) => ({
        id: Number(u.id ?? 0),
        nombre: String(u.nombre ?? ""),
        correo: String(u.correo ?? ""),
      })) : [],
    };
  },
  async crear(input: CrearRolInput): Promise<RolDTO> {
    const raw = await fetch(`${API}/Nuevo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toPayloadCrear(input)),
    }).then(r => handleJSON<any>(r));
    return nRol(raw);
  },
  actualizar(id: number, input: ActualizarRolInput) {
    return fetch(`${API}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toPayloadActualizar(input)),
    }).then(r => handleJSON<{ message: string }>(r));
  },
  eliminar(id: number) {
    return fetch(`${API}/${id}`, { method: "DELETE" }).then(r => handleJSON<{ message: string }>(r));
  },
};
