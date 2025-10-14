import { useState } from 'react';
import { LogIn, User, Lock, AlertCircle, Monitor } from 'lucide-react';
import './LoginOperador.css';
import { OperadorAuthAPI } from '../../services/operador-auth.service';

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
    <div className="login-operador-container">
      <div className="login-operador-card">
        {/* Header */}
        <div className="login-header">
          <div className="login-icon">
            <Monitor size={48} />
          </div>
          <h1>ALCALDÍA MUNICIPAL</h1>
          <p className="login-subtitle">Sistema de Gestión de Turnos</p>
          <div className="login-divider"></div>
          <h2>Acceso de Operador</h2>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="correo">
              <User size={18} />
              Correo Electrónico
            </label>
            <input
              id="correo"
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="ejemplo@alcaldia.gob.sv"
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              <Lock size={18} />
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <button 
            type="submit" 
            className="btn-login"
            disabled={loading}
          >
            <LogIn size={20} />
            <span>{loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}</span>
          </button>
        </form>

        {/* Footer */}
        <div className="login-footer">
          <p>¿Problemas para acceder?</p>
          <p className="footer-help">Contacte al administrador del sistema</p>
        </div>
      </div>

      {/* Información adicional */}
      <div className="login-info">
        <div className="info-item">
          <Monitor size={24} />
          <div>
            <h3>Acceso Restringido</h3>
            <p>Solo para personal autorizado</p>
          </div>
        </div>
      </div>
    </div>
  );
}
