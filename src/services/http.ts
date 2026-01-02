import { appsettings } from "../settings/appsettings";

export function normalizeRoot(rootFromEnv?: string | null, fallback?: string | null) {
  let root = (rootFromEnv ?? "").trim() || (fallback ?? "").trim();
  if (!root) {
    console.warn("[API] VITE_API_BASE_URL y appsettings.apiUrl vacíos; usando origin");
    root = window.location.origin;
  }
  root = root.replace(/\/+$/, "");
  if (!/\/api$/i.test(root)) root = `${root}/api`;
  return root;
}

export const API_ROOT = normalizeRoot(import.meta.env.VITE_API_BASE_URL as string, appsettings.apiUrl);

// URL base del servidor (sin /api) para archivos estáticos
export const SERVER_ROOT = API_ROOT.replace(/\/api$/i, '');

// Helper para construir URLs de archivos multimedia
export function getMediaUrl(relativePath: string): string {
  if (!relativePath) return '';
  // Si ya es una URL absoluta, devolverla tal cual
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }
  // Si es una ruta relativa, agregar la URL base del servidor
  return `${SERVER_ROOT}${relativePath.startsWith('/') ? '' : '/'}${relativePath}`;
}

export async function handleJSON<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const data = await res.json();
      if ((data as any)?.error || (data as any)?.message) {
        msg = (data as any).error || (data as any).message;
      } else if ((data as any)?.errors && typeof (data as any).errors === "object") {
        const entries = Object.entries((data as any).errors as Record<string, string[]>);
        if (entries.length) {
          const [field, msgs] = entries[0];
          msg = `${field}: ${Array.isArray(msgs) ? msgs[0] : String(msgs)}`;
        }
      } else {
        msg = JSON.stringify(data);
      }
    } catch {
      try {
        const text = await res.text();
        if (text) msg = text;
      } catch {}
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

export function withQuery(base: string, params?: Record<string, string | number | undefined | null>) {
  const u = base.startsWith("http")
    ? new URL(base)
    : new URL(base.replace(/^\/+/, ""), API_ROOT + "/");
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
    });
  }
  return u.toString();
}
