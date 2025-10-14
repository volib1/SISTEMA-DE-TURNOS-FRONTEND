import { API_ROOT, handleJSON } from "./http";

export type VentanillaDTO = {
  id: number;
  nombre: string;
  activa: boolean;
  serviciosActivos?: number;
  turnosHoy?: number;
  asignacionActual?: {
    id: number;
    empleado: { id: number; nombre: string };
    fechaInicio: string;
  } | null;
  servicios?: { id: number; servicioId: number; servicio: string; activo: boolean }[];
};

export type CrearVentanillaInput = { nombre: string; activa?: boolean };
export type ActualizarVentanillaInput = { nombre: string; activa: boolean };

const API = `${API_ROOT}/ventanilla`;

function nVentanilla(d: any): VentanillaDTO {
  console.log('[VentanillaService] 🔍 Parseando ventanilla:', d);
  
  // Manejar diferentes formatos del campo activa
  let activa = false;
  if (d.activa !== undefined) {
    activa = Boolean(d.activa);
  } else if (d.Activa !== undefined) {
    activa = Boolean(d.Activa);
  } else if (d.ACTIVA !== undefined) {
    activa = Boolean(d.ACTIVA);
  }
  
  console.log('[VentanillaService] ✅ Campo activa procesado:', { original: d.activa || d.Activa || d.ACTIVA, procesado: activa });
  
  return {
    id: Number(d.id ?? 0),
    nombre: String(d.nombre ?? ""),
    activa: activa,
    serviciosActivos: typeof d.ServiciosActivos === "number" ? d.ServiciosActivos : undefined,
    turnosHoy: typeof d.TurnosHoy === "number" ? d.TurnosHoy : undefined,
    asignacionActual: d.AsignacionActual
      ? {
          id: Number(d.AsignacionActual.id ?? 0),
          empleado: {
            id: Number(d.AsignacionActual.Empleado?.id ?? 0),
            nombre: String(d.AsignacionActual.Empleado?.nombre ?? ""),
          },
          fechaInicio: String(d.AsignacionActual.fecha_inicio ?? d.AsignacionActual.fechaInicio ?? ""),
        }
      : null,
    servicios: Array.isArray(d.Servicios)
      ? d.Servicios.map((x: any) => ({
          id: Number(x.id ?? 0),
          servicioId: Number(x.ServicioId ?? 0),
          servicio: String(x.Servicio ?? ""),
          activo: Boolean(x.activo ?? false),
        }))
      : undefined,
  };
}

export const VentanillaAPI = {
  async listar(): Promise<VentanillaDTO[]> {
    const raw = await fetch(`${API}/Lista`).then(r => handleJSON<any[]>(r));
    return (Array.isArray(raw) ? raw : []).map(nVentanilla);
  },
  async obtener(id: number): Promise<VentanillaDTO> {
    const raw = await fetch(`${API}/${id}`).then(r => handleJSON<any>(r));
    return nVentanilla(raw);
  },
  async crear(input: CrearVentanillaInput): Promise<VentanillaDTO> {
    const raw = await fetch(`${API}/Nuevo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: input.nombre?.trim(), activa: input.activa ?? true }),
    }).then(r => handleJSON<any>(r));
    return nVentanilla(raw);
  },
  actualizar(id: number, input: ActualizarVentanillaInput) {
    return fetch(`${API}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: input.nombre?.trim(), activa: input.activa }),
    }).then(r => handleJSON<{ message: string }>(r));
  },
  async eliminar(id: number) {
    console.log('[VentanillaAPI] Eliminando ventanilla ID:', id);
    console.log('[VentanillaAPI] URL:', `${API}/${id}`);
    
    try {
      const response = await fetch(`${API}/${id}`, { method: "DELETE" });
      console.log('[VentanillaAPI] Status respuesta:', response.status);
      console.log('[VentanillaAPI] Status text:', response.statusText);
      
      if (!response.ok) {
        console.error('[VentanillaAPI] Respuesta no OK, obteniendo detalles del error...');
        
        let errorMessage = `Error ${response.status}`;
        try {
          const errorText = await response.text();
          console.error('[VentanillaAPI] Cuerpo del error:', errorText);
          
          // Intentar parsear como JSON
          try {
            const errorJson = JSON.parse(errorText);
            console.error('[VentanillaAPI] Error JSON:', errorJson);
            errorMessage = errorJson.error || errorJson.message || errorText || errorMessage;
          } catch {
            errorMessage = errorText || errorMessage;
          }
        } catch (readError) {
          console.error('[VentanillaAPI] No se pudo leer el error:', readError);
        }
        
        throw new Error(errorMessage);
      }
      
      const result = await handleJSON<{ message: string }>(response);
      console.log('[VentanillaAPI] ✅ Eliminación exitosa:', result);
      return result;
      
    } catch (error: any) {
      console.error('[VentanillaAPI] Error en eliminación:', error);
      throw error;
    }
  },
};
