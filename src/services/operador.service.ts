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
          // El backend devuelve idVentanilla (camelCase)
          const idVent = Number(vs.idVentanilla ?? 0);
          const activo = vs.activo !== false;
          
          console.log('[OperadorAPI] 🔍 Evaluando servicio:', {
            id: vs.id,
            idVentanilla: vs.idVentanilla,
            idServicio: vs.idServicio,
            ventanilla: vs.ventanilla,
            servicio: vs.servicio,
            activo: vs.activo,
            idVent_parsed: idVent,
            buscando_ventanilla: idVentanilla,
            match: idVent === idVentanilla && activo
          });
          
          return idVent === idVentanilla && activo;
        })
        .map((vs: any) => Number(vs.idServicio ?? 0))
        .filter((id: number) => id > 0);

      console.log('[OperadorAPI] ✅ Servicios que atiende esta ventanilla:', serviciosVentanilla);
      console.log('[OperadorAPI] 📊 IDs de servicios:', serviciosVentanilla);

      if (serviciosVentanilla.length === 0) {
        console.error('[OperadorAPI] ❌ ERROR: La ventanilla', idVentanilla, 'NO tiene servicios asignados');
        console.error('[OperadorAPI] 📌 SOLUCIÓN: Ve a /admin → Asignar Ventanillas y asigna servicios a esta ventanilla');
        return [];
      }

      // Obtener todos los tickets en estado "En Espera" o "Pendiente" (estado ID = 1 o 5)
      console.log('[OperadorAPI] 🎫 Paso 2: Obteniendo TODOS los tickets...');
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
      console.log('[OperadorAPI] 🔍 INICIANDO FILTRADO DE TICKETS...');
      console.log('[OperadorAPI] 🔍 Servicios permitidos para ventanilla', idVentanilla, ':', serviciosVentanilla);

      const ticketsFiltrados = (Array.isArray(raw) ? raw : [])
        .filter((d: any) => {
          const estadoId = Number(d.Estado?.id ?? d.estado?.id ?? 0);
          const estadoNombre = String(d.Estado?.nombre ?? d.estado?.nombre ?? "").toLowerCase().trim();

          // ✅ Filtrar por NOMBRE de estado (más flexible que por ID)
          // Estados válidos para mostrar en la cola de espera
          const nombresEstadosValidos = ['pendiente', 'en espera', 'espera'];
          const enEspera = nombresEstadosValidos.some(nombre => estadoNombre.includes(nombre));

          // Verificar que sea de un servicio que atiende esta ventanilla
          const idServicio = Number(d.Servicio?.id ?? d.servicio?.id ?? 0);
          const perteneceServicio = serviciosVentanilla.includes(idServicio);

          // ✅ Verificar turno y asignación a ventanilla
          const turnoField = d.Turno ?? d.turno;
          const tieneTurno = turnoField !== null && turnoField !== undefined;

          // Si tiene turno, obtener la ventanilla asignada
          const ventanillaTurno = Number(turnoField?.id_ventanilla ?? turnoField?.idVentanilla ?? 0);
          const horaFin = turnoField?.hora_fin ?? turnoField?.horaFin;
          const turnoFinalizado = tieneTurno && horaFin !== null && horaFin !== undefined;

          // ✅ LÓGICA CLAVE: El ticket es válido para ESTA ventanilla si:
          // 1. Está en espera/pendiente
          // 2. Pertenece a un servicio de esta ventanilla
          // 3. Y ADEMÁS:
          //    a) NO tiene turno (ticket sin asignar), O
          //    b) Tiene turno asignado A ESTA MISMA VENTANILLA (y no finalizado), O
          //    c) Tiene turno pero ya fue finalizado (puede ser reasignado)

          let esParaEstaVentanilla = false;

          if (!tieneTurno) {
            // Sin turno = disponible para cualquier ventanilla con el servicio
            esParaEstaVentanilla = true;
          } else if (turnoFinalizado) {
            // Turno finalizado = puede ser reasignado
            esParaEstaVentanilla = true;
          } else if (ventanillaTurno === idVentanilla) {
            // Turno activo asignado a ESTA ventanilla
            esParaEstaVentanilla = true;
          } else {
            // Turno activo asignado a OTRA ventanilla = NO mostrar aquí
            esParaEstaVentanilla = false;
          }

          const esValido = enEspera && perteneceServicio && esParaEstaVentanilla;

          console.log('[OperadorAPI] 🔍 Evaluando Ticket:', {
            codigo: d.codigo,
            estadoNombre,
            idServicio,
            enEspera,
            perteneceServicio,
            tieneTurno,
            ventanillaTurno,
            turnoFinalizado,
            esParaEstaVentanilla,
            '✅ VÁLIDO': esValido
          });

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
