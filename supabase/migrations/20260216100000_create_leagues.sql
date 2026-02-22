-- Ligas y campeonatos: el creador es el administrador
create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('liga', 'campeonato')),
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.leagues enable row level security;

create policy "Ligas visibles por todos"
  on public.leagues for select using (true);

create policy "Usuarios autenticados crean ligas o campeonatos"
  on public.leagues for insert with check (auth.uid() = admin_id);

create policy "Solo el admin actualiza su liga o campeonato"
  on public.leagues for update using (auth.uid() = admin_id);

create policy "Solo el admin elimina su liga o campeonato"
  on public.leagues for delete using (auth.uid() = admin_id);

create index idx_leagues_admin on public.leagues(admin_id);
create index idx_leagues_type on public.leagues(type);
create index idx_leagues_created_at on public.leagues(created_at desc);
