import React, { useEffect, useMemo, useState } from 'react';
import { Users, Monitor, Plus, X, Check, AlertCircle, Clock, User, RefreshCw, Settings } from 'lucide-react';
import { useAsignacionVentanilla } from '../../hooks/useAsignacionVentanilla';
import '../../styles/AsignacionVentanilla.css';

// -------------------- Tipos UI -------------------- //
type Toast = { type: 'success' | 'error' | 'info'; message: string } | null;
type ConfirmState = {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => Promise<void> | void;
};

// -------------------- Controles base -------------------- //
const PrimaryButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { full?: boolean }
> = ({ children, full, style, disabled, ...props }) => (
  <button
    {...props}
    disabled={disabled}
    className={`btn btn-primary${props.className ? ' ' + props.className : ''}`}
    style={{
      padding: '12px 24px',
      fontWeight: 600,
      borderRadius: '10px',
      background: '#E9C46A',
      border: '2px solid #E9C46A',
      color: '#0A2342',
      boxShadow: '0 4px 12px rgba(233, 196, 106, 0.35)',
      transition: 'transform .15s ease, box-shadow .15s ease',
      fontFamily: "'Times New Roman', Georgia, serif",
      width: full ? '100%' : undefined,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.7 : 1,
      ...style,
    }}
    onMouseEnter={(e) => {
      if (disabled) return;
      const t = e.currentTarget;
      t.style.transform = 'translateY(-2px)';
      t.style.boxShadow = '0 6px 20px rgba(233, 196, 106, 0.45)';
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

const SecondaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  children,
  style,
  ...props
}) => (
  <button
    {...props}
    className={`btn${props.className ? ' ' + props.className : ''}`}
    style={{
      padding: '12px 24px',
      fontWeight: 600,
      borderRadius: '10px',
      background: '#ffffff',
      color: '#64748b',
      border: '2px solid #e2e8f0',
      transition: 'all .15s ease',
      fontFamily: "'Times New Roman', Georgia, serif",
      cursor: 'pointer',
      ...style,
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-1px)';
      e.currentTarget.style.borderColor = '#cbd5e1';
      e.currentTarget.style.background = '#f8fafc';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.borderColor = '#e2e8f0';
      e.currentTarget.style.background = '#ffffff';
    }}
  >
    {children}
  </button>
);

const IconBtn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  children,
  style,
  ...props
}) => (
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
      transition: 'transform .1s ease, background .1s ease',
      ...style,
    }}
    onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
    onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
  >
    {children}
  </button>
);

// -------------------- Utilidades UI -------------------- //
const ToastBar: React.FC<{ toast: Toast; onClose: () => void }> = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 2800);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;

  const palette =
    toast.type === 'success'
      ? { bg: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', title: 'Éxito' }
      : toast.type === 'error'
      ? { bg: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', title: 'Error' }
      : { bg: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.35)', title: 'Info' };

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 10000,
        background: palette.bg,
        color: 'var(--text)',
        padding: '12px 14px',
        borderRadius: 10,
        border: palette.border,
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <span style={{ fontWeight: 600 }}>{palette.title}</span>
      <span style={{ opacity: 0.9 }}>{toast.message}</span>
      <IconBtn onClick={onClose} title="Cerrar" aria-label="Cerrar notificación" style={{ marginLeft: 6 }}>
        <X size={14} />
      </IconBtn>
    </div>
  );
};

