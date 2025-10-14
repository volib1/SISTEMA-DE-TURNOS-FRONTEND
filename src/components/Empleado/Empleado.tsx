import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Filter, Mail, User, Shield } from 'lucide-react';
import {
  UsuarioAPI,
  type UsuarioDTO,
  type CrearUsuarioInput,
  type ActualizarUsuarioInput,
} from '../../services/usuario.service';
import { RolAPI, type RolDTO } from '../../services/rol.service';
// CSS imports removed

const Empleados: React.FC = () => {
  const [usuarios, setUsuarios] = useState<UsuarioDTO[]>([]);
  const [roles, setRoles] = useState<RolDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<UsuarioDTO | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<number | ''>('');
  const [selectedEstado, setSelectedEstado] = useState<string>('');

  const [formData, setFormData] = useState<CrearUsuarioInput & { password?: string }>({
    nombre: '',
    correo: '',
    passwordHash: '',
    idRol: undefined,
  });

  const [errorMsg, setErrorMsg] = useState<string>("");

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
      setErrorMsg("No se pudieron cargar los datos.");
    } finally {
      setLoading(false);
    }
  };

  // Prevalidación de unicidad del correo (case-insensitive) excluyendo el usuario en edición
  const correoDisponible = async (correo: string, idActual?: number) => {
    const q = (correo ?? "").trim();
    if (!q) return false;
    const coincidencias = await UsuarioAPI.buscar(q, true);
    const existeOtro = coincidencias.some(u => u.correo.toLowerCase() === q.toLowerCase() && u.id !== (idActual ?? 0));
    return !existeOtro;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    try {
      const nombre = (formData.nombre ?? "").trim();
      const correo = (formData.correo ?? "").trim();

      if (!nombre) throw new Error("El nombre es requerido.");
      if (!correo) throw new Error("El correo es requerido.");

      if (editing) {
        // Si se cambia el correo, valida unicidad antes de llamar al API
        if (correo.toLowerCase() !== (editing.correo ?? "").toLowerCase()) {
          const ok = await correoDisponible(correo, editing.id);
          if (!ok) throw new Error("Ya existe un usuario con ese correo");
        }

        const payload: ActualizarUsuarioInput = {
          nombre,
          correo,
          passwordHash: formData.passwordHash ? formData.passwordHash : undefined,
          idRol: formData.idRol ?? null,
        };
        await UsuarioAPI.actualizar(editing.id, payload);
      } else {
        // En creación el backend requiere password_hash
        if (!formData.passwordHash || !formData.passwordHash.trim()) {
          throw new Error('La contraseña es requerida al crear un usuario.');
        }

        // Valida unicidad en creación
        const ok = await correoDisponible(correo);
        if (!ok) throw new Error("Ya existe un usuario con ese correo");

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
      setErrorMsg(error?.message || "No se pudo guardar el usuario.");
    }
  };

  const handleEdit = (u: UsuarioDTO) => {
    setErrorMsg("");
    setEditing(u);
    setFormData({
      nombre: u.nombre,
      correo: u.correo,
      passwordHash: '',
      idRol: u.rol?.id,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Está seguro de eliminar este usuario?')) {
      try {
        await UsuarioAPI.eliminar(id);
        await cargarDatos();
      } catch (error: any) {
        setErrorMsg(error?.message || "No se pudo eliminar el usuario.");
      }
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
      setErrorMsg(error?.message || "No se pudo cambiar el estado del usuario.");
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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <div>Cargando empleados...</div>
      </div>
    );
  }

  const activos = usuarios.filter((u) => u.activo).length;
  const inactivos = usuarios.filter((u) => !u.activo).length;

  return (
    <div>
      {/* Header */}
      <div className="section-header">
        <div>
          <h3>Gestión de Empleados</h3>
          <p style={{ color: 'var(--muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
            Administra los empleados y sus roles en el sistema
          </p>
        </div>
        <div className="actions">
          <button onClick={() => { setErrorMsg(""); setShowModal(true); }} className="btn btn-primary">
            <Plus size={16} style={{ marginRight: '8px' }} />
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
              placeholder="Buscar por nombre o correo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input"
              style={{ paddingLeft: '40px' }}
            />
          </div>
          <div style={{ position: 'relative', minWidth: '160px' }}>
            <Filter
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--muted)',
              }}
            />
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value === '' ? '' : Number(e.target.value))}
              className="input"
              style={{ paddingLeft: '40px' }}
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
            style={{ minWidth: '140px' }}
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
                <th style={{ width: '60px' }}></th>
                <th>Empleado</th>
                <th>Contacto</th>
                <th>Rol</th>
                <th>Estado</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsuarios.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                    No se encontraron empleados
                  </td>
                </tr>
              ) : (
                filteredUsuarios.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
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
                        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>ID: {u.id}</div>
                      </div>
                    </td>
                    <td>
                      {u.correo ? (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '13px',
                            color: 'var(--muted)',
                          }}
                        >
                          <Mail size={12} />
                          {u.correo}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--muted)', fontSize: '13px' }}>—</span>
                      )}
                    </td>
                    <td>
                      {u.rol ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Shield size={14} color="var(--primary)" />
                          <span style={{ fontSize: '13px', fontWeight: 500 }}>{u.rol.nombre}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Sin rol</span>
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
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        <button onClick={() => handleEdit(u)} className="icon-btn" title="Editar">
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
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
                <h4 style={{ margin: 0 }}>{editing ? 'Editar Empleado' : 'Nuevo Empleado'}</h4>
                <button
                  onClick={resetForm}
                  className="modal-close"
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                {/* Error del modal/form */}
                {errorMsg && (
                  <div className="alert alert-danger" style={{ 
                    marginBottom: '24px',
                    padding: '12px 16px',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    color: 'var(--danger)',
                    fontSize: '14px'
                  }}>
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ 
                      display: 'block', 
                      fontWeight: 600, 
                      color: 'var(--text)',
                      fontSize: '14px',
                      letterSpacing: '0.01em'
                    }}>
                      <User size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className="input"
                      placeholder="Ej: Juan Carlos Pérez García"
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
                      <Mail size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                      Correo Electrónico *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.correo || ''}
                      onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                      className="input"
                      placeholder="empleado@empresa.com"
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

                  {!editing && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ 
                        display: 'block', 
                        fontWeight: 600, 
                        color: 'var(--text)',
                        fontSize: '14px',
                        letterSpacing: '0.01em'
                      }}>
                        🔒 Contraseña *
                      </label>
                      <input
                        type="password"
                        required
                        value={formData.passwordHash || ''}
                        onChange={(e) => setFormData({ ...formData, passwordHash: e.target.value })}
                        className="input"
                        placeholder="••••••••"
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
                  )}

                  {editing && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ 
                        display: 'block', 
                        fontWeight: 600, 
                        color: 'var(--text)',
                        fontSize: '14px',
                        letterSpacing: '0.01em'
                      }}>
                        🔒 Nueva Contraseña (opcional)
                      </label>
                      <input
                        type="password"
                        value={formData.passwordHash || ''}
                        onChange={(e) => setFormData({ ...formData, passwordHash: e.target.value })}
                        className="input"
                        placeholder="Dejar en blanco para no cambiar"
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
                        💡 Deja este campo vacío si no deseas cambiar la contraseña
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ 
                      display: 'block', 
                      fontWeight: 600, 
                      color: 'var(--text)',
                      fontSize: '14px',
                      letterSpacing: '0.01em'
                    }}>
                      <Shield size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
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
                      className="input"
                      style={{ 
                        width: '100%',
                        padding: '14px 16px',
                        fontSize: '16px',
                        borderRadius: '12px',
                        border: '2px solid var(--border)',
                        transition: 'all 0.2s ease',
                        backgroundColor: 'var(--surface)',
                        cursor: 'pointer'
                      }}
                      onFocus={(e) => (e.target as HTMLSelectElement).style.borderColor = 'var(--primary)'}
                      onBlur={(e) => (e.target as HTMLSelectElement).style.borderColor = 'var(--border)'}
                    >
                      <option value="">Sin rol asignado</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.nombre}
                        </option>
                      ))}
                    </select>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                      👥 Define los permisos y acceso del empleado en el sistema
                    </div>
                  </div>

                  {/* Estado se maneja con habilitar/deshabilitar, no en el create/update del backend */}

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
                      {editing ? '✓ Actualizar Empleado' : '👤 Crear Empleado'}
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

export default Empleados;
