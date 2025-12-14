import React, { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { PasswordRecoveryAPI } from '../../services/password-recovery.service';
import '../../styles/RecuperarPassword.css';

interface RecuperarPasswordProps {
  onVolver: () => void;
}

const RecuperarPassword: React.FC<RecuperarPasswordProps> = ({ onVolver }) => {
  const [correo, setCorreo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!correo.trim()) {
      setError('Por favor, ingresa tu correo electrónico');
      return;
    }

    // Validar formato de correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correo)) {
      setError('Por favor, ingresa un correo electrónico válido');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await PasswordRecoveryAPI.solicitarRecuperacion(correo);
      
      if (response.success) {
        setSuccess(true);
      } else {
        setError(response.message || 'No se pudo enviar el correo de recuperación');
      }
    } catch (err: any) {
      console.error('[RecuperarPassword] Error:', err);
      setError(err.message || 'Error al solicitar recuperación de contraseña');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="recuperar-container">
        <div className="recuperar-card">
          <div className="success-icon">
            <CheckCircle size={64} color="#10b981" />
          </div>
          
          <h2>¡Correo Enviado!</h2>
          
          <div className="success-message">
            <p>
              Hemos enviado un correo electrónico a <strong>{correo}</strong> con las instrucciones
              para restablecer tu contraseña.
            </p>
            <p style={{ marginTop: '12px', fontSize: '14px', color: '#6b7280' }}>
              Por favor, revisa tu bandeja de entrada y también la carpeta de spam.
              El enlace de recuperación expirará en 1 hora.
            </p>
          </div>

          <button
            type="button"
            onClick={onVolver}
            className="recuperar-button-secondary"
          >
            <ArrowLeft size={18} />
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="recuperar-container">
      <div className="recuperar-card">
        <button
          type="button"
          onClick={onVolver}
          className="btn-volver"
        >
          <ArrowLeft size={18} />
          Volver
        </button>

        <div className="recuperar-header">
          <div className="recuperar-icon">
            <Mail size={40} color="#3b82f6" />
          </div>
          <h2>RECUPERAR CONTRASEÑA</h2>
          <p>Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña</p>
        </div>
        
        <form className="recuperar-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="correo">Correo Electrónico</label>
            <input
              type="email"
              id="correo"
              name="correo"
              value={correo}
              onChange={(e) => {
                setCorreo(e.target.value);
                if (error) setError('');
              }}
              placeholder="ejemplo@correo.com"
              disabled={isLoading}
              autoFocus
              required
            />
          </div>

          {error && (
            <div className="error-message">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="recuperar-button"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Enviando...
              </>
            ) : (
              <>
                <Mail size={18} />
                Enviar Enlace de Recuperación
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RecuperarPassword;
