// Servicio para notificar al dashboard sobre cambios
export class DashboardNotificationService {
  private static listeners: Array<() => void> = [];
  private static tempTicketCount = 0; // Contador temporal para tickets nuevos

  // Suscribirse a notificaciones
  static subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    
    // Devolver función de limpieza
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Obtener contador temporal de tickets
  static getTempTicketCount(): number {
    return this.tempTicketCount;
  }

  // Resetear contador temporal (cuando se confirma desde API)
  static resetTempTicketCount(): void {
    console.log('[DashboardNotification] 🔄 Reseteando contador temporal de tickets');
    this.tempTicketCount = 0;
  }

  // Decrementar contador temporal (cuando se confirma un ticket específico)
  static decrementTempTicketCount(): void {
    if (this.tempTicketCount > 0) {
      this.tempTicketCount--;
      console.log('[DashboardNotification] ➖ Decrementando contador temporal:', this.tempTicketCount);
    }
  }

  // Notificar a todos los suscriptores
  static notifyTicketCreated(ticketInfo: { codigo: string; servicioId: number; servicioNombre: string }) {
    console.log('[DashboardNotification] 🔔 Notificando creación de ticket:', ticketInfo);
    
    // Incrementar contador temporal
    this.tempTicketCount++;
    console.log('[DashboardNotification] 📈 Contador temporal de tickets:', this.tempTicketCount);
    
    // Simular evento SignalR localmente
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.warn('[DashboardNotification] ⚠️ Error en listener:', error);
      }
    });

    // En el futuro, aquí podríamos enviar al backend para que notifique via SignalR
    // await fetch('/api/dashboard/notify-ticket-created', { method: 'POST', body: JSON.stringify(ticketInfo) });
  }

  static notifyTicketStatusChanged(ticketInfo: { codigo: string; estado: string }) {
    console.log('[DashboardNotification] 🔔 Notificando cambio de estado:', ticketInfo);
    
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.warn('[DashboardNotification] ⚠️ Error en listener:', error);
      }
    });
  }
}