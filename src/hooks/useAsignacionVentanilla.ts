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

        // Convertir datos a formatos esperados
        const empleados = usuarios.map(usuarioToEmpleado);
        const servicios = serviciosData.map(servicioToBasico);
        
        console.log('[AsignacionVentanilla] Servicios después de transformación:', servicios);

        console.log('[AsignacionVentanilla] Datos procesados correctamente');
        setState(prev => ({
          ...prev,
          asignaciones,
          ventanillas,
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
          
          for (const servicioId of input.servicios) {
            try {
              await VentanillaServicioAPI.crear({
                idVentanilla: ventanilla.id,
                idServicio: servicioId
              });
              console.log(`[AsignacionVentanilla] ✅ Servicio ${servicioId} asignado a ventanilla ${ventanilla.nombre}`);
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
    clearError
  };
};