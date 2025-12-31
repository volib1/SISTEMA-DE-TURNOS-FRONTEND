import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Shield } from 'lucide-react';
import { RolAPI, type CrearRolInput, type ActualizarRolInput } from '../../services/rol.service';
import type { RolDTO } from '../../services/rol.service';

// Estado para modal de confirmación de eliminación
interface DeleteConfirmState {
  open: boolean;
  rolId: number | null;
  rolNombre: string;
}

const PrimaryButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { full?: boolean }
> = ({ children, full, style, disabled, ...props }) => (
  <button
    {...props}
    disabled={disabled}
    className={`btn btn-primary${props.className ? ' ' + props.className : ''}`}
    style={{
      padding: '12px 28px',
      fontWeight: 600,
      borderRadius: 10,
      background: '#E9C46A',
      border: 'none',
      color: '#0A2342',
      boxShadow: '0 4px 12px rgba(233, 196, 106, 0.35)',
      transition: 'transform .15s ease, box-shadow .15s ease',
      width: full ? '100%' : undefined,
      opacity: disabled ? 0.6 : 1,
      cursor: disabled ? 'not-allowed' : 'pointer',
      ...style,
    }}
    onMouseEnter={(e) => {
      if (disabled) return;
      const t = e.currentTarget;
      t.style.transform = 'translateY(-1px)';
      t.style.boxShadow = '0 8px 24px rgba(233, 196, 106, 0.45)';
      }}
    onMouseLeave={(e) => {
      if (disabled) return;
      const t = e.currentTarget;
      t.style.transform = 'translateY(0)';
      t.style.boxShadow = '0 4px 12px rgba(233, 196, 106, 0.35)';
      }}
  >
    {children}
  </button>
);

