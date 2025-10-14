// src/realtime/turnosHub.client.ts
import * as signalR from "@microsoft/signalr";
import type { TicketLlamadoDto, TicketEstadoDto } from "../services/dtos/ticket.dto";
import { API_ROOT } from "../services/http";

export type TurnosHubHandlers = {
  onTicketLlamado?: (t: TicketLlamadoDto) => void;
  onTicketEstado?: (t: TicketEstadoDto) => void;
  onTicketCreado?: (ticketInfo: { codigo: string; servicioId: number; servicioNombre: string }) => void;
  onDashboardUpdate?: () => void;
  onVentanillaJoined?: (data: { ventanillaId: number; ventanillaNombre: string; mensaje: string }) => void;
  onError?: (error: { mensaje: string; codigo?: string }) => void;
};

export function createTurnosHubClient(handlers: TurnosHubHandlers = {}) {
  const base = API_ROOT.replace(/\/api$/i, "");
  const connection = new signalR.HubConnectionBuilder()
    .withUrl(`${base}/turnoshub`, {
      skipNegotiation: false,
      transport: signalR.HttpTransportType.ServerSentEvents | signalR.HttpTransportType.LongPolling,
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000])
    .configureLogging(signalR.LogLevel.Warning) // Reducir logs
    .build();

  // Hooks de mensajes del servidor 
  connection.on("TicketLlamado", (d: any) => {
    handlers.onTicketLlamado?.({
      codigo: String(d.Codigo ?? d.codigo ?? ""),
      servicio: String(d.Servicio ?? d.servicio ?? ""),
      ventanilla: String(d.Ventanilla ?? d.ventanilla ?? ""),
      hora: (d.Hora ?? d.hora ?? new Date().toISOString()),
    });
  });

  connection.on("TicketEstado", (d: any) => {
    handlers.onTicketEstado?.({
      ticketId: Number(d.TicketId ?? d.ticketId ?? 0),
      codigo: String(d.Codigo ?? d.codigo ?? ""),
      estado: String(d.Estado ?? d.estado ?? ""),
      ventanillaId: d.VentanillaId ?? d.ventanillaId ?? null,
      horaInicio: d.HoraInicio ?? d.horaInicio ?? null,
      horaFin: d.HoraFin ?? d.horaFin ?? null,
    });
  });

  // Nuevo evento para tickets creados
  connection.on("TicketCreado", (d: any) => {
    console.log('[SignalR] 🎫 Ticket creado recibido:', d);
    handlers.onTicketCreado?.({
      codigo: String(d.Codigo ?? d.codigo ?? ""),
      servicioId: Number(d.ServicioId ?? d.servicioId ?? 0),
      servicioNombre: String(d.ServicioNombre ?? d.servicioNombre ?? "")
    });
  });

  // Evento general para actualizar dashboard
  connection.on("DashboardUpdate", (d: any) => {
    console.log('[SignalR] 📊 Dashboard update recibido:', d);
    handlers.onDashboardUpdate?.();
  });

  // Evento de confirmación al unirse a una ventanilla
  connection.on("VentanillaJoined", (d: any) => {
    console.log('[SignalR] ✅ Unido a ventanilla:', d);
    handlers.onVentanillaJoined?.({
      ventanillaId: Number(d.VentanillaId ?? d.ventanillaId ?? 0),
      ventanillaNombre: String(d.VentanillaNombre ?? d.ventanillaNombre ?? d.Ventanilla ?? ""),
      mensaje: String(d.Mensaje ?? d.mensaje ?? "Unido a ventanilla correctamente")
    });
  });

  // Evento de error del hub
  connection.on("Error", (d: any) => {
    console.error('[SignalR] ❌ Error recibido del hub:', d);
    handlers.onError?.({
      mensaje: String(d.Mensaje ?? d.mensaje ?? "Error desconocido"),
      codigo: d.Codigo ?? d.codigo ?? undefined
    });
  });

  connection.onreconnecting(err => {
    console.warn('[SignalR] 🔄 Reconnecting...', err?.message);
  });
  connection.onreconnected(id => {
    console.info('[SignalR] ✅ Reconnected. ConnId:', id);
  });
  connection.onclose(err => {
    if (err) console.error('[SignalR] ❌ Closed with error:', err.message);
    else console.log('[SignalR] ⏹️ Closed');
  });

  async function start() {
    if (connection.state === signalR.HubConnectionState.Disconnected) {
      try {
        console.log('[SignalR] ▶️ Starting connection to', `${base}/turnoshub`);
        await connection.start();
        console.log('[SignalR] ✅ Started');
      } catch (err: any) {
        console.error('[SignalR] ❌ Start failed:', err?.message);
        throw err;
      }
    }
  }

  return {
    connection,
    /** Conecta al hub y se une al grupo de pantalla pública */
    async joinPantalla() {
      await start();
      console.log('[SignalR] 📺 Uniéndose a pantalla pública...');
      await connection.invoke("JoinPantalla");
    },
    /** Conecta al hub y se une al grupo de una ventanilla específica */
    async joinVentanilla(ventanillaId: number) {
      await start();
      console.log('[SignalR] 🪟 Uniéndose a ventanilla ID:', ventanillaId);
      await connection.invoke("JoinVentanilla", ventanillaId);
    },
    /** Conecta al hub y se une automáticamente a la ventanilla del empleado */
    async joinVentanillaByEmpleado(empleadoId: number) {
      await start();
      console.log('[SignalR] 👤 Uniéndose a ventanilla del empleado ID:', empleadoId);
      await connection.invoke("JoinVentanillaByEmpleado", empleadoId);
    },
    /** Detiene la conexión con el hub */
    async stop() {
      if (connection.state !== signalR.HubConnectionState.Disconnected) {
        console.log('[SignalR] ⏹️ Deteniendo conexión...');
        await connection.stop();
      }
    },
  };
}
