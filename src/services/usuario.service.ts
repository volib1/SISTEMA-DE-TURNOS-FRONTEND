import { API_ROOT, withQuery } from "./http";

export type UsuarioDTO = {
  id: number;
  nombre: string;
  correo: string;
  activo: boolean;
  rol?: { id: number; nombre: string };
  asignacionVentanilla?: {
    id: number;
    idVentanilla: number;
    ventanilla: string;
    fechaInicio: string | null;
    fechaFin: string | null;
  } | null;
};

export type CrearUsuarioInput = {
  nombre: string;
  correo: string;
  passwordHash: string; 
  idRol?: number;       
};

export type ActualizarUsuarioInput = {
  nombre: string;
  correo: string;
  passwordHash?: string;
  idRol?: number | null; 
};

const API = `${API_ROOT}/usuario`;

/** Normaliza un registro del backend a UsuarioDTO */
function nUsuario(d: any): UsuarioDTO {
  const rolData = d.Rol || d.rol;

  return {
    id: Number(d.id ?? 0),
    nombre: String(d.nombre ?? ""),
    correo: String(d.correo ?? ""),
    activo: Boolean(d.activo ?? false),
    rol:
      rolData && rolData.id
        ? {
            id: Number(rolData.id),
            nombre: String(rolData.nombre),
          }
        : undefined,
    asignacionVentanilla: d.AsignacionVentanilla
      ? {
          id: Number(d.AsignacionVentanilla.id ?? 0),
          idVentanilla: Number(
            d.AsignacionVentanilla.id_ventanilla ??
              d.AsignacionVentanilla.idVentanilla ??
              0
          ),
          ventanilla: String(d.AsignacionVentanilla.Ventanilla ?? ""),
          fechaInicio: (d.AsignacionVentanilla.fecha_inicio ?? null) as
            | string
            | null,
          fechaFin: (d.AsignacionVentanilla.fecha_fin ?? null) as
            | string
            | null,
        }
      : null,
  };
}

/** QS booleana como true/false */
function boolToQS(v: boolean) {
  return v ? "true" : "false";
}

/** fetch + manejo de errores con detalle (JSON o texto) */
async function fetchJSON<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const r = await fetch(input, init);
  const contentType = r.headers.get("content-type") || "";
  const isJSON = contentType.includes("application/json");
  if (!r.ok) {
    let detail: any = null;
    try {
      detail = isJSON ? await r.json() : await r.text();
    } catch {}
    const err: any = new Error(`HTTP ${r.status} ${r.statusText}`);
    err.status = r.status;
    err.detail = detail;
    err.url =
      (typeof input === "string"
        ? input
        : (input as any).toString?.()) ?? "";
    throw err;
  }
  return (isJSON ? await r.json() : ((await r.text()) as any)) as T;
}

/** Payloads EXACTOS que pide tu API */
function toPayloadCrear(x: CrearUsuarioInput) {
  const payload: any = {
    nombre: x.nombre?.trim(),
    correo: x.correo?.trim(),
    password_hash: x.passwordHash,
  };
  if (x.idRol !== undefined && x.idRol !== null) payload.id_rol = x.idRol;
  return payload;
}

export const UsuarioAPI = {
  async listar(incluirInactivos = false): Promise<UsuarioDTO[]> {
    const url = withQuery(`${API}/Lista`, {
      incluirInactivos: boolToQS(incluirInactivos),
    });
    const raw = await fetchJSON<any[]>(url);
    return (Array.isArray(raw) ? raw : []).map(nUsuario);
  },

  async buscar(q: string, incluirInactivos = false): Promise<UsuarioDTO[]> {
    const url = withQuery(`${API}/buscar`, {
      q,
      incluirInactivos: boolToQS(incluirInactivos),
    });
    const raw = await fetchJSON<any[]>(url);
    return (Array.isArray(raw) ? raw : []).map(nUsuario);
  },

  async obtener(id: number): Promise<UsuarioDTO> {
    const url = `${API}/${id}`;
    const raw = await fetchJSON<any>(url);
    return nUsuario(raw);
  },

  async crear(input: CrearUsuarioInput): Promise<UsuarioDTO> {
    const url = `${API}/Nuevo`;
    const payload = toPayloadCrear(input);
    const raw = await fetchJSON<any>(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    return nUsuario(raw);
  },

  async actualizar(
    id: number,
    input: ActualizarUsuarioInput
  ): Promise<{ message: string }> {
    const url = `${API}/${id}`;

    const nombre = (input.nombre ?? "").trim();
    const correo = (input.correo ?? "").trim();

    if (!nombre) throw new Error("El nombre es requerido.");
    if (!correo) throw new Error("El correo es requerido.");

    const payload: any = { nombre, correo };

    // Incluir contraseña solo si se proporciona
    if (
      typeof input.passwordHash === "string" &&
      input.passwordHash.trim() !== ""
    ) {
      payload.password_hash = input.passwordHash.trim();
    }

    // Incluir id_rol cuando esté definido (puede ser null para “Sin rol”)
    if (input.idRol !== undefined) {
      payload.id_rol = input.idRol;
    }

    const raw = await fetchJSON<{ message: string }>(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });

    return raw;
  },

  deshabilitar(id: number) {
    const url = `${API}/${id}/deshabilitar`;
    return fetchJSON<{ message: string }>(url, {
      method: "PATCH",
      headers: { Accept: "application/json" },
    });
  },

  habilitar(id: number) {
    const url = `${API}/${id}/habilitar`;
    return fetchJSON<{ message: string }>(url, {
      method: "PATCH",
      headers: { Accept: "application/json" },
    });
  },

  eliminar(id: number) {
    const url = `${API}/${id}`;
    return fetchJSON<{ message: string }>(url, {
      method: "DELETE",
      headers: { Accept: "application/json" },
    });
  },
};
