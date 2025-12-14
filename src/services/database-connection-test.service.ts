import { API_ROOT } from './http';

// Test de conexión directo a la base de datos
export class DatabaseConnectionTest {
  
  static async testBackendConnection(): Promise<void> {
    console.group('🔍 TEST DE CONEXIÓN BACKEND-BASE DE DATOS');
    console.log('📡 API_ROOT:', API_ROOT);
    
    try {
      // 1. Test de servicios (este endpoint sabemos que funciona)
      console.log('1. 🧪 Probando endpoint de servicios...');
      const serviciosResponse = await fetch(`${API_ROOT}/kiosko/servicios`);
      console.log('   Status:', serviciosResponse.status);
      
      if (serviciosResponse.ok) {
        const servicios = await serviciosResponse.json();
        console.log('   ✅ Servicios obtenidos:', servicios.length);
      } else {
        console.log('   ❌ Error en servicios:', serviciosResponse.statusText);
      }

      // 2. Test de estados
      console.log('2. 🧪 Probando endpoint de estados...');
      const estadosResponse = await fetch(`${API_ROOT}/EstadoTicket/Lista`);
      console.log('   Status:', estadosResponse.status);
      
      if (estadosResponse.ok) {
        const estados = await estadosResponse.json();
        console.log('   ✅ Estados obtenidos:', estados);
        
        // Verificar si existe el estado con ID 1
        const estadoUno = estados.find((e: any) => e.id === 1);
        if (estadoUno) {
          console.log('   ✅ Estado ID 1 existe:', estadoUno.nombre);
        } else {
          console.log('   ❌ Estado ID 1 NO existe - Esto causará error en creación de tickets');
          console.log('   💡 Estados disponibles:', estados.map((e: any) => `ID:${e.id} - ${e.nombre}`));
        }
      } else {
        console.log('   ❌ Error en estados:', estadosResponse.statusText);
      }

      // 3. Test de tickets existentes
      console.log('3. 🧪 Probando endpoint de tickets...');
      const ticketsResponse = await fetch(`${API_ROOT}/ticket/Lista`);
      console.log('   Status:', ticketsResponse.status);
      
      if (ticketsResponse.ok) {
        const ticketsData = await ticketsResponse.json();
        console.log('   ✅ Tickets en BD:', ticketsData.total);
        
        if (ticketsData.total > 0) {
          console.log('   📋 Últimos tickets:', ticketsData.items.slice(0, 3).map((t: any) => ({
            codigo: t.codigo,
            fecha: t.fecha_creacion,
            servicio: t.Servicio?.nombre,
            estado: t.Estado?.nombre
          })));
        } else {
          console.log('   📋 No hay tickets en la base de datos');
        }
      } else {
        console.log('   ❌ Error en tickets:', ticketsResponse.statusText);
      }

      // 4. Test de creación de ticket (si hay servicios)
      console.log('4. 🧪 Probando creación de ticket...');
      
      if (serviciosResponse.ok) {
        const servicios = await serviciosResponse.json();
        
        if (servicios.length > 0) {
          const primerServicio = servicios[0];
          console.log('   🎯 Intentando crear ticket para servicio:', primerServicio.nombre, `(ID: ${primerServicio.id})`);
          
          const crearResponse = await fetch(`${API_ROOT}/kiosko/ticket?idServicio=${primerServicio.id}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          console.log('   Status de creación:', crearResponse.status);
          
          if (crearResponse.ok) {
            const ticketCreado = await crearResponse.json();
            console.log('   ✅ TICKET CREADO EXITOSAMENTE:', ticketCreado);
            
            // Verificar que se guardó en BD
            setTimeout(async () => {
              const verificarResponse = await fetch(`${API_ROOT}/ticket/Lista`);
              if (verificarResponse.ok) {
                const nuevosTickets = await verificarResponse.json();
                const ticketEncontrado = nuevosTickets.items.find((t: any) => t.codigo === ticketCreado.codigo);
                
                if (ticketEncontrado) {
                  console.log('   ✅ CONFIRMADO: Ticket guardado en BD');
                } else {
                  console.log('   ❌ PROBLEMA: Ticket NO se guardó en BD');
                }
              }
            }, 1000);
            
          } else {
            const errorText = await crearResponse.text();
            console.log('   ❌ ERROR AL CREAR TICKET:', errorText);
            console.log('   💡 Este es el problema por el cual no se guardan los tickets');
          }
        } else {
          console.log('   ⚠️ No hay servicios disponibles para probar');
        }
      }

    } catch (error) {
      console.error('❌ Error general en test de conexión:', error);
    }
    
    console.groupEnd();
  }
}