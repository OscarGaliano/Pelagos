-- Premio opcional para la liga
alter table public.leagues
  add column if not exists premio text;

-- Capturas de la liga: el usuario registra peso o tamaño, se calculan puntos; el admin acepta como válida
create table if not exists public.league_catches (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  species text not null,
  score_by text not null check (score_by in ('weight', 'length')),
  value numeric not null,
  points numeric not null,
  image_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitted_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);

alter table public.league_catches enable row level security;

create policy "Capturas visibles por todos"
  on public.league_catches for select using (true);

create policy "Participantes registran capturas"
  on public.league_catches for insert with check (
    auth.uid() = user_id and
    exists (select 1 from public.league_participants lp where lp.league_id = league_id and lp.user_id = auth.uid())
  );

create policy "Solo admin actualiza estado (aprobar/rechazar)"
  on public.league_catches for update using (
    exists (select 1 from public.leagues l where l.id = league_id and l.admin_id = auth.uid())
  );

create index idx_league_catches_league on public.league_catches(league_id);
create index idx_league_catches_user on public.league_catches(user_id);
create index idx_league_catches_status on public.league_catches(league_id, status);
