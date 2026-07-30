-- ============================================================
-- RED CLUB — 0006: corrige el permiso de redclub_diagnostics()
-- ============================================================
-- 0005 le quitó el EXECUTE a public/anon/authenticated, pero
-- "revoke ... from public" también revoca el EXECUTE implícito que
-- service_role heredaba de PUBLIC (en Supabase service_role no es
-- superusuario). Sin este grant explícito, /api/health falla con
-- "permission denied for function redclub_diagnostics" aunque la
-- función exista y las migraciones se hayan ejecutado bien.
--
-- Seguro de ejecutar varias veces: no crea ni borra nada, solo
-- concede un permiso.
-- ============================================================

grant execute on function public.redclub_diagnostics() to service_role;
