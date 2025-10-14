import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/Auth/AuthContext';
import Login from './components/Auth/Login';
import AdminLayout from './layout/AdminLayout';
import KioskoEnhanced from './components/Kiosko/KioskoEnhanced';
import PantallaEsperaEnhanced from './components/Pantalla/PantallaEsperaEnhanced';
import OperadorAuth from './components/Operador/OperadorAuth';

// Componente para rutas protegidas del admin
const ProtectedAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => {}} />;
  }
  
  return <>{children}</>;
};

const AppContent: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Rutas públicas - sin autenticación */}
        <Route path="/kiosko" element={<KioskoEnhanced />} />
        <Route path="/pantalla" element={<PantallaEsperaEnhanced />} />
        <Route path="/operador" element={<OperadorAuth />} />
        
        {/* Rutas administrativas - requieren autenticación */}
        <Route 
          path="/admin/*" 
          element={
            <ProtectedAdminRoute>
              <AdminLayout />
            </ProtectedAdminRoute>
          } 
        />
        
        {/* Redirección por defecto */}
        <Route path="/" element={<Navigate to="/kiosko" replace />} />
        <Route path="*" element={<Navigate to="/kiosko" replace />} />
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
