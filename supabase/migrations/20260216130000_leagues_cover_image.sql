-- Foto de portada para liga o campeonato (1 imagen)
alter table public.leagues
  add column if not exists cover_image_url text;

-- Bucket para subir portadas (público para ver imágenes)
insert into storage.buckets (id, name, public) values
  ('league-covers', 'league-covers', true)
on conflict (id) do nothing;

-- Políticas: cualquier usuario autenticado puede subir en league-covers (el API comprueba que sea admin de la liga)
create policy "Leer portadas de ligas"
  on storage.objects for select
  using (bucket_id = 'league-covers');

create policy "Subir portada de liga (autenticados)"
  on storage.objects for insert
  with check (bucket_id = 'league-covers' and auth.role() = 'authenticated');

create policy "Actualizar portada (autenticados)"
  on storage.objects for update
  using (bucket_id = 'league-covers' and auth.role() = 'authenticated');
