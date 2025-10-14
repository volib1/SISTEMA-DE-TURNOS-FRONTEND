import { API_ROOT, handleJSON } from "./http";

export type AsignacionVentanillaDTO = {
  id: number;
  empleado: { id: number; nombre: string; correo?: string };
  ventanilla: { id: number; nombre: string };
  fechaInicio: string;
  fechaFin: string | null;
};

export type CrearAsignacionInput = { 
  idVentanilla: number; 
  idEmpleado: number;
  // Campos opcionales solo para contexto en el frontend, no se envían al backend
  empleado?: { id: number; nombre: string; correo?: string };
  ventanilla?: { id: number; nombre: string };
  // IDs de servicios a asignar a la ventanilla
  servicios?: number[];
};

const API = `${API_ROOT}/AsignacionVentanilla`;

function nAsign(d: any): AsignacionVentanillaDTO {
  console.log('[nAsign] Transformando dato del backend:', JSON.stringify(d, null, 2));
  console.log('[nAsign] Propiedades disponibles:', Object.keys(d));
  console.log('[nAsign] d.Ventanilla:', d.Ventanilla);
  console.log('[nAsign] d.id_ventanilla:', d.id_ventanilla);
  console.log('[nAsign] d.Empleado:', d.Empleado);
  console.log('[nAsign] d.id_empleado:', d.id_empleado);
  
  const resultado = {
    id: Number(d.id ?? 0),
    empleado: {
      id: Number(d.empleado?.id ?? d.Empleado?.id ?? d.id_empleado ?? 0),
      nombre: String(d.empleado?.nombre ?? d.Empleado?.nombre ?? d.empleado_nombre ?? ""),
      correo: d.empleado?.correo ?? d.Empleado?.correo ?? d.empleado_correo ?? undefined,
    },
    ventanilla: {
      id: Number(d.ventanilla?.id ?? d.Ventanilla?.id ?? d.id_ventanilla ?? 0),
      nombre: String(d.ventanilla?.nombre ?? d.Ventanilla?.nombre ?? d.ventanilla_nombre ?? ""),
    },
    fechaInicio: String(d.fecha_inicio ?? d.fechaInicio ?? ""),
    fechaFin: (d.fecha_fin ?? d.fechaFin ?? null) as string | null,
  };
  
  console.log('[nAsign] Resultado transformado:', JSON.stringify(resultado, null, 2));
  return resultado;
}

