import React, { useState } from 'react';
import { 
  Users, 
  Monitor, 
  Settings, 
  Plus, 
  X, 
  Check, 
  AlertCircle, 
  Clock,
  User,
  RefreshCw
} from 'lucide-react';
import { useAsignacionVentanilla } from '../../hooks/useAsignacionVentanilla';
import './AsignacionVentanilla.css';

const AsignacionVentanilla: React.FC = () => {
  const {
    asignaciones,
    ventanillas,
    empleados,
    servicios,
    loading,
    error,
    procesando,
    refresh,
    crearAsignacion,
    cerrarAsignacion,
    clearError
  } = useAsignacionVentanilla();

  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'empleado' | 'servicio'>('empleado');
  const [selectedVentanilla, setSelectedVentanilla] = useState<number | null>(null);
  const [selectedEmpleado, setSelectedEmpleado] = useState<number | null>(null);
  const [selectedServicios, setSelectedServicios] = useState<number[]>([]); // Para múltiples servicios

  const ventanillasDisponibles = ventanillas.filter(v => v.activa);
  
  // Empleados disponibles: activos que NO tienen asignación activa
  const empleadosDisponibles = empleados.filter(e => {
    if (!e.activo) return false;
    
    // Verificar si este empleado tiene una asignación activa
    const tieneAsignacionActiva = asignaciones.some(a => 
      a.empleado.id === e.id && !a.fechaFin
    );
    
    return !tieneAsignacionActiva;
  });
  
  // Debug: mostrar todos los servicios disponibles
  console.log('[AsignacionVentanilla Component] Total servicios:', servicios.length);
  console.log('[AsignacionVentanilla Component] Servicios:', servicios);
  
  const serviciosActivos = servicios.filter(s => {
    console.log(`[AsignacionVentanilla Component] Servicio "${s.nombre}" - activo:`, s.activo);
    return s.activo;
  });
  
  console.log('[AsignacionVentanilla Component] Servicios activos:', serviciosActivos.length);

  // Obtener asignaciones activas (sin fecha de fin)
  const asignacionesActivas = asignaciones.filter(a => {
    const esActiva = !a.fechaFin;
    console.log(`[Filtro] Asignación ${a.id} - fechaFin:`, a.fechaFin, '- Activa:', esActiva);
    return esActiva;
  });

  // Debug: Log para verificar el estado de las asignaciones
  React.useEffect(() => {
    console.log('[AsignacionVentanilla Component] Total asignaciones:', asignaciones.length);
    console.log('[AsignacionVentanilla Component] Asignaciones activas:', asignacionesActivas.length);
    console.log('[AsignacionVentanilla Component] Lista de asignaciones activas:', asignacionesActivas);
    
    // Verificar cada ventanilla
    ventanillas.forEach(v => {
      const asignacion = asignacionesActivas.find(a => a.ventanilla.id === v.id);
      console.log(`[AsignacionVentanilla Component] Ventanilla ${v.id} (${v.nombre}):`, asignacion ? 'OCUPADA' : 'LIBRE', asignacion);
    });
  }, [asignaciones, asignacionesActivas, ventanillas]);

  // Verificar si una ventanilla tiene asignación activa
  const getAsignacionActiva = (ventanillaId: number) => {
    const asignacion = asignacionesActivas.find(a => a.ventanilla.id === ventanillaId);
    console.log(`[getAsignacionActiva] Buscando asignación para ventanilla ${ventanillaId}:`, asignacion);
    return asignacion;
  };

  const handleAsignarEmpleado = () => {
    setModalType('empleado');
    setSelectedVentanilla(null);
    setSelectedEmpleado(null);
    setSelectedServicios([]); // Limpiar servicios seleccionados
    setShowModal(true);
  };

  const handleAsignarServicio = () => {
    setModalType('servicio');
    setSelectedVentanilla(null);
    setSelectedServicios([]);
    setShowModal(true);
  };

  const handleToggleServicio = (servicioId: number) => {
    setSelectedServicios(prev => {
      if (prev.includes(servicioId)) {
        return prev.filter(id => id !== servicioId);
      } else {
        return [...prev, servicioId];
      }
    });
  };

  const handleConfirmarAsignacion = async () => {
    if (modalType === 'empleado' && selectedVentanilla && selectedEmpleado) {
      const success = await crearAsignacion({
        idVentanilla: selectedVentanilla,
        idEmpleado: selectedEmpleado,
        servicios: selectedServicios
      });
      
      if (success) {
        setShowModal(false);
        setSelectedVentanilla(null);
        setSelectedEmpleado(null);
        setSelectedServicios([]);
      }
    }
    // TODO: Implementar asignación de servicio cuando esté el API
  };

  const handleCerrarAsignacion = async (asignacionId: number) => {
    console.log('[AsignacionVentanilla Component] Intentando cerrar asignación ID:', asignacionId);
    
    if (window.confirm('¿Estás seguro de que deseas cerrar esta asignación?')) {
      console.log('[AsignacionVentanilla Component] Usuario confirmó el cierre');
      
      try {
        const resultado = await cerrarAsignacion(asignacionId);
        console.log('[AsignacionVentanilla Component] Resultado del cierre:', resultado);
        
        if (resultado) {
          console.log('[AsignacionVentanilla Component] ✅ Asignación cerrada exitosamente');
        } else {
          console.log('[AsignacionVentanilla Component] ❌ Error al cerrar asignación');
        }
      } catch (error) {
        console.error('[AsignacionVentanilla Component] Error capturado:', error);
      }
    } else {
      console.log('[AsignacionVentanilla Component] Usuario canceló el cierre');
    }
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (inicio: string) => {
    const start = new Date(inicio);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="asignacion-container">
      <div className="asignacion-header">
        <div>
          <h1>Asignación de Ventanillas</h1>
          <p>Gestiona empleados y servicios asignados a ventanillas</p>
        </div>
        <div className="header-actions">
          <button 
            onClick={refresh} 
            className={`btn-refresh ${loading ? 'loading' : ''}`}
            disabled={loading}
            title="Actualizar"
          >
            <RefreshCw size={16} />
          </button>
          <button onClick={handleAsignarEmpleado} className="btn-primary">
            <Plus size={16} />
            Asignar Empleado
          </button>
          <button onClick={handleAsignarServicio} className="btn-secondary">
            <Settings size={16} />
            Configurar Servicios
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={clearError} className="btn-close">×</button>
        </div>
      )}

      {/* Grid de Ventanillas */}
      <div className="ventanillas-grid">
        {ventanillasDisponibles.map(ventanilla => {
          const asignacion = getAsignacionActiva(ventanilla.id);
          return (
            <div 
              key={ventanilla.id} 
              className={`ventanilla-card ${asignacion ? 'ocupada' : 'libre'}`}
            >
              <div className="ventanilla-header">
                <div className="ventanilla-info">
                  <Monitor size={18} />
                  <h3>{ventanilla.nombre}</h3>
                </div>
                <div className={`status-indicator ${asignacion ? 'ocupada' : 'libre'}`}>
                  {asignacion ? 'Ocupada' : 'Libre'}
                </div>
              </div>

              <div className="ventanilla-content">
                {asignacion ? (
                  <div className="asignacion-info">
                    <div className="empleado-info">
                      <User size={16} />
                      <div>
                        <strong>{asignacion.empleado.nombre}</strong>
                        {asignacion.empleado.correo && (
                          <small>{asignacion.empleado.correo}</small>
                        )}
                      </div>
                    </div>
                    
                    <div className="tiempo-info">
                      <Clock size={14} />
                      <span>Desde {formatTime(asignacion.fechaInicio)}</span>
                      <span className="duracion">({formatDuration(asignacion.fechaInicio)})</span>
                    </div>

                    <div className="ventanilla-actions">
                      <button 
                        onClick={() => handleCerrarAsignacion(asignacion.id)}
                        className="btn-danger-sm"
                        disabled={procesando}
                      >
                        <X size={14} />
                        Finalizar Turno
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="ventanilla-libre">
                    <p>Ventanilla disponible</p>
                    <button 
                      onClick={() => {
                        setSelectedVentanilla(ventanilla.id);
                        handleAsignarEmpleado();
                      }}
                      className="btn-assign"
                    >
                      <Plus size={14} />
                      Asignar Empleado
                    </button>
                  </div>
                )}
              </div>

              {/* Servicios de la ventanilla */}
              <div className="servicios-ventanilla">
                <h4>Servicios:</h4>
                {ventanilla.servicios && ventanilla.servicios.length > 0 ? (
                  <div className="servicios-list">
                    {ventanilla.servicios.map(servicio => (
                      <span 
                        key={servicio.id} 
                        className={`service-tag ${servicio.activo ? 'activo' : 'inactivo'}`}
                      >
                        {servicio.servicio}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="no-servicios">Sin servicios configurados</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Estadísticas */}
      <div className="stats-section">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon success">
              <Check size={20} />
            </div>
            <div>
              <h3>{asignacionesActivas.length}</h3>
              <p>Ventanillas Ocupadas</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon info">
              <Monitor size={20} />
            </div>
            <div>
              <h3>{ventanillasDisponibles.length - asignacionesActivas.length}</h3>
              <p>Ventanillas Libres</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon primary">
              <Users size={20} />
            </div>
            <div>
              <h3>{empleadosDisponibles.length}</h3>
              <p>Empleados Disponibles</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Asignación */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>
                {modalType === 'empleado' ? 'Asignar Empleado a Ventanilla' : 'Asignar Servicios'}
              </h2>
              <button onClick={() => setShowModal(false)} className="btn-close">
                <X size={16} />
              </button>
            </div>

            <div className="modal-content">
              {modalType === 'empleado' ? (
                <>
                  <div className="form-group">
                    <label>Ventanilla:</label>
                    <select 
                      value={selectedVentanilla || ''} 
                      onChange={(e) => setSelectedVentanilla(Number(e.target.value))}
                    >
                      <option value="">Seleccionar ventanilla...</option>
                      {ventanillasDisponibles
                        .filter(v => !getAsignacionActiva(v.id))
                        .map(ventanilla => (
                          <option key={ventanilla.id} value={ventanilla.id}>
                            {ventanilla.nombre}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Empleado:</label>
                    <select 
                      value={selectedEmpleado || ''} 
                      onChange={(e) => setSelectedEmpleado(Number(e.target.value))}
                    >
                      <option value="">Seleccionar empleado...</option>
                      {empleadosDisponibles.map(empleado => (
                        <option key={empleado.id} value={empleado.id}>
                          {empleado.nombre} ({empleado.rol})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Servicios que atenderá:</label>
                    <p className="help-text">
                      Selecciona los servicios que este empleado atenderá en la ventanilla asignada
                    </p>
                    <div className="servicios-checkbox-list">
                      {servicios.length === 0 ? (
                        <p className="warning-text">
                          ⚠️ No hay servicios disponibles. Crea servicios en la sección de Servicios.
                        </p>
                      ) : servicios.map(servicio => (
                        <label key={servicio.id} className="checkbox-item">
                          <input
                            type="checkbox"
                            checked={selectedServicios.includes(servicio.id)}
                            onChange={() => handleToggleServicio(servicio.id)}
                          />
                          <span>
                            {servicio.nombre}
                            {!servicio.activo && <span style={{ color: '#dc2626', marginLeft: '8px' }}>(Inactivo)</span>}
                          </span>
                        </label>
                      ))}
                    </div>
                    {selectedServicios.length === 0 && servicios.length > 0 && (
                      <p className="warning-text">
                        ⚠️ Debes seleccionar al menos un servicio
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="form-group">
                  <p>Configuración de servicios próximamente...</p>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowModal(false)} className="btn-cancel">
                Cancelar
              </button>
              <button 
                onClick={handleConfirmarAsignacion}
                className="btn-confirm"
                disabled={
                  procesando || 
                  (modalType === 'empleado' && (!selectedVentanilla || !selectedEmpleado || selectedServicios.length === 0))
                }
              >
                {procesando ? 'Procesando...' : 'Confirmar Asignación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AsignacionVentanilla;