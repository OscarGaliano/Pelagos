-- Bucket para imágenes de capturas de liga (visible por admin al revisar)
insert into storage.buckets (id, name, public) values
  ('league-catch-images', 'league-catch-images', true)
on conflict (id) do nothing;

create policy "Leer imágenes de capturas"
  on storage.objects for select
  using (bucket_id = 'league-catch-images');

create policy "Participantes suben imagen de su captura"
  on storage.objects for insert
  with check (bucket_id = 'league-catch-images' and auth.role() = 'authenticated');

create policy "Actualizar imagen de captura"
  on storage.objects for update
  using (bucket_id = 'league-catch-images' and auth.role() = 'authenticated');
