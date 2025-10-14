import React, { useState } from 'react';
import { Search, Home, Users, Settings, Monitor, UserCheck, 
         ChevronDown, Menu, X, LogOut, Building, Ticket } from 'lucide-react';
import { useAuth } from '../components/Auth/AuthContext';
import './AdminLayout.css';

// Importar vistas
import Dashboard from '../components/Dashboard/Dashboard';
import ServicioCrud from '../components/Administrador/Servicio';
import VentanillaCrud from '../components/Administrador/Ventanilla';
import AsignacionVentanilla from '../components/Administrador/AsignacionVentanilla';
import RolCrud from '../components/Administrador/Rol';
import Empleados from '../components/Empleado/Empleado';
import Kiosko from '../components/Kiosko/KioskoEnhanced';
import PantallaTurno from '../components/Pantalla/PantallaEspera';
import AdminMultimedia from '../components/Pantalla/AdminMultimedia';
import Tickets from '../components/Ticket/Ticket';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ComponentType;
}

interface MenuGroup {
  id: string;
  label: string;
  items: MenuItem[];
  collapsed?: boolean;
}

const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuGroups, setMenuGroups] = useState<MenuGroup[]>([
    {
      id: 'main',
      label: 'Principal',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: <Home size={18} />, component: Dashboard }
      ]
    },
    {
      id: 'management',
      label: 'Gestión',
      items: [
        { id: 'servicios', label: 'Servicios', icon: <Settings size={18} />, component: ServicioCrud },
        { id: 'ventanillas', label: 'Ventanillas', icon: <Building size={18} />, component: VentanillaCrud },
        { id: 'asignaciones', label: 'Asignar Ventanillas', icon: <UserCheck size={18} />, component: AsignacionVentanilla },
        { id: 'empleado', label: 'Empleados', icon: <Users size={18} />, component: Empleados },
        { id: 'roles', label: 'Roles', icon: <UserCheck size={18} />, component: RolCrud }
      ]
    },
    {
      id: 'operations',
      label: 'Operaciones',
      items: [
        { id: 'kiosko', label: 'Kiosko', icon: <Monitor size={18} />, component: Kiosko },
        { id: 'tickets', label: 'Tickets', icon: <Ticket size={18} />, component: Tickets },
        { id: 'pantalla', label: 'Pantalla de Espera', icon: <Monitor size={18} />, component: PantallaTurno },
        { id: 'multimedia', label: 'Gestión Multimedia', icon: <Settings size={18} />, component: AdminMultimedia }
      ]
    }
  ]);

  const getCurrentComponent = () => {
    for (const group of menuGroups) {
      for (const item of group.items) {
        if (item.id === currentView) return item.component;
      }
    }
    return Dashboard;
  };

  const toggleGroupCollapse = (groupId: string) => {
    setMenuGroups(groups => 
      groups.map(group => 
        group.id === groupId ? { ...group, collapsed: !group.collapsed } : group
      )
    );
  };

  const handleMenuItemClick = (itemId: string) => {
    setCurrentView(itemId);
    setMobileMenuOpen(false);
  };

  const CurrentComponent = getCurrentComponent();

  return (
    <div className={`admin-container ${sidebarCollapsed ? 'is-collapsed' : ''}`}>
      {/* Sidebar */}
      <aside className={`admin-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-head">
          <button className="brand" onClick={() => setCurrentView('dashboard')}>
            <div className="brand-icon">
              <Building size={16} />
            </div>
            <span className="brand-text">Panel</span>
          </button>
          <button 
            className="sidebar-toggle desktop"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <Menu size={16} />
          </button>
          <button 
            className="sidebar-close mobile"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={16} />
          </button>
        </div>

        <div className="sidebar-search">
          <Search size={14} />
          <input 
            type="text" 
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="menu-groups">
          {menuGroups.map(group => (
            <div key={group.id} className="menu-group">
              <button 
                className="group-header"
                onClick={() => toggleGroupCollapse(group.id)}
              >
                <span>{group.label}</span>
                <ChevronDown
                  size={12}
                  style={{
                    transform: group.collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease'
                  }}
                />
              </button>
              <ul className={`menu-list ${group.collapsed ? 'collapsed' : ''}`}>
                {group.items
                  .filter(item => 
                    searchQuery === '' || 
                    item.label.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map(item => (
                    <li key={item.id}>
                      <button
                        className={`menu-item ${currentView === item.id ? 'active' : ''}`}
                        onClick={() => handleMenuItemClick(item.id)}
                      >
                        <div className="icon-wrap">{item.icon}</div>
                        <span className="label">{item.label}</span>
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="avatar">
              {user?.nombre.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="meta">
              <div className="name">{user?.nombre || 'Usuario'}</div>
              <div className="role">{user?.rol || 'Sin rol'}</div>
            </div>
          </div>
          <button className="btn logout" onClick={logout}>
            <LogOut size={14} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="admin-main">
        <div className="admin-content">
          <CurrentComponent />
        </div>
      </main>

      {mobileMenuOpen && (
        <div 
          className="modal-overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminLayout;