export const AsignacionVentanillaAPI = {
  async listar(): Promise<AsignacionVentanillaDTO[]> {
    console.log('[AsignacionVentanillaAPI] Solicitando lista de asignaciones...');
    const raw = await fetch(`${API}/Lista`).then(r => handleJSON<any[]>(r));
    console.log('[AsignacionVentanillaAPI] Respuesta del backend:', raw);
    console.log('[AsignacionVentanillaAPI] Es array?:', Array.isArray(raw));
    console.log('[AsignacionVentanillaAPI] Cantidad de elementos:', raw?.length);
    
    const resultado = (Array.isArray(raw) ? raw : []).map(nAsign);
    console.log('[AsignacionVentanillaAPI] Resultado final:', resultado);
    return resultado;
  },
  async activas(): Promise<Omit<AsignacionVentanillaDTO, "fechaFin">[]> {
    const raw = await fetch(`${API}/activas`).then(r => handleJSON<any[]>(r));
    return (Array.isArray(raw) ? raw : []).map((d: any) => ({
      id: Number(d.id ?? 0),
      empleado: { id: Number(d.Empleado?.id ?? 0), nombre: String(d.Empleado?.nombre ?? "") },
      ventanilla: { id: Number(d.Ventanilla?.id ?? 0), nombre: String(d.Ventanilla?.nombre ?? "") },
      fechaInicio: String(d.fecha_inicio ?? ""),
    }));
  },
  async crear(input: CrearAsignacionInput) {
    // Payload EXACTO según el modelo - solo los campos de la entidad
    const payload = { 
      id_ventanilla: input.idVentanilla,
      id_empleado: input.idEmpleado
      // Las navegaciones las resuelve automáticamente Entity Framework
      // NO enviamos fecha_inicio ni fecha_fin - el controller los asigna
    };
    
    console.log('[AsignacionVentanillaAPI] URL:', `${API}/Nuevo`);
    console.log('[AsignacionVentanillaAPI] Payload según modelo asignacion_ventanilla:', JSON.stringify(payload, null, 2));
    
    try {
      const response = await fetch(`${API}/Nuevo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        console.error('[AsignacionVentanillaAPI] Response status:', response.status);
        
        const contentType = response.headers.get('content-type');
        let errorMessage = `Error ${response.status}`;
        
        try {
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            console.error('[AsignacionVentanillaAPI] Error del backend:', JSON.stringify(errorData, null, 2));
            errorMessage = JSON.stringify(errorData);
          } else {
            const errorText = await response.text();
            console.error('[AsignacionVentanillaAPI] Error texto:', errorText);
            errorMessage = errorText;
          }
        } catch (parseError) {
          console.error('[AsignacionVentanillaAPI] Error al parsear respuesta:', parseError);
          errorMessage = `Error ${response.status}: No se pudo leer la respuesta`;
        }
        
        throw new Error(errorMessage);
      }
      
      return await response.json();
    } catch (error) {
      console.error('[AsignacionVentanillaAPI] Error completo:', error);
      throw error;
    }
  },
  async cerrar(id: number): Promise<{ message: string }> {
    console.log('[AsignacionVentanillaAPI] Cerrando asignación ID:', id);
    
    try {
      // Usar el endpoint correcto: POST /AsignacionVentanilla/Cerrar/{id}
      const url = `${API}/Cerrar/${id}`;
      console.log('[AsignacionVentanillaAPI] URL de cierre:', url);
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('[AsignacionVentanillaAPI] Status respuesta:', response.status);
      
      if (!response.ok) {
        let errorDetail = 'Error desconocido';
        try {
          const errorText = await response.text();
          console.error('[AsignacionVentanillaAPI] Respuesta completa del error:', {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            body: errorText
          });
          
          // Intentar parsear como JSON si es posible
          try {
            const errorJson = JSON.parse(errorText);
            errorDetail = errorJson.error || errorJson.message || errorText;
            console.error('[AsignacionVentanillaAPI] Error parseado como JSON:', errorJson);
          } catch {
            errorDetail = errorText;
            console.error('[AsignacionVentanillaAPI] Error como texto plano:', errorText);
          }
        } catch (readError) {
          console.error('[AsignacionVentanillaAPI] No se pudo leer el cuerpo del error:', readError);
        }
        
        throw new Error(`Error ${response.status}: ${errorDetail}`);
      }
      
      const result = await handleJSON<{ message: string }>(response);
      console.log('[AsignacionVentanillaAPI] ✅ Asignación cerrada exitosamente');
      return result;
      
    } catch (error: any) {
      console.error('[AsignacionVentanillaAPI] Error al cerrar asignación:', error);
      throw error;
    }
  },

  // Verificar si una ventanilla tiene asignaciones
  async tieneAsignaciones(idVentanilla: number): Promise<{ tiene: boolean; cantidad: number; activas: number }> {
    try {
      console.log('[AsignacionVentanillaAPI] Verificando asignaciones para ventanilla ID:', idVentanilla);
      const asignaciones = await this.listar();
      
      const asignacionesVentanilla = asignaciones.filter((a: AsignacionVentanillaDTO) => a.ventanilla.id === idVentanilla);
      const asignacionesActivas = asignacionesVentanilla.filter((a: AsignacionVentanillaDTO) => !a.fechaFin);
      
      const resultado = {
        tiene: asignacionesVentanilla.length > 0,
        cantidad: asignacionesVentanilla.length,
        activas: asignacionesActivas.length
      };
      
      console.log('[AsignacionVentanillaAPI] Resultado verificación:', resultado);
      return resultado;
    } catch (error) {
      console.error('[AsignacionVentanillaAPI] Error verificando asignaciones:', error);
      return { tiene: false, cantidad: 0, activas: 0 };
    }
  },

  // Método de prueba para verificar conectividad
  async test(): Promise<boolean> {
    try {
      console.log('[AsignacionVentanillaAPI] Probando conectividad con:', `${API}/Lista`);
      const response = await fetch(`${API}/Lista`);
      console.log('[AsignacionVentanillaAPI] Status de respuesta:', response.status);
      console.log('[AsignacionVentanillaAPI] Headers de respuesta:', Object.fromEntries(response.headers.entries()));
      return response.ok;
    } catch (error) {
      console.error('[AsignacionVentanillaAPI] Error de conectividad:', error);
      return false;
    }
  }
};
