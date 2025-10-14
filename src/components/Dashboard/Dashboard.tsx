import React from "react";
import { TrendingUp, Users, Clock, CheckCircle, Activity, Server, Database, RefreshCw } from "lucide-react";
import { useDashboard } from "../../hooks/useDashboard";
import './Dashboard.enhanced.css';

const Dashboard: React.FC = () => {
  const { 
    summary, 
    recent, 
    loading, 
    error, 
    lastUpdated, 
    refresh
  } = useDashboard(true);

  // Función para formatear hora en zona horaria de El Salvador
  const formatHoraLocal = (fechaISO: string) => {
    if (!fechaISO) return 'N/A';
    
    try {
      // Asegurar que la fecha se interprete como UTC si no tiene sufijo 'Z'
      let fechaUTC = fechaISO;
      if (!fechaISO.endsWith('Z') && !fechaISO.includes('+') && !fechaISO.includes('-', 10)) {
        fechaUTC = fechaISO + 'Z';
      }
      
      const fecha = new Date(fechaUTC);
      
      // Formatear solo la hora en zona horaria de El Salvador (America/El_Salvador = UTC-6)
      return fecha.toLocaleTimeString('es-SV', {
        timeZone: 'America/El_Salvador',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch (error) {
      console.error('[Dashboard] Error formateando hora:', error);
      return fechaISO;
    }
  };

  // Función de debug para ver el estado interno
  const handleDebugInfo = () => {
    console.log('=== DEBUG DASHBOARD ===');
    console.log('Summary:', summary);
    console.log('Last updated:', lastUpdated);
    console.log('Loading:', loading);
    console.log('Error:', error);
    console.log('Recent:', recent);
    alert(`Tickets hoy (solo BD): ${summary?.ticketsHoy || 0}\nEn espera: ${summary?.enEspera || 0}\nAtendidos: ${summary?.atendidos || 0}\nÚltima actualización: ${lastUpdated?.toLocaleTimeString() || 'No disponible'}`);
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h1>Dashboard</h1>
          <p className="dashboard-subtitle">
            Panel de control del sistema de turnos
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {loading && <small><RefreshCw size={16} className="spin" /> Cargando…</small>}
          {error && <small style={{ color: "var(--danger)" }}>{error}</small>}
          <button 
            onClick={handleDebugInfo}
            style={{
              padding: '5px 10px',
              fontSize: '12px',
              background: '#007acc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Debug Info
          </button>
          <button 
            onClick={refresh}
            style={{
              padding: '5px 10px',
              fontSize: '12px',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Actualizar
          </button>
          <button 
            onClick={async () => {
              console.log('[Dashboard Test] 🧪 Probando endpoint directo de tickets...');
              const fechaHoy = new Date().toISOString().split('T')[0];
              try {
                const response = await fetch(`http://localhost:5079/api/ticket/Lista?fecha=${fechaHoy}`);
                console.log('[Dashboard Test] 📊 Status:', response.status);
                if (response.ok) {
                  const data = await response.json();
                  console.log('[Dashboard Test] ✅ Datos:', data);
                  alert(`Tickets encontrados: ${data.total}\nItems: ${data.items?.length || 0}\nPrimeros tickets: ${data.items?.slice(0, 3).map((t: any) => t.codigo).join(', ') || 'Ninguno'}`);
                } else {
                  const errorText = await response.text();
                  console.log('[Dashboard Test] ❌ Error:', errorText);
                  alert(`Error ${response.status}: ${errorText}`);
                }
              } catch (error) {
                console.error('[Dashboard Test] ❌ Network error:', error);
                alert(`Error de red: ${error}`);
              }
            }}
            style={{
              padding: '5px 10px',
              fontSize: '12px',
              background: '#ffc107',
              color: 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginLeft: '5px'
            }}
          >
            Test API
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div><TrendingUp size={20} /> Tickets Hoy</div>
          <div className="stat-number">{summary?.ticketsHoy ?? "-"}</div>
        </div>
        <div className="stat-card">
          <div><Clock size={20} /> En Espera</div>
          <div className="stat-number">{summary?.enEspera ?? "-"}</div>
        </div>
        <div className="stat-card">
          <div><CheckCircle size={20} /> Atendidos</div>
          <div className="stat-number">{summary?.atendidos ?? "-"}</div>
        </div>
        <div className="stat-card">
          <div><Users size={20} /> Ventanillas Activas</div>
          <div className="stat-number">{summary?.ventanillasActivas ?? "-"}</div>
        </div>
      </div>

      {/* Panels */}
      <div className="panels-grid">
        <div className="panel">
          <h4><Activity size={20} /> Actividad Reciente</h4>
          <div className="status-list">
            {recent.length === 0 && (
              <div className="status-item">
                <span>Sin actividad reciente</span>
                <small>Todo tranquilo por ahora</small>
              </div>
            )}
            {recent.map(x => (
              <div key={x.id} className="status-item">
                <div>
                  <span>Ticket {x.codigo}</span>
                  {x.ventanilla && <span> - {x.ventanilla}</span>}
                </div>
                <small>
                  {formatHoraLocal(x.fecha)}
                  {" • "}{x.estado}
                </small>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h4><Server size={20} /> Estado del Sistema</h4>
          <div className="status-list">
            <div className="status-item">
              <span><Server size={16} /> Servidor</span>
              <span className="status-badge ok">Operativo</span>
            </div>
            <div className="status-item">
              <span><Database size={16} /> Base de Datos</span>
              <span className="status-badge ok">Conectada</span>
            </div>
            <div className="status-item">
              <span><Activity size={16} /> Sistema</span>
              <span className="status-badge ok">Funcionando</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