const RolCrud: React.FC = () => {
  const [roles, setRoles] = useState<RolDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [formData, setFormData] = useState<CrearRolInput | ActualizarRolInput>({ nombre: '' });
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Estado para modal de confirmación de eliminación
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({
    open: false,
    rolId: null,
    rolNombre: '',
  });

  useEffect(() => { fetchRoles(); }, []);

  const fetchRoles = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await RolAPI.listar();
      setRoles(data);
    } catch {
      setErrorMsg('No se pudieron cargar los roles.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const nombre = (formData.nombre ?? '').trim();
    if (!nombre) {
      setErrorMsg('El nombre del rol es requerido.');
      return;
    }

    try {
      if (isEditing && editingId) {
        await RolAPI.actualizar(editingId, { nombre });
      } else {
        await RolAPI.crear({ nombre });
      }
      await fetchRoles();
      resetForm();
    } catch {
      setErrorMsg('No se pudo guardar el rol.');
    }
  };

  const handleEdit = (role: RolDTO) => {
    setErrorMsg('');
    setFormData({ nombre: role.nombre });
    setIsEditing(true);
    setEditingId(role.id);
    setShowModal(true);
  };

  // Funciones para modal de eliminación
  const openDeleteConfirm = (rol: RolDTO) => {
    setDeleteConfirm({
      open: true,
      rolId: rol.id,
      rolNombre: rol.nombre,
    });
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirm({ open: false, rolId: null, rolNombre: '' });
  };

  const handleDelete = async () => {
    const id = deleteConfirm.rolId;
    if (!id) return;

    setErrorMsg('');
    try {
      await RolAPI.eliminar(id);
      await fetchRoles();
    } catch {
      setErrorMsg('No se pudo eliminar el rol.');
    } finally {
      closeDeleteConfirm();
    }
  };

  const resetForm = () => {
    setFormData({ nombre: '' });
    setIsEditing(false);
    setEditingId(null);
    setShowModal(false);
    setErrorMsg('');
  };

  const filteredRoles = roles.filter((role) =>
    role.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Paginación
  const totalPages = Math.ceil(filteredRoles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRoles = filteredRoles.slice(startIndex, endIndex);

  // Reset page cuando cambia el filtro
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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
          }}>Roles de Usuario</h3>
          <p style={{
            color: 'rgba(255, 255, 255, 0.85)',
            fontSize: '1.1rem',
            margin: '0.5rem 0 0 0',
            fontFamily: "'Times New Roman', Georgia, serif",
            fontStyle: 'italic',
          }}>
            Gestiona los roles del sistema
          </p>
        </div>
        <div className="actions">
          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: '12px 20px',
              fontWeight: 600,
              borderRadius: 10,
              background: '#E9C46A',
              border: '2px solid #E9C46A',
              color: '#0A2342',
              boxShadow: '0 4px 12px rgba(233, 196, 106, 0.35)',
              cursor: 'pointer',
              fontFamily: "'Times New Roman', Georgia, serif",
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'transform .15s ease, box-shadow .15s ease',
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
            Nuevo Rol
          </button>
        </div>
      </div>

      {/* Error global */}
      {errorMsg && (
        <div
          className="alert alert-danger"
          style={{
            marginBottom: 12,
            padding: '12px 16px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 8,
            color: 'var(--danger)',
            fontSize: 14,
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="stat-card">
          <div>Total Roles</div>
          <div className="stat-number">{roles.length}</div>
        </div>
      </div>

      {/* Filtros */}
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
              placeholder="Buscar roles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input"
              style={{ paddingLeft: 40 }}
            />
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="crud-section">
        <div className="table-container">
          <table className="crud-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}></th>
                <th>Rol</th>
                <th style={{ width: 120, textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: 40 }}>
                    Cargando roles...
                  </td>
                </tr>
              ) : filteredRoles.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                    No se encontraron roles
                  </td>
                </tr>
              ) : (
                paginatedRoles.map((role) => (
                  <tr key={role.id}>
                    <td>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
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
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>ID: {role.id}</div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                        <button onClick={() => handleEdit(role)} className="icon-btn" title="Editar">
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => openDeleteConfirm(role)}
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

        {/* Paginación */}
        {filteredRoles.length > itemsPerPage && (
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
              Mostrando {startIndex + 1} - {Math.min(endIndex, filteredRoles.length)} de {filteredRoles.length} roles
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

      {/* Modal Crear/Editar */}
      {showModal && (
        <>
          <div
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
                      <Shield size={20} color="#E9C46A" />
                    </div>
                    <h4 style={{
                      margin: 0,
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: '#E9C46A',
                      fontFamily: "'Times New Roman', Georgia, serif",
                    }}>
                      {isEditing ? 'Editar Rol' : 'Nuevo Rol'}
                    </h4>
                  </div>
                  <button
                    onClick={resetForm}
                    aria-label="Cerrar"
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
                      Nombre del Rol <span style={{ color: '#E9C46A' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Ej: Administrador, Empleado, Supervisor..."
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
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                      Define el nivel de acceso y permisos en el sistema
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
                      style={{
                        padding: '12px 24px',
                        fontSize: '14px',
                        fontWeight: 600,
                        borderRadius: '10px',
                        background: '#ffffff',
                        border: '2px solid #e2e8f0',
                        color: '#64748b',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontFamily: "'Times New Roman', Georgia, serif",
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
                      type="submit"
                      style={{
                        padding: '12px 24px',
                        fontSize: '14px',
                        fontWeight: 600,
                        borderRadius: '10px',
                        background: '#E9C46A',
                        border: '2px solid #E9C46A',
                        color: '#0A2342',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(233, 196, 106, 0.35)',
                        transition: 'all 0.2s ease',
                        fontFamily: "'Times New Roman', Georgia, serif",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(233, 196, 106, 0.45)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(233, 196, 106, 0.35)';
                      }}
                    >
                      {isEditing ? 'Actualizar' : 'Crear Rol'}
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
                  Eliminar Rol
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
                ¿Estás seguro de que deseas eliminar el rol{' '}
                <strong style={{ color: '#0A2342' }}>"{deleteConfirm.rolNombre}"</strong>?
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
                Esta acción no se puede deshacer. El rol será eliminado permanentemente del sistema.
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

export default RolCrud;
