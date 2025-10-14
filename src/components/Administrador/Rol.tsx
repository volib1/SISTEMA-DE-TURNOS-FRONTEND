import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Shield } from 'lucide-react';
import { RolAPI, type CrearRolInput, type ActualizarRolInput } from '../../services/rol.service';
import type { RolDTO } from '../../services/rol.service';

const RolCrud = () => {
  const [roles, setRoles] = useState<RolDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<CrearRolInput | ActualizarRolInput>({ nombre: '' });
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => { fetchRoles(); }, []);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const data = await RolAPI.listar();
      setRoles(data);
    } catch (error) {
      console.error('Error cargando roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && editingId) {
        await RolAPI.actualizar(editingId, formData as ActualizarRolInput);
      } else {
        await RolAPI.crear(formData as CrearRolInput);
      }
      await fetchRoles();
      resetForm();
    } catch (error) {
      console.error('Error guardando rol:', error);
    }
  };

  const handleEdit = (role: RolDTO) => {
    setFormData({ nombre: role.nombre });
    setIsEditing(true);
    setEditingId(role.id);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Está seguro de eliminar este rol?')) {
      try {
        await RolAPI.eliminar(id);
        await fetchRoles();
      } catch (error) {
        console.error('Error eliminando rol:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({ nombre: '' });
    setIsEditing(false);
    setEditingId(null);
    setShowModal(false);
  };

  const filteredRoles = roles.filter(role =>
    role.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="section-header">
        <div>
          <h3>Roles de Usuario</h3>
          <p style={{ color: 'var(--muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
            Gestiona los roles del sistema
          </p>
        </div>
        <div className="actions">
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus size={16} style={{ marginRight: '8px' }} />
            Nuevo Rol
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="stat-card">
          <div>Total Roles</div>
          <div className="stat-number">{roles.length}</div>
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
              placeholder="Buscar roles..."
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
                <th>Rol</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '40px' }}>
                    Cargando roles...
                  </td>
                </tr>
              ) : filteredRoles.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                    No se encontraron roles
                  </td>
                </tr>
              ) : (
                filteredRoles.map((role) => (
                  <tr key={role.id}>
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
                          color: 'var(--primary)',
                        }}
                      >
                        <Shield size={18} />
                      </div>
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600 }}>{role.nombre}</div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                          ID: {role.id}
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleEdit(role)}
                          className="icon-btn"
                          title="Editar"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(role.id)}
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
                <h4 style={{ margin: 0 }}>{isEditing ? 'Editar Rol' : 'Nuevo Rol'}</h4>
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
                      🛡️ Nombre del Rol *
                    </label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Ej: Administrador, Empleado, Supervisor..."
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
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                      👥 Define el nivel de acceso y permisos en el sistema
                    </div>
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
                      {isEditing ? '✓ Actualizar Rol' : '🛡️ Crear Rol'}
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

export default RolCrud;
