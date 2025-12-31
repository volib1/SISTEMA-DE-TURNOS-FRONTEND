import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Edit, Trash2, Briefcase } from 'lucide-react';
import {
  ServicioAPI,
  type ServicioDTO,
  type CrearServicioInput,
  type ActualizarServicioInput,
} from '../../services/servicio.service';

// Estado para modal de confirmación de eliminación
interface DeleteConfirmState {
  open: boolean;
  servicioId: number | null;
  servicioNombre: string;
}

const ServicioCrud: React.FC = () => {
  const [servicios, setServicios] = useState<ServicioDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [formData, setFormData] = useState<CrearServicioInput | ActualizarServicioInput>({
    nombre: '',
    descripcion: '',
    activo: false,
  });
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Estado para modal de confirmación de eliminación
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({
    open: false,
    servicioId: null,
    servicioNombre: '',
  });

  // ref para evitar sobrescribir con respuestas viejas
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      setLoading(true);
      try {
        const data = await ServicioAPI.listarConEstado();
        if (mountedRef.current) setServicios(data);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })();

    // SUSCRIPCIÓN SSE (tolerante a diferentes payloads)
    const es = ServicioAPI.suscribirse(
      (evt) => {
        if (!mountedRef.current) return;
        const { type, data } = evt;

        // 1) Si backend envía { items: Servicio[] } o { Items: Servicio[] }
        if (data && (Array.isArray(data.items) || Array.isArray(data.Items))) {
          const arr = (data.items || data.Items) as ServicioDTO[];
          setServicios(arr);
          return;
        }

        // 2) Si backend envía arreglo de servicios
        if (Array.isArray(data)) {
          setServicios(data as ServicioDTO[]);
          return;
        }

        // 3) Normalizar a DTO si parece uno suelto
        const dto: ServicioDTO | null =
          data && (data.id != null || data.nombre != null) ? (data as ServicioDTO) : null;

        switch (type) {
          case 'servicio.creado': {
            if (!dto) return;
            setServicios((prev) => {
              const exists = prev.some((s) => s.id === dto.id);
              return exists ? prev.map((s) => (s.id === dto.id ? dto : s)) : [dto, ...prev];
            });
            break;
          }
          case 'servicio.actualizado':
          case 'servicio.activado':
          case 'servicio.estado_cambiado': {
            if (!dto) return;
            setServicios((prev) => prev.map((s) => (s.id === dto.id ? dto : s)));
            break;
          }
          case 'servicio.eliminado': {
            const id = typeof data?.id === 'number' ? data.id : dto?.id;
            if (!id) return;
            setServicios((prev) => prev.filter((s) => s.id !== id));
            break;
          }
          default: {
            // fallback: si llega un DTO suelto, intentar merge por id
            if (dto?.id != null) {
              setServicios((prev) => {
                const exists = prev.some((s) => s.id === dto.id);
                return exists ? prev.map((s) => (s.id === dto.id ? dto : s)) : [dto, ...prev];
              });
            }
          }
        }
      },
      // onError: dejamos reconectar solo
      () => {}
    );

    return () => {
      mountedRef.current = false;
      es.close();
    };
  }, []);

  /* ----------------------------- Derivados UI ----------------------------- */
  const filteredServicios = useMemo(
    () =>
      servicios.filter((s) =>
        (s.nombre ?? '').toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [servicios, searchTerm]
  );

  // Paginación
  const totalPages = Math.ceil(filteredServicios.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedServicios = useMemo(
    () => filteredServicios.slice(startIndex, endIndex),
    [filteredServicios, startIndex, endIndex]
  );

  // Reset page cuando cambia el filtro
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const activos = useMemo(() => servicios.filter((s) => s.activo).length, [servicios]);
  const inactivos = useMemo(
    () => servicios.filter((s) => s.activo === false).length,
    [servicios]
  );

  /* -------------------------------- Handlers ------------------------------- */
  const openNew = () => {
    setFormData({ nombre: '', descripcion: '', activo: false });
    setIsEditing(false);
    setEditingId(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // DEBUG: Ver qué datos se envían al guardar
    console.log('[Servicio.handleSubmit] formData al guardar:', formData);
    console.log('[Servicio.handleSubmit] formData.activo:', formData.activo, 'tipo:', typeof formData.activo);

    try {
      setSaving(true);
      if (isEditing && editingId) {
        // UI optimista
        const snapshot = servicios;
        const nextLocal = {
          ...snapshot.find((x) => x.id === editingId)!,
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          activo: formData.activo,
        } as ServicioDTO;

        console.log('[Servicio.handleSubmit] nextLocal (UI optimista):', nextLocal);

        setServicios((list) =>
          list.map((x) => (x.id === editingId ? nextLocal : x))
        );

        try {
          const updated = await ServicioAPI.actualizar(editingId, formData as ActualizarServicioInput);
          console.log('[Servicio.handleSubmit] Respuesta del servidor:', updated);
          setServicios((list) => list.map((x) => (x.id === editingId ? updated : x)));
        } catch (err) {
          // rollback si falla
          setServicios(snapshot);
          throw err;
        }
      } else {
        console.log('[Servicio.handleSubmit] Creando nuevo servicio con:', formData);
        const creado = await ServicioAPI.crear(formData as CrearServicioInput);
        console.log('[Servicio.handleSubmit] Servicio creado:', creado);
        setServicios((list) => [creado, ...list]);
      }
      setShowModal(false);
      setFormData({ nombre: '', descripcion: '', activo: false });
      setIsEditing(false);
      setEditingId(null);
    } catch (error) {
      console.error('Error guardando servicio:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (servicio: ServicioDTO) => {
    // Usar el valor exacto de activo del servicio (ya normalizado en nServicio)
    setFormData({
      nombre: servicio.nombre,
      descripcion: servicio.descripcion || '',
      activo: servicio.activo,
    });
    setIsEditing(true);
    setEditingId(servicio.id);
    setShowModal(true);
  };

  const handleToggleEstado = async (servicio: ServicioDTO) => {
    const id = servicio.id;
    const next = !Boolean(servicio.activo);

    // UI optimista inmediata
    const snapshot = servicios;
    setTogglingId(id);
    setServicios((list) => list.map((s) => (s.id === id ? { ...s, activo: next } : s)));

    try {
      // Espera respuesta del backend y sustituye por la versión oficial
      const res = await ServicioAPI.cambiarEstado(id, next);
      const actualizado = res?.servicio ?? null;
      if (actualizado) {
        setServicios((list) => list.map((s) => (s.id === id ? actualizado : s)));
      }
      // Si tu backend devuelve campos derivados (ej.: ventanillasActivas), ya quedan sincronizados.
    } catch (err) {
      // rollback
      setServicios(snapshot);
      console.error('Error cambiando estado del servicio:', err);
    } finally {
      setTogglingId(null);
    }
  };

  const openDeleteConfirm = (servicio: ServicioDTO) => {
    setDeleteConfirm({
      open: true,
      servicioId: servicio.id,
      servicioNombre: servicio.nombre,
    });
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirm({ open: false, servicioId: null, servicioNombre: '' });
  };

  const handleDelete = async () => {
    const id = deleteConfirm.servicioId;
    if (!id) return;

    // UI optimista
    const snapshot = servicios;
    setDeletingId(id);
    setServicios((list) => list.filter((s) => s.id !== id));
    closeDeleteConfirm();

    try {
      await ServicioAPI.eliminar(id);
    } catch (err) {
      // rollback
      setServicios(snapshot);
      console.error('Error eliminando servicio:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const resetForm = () => {
    setFormData({ nombre: '', descripcion: '', activo: false });
    setIsEditing(false);
    setEditingId(null);
    setShowModal(false);
  };

  /* --------------------------------- Render -------------------------------- */
  return (
    <div>
      {/* Header - Estilo institucional como Dashboard */}
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
          }}>Servicios</h3>
          <p style={{
            color: 'rgba(255, 255, 255, 0.85)',
            fontSize: '1.1rem',
            margin: '0.5rem 0 0 0',
            fontFamily: "'Times New Roman', Georgia, serif",
            fontStyle: 'italic',
          }}>
            Gestiona los servicios disponibles en el sistema
          </p>
        </div>
        <div className="actions">
          <button
            onClick={openNew}
            className="btn btn-primary"
            style={{
              padding: '12px 20px',
              fontSize: 14,
              fontWeight: 600,
              borderRadius: '10px',
              background: '#E9C46A',
              border: '2px solid #E9C46A',
              color: '#0A2342',
              boxShadow: '0 4px 12px rgba(233, 196, 106, 0.35)',
              transition: 'transform .15s ease, box-shadow .15s ease',
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
            <Plus size={16} />
            Nuevo Servicio
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="stat-card">
          <div>Total Servicios</div>
          <div className="stat-number">{servicios.length}</div>
        </div>
        <div className="stat-card">
          <div>Activos</div>
          <div className="stat-number">{activos}</div>
        </div>
        <div className="stat-card">
          <div>Inactivos</div>
          <div className="stat-number">{inactivos}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="crud-section" style={{ marginBottom: '20px' }}>
        <div className="toolbar">
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              placeholder="Buscar servicios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input"
              style={{
                paddingLeft: '40px',
                padding: '14px 16px',
                fontSize: '16px',
                borderRadius: '12px',
                border: '2px solid var(--border)',
                transition: 'all 0.2s ease',
                backgroundColor: 'var(--surface)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="crud-section">
        <div className="table-container">
          <table className="crud-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}></th>
                <th>Servicio</th>
                <th>Descripción</th>
                <th>Estado</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>
                    Cargando servicios...
                  </td>
                </tr>
              ) : filteredServicios.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                    No se encontraron servicios
                  </td>
                </tr>
              ) : (
                paginatedServicios.map((servicio) => (
                  <tr key={servicio.id}>
                    <td>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          background: 'var(--primary-50)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: servicio.activo ? 'var(--primary)' : 'var(--muted)',
                          opacity: deletingId === servicio.id ? 0.5 : 1,
                        }}
                      >
                        <Briefcase size={18} />
                      </div>
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600 }}>{servicio.nombre}</div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>ID: {servicio.id}</div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
                        {servicio.descripcion || 'Sin descripción'}
                      </div>
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggleEstado(servicio)}
                        className={`status pill ${servicio.activo ? 'ok' : 'ko'}`}
                        style={{ cursor: 'pointer', border: 'none' }}
                        disabled={togglingId === servicio.id}
                        aria-busy={togglingId === servicio.id}
                        title="Cambiar estado"
                      >
                        {togglingId === servicio.id ? 'Guardando...' : servicio.activo ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button onClick={() => handleEdit(servicio)} className="icon-btn" title="Editar">
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => openDeleteConfirm(servicio)}
                          className="icon-btn"
                          title="Eliminar"
                          style={{ color: 'var(--danger)' }}
                          disabled={deletingId === servicio.id}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {filteredServicios.length > itemsPerPage && (
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
              Mostrando {startIndex + 1} - {Math.min(endIndex, filteredServicios.length)} de {filteredServicios.length} servicios
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

      {/* Modal */}
      {showModal && (
        <>
          <div
            className="modal-overlay"
            onClick={resetForm}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(10, 35, 66, 0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 9998,
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 9999,
              width: '90%',
              maxWidth: '480px',
            }}
          >
            <div style={{
              background: '#ffffff',
              borderRadius: '20px',
              boxShadow: '0 25px 60px rgba(10, 35, 66, 0.3)',
              overflow: 'hidden',
              border: '2px solid #E9C46A',
            }}>
              {/* Header del modal */}
              <div style={{
                background: 'linear-gradient(135deg, #0A2342 0%, #132743 100%)',
                padding: '24px 28px',
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: 'linear-gradient(90deg, #E9C46A, #DDB957, #E9C46A)',
                }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: 'rgba(233, 196, 106, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Briefcase size={20} color="#E9C46A" />
                    </div>
                    <h4 style={{
                      margin: 0,
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: '#E9C46A',
                      fontFamily: "'Times New Roman', Georgia, serif",
                    }}>
                      {isEditing ? 'Editar Servicio' : 'Nuevo Servicio'}
                    </h4>
                  </div>
                  <button
                    onClick={resetForm}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '20px',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                      e.currentTarget.style.color = '#EF4444';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Body del modal */}
              <div style={{ padding: '28px' }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{
                      display: 'block',
                      fontWeight: 600,
                      color: '#0A2342',
                      fontSize: '14px',
                      fontFamily: "'Times New Roman', Georgia, serif",
                    }}>
                      Nombre del Servicio <span style={{ color: '#E9C46A' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Ej: Atención al Cliente"
                      required
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        fontSize: '15px',
                        borderRadius: '12px',
                        border: '2px solid #e2e8f0',
                        transition: 'all 0.2s ease',
                        backgroundColor: '#f8fafc',
                        color: '#0A2342',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#E9C46A';
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(233, 196, 106, 0.15)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.backgroundColor = '#f8fafc';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{
                      display: 'block',
                      fontWeight: 600,
                      color: '#0A2342',
                      fontSize: '14px',
                      fontFamily: "'Times New Roman', Georgia, serif",
                    }}>
                      Descripción
                    </label>
                    <textarea
                      value={formData.descripcion || ''}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      placeholder="Describe brevemente el servicio y su propósito..."
                      style={{
                        width: '100%',
                        minHeight: '100px',
                        resize: 'vertical',
                        padding: '14px 16px',
                        fontSize: '15px',
                        borderRadius: '12px',
                        border: '2px solid #e2e8f0',
                        transition: 'all 0.2s ease',
                        backgroundColor: '#f8fafc',
                        color: '#0A2342',
                        outline: 'none',
                        boxSizing: 'border-box',
                        fontFamily: 'inherit',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#E9C46A';
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(233, 196, 106, 0.15)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.backgroundColor = '#f8fafc';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  {/* Checkbox Servicio Activo */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '16px 20px',
                      backgroundColor: '#f8fafc',
                      borderRadius: 12,
                      border: '2px solid #e2e8f0',
                    }}
                  >
                    <input
                      type="checkbox"
                      id="activo"
                      checked={!!formData.activo}
                      onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                      style={{
                        width: 20,
                        height: 20,
                        accentColor: '#E9C46A',
                        cursor: 'pointer',
                      }}
                    />
                    <div>
                      <label htmlFor="activo" style={{
                        fontWeight: 600,
                        color: '#0A2342',
                        fontSize: 15,
                        cursor: 'pointer',
                        fontFamily: "'Times New Roman', Georgia, serif",
                      }}>
                        Servicio activo
                      </label>
                      <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                        Los servicios activos están disponibles para asignar a ventanillas
                      </div>
                    </div>
                  </div>

                  {/* Footer con botones */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid #e2e8f0',
                    marginTop: '8px',
                  }}>
                    <button
                      type="button"
                      onClick={resetForm}
                      disabled={saving}
                      style={{
                        padding: '12px 24px',
                        fontSize: '14px',
                        fontWeight: 600,
                        borderRadius: '10px',
                        background: '#ffffff',
                        border: '2px solid #e2e8f0',
                        color: '#64748b',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        fontFamily: "'Times New Roman', Georgia, serif",
                      }}
                      onMouseEnter={(e) => {
                        if (!saving) {
                          e.currentTarget.style.borderColor = '#cbd5e1';
                          e.currentTarget.style.background = '#f8fafc';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.background = '#ffffff';
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      style={{
                        padding: '12px 24px',
                        fontSize: '14px',
                        fontWeight: 600,
                        borderRadius: '10px',
                        background: '#E9C46A',
                        border: '2px solid #E9C46A',
                        color: '#0A2342',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 12px rgba(233, 196, 106, 0.35)',
                        transition: 'all 0.2s ease',
                        fontFamily: "'Times New Roman', Georgia, serif",
                        opacity: saving ? 0.7 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!saving) {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 20px rgba(233, 196, 106, 0.45)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(233, 196, 106, 0.35)';
                      }}
                    >
                      {isEditing ? (saving ? 'Guardando...' : 'Actualizar') : (saving ? 'Creando...' : 'Crear Servicio')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {deleteConfirm.open && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(10, 35, 66, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9998,
            backdropFilter: 'blur(4px)',
          }}
          onClick={closeDeleteConfirm}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 25px 60px rgba(10, 35, 66, 0.3)',
              border: '2px solid #E9C46A',
              width: '100%',
              maxWidth: '440px',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #0A2342 0%, #132743 100%)',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '3px solid #E9C46A',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Trash2 size={18} color="#EF4444" />
                </div>
                <h2 style={{
                  margin: 0,
                  color: '#E9C46A',
                  fontSize: '18px',
                  fontWeight: 700,
                  fontFamily: "'Times New Roman', Georgia, serif",
                }}>
                  Eliminar Servicio
                </h2>
              </div>
              <button
                onClick={closeDeleteConfirm}
                aria-label="Cerrar"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: '18px',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '24px' }}>
              <p style={{
                margin: 0,
                color: '#475569',
                fontSize: '15px',
                lineHeight: 1.6,
              }}>
                ¿Estás seguro de que deseas eliminar el servicio{' '}
                <strong style={{ color: '#0A2342' }}>"{deleteConfirm.servicioNombre}"</strong>?
              </p>
              <p style={{
                margin: '12px 0 0 0',
                padding: '12px 16px',
                background: '#fef2f2',
                borderRadius: '10px',
                border: '1px solid #fecaca',
                color: '#dc2626',
                fontSize: '13px',
                lineHeight: 1.5,
              }}>
                Esta acción no se puede deshacer. El servicio será eliminado permanentemente del sistema.
              </p>
            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 24px',
              background: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
            }}>
              <button
                onClick={closeDeleteConfirm}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: 600,
                  borderRadius: '10px',
                  background: '#ffffff',
                  border: '2px solid #e2e8f0',
                  color: '#64748b',
                  cursor: 'pointer',
                  fontFamily: "'Times New Roman', Georgia, serif",
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.background = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.background = '#ffffff';
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: 600,
                  borderRadius: '10px',
                  background: '#dc2626',
                  border: '2px solid #dc2626',
                  color: '#ffffff',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.35)',
                  fontFamily: "'Times New Roman', Georgia, serif",
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(220, 38, 38, 0.45)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.35)';
                }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicioCrud;
