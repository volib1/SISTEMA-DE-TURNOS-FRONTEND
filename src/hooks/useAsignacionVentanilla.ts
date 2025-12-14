import { useState, useEffect, useCallback } from 'react';
import { AsignacionVentanillaAPI, type AsignacionVentanillaDTO, type CrearAsignacionInput } from '../services/asignacion-ventanilla.service';
import { VentanillaAPI, type VentanillaDTO } from '../services/ventanilla.service';
import { UsuarioAPI, type UsuarioDTO } from '../services/usuario.service';
import { ServicioAPI, type ServicioDTO } from '../services/servicio.service';
import { VentanillaServicioAPI } from '../services/ventanilla-servicio.service';

// Mock data para desarrollo
const MOCK_EMPLEADOS = [
  { id: 1, nombre: 'Juan Pérez', correo: 'juan@empresa.com', rol: 'Empleado', activo: true, passwordHash: 'mock_hash_1', id_rol: 2, rolData: { id: 2, nombre: 'Empleado' } },
  { id: 2, nombre: 'María González', correo: 'maria@empresa.com', rol: 'Empleado', activo: true, passwordHash: 'mock_hash_2', id_rol: 2, rolData: { id: 2, nombre: 'Empleado' } },
  { id: 3, nombre: 'Carlos Silva', correo: 'carlos@empresa.com', rol: 'Supervisor', activo: true, passwordHash: 'mock_hash_3', id_rol: 3, rolData: { id: 3, nombre: 'Supervisor' } },
  { id: 4, nombre: 'Ana López', correo: 'ana@empresa.com', rol: 'Empleado', activo: false, passwordHash: 'mock_hash_4', id_rol: 2, rolData: { id: 2, nombre: 'Empleado' } },
  { id: 5, nombre: 'Roberto Díaz', correo: 'roberto@empresa.com', rol: 'Empleado', activo: true, passwordHash: 'mock_hash_5', id_rol: 2, rolData: { id: 2, nombre: 'Empleado' } },
];



const MOCK_ASIGNACIONES: AsignacionVentanillaDTO[] = [
  {
    id: 1,
    empleado: { id: 1, nombre: 'Juan Pérez', correo: 'juan@empresa.com' },
    ventanilla: { id: 1, nombre: 'Ventanilla 1' },
    fechaInicio: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    fechaFin: null
  },
  {
    id: 2,
    empleado: { id: 2, nombre: 'María González', correo: 'maria@empresa.com' },
    ventanilla: { id: 3, nombre: 'Ventanilla 3' },
    fechaInicio: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    fechaFin: null
  }
];

// Configuración
const USE_MOCK_DATA = false; // Usar datos reales de la base de datos

// Función para convertir UsuarioDTO a EmpleadoBasico
const usuarioToEmpleado = (usuario: UsuarioDTO): EmpleadoBasico => ({
  id: usuario.id,
  nombre: usuario.nombre,
  correo: usuario.correo || undefined, // Asegurar que sea string o undefined
  rol: usuario.rol?.nombre || 'Empleado',
  activo: usuario.activo,
  passwordHash: 'user_hash_placeholder', // Placeholder para usuarios existentes
  id_rol: usuario.rol?.id || 2,
  rolData: usuario.rol ? { id: usuario.rol.id, nombre: usuario.rol.nombre } : { id: 2, nombre: 'Empleado' }
});

// Función para convertir ServicioDTO a ServicioBasico
const servicioToBasico = (servicio: ServicioDTO): ServicioBasico => ({
  id: servicio.id,
  nombre: servicio.nombre,
  codigo: servicio.nombre.substring(0, 3).toUpperCase(), // Generar código basado en el nombre
  activo: servicio.activo ?? true,
  tiempoPromedio: 15 // Valor por defecto, podría venir de la base de datos
});

export type EmpleadoBasico = {
  id: number;
  nombre: string;
  correo?: string;
  rol?: string;
  activo: boolean;
  passwordHash?: string;
  id_rol?: number;
  rolData?: { id: number; nombre: string };
};

export type ServicioBasico = {
  id: number;
  nombre: string;
  codigo: string;
  activo: boolean;
  tiempoPromedio?: number;
};

interface AsignacionState {
  asignaciones: AsignacionVentanillaDTO[];
  ventanillas: VentanillaDTO[];
  empleados: EmpleadoBasico[];
  servicios: ServicioBasico[];
  loading: boolean;
  error: string | null;
  procesando: boolean;
}

