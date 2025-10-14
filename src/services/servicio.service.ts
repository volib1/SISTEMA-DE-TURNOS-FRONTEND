import { API_ROOT, handleJSON, withQuery } from "./http";

export type ServicioDTO = {
  id: number;
  nombre: string;
  descripcion?: string | null;
  activo?: boolean;
  ventanillasActivas?: number;
  ventanillas?: { id: number; ventanillaId: number; ventanilla: string; activo: boolean }[];
};

export type CrearServicioInput = { nombre: string; descripcion?: string | null };
export type ActualizarServicioInput = { nombre: string; descripcion?: string | null };

const API = `${API_ROOT}/servicio`;

function nServicio(d: any): ServicioDTO {
  return {
    id: Number(d.id ?? 0),
    nombre: String(d.nombre ?? ""),
    descripcion: d.descripcion ?? null,
    activo: typeof d.activo === "boolean" ? d.activo : undefined,
    ventanillasActivas: typeof d.VentanillasActivas === "number" ? d.VentanillasActivas : undefined,
    ventanillas: Array.isArray(d.Ventanillas)
      ? d.Ventanillas.map((x: any) => ({
          id: Number(x.id ?? 0),
          ventanillaId: Number(x.VentanillaId ?? 0),
          ventanilla: String(x.Ventanilla ?? ""),
          activo: Boolean(x.activo ?? false),
        }))
      : undefined,
  };
}

export const ServicioAPI = {
  async listar(): Promise<ServicioDTO[]> {
    const raw = await fetch(`${API}/Lista`).then(r => handleJSON<any[]>(r));
    return (Array.isArray(raw) ? raw : []).map(nServicio);
  },
  async listarConEstado(soloActivos?: boolean): Promise<ServicioDTO[]> {
    try {
      const url = withQuery(`${API}/ListaEstado`, {
        soloActivos: soloActivos === undefined ? undefined : String(soloActivos),
      });
      console.log('[ServicioAPI.listarConEstado] URL:', url);
      console.log('[ServicioAPI.listarConEstado] soloActivos:', soloActivos);
      
      const response = await fetch(url);
      console.log('[ServicioAPI.listarConEstado] Response status:', response.status);
      console.log('[ServicioAPI.listarConEstado] Response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ServicioAPI.listarConEstado] Error response:', errorText);
        throw new Error(`Error ${response.status}: ${errorText}`);
      }
      
      const raw = await handleJSON<any[]>(response);
      console.log('[ServicioAPI.listarConEstado] Respuesta raw:', raw);
      console.log('[ServicioAPI.listarConEstado] Cantidad:', Array.isArray(raw) ? raw.length : 0);
      
      if (Array.isArray(raw) && raw.length > 0) {
        console.log('[ServicioAPI.listarConEstado] Primer servicio:', raw[0]);
      }
      
      const servicios = (Array.isArray(raw) ? raw : []).map(nServicio);
      console.log('[ServicioAPI.listarConEstado] Servicios transformados:', servicios);
      
      return servicios;
    } catch (error) {
      console.error('[ServicioAPI.listarConEstado] Error capturado:', error);
      throw error;
    }
  },
  async buscar(q: string): Promise<ServicioDTO[]> {
    const raw = await fetch(withQuery(`${API}/buscar`, { q })).then(r => handleJSON<any[]>(r));
    return (Array.isArray(raw) ? raw : []).map(nServicio);
  },
  async obtener(id: number): Promise<ServicioDTO> {
    const raw = await fetch(`${API}/${id}`).then(r => handleJSON<any>(r));
    return nServicio(raw);
  },
  async crear(input: CrearServicioInput): Promise<ServicioDTO> {
    console.log('[ServicioAPI.crear] Creando servicio:', input);
    const raw = await fetch(`${API}/Nuevo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: input.nombre?.trim(), descripcion: input.descripcion ?? null }),
    }).then(r => handleJSON<any>(r));
    console.log('[ServicioAPI.crear] Respuesta del backend:', raw);
    const servicio = nServicio(raw);
    console.log('[ServicioAPI.crear] Servicio transformado:', servicio);
    return servicio;
  },
  actualizar(id: number, input: ActualizarServicioInput) {
    return fetch(`${API}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: input.nombre?.trim(), descripcion: input.descripcion ?? null }),
    }).then(r => handleJSON<{ message: string }>(r));
  },
  eliminar(id: number) {
    return fetch(`${API}/${id}`, { method: "DELETE" }).then(r => handleJSON<{ message: string }>(r));
  },
  // src/services/servicio.service.ts
    activar(id: number, activo = true, cascada = false) {
  return fetch(
    withQuery(`${API}/${id}/activar`, { 
      activo: String(activo), 
      cascada: String(cascada) 
    }),
    { method: "PUT" }
  ).then(r => handleJSON<{ message: string; Servicio: any; Afectados: number }>(r));
}

};
