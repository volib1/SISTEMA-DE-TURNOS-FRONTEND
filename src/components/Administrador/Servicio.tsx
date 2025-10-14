import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Settings } from 'lucide-react';
import {
  ServicioAPI,
  type ServicioDTO,
  type CrearServicioInput,
  type ActualizarServicioInput,
} from '../../services/servicio.service';
// No CSS imports needed

const ServicioCrud = () => {
  const [servicios, setServicios] = useState<ServicioDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<CrearServicioInput | ActualizarServicioInput>({
    nombre: '',
    descripcion: '',
  });
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    fetchServicios();
  }, []);

  const fetchServicios = async () => {
    setLoading(true);
    try {
      // Trae también el campo "activo"
      const data = await ServicioAPI.listarConEstado();
      setServicios(data);
    } catch (error) {
      console.error('Error cargando servicios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && editingId) {
        await ServicioAPI.actualizar(editingId, formData as ActualizarServicioInput);
      } else {
        await ServicioAPI.crear(formData as CrearServicioInput);
      }
      await fetchServicios();
      resetForm();
    } catch (error) {
      console.error('Error guardando servicio:', error);
    }
  };

  const handleEdit = (servicio: ServicioDTO) => {
    setFormData({
      nombre: servicio.nombre,
      descripcion: servicio.descripcion || '',
    });
    setIsEditing(true);
    setEditingId(servicio.id);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Está seguro de eliminar este servicio?')) {
      try {
        await ServicioAPI.eliminar(id);
        await fetchServicios();
      } catch (error) {
        console.error('Error eliminando servicio:', error);
      }
    }
  };

  const toggleEstado = async (servicio: ServicioDTO) => {
    try {
      await ServicioAPI.activar(servicio.id, !(servicio.activo ?? false));
      await fetchServicios();
    } catch (error) {
      console.error('Error cambiando estado:', error);
    }
  };

  const resetForm = () => {
    setFormData({ nombre: '', descripcion: '' });
    setIsEditing(false);
    setEditingId(null);
    setShowModal(false);
  };

  const filteredServicios = servicios.filter((s) =>
    (s.nombre ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activos = servicios.filter((s) => s.activo).length;
  const inactivos = servicios.filter((s) => s.activo === false).length;

  return (
    <div>
      {/* Header */}
      <div className="section-header">
        <div>
          <h3>Servicios</h3>
          <p style={{ color: 'var(--muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
            Gestiona los servicios disponibles en el sistema
          </p>
        </div>
        <div className="actions">
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus size={16} style={{ marginRight: '8px' }} />
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
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--muted)',
              }}
            />
            <input
              type="text"
              placeholder="Buscar servicios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input"
              style={{ paddingLeft: '40px' }}
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
                filteredServicios.map((servicio) => (
                  <tr key={servicio.id}>
                    <td>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          background: servicio.activo ? 'var(--primary-50)' : 'var(--border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: servicio.activo ? 'var(--primary)' : 'var(--muted)',
                        }}
                      >
                        <Settings size={18} />
                      </div>
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600 }}>{servicio.nombre}</div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                          ID: {servicio.id}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
                        {servicio.descripcion || 'Sin descripción'}
                      </div>
                    </td>
                    <td>
                      <button
                        onClick={() => toggleEstado(servicio)}
                        className={`status pill ${servicio.activo ? 'ok' : 'ko'}`}
                        style={{ cursor: 'pointer', border: 'none' }}
                      >
                        {servicio.activo ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button onClick={() => handleEdit(servicio)} className="icon-btn" title="Editar">
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(servicio.id)}
                          className="icon-btn"
                          title="Eliminar"
                          style={{ color: 'var(--danger)' }}
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
      </div>

      {/* Modal */}
      {showModal && (
        <>
          <div className="modal-overlay" onClick={resetForm}></div>
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 9999,
            }}
          >
            <div className="modal-content" style={{ position: 'relative', zIndex: 1 }}>
              <div className="modal-header">
                <h4 style={{ margin: 0 }}>{isEditing ? 'Editar Servicio' : 'Nuevo Servicio'}</h4>
                <button
                  onClick={resetForm}
                  className="modal-close"
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ 
                      display: 'block', 
                      fontWeight: 600, 
                      color: 'var(--text)',
                      fontSize: '14px',
                      letterSpacing: '0.01em'
                    }}>
                      Nombre del Servicio *
                    </label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Ej: Atención al Cliente"
                      required
                      className="input"
                      style={{ 
                        width: '100%',
                        padding: '14px 16px',
                        fontSize: '16px',
                        borderRadius: '12px',
                        border: '2px solid var(--border)',
                        transition: 'all 0.2s ease',
                        backgroundColor: 'var(--surface)'
                      }}
                      onFocus={(e) => (e.target as HTMLInputElement).style.borderColor = 'var(--primary)'}
                      onBlur={(e) => (e.target as HTMLInputElement).style.borderColor = 'var(--border)'}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ 
                      display: 'block', 
                      fontWeight: 600, 
                      color: 'var(--text)',
                      fontSize: '14px',
                      letterSpacing: '0.01em'
                    }}>
                      Descripción
                    </label>
                    <textarea
                      value={formData.descripcion || ''}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      placeholder="Describe brevemente el servicio y su propósito..."
                      className="input"
                      style={{ 
                        width: '100%', 
                        minHeight: '80px', 
                        resize: 'vertical',
                        padding: '14px 16px',
                        fontSize: '16px',
                        borderRadius: '12px',
                        border: '2px solid var(--border)',
                        transition: 'all 0.2s ease',
                        backgroundColor: 'var(--surface)',
                        fontFamily: 'inherit'
                      }}
                      onFocus={(e) => (e.target as HTMLTextAreaElement).style.borderColor = 'var(--primary)'}
                      onBlur={(e) => (e.target as HTMLTextAreaElement).style.borderColor = 'var(--border)'}
                    />
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'flex-end', 
                    gap: '16px', 
                    paddingTop: '20px',
                    borderTop: '1px solid var(--border)'
                  }}>
                    <button 
                      type="button" 
                      onClick={resetForm} 
                      className="btn"
                      style={{
                        padding: '12px 24px',
                        fontWeight: 600,
                        borderRadius: '10px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      style={{
                        padding: '12px 32px',
                        fontWeight: 600,
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, var(--primary), var(--primary-600))',
                        border: 'none',
                        color: 'white',
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                        transition: 'all 0.2s ease'
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
                      {isEditing ? '✓ Actualizar' : '+ Crear Servicio'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ServicioCrud;
