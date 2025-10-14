import { API_ROOT } from "./http";

export type KioskoServicioDTO = { id: number; nombre: string; descripcion?: string | null };
export type TicketCreadoDTO = { id: number; codigo: string; fechaCreacion: string };

const API = `${API_ROOT}/kiosko`;

async function fetchJSON<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const r = await fetch(input, init);
  const ct = r.headers.get("content-type") || "";
  const isJSON = ct.includes("application/json");
  const data = isJSON ? await r.json().catch(() => null) : await r.text().catch(() => null);

  if (!r.ok) {
    console.error(`[KioskoAPI] Error en petición:`, {
      url: input.toString(),
      status: r.status,
      statusText: r.statusText,
      headers: Object.fromEntries(r.headers.entries()),
      response: data
    });
    
    const e: any = new Error(`HTTP ${r.status} ${r.statusText}`);
    e.status = r.status;
    e.detail = data; // { error: "..."} o string
    throw e;
  }
  return data as T;
}

export const KioskoAPI = {
  async testConnection(): Promise<any> {
    const results = {
      serviciosEndpoint: { success: false, error: null as any, data: null as any },
      ticketEndpoint: { success: false, error: null as any, data: null as any }
    };

    // Probar endpoint de servicios
    try {
      console.log('[KioskoAPI] 🔍 Probando endpoint de servicios...');
      const serviciosResponse = await fetch(`${API}/servicios`);
      console.log('[KioskoAPI] 📡 Servicios - Status:', serviciosResponse.status);
      
      if (serviciosResponse.ok) {
        const serviciosData = await serviciosResponse.json();
        console.log('[KioskoAPI] ✅ Servicios OK:', serviciosData);
        results.serviciosEndpoint = { success: true, error: null, data: serviciosData };
      } else {
        const serviciosError = await serviciosResponse.text();
        console.log('[KioskoAPI] ❌ Error servicios:', serviciosError);
        results.serviciosEndpoint = { success: false, error: serviciosError, data: null };
      }
    } catch (error: any) {
      console.error('[KioskoAPI] 💥 Error de red en servicios:', error);
      results.serviciosEndpoint = { success: false, error: error?.message || 'Error desconocido', data: null };
    }

    // Probar endpoint de ticket (solo si servicios funcionó y hay servicios)
    if (results.serviciosEndpoint.success && results.serviciosEndpoint.data?.length > 0) {
      try {
        const servicioId = results.serviciosEndpoint.data[0].id;
        console.log(`[KioskoAPI] 🎫 Probando endpoint de ticket con servicio ID: ${servicioId}...`);
        
        const ticketResponse = await fetch(`${API}/ticket?idServicio=${servicioId}`, {
          method: 'POST',
          headers: { 
            Accept: "application/json",
            "Content-Type": "application/json"
          }
        });
        
        console.log('[KioskoAPI] 📡 Ticket - Status:', ticketResponse.status);
        console.log('[KioskoAPI] 📡 Ticket - Headers:', Object.fromEntries(ticketResponse.headers.entries()));
        
        if (ticketResponse.ok) {
          const ticketData = await ticketResponse.json();
          console.log('[KioskoAPI] ✅ Ticket creado OK:', ticketData);
          results.ticketEndpoint = { success: true, error: null, data: ticketData };
        } else {
          const ticketError = await ticketResponse.text();
          console.log('[KioskoAPI] ❌ Error ticket:', ticketError);
          results.ticketEndpoint = { success: false, error: `HTTP ${ticketResponse.status}: ${ticketError}`, data: null };
        }
      } catch (error: any) {
        console.error('[KioskoAPI] 💥 Error de red en ticket:', error);
        results.ticketEndpoint = { success: false, error: error?.message || 'Error desconocido', data: null };
      }
    } else {
      results.ticketEndpoint = { success: false, error: 'No se pudo probar ticket - servicios no disponibles', data: null };
    }

    console.log('[KioskoAPI] 📋 Resultado completo del diagnóstico:', results);
    return results;
  },

  async serviciosActivos(): Promise<KioskoServicioDTO[]> {
    try {
      const raw = await fetchJSON<any[]>(`${API}/servicios`, {
        headers: { Accept: "application/json" },
      });
      console.log("Servicios obtenidos:", raw);
      return (Array.isArray(raw) ? raw : []).map(d => ({
        id: Number(d.id ?? 0),
        nombre: String(d.nombre ?? ""),
        descripcion: d.descripcion ?? null,
      }));
    } catch (error) {
      console.error("Error en serviciosActivos:", error);
      throw error;
    }
  },

  async crearTicket(idServicio: number): Promise<TicketCreadoDTO> {
    try {
      const url = `${API}/ticket?idServicio=${encodeURIComponent(idServicio)}`;
      console.log(`[KioskoAPI] 🎫 Creando ticket para servicio ID: ${idServicio}`);
      console.log(`[KioskoAPI] 🌐 URL de petición: ${url}`);
      
      // Verificar primero si el servicio existe
      const servicios = await this.serviciosActivos();
      const servicioExiste = servicios.find(s => s.id === idServicio);
      console.log(`[KioskoAPI] 🔍 Servicio existe:`, servicioExiste);
      
      if (!servicioExiste) {
        throw new Error(`Servicio con ID ${idServicio} no encontrado en servicios activos`);
      }
      
      const raw = await fetchJSON<any>(url, {
        method: "POST",
        headers: { 
          Accept: "application/json",
          "Content-Type": "application/json"
        },
      });
      
      console.log(`[KioskoAPI] ✅ Ticket creado exitosamente:`, raw);
      
      return {
        id: Number(raw.id ?? 0),
        codigo: String(raw.codigo ?? ""),
        fechaCreacion: String(raw.fecha_creacion ?? raw.fechaCreacion ?? ""),
      };
    } catch (error: any) {
      console.error(`[KioskoAPI] ❌ Error al crear ticket para servicio ${idServicio}:`, {
        message: error.message,
        status: error.status,
        detail: error.detail,
        stack: error.stack
      });
      throw error;
    }
  },
};