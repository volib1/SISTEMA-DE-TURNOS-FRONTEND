import { useState, useEffect } from 'react';
import { Search, Calendar, CalendarDays, List } from 'lucide-react';
import { TicketAPI, type TicketDTO } from '../../services/ticket.service';
import { EstadoTicketAPI, type EstadoTicketDTO } from '../../services/estado-ticket.service';

const TicketCrud: React.FC = () => {
  const [tickets, setTickets] = useState<TicketDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<TicketDTO | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [estados, setEstados] = useState<EstadoTicketDTO[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  const getFechaFromTicket = (t: TicketDTO): Date | null => {
    const raw = (t as any).fechaCreacion ?? (t as any).fecha_creacion;
    if (!raw) return null;

    const iso =
      typeof raw === 'string' &&
      !raw.endsWith('Z') &&
      !raw.includes('+') &&
      !raw.includes('-', 10)
        ? `${raw}Z`
        : raw;

    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  };

  // Fecha/hora local (America/El_Salvador)
  const formatFechaLocal = (fechaISO?: string) => {
    if (!fechaISO) return 'N/A';
    const iso =
      !fechaISO.endsWith('Z') &&
      !fechaISO.includes('+') &&
      !fechaISO.includes('-', 10)
        ? `${fechaISO}Z`
        : fechaISO;

    const d = new Date(iso);
    if (isNaN(d.getTime())) return 'N/A';

    return d.toLocaleString('es-SV', {
      timeZone: 'America/El_Salvador',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  useEffect(() => {
    fetchTicketsHoy();
  }, []);

  const fetchTicketsHoy = async () => {
    setLoading(true);
    try {
      const [ticketResponse, estadosList] = await Promise.all([
        TicketAPI.listar(),
        EstadoTicketAPI.listar(),
      ]);

      const all = Array.isArray(ticketResponse.items) ? ticketResponse.items : [];
      const now = new Date();
      const inicio = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const fin = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      const hoy = all.filter((t) => {
        const d = getFechaFromTicket(t);
        return d ? d >= inicio && d <= fin : false;
      });

      setTickets(hoy);
      setEstados(Array.isArray(estadosList) ? estadosList : []);
    } finally {
      setLoading(false);
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [ticketResponse, estadosList] = await Promise.all([
        TicketAPI.listar(),
        EstadoTicketAPI.listar(),
      ]);

      setTickets(Array.isArray(ticketResponse.items) ? ticketResponse.items : []);
      setEstados(Array.isArray(estadosList) ? estadosList : []);
    } finally {
      setLoading(false);
    }
  };

  const getEstadoBadge = (estado?: { id: number; nombre: string }) => {
    const nombre = (estado?.nombre ?? '').toLowerCase();
    if (nombre.includes('pend')) return { text: estado?.nombre ?? 'Pendiente', class: 'warn' };
    if (nombre.includes('en atenc') || nombre.includes('atención')) return { text: estado?.nombre ?? 'En atención', class: 'ok' };
    if (nombre.includes('llam')) return { text: estado?.nombre ?? 'Llamando', class: 'ok' };
    if (nombre.includes('atendid')) return { text: estado?.nombre ?? 'Atendido', class: 'ok' };
    return { text: estado?.nombre || 'Desconocido', class: 'ko' };
  };

  const getEstadoStats = () => {
    const pendientes = tickets.filter((t) => (t.estado?.nombre ?? '').toLowerCase().includes('pend')).length;
    const enAtencion = tickets.filter((t) => (t.estado?.nombre ?? '').toLowerCase().includes('atención')).length;
    const finalizados = tickets.filter((t) => (t.estado?.nombre ?? '').toLowerCase().includes('atendid')).length;
    return { pendientes, enAtencion, finalizados };
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      (ticket.codigo ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ticket.servicio?.nombre ?? '').toLowerCase().includes(searchTerm.toLowerCase());

    // Filtro por fecha
    let matchesFecha = true;
    if (fechaInicio || fechaFin) {
      const ticketDate = getFechaFromTicket(ticket);
      if (ticketDate) {
        if (fechaInicio) {
          const inicioDate = new Date(fechaInicio);
          inicioDate.setHours(0, 0, 0, 0);
          if (ticketDate < inicioDate) matchesFecha = false;
        }
        if (fechaFin) {
          const finDate = new Date(fechaFin);
          finDate.setHours(23, 59, 59, 999);
          if (ticketDate > finDate) matchesFecha = false;
        }
      } else {
        matchesFecha = false;
      }
    }

    return matchesSearch && matchesFecha;
  });

  // Paginación
  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTickets = filteredTickets.slice(startIndex, endIndex);

  // Reset page cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, fechaInicio, fechaFin]);

  const stats = getEstadoStats();

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2.5rem',
        padding: '2rem',
        background: 'linear-gradient(135deg, #0A2342 0%, #132743 100%)',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(10, 35, 66, 0.25), 0 2px 8px rgba(0, 0, 0, 0.1)',
        border: '2px solid #E9C46A',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Línea decorativa superior */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #E9C46A, #DDB957, #E9C46A)',
        }} />
        <div>
          <h3 style={{
            fontSize: '2.75rem',
            fontWeight: 700,
            margin: 0,
            color: '#E9C46A',
            fontFamily: "'Times New Roman', Georgia, serif",
            letterSpacing: '0.02em',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
          }}>Gestión de Tickets</h3>
          <p style={{
            color: 'rgba(255, 255, 255, 0.85)',
            fontSize: '1.1rem',
            margin: '0.5rem 0 0 0',
            fontFamily: "'Times New Roman', Georgia, serif",
            fontStyle: 'italic',
          }}>
            Monitoreo y gestión de todos los tickets del sistema
          </p>
        </div>
        <div className="actions" style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={fetchTicketsHoy}
            style={{
              padding: '12px 20px',
              fontSize: 14,
              fontWeight: 600,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0A2342 0%, #132743 100%)',
              border: '2px solid #E9C46A',
              color: '#E9C46A',
              boxShadow: '0 4px 12px rgba(10, 35, 66, 0.30)',
              transition: 'transform .15s ease, box-shadow .15s ease, background .15s ease',
              fontFamily: "'Times New Roman', Georgia, serif",
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              const t = e.currentTarget;
              t.style.transform = 'translateY(-2px)';
              t.style.boxShadow = '0 8px 24px rgba(233, 196, 106, 0.35)';
              t.style.background = '#E9C46A';
              t.style.color = '#0A2342';
            }}
            onMouseLeave={(e) => {
              const t = e.currentTarget;
              t.style.transform = 'translateY(0)';
              t.style.boxShadow = '0 4px 12px rgba(10, 35, 66, 0.30)';
              t.style.background = 'linear-gradient(135deg, #0A2342 0%, #132743 100%)';
              t.style.color = '#E9C46A';
            }}
          >
            <CalendarDays size={16} />
            Hoy
          </button>
          <button
            onClick={fetchAll}
            style={{
              padding: '12px 20px',
              fontSize: 14,
              fontWeight: 600,
              borderRadius: '10px',
              background: '#E9C46A',
              border: '2px solid #E9C46A',
              color: '#0A2342',
              boxShadow: '0 4px 12px rgba(233, 196, 106, 0.35)',
              transition: 'transform .15s ease, box-shadow .15s ease, background .15s ease',
              fontFamily: "'Times New Roman', Georgia, serif",
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              const t = e.currentTarget;
              t.style.transform = 'translateY(-2px)';
              t.style.boxShadow = '0 8px 24px rgba(233, 196, 106, 0.45)';
            }}
            onMouseLeave={(e) => {
              const t = e.currentTarget;
              t.style.transform = 'translateY(0)';
              t.style.boxShadow = '0 4px 12px rgba(233, 196, 106, 0.35)';
            }}
          >
            <List size={16} />
            Todos
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div>Total Tickets</div>
          <div className="stat-number">{tickets.length}</div>
        </div>
        <div className="stat-card">
          <div>Pendientes</div>
          <div className="stat-number" style={{ color: 'var(--warning)' }}>{stats.pendientes}</div>
        </div>
        <div className="stat-card">
          <div>En Atención</div>
          <div className="stat-number" style={{ color: 'var(--primary)' }}>{stats.enAtencion}</div>
        </div>
        <div className="stat-card">
          <div>Finalizados</div>
          <div className="stat-number" style={{ color: 'var(--success)' }}>{stats.finalizados}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="crud-section" style={{ marginBottom: 20 }}>
        <div className="toolbar">
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--muted)',
              }}
            />
            <input
              type="text"
              placeholder="Buscar por código o servicio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input"
              style={{ paddingLeft: 40 }}
            />
          </div>

          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="input"
            style={{ width: 200 }}
          />

          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="input"
            style={{ width: 200 }}
          />

          {(fechaInicio || fechaFin) && (
            <button
              onClick={() => {
                setFechaInicio('');
                setFechaFin('');
              }}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 600,
                borderRadius: '8px',
                background: '#f8fafc',
                border: '2px solid #e2e8f0',
                color: '#64748b',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: "'Times New Roman', Georgia, serif",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.background = '#f1f5f9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.background = '#f8fafc';
              }}
            >
              Limpiar fechas
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="crud-section">
        <div className="table-container">
          <table className="crud-table">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Servicio</th>
                <th>Fecha</th>
                <th>Ventanilla</th>
                <th>Estado</th>
                
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 40 }}>
                    Cargando tickets...
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                    {tickets.length === 0 ? (
                      <div>
                        <div style={{ fontSize: 18, marginBottom: 8 }}>No hay tickets en la base de datos</div>
                        <div style={{ fontSize: 14 }}>
                          Los tickets aparecerán aquí cuando se generen desde el kiosko
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: 18, marginBottom: 8 }}>No se encontraron tickets</div>
                        <div style={{ fontSize: 14 }}>
                          Intenta cambiar los filtros o términos de búsqueda
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedTickets.map((ticket) => {
                  const estadoBadge = getEstadoBadge(ticket.estado);

                  const rawFecha: string | undefined =
                    (ticket as any).fechaCreacion ?? (ticket as any).fecha_creacion;

                  return (
                    <tr key={ticket.id}>
                      <td>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{ticket.codigo}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)' }}>ID: {ticket.id}</div>
                        </div>
                      </td>
                      <td>{ticket.servicio?.nombre || 'N/A'}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Calendar size={14} color="var(--muted)" />
                          <span>{formatFechaLocal(rawFecha)}</span>
                        </div>
                      </td>
                      <td>
                        {ticket.turno?.idVentanilla ? `Ventanilla ${ticket.turno.idVentanilla}` : '—'}
                      </td>
                      <td>
                        <span className={`status pill ${estadoBadge.class}`}>{estadoBadge.text}</span>
                      </td>
                      
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {filteredTickets.length > itemsPerPage && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '20px',
            padding: '16px 20px',
            background: 'var(--surface)',
            borderRadius: '12px',
            border: '2px solid var(--border)',
          }}>
            <div style={{ color: 'var(--muted)', fontSize: '14px' }}>
              Mostrando {startIndex + 1} - {Math.min(endIndex, filteredTickets.length)} de {filteredTickets.length} tickets
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  background: currentPage === 1 ? 'var(--surface)' : '#E9C46A',
                  border: '2px solid',
                  borderColor: currentPage === 1 ? 'var(--border)' : '#E9C46A',
                  color: currentPage === 1 ? 'var(--muted)' : '#0A2342',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: "'Times New Roman', Georgia, serif",
                }}
              >
                Anterior
              </button>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 12px',
                color: '#0A2342',
                fontWeight: 600,
                fontSize: '14px',
                fontFamily: "'Times New Roman', Georgia, serif",
              }}>
                Página {currentPage} de {totalPages}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  background: currentPage === totalPages ? 'var(--surface)' : '#E9C46A',
                  border: '2px solid',
                  borderColor: currentPage === totalPages ? 'var(--border)' : '#E9C46A',
                  color: currentPage === totalPages ? 'var(--muted)' : '#0A2342',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: "'Times New Roman', Georgia, serif",
                }}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedTicket && (
        <>
          <div className="modal-overlay" onClick={() => setShowDetailModal(false)}></div>
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 9999 }}>
            <div className="modal-content" style={{ width: 500, position: 'relative', zIndex: 1 }}>
              <div className="modal-header">
                <h4 style={{ margin: 0 }}>Detalles del Ticket</h4>
                <button onClick={() => setShowDetailModal(false)} className="modal-close">×</button>
              </div>
              <div className="modal-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div
                    style={{
                      textAlign: 'center',
                      padding: 20,
                      background: 'linear-gradient(135deg, var(--primary-50), rgba(59, 130, 246, 0.08))',
                      borderRadius: 12,
                      border: '1px solid var(--primary-100)',
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 600,
                        color: 'var(--muted)',
                        fontSize: 12,
                        textTransform: 'uppercase',
                        marginBottom: 8,
                      }}
                    >
                      Código del Ticket
                    </div>
                    <div
                      style={{
                        fontSize: 32,
                        fontWeight: 700,
                        color: 'var(--primary)',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {selectedTicket.codigo}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div
                      style={{
                        padding: 16,
                        backgroundColor: 'var(--surface)',
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                      }}
                    >
                      <label
                        style={{
                          fontWeight: 600,
                          color: 'var(--muted)',
                          fontSize: 12,
                          textTransform: 'uppercase',
                          display: 'block',
                          marginBottom: 8,
                        }}
                      >
                        Servicio
                      </label>
                      <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--text)' }}>
                        {selectedTicket.servicio?.nombre || 'No especificado'}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: 16,
                        backgroundColor: 'var(--surface)',
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                      }}
                    >
                      <label
                        style={{
                          fontWeight: 600,
                          color: 'var(--muted)',
                          fontSize: 12,
                          textTransform: 'uppercase',
                          display: 'block',
                          marginBottom: 8,
                        }}
                      >
                        Estado Actual
                      </label>
                      <div>
                        <span className={`status pill ${getEstadoBadge(selectedTicket.estado).class}`}>
                          {getEstadoBadge(selectedTicket.estado).text}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div
                      style={{
                        padding: 16,
                        backgroundColor: 'var(--surface)',
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                      }}
                    >
                      <label
                        style={{
                          fontWeight: 600,
                          color: 'var(--muted)',
                          fontSize: 12,
                          textTransform: 'uppercase',
                          display: 'block',
                          marginBottom: 8,
                        }}
                      >
                        Fecha de Creación
                      </label>
                      <div style={{ fontSize: 14, color: 'var(--text)' }}>
                        {formatFechaLocal((selectedTicket as any).fechaCreacion ?? (selectedTicket as any).fecha_creacion)}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: 16,
                        backgroundColor: 'var(--surface)',
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                      }}
                    >
                      <label
                        style={{
                          fontWeight: 600,
                          color: 'var(--muted)',
                          fontSize: 12,
                          textTransform: 'uppercase',
                          display: 'block',
                          marginBottom: 8,
                        }}
                      >
                        Ventanilla Asignada
                      </label>
                      <div style={{ fontSize: 14, color: 'var(--text)' }}>
                        {selectedTicket.turno?.idVentanilla ? `Ventanilla ${selectedTicket.turno.idVentanilla}` : 'No asignada'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TicketCrud;
