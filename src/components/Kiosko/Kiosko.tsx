import { useEffect, useState } from 'react';
import { Monitor, Calendar, CheckCircle, Printer } from 'lucide-react';
import { KioskoAPI } from '../../services/kiosko.service';
import type { TicketDTO } from '../../services/ticket.service';

export default function Kiosko() {
  const [services, setServices] = useState<{ id: number; nombre: string }[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [ticket, setTicket] = useState<TicketDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [showTicket, setShowTicket] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const data = await KioskoAPI.serviciosActivos();
      // normaliza a { id, nombre }
      setServices((Array.isArray(data) ? data : []).map(s => ({ id: s.id, nombre: s.nombre })));
    } catch (error) {
      console.error('Error cargando servicios:', error);
      setError('Error al cargar los servicios disponibles');
    }
  };

  async function handleTurno() {
    if (!selected || loading) return;

    setLoading(true);
    setError(null);
    try {
      const t = await KioskoAPI.crearTicket(selected);
      setTicket(t as unknown as TicketDTO); // t trae { id, codigo, fechaCreacion }
      setShowTicket(true);
    } catch (error) {
      console.error('Error emitiendo ticket:', error);
      setError('Error al generar el ticket. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  const resetSelection = () => {
    setSelected(null);
    setTicket(null);
    setShowTicket(false);
    setError(null);
  };

  const fecha = new Date();
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const anio = fecha.getFullYear();
  const fechaActual = `${dia}/${mes}/${anio}`;
  const horaActual = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  if (showTicket && ticket) {
    const servicioNombre =
      ticket.servicio?.nombre ??
      services.find(s => s.id === selected)?.nombre ??
      '—';

    return (
      <div style={{ padding: '24px', minHeight: '100vh', background: 'var(--surface)' }}>
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            color: 'white',
            padding: '24px',
            borderRadius: '16px',
            textAlign: 'center',
            marginBottom: '32px',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>
            ALCALDÍA MUNICIPAL DE ACAJUTLA
          </div>
          <div style={{ fontSize: '16px', opacity: 0.9 }}>Sistema de Gestión de Turnos</div>
        </div>

        {/* Ticket Success */}
        <div style={{ maxWidth: '400px', margin: '0 auto' }}>
          <div className="panel" style={{ textAlign: 'center', padding: '32px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                color: 'white',
              }}
            >
              <CheckCircle size={32} />
            </div>

            <h3 style={{ margin: '0 0 16px', fontSize: '24px', color: 'var(--text)' }}>
              ¡Ticket Generado!
            </h3>

            <div
              style={{
                background: 'var(--primary-50)',
                padding: '24px',
                borderRadius: '16px',
                marginBottom: '24px',
              }}
            >
              <div
                style={{
                  fontSize: '48px',
                  fontWeight: 700,
                  color: 'var(--primary)',
                  marginBottom: '8px',
                }}
              >
                {ticket.codigo}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--muted)' }}>Su número de turno</div>
            </div>

            <div style={{ marginBottom: '24px', textAlign: 'left' }}>
              <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '8px' }}>
                Detalles del Ticket:
              </div>
              <div
                style={{
                  padding: '16px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                }}
              >
                <div style={{ marginBottom: '8px' }}>
                  <strong>Servicio:</strong> {servicioNombre}
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Fecha:</strong> {fechaActual}
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Hora:</strong> {horaActual}
                </div>
                <div>
                  <strong>Estado:</strong> {'Pendiente'}
                </div>
              </div>
            </div>

            <div
              style={{
                padding: '16px',
                background: 'var(--warning-50)',
                borderRadius: '12px',
                marginBottom: '24px',
                fontSize: '14px',
                color: 'var(--warning-dark)',
              }}
            >
              Por favor conserve este ticket y espere a ser llamado en las pantallas.
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => window.print()} className="btn" style={{ flex: 1 }}>
                <Printer size={16} style={{ marginRight: '8px' }} />
                Imprimir
              </button>
              <button onClick={resetSelection} className="btn btn-primary" style={{ flex: 1 }}>
                Nuevo Ticket
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: 'var(--surface)' }}>
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, var(--primary), var(--accent))',
          color: 'white',
          padding: '32px',
          borderRadius: '16px',
          textAlign: 'center',
          marginBottom: '32px',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
          ALCALDÍA MUNICIPAL DE SONSONATE OESTE
        </div>
        <div style={{ fontSize: '18px', opacity: 0.9, marginBottom: '16px' }}>
          Sistema de Gestión de Turnos
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '16px',
          }}
        >
          <Calendar size={18} />
          {fechaActual} - {horaActual}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div
          style={{
            background: 'var(--danger-50)',
            color: 'var(--danger)',
            padding: '16px',
            borderRadius: '12px',
            marginBottom: '24px',
            textAlign: 'center',
            border: '1px solid var(--danger-200)',
          }}
        >
          {error}
        </div>
      )}

      {/* Instructions */}
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div className="section-header" style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h3 style={{ fontSize: '24px', marginBottom: '8px' }}>Por favor, seleccione el trámite:</h3>
          <p style={{ color: 'var(--muted)', fontSize: '16px' }}>
            Elija el servicio que necesita para obtener su turno
          </p>
        </div>

        {/* Services Grid */}
        {services.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
            No hay servicios disponibles en este momento
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '16px',
              marginBottom: '32px',
            }}
          >
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelected(s.id)}
                style={{
                  padding: '24px',
                  border:
                    selected === s.id ? '2px solid var(--primary)' : '2px solid var(--border)',
                  borderRadius: '16px',
                  background: selected === s.id ? 'var(--primary-50)' : 'var(--surface)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'center',
                  fontSize: '16px',
                  fontWeight: 500,
                  color: selected === s.id ? 'var(--primary)' : 'var(--text)',
                  transform: selected === s.id ? 'translateY(-2px)' : 'translateY(0)',
                  boxShadow: selected === s.id ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: selected === s.id ? 'var(--primary)' : 'var(--primary-50)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    color: selected === s.id ? 'white' : 'var(--primary)',
                  }}
                >
                  <Monitor size={24} />
                </div>
                {s.nombre}
              </button>
            ))}
          </div>
        )}

        {/* Action Button */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={handleTurno}
            disabled={!selected || loading || services.length === 0}
            className="btn btn-primary"
            style={{
              fontSize: '20px',
              padding: '20px 40px',
              minWidth: '200px',
              opacity: !selected || loading || services.length === 0 ? 0.5 : 1,
              cursor: !selected || loading || services.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Generando...' : 'OBTENER TURNO'}
          </button>

          {selected && (
            <div style={{ marginTop: '16px', fontSize: '14px', color: 'var(--muted)' }}>
              Servicio seleccionado:{' '}
              <strong>{services.find((s) => s.id === selected)?.nombre}</strong>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
