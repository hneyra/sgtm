-- ============================================================================
--  V16 — La clave del saldo proyectado
--
--  saldo_proyectado nacio en V2 sin ninguna restriccion sobre la combinacion
--  que lo identifica. Una cache que se mantiene sumando y restando NECESITA
--  esa clave: sin ella, dos filas del mismo contribuyente, tributo, ejercicio
--  y periodo conviven sin que nada se queje, cada asiento actualiza una de las
--  dos —la que el motor devuelva primero— y el saldo se parte en dos mitades
--  que ninguna consulta suma.
--
--  Ademas es lo que permite escribirlo como un UPSERT en la misma transaccion
--  del asiento: sin restriccion unica no hay ON CONFLICT, y sin ON CONFLICT
--  hay que leer, decidir y escribir, que es donde dos cajas cobrando a la vez
--  se pisan.
-- ============================================================================

-- NULLS NOT DISTINCT porque predio_id y vehiculo_id son nulos en la deuda que
-- no cuelga de ninguno —una multa, una tasa—, y con la semantica por omision
-- dos nulos serian distintos: la fila se duplicaria justamente en el caso mas
-- comun. PostgreSQL 15 lo admite; la base de este proyecto es la 16.
CREATE UNIQUE INDEX saldo_clave_uq
    ON saldo_proyectado (municipalidad_id, contribuyente_id, tributo, ejercicio, periodo,
                         fase, predio_id, vehiculo_id)
    NULLS NOT DISTINCT;

COMMENT ON INDEX saldo_clave_uq IS
    'La combinacion que identifica un saldo. Sin ella la cache se parte en filas paralelas.';

-- Se consulta por contribuyente —el estado de cuenta— y por ejercicio —el
-- avance de recaudacion—.
CREATE INDEX saldo_contribuyente_ix
    ON saldo_proyectado (municipalidad_id, contribuyente_id, ejercicio);
