// Utilidad de diagnóstico avanzado para el backend
import { KioskoAPI } from './kiosko.service';
import { TicketAPI } from './ticket.service';
import { VentanillaAPI } from './ventanilla.service';

export interface DiagnosticResult {
  endpoint: string;
  success: boolean;
  status?: number;
  error?: string;
  data?: any;
  responseTime?: number;
}

export interface FullDiagnostic {
  timestamp: string;
  results: DiagnosticResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

export class BackendDiagnostic {
  
  static async runFullDiagnostic(): Promise<FullDiagnostic> {
    const timestamp = new Date().toISOString();
    const results: DiagnosticResult[] = [];

    console.log('🔍 [Diagnóstico] Iniciando diagnóstico completo del backend...');

    // 1. Probar servicios del kiosko
    results.push(await this.testEndpoint(
      'GET /api/kiosko/servicios',
      () => KioskoAPI.serviciosActivos()
    ));

    // 2. Probar creación de ticket (con primer servicio disponible)
    try {
      const servicios = await KioskoAPI.serviciosActivos();
      if (servicios.length > 0) {
        results.push(await this.testEndpoint(
          `POST /api/kiosko/ticket?idServicio=${servicios[0].id}`,
          () => KioskoAPI.crearTicket(servicios[0].id)
        ));
      } else {
        results.push({
          endpoint: 'POST /api/kiosko/ticket',
          success: false,
          error: 'No hay servicios disponibles para probar'
        });
      }
    } catch (error) {
      results.push({
        endpoint: 'POST /api/kiosko/ticket',
        success: false,
        error: 'No se pudo obtener servicios para probar creación de ticket'
      });
    }

    // 3. Probar listado de tickets
    const today = new Date().toISOString().split('T')[0];
    results.push(await this.testEndpoint(
      `GET /api/ticket/Lista?fecha=${today}`,
      () => TicketAPI.listar({ fecha: today })
    ));

    // 4. Probar ventanillas
    results.push(await this.testEndpoint(
      'GET /api/ventanilla',
      () => VentanillaAPI.listar()
    ));

    // 5. Probar estados de ticket (CRÍTICO para diagnóstico)
    try {
      const { EstadoTicketAPI } = await import('./estado-ticket.service');
      
      results.push(await this.testEndpoint(
        'GET /api/estadoticket/Lista',
        () => EstadoTicketAPI.listar()
      ));

      // Verificación específica de estado "Pendiente"
      const estados = await EstadoTicketAPI.listar();
      const pendiente = estados.find(e => e.nombre.toLowerCase() === 'pendiente');
      
      results.push({
        endpoint: 'VERIFY: Estado "Pendiente" existe',
        success: !!pendiente,
        data: pendiente || { available: estados.map(e => e.nombre) },
        error: !pendiente ? 'Estado "Pendiente" no encontrado - esto causa el error 500 en creación de tickets' : undefined
      });

    } catch (estadoError) {
      results.push({
        endpoint: 'GET /api/estadoticket/Lista',
        success: false,
        error: `Error al verificar estados: ${estadoError}`
      });
    }

    // Calcular resumen
    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;

    const diagnostic: FullDiagnostic = {
      timestamp,
      results,
      summary: {
        total: results.length,
        successful,
        failed
      }
    };

    console.log('📊 [Diagnóstico] Resultado completo:', diagnostic);
    return diagnostic;
  }

  private static async testEndpoint(
    name: string, 
    testFunction: () => Promise<any>
  ): Promise<DiagnosticResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🧪 [Diagnóstico] Probando: ${name}`);
      const data = await testFunction();
      const responseTime = Date.now() - startTime;
      
      console.log(`✅ [Diagnóstico] ${name} - OK (${responseTime}ms)`);
      return {
        endpoint: name,
        success: true,
        status: 200,
        data: data,
        responseTime
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      console.error(`❌ [Diagnóstico] ${name} - ERROR:`, error);
      return {
        endpoint: name,
        success: false,
        status: error?.status || undefined,
        error: error?.detail?.error || error?.message || 'Error desconocido',
        responseTime
      };
    }
  }

  static formatDiagnosticReport(diagnostic: FullDiagnostic): string {
    const { results, summary, timestamp } = diagnostic;
    
    let report = `📋 REPORTE DE DIAGNÓSTICO BACKEND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🕐 Timestamp: ${new Date(timestamp).toLocaleString('es-ES')}
📊 Resumen: ${summary.successful}/${summary.total} endpoints funcionando

`;

    results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      const time = result.responseTime ? ` (${result.responseTime}ms)` : '';
      
      report += `${index + 1}. ${status} ${result.endpoint}${time}\n`;
      
      if (!result.success) {
        report += `   🔸 Status: ${result.status || 'N/A'}\n`;
        report += `   🔸 Error: ${result.error}\n`;
      }
      
      report += '\n';
    });

    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚨 PROBLEMAS ENCONTRADOS:
${results.filter(r => !r.success).map(r => 
  `• ${r.endpoint}: ${r.error}`
).join('\n') || 'Ninguno - Todos los endpoints funcionan correctamente'}

🎯 ANÁLISIS CRÍTICO:
${(() => {
  const estadoPendiente = results.find(r => r.endpoint.includes('Estado "Pendiente"'));
  
  if (estadoPendiente && !estadoPendiente.success) {
    return `🚨 PROBLEMA IDENTIFICADO: Estado "Pendiente" no existe en la base de datos
   - Esto causa el error 500 en la creación de tickets
   - El KioskoController busca un estado con nombre exacto "Pendiente"
   - Estados disponibles: ${estadoPendiente.data?.available?.join(', ') || 'No disponibles'}
   
💊 SOLUCIÓN INMEDIATA:
   1. Crear estado "Pendiente" en la base de datos, O
   2. Cambiar el código del backend para usar un ID fijo en lugar de buscar por nombre`;
  }
  
  return summary.failed === 0 
    ? '✅ Backend funcionando correctamente'
    : '⚠️ Revisar errores específicos arriba';
})()}

💡 RECOMENDACIONES:
${summary.failed === 0 
  ? '✅ Sistema completamente funcional'
  : summary.failed === summary.total
    ? '🚨 Backend completamente inaccesible - verificar que esté ejecutándose en puerto 5079'
    : '⚠️ Revisar configuración de base de datos y estados de ticket'
}`;

    return report;
  }
}