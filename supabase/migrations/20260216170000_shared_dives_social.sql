-- Tabla para jornadas compartidas (red social)
create table if not exists public.shared_dives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dive_id uuid references public.dives(id) on delete set null,
  description text,
  depth_min numeric,
  depth_max numeric,
  apnea_time_seconds integer,
  current_type text,
  photo_urls text[] default '{}',
  video_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table public.shared_dives is 'Jornadas compartidas en la red social';
comment on column public.shared_dives.description is 'Cuéntanos el lance - descripción de la captura';
comment on column public.shared_dives.depth_min is 'Profundidad mínima (metros)';
comment on column public.shared_dives.depth_max is 'Profundidad máxima (metros)';
comment on column public.shared_dives.apnea_time_seconds is 'Tiempo de apnea en segundos (opcional)';
comment on column public.shared_dives.current_type is 'Tipo de corriente (opcional)';
comment on column public.shared_dives.photo_urls is 'URLs de fotos (máximo 2)';
comment on column public.shared_dives.video_url is 'URL del video (máximo 1, hasta 3 min)';

-- Índices
create index if not exists idx_shared_dives_user on public.shared_dives(user_id);
create index if not exists idx_shared_dives_created on public.shared_dives(created_at desc);

-- RLS
alter table public.shared_dives enable row level security;

create policy "Ver jornadas compartidas públicas" on public.shared_dives
  for select using (true);

create policy "Usuario crea sus jornadas" on public.shared_dives
  for insert with check (auth.uid() = user_id);

create policy "Usuario edita sus jornadas" on public.shared_dives
  for update using (auth.uid() = user_id);

create policy "Usuario elimina sus jornadas" on public.shared_dives
  for delete using (auth.uid() = user_id);

-- Tabla de likes
create table if not exists public.shared_dive_likes (
  shared_dive_id uuid not null references public.shared_dives(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (shared_dive_id, user_id)
);

alter table public.shared_dive_likes enable row level security;

create policy "Ver likes" on public.shared_dive_likes for select using (true);
create policy "Usuario da like" on public.shared_dive_likes for insert with check (auth.uid() = user_id);
create policy "Usuario quita like" on public.shared_dive_likes for delete using (auth.uid() = user_id);

-- Tabla de comentarios
create table if not exists public.shared_dive_comments (
  id uuid primary key default gen_random_uuid(),
  shared_dive_id uuid not null references public.shared_dives(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

create index if not exists idx_shared_dive_comments_dive on public.shared_dive_comments(shared_dive_id);

alter table public.shared_dive_comments enable row level security;

create policy "Ver comentarios" on public.shared_dive_comments for select using (true);
create policy "Usuario comenta" on public.shared_dive_comments for insert with check (auth.uid() = user_id);
create policy "Usuario elimina su comentario" on public.shared_dive_comments for delete using (auth.uid() = user_id);

-- Bucket para media de jornadas compartidas
insert into storage.buckets (id, name, public, file_size_limit)
values ('shared-dives-media', 'shared-dives-media', true, 104857600) -- 100MB para videos
on conflict (id) do nothing;

create policy "Ver media compartida" on storage.objects
  for select using (bucket_id = 'shared-dives-media');

create policy "Subir media propia" on storage.objects
  for insert with check (bucket_id = 'shared-dives-media' and auth.role() = 'authenticated');

create policy "Eliminar media propia" on storage.objects
  for delete using (bucket_id = 'shared-dives-media' and auth.role() = 'authenticated');
