-- Etiquetar usuarios en jornadas compartidas (aparecen en la publicación)
alter table public.shared_dives
  add column if not exists tagged_user_ids uuid[] default '{}';

comment on column public.shared_dives.tagged_user_ids is 'IDs de usuarios etiquetados en la publicación';
