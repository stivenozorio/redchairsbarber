-- ============================================================
-- RED CLUB — Fotos de producto (Fase 4, ajuste)
-- ============================================================
-- Agrega products.image_url y crea el bucket de Storage "products"
-- (público: cualquiera puede VER la imagen por su URL pública, pero
-- solo un administrador puede subir/reemplazar/borrar un archivo — eso
-- lo deciden las políticas de RLS sobre storage.objects, no el flag
-- "público" del bucket, que solo afecta la lectura).
--
-- No se otorgan GRANT de tabla aquí (a diferencia de las tablas que
-- creamos en public.*, como pasó con barber_schedules en 0020): el
-- esquema `storage` ya viene con los permisos base configurados por la
-- propia plataforma de Supabase; solo hace falta la política de RLS.
--
-- Seguro de ejecutar varias veces. No borra nada.
-- ============================================================

alter table public.products add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

drop policy if exists products_images_public_read on storage.objects;
create policy products_images_public_read on storage.objects
  for select using (bucket_id = 'products');

drop policy if exists products_images_admin_insert on storage.objects;
create policy products_images_admin_insert on storage.objects
  for insert with check (bucket_id = 'products' and public.is_admin());

drop policy if exists products_images_admin_update on storage.objects;
create policy products_images_admin_update on storage.objects
  for update using (bucket_id = 'products' and public.is_admin());

drop policy if exists products_images_admin_delete on storage.objects;
create policy products_images_admin_delete on storage.objects
  for delete using (bucket_id = 'products' and public.is_admin());

notify pgrst, 'reload schema';
