import React, { useState } from 'react';
import { LoginAPI } from '../../services/login.service';
import { MockLoginAPI } from '../../services/mock-login.service';
import type { LoginRequest, LoginResponse } from '../../services/login.service';
import './Login.css';

// Cambiar a true para usar el mock, false para usar API real
const USE_MOCK_API = true;

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
      const response = USE_MOCK_API 
        ? await MockLoginAPI.login(formData)
        : await LoginAPI.login(formData);
      
      // Guardar información del usuario en localStorage
      localStorage.setItem('user', JSON.stringify(response));
      localStorage.setItem('isAuthenticated', 'true');
      
      onLoginSuccess(response);
    } catch (err: any) {
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
          <h2>Sistema de Turnos</h2>
          <p>Inicia sesión para acceder al sistema</p>
        </div>
        
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
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

          <div className="form-group">
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

        {USE_MOCK_API && (
          <div className="demo-users">
            <h4>👤 Usuarios de Prueba:</h4>
            <div className="demo-user">
              <strong>Administrador:</strong> admin@test.com / admin123
            </div>
            <div className="demo-user">
              <strong>Empleado:</strong> empleado@test.com / emp123
            </div>
            <div className="demo-user">
              <strong>Usuario:</strong> usuario@test.com / 123456
            </div>
          </div>
        )}

        <div className="login-footer">
          <p>¿Problemas para acceder? Contacta al administrador</p>
        </div>
      </div>
    </div>
  );
};

export default Login;