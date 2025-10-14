import { API_ROOT, handleJSON } from "./http";

export type TurnoOperadorDTO = {
  id: number;
  codigo: string;
  servicio: string;
  fechaCreacion: string;
  idTicket: number;
  estado: string;
};

const API_TICKET = `${API_ROOT}/ticket`;
const API_EMPLEADO = `${API_ROOT}/Empleado`;

/**
 * Servicio para operaciones del operador en la ventanilla
 */
export const OperadorAPI = {
  /**
   * Obtiene los tickets en espera para una ventanilla específica
   * Solo retorna tickets de los servicios que la ventanilla atiende
   */
  async obtenerTicketsEnEspera(idVentanilla: number): Promise<TurnoOperadorDTO[]> {
    console.log('[OperadorAPI] 🎫 Obteniendo tickets en espera para ventanilla:', idVentanilla);
    
    try {
      // Primero obtenemos los servicios que atiende esta ventanilla
      console.log('[OperadorAPI] 📋 Paso 1: Obteniendo servicios de la ventanilla...');
      const serviciosResponse = await fetch(`${API_ROOT}/ventanillaservicio/Lista`)
        .then(r => handleJSON<any[]>(r));

      console.log('[OperadorAPI] 📋 Servicios raw (total):', serviciosResponse?.length);
      console.log('[OperadorAPI] 📋 Servicios raw completo:', JSON.stringify(serviciosResponse, null, 2));

      // Filtrar por la ventanilla específica y que estén activos
      const serviciosVentanilla = (Array.isArray(serviciosResponse) ? serviciosResponse : [])
        .filter((vs: any) => {
          const idVent = Number(vs.IdVentanilla ?? vs.idVentanilla ?? vs.id_ventanilla ?? 0);
          const activo = vs.activo !== false;
          
          console.log('[OperadorAPI] 🔍 Evaluando servicio:', {
            id: vs.id,
            idVentanilla_raw: vs.IdVentanilla,
            id_ventanilla: idVent,
            buscando_ventanilla: idVentanilla,
            activo: activo,
            match: idVent === idVentanilla && activo
          });
          
          return idVent === idVentanilla && activo;
        })
        .map((vs: any) => Number(vs.IdServicio ?? vs.idServicio ?? vs.id_servicio ?? 0))
        .filter((id: number) => id > 0);

      console.log('[OperadorAPI] ✅ Servicios que atiende esta ventanilla:', serviciosVentanilla);

      if (serviciosVentanilla.length === 0) {
        console.warn('[OperadorAPI] ⚠️ Esta ventanilla no tiene servicios asignados');
        return [];
      }

      // Obtener todos los tickets en estado "En Espera" o "Pendiente" (estado ID = 1 o 5)
      console.log('[OperadorAPI] 🎫 Paso 2: Obteniendo tickets en espera...');
      const response = await fetch(`${API_TICKET}/Lista`)
        .then(r => handleJSON<any>(r));

      console.log('[OperadorAPI] 🎫 Respuesta completa del API:', response);
      
      // El backend devuelve un objeto paginado: { page, pageSize, total, items: [] }
      const raw = response?.items ?? (Array.isArray(response) ? response : []);
      console.log('[OperadorAPI] 🎫 Total tickets obtenidos:', raw.length);
      
      // 🔍 DEBUG: Ver estructura del primer ticket
      if (raw.length > 0) {
        console.log('[OperadorAPI] 🔍 ESTRUCTURA PRIMER TICKET:', JSON.stringify(raw[0], null, 2));
      }

      // Filtrar solo los tickets de los servicios que atiende esta ventanilla
      const ticketsFiltrados = (Array.isArray(raw) ? raw : [])
        .filter((d: any) => {
          const estadoId = Number(d.Estado?.id ?? d.estado?.id ?? 0);
          const estadoNombre = String(d.Estado?.nombre ?? d.estado?.nombre ?? "").toLowerCase();
          
          // ✅ Solo tickets en estado "En Espera" (id=1) o "Pendiente" (id=5)
          // EXCLUIR explícitamente: "Llamando" (id=6), "Atendiendo" (id=3), "Atendido" (id=2), "Ausente" (id=4)
          const estadosValidos = [1, 5]; // Solo En Espera y Pendiente
          const enEspera = estadosValidos.includes(estadoId);
          
          // Verificar que sea de un servicio que atiende esta ventanilla
          const idServicio = Number(d.Servicio?.id ?? d.servicio?.id ?? 0);
          const perteneceServicio = serviciosVentanilla.includes(idServicio);
          
          // Verificar que NO tenga un turno asignado (campo turno presente)
          // ✅ Buscar en ambas variaciones: 'Turno' y 'turno'
          const turnoField = d.Turno ?? d.turno;
          const tieneTurno = turnoField !== null && turnoField !== undefined;
          const sinTurno = !tieneTurno;
          
          const esValido = enEspera && perteneceServicio && sinTurno;
          
          console.log('[OperadorAPI] 🔍 Ticket', d.codigo, '| Estado ID:', estadoId, '| Estado:', estadoNombre, '| Servicio:', idServicio, '| Tiene Turno:', tieneTurno, '| Válido:', esValido);
          
          return esValido;
        })
        .map((d: any) => ({
          id: Number(d.id ?? 0),
          codigo: String(d.codigo ?? ""),
          servicio: String(d.Servicio?.nombre ?? d.servicio?.nombre ?? ""),
          fechaCreacion: String(d.fecha_creacion ?? d.fechaCreacion ?? ""),
          idTicket: Number(d.id ?? 0),
          estado: String(d.Estado?.nombre ?? d.estado?.nombre ?? "En Espera"),
        }));

      console.log('[OperadorAPI] ✅ Tickets filtrados para esta ventanilla:', ticketsFiltrados.length);
      ticketsFiltrados.forEach(t => console.log('  -', t.codigo, '| Servicio:', t.servicio));

      return ticketsFiltrados;
    } catch (error) {
      console.error('[OperadorAPI] ❌ Error obteniendo tickets en espera:', error);
      return [];
    }
  },

  /**
   * Llama al siguiente turno en espera y lo asigna a la ventanilla
   */
  async llamarTurno(idTicket: number, idVentanilla: number, idEmpleado?: number): Promise<TurnoOperadorDTO> {
    console.log('[OperadorAPI] 📞 Llamando turno:', { idTicket, idVentanilla, idEmpleado });
    
    try {
      // Usar el endpoint específico del backend que maneja todo el flujo
      console.log('[OperadorAPI] 📝 Usando endpoint: POST /api/Empleado/ticket/{ticketId}/llamar');
      
      // El backend requiere empleadoId
      if (!idEmpleado) {
        throw new Error('Se requiere el ID del empleado para llamar un turno');
      }
      
      // ✅ El backend espera empleadoId como query parameter [FromQuery], NO en el body
      console.log('[OperadorAPI] 📤 Enviando: empleadoId =', idEmpleado);
      
      const response = await fetch(`${API_EMPLEADO}/ticket/${idTicket}/llamar?empleadoId=${idEmpleado}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}), // Body vacío
      });

      console.log('[OperadorAPI] Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[OperadorAPI] ❌ Error del backend:', errorText);
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.error || errorJson.message || 'Error al llamar turno');
        } catch (e) {
          throw new Error('Error al llamar turno');
        }
      }
      
      const result = await handleJSON<any>(response);
      console.log('[OperadorAPI] ✅ Respuesta del backend:', result);

      // Obtener datos actualizados del ticket
      console.log('[OperadorAPI] 🔄 Obteniendo datos actualizados del ticket...');
      const ticketRaw = await fetch(`${API_TICKET}/${idTicket}`)
        .then(r => handleJSON<any>(r));

      console.log('[OperadorAPI] Ticket actualizado:', ticketRaw);

      // Extraer ID del turno de la respuesta
      const idTurno = Number(result.turno?.id ?? result.id ?? ticketRaw.turno?.id ?? 0);

      return {
        id: idTurno,
        codigo: String(ticketRaw.codigo ?? ""),
        servicio: String(ticketRaw.Servicio?.nombre ?? ticketRaw.servicio?.nombre ?? ""),
        fechaCreacion: String(ticketRaw.fecha_creacion ?? ticketRaw.fechaCreacion ?? ""),
        idTicket: Number(idTicket),
        estado: "Llamando",
      };
    } catch (error) {
      console.error('[OperadorAPI] Error llamando turno:', error);
      throw error;
    }
  },

  /**
   * Marca el turno actual como atendido
   */
  async finalizarAtencion(idTurno: number, idTicket: number, idEmpleado: number): Promise<void> {
    console.log('[OperadorAPI] Finalizando atención:', { idTurno, idTicket, idEmpleado });
    
    if (!idEmpleado) {
      throw new Error('Se requiere el ID del empleado para finalizar atención');
    }
    
    try {
      // ✅ Usar endpoint del backend: POST /api/empleado/ticket/{ticketId}/estado?empleadoId=#&nuevoEstado=Atendido
      const response = await fetch(
        `${API_EMPLEADO}/ticket/${idTicket}/estado?empleadoId=${idEmpleado}&nuevoEstado=Atendido`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[OperadorAPI] ❌ Error del backend:', errorText);
        throw new Error('Error al finalizar atención');
      }

      const result = await handleJSON<any>(response);
      console.log('[OperadorAPI] ✅ Atención finalizada:', result);
    } catch (error) {
      console.error('[OperadorAPI] Error finalizando atención:', error);
      throw error;
    }
  },

  /**
   * Vuelve a llamar el turno actual (cambia estado a "Llamando" nuevamente)
   * Estrategia: Cambiar temporalmente a "Pendiente" y luego de vuelta a "Llamando"
   * para que la pantalla lo detecte como un nuevo llamado
   */
  async volverALlamar(idTicket: number, idEmpleado: number): Promise<void> {
    console.log('[OperadorAPI] 🔔 Volviendo a llamar ticket:', { idTicket, idEmpleado });
    
    if (!idEmpleado) {
      throw new Error('Se requiere el ID del empleado para volver a llamar');
    }
    
    try {
      // Paso 1: Cambiar temporalmente a "Pendiente" para resetear la detección
      console.log('[OperadorAPI] 📝 Paso 1: Cambiando a Pendiente temporalmente...');
      await fetch(
        `${API_EMPLEADO}/ticket/${idTicket}/estado?empleadoId=${idEmpleado}&nuevoEstado=Pendiente`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );

      // Pequeña pausa para asegurar que el cambio se procese
      await new Promise(resolve => setTimeout(resolve, 300));

      // Paso 2: Volver a "Llamando" - la pantalla lo detectará como nuevo
      console.log('[OperadorAPI] 📢 Paso 2: Volviendo a estado Llamando...');
      const response = await fetch(
        `${API_EMPLEADO}/ticket/${idTicket}/estado?empleadoId=${idEmpleado}&nuevoEstado=Llamando`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[OperadorAPI] ❌ Error del backend:', errorText);
        throw new Error('Error al volver a llamar');
      }

      const result = await handleJSON<any>(response);
      console.log('[OperadorAPI] ✅ Ticket vuelto a llamar:', result);
    } catch (error) {
      console.error('[OperadorAPI] ❌ Error volviendo a llamar:', error);
      throw error;
    }
  },

  /**
   * Obtiene el turno actual en estado "Llamando" para una ventanilla
   */
  async obtenerTurnoActual(idVentanilla: number): Promise<TurnoOperadorDTO | null> {
    console.log('[OperadorAPI] 📋 Obteniendo turno actual para ventanilla:', idVentanilla);
    
    try {
      // Buscar tickets en estado "Llamando" (id=6) que tengan un turno asignado a esta ventanilla
      const response = await fetch(`${API_TICKET}/Lista?idEstado=6`)
        .then(r => handleJSON<any>(r));

      console.log('[OperadorAPI] 📋 Response completa:', response);

      // El backend devuelve un objeto paginado: { page, pageSize, total, items: [] }
      const tickets = response?.items ?? [];
      
      console.log('[OperadorAPI] 📋 Total tickets en estado Llamando:', tickets.length);

      // Filtrar por ventanilla
      const turnoActual = tickets.find((d: any) => {
        // Buscar el campo turno (minúsculas)
        const turnoField = d.Turno ?? d.turno;
        const ventanillaId = Number(turnoField?.id_ventanilla ?? turnoField?.idVentanilla ?? 0);
        const esDeVentanilla = ventanillaId === idVentanilla;
        
        console.log('[OperadorAPI] 🔍 Ticket:', d.codigo, '| Ventanilla del turno:', ventanillaId, '| Buscando:', idVentanilla, '| Match:', esDeVentanilla);
        
        return esDeVentanilla;
      });

      if (!turnoActual) {
        console.log('[OperadorAPI] ✅ No hay turno actual');
        return null;
      }

      console.log('[OperadorAPI] ✅ Turno actual encontrado:', turnoActual.codigo);

      // Obtener el turno field
      const turnoField = turnoActual.Turno ?? turnoActual.turno;

      return {
        id: Number(turnoField?.id ?? 0),
        codigo: String(turnoActual.codigo ?? ""),
        servicio: String(turnoActual.Servicio?.nombre ?? turnoActual.servicio?.nombre ?? ""),
        fechaCreacion: String(turnoActual.fecha_creacion ?? turnoActual.fechaCreacion ?? ""),
        idTicket: Number(turnoActual.id ?? 0),
        estado: "Llamando",
      };
    } catch (error) {
      console.error('[OperadorAPI] ❌ Error obteniendo turno actual:', error);
      return null;
    }
  },
};
