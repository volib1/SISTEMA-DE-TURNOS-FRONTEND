import { useState } from 'react';
import LoginOperador from './LoginOperador';
import type { EmpleadoOperador } from './LoginOperador';
import VentanillaOperador from './VentanillaOperador';

const OperadorAuth = () => {
  const [empleado, setEmpleado] = useState<EmpleadoOperador | null>(null);

  const handleLoginSuccess = (empleadoData: EmpleadoOperador) => {
    setEmpleado(empleadoData);
  };

  const handleLogout = () => {
    setEmpleado(null);
  };

  if (!empleado) {
    return <LoginOperador onLoginSuccess={handleLoginSuccess} />;
  }

  return <VentanillaOperador empleado={empleado} onLogout={handleLogout} />;
};

export default OperadorAuth;
