-- ============================================================
-- SOLUCIÓN RÁPIDA: ASIGNAR SERVICIO A VENTANILLA
-- ============================================================
-- Ejecuta estas queries en orden
-- ============================================================

-- PASO 1: Ver qué ventanillas tienes
SELECT id, nombre FROM ventanilla ORDER BY id;

-- PASO 2: Ver qué servicios tienes
SELECT id, nombre, activo FROM servicio ORDER BY id;

-- PASO 3: Ver si ya existe alguna asignación
SELECT 
    vs.id,
    vs.id_ventanilla,
    v.nombre as ventanilla,
    vs.id_servicio,
    s.nombre as servicio,
    vs.activo
FROM ventanilla_servicio vs
LEFT JOIN ventanilla v ON v.id = vs.id_ventanilla
LEFT JOIN servicio s ON s.id = vs.id_servicio
ORDER BY vs.id DESC;

-- PASO 4: CREAR LA ASIGNACIÓN (ajusta los IDs según tus datos)
-- ⚠️ IMPORTANTE: Cambia id_ventanilla e id_servicio según los resultados de arriba
INSERT INTO ventanilla_servicio (id_ventanilla, id_servicio, activo)
VALUES (1, 1, true)  -- Ventanilla 1, Servicio 1, Activo
RETURNING *;

-- PASO 5: Verificar que se creó correctamente
SELECT 
    vs.id,
    vs.id_ventanilla,
    v.nombre as ventanilla,
    vs.id_servicio,
    s.nombre as servicio,
    vs.activo
FROM ventanilla_servicio vs
INNER JOIN ventanilla v ON v.id = vs.id_ventanilla
INNER JOIN servicio s ON s.id = vs.id_servicio
WHERE vs.id_ventanilla = 1  -- Cambia según tu ventanilla
ORDER BY vs.id DESC;

-- ============================================================
-- SI YA EXISTE PERO ESTÁ INACTIVO, ACTÍVALO:
-- ============================================================
-- UPDATE ventanilla_servicio 
-- SET activo = true 
-- WHERE id_ventanilla = 1 AND id_servicio = 1;

-- ============================================================
-- DESPUÉS DE EJECUTAR, RECARGA LA PÁGINA DEL OPERADOR
-- ============================================================
