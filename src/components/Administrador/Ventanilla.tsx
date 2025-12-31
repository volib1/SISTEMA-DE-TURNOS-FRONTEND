import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Monitor, User, RotateCcw, X } from 'lucide-react';
import {
  VentanillaAPI,
  type VentanillaDTO,
  type CrearVentanillaInput,
  type ActualizarVentanillaInput,
} from '../../services/ventanilla.service';
import { AsignacionVentanillaAPI } from '../../services/asignacion-ventanilla.service';

// --- Utilidades UI --- //
type Toast = { type: 'success' | 'error' | 'info'; message: string } | null;
type ConfirmState = {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => Promise<void> | void;
};

type DeleteConfirmState = {
  open: boolean;
  ventanillaId: number | null;
  ventanillaNombre: string;
};

const PrimaryButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { full?: boolean }
> = ({ children, full, style, ...props }) => (
  <button
    {...props}
    className={`btn btn-primary${props.className ? ' ' + props.className : ''}`}
    style={{
      padding: '12px 28px',
      fontWeight: 600,
      borderRadius: '10px',
      background: 'linear-gradient(135deg, var(--primary), var(--primary-600))',
      border: 'none',
      color: 'white',
      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.30)',
      transition: 'transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease',
      width: full ? '100%' : undefined,
      ...style,
    }}
    onMouseEnter={(e) => {
      const t = e.currentTarget;
      t.style.transform = 'translateY(-1px)';
      t.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.40)';
    }}
    onMouseLeave={(e) => {
      const t = e.currentTarget;
      t.style.transform = 'translateY(0)';
      t.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.30)';
    }}
  >
    {children}
  </button>
);

const SecondaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  children,
  style,
  ...props
}) => (
  <button
    {...props}
    className={`btn${props.className ? ' ' + props.className : ''}`}
    style={{
      padding: '12px 20px',
      fontWeight: 600,
      borderRadius: '10px',
      background: 'var(--surface)',
      color: 'var(--text)',
      border: '1px solid var(--border)',
      transition: 'background 0.15s ease, transform 0.15s ease',
      ...style,
    }}
    onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
    onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
  >
    {children}
  </button>
);

const IconBtn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ style, ...props }) => (
  <button
    {...props}
    className={`icon-btn${props.className ? ' ' + props.className : ''}`}
    style={{
      width: 34,
      height: 34,
      borderRadius: 8,
      border: '1px solid var(--border)',
      background: 'var(--surface)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'transform 0.1s ease, background 0.1s ease',
      ...style,
    }}
    onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
    onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
    aria-label={props.title}
  />
);

// --- Toast --- //
const ToastBar: React.FC<{ toast: Toast; onClose: () => void }> = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 2800);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;
  const bg =
    toast.type === 'success'
      ? 'rgba(16,185,129,0.15)'
      : toast.type === 'error'
      ? 'rgba(239,68,68,0.15)'
      : 'rgba(59,130,246,0.15)';

  const border =
    toast.type === 'success'
      ? '1px solid rgba(16,185,129,0.35)'
      : toast.type === 'error'
      ? '1px solid rgba(239,68,68,0.35)'
      : '1px solid rgba(59,130,246,0.35)';

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 10000,
        background: bg,
        color: 'var(--text)',
        padding: '12px 14px',
        borderRadius: 10,
        border,
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <span style={{ fontWeight: 600 }}>
        {toast.type === 'success' ? 'Éxito' : toast.type === 'error' ? 'Error' : 'Info'}
      </span>
      <span style={{ opacity: 0.9 }}>{toast.message}</span>
      <IconBtn onClick={onClose} title="Cerrar" style={{ marginLeft: 6 }}>
        <X size={14} />
      </IconBtn>
    </div>
  );
};

