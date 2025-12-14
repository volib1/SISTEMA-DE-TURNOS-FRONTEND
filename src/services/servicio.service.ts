import { API_ROOT, handleJSON, withQuery } from "./http";

export type ServicioDTO = {
  id: number;
  nombre: string;
  descripcion?: string | null;
  activo: boolean; // Siempre tiene valor (default: true)
  ventanillasActivas?: number;
  ventanillas?: { id: number; ventanillaId: number; ventanilla: string; activo: boolean }[];
};

export type CrearServicioInput = { nombre: string; descripcion?: string | null; activo?: boolean };
export type ActualizarServicioInput = { nombre: string; descripcion?: string | null; activo?: boolean };

const API = `${API_ROOT}/servicio`;

// Función auxiliar para convertir cualquier valor a booleano
function parseActivo(val: any): boolean | null {
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val !== 0;
  if (typeof val === "string") {
    const lower = val.toLowerCase().trim();
    if (lower === "true" || lower === "1" || lower === "activo" || lower === "si" || lower === "yes") return true;
    if (lower === "false" || lower === "0" || lower === "inactivo" || lower === "no") return false;
  }
  return null;
}

function nServicio(d: any): ServicioDTO {
  console.log('[nServicio] Datos raw del backend:', d);

  // Intentar obtener activo de múltiples campos posibles
  const activoRaw = d.activo ?? d.Activo ?? d.estado ?? d.Estado ?? d.EsActivo ?? d.esActivo ?? d.Active ?? d.active ?? d.IsActive ?? d.isActive;
  console.log('[nServicio] activoRaw encontrado:', activoRaw);

  const activoValue = parseActivo(activoRaw);
  console.log('[nServicio] activoValue parseado:', activoValue);

  // Si no se pudo parsear, default a true para nuevos, pero loguear para debug
  const finalActivo = activoValue !== null ? activoValue : true;
  console.log('[nServicio] finalActivo:', finalActivo);

  return {
    id: Number(d.id ?? d.Id ?? 0),
    nombre: String(d.nombre ?? d.Nombre ?? ""),
    descripcion: d.descripcion ?? d.Descripcion ?? null,
    activo: finalActivo,
    ventanillasActivas:
      typeof d.VentanillasActivas === "number" ? d.VentanillasActivas : undefined,
    ventanillas: Array.isArray(d.Ventanillas)
      ? d.Ventanillas.map((x: any) => ({
          id: Number(x.id ?? 0),
          ventanillaId: Number(x.VentanillaId ?? 0),
          ventanilla: String(x.Ventanilla ?? ""),
          activo: Boolean(x.activo ?? x.Activo ?? false),
        }))
      : undefined,
  };
}

