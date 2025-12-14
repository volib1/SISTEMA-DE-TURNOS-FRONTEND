import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/Auth/AuthContext';
import Login from './components/Auth/Login';
import RecuperarPassword from './components/Auth/RecuperarPassword';
import RestablecerPassword from './components/Auth/RestablecerPassword';
import AdminLayout from './layout/AdminLayout';
import KioskoEnhanced from './components/Kiosko/KioskoEnhanced';
import PantallaEsperaEnhanced from './components/Pantalla/PantallaEsperaEnhanced';
import OperadorAuth from './components/Operador/OperadorAuth';
import Launcher from './components/Launcher/Launcher';

// Componente para rutas protegidas del admin
const ProtectedAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user, login, isLoading } = useAuth();
  
  // Mostrar loading mientras se verifica la autenticación
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '5px solid rgba(255,255,255,0.3)',
            borderTop: '5px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }} />
          <p>Verificando autenticación...</p>
        </div>
      </div>
    );
  }
  
  // Si no está autenticado, mostrar login
  if (!isAuthenticated) {
    return <Login onLoginSuccess={login} />;
  }
  
  // Validar que el usuario tenga rol de administrador
  const userRole = user?.rol?.toLowerCase() || '';
  const isAdmin = userRole === 'admin' || userRole === 'administrador';
  
  if (!isAdmin) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        textAlign: 'center'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          padding: '40px',
          maxWidth: '500px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>🚫</h1>
          <h2 style={{ fontSize: '24px', marginBottom: '15px' }}>Acceso Denegado</h2>
          <p style={{ fontSize: '16px', marginBottom: '10px', opacity: 0.9 }}>
            No tienes permisos para acceder al panel de administración.
          </p>
          <p style={{ fontSize: '14px', marginBottom: '20px', opacity: 0.8 }}>
            Tu rol actual: <strong>{user?.rol || 'Desconocido'}</strong>
          </p>
          <p style={{ fontSize: '14px', opacity: 0.7 }}>
            Solo usuarios con rol de <strong>Administrador</strong> pueden acceder a esta sección.
          </p>
          <div style={{ display: 'flex', gap: '15px', marginTop: '30px', justifyContent: 'center' }}>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              style={{
                padding: '12px 30px',
                background: 'white',
                color: '#667eea',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'transform 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              Intentar con Otra Cuenta
            </button>
            <button
              onClick={() => {
                window.location.href = '/';
              }}
              style={{
                padding: '12px 30px',
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: '2px solid white',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'transform 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              Volver al Inicio
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
};

const AppContent: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Ruta principal - Launcher */}
        <Route path="/" element={<Launcher />} />
        
        {/* Rutas públicas - sin autenticación */}
        <Route path="/kiosko" element={<KioskoEnhanced />} />
        <Route path="/pantalla" element={<PantallaEsperaEnhanced />} />
        <Route path="/operador" element={<OperadorAuth />} />
        <Route path="/login" element={<Login onLoginSuccess={() => {}} />} />
        
        {/* Rutas de recuperación de contraseña */}
        <Route path="/recuperar-password" element={<RecuperarPassword onVolver={() => window.location.href = '/admin'} />} />
        <Route path="/restablecer-password" element={<RestablecerPassword />} />
        
        {/* Rutas administrativas - requieren autenticación */}
        <Route 
          path="/admin/*" 
          element={
            <ProtectedAdminRoute>
              <AdminLayout />
            </ProtectedAdminRoute>
          } 
        />
        
        {/* Ruta catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
