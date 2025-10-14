import React from 'react';
import { useKiosko } from '../../hooks/useKiosko';

const Kiosko: React.FC = () => {
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
    imprimirTicket
  } = useKiosko();

  if (mostrarTicket && ticketGenerado) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Ticket Generado</h1>
        <div style={{ 
          fontSize: '2rem', 
          fontWeight: 'bold', 
          margin: '20px 0',
          color: '#2196f3'
        }}>
          {ticketGenerado.codigo}
        </div>
        <p>Servicio: {ticketGenerado.servicio.nombre}</p>
        <p>Fecha: {ticketGenerado.fechaFormateada}</p>
        <p>Hora: {ticketGenerado.horaFormateada}</p>
        {ticketGenerado.posicionEnCola && (
          <p>Posición en cola: {ticketGenerado.posicionEnCola}</p>
        )}
        {ticketGenerado.tiempoEstimadoEspera && (
          <p>Tiempo estimado: {ticketGenerado.tiempoEstimadoEspera}</p>
        )}
        <div style={{ margin: '20px 0' }}>
          <button onClick={imprimirTicket} style={{ margin: '5px' }}>
            Imprimir
          </button>
          <button onClick={reiniciarSeleccion} style={{ margin: '5px' }}>
            Nuevo Ticket
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Kiosko - Generación de Tickets</h1>
      
      {error && (
        <div style={{ 
          color: 'red', 
          background: '#ffebee', 
          padding: '10px', 
          marginBottom: '20px',
          borderRadius: '4px'
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <p>Cargando servicios...</p>
      ) : (
        <div>
          <h2>Selecciona un servicio:</h2>
          <div style={{ display: 'grid', gap: '10px', marginBottom: '20px' }}>
            {servicios.map((servicio) => (
              <button
                key={servicio.id}
                onClick={() => seleccionarServicio(servicio.id)}
                style={{
                  padding: '15px',
                  border: servicioSeleccionado === servicio.id ? '2px solid #2196f3' : '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: servicioSeleccionado === servicio.id ? '#e3f2fd' : 'white',
                  cursor: 'pointer'
                }}
                disabled={generandoTicket}
              >
                <h3>{servicio.nombre}</h3>
                {servicio.descripcion && <p>{servicio.descripcion}</p>}
              </button>
            ))}
          </div>
          
          <button
            onClick={generarTicket}
            disabled={!servicioSeleccionado || generandoTicket}
            style={{
              padding: '15px 30px',
              backgroundColor: '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1.1rem',
              cursor: servicioSeleccionado && !generandoTicket ? 'pointer' : 'not-allowed',
              opacity: servicioSeleccionado && !generandoTicket ? 1 : 0.5
            }}
          >
            {generandoTicket ? 'Generando...' : 'Generar Ticket'}
          </button>
        </div>
      )}
    </div>
  );
};

export default Kiosko;