import React, { useState } from 'react';
import { LoginAPI } from '../../services/login.service';
import { MockLoginAPI } from '../../services/mock-login.service';
import type { LoginRequest, LoginResponse } from '../../services/login.service';
import logoImg from '../../assets/logo.webp';
import '../../styles/Login.css';

const USE_MOCK_API = false; // Cambiado a false para usar la API real

interface LoginProps {
  onLoginSuccess: (user: LoginResponse) => void;
  onError?: (error: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, onError }) => {
  const [formData, setFormData] = useState<LoginRequest>({
    correo: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Limpiar error cuando el usuario empiece a escribir
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.correo.trim() || !formData.password.trim()) {
      setError('Por favor, completa todos los campos');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('[Login] Intentando iniciar sesión con:', { correo: formData.correo });
      
      const response = USE_MOCK_API 
        ? await MockLoginAPI.login(formData)
        : await LoginAPI.login(formData);
      
      console.log('[Login] Login exitoso:', response);
      
      // Guardar información del usuario en localStorage
      localStorage.setItem('user', JSON.stringify(response));
      localStorage.setItem('isAuthenticated', 'true');
      
      onLoginSuccess(response);
    } catch (err: any) {
      console.error('[Login] Error al iniciar sesión:', err);
      const errorMessage = err.message || 'Error al iniciar sesión. Verifica tus credenciales.';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsLoading(false);
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
          <h2>SISTEMA DE GESTIÓN DE TURNOS</h2>
          <p>Acceso al portal administrativo</p>
        </div>
        
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-form-group">
            <label htmlFor="correo">Correo Electrónico</label>
            <input
              type="email"
              id="correo"
              name="correo"
              value={formData.correo}
              onChange={handleInputChange}
              placeholder="ejemplo@correo.com"
              disabled={isLoading}
              required
            />
          </div>

          <div className="login-form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Ingresa tu contraseña"
              disabled={isLoading}
              required
            />
            <button
              type="button"
              onClick={() => window.location.href = '/recuperar-password'}
              className="forgot-password-link"
            >
              ¿Olvidaste tu contraseña?
            </button>
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
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Iniciando sesión...
              </>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;