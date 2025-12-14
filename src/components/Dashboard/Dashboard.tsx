import React from "react";
import { TrendingUp, Users, Clock, CheckCircle, Activity, Server, Database, RefreshCw } from "lucide-react";
import { useDashboard } from "../../hooks/useDashboard";
import "../../styles/Dashboard.enhanced.css";

type RecentItem = {
  id: string | number;
  codigo: string;
  ventanilla?: string | null;
  fecha: string; 
  estado: string;
};

const PrimaryButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { full?: boolean }
> = ({ children, full, style, disabled, ...props }) => (
  <button
    {...props}
    disabled={disabled}
    className={`btn btn-primary${props.className ? " " + props.className : ""}`}
    style={{
      padding: "12px 20px",
      fontSize: 14,
      fontWeight: 600,
      borderRadius: 10,
      background: "linear-gradient(135deg, #0A2342 0%, #132743 100%)",
      border: "2px solid #E9C46A",
      color: "#E9C46A",
      boxShadow: "0 4px 12px rgba(10, 35, 66, 0.30)",
      transition: "transform .15s ease, box-shadow .15s ease, opacity .15s ease, background .15s ease",
      width: full ? "100%" : undefined,
      opacity: disabled ? 0.6 : 1,
      cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: "'Times New Roman', Georgia, serif",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      ...style,
    }}
    onMouseEnter={(e) => {
      if (disabled) return;
      const t = e.currentTarget;
      t.style.transform = "translateY(-2px)";
      t.style.boxShadow = "0 8px 24px rgba(233, 196, 106, 0.35)";
      t.style.background = "#E9C46A";
      t.style.color = "#0A2342";
    }}
    onMouseLeave={(e) => {
      if (disabled) return;
      const t = e.currentTarget;
      t.style.transform = "translateY(0)";
      t.style.boxShadow = "0 4px 12px rgba(10, 35, 66, 0.30)";
      t.style.background = "linear-gradient(135deg, #0A2342 0%, #132743 100%)";
      t.style.color = "#E9C46A";
    }}
  >
    {children}
  </button>
);

const Dashboard: React.FC = () => {
  const {
    summary,
    recent,
    loading,
    error,
    lastUpdated,
    refresh,
  } = useDashboard(true);

  // Formatea hora local (America/El_Salvador)
  const formatHoraLocal = (fechaISO: string) => {
    if (!fechaISO) return "N/A";
    try {
      let fechaUTC = fechaISO;
      // Si no trae zona, asumir UTC
      if (
        !fechaISO.endsWith("Z") &&
        !fechaISO.includes("+") &&
        !fechaISO.includes("-", 10)
      ) {
        fechaUTC = `${fechaISO}Z`;
      }
      const fecha = new Date(fechaUTC);
      if (isNaN(fecha.getTime())) return "N/A";
      return fecha.toLocaleTimeString("es-SV", {
        timeZone: "America/El_Salvador",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch {
      return "N/A";
    }
  };

  const recentSafe: RecentItem[] = Array.isArray(recent) ? (recent as RecentItem[]) : [];

  React.useEffect(() => {
    console.log('[Dashboard UI] 📊 Datos actualizados:', {
      summary,
      recentCount: recentSafe.length,
      loading,
      error
    });
  }, [summary, recentSafe.length, loading, error]);

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h1>Dashboard</h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {loading && (
            <small>
              <RefreshCw size={16} className="spin" /> Cargando…
            </small>
          )}
          {error && <small style={{ color: "var(--danger)" }}>{error}</small>}

          {!loading && (
            <small title={lastUpdated ? lastUpdated.toISOString() : undefined} style={{ opacity: 0.8 }}>
              Última actualización:{" "}
              {lastUpdated
                ? formatHoraLocal(lastUpdated.toISOString())
                : "—"}
            </small>
          )}

          <PrimaryButton onClick={refresh} disabled={loading} aria-busy={loading} aria-label="Actualizar">
            <RefreshCw size={16} style={{ marginRight: 6 }} className={loading ? "spin" : undefined} />
            Actualizar
          </PrimaryButton>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div>
            <TrendingUp size={20} /> Tickets Hoy
          </div>
          <div className="stat-number">{summary?.ticketsHoy ?? "—"}</div>
        </div>
        <div className="stat-card">
          <div>
            <Clock size={20} /> En Espera
          </div>
          <div className="stat-number">{summary?.enEspera ?? "—"}</div>
        </div>
        <div className="stat-card">
          <div>
            <CheckCircle size={20} /> Atendidos
          </div>
          <div className="stat-number">{summary?.atendidos ?? "—"}</div>
        </div>
        <div className="stat-card">
          <div>
            <Users size={20} /> Ventanillas Activas
          </div>
          <div className="stat-number">{summary?.ventanillasActivas ?? "—"}</div>
        </div>
      </div>

      {/* Panels */}
      <div className="panels-grid">
        <div className="panel">
          <h4>
            <Activity size={20} /> Actividad Reciente
          </h4>
          <div className="status-list">
            {recentSafe.length === 0 && (
              <div className="status-item">
                <span>Sin actividad reciente</span>
                <small>Todo tranquilo por ahora</small>
              </div>
            )}
            {recentSafe.map((x) => (
              <div key={x.id} className="status-item">
                <div>
                  <span>Ticket {x.codigo}</span>
                  {x.ventanilla ? <span> — {x.ventanilla}</span> : null}
                </div>
                <small>
                  {formatHoraLocal(x.fecha)}
                  {" • "}
                  {x.estado}
                </small>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h4>
            <Server size={20} /> Estado del Sistema
          </h4>
          <div className="status-list">
            <div className="status-item">
              <span>
                <Server size={16} /> Servidor
              </span>
              <span className="status-badge ok">Operativo</span>
            </div>
            <div className="status-item">
              <span>
                <Database size={16} /> Base de Datos
              </span>
              <span className="status-badge ok">Conectada</span>
            </div>
            <div className="status-item">
              <span>
                <Activity size={16} /> Sistema
              </span>
              <span className="status-badge ok">Funcionando</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
