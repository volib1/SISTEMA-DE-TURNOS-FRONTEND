import { API_ROOT } from "./http";

export type EmpleadoOperadorDTO = {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
  ventanilla?: {
    id: number;
    nombre: string;
  } | null;
};

export type LoginOperadorRequest = {
  correo: string;
  password: string;
};

const API_LOGIN = `${API_ROOT}/login`;
const API_USUARIO = `${API_ROOT}/usuario`;

/**
 * Servicio de autenticación para operadores
 * Utiliza el endpoint /login para autenticar y luego obtiene los datos del usuario con su ventanilla
 */
export const OperadorAuthAPI = {
  async login(input: LoginOperadorRequest): Promise<EmpleadoOperadorDTO> {
    console.log('[OperadorAuth] 🔐 Iniciando login para:', input.correo);
    console.log('[OperadorAuth] API_LOGIN:', API_LOGIN);
    console.log('[OperadorAuth] API_USUARIO:', API_USUARIO);
    console.log('[OperadorAuth] Payload enviado:', { Correo: input.correo, Password: '***' });
    
    try {
      // Paso 1: Autenticar usuario
      console.log('[OperadorAuth] Paso 1: Autenticando usuario...');
      const loginResponse = await fetch(API_LOGIN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Correo: input.correo, Password: input.password }),
      });

      console.log('[OperadorAuth] Login response status:', loginResponse.status, loginResponse.statusText);

      if (!loginResponse.ok) {
        const errorText = await loginResponse.text();
        console.error('[OperadorAuth] Login falló. Status:', loginResponse.status, 'Error:', errorText);
        
        // Si el error es de BCrypt, dar un mensaje más claro
        if (errorText.includes('BCrypt') || errorText.includes('salt')) {
          throw new Error('Error en el hash de la contraseña. Las contraseñas en la base de datos necesitan ser regeneradas con BCrypt válido.');
        }
        
        throw new Error(`Login falló: ${loginResponse.status} ${loginResponse.statusText}`);
      }

      const loginRaw = await loginResponse.json();
      console.log('[OperadorAuth] ✅ Login exitoso. Respuesta:', loginRaw);

      const userId = Number(loginRaw.Id ?? loginRaw.id ?? 0);
      
      if (!userId) {
        throw new Error('No se pudo obtener el ID del usuario');
      }

      // Paso 2: Obtener datos completos del usuario incluyendo ventanilla asignada
      console.log('[OperadorAuth] Paso 2: Obteniendo datos del usuario ID:', userId);
      const userUrl = `${API_USUARIO}/${userId}`;
      console.log('[OperadorAuth] URL completa:', userUrl);
      
      const userResponse = await fetch(userUrl);
      
      console.log('[OperadorAuth] User response status:', userResponse.status, userResponse.statusText);

      if (!userResponse.ok) {
        const errorText = await userResponse.text();
        console.error('[OperadorAuth] Obtener usuario falló. Status:', userResponse.status, 'Error:', errorText);
        throw new Error(`Obtener usuario falló: ${userResponse.status} ${userResponse.statusText}`);
      }

      const userRaw = await userResponse.json();
      console.log('[OperadorAuth] ✅ Datos del usuario recibidos:', userRaw);
      console.log('[OperadorAuth] 🔍 Estructura completa del usuario:', JSON.stringify(userRaw, null, 2));

      const empleado: EmpleadoOperadorDTO = {
        id: userId,
        nombre: String(userRaw.nombre ?? loginRaw.Nombre ?? loginRaw.nombre ?? ""),
        correo: String(userRaw.correo ?? loginRaw.Correo ?? loginRaw.correo ?? ""),
        rol: String(userRaw.Rol?.nombre ?? userRaw.rol?.nombre ?? loginRaw.Rol ?? loginRaw.rol ?? ""),
        ventanilla: null,
      };

      // Verificar si el usuario tiene una ventanilla asignada ACTIVA
      // Intentar diferentes variaciones de nombre de propiedad
      const asignacion = userRaw.AsignacionVentanilla ?? 
                        userRaw.asignacionVentanilla ?? 
                        userRaw.asignacion_ventanilla ??
                        userRaw.Asignacion_Ventanilla;
      
      console.log('[OperadorAuth] Verificando asignación de ventanilla...');
      console.log('[OperadorAuth] 🔍 Buscando en userRaw.AsignacionVentanilla:', userRaw.AsignacionVentanilla);
      console.log('[OperadorAuth] 🔍 Buscando en userRaw.asignacionVentanilla:', userRaw.asignacionVentanilla);
      console.log('[OperadorAuth] 🔍 Buscando en userRaw.asignacion_ventanilla:', userRaw.asignacion_ventanilla);
      console.log('[OperadorAuth] Asignación encontrada:', JSON.stringify(asignacion, null, 2));
      
      if (asignacion && asignacion.id_ventanilla) {
        // Verificar que la asignación esté activa (fecha_fin debe ser null)
        const fechaFin = asignacion.fecha_fin ?? asignacion.fechaFin ?? asignacion.FechaFin;
        
        if (fechaFin !== null && fechaFin !== undefined) {
          console.warn('[OperadorAuth] ⚠️ Asignación inactiva. Fecha fin:', fechaFin);
          // No lanzar error, solo advertir
          console.warn('[OperadorAuth] ⚠️ Su asignación de ventanilla ha sido finalizada');
        } else {
          const ventanillaId = Number(asignacion.id_ventanilla ?? asignacion.idVentanilla ?? asignacion.IdVentanilla ?? 0);
          const ventanillaNombre = String(asignacion.Ventanilla ?? asignacion.ventanilla ?? `Ventanilla ${ventanillaId}`);
          
          empleado.ventanilla = {
            id: ventanillaId,
            nombre: ventanillaNombre,
          };
          console.log('[OperadorAuth] ✅ Ventanilla asignada y activa:', empleado.ventanilla);
          console.log('[OperadorAuth] 🔍 ID Ventanilla:', ventanillaId, '| Nombre:', ventanillaNombre);
        }
      } else {
        console.warn('[OperadorAuth] ⚠️ Usuario sin ventanilla asignada');
        console.warn('[OperadorAuth] El usuario podrá seleccionar una ventanilla manualmente');
      }

      return empleado;
    } catch (error: any) {
      console.error('[OperadorAuth] ❌ Error completo:', error);
      console.error('[OperadorAuth] Error.message:', error.message);
      console.error('[OperadorAuth] Error.status:', error.status);
      console.error('[OperadorAuth] Error.detail:', error.detail);
      console.error('[OperadorAuth] Error.url:', error.url);
      console.error('[OperadorAuth] Error stack:', error.stack);
      
      // Mensaje más amigable según el tipo de error
      if (error.status === 401 || error.status === 403) {
        throw new Error('Credenciales incorrectas. Verifique su correo y contraseña.');
      } else if (error.status === 404) {
        throw new Error('Usuario no encontrado.');
      } else if (error.status === 500) {
        console.error('[OperadorAuth] Error 500 - Detalle del servidor:', error.detail);
        throw new Error(`Error del servidor: ${JSON.stringify(error.detail) || 'Error interno del servidor'}`);
      } else if (error.message?.includes('ventanilla')) {
        throw error; // Ya tiene un mensaje apropiado
      } else {
        throw new Error(`Error al iniciar sesión: ${error.message || 'Intente nuevamente'}`);
      }
    }
  },

  /**
   * Obtiene los datos actualizados del usuario (para verificar sesión y refrescar ventanilla)
   */
  async getUsuario(userId: number): Promise<EmpleadoOperadorDTO> {
    console.log('[OperadorAuth] 🔄 Obteniendo datos actualizados del usuario ID:', userId);

    try {
      const userUrl = `${API_USUARIO}/${userId}`;
      const userResponse = await fetch(userUrl);

      if (!userResponse.ok) {
        throw new Error(`Usuario no encontrado: ${userResponse.status}`);
      }

      const userRaw = await userResponse.json();
      console.log('[OperadorAuth] ✅ Datos del usuario actualizados:', userRaw);

      const empleado: EmpleadoOperadorDTO = {
        id: userId,
        nombre: String(userRaw.nombre ?? ""),
        correo: String(userRaw.correo ?? ""),
        rol: String(userRaw.Rol?.nombre ?? userRaw.rol?.nombre ?? ""),
        ventanilla: null,
      };

      // Verificar asignación de ventanilla
      const asignacion = userRaw.AsignacionVentanilla ??
                        userRaw.asignacionVentanilla ??
                        userRaw.asignacion_ventanilla ??
                        userRaw.Asignacion_Ventanilla;

      if (asignacion && asignacion.id_ventanilla) {
        const fechaFin = asignacion.fecha_fin ?? asignacion.fechaFin ?? asignacion.FechaFin;

        if (fechaFin === null || fechaFin === undefined) {
          const ventanillaId = Number(asignacion.id_ventanilla ?? asignacion.idVentanilla ?? 0);
          const ventanillaNombre = String(asignacion.Ventanilla ?? asignacion.ventanilla ?? `Ventanilla ${ventanillaId}`);

          empleado.ventanilla = {
            id: ventanillaId,
            nombre: ventanillaNombre,
          };
          console.log('[OperadorAuth] ✅ Ventanilla activa:', empleado.ventanilla);
        }
      }

      return empleado;
    } catch (error: any) {
      console.error('[OperadorAuth] ❌ Error al obtener usuario:', error);
      throw error;
    }
  },
};
