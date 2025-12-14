import { useState } from 'react';
import '../../styles/Login.css';
import { OperadorAuthAPI } from '../../services/operador-auth.service';
import logoImg from '../../assets/logo.webp';

interface LoginOperadorProps {
  onLoginSuccess: (empleado: EmpleadoOperador) => void;
}

export interface EmpleadoOperador {
  id: number;
  nombre: string;
  correo: string;
  ventanilla?: {
    id: number;
    nombre: string;
  };
}

export default function LoginOperador({ onLoginSuccess }: LoginOperadorProps) {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!correo || !password) {
      setError('Por favor ingrese su correo y contraseña');
      return;
    }

    setLoading(true);

    try {
      console.log('[LoginOperador] 🔐 Intentando iniciar sesión...', { correo });
      
      // Llamada real al API de login
      const response = await OperadorAuthAPI.login({ correo, password });
      
      const empleado: EmpleadoOperador = {
        id: response.id,
        nombre: response.nombre,
        correo: response.correo,
        ventanilla: response.ventanilla || undefined
      };
      
      console.log('[LoginOperador] ✅ Login exitoso:', empleado);
      if (!empleado.ventanilla) {
        console.log('[LoginOperador] ⚠️ Usuario sin ventanilla asignada');
      }
      
      onLoginSuccess(empleado);
      
    } catch (err: any) {
      console.error('[LoginOperador] ❌ Error en login:', err);
      
      const errorMessage = err?.message || 
                          err?.detail?.message || 
                          'Credenciales incorrectas. Por favor verifique su correo y contraseña.';
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img
            src={logoImg}
            alt="Gobierno Municipal - Ciudad Portuaria"
            className="login-logo"
          />
          <h2>PANEL DEL OPERADOR</h2>
          <p>Inicia sesión para atender turnos</p>
        </div>
        
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-form-group">
            <label htmlFor="correo">Correo Electrónico</label>
            <input
              type="email"
              id="correo"
              name="correo"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="ejemplo@correo.com"
              disabled={loading}
              required
            />
          </div>

          <div className="login-form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingresa tu contraseña"
              disabled={loading}
              required
            />
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Iniciando sesión...
              </>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>¿Problemas para acceder? Contacta al administrador</p>
        </div>
      </div>
    </div>
  );
}
