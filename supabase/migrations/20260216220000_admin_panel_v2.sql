-- ============================================
-- Panel de Administración v2
-- Imágenes, mensajes masivos, moderación
-- NO DESTRUCTIVO - Solo añade, nunca elimina
-- ============================================

-- Modificar tabla news para soportar múltiples imágenes
alter table public.news 
  add column if not exists images text[] default '{}';

-- Modificar home_sections para soportar múltiples imágenes
alter table public.home_sections
  add column if not exists images text[] default '{}';

-- Tabla de mensajes masivos (broadcast)
create table if not exists public.broadcast_messages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  sent_by uuid references auth.users(id) on delete set null,
  sent_at timestamptz default now(),
  recipient_count int default 0
);

alter table public.broadcast_messages enable row level security;

-- Política para broadcast_messages (solo si no existe)
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'broadcast_messages' and policyname = 'Admins can manage broadcast messages') then
    create policy "Admins can manage broadcast messages"
      on public.broadcast_messages for all
      using (exists (select 1 from profiles where id = auth.uid() and is_app_admin = true));
  end if;
end $$;

-- Tabla de acciones de moderación (log)
create table if not exists public.moderation_log (
  id uuid primary key default gen_random_uuid(),
  action_type text not null,
  target_type text not null,
  target_id uuid not null,
  target_user_id uuid references auth.users(id) on delete set null,
  reason text not null,
  moderator_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_moderation_log_created on public.moderation_log(created_at desc);

alter table public.moderation_log enable row level security;

-- Políticas para moderation_log (solo si no existen)
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'moderation_log' and policyname = 'Admins can view moderation log') then
    create policy "Admins can view moderation log"
      on public.moderation_log for select
      using (exists (select 1 from profiles where id = auth.uid() and is_app_admin = true));
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'moderation_log' and policyname = 'Admins can create moderation log') then
    create policy "Admins can create moderation log"
      on public.moderation_log for insert
      with check (exists (select 1 from profiles where id = auth.uid() and is_app_admin = true));
  end if;
end $$;

-- Crear tabla fishing_spots si no existe
create table if not exists public.fishing_spots (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  lat double precision not null,
  lng double precision not null,
  spot_type text default 'general',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  is_public boolean default true
);

create index if not exists idx_fishing_spots_location on public.fishing_spots(lat, lng);

alter table public.fishing_spots enable row level security;

-- Políticas para fishing_spots (solo si no existen)
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'fishing_spots' and policyname = 'Anyone can view public spots') then
    create policy "Anyone can view public spots"
      on public.fishing_spots for select
      using (is_public = true or auth.uid() = created_by or exists (select 1 from profiles where id = auth.uid() and is_app_admin = true));
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'fishing_spots' and policyname = 'Users can create spots') then
    create policy "Users can create spots"
      on public.fishing_spots for insert
      with check (auth.uid() = created_by);
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'fishing_spots' and policyname = 'Admins can manage all spots') then
    create policy "Admins can manage all spots"
      on public.fishing_spots for all
      using (exists (select 1 from profiles where id = auth.uid() and is_app_admin = true));
  end if;
end $$;

-- Storage bucket para admin media
insert into storage.buckets (id, name, public)
values ('admin-media', 'admin-media', true)
on conflict (id) do nothing;

-- Políticas de storage para admin-media (solo si no existen)
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'Anyone can view admin media') then
    create policy "Anyone can view admin media"
      on storage.objects for select
      using (bucket_id = 'admin-media');
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'Admins can upload admin media') then
    create policy "Admins can upload admin media"
      on storage.objects for insert
      with check (bucket_id = 'admin-media' and exists (select 1 from profiles where id = auth.uid() and is_app_admin = true));
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'Admins can delete admin media') then
    create policy "Admins can delete admin media"
      on storage.objects for delete
      using (bucket_id = 'admin-media' and exists (select 1 from profiles where id = auth.uid() and is_app_admin = true));
  end if;
end $$;