interface AsignacionActions {
  refresh: () => Promise<void>;
  crearAsignacion: (input: CrearAsignacionInput & { servicios?: number[] }) => Promise<boolean>;
  cerrarAsignacion: (id: number) => Promise<boolean>;
  asignarServicioAVentanilla: (ventanillaId: number, servicioId: number) => Promise<boolean>;
  modificarServiciosVentanilla: (ventanillaId: number, serviciosAAgregar: number[], serviciosAQuitar: number[]) => Promise<boolean>;
  clearError: () => void;
}

type UseAsignacionVentanillaReturn = AsignacionState & AsignacionActions;

export const useAsignacionVentanilla = (): UseAsignacionVentanillaReturn => {
  const [state, setState] = useState<AsignacionState>({
    asignaciones: [],
    ventanillas: [],
    empleados: [],
    servicios: [],
    loading: true,
    error: null,
    procesando: false
  });

  const loadData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      console.log('[AsignacionVentanilla] Cargando datos...');

      if (USE_MOCK_DATA) {
        // Simular delay de red
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Usar datos reales de ventanillas y servicios, pero empleados y asignaciones mock
        const [ventanillas, serviciosData] = await Promise.all([
          VentanillaAPI.listar(),
          ServicioAPI.listarConEstado(false)
        ]);
        
        const servicios = serviciosData.map(servicioToBasico);
        
        setState(prev => ({
          ...prev,
          asignaciones: MOCK_ASIGNACIONES,
          ventanillas,
          empleados: MOCK_EMPLEADOS,
          servicios,
          loading: false
        }));
      } else {
        // Usar API real - cargar uno por uno para identificar cuál falla
        console.log('[AsignacionVentanilla] Cargando asignaciones...');
        
        // Prueba de conectividad primero
        console.log('[AsignacionVentanilla] Probando conectividad con API de asignaciones...');
        const conectividad = await AsignacionVentanillaAPI.test();
        console.log('[AsignacionVentanilla] Conectividad:', conectividad ? '✅ OK' : '❌ FALLA');
        
        const asignaciones = await AsignacionVentanillaAPI.listar();
        console.log('[AsignacionVentanilla] Asignaciones cargadas:', asignaciones.length);
        console.log('[AsignacionVentanilla] Detalles de asignaciones:', asignaciones);
        
        // Verificar asignaciones activas específicamente
        const asignacionesActivas = asignaciones.filter(a => !a.fechaFin);
        console.log('[AsignacionVentanilla] Asignaciones activas (sin fechaFin):', asignacionesActivas.length);
        console.log('[AsignacionVentanilla] Lista de asignaciones activas:', asignacionesActivas);

        console.log('[AsignacionVentanilla] Cargando ventanillas...');
        const ventanillas = await VentanillaAPI.listar();
        console.log('[AsignacionVentanilla] Ventanillas cargadas:', ventanillas.length);
        console.log('[AsignacionVentanilla] Detalles de ventanillas:', ventanillas);

        console.log('[AsignacionVentanilla] Cargando usuarios...');
        const usuarios = await UsuarioAPI.listar(true); // Incluir empleados inactivos también
        console.log('[AsignacionVentanilla] Usuarios cargados:', usuarios.length);

        console.log('[AsignacionVentanilla] Cargando servicios...');
        let serviciosData: ServicioDTO[];

        // Usar directamente el endpoint /Lista que funciona
        serviciosData = await ServicioAPI.listar();
        console.log('[AsignacionVentanilla] Servicios cargados con listar():', serviciosData.length);

        console.log('[AsignacionVentanilla] Servicios raw del backend:', serviciosData);

        // Cargar relaciones ventanilla-servicio para mostrar en las tarjetas
        console.log('[AsignacionVentanilla] Cargando relaciones ventanilla-servicio...');
        let ventanillaServicios: { idVentanilla: number; idServicio: number; servicio: string; activo: boolean; id: number }[] = [];
        try {
          const vsData = await VentanillaServicioAPI.listar();
          ventanillaServicios = vsData.map(vs => ({
            id: vs.id,
            idVentanilla: vs.idVentanilla,
            idServicio: vs.idServicio,
            servicio: vs.servicio,
            activo: vs.activo
          }));
          console.log('[AsignacionVentanilla] Relaciones ventanilla-servicio:', ventanillaServicios.length);
        } catch (e) {
          console.warn('[AsignacionVentanilla] No se pudieron cargar relaciones ventanilla-servicio:', e);
        }

        // Convertir datos a formatos esperados
        const empleados = usuarios.map(usuarioToEmpleado);
        const servicios = serviciosData.map(servicioToBasico);

        // Asociar servicios a cada ventanilla
        const ventanillasConServicios = ventanillas.map(v => ({
          ...v,
          servicios: ventanillaServicios
            .filter(vs => vs.idVentanilla === v.id)
            .map(vs => ({
              id: vs.id,
              servicioId: vs.idServicio,
              servicio: vs.servicio,
              activo: vs.activo
            }))
        }));

        console.log('[AsignacionVentanilla] Ventanillas con servicios asociados:', ventanillasConServicios);
        console.log('[AsignacionVentanilla] Servicios después de transformación:', servicios);

        console.log('[AsignacionVentanilla] Datos procesados correctamente');
        setState(prev => ({
          ...prev,
          asignaciones,
          ventanillas: ventanillasConServicios,
          empleados,
          servicios,
          loading: false
        }));
      }
    } catch (error: any) {
      console.error('[AsignacionVentanilla] Error completo:', error);
      console.error('[AsignacionVentanilla] Error status:', error?.status);
      console.error('[AsignacionVentanilla] Error detail:', error?.detail);
      console.error('[AsignacionVentanilla] Error URL:', error?.url);
      
      let errorMessage = 'Error al cargar datos';
      if (error?.status === 500) {
        errorMessage = `Error 500 del servidor: ${error?.detail || error?.message || 'Error interno del servidor'}`;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
    }
  }, []);

  const crearAsignacion = useCallback(async (input: CrearAsignacionInput): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, procesando: true, error: null }));

      // Buscar información completa del empleado y ventanilla
      const ventanilla = state.ventanillas.find(v => v.id === input.idVentanilla);
      const empleado = state.empleados.find(e => e.id === input.idEmpleado);
      
      if (!ventanilla || !empleado) {
        throw new Error('Ventanilla o empleado no encontrado');
      }

      if (USE_MOCK_DATA) {
        // Simular creación
        await new Promise(resolve => setTimeout(resolve, 1000));

        const nuevaAsignacion: AsignacionVentanillaDTO = {
          id: Math.max(...state.asignaciones.map(a => a.id)) + 1,
          empleado: { id: empleado.id, nombre: empleado.nombre, correo: empleado.correo },
          ventanilla: { id: ventanilla.id, nombre: ventanilla.nombre },
          fechaInicio: new Date().toISOString(),
          fechaFin: null
        };

        setState(prev => ({
          ...prev,
          asignaciones: [...prev.asignaciones, nuevaAsignacion],
          procesando: false
        }));
      } else {
        // Enriquecer el input con la información completa del empleado y ventanilla
        const enrichedInput: CrearAsignacionInput = {
          ...input,
          empleado: {
            id: empleado.id,
            nombre: empleado.nombre,
            correo: empleado.correo
          },
          ventanilla: {
            id: ventanilla.id,
            nombre: ventanilla.nombre
          }
        };
        
        console.log('[AsignacionVentanilla] Creando asignación - Empleado:', empleado.nombre, '| Ventanilla:', ventanilla.nombre);
        console.log('[AsignacionVentanilla] Datos completos a enviar:', enrichedInput);
        
        await AsignacionVentanillaAPI.crear(enrichedInput);
        
        console.log('[AsignacionVentanilla] ✅ Asignación creada exitosamente');
        
        // Si se proporcionaron servicios, crear las asignaciones de servicios
        if (input.servicios && input.servicios.length > 0) {
          console.log(`[AsignacionVentanilla] Asignando ${input.servicios.length} servicio(s) a la ventanilla...`);

          // Primero obtener las relaciones existentes para evitar duplicados
          let relacionesExistentes: Array<{ idVentanilla: number; idServicio: number; id: number; activo: boolean }> = [];
          try {
            const todasRelaciones = await VentanillaServicioAPI.listar();
            relacionesExistentes = todasRelaciones
              .filter(r => r.idVentanilla === ventanilla.id)
              .map(r => ({ idVentanilla: r.idVentanilla, idServicio: r.idServicio, id: r.id, activo: r.activo }));
            console.log(`[AsignacionVentanilla] Relaciones existentes para ventanilla ${ventanilla.id}:`, relacionesExistentes);
          } catch (e) {
            console.warn('[AsignacionVentanilla] No se pudieron cargar relaciones existentes, se intentará crear todas');
          }

          for (const servicioId of input.servicios) {
            try {
              // Verificar si ya existe la relación
              const relacionExistente = relacionesExistentes.find(r => r.idServicio === servicioId);

              if (relacionExistente) {
                // Si existe pero está inactiva, activarla
                if (!relacionExistente.activo) {
                  console.log(`[AsignacionVentanilla] Reactivando servicio ${servicioId} en ventanilla ${ventanilla.nombre}`);
                  await VentanillaServicioAPI.activar(relacionExistente.id, true);
                  console.log(`[AsignacionVentanilla] ✅ Servicio ${servicioId} reactivado`);
                } else {
                  console.log(`[AsignacionVentanilla] ℹ️ Servicio ${servicioId} ya está asignado y activo, omitiendo`);
                }
              } else {
                // Crear nueva relación
                await VentanillaServicioAPI.crear({
                  idVentanilla: ventanilla.id,
                  idServicio: servicioId
                });
                console.log(`[AsignacionVentanilla] ✅ Servicio ${servicioId} asignado a ventanilla ${ventanilla.nombre}`);
              }
            } catch (error: any) {
              console.error(`[AsignacionVentanilla] ⚠️ Error al asignar servicio ${servicioId}:`, error);
              // Continuar con los demás servicios aunque uno falle
            }
          }

          console.log('[AsignacionVentanilla] ✅ Servicios asignados exitosamente');
        }
        
        console.log('[AsignacionVentanilla] 🔄 Recargando datos para reflejar cambios...');
        
        // Recargar todos los datos para reflejar el nuevo estado
        await loadData();
        
        console.log('[AsignacionVentanilla] ✅ Datos actualizados');
        setState(prev => ({ ...prev, procesando: false }));
      }

      return true;
    } catch (error: any) {
      console.error('[AsignacionVentanilla] Error al crear asignación:', error);
      console.error('[AsignacionVentanilla] Error status:', error?.status);
      console.error('[AsignacionVentanilla] Error detail:', error?.detail);
      console.error('[AsignacionVentanilla] Error URL:', error?.url);
      
      let errorMessage = 'Error al crear asignación';
      if (error?.status === 500) {
        errorMessage = `Error 500: ${error?.detail || error?.message || 'Error interno del servidor al crear asignación'}`;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setState(prev => ({
        ...prev,
        procesando: false,
        error: errorMessage
      }));
      return false;
    }
  }, [state.ventanillas, state.empleados, loadData]);

  const cerrarAsignacion = useCallback(async (id: number): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, procesando: true, error: null }));
      
      console.log('[AsignacionVentanilla] 🔄 Iniciando cierre de asignación ID:', id);
      
      // Verificar que la asignación existe en el estado actual
      const asignacionACtualizar = state.asignaciones.find(a => a.id === id);
      if (!asignacionACtualizar) {
        throw new Error(`Asignación con ID ${id} no encontrada en el estado local`);
      }

      console.log('[AsignacionVentanilla] 📋 Asignación a cerrar:', asignacionACtualizar);

      if (USE_MOCK_DATA) {
        console.log('[AsignacionVentanilla] 🧪 Usando datos mock - simulando cierre...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setState(prev => ({
          ...prev,
          asignaciones: prev.asignaciones.map(a => 
            a.id === id 
              ? { ...a, fechaFin: new Date().toISOString() }
              : a
          ),
          procesando: false
        }));
        console.log('[AsignacionVentanilla] ✅ Cierre mock completado');
      } else {
        console.log('[AsignacionVentanilla] � MODO REAL - Enviando petición al backend...');
        console.log('[AsignacionVentanilla] 🔴 SIN SOLUCIÓN TEMPORAL - Error del backend se mostrará directamente');
        
        // LLAMADA DIRECTA AL BACKEND - SIN FALLBACK TEMPORAL
        const resultado = await AsignacionVentanillaAPI.cerrar(id);
        
        console.log('[AsignacionVentanilla] ✅ Backend respondió exitosamente:', resultado);
        console.log('[AsignacionVentanilla] 🔄 Recargando datos para reflejar cambios...');
        
        await loadData();
        
        console.log('[AsignacionVentanilla] ✅ Datos actualizados desde el backend');
        setState(prev => ({ ...prev, procesando: false }));
      }

      return true;
    } catch (error: any) {
      console.error('[AsignacionVentanilla] ❌ ERROR DEL BACKEND - Sin solución temporal:', error?.message);
      console.error('[AsignacionVentanilla] 📊 Error completo:', error);
      
      // NO HAY SOLUCIÓN TEMPORAL - El error se propaga directamente
      setState(prev => ({
        ...prev,
        procesando: false,
        error: error?.message || 'Error al cerrar asignación'
      }));
      return false;
    }
  }, [state.asignaciones, loadData]);

  const asignarServicioAVentanilla = useCallback(async (ventanillaId: number, servicioId: number): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, procesando: true, error: null }));

      // Simular asignación de servicio
      console.log(`Asignando servicio ${servicioId} a ventanilla ${ventanillaId}`);
      await new Promise(resolve => setTimeout(resolve, 500));

      setState(prev => ({ ...prev, procesando: false }));
      return true;
    } catch (error: any) {
      console.error('Error assigning service:', error);
      setState(prev => ({
        ...prev,
        procesando: false,
        error: error?.message || 'Error al asignar servicio'
      }));
      return false;
    }
  }, []);

  const modificarServiciosVentanilla = useCallback(async (
    ventanillaId: number,
    serviciosAAgregar: number[],
    serviciosAQuitar: number[]
  ): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, procesando: true, error: null }));
      console.log('[modificarServiciosVentanilla] Iniciando modificación de servicios para ventanilla:', ventanillaId);
      console.log('[modificarServiciosVentanilla] Servicios a agregar:', serviciosAAgregar);
      console.log('[modificarServiciosVentanilla] Servicios a quitar:', serviciosAQuitar);

      // Obtener las relaciones existentes para esta ventanilla
      const todasRelaciones = await VentanillaServicioAPI.listar();
      const relacionesVentanilla = todasRelaciones.filter(r => r.idVentanilla === ventanillaId);
      console.log('[modificarServiciosVentanilla] Relaciones existentes:', relacionesVentanilla);

      // Quitar servicios (desactivar o eliminar)
      for (const servicioId of serviciosAQuitar) {
        const relacion = relacionesVentanilla.find(r => r.idServicio === servicioId);
        if (relacion) {
          try {
            console.log(`[modificarServiciosVentanilla] Eliminando relación ID ${relacion.id} (servicio ${servicioId})`);
            await VentanillaServicioAPI.eliminar(relacion.id);
            console.log(`[modificarServiciosVentanilla] ✅ Servicio ${servicioId} eliminado de ventanilla`);
          } catch (error) {
            console.error(`[modificarServiciosVentanilla] ⚠️ Error al eliminar servicio ${servicioId}:`, error);
          }
        }
      }

      // Agregar nuevos servicios
      for (const servicioId of serviciosAAgregar) {
        const relacionExistente = relacionesVentanilla.find(r => r.idServicio === servicioId);
        if (relacionExistente) {
          // Si existe pero está inactiva, activarla
          if (!relacionExistente.activo) {
            console.log(`[modificarServiciosVentanilla] Reactivando servicio ${servicioId}`);
            await VentanillaServicioAPI.activar(relacionExistente.id, true);
            console.log(`[modificarServiciosVentanilla] ✅ Servicio ${servicioId} reactivado`);
          }
        } else {
          // Crear nueva relación
          try {
            console.log(`[modificarServiciosVentanilla] Creando relación para servicio ${servicioId}`);
            await VentanillaServicioAPI.crear({
              idVentanilla: ventanillaId,
              idServicio: servicioId
            });
            console.log(`[modificarServiciosVentanilla] ✅ Servicio ${servicioId} agregado a ventanilla`);
          } catch (error) {
            console.error(`[modificarServiciosVentanilla] ⚠️ Error al agregar servicio ${servicioId}:`, error);
          }
        }
      }

      console.log('[modificarServiciosVentanilla] 🔄 Recargando datos...');
      await loadData();

      setState(prev => ({ ...prev, procesando: false }));
      console.log('[modificarServiciosVentanilla] ✅ Modificación completada');
      return true;
    } catch (error: any) {
      console.error('[modificarServiciosVentanilla] ❌ Error:', error);
      setState(prev => ({
        ...prev,
        procesando: false,
        error: error?.message || 'Error al modificar servicios de ventanilla'
      }));
      return false;
    }
  }, [loadData]);

  const refresh = useCallback(() => loadData(), [loadData]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    ...state,
    refresh,
    crearAsignacion,
    cerrarAsignacion,
    asignarServicioAVentanilla,
    modificarServiciosVentanilla,
    clearError
  };
};