-- ============================================
-- Panel de Administración
-- NO DESTRUCTIVO - Solo añade, nunca elimina
-- ============================================

-- Tabla de noticias pescasub
create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text,
  image_url text,
  link_url text,
  is_published boolean default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_news_published on public.news(is_published, created_at desc);

-- Tabla de usuarios bloqueados
create table if not exists public.blocked_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  blocked_by uuid references auth.users(id) on delete set null,
  blocked_at timestamptz default now(),
  unblocked_at timestamptz,
  is_active boolean default true
);

create index if not exists idx_blocked_users_active on public.blocked_users(user_id) where is_active = true;

-- Tabla de reportes (para mediar)
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid references auth.users(id) on delete cascade,
  reported_content_type text,
  reported_content_id uuid,
  reason text not null,
  status text default 'pending',
  admin_notes text,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_reports_status on public.reports(status, created_at desc);

-- Tabla de secciones personalizadas de la página principal
create table if not exists public.home_sections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  icon text default 'Star',
  content_type text not null,
  content jsonb default '{}',
  sort_order int default 0,
  is_active boolean default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_home_sections_active on public.home_sections(is_active, sort_order);

-- RLS para noticias
alter table public.news enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'news' and policyname = 'Anyone can view published news') then
    create policy "Anyone can view published news"
      on public.news for select
      using (is_published = true or exists (select 1 from profiles where id = auth.uid() and is_app_admin = true));
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'news' and policyname = 'Admins can manage news') then
    create policy "Admins can manage news"
      on public.news for all
      using (exists (select 1 from profiles where id = auth.uid() and is_app_admin = true));
  end if;
end $$;

-- RLS para usuarios bloqueados
alter table public.blocked_users enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'blocked_users' and policyname = 'Admins can view blocked users') then
    create policy "Admins can view blocked users"
      on public.blocked_users for select
      using (exists (select 1 from profiles where id = auth.uid() and is_app_admin = true));
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'blocked_users' and policyname = 'Admins can manage blocked users') then
    create policy "Admins can manage blocked users"
      on public.blocked_users for all
      using (exists (select 1 from profiles where id = auth.uid() and is_app_admin = true));
  end if;
end $$;

-- RLS para reportes
alter table public.reports enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'reports' and policyname = 'Users can create reports') then
    create policy "Users can create reports"
      on public.reports for insert
      with check (auth.uid() = reporter_id);
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'reports' and policyname = 'Users can view their own reports') then
    create policy "Users can view their own reports"
      on public.reports for select
      using (auth.uid() = reporter_id or exists (select 1 from profiles where id = auth.uid() and is_app_admin = true));
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'reports' and policyname = 'Admins can manage reports') then
    create policy "Admins can manage reports"
      on public.reports for all
      using (exists (select 1 from profiles where id = auth.uid() and is_app_admin = true));
  end if;
end $$;

-- RLS para secciones de home
alter table public.home_sections enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'home_sections' and policyname = 'Anyone can view active sections') then
    create policy "Anyone can view active sections"
      on public.home_sections for select
      using (is_active = true or exists (select 1 from profiles where id = auth.uid() and is_app_admin = true));
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'home_sections' and policyname = 'Admins can manage sections') then
    create policy "Admins can manage sections"
      on public.home_sections for all
      using (exists (select 1 from profiles where id = auth.uid() and is_app_admin = true));
  end if;
end $$;

-- Función para verificar si un usuario está bloqueado
create or replace function is_user_blocked(check_user_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from blocked_users 
    where user_id = check_user_id 
    and is_active = true
  );
end;
$$ language plpgsql security definer;
