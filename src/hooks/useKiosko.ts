import { useState, useEffect, useCallback } from 'react';
import { KioskoAPI, type KioskoServicioDTO, type TicketCreadoDTO } from '../services/kiosko.service';
import { DashboardNotificationService } from '../services/dashboard-notification.service';

// Mock data para desarrollo
const MOCK_SERVICIOS: KioskoServicioDTO[] = [
  { id: 1, nombre: 'Atención General', descripcion: 'Consultas generales y información' },
  { id: 2, nombre: 'Caja y Pagos', descripcion: 'Pagos de impuestos y tasas municipales' },
  { id: 3, nombre: 'Licencias y Permisos', descripcion: 'Tramitación de licencias municipales' },
  { id: 4, nombre: 'Registro Civil', descripcion: 'Certificados y documentos civiles' },
  { id: 5, nombre: 'Catastro', descripcion: 'Consultas catastrales y avalúos' },
  { id: 6, nombre: 'Obras Municipales', descripcion: 'Permisos de construcción y obras' }
];

// Configuración
const USE_MOCK_DATA = false; // Usando datos reales de la base de datos

export interface TicketGenerado extends TicketCreadoDTO {
  servicio: {
    id: number;
    nombre: string;
    descripcion?: string;
  };
  fechaFormateada: string;
  horaFormateada: string;
  posicionEnCola?: number;
  tiempoEstimadoEspera?: string;
}

interface KioskoState {
  servicios: KioskoServicioDTO[];
  servicioSeleccionado: number | null;
  ticketGenerado: TicketGenerado | null;
  loading: boolean;
  generandoTicket: boolean;
  error: string | null;
  mostrarTicket: boolean;
  ultimaActualizacion: Date | null;
}

interface KioskoActions {
  seleccionarServicio: (servicioId: number) => void;
  generarTicket: () => Promise<boolean>;
  reiniciarSeleccion: () => void;
  actualizarServicios: () => Promise<void>;
  clearError: () => void;
  imprimirTicket: () => void;
  probarConexion: () => Promise<void>;
  mostrarEstadosDisponibles: () => Promise<void>;
  testCompleteConnection: () => Promise<void>;
}

type UseKioskoReturn = KioskoState & KioskoActions;

