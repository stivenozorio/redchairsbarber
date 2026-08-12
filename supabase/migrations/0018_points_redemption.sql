-- ============================================================
-- RED CLUB — Canje de servicios con puntos (paso 1: el enum)
-- ============================================================
-- Solo agrega el motivo nuevo del ledger de puntos que usará el canje
-- (0019_points_redeem_functions.sql): 'redemption_refund', para la
-- devolución de puntos cuando se cancela una reserva canjeada.
--
-- Esto va en su PROPIO archivo, aparte de todo lo demás del canje, por
-- una restricción real de Postgres: "ALTER TYPE ... ADD VALUE" no se
-- puede usar en la misma transacción en la que ese valor nuevo se
-- consulta o se referencia en una expresión (por ejemplo, el WHERE de
-- un índice parcial) — error 55P04 "unsafe use of new value ... New
-- enum values must be committed before they can be used". El SQL
-- Editor de Supabase corre todo el script pegado como una sola
-- transacción, así que intentar agregar el valor Y usarlo en el mismo
-- archivo revienta ahí, aunque el ADD VALUE vaya primero.
--
-- La solución es correr este archivo solo, dejar que confirme
-- (commit), y DESPUÉS correr 0019_points_redeem_functions.sql en una
-- ejecución aparte — para entonces el valor ya quedó confirmado y se
-- puede usar sin problema.
--
-- Seguro de ejecutar varias veces. No borra nada.
-- ============================================================

alter type public.points_reason add value if not exists 'redemption_refund';

notify pgrst, 'reload schema';