const ConfirmDialog: React.FC<{ state: ConfirmState; setState: (s: ConfirmState) => void }> = ({
  state,
  setState,
}) => {
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

// -------------------- Subcomponentes de Presentación -------------------- //
const SectionHeader: React.FC<{ icon?: React.ReactNode; title: string; subtitle?: string; right?: React.ReactNode; isMain?: boolean }> = ({
  icon,
  title,
  subtitle,
  right,
  isMain = false,
}) => isMain ? (
  <header style={{
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
      <h2 style={{
        fontSize: '2.75rem',
        fontWeight: 700,
        margin: 0,
        color: '#E9C46A',
        fontFamily: "'Times New Roman', Georgia, serif",
        letterSpacing: '0.02em',
        textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
      }}>{title}</h2>
      {subtitle && <p style={{
        color: 'rgba(255, 255, 255, 0.85)',
        fontSize: '1.1rem',
        margin: '0.5rem 0 0 0',
        fontFamily: "'Times New Roman', Georgia, serif",
        fontStyle: 'italic',
      }}>{subtitle}</p>}
    </div>
    <div>{right}</div>
  </header>
) : (
  <header className="section-header">
    <div className="section-header__left">
      {icon}
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </div>
    <div className="section-header__right">{right}</div>
  </header>
);

const StatCard: React.FC<{ icon: React.ReactNode; value: number | string; label: string; tone?: 'success' | 'info' | 'primary' }> = ({ icon, value, label, tone = 'primary' }) => (
  <div className={`stat-card ${tone}`}>
    <div className={`stat-icon ${tone}`}>{icon}</div>
    <div>
      <h3>{value}</h3>
      <p>{label}</p>
    </div>
  </div>
);

const ServiciosChips: React.FC<{ servicios: { id: number; servicio: string; activo: boolean }[] | undefined }> = ({ servicios }) => {
  if (!servicios || servicios.length === 0) return <p className="no-servicios">Sin servicios configurados</p>;
  return (
    <div className="servicios-list">
      {servicios.map((s) => (
        <span key={s.id} className={`service-tag ${s.activo ? 'activo' : 'inactivo'}`}>
          {s.servicio}
        </span>
      ))}
    </div>
  );
};

const formatTime = (isoString: string) => new Date(isoString).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
const formatDuration = (inicio: string) => {
  const start = new Date(inicio).getTime();
  const now = Date.now();
  const diff = now - start;
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return `${hours}h ${minutes}m`;
};

const VentanillaCard: React.FC<{
  ventanilla: { id: number; nombre: string; activa: boolean; servicios?: { id: number; servicioId?: number; servicio: string; activo: boolean }[] };
  asignacion?: any;
  onAsignar: (ventanillaId: number) => void;
  onCerrar: (asignacionId: number) => void;
  onEditarServicios: (ventanillaId: number) => void;
  procesando: boolean;
}> = ({ ventanilla, asignacion, onAsignar, onCerrar, onEditarServicios, procesando }) => (
  <article key={ventanilla.id} className={`ventanilla-card ${asignacion ? 'ocupada' : 'libre'}`}>
    <div className="ventanilla-header">
      <div className="ventanilla-info">
        <Monitor size={18} />
        <h3>{ventanilla.nombre}</h3>
      </div>
      <div className={`status-indicator ${asignacion ? 'ocupada' : 'libre'}`}>{asignacion ? 'Ocupada' : 'Libre'}</div>
    </div>

    <div className="ventanilla-content">
      {asignacion ? (
        <div className="asignacion-info">
          <div className="empleado-info">
            <User size={16} />
            <div>
              <strong>{asignacion.empleado.nombre}</strong>
              {asignacion.empleado.correo && <small>{asignacion.empleado.correo}</small>}
            </div>
          </div>

          <div className="tiempo-info">
            <Clock size={14} />
            <span>Desde {formatTime(asignacion.fechaInicio)}</span>
            <span className="duracion">({formatDuration(asignacion.fechaInicio)})</span>
          </div>

          <div className="ventanilla-actions">
            <button onClick={() => onCerrar(asignacion.id)} className="btn-danger-sm" disabled={procesando} aria-busy={procesando}>
              <X size={14} />
              Finalizar Turno
            </button>
          </div>
        </div>
      ) : (
        <div className="ventanilla-libre">
          <p>Ventanilla disponible</p>
          <button onClick={() => onAsignar(ventanilla.id)} className="btn-assign">
            <Plus size={14} />
            Asignar Empleado
          </button>
        </div>
      )}
    </div>

    <div className="servicios-ventanilla">
      <div className="servicios-header">
        <h4>Servicios:</h4>
        <button
          onClick={() => onEditarServicios(ventanilla.id)}
          className="btn-edit-servicios"
          title="Editar servicios"
          disabled={procesando}
        >
          <Settings size={14} />
          Editar
        </button>
      </div>
      <ServiciosChips servicios={ventanilla.servicios} />
    </div>
  </article>
);

// -------------------- Modal de Asignación -------------------- //
const ModalAsignacion: React.FC<{
  open: boolean;
  onClose: () => void;
  ventanillasDisponibles: { id: number; nombre: string; servicios?: { id: number; servicioId?: number; servicio: string; activo: boolean }[] }[];
  empleadosDisponibles: { id: number; nombre: string; rol?: string | null }[];
  servicios: { id: number; nombre: string; activo?: boolean }[];
  onConfirm: (payload: { idVentanilla: number; idEmpleado: number; servicios: number[] }) => Promise<boolean>;
  procesando: boolean;
  getAsignacionActiva: (id: number) => any | undefined;
  presetVentanilla?: number | null;
}> = ({ open, onClose, ventanillasDisponibles, empleadosDisponibles, servicios, onConfirm, procesando, getAsignacionActiva, presetVentanilla = null }) => {
  const [selectedVentanilla, setSelectedVentanilla] = useState<number | null>(presetVentanilla);
  const [selectedEmpleado, setSelectedEmpleado] = useState<number | null>(null);
  const [selectedServicios, setSelectedServicios] = useState<number[]>([]);

  useEffect(() => {
    // reset cuando cambia open/preset
    if (open) {
      setSelectedVentanilla(presetVentanilla);
      setSelectedEmpleado(null);

      // Si hay una ventanilla preestablecida, cargar sus servicios existentes
      if (presetVentanilla) {
        const ventanilla = ventanillasDisponibles.find(v => v.id === presetVentanilla);
        if (ventanilla?.servicios && ventanilla.servicios.length > 0) {
          const serviciosExistentes = ventanilla.servicios
            .filter(s => s.activo)
            .map(s => s.servicioId || s.id);
          console.log('[ModalAsignacion] 📋 Pre-cargando servicios existentes:', serviciosExistentes);
          setSelectedServicios(serviciosExistentes);
        } else {
          setSelectedServicios([]);
        }
      } else {
        setSelectedServicios([]);
      }
    }
  }, [open, presetVentanilla, ventanillasDisponibles]);

  // Permitir todos los servicios activos - un servicio puede ser atendido en múltiples ventanillas
  const serviciosDisponibles = useMemo(() => {
    console.log('[ModalAsignacion] 📋 Servicios disponibles:', servicios);
    // Filtrar solo por servicios activos, permitir que se asignen a cualquier ventanilla
    return servicios.filter(s => s.activo !== false);
  }, [servicios]);

  const toggleServicio = (id: number) => {
    console.log('[ModalAsignacion] 🔄 Toggle servicio ID:', id);
    setSelectedServicios((prev) => {
      const newValue = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      console.log('[ModalAsignacion] ✅ Servicios seleccionados:', newValue);
      return newValue;
    });
  };

  const disabled = procesando || !selectedVentanilla || !selectedEmpleado || selectedServicios.length === 0;

  const handleConfirm = async () => {
    if (!disabled && selectedVentanilla && selectedEmpleado) {
      const ok = await onConfirm({ idVentanilla: selectedVentanilla, idEmpleado: selectedEmpleado, servicios: selectedServicios });
      if (ok) onClose();
    }
  };

  if (!open) return null;

  // Obtener nombre de la ventanilla seleccionada
  const ventanillaSeleccionada = ventanillasDisponibles.find(v => v.id === selectedVentanilla);

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
        zIndex: 1000,
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Asignación"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 60px rgba(10, 35, 66, 0.3)',
          border: '2px solid #E9C46A',
          width: '100%',
          maxWidth: '520px',
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
            color: '#ffffff',
            fontSize: '18px',
            fontWeight: 700,
            fontFamily: "'Times New Roman', Georgia, serif",
          }}>
            {presetVentanilla ? `Asignar a ${ventanillaSeleccionada?.nombre || 'Ventanilla'}` : 'Asignar Empleado a Ventanilla'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(233, 196, 106, 0.3)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {/* Fila con Ventanilla y Empleado */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
            <div style={{ flex: 1 }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#0A2342',
              }}>
                Ventanilla:
              </label>
              {presetVentanilla ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  background: '#f8fafc',
                  borderRadius: '10px',
                  border: '2px solid #E9C46A',
                  color: '#0A2342',
                  fontWeight: 600,
                }}>
                  <Monitor size={18} style={{ color: '#E9C46A' }} />
                  <span>{ventanillaSeleccionada?.nombre || 'Ventanilla'}</span>
                </div>
              ) : (
                <select
                  value={selectedVentanilla ?? ''}
                  onChange={(e) => setSelectedVentanilla(e.target.value ? Number(e.target.value) : null)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '2px solid #e2e8f0',
                    fontSize: '14px',
                    color: '#0A2342',
                    background: '#ffffff',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="">Seleccionar ventanilla...</option>
                  {ventanillasDisponibles
                    .filter((v) => !getAsignacionActiva(v.id))
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.nombre}
                      </option>
                    ))}
                </select>
              )}
            </div>

            <div style={{ flex: 1 }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#0A2342',
              }}>
                Empleado:
              </label>
              <select
                value={selectedEmpleado ?? ''}
                onChange={(e) => setSelectedEmpleado(e.target.value ? Number(e.target.value) : null)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '2px solid #e2e8f0',
                  fontSize: '14px',
                  color: '#0A2342',
                  background: '#ffffff',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="">Seleccionar empleado...</option>
                {empleadosDisponibles.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre} {e.rol ? `(${e.rol})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Servicios Section */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#0A2342',
            }}>
              Servicios que atenderá:
            </label>
            <p style={{
              margin: '0 0 12px 0',
              fontSize: '13px',
              color: '#64748b',
            }}>
              Selecciona los servicios que este empleado atenderá en la ventanilla
            </p>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '200px',
              overflowY: 'auto',
              padding: '4px',
            }}>
              {serviciosDisponibles.length === 0 ? (
                <p style={{
                  padding: '16px',
                  background: '#fef3c7',
                  borderRadius: '10px',
                  color: '#92400e',
                  fontSize: '14px',
                  margin: 0,
                  textAlign: 'center',
                }}>
                  No hay servicios disponibles. Crea servicios en la sección de Servicios.
                </p>
              ) : (
                serviciosDisponibles.map((servicio) => (
                  <label
                    key={servicio.id}
                    htmlFor={`servicio-asig-${servicio.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '14px 16px',
                      background: selectedServicios.includes(servicio.id) ? '#fffbeb' : '#ffffff',
                      borderRadius: '10px',
                      border: `2px solid ${selectedServicios.includes(servicio.id) ? '#E9C46A' : '#e2e8f0'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <input
                      type="checkbox"
                      id={`servicio-asig-${servicio.id}`}
                      checked={selectedServicios.includes(servicio.id)}
                      onChange={() => toggleServicio(servicio.id)}
                      style={{
                        width: '20px',
                        height: '20px',
                        accentColor: '#E9C46A',
                        cursor: 'pointer',
                      }}
                    />
                    <span style={{
                      fontSize: '14px',
                      color: '#0A2342',
                      fontWeight: selectedServicios.includes(servicio.id) ? 600 : 400,
                      textTransform: 'capitalize',
                    }}>
                      {servicio.nombre.toLowerCase()}
                    </span>
                  </label>
                ))
              )}
            </div>

            {serviciosDisponibles.length > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '16px',
                padding: '12px 16px',
                background: 'linear-gradient(135deg, #0A2342 0%, #132743 100%)',
                borderRadius: '10px',
                color: 'white',
              }}>
                <span style={{ fontSize: '14px' }}>Servicios seleccionados:</span>
                <span style={{
                  background: '#E9C46A',
                  color: '#0A2342',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontWeight: 700,
                  fontSize: '14px',
                }}>
                  {selectedServicios.length} de {serviciosDisponibles.length}
                </span>
              </div>
            )}

            {selectedServicios.length === 0 && serviciosDisponibles.length > 0 && (
              <p style={{
                marginTop: '12px',
                padding: '12px 16px',
                background: '#fef3c7',
                borderRadius: '10px',
                color: '#92400e',
                fontSize: '14px',
                textAlign: 'center',
              }}>
                Debes seleccionar al menos un servicio
              </p>
            )}
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
          <SecondaryButton onClick={onClose}>Cancelar</SecondaryButton>
          <PrimaryButton onClick={handleConfirm} disabled={disabled} aria-busy={procesando}>
            {procesando ? 'Procesando…' : 'Confirmar Asignación'}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
};

// -------------------- Modal de Edición de Servicios -------------------- //
const ModalEditarServicios: React.FC<{
  open: boolean;
  onClose: () => void;
  ventanilla: { id: number; nombre: string; servicios?: { id: number; servicioId?: number; servicio: string; activo: boolean }[] } | null;
  todosServicios: { id: number; nombre: string; activo?: boolean }[];
  onConfirm: (ventanillaId: number, serviciosAAgregar: number[], serviciosAQuitar: number[]) => Promise<boolean>;
  procesando: boolean;
}> = ({ open, onClose, ventanilla, todosServicios, onConfirm, procesando }) => {
  const [selectedServicios, setSelectedServicios] = useState<number[]>([]);

  // Inicializar con los servicios actualmente asignados
  useEffect(() => {
    if (open && ventanilla?.servicios) {
      const serviciosActuales = ventanilla.servicios
        .filter(s => s.activo)
        .map(s => s.servicioId || s.id);
      setSelectedServicios(serviciosActuales);
    }
  }, [open, ventanilla]);

  const serviciosDisponibles = useMemo(() => {
    return todosServicios.filter(s => s.activo !== false);
  }, [todosServicios]);

  const toggleServicio = (id: number) => {
    setSelectedServicios(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleConfirm = async () => {
    if (!ventanilla) return;

    // Determinar qué servicios agregar y cuáles quitar
    const serviciosActuales = (ventanilla.servicios || [])
      .filter(s => s.activo)
      .map(s => s.servicioId || s.id);

    const serviciosAAgregar = selectedServicios.filter(id => !serviciosActuales.includes(id));
    const serviciosAQuitar = serviciosActuales.filter(id => !selectedServicios.includes(id));

    console.log('[ModalEditarServicios] Servicios actuales:', serviciosActuales);
    console.log('[ModalEditarServicios] Servicios seleccionados:', selectedServicios);
    console.log('[ModalEditarServicios] A agregar:', serviciosAAgregar);
    console.log('[ModalEditarServicios] A quitar:', serviciosAQuitar);

    const ok = await onConfirm(ventanilla.id, serviciosAAgregar, serviciosAQuitar);
    if (ok) onClose();
  };

  if (!open || !ventanilla) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10, 35, 66, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9998,
        padding: '20px',
      }}
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
            <h2 style={{
              margin: 0,
              color: '#E9C46A',
              fontSize: '1.25rem',
              fontWeight: 700,
              fontFamily: "'Times New Roman', Georgia, serif",
            }}>
              Editar Servicios - {ventanilla.nombre}
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255,255,255,0.7)',
                fontSize: '18px',
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: 600,
            color: '#0A2342',
            marginBottom: '8px',
            fontFamily: "'Times New Roman', Georgia, serif",
          }}>
            Servicios asignados a esta ventanilla:
          </label>

          <p style={{
            fontSize: '13px',
            color: '#64748b',
            margin: '0 0 16px 0',
            paddingLeft: '12px',
            borderLeft: '3px solid #E9C46A',
          }}>
            Selecciona o deselecciona los servicios que se atenderán
          </p>

          {/* Lista de servicios */}
          <div style={{
            background: '#f8fafc',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '12px',
            maxHeight: '280px',
            overflowY: 'auto',
          }}>
            {serviciosDisponibles.length === 0 ? (
              <p style={{ color: '#dc2626', fontSize: '14px', margin: 0, textAlign: 'center', padding: '20px' }}>
                No hay servicios disponibles.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {serviciosDisponibles.map((servicio) => (
                  <label
                    key={servicio.id}
                    htmlFor={`edit-servicio-${servicio.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '14px 16px',
                      background: selectedServicios.includes(servicio.id) ? '#fffbeb' : '#ffffff',
                      borderRadius: '10px',
                      border: `2px solid ${selectedServicios.includes(servicio.id) ? '#E9C46A' : '#e2e8f0'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <input
                      type="checkbox"
                      id={`edit-servicio-${servicio.id}`}
                      checked={selectedServicios.includes(servicio.id)}
                      onChange={() => toggleServicio(servicio.id)}
                      style={{
                        width: '20px',
                        height: '20px',
                        accentColor: '#0A2342',
                        cursor: 'pointer',
                      }}
                    />
                    <span style={{
                      fontSize: '15px',
                      color: '#0A2342',
                      fontWeight: 500,
                      textTransform: 'capitalize',
                      fontFamily: "'Times New Roman', Georgia, serif",
                    }}>
                      {servicio.nombre.toLowerCase()}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Contador */}
          {serviciosDisponibles.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '16px',
              padding: '12px 16px',
              background: 'linear-gradient(135deg, #0A2342 0%, #132743 100%)',
              borderRadius: '10px',
              color: 'white',
            }}>
              <span style={{ fontSize: '14px', fontWeight: 600, fontFamily: "'Times New Roman', Georgia, serif" }}>
                Servicios seleccionados:
              </span>
              <span style={{
                background: '#E9C46A',
                color: '#0A2342',
                padding: '4px 14px',
                borderRadius: '20px',
                fontWeight: 700,
                fontSize: '14px',
              }}>
                {selectedServicios.length} de {serviciosDisponibles.length}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
          padding: '16px 24px',
          borderTop: '1px solid #e2e8f0',
          background: '#fafafa',
        }}>
          <button
            onClick={onClose}
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
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={procesando}
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 600,
              borderRadius: '10px',
              background: '#E9C46A',
              border: '2px solid #E9C46A',
              color: '#0A2342',
              cursor: procesando ? 'not-allowed' : 'pointer',
              opacity: procesando ? 0.7 : 1,
              boxShadow: '0 4px 12px rgba(233, 196, 106, 0.35)',
              fontFamily: "'Times New Roman', Georgia, serif",
            }}
          >
            {procesando ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
};

// -------------------- Componente Principal -------------------- //
const AsignacionVentanilla: React.FC = () => {
  const { asignaciones, ventanillas, empleados, servicios, loading, error, procesando, refresh, crearAsignacion, cerrarAsignacion, modificarServiciosVentanilla, clearError } = useAsignacionVentanilla();

  // ---- Estado UI ---- //
  const [toast, setToast] = useState<Toast>(null);
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false, title: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [presetVentanilla, setPresetVentanilla] = useState<number | null>(null);
  const [modalEditarServiciosOpen, setModalEditarServiciosOpen] = useState(false);
  const [ventanillaAEditar, setVentanillaAEditar] = useState<{ id: number; nombre: string; servicios?: { id: number; servicioId?: number; servicio: string; activo: boolean }[] } | null>(null);

  // ---- Derivados ---- //
  const ventanillasDisponibles = useMemo(() => ventanillas.filter((v) => v.activa), [ventanillas]);
  const asignacionesActivas = useMemo(() => asignaciones.filter((a) => !a.fechaFin), [asignaciones]);

  const getAsignacionActiva = (ventanillaId: number) => asignacionesActivas.find((a) => a.ventanilla.id === ventanillaId);

  const empleadosDisponibles = useMemo(
    () => empleados.filter((e) => e.activo && !asignacionesActivas.some((a) => a.empleado.id === e.id)),
    [empleados, asignacionesActivas]
  );

  const ventOcupadas = useMemo(() => ventanillasDisponibles.filter((v) => !!getAsignacionActiva(v.id)), [ventanillasDisponibles, asignacionesActivas]);
  const ventLibres = useMemo(() => ventanillasDisponibles.filter((v) => !getAsignacionActiva(v.id)), [ventanillasDisponibles, asignacionesActivas]);

  // ---- Acciones ---- //
  const openAsignar = (ventanillaId?: number) => {
    setPresetVentanilla(ventanillaId ?? null);
    setModalOpen(true);
  };

  const handleCrearAsignacion = async (payload: { idVentanilla: number; idEmpleado: number; servicios: number[] }) => {
    const ok = await crearAsignacion(payload);
    setToast({ type: ok ? 'success' : 'error', message: ok ? 'Asignación creada correctamente.' : 'No se pudo crear la asignación.' });
    return ok;
  };

  const handleCerrarAsignacion = (asignacionId: number) =>
    setConfirm({
      open: true,
      title: 'Finalizar turno',
      description: '¿Deseas cerrar esta asignación? No podrás seguir atendiendo en la ventanilla con este empleado.',
      confirmText: 'Finalizar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        const ok = await cerrarAsignacion(asignacionId);
        setToast({ type: ok ? 'success' : 'error', message: ok ? 'Asignación cerrada.' : 'No se pudo cerrar la asignación.' });
      },
    });

  const openEditarServicios = (ventanillaId: number) => {
    const ventanilla = ventanillas.find(v => v.id === ventanillaId);
    if (ventanilla) {
      setVentanillaAEditar({
        id: ventanilla.id,
        nombre: ventanilla.nombre,
        servicios: ventanilla.servicios?.map(s => ({
          id: s.id,
          servicioId: s.servicioId,
          servicio: s.servicio,
          activo: s.activo
        }))
      });
      setModalEditarServiciosOpen(true);
    }
  };

  const handleModificarServicios = async (ventanillaId: number, serviciosAAgregar: number[], serviciosAQuitar: number[]) => {
    const ok = await modificarServiciosVentanilla(ventanillaId, serviciosAAgregar, serviciosAQuitar);
    setToast({
      type: ok ? 'success' : 'error',
      message: ok ? 'Servicios actualizados correctamente.' : 'No se pudieron actualizar los servicios.'
    });
    return ok;
  };

  // -------------------- Render -------------------- //
  return (
    <div className="asignacion-container">
      <ToastBar toast={toast} onClose={() => setToast(null)} />
      <ConfirmDialog state={confirm} setState={setConfirm} />

      {/* Encabezado / Toolbar - Estilo institucional */}
      <SectionHeader
        isMain={true}
        title="Asignación de Ventanillas"
        subtitle="Gestiona empleados y servicios asignados a ventanillas"
        right={
          <div className="header-actions" style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={refresh}
              disabled={loading}
              style={{
                width: 40,
                height: 40,
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0A2342 0%, #132743 100%)',
                border: '2px solid #E9C46A',
                color: '#E9C46A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (loading) return;
                e.currentTarget.style.background = '#E9C46A';
                e.currentTarget.style.color = '#0A2342';
              }}
              onMouseLeave={(e) => {
                if (loading) return;
                e.currentTarget.style.background = 'linear-gradient(135deg, #0A2342 0%, #132743 100%)';
                e.currentTarget.style.color = '#E9C46A';
              }}
              title="Actualizar"
              aria-label="Actualizar"
            >
              <RefreshCw size={16} className={loading ? 'spin' : ''} />
            </button>
            <button
              onClick={() => openAsignar()}
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
              Asignar Empleado
            </button>
          </div>
        }
      />

      {error && (
        <div className="error-banner" role="alert">
          <AlertCircle size={16} />
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={clearError} className="btn-close" aria-label="Cerrar error">
            ×
          </button>
        </div>
      )}

      {/* Resumen / KPIs */}
      <section aria-labelledby="stats-heading" className="stats-section">
        <h2 id="stats-heading" className="sr-only">Resumen</h2>
        <div className="stats-grid">
          <StatCard icon={<Check size={20} />} value={asignacionesActivas.length} label="Ventanillas Ocupadas" tone="success" />
          <StatCard icon={<Monitor size={20} />} value={ventanillasDisponibles.length - asignacionesActivas.length} label="Ventanillas Libres" tone="info" />
          <StatCard icon={<Users size={20} />} value={empleadosDisponibles.length} label="Empleados Disponibles" tone="primary" />
        </div>
      </section>

      {/* Grid OCUPADAS */}
      <section className="ventanillas-section">
        <SectionHeader title={`Ocupadas (${ventOcupadas.length})`} subtitle="Asignaciones en curso" />
        <div className="ventanillas-grid">
          {ventOcupadas.length === 0 ? (
            <p className="muted">No hay ventanillas ocupadas.</p>
          ) : (
            ventOcupadas.map((v) => (
              <VentanillaCard
                key={v.id}
                ventanilla={v}
                asignacion={getAsignacionActiva(v.id)}
                onAsignar={() => openAsignar(v.id)}
                onCerrar={handleCerrarAsignacion}
                onEditarServicios={openEditarServicios}
                procesando={procesando}
              />
            ))
          )}
        </div>
      </section>

      {/* Grid LIBRES */}
      <section className="ventanillas-section">
        <SectionHeader title={`Libres (${ventLibres.length})`} subtitle="Disponibles para asignar" />
        <div className="ventanillas-grid">
          {ventLibres.length === 0 ? (
            <p className="muted">No hay ventanillas libres.</p>
          ) : (
            ventLibres.map((v) => (
              <VentanillaCard
                key={v.id}
                ventanilla={v}
                asignacion={undefined}
                onAsignar={() => openAsignar(v.id)}
                onCerrar={handleCerrarAsignacion}
                onEditarServicios={openEditarServicios}
                procesando={procesando}
              />
            ))
          )}
        </div>
      </section>

      {/* Modal de asignación */}
      <ModalAsignacion
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        ventanillasDisponibles={ventanillasDisponibles}
        empleadosDisponibles={empleadosDisponibles}
        servicios={servicios}
        onConfirm={handleCrearAsignacion}
        procesando={procesando}
        getAsignacionActiva={getAsignacionActiva}
        presetVentanilla={presetVentanilla}
      />

      {/* Modal de edición de servicios */}
      <ModalEditarServicios
        open={modalEditarServiciosOpen}
        onClose={() => {
          setModalEditarServiciosOpen(false);
          setVentanillaAEditar(null);
        }}
        ventanilla={ventanillaAEditar}
        todosServicios={servicios}
        onConfirm={handleModificarServicios}
        procesando={procesando}
      />
    </div>
  );
};

export default AsignacionVentanilla;
