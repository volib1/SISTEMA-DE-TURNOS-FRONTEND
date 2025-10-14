import { useState, useEffect } from 'react';
import { Search, Filter, Eye, Clock, CheckCircle, Calendar } from 'lucide-react';
import { TicketAPI, type TicketDTO } from '../../services/ticket.service';
import { EstadoTicketAPI, type EstadoTicketDTO } from '../../services/estado-ticket.service';

const TicketCrud = () => {
  const [tickets, setTickets] = useState<TicketDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEstado, setSelectedEstado] = useState<number | ''>('');
  const [selectedTicket, setSelectedTicket] = useState<TicketDTO | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [estados, setEstados] = useState<EstadoTicketDTO[]>([]);

  // Función para formatear fecha/hora correctamente en zona horaria de El Salvador
  const formatFechaLocal = (fechaISO: string) => {
    if (!fechaISO) return 'N/A';
    
    try {
      // Asegurar que la fecha se interprete como UTC si no tiene sufijo 'Z'
      let fechaUTC = fechaISO;
      if (!fechaISO.endsWith('Z') && !fechaISO.includes('+') && !fechaISO.includes('-', 10)) {
        fechaUTC = fechaISO + 'Z';
      }
      
      const fecha = new Date(fechaUTC);
      
      console.log('[TicketCrud] 🕐 Formateando fecha:', {
        original: fechaISO,
        procesada: fechaUTC,
        objetoDate: fecha.toISOString(),
        horaUTC: fecha.toUTCString()
      });
      
      // Formatear en zona horaria de El Salvador (America/El_Salvador = UTC-6)
      const resultado = fecha.toLocaleString('es-SV', {
        timeZone: 'America/El_Salvador',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      console.log('[TicketCrud] ✅ Fecha formateada:', resultado);
      return resultado;
    } catch (error) {
      console.error('[TicketCrud] Error formateando fecha:', error);
      return fechaISO;
    }
  };

  useEffect(() => {
    fetchTicketsHoy(); // Cargar tickets de hoy por defecto
  }, []);

  const fetchTicketsHoy = async () => {
    setLoading(true);
    try {
      console.log(`[TicketCrud] 📅 Cargando tickets de hoy...`);
      
      // Obtener TODOS los tickets y estados
      const [ticketResponse, estadosList] = await Promise.all([
        TicketAPI.listar(), // SIN parámetro fecha - traer todos
        EstadoTicketAPI.listar(),
      ]);
      
      console.log('[TicketCrud] 📊 Respuesta completa de tickets:', ticketResponse);
      
      const todosLosTickets = Array.isArray(ticketResponse.items) ? ticketResponse.items : [];
      const estados = Array.isArray(estadosList) ? estadosList : [];
      
      console.log(`[TicketCrud] 📋 Total tickets en BD: ${todosLosTickets.length}`);
      
      // Calcular inicio del día de hoy a las 00:00:00 hora local
      const ahora = new Date();
      const inicioDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0);
      const finDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59);
      
      console.log(`[TicketCrud] 🕐 Rango de hoy: ${inicioDia.toISOString()} a ${finDia.toISOString()}`);
      
      // Filtrar tickets de hoy
      const ticketsHoy = todosLosTickets.filter(ticket => {
        if (!ticket.fecha_creacion) return false;
        
        const fechaTicket = new Date(ticket.fecha_creacion);
        const esHoy = fechaTicket >= inicioDia && fechaTicket <= finDia;
        
        if (esHoy) {
          console.log(`[TicketCrud] ✅ Ticket ${ticket.numero_ticket} es de hoy:`, {
            fecha_creacion: ticket.fecha_creacion,
            fecha_parseada: fechaTicket.toISOString(),
            dentro_rango: esHoy
          });
        }
        
        return esHoy;
      });
      
      console.log(`[TicketCrud] 🎯 Tickets de hoy filtrados: ${ticketsHoy.length}`, ticketsHoy);
      
      setTickets(ticketsHoy);
      setEstados(estados);
      
    } catch (error) {
      console.error('[TicketCrud] ❌ Error cargando tickets de hoy:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      console.log('[TicketCrud] 🔍 Cargando tickets y estados de la base de datos...');
      
      const [ticketResponse, estadosList] = await Promise.all([
        TicketAPI.listar(),         // { page, pageSize, total, items }
        EstadoTicketAPI.listar(),   // [{ id, nombre, cantidad? }, ...]
      ]);
      
      console.log('[TicketCrud] 📊 Respuesta de tickets:', ticketResponse);
      console.log('[TicketCrud] 📋 Estados disponibles:', estadosList);
      
      const tickets = Array.isArray(ticketResponse.items) ? ticketResponse.items : [];
      const estados = Array.isArray(estadosList) ? estadosList : [];
      
      console.log(`[TicketCrud] ✅ Tickets cargados: ${tickets.length}`);
      console.log(`[TicketCrud] ✅ Estados cargados: ${estados.length}`);
      
      setTickets(tickets);
      setEstados(estados);
      
      if (tickets.length === 0) {
        console.warn('[TicketCrud] ⚠️ No se encontraron tickets en la base de datos');
      } else {
        console.log('[TicketCrud] 📝 Primeros 3 tickets:', tickets.slice(0, 3));
      }
      
    } catch (error) {
      console.error('[TicketCrud] ❌ Error cargando tickets/estados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicketsHoy(); // Cargar tickets de hoy por defecto
  }, []);

  const idEstadoPorNombre = (nombre: string) =>
    estados.find(e => e.nombre?.toLowerCase() === nombre.toLowerCase())?.id;

  const handleCambiarEstado = async (idTicket: number, idEstadoDestino?: number) => {
    try {
      if (!idEstadoDestino) return;
      await TicketAPI.actualizar(idTicket, { idEstado: idEstadoDestino });
      await fetchAll();
    } catch (error) {
      console.error('Error cambiando estado:', error);
    }
  };

  const getEstadoBadge = (estado?: { id: number; nombre: string }) => {
    const nombre = (estado?.nombre ?? '').toLowerCase();
    if (nombre.includes('pend')) return { text: estado?.nombre ?? 'Pendiente', class: 'warn' };
    if (nombre.includes('atendid')) return { text: estado?.nombre ?? 'Atendido', class: 'ok' };
    if (nombre.includes('en atenc') || nombre.includes('atención')) return { text: estado?.nombre ?? 'En atención', class: 'ok' };
    if (nombre.includes('llam')) return { text: estado?.nombre ?? 'Llamando', class: 'ok' };
    return { text: estado?.nombre || 'Desconocido', class: 'ko' };
  };

  const getEstadoStats = () => {
    const pendientes = tickets.filter(t => (t.estado?.nombre ?? '').toLowerCase().includes('pend')).length;
    const enAtencion = tickets.filter(t => (t.estado?.nombre ?? '').toLowerCase().includes('atención')).length;
    const finalizados = tickets.filter(t => (t.estado?.nombre ?? '').toLowerCase().includes('atendid')).length;
    return { pendientes, enAtencion, finalizados };
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch =
      (ticket.codigo ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ticket.servicio?.nombre ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEstado = selectedEstado === '' || ticket.estado?.id === selectedEstado;
    return matchesSearch && matchesEstado;
  });

  const stats = getEstadoStats();

  const idEnAtencion = idEstadoPorNombre('En atención');
  const idAtendido = idEstadoPorNombre('Atendido');

  return (
    <div>
      {/* Header */}
      <div className="section-header">
        <div>
          <h3>Gestión de Tickets</h3>
          <p style={{ color: 'var(--muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
            Monitoreo y gestión de todos los tickets del sistema
          </p>
        </div>
        <div className="actions">
          <button onClick={fetchTicketsHoy} className="btn">📅 Hoy</button>
          <button onClick={fetchAll} className="btn" style={{ marginLeft: '8px' }}>📋 Todos</button>
          <button 
            onClick={async () => {
              console.log('[TicketCrud DEBUG] 🎯 DIAGNÓSTICO COMPLETO DE ESTADOS:');
              
              // 1. Verificar estados disponibles
              try {
                console.log('1. 📋 Consultando estados...');
                const estadosResponse = await fetch('http://localhost:5079/api/EstadoTicket/Lista');
                if (estadosResponse.ok) {
                  const estadosData = await estadosResponse.json();
                  console.log('✅ Estados encontrados:', estadosData.length);
                  
                  estadosData.forEach((estado: any, index: number) => {
                    const esPendiente = estado.nombre === 'Pendiente';
                    const esSimilar = estado.nombre.toLowerCase().includes('pendiente');
                    console.log(`${index + 1}. ID: ${estado.id} | Nombre: "${estado.nombre}" | Cantidad: ${estado.cantidad || 0}${esPendiente ? ' ← EXACTO' : esSimilar ? ' ← SIMILAR' : ''}`);
                  });
                  
                  // Buscar específicamente "Pendiente"
                  const pendienteExacto = estadosData.find((e: any) => e.nombre === 'Pendiente');
                  const pendienteID1 = estadosData.find((e: any) => e.id === 1);
                  
                  console.log('\n🔍 ANÁLISIS ESPECÍFICO:');
                  if (pendienteExacto) {
                    console.log(`✅ Estado "Pendiente" existe con ID: ${pendienteExacto.id}`);
                    if (pendienteExacto.id !== 1) {
                      console.log(`❌ PROBLEMA: El código busca ID=1 pero "Pendiente" tiene ID=${pendienteExacto.id}`);
                      console.log(`💡 SOLUCIÓN: Cambiar en KioskoController.cs:`);
                      console.log(`   .FirstOrDefaultAsync(e => e.id == ${pendienteExacto.id})`);
                    }
                  } else {
                    console.log('❌ No se encontró estado exacto "Pendiente"');
                  }
                  
                  if (pendienteID1) {
                    console.log(`📌 Estado con ID=1: "${pendienteID1.nombre}"`);
                  } else {
                    console.log('❌ No existe estado con ID=1');
                  }
                  
                } else {
                  console.error('❌ Error consultando estados:', estadosResponse.status);
                }
              } catch (error) {
                console.error('❌ Error:', error);
              }
              
              // 2. Test de creación específico
              console.log('\n2. 🧪 Probando creación de ticket...');
              try {
                const crearResponse = await fetch('http://localhost:5079/api/kiosko/ticket?idServicio=8', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' }
                });
                
                console.log('� Status creación:', crearResponse.status);
                
                if (!crearResponse.ok) {
                  const errorText = await crearResponse.text();
                  console.log('❌ Error de creación:', errorText);
                }
              } catch (error) {
                console.error('❌ Error en creación:', error);
              }
              
              console.log('\n📋 Estado actual del componente:');
              console.log('- Tickets cargados:', tickets.length);
              console.log('- Estados disponibles:', estados.length);
            }} 
            className="btn" 
            style={{ marginLeft: '8px', fontSize: '12px', backgroundColor: '#6366f1' }}
          >
            🔧 Debug
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
      <div className="crud-section" style={{ marginBottom: '20px' }}>
        <div className="toolbar">
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--muted)'
            }} />
            <input
              type="text"
              placeholder="Buscar por código o servicio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input"
              style={{ paddingLeft: '40px' }}
            />
          </div>

          <div style={{ position: 'relative', width: '220px' }}>
            <Filter size={16} style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--muted)'
            }} />
            <select
              value={selectedEstado}
              onChange={(e) => setSelectedEstado(e.target.value === '' ? '' : Number(e.target.value))}
              className="input"
              style={{ paddingLeft: '40px', appearance: 'none' }}
            >
              <option value="">Todos los estados</option>
              {estados.map(e => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </select>
          </div>
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
                <th style={{ width: '140px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>
                    Cargando tickets...
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                    {tickets.length === 0 ? (
                      <div>
                        <div style={{ fontSize: '18px', marginBottom: '8px' }}>📋 No hay tickets en la base de datos</div>
                        <div style={{ fontSize: '14px' }}>
                          Los tickets aparecerán aquí cuando se generen desde el kiosko
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '18px', marginBottom: '8px' }}>🔍 No se encontraron tickets</div>
                        <div style={{ fontSize: '14px' }}>
                          Intenta cambiar los filtros o términos de búsqueda
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => {
                  const estadoBadge = getEstadoBadge(ticket.estado);
                  const puedeAtender = ticket.estado?.id !== undefined && ticket.estado?.id !== idEnAtencion && idEnAtencion;
                  const puedeFinalizar = ticket.estado?.id === idEnAtencion && idAtendido;

                  return (
                    <tr key={ticket.id}>
                      <td>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{ticket.codigo}</div>
                          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>ID: {ticket.id}</div>
                        </div>
                      </td>
                      <td>{ticket.servicio?.nombre || 'N/A'}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Calendar size={14} color="var(--muted)" />
                          <span>{formatFechaLocal(ticket.fechaCreacion)}</span>
                        </div>
                      </td>
                      <td>
                        {ticket.turno?.idVentanilla ? `Ventanilla ${ticket.turno.idVentanilla}` : '—'}
                      </td>
                      <td>
                        <span className={`status pill ${estadoBadge.class}`}>{estadoBadge.text}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            onClick={() => { setSelectedTicket(ticket); setShowDetailModal(true); }}
                            className="icon-btn"
                            title="Ver detalles"
                          >
                            <Eye size={14} />
                          </button>

                          {puedeAtender && (
                            <button
                              onClick={() => handleCambiarEstado(ticket.id, idEnAtencion)}
                              className="icon-btn"
                              title="Marcar En atención"
                              style={{ color: 'var(--primary)' }}
                            >
                              <Clock size={14} />
                            </button>
                          )}

                          {puedeFinalizar && (
                            <button
                              onClick={() => handleCambiarEstado(ticket.id, idAtendido)}
                              className="icon-btn"
                              title="Marcar Atendido"
                              style={{ color: 'var(--success)' }}
                            >
                              <CheckCircle size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedTicket && (
        <>
          <div className="modal-overlay" onClick={() => setShowDetailModal(false)}></div>
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 9999 }}>
            <div className="modal-content" style={{ width: '500px', position: 'relative', zIndex: 1 }}>
              <div className="modal-header">
                <h4 style={{ margin: 0 }}>Detalles del Ticket</h4>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="modal-close"
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div style={{ 
                    textAlign: 'center',
                    padding: '20px',
                    background: 'linear-gradient(135deg, var(--primary-50), rgba(59, 130, 246, 0.08))',
                    borderRadius: '12px',
                    border: '1px solid var(--primary-100)'
                  }}>
                    <div style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '12px', textTransform: 'uppercase', marginBottom: '8px' }}>
                      🎫 Código del Ticket
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.02em' }}>
                      {selectedTicket.codigo}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div style={{ 
                      padding: '16px',
                      backgroundColor: 'var(--surface)',
                      borderRadius: '10px',
                      border: '1px solid var(--border)'
                    }}>
                      <label style={{ 
                        fontWeight: 600, 
                        color: 'var(--muted)', 
                        fontSize: '12px', 
                        textTransform: 'uppercase',
                        display: 'block',
                        marginBottom: '8px'
                      }}>
                        🛎️ Servicio
                      </label>
                      <div style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text)' }}>
                        {selectedTicket.servicio?.nombre || 'No especificado'}
                      </div>
                    </div>

                    <div style={{ 
                      padding: '16px',
                      backgroundColor: 'var(--surface)',
                      borderRadius: '10px',
                      border: '1px solid var(--border)'
                    }}>
                      <label style={{ 
                        fontWeight: 600, 
                        color: 'var(--muted)', 
                        fontSize: '12px', 
                        textTransform: 'uppercase',
                        display: 'block',
                        marginBottom: '8px'
                      }}>
                        📊 Estado Actual
                      </label>
                      <div>
                        <span className={`status pill ${getEstadoBadge(selectedTicket.estado).class}`}>
                          {getEstadoBadge(selectedTicket.estado).text}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div style={{ 
                      padding: '16px',
                      backgroundColor: 'var(--surface)',
                      borderRadius: '10px',
                      border: '1px solid var(--border)'
                    }}>
                      <label style={{ 
                        fontWeight: 600, 
                        color: 'var(--muted)', 
                        fontSize: '12px', 
                        textTransform: 'uppercase',
                        display: 'block',
                        marginBottom: '8px'
                      }}>
                        📅 Fecha de Creación
                      </label>
                      <div style={{ fontSize: '14px', color: 'var(--text)' }}>
                        {formatFechaLocal(selectedTicket.fechaCreacion)}
                      </div>
                    </div>

                    <div style={{ 
                      padding: '16px',
                      backgroundColor: 'var(--surface)',
                      borderRadius: '10px',
                      border: '1px solid var(--border)'
                    }}>
                      <label style={{ 
                        fontWeight: 600, 
                        color: 'var(--muted)', 
                        fontSize: '12px', 
                        textTransform: 'uppercase',
                        display: 'block',
                        marginBottom: '8px'
                      }}>
                        🪟 Ventanilla Asignada
                      </label>
                      <div style={{ fontSize: '14px', color: 'var(--text)' }}>
                        {selectedTicket.turno?.idVentanilla ? `Ventanilla ${selectedTicket.turno.idVentanilla}` : 'No asignada'}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '16px', 
                    paddingTop: '24px', 
                    borderTop: '2px solid var(--border)'
                  }}>
                    {idEnAtencion && selectedTicket.estado?.id !== idEnAtencion && (
                      <button
                        onClick={() => {
                          handleCambiarEstado(selectedTicket.id, idEnAtencion);
                          setShowDetailModal(false);
                        }}
                        className="btn btn-primary"
                        style={{ 
                          flex: 1,
                          padding: '14px 20px',
                          fontWeight: 600,
                          borderRadius: '10px',
                          background: 'linear-gradient(135deg, var(--primary), var(--primary-600))',
                          border: 'none',
                          color: 'white',
                          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onMouseEnter={(e) => {
                          const target = e.target as HTMLButtonElement;
                          target.style.transform = 'translateY(-1px)';
                          target.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          const target = e.target as HTMLButtonElement;
                          target.style.transform = 'translateY(0)';
                          target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                        }}
                      >
                        <Clock size={18} style={{ marginRight: '8px' }} />
                        🎯 Atender Ticket
                      </button>
                    )}
                    {idAtendido && selectedTicket.estado?.id === idEnAtencion && (
                      <button
                        onClick={() => {
                          handleCambiarEstado(selectedTicket.id, idAtendido);
                          setShowDetailModal(false);
                        }}
                        className="btn"
                        style={{ 
                          flex: 1,
                          padding: '14px 20px',
                          fontWeight: 600,
                          borderRadius: '10px',
                          background: 'linear-gradient(135deg, var(--success), #059669)',
                          border: 'none',
                          color: 'white',
                          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onMouseEnter={(e) => {
                          const target = e.target as HTMLButtonElement;
                          target.style.transform = 'translateY(-1px)';
                          target.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          const target = e.target as HTMLButtonElement;
                          target.style.transform = 'translateY(0)';
                          target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                        }}
                      >
                        <CheckCircle size={18} style={{ marginRight: '8px' }} />
                        ✅ Finalizar Ticket
                      </button>
                    )}
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
