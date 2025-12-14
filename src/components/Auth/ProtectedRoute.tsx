import React from 'react';
import { useAuth } from './AuthContext';
import Login from './Login';
import '../../styles/Auth.css';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRoles = [] 
}) => {
  const { isAuthenticated, user, login, isLoading } = useAuth();

  // Mostrar loading mientras se verifica la autenticación
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Verificando autenticación...</p>
      </div>
    );
  }

  // Si no está autenticado, mostrar página de login
  if (!isAuthenticated) {
    return (
      <Login 
        onLoginSuccess={login}
        onError={(error) => console.error('Login error:', error)}
      />
    );
  }

  // Verificar roles si se especificaron
  if (requiredRoles.length > 0 && user) {
    const userRole = user.rol.toLowerCase();
    const hasRequiredRole = requiredRoles.some(role => 
      role.toLowerCase() === userRole
    );
    
    if (!hasRequiredRole) {
      return (
        <div className="unauthorized-container">
          <div className="unauthorized-message">
            <h2>Acceso Denegado</h2>
            <p>No tienes permisos para acceder a esta sección.</p>
            <p>Tu rol: <strong>{user.rol}</strong></p>
            <p>Roles requeridos: <strong>{requiredRoles.join(', ')}</strong></p>
          </div>
        </div>
      );
    }
  }

  // Si todo está bien, mostrar el contenido protegido
  return <>{children}</>;
};

export default ProtectedRoute;