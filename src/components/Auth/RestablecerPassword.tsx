import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { PasswordRecoveryAPI } from '../../services/password-recovery.service';
import '../../styles/RestablecerPassword.css';

const RestablecerPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const token = searchParams.get('token');
  
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [validandoToken, setValidandoToken] = useState(true);
  const [tokenValido, setTokenValido] = useState(false);
  const [correoUsuario, setCorreoUsuario] = useState('');
  
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    validarToken();
  }, [token]);

  const validarToken = async () => {
    if (!token) {
      setError('Token de recuperación no válido');
      setValidandoToken(false);
      return;
    }

    try {
      const resultado = await PasswordRecoveryAPI.validarToken(token);
      
      if (resultado.valido) {
        setTokenValido(true);
        setCorreoUsuario(resultado.correo || '');
      } else {
        setError('El enlace de recuperación ha expirado o no es válido');
      }
    } catch (err: any) {
      console.error('[RestablecerPassword] Error validando token:', err);
      setError('Error al validar el token de recuperación');
    } finally {
      setValidandoToken(false);
    }
  };

  const validarPassword = (): boolean => {
    if (!nuevaPassword.trim()) {
      setError('Por favor, ingresa una nueva contraseña');
      return false;
    }

    if (nuevaPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return false;
    }

    if (nuevaPassword !== confirmarPassword) {
      setError('Las contraseñas no coinciden');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validarPassword()) {
      return;
    }

    if (!token) {
      setError('Token no válido');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await PasswordRecoveryAPI.restablecerPassword(token, nuevaPassword);
      
      if (response.success) {
        setSuccess(true);
        
        // Redirigir al login después de 3 segundos
        setTimeout(() => {
          navigate('/admin');
        }, 3000);
      } else {
        setError(response.message || 'No se pudo restablecer la contraseña');
      }
    } catch (err: any) {
      console.error('[RestablecerPassword] Error:', err);
      setError(err.message || 'Error al restablecer la contraseña');
    } finally {
      setIsLoading(false);
    }
  };

  if (validandoToken) {
    return (
      <div className="restablecer-container">
        <div className="restablecer-card">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Validando enlace de recuperación...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!tokenValido) {
    return (
      <div className="restablecer-container">
        <div className="restablecer-card">
          <div className="error-icon">
            <AlertCircle size={64} color="#ef4444" />
          </div>
          
          <h2>Enlace No Válido</h2>
          
          <div className="error-message-card">
            <p>{error || 'El enlace de recuperación ha expirado o no es válido'}</p>
            <p style={{ marginTop: '12px', fontSize: '14px' }}>
              Por favor, solicita un nuevo enlace de recuperación.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="restablecer-button"
          >
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="restablecer-container">
        <div className="restablecer-card">
          <div className="success-icon">
            <CheckCircle size={64} color="#10b981" />
          </div>
          
          <h2>¡Contraseña Restablecida!</h2>
          
          <div className="success-message-card">
            <p>Tu contraseña ha sido restablecida exitosamente.</p>
            <p style={{ marginTop: '12px', fontSize: '14px', color: '#6b7280' }}>
              Serás redirigido al inicio de sesión en unos segundos...
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="restablecer-button"
          >
            Ir al inicio de sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="restablecer-container">
      <div className="restablecer-card">
        <div className="restablecer-header">
          <div className="restablecer-icon">
            <Lock size={40} color="#3b82f6" />
          </div>
          <h2>Restablecer Contraseña</h2>
          {correoUsuario && (
            <p className="correo-info">Para la cuenta: <strong>{correoUsuario}</strong></p>
          )}
        </div>
        
        <form className="restablecer-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="nuevaPassword">Nueva Contraseña</label>
            <div className="password-input-wrapper">
              <input
                type={mostrarPassword ? 'text' : 'password'}
                id="nuevaPassword"
                value={nuevaPassword}
                onChange={(e) => {
                  setNuevaPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Mínimo 6 caracteres"
                disabled={isLoading}
                autoFocus
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                tabIndex={-1}
              >
                {mostrarPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmarPassword">Confirmar Contraseña</label>
            <div className="password-input-wrapper">
              <input
                type={mostrarConfirmar ? 'text' : 'password'}
                id="confirmarPassword"
                value={confirmarPassword}
                onChange={(e) => {
                  setConfirmarPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Repite la contraseña"
                disabled={isLoading}
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setMostrarConfirmar(!mostrarConfirmar)}
                tabIndex={-1}
              >
                {mostrarConfirmar ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="error-message">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="restablecer-button"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Restableciendo...
              </>
            ) : (
              <>
                <Lock size={18} />
                Restablecer Contraseña
              </>
            )}
          </button>
        </form>

        <div className="restablecer-footer">
          <p>¿Recordaste tu contraseña?</p>
          <button onClick={() => navigate('/admin')} className="link-button">
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    </div>
  );
};

export default RestablecerPassword;
