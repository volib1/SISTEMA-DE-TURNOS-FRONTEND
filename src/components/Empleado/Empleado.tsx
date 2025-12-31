import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Filter, Mail, User, Shield } from 'lucide-react';
import {
  UsuarioAPI,
  type UsuarioDTO,
  type CrearUsuarioInput,
  type ActualizarUsuarioInput,
} from '../../services/usuario.service';
import { RolAPI, type RolDTO } from '../../services/rol.service';

// Estado para modal de confirmación de eliminación
interface DeleteConfirmState {
  open: boolean;
  usuarioId: number | null;
  usuarioNombre: string;
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
      background: 'linear-gradient(135deg, var(--primary), var(--primary-600))',
      border: 'none',
      color: 'white',
      boxShadow: '0 4px 12px rgba(59,130,246,0.30)',
      transition: 'transform .15s ease, box-shadow .15s ease, opacity .15s ease',
      width: full ? '100%' : undefined,
      opacity: disabled ? 0.6 : 1,
      cursor: disabled ? 'not-allowed' : 'pointer',
      ...style,
    }}
    onMouseEnter={(e) => {
      if (disabled) return;
      const t = e.currentTarget;
      t.style.transform = 'translateY(-1px)';
      t.style.boxShadow = '0 6px 20px rgba(59,130,246,0.40)';
    }}
    onMouseLeave={(e) => {
      if (disabled) return;
      const t = e.currentTarget;
      t.style.transform = 'translateY(0)';
      t.style.boxShadow = '0 4px 12px rgba(59,130,246,0.30)';
    }}
  >
    {children}
  </button>
);

