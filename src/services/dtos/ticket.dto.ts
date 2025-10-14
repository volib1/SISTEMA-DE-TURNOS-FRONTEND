export type TicketLlamadoDto = {
  codigo: string;
  servicio: string;
  ventanilla: string;
  hora: string;
};

export type TicketEstadoDto = {
  ticketId: number;
  codigo: string;
  estado: string;
  ventanillaId?: number | null;
  horaInicio?: string | null;
  horaFin?: string | null;
};
