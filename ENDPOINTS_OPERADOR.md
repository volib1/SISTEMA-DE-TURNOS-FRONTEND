# 📋 ENDPOINTS REQUERIDOS PARA OPERADOR

## ✅ Resumen de Funcionalidad

El operador debe poder **llamar solo los turnos del servicio asignado a su ventanilla**.

---

## 🔧 Endpoints Necesarios

### 1. **Obtener Servicios de una Ventanilla** ✅
```
GET /api/ventanilla-servicio/ventanilla/{idVentanilla}
```

**Propósito:** Obtener la lista de servicios que atiende una ventanilla específica.

**Respuesta esperada:**
```json
[
  {
    "id": 1,
    "id_ventanilla": 1,
    "id_servicio": 2,
    "activo": true,
    "Servicio": {
      "id": 2,
      "nombre": "Atención al Cliente"
    }
  }
]
```

**SQL de verificación:**
```sql
SELECT vs.id, vs.id_ventanilla, vs.id_servicio, vs.activo,
       s.nombre as servicio_nombre
FROM ventanilla_servicio vs
INNER JOIN servicio s ON s.id = vs.id_servicio
WHERE vs.id_ventanilla = 1
  AND vs.activo = true;
```

---

### 2. **Listar Tickets** ✅
```
GET /api/ticket/Lista
```

**Propósito:** Obtener todos los tickets (luego se filtran en frontend).

**Respuesta esperada:**
```json
[
  {
    "id": 1,
    "codigo": "A001",
    "fecha_creacion": "2025-10-07T10:00:00",
    "Estado": {
      "id": 1,
      "nombre": "En Espera"
    },
    "Servicio": {
      "id": 2,
      "nombre": "Atención al Cliente"
    }
  }
]
```

---

### 3. **Crear Turno** ✅
```
POST /api/turno/Nuevo
```

**Propósito:** Crear un turno cuando el operador llama a un ticket.

**Payload:**
```json
{
  "id_ticket": 1,
  "id_ventanilla": 1,
  "hora_inicio": "2025-10-07T10:05:00Z"
}
```

**Respuesta esperada:**
```json
{
  "id": 5,
  "id_ticket": 1,
  "id_ventanilla": 1,
  "hora_inicio": "2025-10-07T10:05:00Z",
  "hora_fin": null
}
```

---

### 4. **Actualizar Estado del Ticket** ⚠️
```
PUT /api/ticket/{id}
```

**Propósito:** Cambiar el estado del ticket a "Llamado" (id=2) o "Atendido" (id=3).

**Payload:**
```json
{
  "id_estado": 2
}
```

**Respuesta esperada:**
```json
{
  "message": "Ticket actualizado correctamente"
}
```

**IMPORTANTE:** También existe alternativa con endpoint específico:
```
PUT /api/ticket/{id}/estado/{nombreEstado}
```
Ejemplo: `/api/ticket/1/estado/Llamando`

---

### 5. **Cerrar Turno** ✅
```
PUT /api/turno/{id}/cerrar
```

**Propósito:** Finalizar un turno estableciendo hora_fin.

**Respuesta esperada:**
```json
{
  "message": "Turno cerrado correctamente"
}
```

---

## 🔍 VERIFICACIÓN DE DATOS

### 1. Verificar Asignación Ventanilla-Servicio
```sql
-- Ver qué servicios atiende cada ventanilla
SELECT 
    v.id as ventanilla_id,
    v.nombre as ventanilla,
    s.id as servicio_id,
    s.nombre as servicio,
    vs.activo
FROM ventanilla_servicio vs
INNER JOIN ventanilla v ON v.id = vs.id_ventanilla
INNER JOIN servicio s ON s.id = vs.id_servicio
WHERE vs.activo = true
ORDER BY v.id, s.nombre;
```

### 2. Verificar Tickets en Espera
```sql
-- Ver tickets en espera con su servicio
SELECT 
    t.id,
    t.codigo,
    s.nombre as servicio,
    e.nombre as estado,
    t.fecha_creacion
FROM ticket t
INNER JOIN servicio s ON s.id = t.id_servicio
INNER JOIN estado_ticket e ON e.id = t.id_estado
WHERE e.nombre ILIKE '%espera%'
ORDER BY t.fecha_creacion ASC;
```