const Empleados: React.FC = () => {
  const [usuarios, setUsuarios] = useState<UsuarioDTO[]>([]);
  const [roles, setRoles] = useState<RolDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<UsuarioDTO | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<number | ''>('');
  const [selectedEstado, setSelectedEstado] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState<CrearUsuarioInput & { password?: string }>({
    nombre: '',
    correo: '',
    passwordHash: '',
    idRol: undefined,
  });

  const [errorMsg, setErrorMsg] = useState<string>('');

  // Estado para modal de confirmación de eliminación
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({
    open: false,
    usuarioId: null,
    usuarioNombre: '',
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [usuariosData, rolesData] = await Promise.all([
        UsuarioAPI.listar(true),
        RolAPI.listar(),
      ]);
      setUsuarios(usuariosData);
      setRoles(rolesData);
    } catch {
      setErrorMsg('No se pudieron cargar los datos.');
    } finally {
      setLoading(false);
    }
  };

  // Prevalidación de unicidad del correo (case-insensitive) excluyendo el usuario en edición
  const correoDisponible = async (correo: string, idActual?: number) => {
    const q = (correo ?? '').trim();
    if (!q) return false;
    const coincidencias = await UsuarioAPI.buscar(q, true);
    const existeOtro = coincidencias.some(
      (u) => u.correo.toLowerCase() === q.toLowerCase() && u.id !== (idActual ?? 0)
    );
    return !existeOtro;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      const nombre = (formData.nombre ?? '').trim();
      const correo = (formData.correo ?? '').trim();

      if (!nombre) throw new Error('El nombre es requerido.');
      if (!correo) throw new Error('El correo es requerido.');

      if (editing) {
        // Si se cambia el correo, valida unicidad
        if (correo.toLowerCase() !== (editing.correo ?? '').toLowerCase()) {
          const ok = await correoDisponible(correo, editing.id);
          if (!ok) throw new Error('Ya existe un usuario con ese correo');
        }

        const payload: ActualizarUsuarioInput = {
          nombre,
          correo,
          passwordHash: formData.passwordHash ? formData.passwordHash : undefined,
          idRol: formData.idRol ?? null,
        };
        await UsuarioAPI.actualizar(editing.id, payload);
      } else {
        if (!formData.passwordHash || !formData.passwordHash.trim()) {
          throw new Error('La contraseña es requerida al crear un usuario.');
        }

        const ok = await correoDisponible(correo);
        if (!ok) throw new Error('Ya existe un usuario con ese correo');

        await UsuarioAPI.crear({
          nombre,
          correo,
          passwordHash: formData.passwordHash.trim(),
          idRol: formData.idRol,
        });
      }

      await cargarDatos();
      resetForm();
    } catch (error: any) {
      setErrorMsg(error?.message || 'No se pudo guardar el usuario.');
    }
  };

  const handleEdit = (u: UsuarioDTO) => {
    setErrorMsg('');
    setEditing(u);
    setFormData({
      nombre: u.nombre,
      correo: u.correo,
      passwordHash: '',
      idRol: u.rol?.id,
    });
    setShowModal(true);
  };

  // Funciones para modal de eliminación
  const openDeleteConfirm = (usuario: UsuarioDTO) => {
    setDeleteConfirm({
      open: true,
      usuarioId: usuario.id,
      usuarioNombre: usuario.nombre,
    });
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirm({ open: false, usuarioId: null, usuarioNombre: '' });
  };

  const handleDelete = async () => {
    const id = deleteConfirm.usuarioId;
    if (!id) return;

    try {
      await UsuarioAPI.eliminar(id);
      await cargarDatos();
    } catch (error: any) {
      setErrorMsg(error?.message || 'No se pudo eliminar el usuario.');
    } finally {
      closeDeleteConfirm();
    }
  };

  const toggleEstado = async (u: UsuarioDTO) => {
    try {
      if (u.activo) {
        await UsuarioAPI.deshabilitar(u.id);
      } else {
        await UsuarioAPI.habilitar(u.id);
      }
      await cargarDatos();
    } catch (error: any) {
      setErrorMsg(error?.message || 'No se pudo cambiar el estado del usuario.');
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      correo: '',
      passwordHash: '',
      idRol: undefined,
    });
    setEditing(null);
    setShowModal(false);
  };

  const filteredUsuarios = usuarios.filter((u) => {
    const s = searchTerm.toLowerCase();
    const matchesSearch =
      u.nombre.toLowerCase().includes(s) || (u.correo && u.correo.toLowerCase().includes(s));
    const matchesRole = selectedRole === '' || u.rol?.id === selectedRole;
    const matchesEstado =
      selectedEstado === '' ||
      (selectedEstado === 'activo' && u.activo) ||
      (selectedEstado === 'inactivo' && !u.activo);
    return matchesSearch && matchesRole && matchesEstado;
  });

  // Paginación
  const totalPages = Math.ceil(filteredUsuarios.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsuarios = filteredUsuarios.slice(startIndex, endIndex);

  // Reset page cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedRole, selectedEstado]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <div>Cargando empleados...</div>
      </div>
    );
  }

  const activos = usuarios.filter((u) => u.activo).length;
  const inactivos = usuarios.filter((u) => !u.activo).length;

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
          }}>Gestión de Empleados</h3>
          <p style={{
            color: 'rgba(255, 255, 255, 0.85)',
            fontSize: '1.1rem',
            margin: '0.5rem 0 0 0',
            fontFamily: "'Times New Roman', Georgia, serif",
            fontStyle: 'italic',
          }}>
            Administra los empleados y sus roles en el sistema
          </p>
        </div>
        <div className="actions">
          <button
            onClick={() => { setErrorMsg(''); setShowModal(true); }}
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
            Nuevo Empleado
          </button>
        </div>
      </div>

      {/* Error global */}
      {errorMsg && (
        <div className="alert alert-danger" style={{ marginBottom: 12 }}>
          {errorMsg}
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="stat-card">
          <div>Total Empleados</div>
          <div className="stat-number">{usuarios.length}</div>
        </div>
        <div className="stat-card">
          <div>Activos</div>
          <div className="stat-number">{activos}</div>
        </div>
        <div className="stat-card">
          <div>Inactivos</div>
          <div className="stat-number">{inactivos}</div>
        </div>
        <div className="stat-card">
          <div>Con Rol Asignado</div>
          <div className="stat-number">{usuarios.filter((u) => !!u.rol).length}</div>
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
              placeholder="Buscar por nombre o correo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input"
              style={{ paddingLeft: 40 }}
            />
          </div>
          <div style={{ position: 'relative', minWidth: 160 }}>
            <Filter
              size={16}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--muted)',
              }}
            />
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value === '' ? '' : Number(e.target.value))}
              className="input"
              style={{ paddingLeft: 40 }}
            >
              <option value="">Todos los roles</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
            </select>
          </div>
          <select
            value={selectedEstado}
            onChange={(e) => setSelectedEstado(e.target.value)}
            className="input"
            style={{ minWidth: 140 }}
          >
            <option value="">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="crud-section">
        <div className="table-container">
          <table className="crud-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}></th>
                <th>Empleado</th>
                <th>Contacto</th>
                <th>Rol</th>
                <th>Estado</th>
                <th style={{ width: 120, textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsuarios.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                    No se encontraron empleados
                  </td>
                </tr>
              ) : (
                paginatedUsuarios.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          background: u.activo ? 'var(--primary-50)' : 'var(--border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: u.activo ? 'var(--primary)' : 'var(--muted)',
                        }}
                      >
                        <User size={18} />
                      </div>
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600 }}>{u.nombre}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>ID: {u.id}</div>
                      </div>
                    </td>
                    <td>
                      {u.correo ? (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 13,
                            color: 'var(--muted)',
                          }}
                        >
                          <Mail size={12} />
                          {u.correo}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--muted)', fontSize: 13 }}>—</span>
                      )}
                    </td>
                    <td>
                      {u.rol ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Shield size={14} color="var(--primary)" />
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{u.rol.nombre}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--muted)', fontSize: 13 }}>Sin rol</span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => toggleEstado(u)}
                        className={`status pill ${u.activo ? 'ok' : 'ko'}`}
                        style={{ cursor: 'pointer', border: 'none' }}
                      >
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        <button onClick={() => handleEdit(u)} className="icon-btn" title="Editar">
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => openDeleteConfirm(u)}
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
        {filteredUsuarios.length > itemsPerPage && (
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
              Mostrando {startIndex + 1} - {Math.min(endIndex, filteredUsuarios.length)} de {filteredUsuarios.length} empleados
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
              maxWidth: '520px',
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
                      <User size={20} color="#E9C46A" />
                    </div>
                    <h4 style={{
                      margin: 0,
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: '#E9C46A',
                      fontFamily: "'Times New Roman', Georgia, serif",
                    }}>
                      {editing ? 'Editar Empleado' : 'Nuevo Empleado'}
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
                {/* Error del modal/form */}
                {errorMsg && (
                  <div
                    style={{
                      marginBottom: 20,
                      padding: '12px 16px',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: 10,
                      color: '#dc2626',
                      fontSize: 14,
                    }}
                  >
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{
                      display: 'block',
                      fontWeight: 600,
                      color: '#0A2342',
                      fontSize: '14px',
                      fontFamily: "'Times New Roman', Georgia, serif",
                    }}>
                      Nombre Completo <span style={{ color: '#E9C46A' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Ej: Juan Carlos Pérez García"
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
                      Correo Electrónico <span style={{ color: '#E9C46A' }}>*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.correo || ''}
                      onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                      placeholder="empleado@empresa.com"
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

                  {!editing && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{
                        display: 'block',
                        fontWeight: 600,
                        color: '#0A2342',
                        fontSize: '14px',
                        fontFamily: "'Times New Roman', Georgia, serif",
                      }}>
                        Contraseña <span style={{ color: '#E9C46A' }}>*</span>
                      </label>
                      <input
                        type="password"
                        required
                        value={formData.passwordHash || ''}
                        onChange={(e) => setFormData({ ...formData, passwordHash: e.target.value })}
                        placeholder="••••••••"
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
                  )}

                  {editing && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{
                        display: 'block',
                        fontWeight: 600,
                        color: '#0A2342',
                        fontSize: '14px',
                        fontFamily: "'Times New Roman', Georgia, serif",
                      }}>
                        Nueva Contraseña <span style={{ color: '#64748b', fontWeight: 400 }}>(opcional)</span>
                      </label>
                      <input
                        type="password"
                        value={formData.passwordHash || ''}
                        onChange={(e) => setFormData({ ...formData, passwordHash: e.target.value })}
                        placeholder="*********"
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
                        Deja este campo vacío si no deseas cambiar la contraseña
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{
                      display: 'block',
                      fontWeight: 600,
                      color: '#0A2342',
                      fontSize: '14px',
                      fontFamily: "'Times New Roman', Georgia, serif",
                    }}>
                      Rol del Sistema
                    </label>
                    <select
                      value={formData.idRol || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          idRol: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
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
                        cursor: 'pointer',
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
                    >
                      <option value="">Sin rol asignado</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.nombre}
                        </option>
                      ))}
                    </select>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                      Define los permisos y acceso del empleado en el sistema
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
                      {editing ? 'Actualizar' : 'Crear Empleado'}
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
                  Eliminar Empleado
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
                ¿Estás seguro de que deseas eliminar al empleado{' '}
                <strong style={{ color: '#0A2342' }}>"{deleteConfirm.usuarioNombre}"</strong>?
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
                Esta acción no se puede deshacer. El empleado será eliminado permanentemente del sistema.
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

export default Empleados;
