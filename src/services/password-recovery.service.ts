import { API_ROOT, handleJSON } from "./http";

export type SolicitarRecuperacionRequest = {
  correo: string;
};

export type SolicitarRecuperacionResponse = {
  message: string;
  success: boolean;
};

export type RestablecerPasswordRequest = {
  token: string;
  nuevaPassword: string;
};

export type RestablecerPasswordResponse = {
  message: string;
  success: boolean;
};

const API = `${API_ROOT}/PasswordRecovery`;

export const PasswordRecoveryAPI = {
  /**
   * Solicita un token de recuperación de contraseña por correo
   */
  async solicitarRecuperacion(correo: string): Promise<SolicitarRecuperacionResponse> {
    console.log('[PasswordRecoveryAPI] Solicitando recuperación para:', correo);
    
    try {
      const response = await fetch(`${API}/SolicitarRecuperacion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: correo.trim() })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[PasswordRecoveryAPI] Error del servidor:', errorText);
        throw new Error(errorText || 'Error al solicitar recuperación de contraseña');
      }

      const result = await handleJSON<SolicitarRecuperacionResponse>(response);
      console.log('[PasswordRecoveryAPI] Solicitud exitosa:', result);
      return result;
      
    } catch (error: any) {
      console.error('[PasswordRecoveryAPI] Error:', error);
      throw error;
    }
  },

  /**
   * Valida un token de recuperación
   */
  async validarToken(token: string): Promise<{ valido: boolean; correo?: string }> {
    console.log('[PasswordRecoveryAPI] Validando token...');
    
    try {
      const response = await fetch(`${API}/ValidarToken/${encodeURIComponent(token)}`);
      
      if (!response.ok) {
        return { valido: false };
      }

      const result = await handleJSON<{ valido: boolean; correo?: string }>(response);
      console.log('[PasswordRecoveryAPI] Token válido:', result.valido);
      return result;
      
    } catch (error: any) {
      console.error('[PasswordRecoveryAPI] Error validando token:', error);
      return { valido: false };
    }
  },

  /**
   * Restablece la contraseña usando el token
   */
  async restablecerPassword(token: string, nuevaPassword: string): Promise<RestablecerPasswordResponse> {
    console.log('[PasswordRecoveryAPI] Restableciendo contraseña...');
    
    try {
      const response = await fetch(`${API}/RestablecerPassword`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, nuevaPassword })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[PasswordRecoveryAPI] Error del servidor:', errorText);
        throw new Error(errorText || 'Error al restablecer contraseña');
      }

      const result = await handleJSON<RestablecerPasswordResponse>(response);
      console.log('[PasswordRecoveryAPI] Contraseña restablecida exitosamente');
      return result;
      
    } catch (error: any) {
      console.error('[PasswordRecoveryAPI] Error:', error);
      throw error;
    }
  }
};
