import React, { useEffect } from 'react';
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
        background: '#0a1628'
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '5px solid rgba(212, 165, 32, 0.3)',
            borderTop: '5px solid #D4A520',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }} />
          <p style={{ fontFamily: 'Times New Roman, Times, Georgia, serif' }}>Verificando autenticación...</p>
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
    // Eliminar márgenes del body cuando se muestra acceso denegado
    useEffect(() => {
      document.body.style.margin = '0';
      document.body.style.padding = '0';
      document.documentElement.style.margin = '0';
      document.documentElement.style.padding = '0';

      return () => {
        document.body.style.margin = '';
        document.body.style.padding = '';
        document.documentElement.style.margin = '';
        document.documentElement.style.padding = '';
      };
    }, []);

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#0a1628',
        color: 'white',
        textAlign: 'center'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '40px',
          maxWidth: '500px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
          color: '#1F2937',
          border: 'none',
          outline: 'none'
        }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>🚫</h1>
          <h2 style={{ fontSize: '24px', marginBottom: '15px', color: '#0a1628', fontFamily: 'Times New Roman, Times, Georgia, serif' }}>Acceso Denegado</h2>
          <p style={{ fontSize: '16px', marginBottom: '10px', color: '#4B5563' }}>
            No tienes permisos para acceder al panel de administración.
          </p>
          <p style={{ fontSize: '14px', marginBottom: '20px', color: '#6B9AD0' }}>
            Tu rol actual: <strong>{user?.rol || 'Desconocido'}</strong>
          </p>
          <p style={{ fontSize: '14px', color: '#9CA3AF' }}>
            Solo usuarios con rol de <strong>Administrador</strong> pueden acceder a esta sección.
          </p>
          <div style={{ display: 'flex', gap: '15px', marginTop: '30px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              style={{
                padding: '12px 30px',
                background: '#0a1628',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontFamily: 'Times New Roman, Times, Georgia, serif',
                boxShadow: '0 4px 15px rgba(10, 22, 40, 0.4)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(10, 22, 40, 0.5)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(10, 22, 40, 0.4)';
              }}
            >
              Intentar con Otra Cuenta
            </button>
            <button
              onClick={() => {
                window.location.href = '/';
              }}
              style={{
                padding: '12px 30px',
                background: 'white',
                color: '#D4A520',
                border: '2px solid #D4A520',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontFamily: 'Times New Roman, Times, Georgia, serif'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.background = '#D4A520';
                e.currentTarget.style.color = 'white';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.color = '#D4A520';
              }}
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
