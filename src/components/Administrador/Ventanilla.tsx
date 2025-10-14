import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Monitor, User, RotateCcw } from 'lucide-react';
import {
  VentanillaAPI,
  type VentanillaDTO,
  type CrearVentanillaInput,
  type ActualizarVentanillaInput,
} from '../../services/ventanilla.service';
import { AsignacionVentanillaAPI } from '../../services/asignacion-ventanilla.service';
// CSS imports have been removed

const VentanillaCrud = () => {
  const [ventanillas, setVentanillas] = useState<VentanillaDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedVentanilla, setSelectedVentanilla] = useState<VentanillaDTO | null>(null);
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [selectedEmpleado, setSelectedEmpleado] = useState<number | ''>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false); // Filtro para ventanillas inactivas
  const [formData, setFormData] = useState<CrearVentanillaInput | ActualizarVentanillaInput>({
    nombre: '',
    activa: true,
  });
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
    fetchEmpleados();
  }, []);

  const fetchEmpleados = async () => {
    try {
      // Aquí deberías usar tu API de empleados
      // const empleadosData = await EmpleadoAPI.listar();
      // setEmpleados(empleadosData);
      
      // Por ahora, datos simulados
      setEmpleados([
        { id: 1, nombre: 'Juan Pérez' },
        { id: 2, nombre: 'María García' },
        { id: 3, nombre: 'Carlos López' },
        { id: 4, nombre: 'Ana Martínez' }
      ]);
    } catch (error) {
      console.error('Error cargando empleados:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const ventanillasData = await VentanillaAPI.listar();
      setVentanillas(ventanillasData);
    } catch (error) {
      console.error('Error cargando ventanillas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && editingId) {
        await VentanillaAPI.actualizar(editingId, formData as ActualizarVentanillaInput);
      } else {
        await VentanillaAPI.crear(formData as CrearVentanillaInput);
      }
      await fetchData();
      resetForm();
    } catch (error) {
      console.error('Error guardando ventanilla:', error);
    }
  };

  const handleEdit = (ventanilla: VentanillaDTO) => {
    setFormData({
      nombre: ventanilla.nombre,
      activa: !!ventanilla.activa,
    });
    setIsEditing(true);
    setEditingId(ventanilla.id);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    console.log('[Ventanilla] Intentando desactivar ventanilla ID:', id);
    
    try {
      // Verificamos si la ventanilla tiene asignaciones ACTIVAS
      console.log('[Ventanilla] 🔍 Verificando asignaciones activas antes de desactivar...');
      const { tiene, cantidad, activas } = await AsignacionVentanillaAPI.tieneAsignaciones(id);
      
      // Solo bloquear si hay asignaciones ACTIVAS (sin fechaFin)
      if (activas > 0) {
        const mensaje = `❌ No se puede desactivar la ventanilla porque tiene ${activas} asignaciones activas.\n\nPrimero debe cerrar todas las asignaciones activas.`;
        
        console.log('[Ventanilla] ❌ Desactivación bloqueada por asignaciones activas:', { tiene, cantidad, activas });
        alert(mensaje);
        return;
      }
      
      // Encontrar la ventanilla actual para obtener su información
      const ventanillaActual = ventanillas.find(v => v.id === id);
      if (!ventanillaActual) {
        alert('❌ No se encontró la ventanilla especificada');
        return;
      }
      
      const mensajeConfirmacion = cantidad > 0 
        ? `¿Está seguro de desactivar la ventanilla "${ventanillaActual.nombre}"?\n\nTiene ${cantidad} asignaciones históricas pero no se eliminarán.\nLa ventanilla se marcará como inactiva y se podrá reactivar posteriormente.`
        : `¿Está seguro de desactivar la ventanilla "${ventanillaActual.nombre}"?\n\nSe marcará como inactiva y se podrá reactivar posteriormente.`;
      
      console.log('[Ventanilla] ✅ Ventanilla lista para desactivación:', { activas, cantidad, nombre: ventanillaActual.nombre });
      
      if (window.confirm(mensajeConfirmacion)) {
        console.log('[Ventanilla] Usuario confirmó desactivación, enviando petición...');
        
        // Usar eliminación lógica: cambiar activa a false
        const actualizacion: ActualizarVentanillaInput = {
          nombre: ventanillaActual.nombre,
          activa: false // ❌ DESACTIVAR en lugar de eliminar
        };
        
        await VentanillaAPI.actualizar(id, actualizacion);
        console.log('[Ventanilla] ✅ Ventanilla desactivada exitosamente');
        console.log('[Ventanilla] 🔄 Recargando datos...');
        await fetchData();
        console.log('[Ventanilla] ✅ Datos actualizados');
        alert(`✅ Ventanilla "${ventanillaActual.nombre}" desactivada correctamente`);
      } else {
        console.log('[Ventanilla] Usuario canceló la desactivación');
      }
    } catch (error: any) {
      console.error('[Ventanilla] ❌ Error en proceso de desactivación:', error);
      console.error('[Ventanilla] Error completo:', {
        message: error?.message,
        status: error?.status,
        detail: error?.detail,
        stack: error?.stack
      });
      
      alert(`❌ Error al desactivar ventanilla: ${error?.message || 'Error desconocido'}`);
    }
  };

  const toggleActiva = async (v: VentanillaDTO) => {
    try {
      await VentanillaAPI.actualizar(v.id, { nombre: v.nombre, activa: !v.activa });
      await fetchData();
    } catch (error) {
      console.error('Error cambiando estado:', error);
    }
  };

  const resetForm = () => {
    setFormData({ nombre: '', activa: true });
    setIsEditing(false);
    setEditingId(null);
    setShowModal(false);
  };

  const handleReactivate = async (id: number) => {
    console.log('[Ventanilla] Intentando reactivar ventanilla ID:', id);
    
    try {
      const ventanillaActual = ventanillas.find(v => v.id === id);
      if (!ventanillaActual) {
        alert('❌ No se encontró la ventanilla especificada');
        return;
      }
      
      if (window.confirm(`¿Está seguro de reactivar la ventanilla "${ventanillaActual.nombre}"?`)) {
        console.log('[Ventanilla] Usuario confirmó reactivación, enviando petición...');
        
        const actualizacion: ActualizarVentanillaInput = {
          nombre: ventanillaActual.nombre,
          activa: true // ✅ REACTIVAR
        };
        
        await VentanillaAPI.actualizar(id, actualizacion);
        console.log('[Ventanilla] ✅ Ventanilla reactivada exitosamente');
        await fetchData();
        alert(`✅ Ventanilla "${ventanillaActual.nombre}" reactivada correctamente`);
      }
    } catch (error: any) {
      console.error('[Ventanilla] ❌ Error reactivando ventanilla:', error);
      alert(`❌ Error al reactivar ventanilla: ${error?.message || 'Error desconocido'}`);
    }
  };

  const handleAssignEmployee = (ventanilla: VentanillaDTO) => {
    setSelectedVentanilla(ventanilla);
    setSelectedEmpleado(ventanilla.asignacionActual?.empleado?.id || '');
    setShowAssignModal(true);
  };

  const handleAssignSubmit = async () => {
    if (!selectedVentanilla || selectedEmpleado === '') return;
    
    try {
      // Aquí deberías implementar la llamada a tu API
      // await VentanillaAPI.asignarEmpleado(selectedVentanilla.id, selectedEmpleado);
      console.log(`Asignando empleado ${selectedEmpleado} a ventanilla ${selectedVentanilla.id}`);
      
      await fetchData(); // Recargar datos
      setShowAssignModal(false);
      setSelectedVentanilla(null);
      setSelectedEmpleado('');
    } catch (error) {
      console.error('Error asignando empleado:', error);
    }
  };

  const resetAssignModal = () => {
    setShowAssignModal(false);
    setSelectedVentanilla(null);
    setSelectedEmpleado('');
  };

  const filteredVentanillas = ventanillas.filter((v) => {
    const matchesSearch = (v.nombre ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = showInactive ? !v.activa : v.activa; // Mostrar inactivas si showInactive=true, sino solo activas
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      {/* Header */}
      <div className="section-header">
        <div>
          <h3>Ventanillas</h3>
          <p style={{ color: 'var(--muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
            Gestiona las ventanillas de atención al cliente
          </p>
        </div>
        <div className="actions">
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus size={16} style={{ marginRight: '8px' }} />
            Nueva Ventanilla
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="stat-card">
          <div>Total Ventanillas</div>
          <div className="stat-number">{ventanillas.length}</div>
        </div>
        <div className="stat-card">
          <div>Inactivas</div>
          <div className="stat-number">{ventanillas.filter((v) => !v.activa).length}</div>
        </div>
        <div className="stat-card">
          <div>Con Empleado</div>
          <div className="stat-number">{ventanillas.filter((v) => !!v.asignacionActual).length}</div>
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
              placeholder="Buscar ventanillas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input"
              style={{ paddingLeft: '40px' }}
            />
          </div>
          <button
            onClick={() => setShowInactive(!showInactive)}
            className="btn-secondary"
            style={{ 
              marginLeft: '12px',
              backgroundColor: showInactive ? 'var(--warning)' : 'var(--success)',
              color: 'white'
            }}
          >
            {showInactive ? '👁️ Inactivas' : '✅ Activas'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="crud-section">
        <div className="table-container">
          <table className="crud-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}></th>
                <th>Ventanilla</th>
                <th>Empleado Asignado</th>
                <th>Estado</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>
                    Cargando ventanillas...
                  </td>
                </tr>
              ) : filteredVentanillas.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                    No se encontraron ventanillas
                  </td>
                </tr>
              ) : (
                filteredVentanillas.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          background: v.activa ? 'var(--primary-50)' : 'var(--border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: v.activa ? 'var(--primary)' : 'var(--muted)',
                        }}
                      >
                        <Monitor size={18} />
                      </div>
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600 }}>{v.nombre}</div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>ID: {v.id}</div>
                      </div>
                    </td>
                    <td>
                      {v.asignacionActual ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={14} color="var(--primary)" />
                          <span style={{ fontSize: '13px', fontWeight: 500 }}>
                            {v.asignacionActual.empleado?.nombre}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Sin asignar</span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => toggleActiva(v)}
                        className={`status pill ${v.activa ? 'ok' : 'ko'}`}
                        style={{ cursor: 'pointer', border: 'none' }}
                      >
                        {v.activa ? 'Activa' : 'Inactiva'}
                      </button>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        {v.activa ? (
                          // Ventanilla ACTIVA - botones normales
                          <>
                            <button 
                              onClick={() => handleAssignEmployee(v)} 
                              className="icon-btn" 
                              title="Asignar Empleado"
                              style={{ color: 'var(--primary)' }}
                            >
                              <User size={14} />
                            </button>
                            <button onClick={() => handleEdit(v)} className="icon-btn" title="Editar">
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(v.id)}
                              className="icon-btn"
                              title="Desactivar"
                              style={{ color: 'var(--warning)' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        ) : (
                          // Ventanilla INACTIVA - solo editar y reactivar
                          <>
                            <button onClick={() => handleEdit(v)} className="icon-btn" title="Editar">
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleReactivate(v.id)}
                              className="icon-btn"
                              title="Reactivar"
                              style={{ color: 'var(--success)' }}
                            >
                              <RotateCcw size={14} />
                            </button>
                          </>
                        )}
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
                <h4 style={{ margin: 0 }}>{isEditing ? 'Editar Ventanilla' : 'Nueva Ventanilla'}</h4>
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
                      Nombre de la Ventanilla *
                    </label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Ej: Ventanilla 1, Caja Principal, Atención VIP..."
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

                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    padding: '16px 20px',
                    backgroundColor: 'var(--primary-50)',
                    borderRadius: '12px',
                    border: '1px solid var(--primary-100)'
                  }}>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="checkbox"
                        id="activa"
                        checked={!!formData.activa}
                        onChange={(e) => setFormData({ ...formData, activa: e.target.checked })}
                        style={{
                          width: '20px',
                          height: '20px',
                          accentColor: 'var(--primary)',
                          cursor: 'pointer'
                        }}
                      />
                    </div>
                    <div>
                      <label 
                        htmlFor="activa" 
                        style={{ 
                          fontWeight: 600, 
                          color: 'var(--text)',
                          cursor: 'pointer',
                          fontSize: '15px'
                        }}
                      >
                        Ventanilla activa
                      </label>
                      <div style={{ 
                        fontSize: '13px', 
                        color: 'var(--muted)',
                        marginTop: '2px'
                      }}>
                        Las ventanillas activas pueden recibir y atender tickets
                      </div>
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
                      {isEditing ? '✓ Actualizar' : '+ Crear Ventanilla'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal Asignar Empleado */}
      {showAssignModal && selectedVentanilla && (
        <>
          <div className="modal-overlay" onClick={resetAssignModal}></div>
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
                <h4 style={{ margin: 0 }}>Asignar Empleado a {selectedVentanilla.nombre}</h4>
                <button
                  onClick={resetAssignModal}
                  className="modal-close"
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div style={{
                    padding: '16px',
                    backgroundColor: 'var(--primary-50)',
                    borderRadius: '12px',
                    border: '1px solid var(--primary-100)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--primary)', marginBottom: '4px' }}>
                      🪟 {selectedVentanilla.nombre}
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
                      Selecciona el empleado que atenderá en esta ventanilla
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ 
                      display: 'block', 
                      fontWeight: 600, 
                      color: 'var(--text)',
                      fontSize: '14px',
                      letterSpacing: '0.01em'
                    }}>
                      👤 Empleado Asignado
                    </label>
                    <select
                      value={selectedEmpleado}
                      onChange={(e) => setSelectedEmpleado(e.target.value ? Number(e.target.value) : '')}
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
                      <option value="">Sin empleado asignado</option>
                      {empleados.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.nombre}
                        </option>
                      ))}
                    </select>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                      💡 El empleado seleccionado será responsable de atender los tickets en esta ventanilla
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
                      onClick={resetAssignModal} 
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
                      onClick={handleAssignSubmit} 
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
                      👤 Asignar Empleado
                    </button>
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

export default VentanillaCrud;