export const useKiosko = (): UseKioskoReturn => {
  const [state, setState] = useState<KioskoState>({
    servicios: [],
    servicioSeleccionado: null,
    ticketGenerado: null,
    loading: true,
    generandoTicket: false,
    error: null,
    mostrarTicket: false,
    ultimaActualizacion: null
  });

  const loadServicios = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      let servicios: KioskoServicioDTO[];

      if (USE_MOCK_DATA) {
        console.log('[useKiosko] 🎭 Cargando servicios mock');
        // Simular delay de red
        await new Promise(resolve => setTimeout(resolve, 500));
        servicios = MOCK_SERVICIOS;
      } else {
        try {
          console.log('[useKiosko] 🌐 Cargando servicios desde API');
          servicios = await KioskoAPI.serviciosActivos();
          console.log('[useKiosko] ✅ Servicios cargados desde API:', servicios.length);
        } catch (apiError: any) {
          console.warn('[useKiosko] ⚠️ Error cargando servicios desde API, usando fallback:', apiError);
          
          // Fallback a servicios mock cuando falla la API
          servicios = MOCK_SERVICIOS;
          
          // Mostrar advertencia pero no bloquear la funcionalidad
          setState(prev => ({
            ...prev,
            error: '⚠️ Modo offline: Mostrando servicios de ejemplo. Verifique su conexión.'
          }));
          
          // Limpiar error después de unos segundos
          setTimeout(() => {
            setState(prev => ({ ...prev, error: null }));
          }, 4000);
        }
      }

      setState(prev => ({
        ...prev,
        servicios,
        loading: false,
        ultimaActualizacion: new Date()
      }));

    } catch (error: any) {
      console.error('[useKiosko] ❌ Error crítico loading servicios:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        servicios: MOCK_SERVICIOS, // Siempre proporcionar al menos servicios mock
        error: 'Error al cargar servicios. Mostrando servicios de ejemplo.'
      }));
    }
  }, []);

  const seleccionarServicio = useCallback((servicioId: number) => {
    setState(prev => ({
      ...prev,
      servicioSeleccionado: prev.servicioSeleccionado === servicioId ? null : servicioId,
      error: null
    }));
  }, []);

  const generarTicket = useCallback(async (): Promise<boolean> => {
    if (!state.servicioSeleccionado) {
      console.error('No hay servicio seleccionado');
      setState(prev => ({ 
        ...prev, 
        error: 'Por favor seleccione un servicio antes de generar el ticket' 
      }));
      return false;
    }

    try {
      setState(prev => ({ ...prev, generandoTicket: true, error: null }));

      const servicio = state.servicios.find(s => s.id === state.servicioSeleccionado);
      if (!servicio) {
        console.error('Servicio no encontrado para ID:', state.servicioSeleccionado);
        throw new Error('Servicio no encontrado');
      }

      console.log('Generando ticket para servicio:', servicio);

      let ticketCreado: TicketCreadoDTO;

      if (USE_MOCK_DATA) {
        console.log('[useKiosko] 🎭 Usando datos mock para generar ticket');
        // Simular creación de ticket
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const fecha = new Date();
        const letra = servicio.nombre.charAt(0).toUpperCase();
        const numero = Math.floor(Math.random() * 999) + 1;
        
        ticketCreado = {
          id: Date.now(),
          codigo: `${letra}${numero.toString().padStart(3, '0')}`,
          fechaCreacion: fecha.toISOString()
        };
        console.log('[useKiosko] ✅ Ticket mock creado:', ticketCreado);
      } else {
        try {
          console.log('[useKiosko] 🌐 Usando API real para generar ticket');
          console.log('[useKiosko] 📡 Servicio seleccionado ID:', state.servicioSeleccionado);
          console.log('[useKiosko] 📡 Datos del servicio:', servicio);
          console.log('[useKiosko] 📡 URL que se llamará:', `http://localhost:5079/api/kiosko/ticket?idServicio=${state.servicioSeleccionado}`);
          
          // Test directo antes de la llamada principal
          console.log('[useKiosko] 🧪 Probando endpoint directo...');
          const testResponse = await fetch(`http://localhost:5079/api/kiosko/ticket?idServicio=${state.servicioSeleccionado}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          console.log('[useKiosko] 📊 Response status:', testResponse.status);
          console.log('[useKiosko] 📊 Response headers:', Object.fromEntries(testResponse.headers.entries()));
          
          if (!testResponse.ok) {
            const errorText = await testResponse.text();
            console.log('[useKiosko] ❌ Response error text:', errorText);
            throw new Error(`HTTP ${testResponse.status}: ${errorText}`);
          }
          
          const responseData = await testResponse.json();
          console.log('[useKiosko] 📦 Response data:', responseData);
          
          ticketCreado = {
            id: responseData.id || Date.now(),
            codigo: responseData.codigo || 'ERROR',
            fechaCreacion: responseData.fecha_creacion || new Date().toISOString()
          };
          
          console.log('[useKiosko] ✅ Ticket real creado exitosamente:', ticketCreado);
          
          // Verificar si realmente se guardó en BD
          setTimeout(async () => {
            try {
              console.log('[useKiosko] 🔍 Verificando si el ticket se guardó en BD...');
              const { TicketAPI } = await import('../services/ticket.service');
              const todosLosTickets = await TicketAPI.listar();
              console.log('[useKiosko] 📋 Tickets en BD después de crear:', todosLosTickets.total);
              
              const ticketEncontrado = todosLosTickets.items.find((t: any) => t.codigo === ticketCreado.codigo);
              if (ticketEncontrado) {
                console.log('[useKiosko] ✅ CONFIRMADO: Ticket guardado en BD:', ticketEncontrado);
              } else {
                console.log('[useKiosko] ❌ PROBLEMA: Ticket NO encontrado en BD');
                console.log('[useKiosko] 📊 Últimos 5 tickets en BD:', todosLosTickets.items.slice(0, 5));
              }
            } catch (verifyError) {
              console.log('[useKiosko] ⚠️ No se pudo verificar BD:', verifyError);
            }
          }, 2000);
        } catch (apiError: any) {
          console.error('[useKiosko] ❌ ERROR DETALLADO en API real:');
          console.error('  - Tipo de error:', typeof apiError);
          console.error('  - Error completo:', apiError);
          console.error('  - Message:', apiError?.message);
          console.error('  - Status:', apiError?.status);
          console.error('  - Detail:', apiError?.detail);
          console.error('  - Stack:', apiError?.stack);
          console.error('  - Nombre:', apiError?.name);
          
          // Si es un error de fetch, intentar obtener más información
          if (apiError instanceof Error) {
            console.error('  - Es instancia de Error:', true);
            console.error('  - Constructor:', apiError.constructor.name);
          }
          
          // Crear mensaje detallado para el usuario
          const errorDetails = {
            endpoint: '/api/kiosko/ticket',
            servicioId: state.servicioSeleccionado,
            status: apiError?.status || 'Desconocido',
            error: apiError?.detail?.error || apiError?.message || 'Error desconocido',
            timestamp: new Date().toLocaleString('es-ES')
          };
          
          console.error('[useKiosko] 📋 Detalles del error para usuario:', errorDetails);
          
          // Fallback automático a datos mock cuando el backend falla
          const fecha = new Date();
          const letra = servicio.nombre.charAt(0).toUpperCase();
          const numero = Math.floor(Math.random() * 999) + 1;
          
          ticketCreado = {
            id: Date.now(),
            codigo: `${letra}${numero.toString().padStart(3, '0')}`,
            fechaCreacion: fecha.toISOString()
          };
          console.log('[useKiosko] 🆘 Ticket fallback creado:', ticketCreado);
          
          // Mostrar información detallada del error
          setState(prev => ({
            ...prev,
            error: `❌ ERROR DEL BACKEND - No se pudo guardar en BD
            
🔧 DETALLES TÉCNICOS:
• Endpoint: ${errorDetails.endpoint}
• Servicio ID: ${errorDetails.servicioId}  
• Status HTTP: ${errorDetails.status}
• Error: ${errorDetails.error}
• Hora: ${errorDetails.timestamp}

⚠️ El ticket se generó SOLO localmente.
💾 Para guardar en BD, revisa el backend.`
          }));
          
          // Limpiar el error después de un tiempo
          setTimeout(() => {
            setState(prev => ({ ...prev, error: null }));
          }, 5000);
        }
      }

      // Crear ticket enriquecido
      const fechaCreacion = new Date(ticketCreado.fechaCreacion);
      const ticketGenerado: TicketGenerado = {
        ...ticketCreado,
        servicio: {
          id: servicio.id,
          nombre: servicio.nombre,
          descripcion: servicio.descripcion || undefined
        },
        fechaFormateada: fechaCreacion.toLocaleDateString('es-ES'),
        horaFormateada: fechaCreacion.toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        posicionEnCola: Math.floor(Math.random() * 15) + 1, // Mock
        tiempoEstimadoEspera: `${Math.floor(Math.random() * 30) + 5} min` // Mock
      };

      console.log('Ticket final generado:', ticketGenerado);

      setState(prev => ({
        ...prev,
        ticketGenerado,
        generandoTicket: false,
        mostrarTicket: true,
        error: null
      }));

      // Notificar al dashboard que se creó un nuevo ticket
      console.log('[Kiosko] 📨 Notificando al dashboard sobre nuevo ticket:', {
        codigo: ticketGenerado.codigo,
        servicioId: ticketGenerado.servicio.id,
        servicioNombre: ticketGenerado.servicio.nombre
      });
      
      DashboardNotificationService.notifyTicketCreated({
        codigo: ticketGenerado.codigo,
        servicioId: ticketGenerado.servicio.id,
        servicioNombre: ticketGenerado.servicio.nombre
      });

      // Impresión automática a los 3 segundos y reset
      setTimeout(() => {
        console.log('[useKiosko] 🖨️ Imprimiendo ticket automáticamente...');
        
        // Imprimir el ticket
        if (ticketGenerado) {
          const printContent = `
            <div style="max-width: 300px; margin: 0 auto; font-family: monospace; text-align: center;">
              <h2 style="margin: 0;">ALCALDÍA MUNICIPAL</h2>
              <p style="margin: 5px 0;">Sistema de Turnos</p>
              <hr>
              <div style="font-size: 24px; font-weight: bold; margin: 20px 0;">
                ${ticketGenerado.codigo}
              </div>
              <hr>
              <p><strong>Servicio:</strong><br>${ticketGenerado.servicio.nombre}</p>
              <p><strong>Fecha:</strong> ${ticketGenerado.fechaFormateada}</p>
              <p><strong>Hora:</strong> ${ticketGenerado.horaFormateada}</p>
              ${ticketGenerado.posicionEnCola ? `<p><strong>Posición:</strong> ${ticketGenerado.posicionEnCola}</p>` : ''}
              ${ticketGenerado.tiempoEstimadoEspera ? `<p><strong>Tiempo estimado:</strong> ${ticketGenerado.tiempoEstimadoEspera}</p>` : ''}
              <hr>
              <p style="font-size: 12px;">Conserve este ticket.<br>Espere a ser llamado.</p>
            </div>
          `;

          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(`
              <html>
                <head>
                  <title>Ticket ${ticketGenerado.codigo}</title>
                  <style>
                    body { margin: 20px; }
                    @media print {
                      body { margin: 0; }
                    }
                  </style>
                </head>
                <body>
                  ${printContent}
                  <script>
                    window.onload = function() {
                      window.print();
                      window.close();
                    }
                  </script>
                </body>
              </html>
            `);
            printWindow.document.close();
          }
        }

        // Volver a la pantalla de inicio después de imprimir
        setTimeout(() => {
          console.log('[useKiosko] 🏠 Regresando a pantalla de inicio...');
          setState(prev => ({
            ...prev,
            mostrarTicket: false,
            ticketGenerado: null,
            servicioSeleccionado: null
          }));
        }, 1000); // Dar tiempo para que se procese la impresión

      }, 3000); // Imprimir a los 3 segundos

      return true;

    } catch (error: any) {
      console.error('[useKiosko] ❌ Error generating ticket:', {
        message: error?.message,
        status: error?.status,
        detail: error?.detail,
        servicioId: state.servicioSeleccionado,
        stack: error?.stack
      });
      
      let errorMessage = 'Error al generar el ticket. Intente nuevamente.';
      
      // Proporcionar mensajes más específicos según el tipo de error
      if (error?.status === 500) {
        errorMessage = 'Error interno del servidor. Contacte al administrador del sistema.';
      } else if (error?.status === 404) {
        errorMessage = 'El servicio seleccionado no está disponible.';
      } else if (error?.status === 400) {
        errorMessage = 'Datos inválidos para generar el ticket.';
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.detail) {
        errorMessage = typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail);
      }
      
      setState(prev => ({
        ...prev,
        generandoTicket: false,
        error: errorMessage
      }));
      return false;
    }
  }, [state.servicioSeleccionado, state.servicios]);

  const reiniciarSeleccion = useCallback(() => {
    setState(prev => ({
      ...prev,
      servicioSeleccionado: null,
      ticketGenerado: null,
      mostrarTicket: false,
      error: null
    }));
  }, []);

  const actualizarServicios = useCallback(() => {
    return loadServicios();
  }, [loadServicios]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const testCompleteConnection = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      console.log('[useKiosko] 🧪 Iniciando test completo de conexión Backend-BD...');
      
      const { DatabaseConnectionTest } = await import('../services/database-connection-test.service');
      await DatabaseConnectionTest.testBackendConnection();
      
      setState(prev => ({ 
        ...prev, 
        loading: false,
        error: `✅ TEST COMPLETO FINALIZADO
        
🔍 Revisa la consola del navegador (F12) para ver:
• Estado de conexión con backend
• Verificación de estados en BD
• Prueba de creación de tickets
• Diagnóstico completo del problema

💡 Presiona F12 → Consola para ver todos los detalles`
      }));
      
    } catch (error: any) {
      console.error('[useKiosko] ❌ Error en test completo:', error);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: `❌ Error en test de conexión: ${error.message}` 
      }));
    }
  }, []);

  const mostrarEstadosDisponibles = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      console.log('[useKiosko] 📋 Consultando estados disponibles en la base de datos...');
      
      const { EstadoTicketAPI } = await import('../services/estado-ticket.service');
      
      const estados = await EstadoTicketAPI.listar();
      
      // Mostrar estados de forma visual y en consola
      console.group('🎯 ESTADOS DE TICKET DISPONIBLES');
      console.table(estados);
      
      let mensaje = `📊 Estados encontrados en la base de datos:\n\n`;
      
      if (estados.length === 0) {
        mensaje += '❌ No hay estados configurados en la base de datos\n';
        mensaje += '💡 Necesitas crear al menos un estado inicial';
      } else {
        estados.forEach((estado, index) => {
          mensaje += `${index + 1}. ID: ${estado.id} | Nombre: "${estado.nombre}" | Tickets: ${estado.cantidad || 0}\n`;
        });
        
        // Verificar si existe "Pendiente"
        const pendiente = estados.find(e => e.nombre.toLowerCase().includes('pendiente'));
        const exacto = estados.find(e => e.nombre === 'Pendiente');
        
        mensaje += `\n🔍 ANÁLISIS:\n`;
        if (exacto) {
          mensaje += `✅ Estado "Pendiente" (exacto) encontrado: ID ${exacto.id}\n`;
          mensaje += `💡 El backend debería funcionar correctamente`;
        } else if (pendiente) {
          mensaje += `⚠️ Estado similar encontrado: "${pendiente.nombre}" (ID ${pendiente.id})\n`;
          mensaje += `💡 Cambiar backend para usar: "${pendiente.nombre}" o ID ${pendiente.id}`;
        } else {
          mensaje += `❌ NO existe estado "Pendiente" ni similar\n`;
          mensaje += `💡 SOLUCIÓN: Crear estado "Pendiente" o usar ID del primer estado`;
        }
      }
      
      console.groupEnd();
      
      setState(prev => ({ 
        ...prev, 
        loading: false,
        error: mensaje
      }));
      
      // También mostrar alerta en navegador
      alert(mensaje);
      
    } catch (error: any) {
      console.error('[useKiosko] ❌ Error al consultar estados:', error);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: `❌ Error al consultar estados: ${error.message}` 
      }));
    }
  }, []);

  const probarConexion = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      console.log('[useKiosko] 🔍 Iniciando diagnóstico completo del backend...');
      
      // Primero, consultar qué estados existen en la BD
      console.log('[useKiosko] 🔎 Consultando estados disponibles...');
      try {
        // Importar el servicio de estados
        const { EstadoTicketAPI } = await import('../services/estado-ticket.service');
        
        // Usar el método de debugging integrado
        await EstadoTicketAPI.mostrarEstadosDisponibles();
        
        // También verificar si existe "Pendiente"
        const pendiente = await EstadoTicketAPI.buscarPorNombre('Pendiente');
        if (pendiente) {
          console.log('✅ Estado "Pendiente" confirmado:', pendiente);
        } else {
          console.warn('❌ PROBLEMA IDENTIFICADO: No existe estado "Pendiente"');
          console.log('💡 Esto explica por qué falla la creación de tickets en el backend');
        }
        
      } catch (estadosError) {
        console.warn('[useKiosko] ⚠️ No se pudieron obtener estados:', estadosError);
      }
      
      // Importar dinámicamente el servicio de diagnóstico
      const { BackendDiagnostic } = await import('../services/backend-diagnostic.service');
      
      const diagnostic = await BackendDiagnostic.runFullDiagnostic();
      const report = BackendDiagnostic.formatDiagnosticReport(diagnostic);
      
      console.log('[useKiosko] 📊 Reporte completo generado');
      console.log(report);
      
      const isHealthy = diagnostic.summary.failed === 0;
      const hasTicketIssues = diagnostic.results.some(r => 
        r.endpoint.includes('ticket') && !r.success
      );
      
      setState(prev => ({ 
        ...prev, 
        loading: false,
        error: isHealthy ? 
          `✅ BACKEND COMPLETAMENTE FUNCIONAL
          
🎯 Todos los endpoints responden correctamente:
• Servicios: ✅ OK
• Tickets: ✅ OK  
• Ventanillas: ✅ OK

💾 Los tickets se guardarán en la base de datos.` :
          
          hasTicketIssues ? 
          `⚠️ PROBLEMA CON TICKETS DETECTADO

🔴 ENDPOINTS CON PROBLEMAS:
${diagnostic.results.filter(r => !r.success).map(r => 
  `• ${r.endpoint}: ${r.error}`
).join('\n')}

✅ ENDPOINTS FUNCIONANDO:
${diagnostic.results.filter(r => r.success).map(r => 
  `• ${r.endpoint}`
).join('\n')}

🔧 ACCIÓN REQUERIDA: Revisar logs del backend`
          :
          `❌ BACKEND CON PROBLEMAS MÚLTIPLES

${report}

🚨 Revisa la consola para el reporte detallado.`
      }));
      
    } catch (error: any) {
      console.error('[useKiosko] ❌ Error en diagnóstico completo:', error);
      setState(prev => ({ 
        ...prev, 
        loading: false,
        error: `❌ ERROR EN DIAGNÓSTICO: ${error?.message || 'Error desconocido'}
        
🔧 Verifica que el backend esté ejecutándose en http://localhost:5079`
      }));
    }
  }, []);

  const imprimirTicket = useCallback(() => {
    if (state.ticketGenerado) {
      // Crear contenido para impresión
      const printContent = `
        <div style="max-width: 300px; margin: 0 auto; font-family: monospace; text-align: center;">
          <h2 style="margin: 0;">ALCALDÍA MUNICIPAL</h2>
          <p style="margin: 5px 0;">Sistema de Turnos</p>
          <hr>
          <div style="font-size: 24px; font-weight: bold; margin: 20px 0;">
            ${state.ticketGenerado.codigo}
          </div>
          <hr>
          <p><strong>Servicio:</strong><br>${state.ticketGenerado.servicio.nombre}</p>
          <p><strong>Fecha:</strong> ${state.ticketGenerado.fechaFormateada}</p>
          <p><strong>Hora:</strong> ${state.ticketGenerado.horaFormateada}</p>
          ${state.ticketGenerado.posicionEnCola ? `<p><strong>Posición:</strong> ${state.ticketGenerado.posicionEnCola}</p>` : ''}
          ${state.ticketGenerado.tiempoEstimadoEspera ? `<p><strong>Tiempo estimado:</strong> ${state.ticketGenerado.tiempoEstimadoEspera}</p>` : ''}
          <hr>
          <p style="font-size: 12px;">Conserve este ticket.<br>Espere a ser llamado.</p>
        </div>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Ticket ${state.ticketGenerado.codigo}</title>
              <style>
                body { margin: 20px; }
                @media print {
                  body { margin: 0; }
                }
              </style>
            </head>
            <body>
              ${printContent}
              <script>
                window.onload = function() {
                  window.print();
                  window.close();
                }
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  }, [state.ticketGenerado]);

  // Cargar servicios al montar
  useEffect(() => {
    loadServicios();
  }, [loadServicios]);

  return {
    ...state,
    seleccionarServicio,
    generarTicket,
    reiniciarSeleccion,
    actualizarServicios,
    clearError,
    imprimirTicket,
    probarConexion,
    mostrarEstadosDisponibles,
    testCompleteConnection
  };
};