### 3. Verificar Filtro Correcto
```sql
-- Tickets que DEBE ver la ventanilla 1
SELECT 
    t.id,
    t.codigo,
    s.nombre as servicio,
    e.nombre as estado
FROM ticket t
INNER JOIN servicio s ON s.id = t.id_servicio
INNER JOIN estado_ticket e ON e.id = t.id_estado
WHERE e.nombre ILIKE '%espera%'
  AND s.id IN (
      -- Servicios de la ventanilla 1
      SELECT id_servicio 
      FROM ventanilla_servicio 
      WHERE id_ventanilla = 1 AND activo = true
  )
ORDER BY t.fecha_creacion ASC;
```

---

## 🚀 FLUJO COMPLETO

### Escenario de Prueba:

**Datos de Prueba:**
- **Ventanilla 1** atiende **Servicio ID 2** (Atención al Cliente)
- Hay 3 tickets en espera:
  - Ticket A001 - Servicio 1 (Caja) ❌ NO debe aparecer
  - Ticket B001 - Servicio 2 (Atención al Cliente) ✅ SÍ debe aparecer
  - Ticket C001 - Servicio 2 (Atención al Cliente) ✅ SÍ debe aparecer

**Pasos:**

1. **Login del Operador**
   ```
   POST /api/login
   {
     "Correo": "empleado@gmail.com",
     "Password": "123456"
   }
   ```

2. **Frontend Obtiene Servicios de la Ventanilla**
   ```
   GET /api/ventanilla-servicio/ventanilla/1
   Respuesta: [{ id_servicio: 2, nombre: "Atención al Cliente" }]
   ```

3. **Frontend Obtiene Tickets en Espera**
   ```
   GET /api/ticket/Lista
   Frontend filtra: solo tickets con estado_id=1 y servicio_id=2
   ```

4. **Operador Llama al Siguiente Turno (B001)**
   ```
   POST /api/turno/Nuevo
   {
     "id_ticket": 2,
     "id_ventanilla": 1,
     "hora_inicio": "2025-10-07T10:05:00Z"
   }
   ```

5. **Actualizar Estado del Ticket B001**
   ```
   PUT /api/ticket/2
   { "id_estado": 2 }
   ```

6. **Operador Finaliza Atención**
   ```
   PUT /api/turno/5/cerrar
   PUT /api/ticket/2
   { "id_estado": 3 }
   ```

---

## 📝 NOTAS IMPORTANTES

### Estados de Ticket:
- **1 = En Espera** (recién creado en kiosko)
- **2 = Llamado** (operador llamó el turno)
- **3 = Atendido** (operador finalizó atención)

### Estados de Turno:
- **hora_inicio ≠ null, hora_fin = null** → En atención
- **hora_inicio ≠ null, hora_fin ≠ null** → Finalizado

### Filtro en Frontend:
El servicio `OperadorAPI.obtenerTicketsEnEspera()` hace:
1. GET servicios de la ventanilla
2. GET todos los tickets
3. Filtra: `estado_id === 1 && servicios.includes(servicio_id)`

---

## ✅ CHECKLIST DE VERIFICACIÓN

Antes de probar, asegúrate de:

- [ ] Tabla `ventanilla_servicio` tiene registros con `activo = true`
- [ ] Endpoint `/api/ventanilla-servicio/ventanilla/{id}` funciona
- [ ] Hay tickets en estado "En Espera" (id=1)
- [ ] Endpoint `/api/ticket/Lista` devuelve tickets con Estado y Servicio
- [ ] Endpoint `/api/turno/Nuevo` acepta el payload correcto
- [ ] Endpoint `/api/ticket/{id}` permite actualizar `id_estado`
- [ ] Endpoint `/api/turno/{id}/cerrar` funciona correctamente

---

**Fecha:** 7 de octubre de 2025  
**Sistema:** Sistema de Turnos - Módulo Operador
