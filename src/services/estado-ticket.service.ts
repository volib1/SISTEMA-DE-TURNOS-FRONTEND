import { API_ROOT, handleJSON } from "./http";

export type EstadoTicketDTO = { id: number; nombre: string; cantidad?: number };
export type CrearEstadoTicketInput = { nombre: string };
export type ActualizarEstadoTicketInput = { nombre: string };

const API = `${API_ROOT}/estadoticket`;

function nEstado(d: any): EstadoTicketDTO {
  return {
    id: Number(d.id ?? 0),
    nombre: String(d.nombre ?? ""),
    cantidad: typeof d.Cantidad === "number" ? d.Cantidad : undefined,
  };
}

export const EstadoTicketAPI = {
  async listar(): Promise<EstadoTicketDTO[]> {
    const raw = await fetch(`${API}/Lista`).then(r => handleJSON<any[]>(r));
    return (Array.isArray(raw) ? raw : []).map(nEstado);
  },
  async obtener(id: number): Promise<{ id: number; nombre: string; tickets: { id: number; codigo: string; fechaCreacion: string }[] }> {
    const raw = await fetch(`${API}/${id}`).then(r => handleJSON<any>(r));
    return {
      id: Number(raw.id ?? 0),
      nombre: String(raw.nombre ?? ""),
      tickets: Array.isArray(raw.Tickets)
        ? raw.Tickets.map((t: any) => ({
            id: Number(t.id ?? 0),
            codigo: String(t.codigo ?? ""),
            fechaCreacion: String(t.fecha_creacion ?? ""),
          }))
        : [],
    };
  },
  async crear(input: CrearEstadoTicketInput): Promise<EstadoTicketDTO> {
    const raw = await fetch(`${API}/Nuevo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: input.nombre?.trim() }),
    }).then(r => handleJSON<any>(r));
    return nEstado(raw);
  },
  actualizar(id: number, input: ActualizarEstadoTicketInput) {
    return fetch(`${API}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: input.nombre?.trim() }),
    }).then(r => handleJSON<{ message: string }>(r));
  },
  eliminar(id: number) {
    return fetch(`${API}/${id}`, { method: "DELETE" }).then(r => handleJSON<{ message: string }>(r));
  },
  
  // Método de debugging para mostrar estados disponibles
  async mostrarEstadosDisponibles(): Promise<void> {
    try {
      console.log('[EstadoTicketAPI] 🔍 Consultando estados disponibles...');
      const estados = await this.listar();
      
      console.group('🎯 ESTADOS DE TICKET EN LA BASE DE DATOS');
      console.log(`📊 Total de estados: ${estados.length}`);
      
      if (estados.length > 0) {
        console.table(estados);
        
        estados.forEach((estado, index) => {
          console.log(`${index + 1}. 🏷️ ID: ${estado.id} | Nombre: "${estado.nombre}" | Tickets: ${estado.cantidad || 0}`);
        });
        
        // Buscar específicamente "Pendiente"
        const pendiente = estados.find(e => e.nombre.toLowerCase().includes('pendiente'));
        if (pendiente) {
          console.log('✅ Estado "Pendiente" encontrado:', pendiente);
        } else {
          console.warn('⚠️ No se encontró estado con "Pendiente" en el nombre');
          console.log('💡 Estados disponibles para usar:', estados.map(e => `"${e.nombre}"`));
        }
      } else {
        console.warn('⚠️ No hay estados en la base de datos');
      }
      
      console.groupEnd();
    } catch (error) {
      console.error('❌ Error al consultar estados:', error);
    }
  },
  
  // Buscar estado por nombre (case-insensitive)
  async buscarPorNombre(nombre: string): Promise<EstadoTicketDTO | null> {
    try {
      const estados = await this.listar();
      return estados.find(e => e.nombre.toLowerCase() === nombre.toLowerCase()) || null;
    } catch (error) {
      console.error(`❌ Error al buscar estado "${nombre}":`, error);
      return null;
    }
  }
};
