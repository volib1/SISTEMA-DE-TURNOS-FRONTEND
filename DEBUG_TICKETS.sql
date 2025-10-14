-- VERIFICACIÓN RÁPIDA: ¿Por qué no aparecen los tickets?

-- 1. Ver servicios asignados a ventanilla 1
SELECT 
    vs.id,
    vs.id_ventanilla as "IdVentanilla",
    v.nombre as ventanilla,
    vs.id_servicio as "IdServicio", 
    s.nombre as servicio,
    vs.activo
FROM ventanilla_servicio vs
INNER JOIN ventanilla v ON v.id = vs.id_ventanilla
INNER JOIN servicio s ON s.id = vs.id_servicio
WHERE vs.id_ventanilla = 1
ORDER BY vs.id;

-- Resultado esperado: Debe mostrar servicio ID = 9


-- 2. Ver tickets en espera y sus servicios
SELECT 
    t.id,
    t.codigo,
    t.id_servicio,
    s.nombre as servicio,
    t.id_estado,
    e.nombre as estado,
    CASE 
        WHEN t.id_servicio = 9 THEN '✅ SÍ debe aparecer'
        ELSE '❌ NO (servicio ' || t.id_servicio || ')'
    END as debe_aparecer
FROM ticket t
INNER JOIN servicio s ON s.id = t.id_servicio
INNER JOIN estado_ticket e ON e.id = t.id_estado
WHERE e.id = 1  -- Solo en espera
ORDER BY t.fecha_creacion ASC;

-- Los tickets DEBEN tener id_servicio = 9 para aparecer


-- 3. SOLUCIÓN RÁPIDA: Si los tickets NO son del servicio 9
-- Cambiar los tickets al servicio correcto
UPDATE ticket 
SET id_servicio = 9  -- Cambiar al servicio de la ventanilla
WHERE id_estado = 1  -- Solo los que están en espera
  AND id IN (
    -- Lista aquí los IDs de tus 3 tickets
    -- SELECT id FROM ticket WHERE id_estado = 1 ORDER BY id
  );

-- Verificar después del cambio
SELECT codigo, id_servicio, s.nombre as servicio
FROM ticket t
INNER JOIN servicio s ON s.id = t.id_servicio
WHERE t.id_estado = 1;
