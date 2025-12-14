import { useState, useEffect } from 'react';
import LoginOperador from './LoginOperador';
import type { EmpleadoOperador } from './LoginOperador';
import VentanillaOperador from './VentanillaOperador';
import { OperadorAuthAPI } from '../../services/operador-auth.service';

const STORAGE_KEY = 'operador_session';

const OperadorAuth = () => {
  const [empleado, setEmpleado] = useState<EmpleadoOperador | null>(() => {
    // Intentar recuperar sesión del localStorage al inicializar
    try {
      const savedSession = localStorage.getItem(STORAGE_KEY);
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        console.log('[OperadorAuth] ✅ Sesión recuperada:', parsed.nombre);
        return parsed;
      }
    } catch (error) {
      console.error('[OperadorAuth] ❌ Error al recuperar sesión:', error);
      localStorage.removeItem(STORAGE_KEY);
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(true);

  // Verificar y refrescar sesión al montar el componente
  useEffect(() => {
    const verifyAndRefreshSession = async () => {
      const savedSession = localStorage.getItem(STORAGE_KEY);

      if (savedSession) {
        try {
          const parsed = JSON.parse(savedSession);
          console.log('[OperadorAuth] 🔄 Verificando sesión y refrescando datos...');

          // Obtener datos actualizados del backend
          const updatedEmpleado = await OperadorAuthAPI.getUsuario(parsed.id);

          const empleadoData: EmpleadoOperador = {
            id: updatedEmpleado.id,
            nombre: updatedEmpleado.nombre,
            correo: updatedEmpleado.correo,
            ventanilla: updatedEmpleado.ventanilla || undefined
          };

          // Actualizar localStorage con datos frescos
          localStorage.setItem(STORAGE_KEY, JSON.stringify(empleadoData));
          setEmpleado(empleadoData);
          console.log('[OperadorAuth] ✅ Sesión verificada y actualizada:', empleadoData.nombre);

        } catch (error) {
          console.error('[OperadorAuth] ❌ Error al verificar sesión:', error);
          // Si falla la verificación, mantener la sesión local
          console.log('[OperadorAuth] ⚠️ Usando datos locales de sesión');
        }
      }

      setIsLoading(false);
    };

    verifyAndRefreshSession();
  }, []);

  const handleLoginSuccess = (empleadoData: EmpleadoOperador) => {
    // Guardar en localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(empleadoData));
      console.log('[OperadorAuth] 💾 Sesión guardada en localStorage');
    } catch (error) {
      console.error('[OperadorAuth] ❌ Error al guardar sesión:', error);
    }
    setEmpleado(empleadoData);
  };

  const handleLogout = () => {
    // Limpiar localStorage
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('[OperadorAuth] 🚪 Sesión cerrada y limpiada');
    } catch (error) {
      console.error('[OperadorAuth] ❌ Error al limpiar sesión:', error);
    }
    setEmpleado(null);
  };

  // Mostrar loading mientras se verifica la sesión
  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a1628',
        color: '#D4A520',
        fontFamily: 'Times New Roman, serif',
        fontSize: '1.25rem'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(212, 165, 32, 0.3)',
            borderTop: '3px solid #D4A520',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }} />
          Verificando sesión...
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!empleado) {
    return <LoginOperador onLoginSuccess={handleLoginSuccess} />;
  }

  return <VentanillaOperador empleado={empleado} onLogout={handleLogout} />;
};

export default OperadorAuth;
