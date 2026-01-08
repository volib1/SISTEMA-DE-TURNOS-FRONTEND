import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MonitorPlay, 
  Tablet, 
  Tv
} from 'lucide-react';
import './Launcher.css';

interface ModuloCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
}

export default function Launcher() {
  const navigate = useNavigate();

  const modulos: ModuloCard[] = [
    {
      id: 'admin',
      title: 'Administración',
      description: 'Panel de control y gestión del sistema',
      icon: <LayoutDashboard size={64} />,
      path: '/admin',
      color: '#4A7AB5' // blue-main
    },
    {
      id: 'operador',
      title: 'Operador',
      description: 'Gestión de turnos y atención',
      icon: <MonitorPlay size={64} />,
      path: '/operador',
      color: '#6B9AD0' // blue-light
    },
    {
      id: 'kiosko',
      title: 'Kiosko',
      description: 'Generación de tickets para clientes',
      icon: <Tablet size={64} />,
      path: '/kiosko',
      color: '#D4A520' // yellow-main
    },
    {
      id: 'pantalla',
      title: 'Pantalla',
      description: 'Visualización de turnos en tiempo real',
      icon: <Tv size={64} />,
      path: '/pantalla',
      color: '#E8C44A' // yellow-light
    }
  ];

  const handleModuloClick = (path: string) => {
    console.log('[Launcher] Navegando a:', path);
    navigate(path);
  };

  return (
    <div className="launcher-container">
      <div className="launcher-header">
        <div className="launcher-logo">
          <h1>SISTEMA DE GESTIÓN DE TURNOS</h1>
        </div>
        <p className="launcher-subtitle">Seleccione el módulo al que desea acceder</p>
      </div>

      <div className="launcher-grid">
        {modulos.map((modulo) => (
          <div
            key={modulo.id}
            className="modulo-card"
            onClick={() => handleModuloClick(modulo.path)}
            style={{ '--card-color': modulo.color } as React.CSSProperties}
          >
            <div className="modulo-icon" style={{ color: modulo.color }}>
              {modulo.icon}
            </div>
            <h2 className="modulo-title">{modulo.title}</h2>
            <p className="modulo-description">{modulo.description}</p>
            <div className="modulo-arrow">→</div>
          </div>
        ))}
      </div>

      <div className="launcher-version">
        <p>© 2025 - Todos los derechos reservados</p>
      </div>
    </div>
  );
}
