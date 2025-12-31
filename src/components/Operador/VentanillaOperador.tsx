import { useState, useEffect } from 'react';
import { Phone, CheckCircle, Clock, User, Monitor, AlertCircle, RefreshCw, LogOut, Home, UserX } from 'lucide-react';
import '../../styles/VentanillaOperador.css';
import type { EmpleadoOperador } from './LoginOperador';
import { useOperador } from '../../hooks/useOperador';

interface VentanillaOperadorProps {
  empleado?: EmpleadoOperador;
  onLogout?: () => void;
}

export default function VentanillaOperador({ empleado, onLogout }: VentanillaOperadorProps) {
  const [ventanilla, setVentanilla] = useState<string>(empleado?.ventanilla?.id?.toString() || '');
  const [ventanillaNombre, setVentanillaNombre] = useState<string>(empleado?.ventanilla?.nombre || '');
  
  // Hook de operador - solo se activa cuando hay ventanilla seleccionada
  // SignalR maneja las actualizaciones en tiempo real, sin necesidad de polling
  const {
    turnoActual,
    proximosTurnos,
    loading,
    error: hookError,
    llamarTurno,
    finalizarAtencion,
    volverALlamar,
    omitirTurno,
    refrescar,
    limpiarError
  } = useOperador({
    idVentanilla: Number(ventanilla) || 0,
    idEmpleado: empleado?.id,
    autoRefresh: false, // Deshabilitado: SignalR maneja las actualizaciones en tiempo real
    refreshInterval: 5000
  });

  const [error, setError] = useState<string | null>(null);

  // Auto-seleccionar ventanilla si viene del login
  useEffect(() => {
    if (empleado?.ventanilla?.id) {
      setVentanilla(empleado.ventanilla.id.toString());
      setVentanillaNombre(empleado.ventanilla.nombre);
    }
  }, [empleado]);

  // Auto-recargar cada 30 segundos si no tiene ventanilla asignada
  useEffect(() => {
    if (!ventanilla) {
      const intervalId = setInterval(() => {
        console.log('[VentanillaOperador] Auto-recargando para verificar asignación...');
        window.location.reload();
      }, 30000); // 30 segundos

      return () => clearInterval(intervalId);
    }
  }, [ventanilla]);

  // Sincronizar errores del hook
  useEffect(() => {
    if (hookError) {
      setError(hookError);
    }
  }, [hookError]);

  const horaActual = new Date().toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const fechaActual = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const handleLlamarTurno = async () => {
    if (!ventanilla) {
      setError('Debe seleccionar una ventanilla primero');
      return;
    }

    setError(null);
    await llamarTurno();
  };

  const handleVolverALlamar = async () => {
    if (!turnoActual) return;

    setError(null);
    await volverALlamar();
  };

  const handleAtenderTurno = async () => {
    if (!turnoActual) return;

    setError(null);
    await finalizarAtencion();
  };

  const handleOmitirTurno = async () => {
    if (!turnoActual) return;

    setError(null);
    await omitirTurno();
  };

  const handleReiniciar = () => {
    setVentanilla('');
    setError(null);
    limpiarError();
  };

  return (
    <div className="operador-container">
      {/* Header */}
      <div className="operador-header">
        <div className="header-content">
          <h1>ALCALDÍA MUNICIPAL DE SONSONATE OESTE</h1>
          <p className="header-subtitle">Sistema de Gestión de Turnos - Operador</p>
          <div className="datetime-info">
            <Clock size={16} />
            <span>{fechaActual} - {horaActual}</span>
          </div>
        </div>
        
        <div className="header-actions">
          {empleado && (
            <div className="empleado-info">
              <User size={18} />
              <span>{empleado.nombre}</span>
            </div>
          )}
          
          {ventanilla && !empleado && (
            <button onClick={handleReiniciar} className="btn-home">
              <Home size={20} />
              <span>Cambiar Ventanilla</span>
            </button>
          )}

          {onLogout && (
            <button onClick={onLogout} className="btn-logout">
              <LogOut size={20} />
              <span>Cerrar Sesión</span>
            </button>
          )}
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="operador-content">
        {!ventanilla ? (
          /* Sin Ventanilla Asignada - Mensaje de Espera */
          <div className="seleccion-ventanilla">
            <div className="seleccion-card sin-ventanilla">
              <Monitor size={64} className="icon-monitor-waiting" />
              <h2>Sin Ventanilla Asignada</h2>
              <div className="mensaje-espera-container">
                <AlertCircle size={24} className="icon-warning" />
                <p className="mensaje-principal">
                  Actualmente no tiene una ventanilla asignada
                </p>
                <p className="mensaje-secundario">
                  Por favor, espere a que el administrador le asigne una ventanilla para comenzar a atender.
                </p>
              </div>
              
              <div className="acciones-espera">
                <button 
                  onClick={() => window.location.reload()} 
                  disabled={loading} 
                  className="btn-refresh-grande"
                >
                  <RefreshCw size={20} />
                  <span>Verificar Asignación</span>
                </button>
                
                <p className="nota-recarga">
                  La página se verificará automáticamente cada 30 segundos
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Panel de Operación */
          <div className="panel-operacion">
            {/* Info de Ventanilla */}
            <div className="ventanilla-info">
              <Monitor size={24} />
              <div>
                <div className="ventanilla-label">Operando en:</div>
                <div className="ventanilla-nombre">{ventanillaNombre || `Ventanilla ${ventanilla}`}</div>
              </div>
            </div>

            <div className="operacion-grid">
              {/* Panel Principal - Turno Actual */}
              <div className="panel-principal">
                <div className="panel-card turno-card">
                  {turnoActual ? (
                    <>
                      <div className="turno-header">
                        <Phone size={24} className="icon-llamando" />
                        <span>Atendiendo ahora</span>
                      </div>
                      
                      <div className="turno-numero-grande">
                        {turnoActual.codigo}
                      </div>
                      
                      <div className="turno-servicio">
                        {turnoActual.servicio}
                      </div>

                      <div className="botones-accion">
                        <button
                          onClick={handleVolverALlamar}
                          disabled={loading}
                          className="btn-secondary btn-volver-llamar"
                        >
                          <Phone size={20} />
                          <span>{loading ? 'Llamando...' : 'Volver a Llamar'}</span>
                        </button>

                        <button
                          onClick={handleOmitirTurno}
                          disabled={loading}
                          className="btn-warning btn-omitir"
                          title="Marcar como 'No se presentó' y pasar al siguiente turno"
                        >
                          <UserX size={20} />
                          <span>{loading ? 'Procesando...' : 'No se presentó'}</span>
                        </button>

                        <button
                          onClick={handleAtenderTurno}
                          disabled={loading}
                          className="btn-primary btn-finalizar"
                        >
                          <CheckCircle size={20} />
                          <span>{loading ? 'Procesando...' : 'Finalizar Atención'}</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <Clock size={80} className="icon-esperando" />
                      <h3 className="mensaje-espera">No hay turno en atención</h3>
                      <p className="submensaje">Presione el botón para llamar al siguiente turno</p>
                      
                      <button
                        onClick={handleLlamarTurno}
                        disabled={loading || proximosTurnos.length === 0}
                        className={`btn-primary btn-llamar ${loading ? 'loading' : ''}`}
                      >
                        <Phone size={24} className={loading ? 'rotating' : ''} />
                        <span>{loading ? 'Llamando turno...' : 'Llamar Siguiente Turno'}</span>
                      </button>
                      {loading && <p className="loading-text">⏳ Procesando llamado...</p>}
                    </>
                  )}

                  {error && (
                    <div className="error-message">
                      <AlertCircle size={18} />
                      <span>{error}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Panel Lateral - Próximos Turnos */}
              <div className="panel-lateral">
                <div className="panel-card proximos-card">
                  <div className="proximos-header">
                    <Clock size={20} />
                    <h3>Próximos Turnos</h3>
                    <button className="btn-refresh" onClick={refrescar} disabled={loading}>
                      <RefreshCw size={16} />
                    </button>
                  </div>
                  
                  {proximosTurnos.length > 0 ? (
                    <div className="turnos-lista">
                      {proximosTurnos.map((turno) => (
                        <div key={turno.id} className="turno-item">
                          <div className="turno-codigo">{turno.codigo}</div>
                          <div className="turno-info">{turno.servicio}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-turnos">
                      <User size={48} />
                      <p>No hay turnos en espera</p>
                      <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
                        Verifica que la ventanilla tenga servicios asignados
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
