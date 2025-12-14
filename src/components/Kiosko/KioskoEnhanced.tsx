import React from 'react';
import { 
  Monitor, 
  Calendar, 
  CheckCircle, 
  Printer, 
  Clock, 
  Users, 
  RefreshCw,
  AlertCircle,
  ArrowRight,
  Home
} from 'lucide-react';
import { useKiosko } from '../../hooks/useKiosko';
import '../../styles/Kiosko.css';

const KioskoEnhanced: React.FC = () => {
  const {
    servicios,
    servicioSeleccionado,
    ticketGenerado,
    loading,
    generandoTicket,
    error,
    mostrarTicket,
    seleccionarServicio,
    generarTicket,
    reiniciarSeleccion,
    actualizarServicios,
    clearError,
    imprimirTicket,
  } = useKiosko();

  const [countdown, setCountdown] = React.useState<number | null>(null);

  // Iniciar countdown cuando se muestra el ticket
  React.useEffect(() => {
    if (mostrarTicket && ticketGenerado) {
      setCountdown(3);
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setCountdown(null);
    }
  }, [mostrarTicket, ticketGenerado]);

  const handleGenerarTicketClick = async () => {
    if (!servicioSeleccionado) return;
    await generarTicket();
  };

  const fechaActual = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const horaActual = new Date().toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  });

  if (mostrarTicket && ticketGenerado) {
    return (
      <div className="kiosko-container">
        <div className="kiosko-header">
          <div className="header-content">
            <h1>ALCALDÍA MUNICIPAL DE SONSONATE OESTE</h1>
            <p className="header-subtitle">Sistema de Gestión de Turnos</p>
          </div>
        </div>

        <div className="ticket-success-container">
          <div className="ticket-success">
            <div className="success-icon">
              <CheckCircle size={40} />
            </div>
            
            <h2>¡Ticket Generado Exitosamente!</h2>
            
            <div className="ticket-display">
              <div className="ticket-number">
                {ticketGenerado.codigo}
              </div>
              <p className="ticket-subtitle">Su número de turno</p>
            </div>

            <div className="ticket-details">
              <div className="detail-row">
                <span className="label">Servicio:</span>
                <span className="value">{ticketGenerado.servicio.nombre}</span>
              </div>
              <div className="detail-row">
                <span className="label">Fecha:</span>
                <span className="value">{ticketGenerado.fechaFormateada}</span>
              </div>
              <div className="detail-row">
                <span className="label">Hora:</span>
                <span className="value">{ticketGenerado.horaFormateada}</span>
              </div>
              {ticketGenerado.posicionEnCola && (
                <div className="detail-row">
                  <span className="label">Posición en cola:</span>
                  <span className="value">{ticketGenerado.posicionEnCola}</span>
                </div>
              )}
              {ticketGenerado.tiempoEstimadoEspera && (
                <div className="detail-row">
                  <span className="label">Tiempo estimado:</span>
                  <span className="value">{ticketGenerado.tiempoEstimadoEspera}</span>
                </div>
              )}
            </div>

            <div className="ticket-instructions">
              <AlertCircle size={16} />
              <p>Conserve este ticket y espere a ser llamado en las pantallas del área de espera.</p>
            </div>

            {countdown !== null && (
              <div className="auto-print-countdown">
                <div className="countdown-icon">
                  <Printer size={20} />
                </div>
                <p>Imprimiendo automáticamente en <strong>{countdown}</strong> segundo{countdown !== 1 ? 's' : ''}...</p>
                <div className="countdown-progress">
                  <div 
                    className="countdown-bar" 
                    style={{ 
                      width: `${((3 - countdown) / 3) * 100}%`,
                      transition: 'width 1s linear'
                    }}
                  />
                </div>
                <p className="countdown-subtitle">El ticket se imprimirá automáticamente y volverá a la pantalla principal</p>
              </div>
            )}

            <div className="ticket-actions">
              <button onClick={imprimirTicket} className="btn-print">
                <Printer size={18} />
                Imprimir Ticket
              </button>
              <button onClick={reiniciarSeleccion} className="btn-new-ticket">
                <Home size={18} />
                Generar Nuevo Ticket
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="kiosko-container">
      <div className="kiosko-header">
        <div className="header-content">
          <h1>ALCALDÍA MUNICIPAL DE SONSONATE OESTE</h1>
          <p className="header-subtitle">Sistema de Gestión de Turnos</p>
          <div className="datetime-info">
            <Calendar size={18} />
            <span>{fechaActual} - {horaActual}</span>
            <button 
              onClick={actualizarServicios} 
              className={`refresh-btn ${loading ? 'loading' : ''}`}
              title="Actualizar servicios"
            >
              <RefreshCw size={16} />
            </button>
            
          </div>
        </div>
      </div>

      {error && (
        <div className={error.includes('⚠️') ? "warning-message" : "error-message"}>
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={clearError} className="error-close">×</button>
        </div>
      )}

      <div className="kiosko-content">
        <div className="instructions">
          <h2>Por favor, seleccione el servicio que necesita</h2>
          <p>Toque el servicio correspondiente para obtener su turno</p>
        </div>

        {loading ? (
          <div className="loading-services">
            <div className="spinner"></div>
            <p>Cargando servicios disponibles...</p>
          </div>
        ) : servicios.length === 0 ? (
          <div className="no-services">
            <Monitor size={48} />
            <h3>No hay servicios disponibles</h3>
            <p>Por favor, contacte al personal administrativo</p>
            <button onClick={actualizarServicios} className="retry-btn">
              <RefreshCw size={16} />
              Intentar de nuevo
            </button>
          </div>
        ) : (
          <>
            <div className="services-grid">
              {servicios.map((servicio) => (
                <button
                  key={servicio.id}
                  onClick={() => seleccionarServicio(servicio.id)}
                  className={`service-card ${servicioSeleccionado === servicio.id ? 'selected' : ''}`}
                  disabled={generandoTicket}
                >
                  <div className="service-icon">
                    <Monitor size={32} />
                  </div>
                  <div className="service-info">
                    <h3>{servicio.nombre}</h3>
                    {servicio.descripcion && <p>{servicio.descripcion}</p>}
                  </div>
                  {servicioSeleccionado === servicio.id && (
                    <div className="selection-indicator">
                      <CheckCircle size={20} />
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="action-section">
              {servicioSeleccionado && (
                <div className="selected-service-info">
                  <div className="selected-indicator">
                    <CheckCircle size={16} />
                    <span>
                      Servicio seleccionado: <strong>{servicios.find(s => s.id === servicioSeleccionado)?.nombre}</strong>
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={handleGenerarTicketClick}
                disabled={!servicioSeleccionado || generandoTicket}
                className="generate-ticket-btn"
              >
                {generandoTicket ? (
                  <>
                    <div className="btn-spinner"></div>
                    Generando ticket...
                  </>
                ) : (
                  <>
                    <ArrowRight size={20} />
                    OBTENER TURNO
                  </>
                )}
              </button>

              {servicioSeleccionado && !generandoTicket && (
                <p className="action-hint">
                  Toque "OBTENER TURNO" para generar su ticket
                </p>
              )}
            </div>
          </>
        )}
      </div>

      <div className="kiosko-footer">
        <div className="footer-stats">
          <div className="stat-item">
            <Users size={16} />
            <span>Servicios disponibles: {servicios.length}</span>
          </div>
          <div className="stat-item">
            <Clock size={16} />
            <span>Atención continua</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KioskoEnhanced;