export const ServicioAPI = {
  /* ------------------------------- LISTADOS ------------------------------- */
  async listar(): Promise<ServicioDTO[]> {
    const raw = await fetch(`${API}/Lista`).then((r) => handleJSON<any[]>(r));
    return (Array.isArray(raw) ? raw : []).map(nServicio);
  },

  async listarConEstado(soloActivos?: boolean): Promise<ServicioDTO[]> {
    const url = withQuery(`${API}/ListaEstado`, {
      soloActivos: soloActivos === undefined ? undefined : String(soloActivos),
    });
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error ${response.status}: ${errorText}`);
    }
    const raw = await handleJSON<any[]>(response);
    return (Array.isArray(raw) ? raw : []).map(nServicio);
  },

  async buscar(q: string): Promise<ServicioDTO[]> {
    const raw = await fetch(withQuery(`${API}/buscar`, { q })).then((r) =>
      handleJSON<any[]>(r)
    );
    return (Array.isArray(raw) ? raw : []).map(nServicio);
  },

  /* -------------------------------- CRUD --------------------------------- */
  async obtener(id: number): Promise<ServicioDTO> {
    const raw = await fetch(`${API}/${id}`).then((r) => handleJSON<any>(r));
    return nServicio(raw);
  },

  async crear(input: CrearServicioInput): Promise<ServicioDTO> {
    // Por defecto siempre activo al crear
    const activoValue = input.activo !== false;
    const raw = await fetch(`${API}/Nuevo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        Nombre: input.nombre?.trim(),
        nombre: input.nombre?.trim(),
        Descripcion: input.descripcion ?? null,
        descripcion: input.descripcion ?? null,
        // Enviar en todos los formatos posibles para compatibilidad con backend
        activo: activoValue,
        Activo: activoValue,
        Estado: activoValue ? "Activo" : "Inactivo",
        estado: activoValue ? "activo" : "inactivo",
      }),
    }).then((r) => handleJSON<any>(r));
    return nServicio(raw);
  },

  /**
   * Devuelve el servicio actualizado (si el backend no lo retorna,
   * consultamos con `obtener` para mantener la UI sincronizada).
   */
  async actualizar(id: number, input: ActualizarServicioInput): Promise<ServicioDTO> {
    // IMPORTANTE: Respetar exactamente el valor de activo que viene del formulario
    // Si es false, debe guardarse como false (inactivo)
    // Si es true, debe guardarse como true (activo)
    // Solo usar default true si no viene definido (undefined)
    const activoValue = input.activo === false ? false : (input.activo === true ? true : true);

    console.log('[ServicioAPI.actualizar] Input recibido:', { id, input });
    console.log('[ServicioAPI.actualizar] Valor activo calculado:', activoValue);

    const payload: Record<string, any> = {
      Id: id,
      id: id,
      Nombre: input.nombre?.trim(),
      nombre: input.nombre?.trim(),
      Descripcion: input.descripcion ?? null,
      descripcion: input.descripcion ?? null,
      // Enviar en todos los formatos posibles para compatibilidad con backend
      activo: activoValue,
      Activo: activoValue,
      Estado: activoValue ? "Activo" : "Inactivo",
      estado: activoValue ? "activo" : "inactivo",
      EsActivo: activoValue,
      esActivo: activoValue,
      Active: activoValue,
      active: activoValue,
      IsActive: activoValue,
      isActive: activoValue,
    };

    const bodyJson = JSON.stringify(payload);
    console.log('[ServicioAPI.actualizar] Payload a enviar:', payload);
    console.log('[ServicioAPI.actualizar] Body JSON:', bodyJson);

    const res = await fetch(`${API}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: bodyJson,
    });

    console.log('[ServicioAPI.actualizar] Response status:', res.status);

    // algunos backends devuelven el recurso, otros solo mensaje
    let body: any = null;
    try {
      body = await handleJSON<any>(res);
    } catch {
      // ignore parse error y hacemos GET abajo
    }

    if (body && typeof body === "object" && ("id" in body || "nombre" in body)) {
      return nServicio(body);
    }
    // fallback: obtener desde la API
    return this.obtener(id);
  },

  eliminar(id: number) {
    return fetch(`${API}/${id}`, { method: "DELETE" }).then((r) =>
      handleJSON<{ message: string }>(r)
    );
  },

  /* -------------------------- ESTADO (ACTIVAR/TGL) ------------------------ */
  async activar(
    id: number,
    activo = true,
    cascada = false
  ): Promise<{ message: string; servicio: ServicioDTO; afectados: number }> {
    const res = await fetch(
      withQuery(`${API}/${id}/activar`, {
        activo: String(activo),
        cascada: String(cascada),
      }),
      { method: "PUT" }
    ).then((r) =>
      handleJSON<{ message: string; Servicio?: any; servicio?: any; Afectados?: number; afectados?: number }>(r)
    );

    // Acepta mayúsculas/minúsculas en claves de respuesta
    const rawServicio = (res.servicio ?? res.Servicio) as any;
    const afectados = Number((res.afectados ?? res.Afectados) ?? 0);

    return {
      message: res.message,
      servicio: nServicio(rawServicio ?? {}),
      afectados,
    };
  },

  async cambiarEstado(id: number, activo: boolean, cascada = false) {
    return this.activar(id, activo, cascada);
  },

  /* ----------------------------- SUSCRIPCIÓN SSE -------------------------- */
  /**
   * Abre un EventSource a /servicio/stream para recibir eventos en tiempo real.
   * El backend debe emitir JSON con shape { type: string, data: any }.
   * Ejemplos de type: "servicio.creado" | "servicio.actualizado" | "servicio.eliminado".
   */
  suscribirse(
    onEvent: (evt: { type: string; data: any }) => void,
    onError?: (err: any) => void
  ): EventSource {
    const url = `${API}/stream`;
    const es = new EventSource(url, { withCredentials: true });

    es.onmessage = (msg) => {
      try {
        const payload = JSON.parse(msg.data);
        // Si no trae 'type', interpretarlo como DTO/colección y emitir como "servicio.actualizado"
        if (payload && typeof payload.type === "string") {
          onEvent(payload);
        } else if (Array.isArray(payload)) {
          onEvent({ type: "servicio.listado", data: payload });
        } else if (payload && (Array.isArray(payload.items) || Array.isArray(payload.Items))) {
          onEvent({ type: "servicio.listado", data: payload });
        } else {
          onEvent({ type: "servicio.actualizado", data: payload });
        }
      } catch (e) {
        onError?.(e);
      }
    };

    es.onerror = (e) => {
      onError?.(e);
      // EventSource reintenta automáticamente
    };

    return es;
  },
};