// --- Confirm Dialog --- //
const ConfirmDialog: React.FC<{
  state: ConfirmState;
  setState: (s: ConfirmState) => void;
}> = ({ state, setState }) => {
  if (!state.open) return null;
  const close = () => setState({ ...state, open: false });

  const handleConfirm = async () => {
    try {
      await state.onConfirm?.();
    } finally {
      close();
    }
  };

  return (
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
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 60px rgba(10, 35, 66, 0.3)',
          border: '2px solid #E9C46A',
          width: '100%',
          maxWidth: '480px',
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
          <h2 style={{
            margin: 0,
            color: '#E9C46A',
            fontSize: '18px',
            fontWeight: 700,
            fontFamily: "'Times New Roman', Georgia, serif",
          }}>
            {state.title}
          </h2>
          <button
            onClick={close}
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
          {state.description && (
            <p style={{
              margin: 0,
              color: '#475569',
              fontSize: '15px',
              lineHeight: 1.6,
              whiteSpace: 'pre-line',
            }}>
              {state.description}
            </p>
          )}
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
            onClick={close}
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
            {state.cancelText ?? 'Cancelar'}
          </button>
          <button
            onClick={handleConfirm}
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
              fontFamily: "'Times New Roman', Georgia, serif",
              transition: 'all 0.2s ease',
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
            {state.confirmText ?? 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Componente principal --- //
const VentanillaCrud: React.FC = () => {
  const [ventanillas, setVentanillas] = useState<VentanillaDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [formData, setFormData] = useState<CrearVentanillaInput | ActualizarVentanillaInput>({
    nombre: '',
    activa: true,
  });
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // UI feedback
  const [toast, setToast] = useState<Toast>(null);
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false, title: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({
    open: false,
    ventanillaId: null,
    ventanillaNombre: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const ventanillasData = await VentanillaAPI.listar();
      setVentanillas(ventanillasData);
    } catch {
      setToast({ type: 'error', message: 'No se pudieron cargar las ventanillas.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && editingId) {
        await VentanillaAPI.actualizar(editingId, formData as ActualizarVentanillaInput);
        setToast({ type: 'success', message: 'Ventanilla actualizada correctamente.' });
      } else {
        await VentanillaAPI.crear(formData as CrearVentanillaInput);
        setToast({ type: 'success', message: 'Ventanilla creada correctamente.' });
      }
      await fetchData();
      resetForm();
    } catch {
      setToast({ type: 'error', message: 'Error al guardar la ventanilla.' });
    }
  };

  const handleEdit = (ventanilla: VentanillaDTO) => {
    setFormData({ nombre: ventanilla.nombre, activa: !!ventanilla.activa });
    setIsEditing(true);
    setEditingId(ventanilla.id);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const { tiene, cantidad, activas } = await AsignacionVentanillaAPI.tieneAsignaciones(id);

      if (activas > 0) {
  const ventanillaActual = ventanillas.find((v) => v.id === id);

  setConfirm({
    open: true,
    title: 'No se puede eliminar la ventanilla',
    description: `La ventanilla "${ventanillaActual?.nombre}" tiene ${activas} asignación(es) activa(s).\n\nDebe liberar o reasignar al empleado antes de poder desactivarla.`,
    confirmText: 'Entendido',
    onConfirm: () => {},
  });

  return;
}


      const ventanillaActual = ventanillas.find((v) => v.id === id);
      if (!ventanillaActual) {
        setToast({ type: 'error', message: 'Ventanilla no encontrada.' });
        return;
      }

      setConfirm({
        open: true,
        title: `Desactivar "${ventanillaActual.nombre}"`,
        description:
          cantidad > 0 && tiene
            ? `Tiene ${cantidad} asignacion(es) histórica(s); no se eliminarán.\nLa ventanilla quedará como inactiva y podrá reactivarse.`
            : `La ventanilla quedará como inactiva y podrá reactivarse posteriormente.`,
        confirmText: 'Desactivar',
        cancelText: 'Cancelar',
        onConfirm: async () => {
          const actualizacion: ActualizarVentanillaInput = {
            nombre: ventanillaActual.nombre,
            activa: false,
          };
          await VentanillaAPI.actualizar(id, actualizacion);
          await fetchData();
          setToast({ type: 'success', message: `Ventanilla "${ventanillaActual.nombre}" desactivada.` });
        },
      });
    } catch {
      setToast({ type: 'error', message: 'Error al preparar la desactivación.' });
    }
  };

  const toggleActiva = async (v: VentanillaDTO) => {
    try {
      await VentanillaAPI.actualizar(v.id, { nombre: v.nombre, activa: !v.activa });
      await fetchData();
      setToast({
        type: 'success',
        message: `Ventanilla "${v.nombre}" ${!v.activa ? 'activada' : 'desactivada'}.`,
      });
    } catch {
      setToast({ type: 'error', message: 'No se pudo cambiar el estado.' });
    }
  };

  const resetForm = () => {
    setFormData({ nombre: '', activa: true });
    setIsEditing(false);
    setEditingId(null);
    setShowModal(false);
  };

  // Funciones para modal de eliminación permanente
  const openDeleteConfirm = (ventanilla: VentanillaDTO) => {
    setDeleteConfirm({
      open: true,
      ventanillaId: ventanilla.id,
      ventanillaNombre: ventanilla.nombre,
    });
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirm({ open: false, ventanillaId: null, ventanillaNombre: '' });
  };

  const handleDeletePermanent = async () => {
    if (!deleteConfirm.ventanillaId) return;

    try {
      await VentanillaAPI.eliminar(deleteConfirm.ventanillaId);
      setToast({ type: 'success', message: `Ventanilla "${deleteConfirm.ventanillaNombre}" eliminada permanentemente.` });
      await fetchData();
    } catch (error: any) {
      setToast({ type: 'error', message: error.message || 'Error al eliminar la ventanilla.' });
    } finally {
      closeDeleteConfirm();
    }
  };

  const handleReactivate = async (id: number) => {
    const ventanillaActual = ventanillas.find((v) => v.id === id);
    if (!ventanillaActual) {
      setToast({ type: 'error', message: 'Ventanilla no encontrada.' });
      return;
    }
    setConfirm({
      open: true,
      title: `Reactivar "${ventanillaActual.nombre}"`,
      confirmText: 'Reactivar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        await VentanillaAPI.actualizar(id, { nombre: ventanillaActual.nombre, activa: true });
        await fetchData();
        setToast({ type: 'success', message: `Ventanilla "${ventanillaActual.nombre}" reactivada.` });
      },
    });
  };

  const filteredVentanillas = ventanillas.filter((v) => {
    const matchesSearch = (v.nombre ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = showInactive ? !v.activa : v.activa;
    return matchesSearch && matchesStatus;
  });

  // Paginación
  const totalPages = Math.ceil(filteredVentanillas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedVentanillas = filteredVentanillas.slice(startIndex, endIndex);

  // Reset page cuando cambia el filtro o el estado activo/inactivo
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, showInactive]);

  return (
    <div>
      <ToastBar toast={toast} onClose={() => setToast(null)} />
      <ConfirmDialog state={confirm} setState={setConfirm} />

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
          }}>Ventanillas</h3>
          <p style={{
            color: 'rgba(255, 255, 255, 0.85)',
            fontSize: '1.1rem',
            margin: '0.5rem 0 0 0',
            fontFamily: "'Times New Roman', Georgia, serif",
            fontStyle: 'italic',
          }}>
            Gestiona las ventanillas de atención al cliente
          </p>
        </div>
        <div className="actions" style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setShowModal(true)}
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
      <div className="crud-section" style={{ marginBottom: 20 }}>
        <div className="toolbar" style={{ gap: 12 }}>
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
              placeholder="Buscar ventanillas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input"
              style={{ paddingLeft: 40 }}
              aria-label="Buscar ventanillas"
            />
          </div>
          <button
            onClick={() => setShowInactive(!showInactive)}
            style={{
              padding: '12px 20px',
              fontSize: 14,
              fontWeight: 600,
              borderRadius: '10px',
              background: showInactive
                ? 'linear-gradient(135deg, #F4A460 0%, #E8943A 100%)'
                : 'linear-gradient(135deg, #5FB878 0%, #4A9D6F 100%)',
              border: 'none',
              color: 'white',
              boxShadow: showInactive
                ? '0 4px 12px rgba(244, 164, 96, 0.35)'
                : '0 4px 12px rgba(95, 184, 120, 0.35)',
              transition: 'all 0.2s ease',
              fontFamily: "'Times New Roman', Georgia, serif",
              cursor: 'pointer',
              minWidth: 120,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = showInactive
                ? '0 6px 20px rgba(244, 164, 96, 0.45)'
                : '0 6px 20px rgba(95, 184, 120, 0.45)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = showInactive
                ? '0 4px 12px rgba(244, 164, 96, 0.35)'
                : '0 4px 12px rgba(95, 184, 120, 0.35)';
            }}
            aria-pressed={showInactive}
          >
            {showInactive ? 'Inactivas' : 'Activas'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="crud-section">
        <div className="table-container">
          <table className="crud-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}></th>
                <th>Ventanilla</th>
                <th>Empleado Asignado</th>
                <th>Estado</th>
                <th style={{ width: 140, textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 40 }}>
                    Cargando ventanillas...
                  </td>
                </tr>
              ) : filteredVentanillas.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                    No se encontraron ventanillas
                  </td>
                </tr>
              ) : (
                paginatedVentanillas.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
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
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>ID: {v.id}</div>
                      </div>
                    </td>
                    <td>
                      {v.asignacionActual ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <User size={14} color="var(--primary)" />
                          <span style={{ fontSize: 13, fontWeight: 500 }}>
                            {v.asignacionActual.empleado?.nombre}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--muted)', fontSize: 13 }}>Sin asignar</span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => toggleActiva(v)}
                        className={`status pill ${v.activa ? 'ok' : 'ko'}`}
                        style={{ cursor: 'pointer', border: 'none' }}
                        aria-pressed={v.activa}
                        aria-label={`Cambiar estado de ${v.nombre}`}
                      >
                        {v.activa ? 'Activa' : 'Inactiva'}
                      </button>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                        {v.activa ? (
                          <>
                            <IconBtn onClick={() => handleEdit(v)} title="Editar">
                              <Edit size={14} />
                            </IconBtn>
                            <IconBtn
                              onClick={() => handleDelete(v.id)}
                              title="Desactivar"
                              style={{ color: 'var(--warning)' }}
                            >
                              <Trash2 size={14} />
                            </IconBtn>
                          </>
                        ) : (
                          <>
                            <IconBtn onClick={() => handleEdit(v)} title="Editar">
                              <Edit size={14} />
                            </IconBtn>
                            <IconBtn
                              onClick={() => handleReactivate(v.id)}
                              title="Reactivar"
                              style={{ color: 'var(--success)' }}
                            >
                              <RotateCcw size={14} />
                            </IconBtn>
                            <IconBtn
                              onClick={() => openDeleteConfirm(v)}
                              title="Eliminar permanentemente"
                              style={{ color: '#ef4444' }}
                            >
                              <Trash2 size={14} />
                            </IconBtn>
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

        {/* Paginación */}
        {filteredVentanillas.length > itemsPerPage && (
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
              Mostrando {startIndex + 1} - {Math.min(endIndex, filteredVentanillas.length)} de {filteredVentanillas.length} ventanillas
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
                      <Monitor size={20} color="#E9C46A" />
                    </div>
                    <h4 style={{
                      margin: 0,
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: '#E9C46A',
                      fontFamily: "'Times New Roman', Georgia, serif",
                    }}>
                      {isEditing ? 'Editar Ventanilla' : 'Nueva Ventanilla'}
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
                      Nombre de la Ventanilla <span style={{ color: '#E9C46A' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Ej: Ventanilla 1, Caja Principal..."
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
                      id="activa"
                      checked={!!formData.activa}
                      onChange={(e) => setFormData({ ...formData, activa: e.target.checked })}
                      style={{
                        width: 20,
                        height: 20,
                        accentColor: '#E9C46A',
                        cursor: 'pointer',
                      }}
                    />
                    <div>
                      <label htmlFor="activa" style={{
                        fontWeight: 600,
                        color: '#0A2342',
                        fontSize: 15,
                        cursor: 'pointer',
                        fontFamily: "'Times New Roman', Georgia, serif",
                      }}>
                        Ventanilla activa
                      </label>
                      <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                        Las ventanillas activas pueden recibir y atender tickets
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
                      {isEditing ? 'Actualizar' : 'Crear Ventanilla'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal de Confirmación de Eliminación Permanente */}
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
            zIndex: 9999,
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
              border: '2px solid #dc2626',
              width: '100%',
              maxWidth: '480px',
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
              borderBottom: '3px solid #dc2626',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(220, 38, 38, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Trash2 size={20} color="#dc2626" />
                </div>
                <h2 style={{
                  margin: 0,
                  color: '#E9C46A',
                  fontSize: '18px',
                  fontWeight: 700,
                  fontFamily: "'Times New Roman', Georgia, serif",
                }}>
                  Eliminar Ventanilla Permanentemente
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
                margin: '0 0 16px 0',
                color: '#475569',
                fontSize: '15px',
                lineHeight: 1.6,
              }}>
                ¿Está seguro que desea eliminar permanentemente la ventanilla{' '}
                <strong style={{ color: '#0A2342' }}>"{deleteConfirm.ventanillaNombre}"</strong>?
              </p>
              <div style={{
                background: 'rgba(220, 38, 38, 0.08)',
                border: '1px solid rgba(220, 38, 38, 0.2)',
                borderRadius: '10px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}>
                <Trash2 size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p style={{
                  margin: 0,
                  color: '#991b1b',
                  fontSize: '14px',
                  lineHeight: 1.5,
                }}>
                  <strong>Advertencia:</strong> Esta acción es irreversible. La ventanilla y todos sus datos asociados serán eliminados permanentemente del sistema.
                </p>
              </div>
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
                onClick={handleDeletePermanent}
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
                Eliminar Permanentemente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VentanillaCrud;
