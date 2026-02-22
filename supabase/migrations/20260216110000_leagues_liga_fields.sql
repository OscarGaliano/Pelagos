-- Campos específicos para tipo 'liga'
alter table public.leagues
  add column if not exists max_participants int,
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists zone_description text,
  add column if not exists zone_image_url text,
  add column if not exists additional_rules text,
  add column if not exists species_scoring jsonb default '[]'::jsonb,
  add column if not exists biggest_catch_prize boolean default false,
  add column if not exists biggest_catch_points int,
  add column if not exists biggest_catch_prize_description text,
  add column if not exists is_public boolean default true;

comment on column public.leagues.species_scoring is 'Para liga: [{ "species": "lubina", "scoreBy": "weight"|"length", "pointsPerUnit": number, "minValue": number }]';

-- Participantes de una liga/campeonato
create table if not exists public.league_participants (
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (league_id, user_id)
);

alter table public.league_participants enable row level security;

create policy "Participantes visibles por todos"
  on public.league_participants for select using (true);

create policy "Usuario se une si liga publica o aceptado; admin añade"
  on public.league_participants for insert with check (true);

create policy "Usuario se quita o admin elimina"
  on public.league_participants for delete using (
    auth.uid() = user_id or
    exists (select 1 from public.leagues l where l.id = league_id and l.admin_id = auth.uid())
  );

create index idx_league_participants_league on public.league_participants(league_id);
create index idx_league_participants_user on public.league_participants(user_id);

-- Solicitudes de inscripción (ligas privadas)
create table if not exists public.league_join_requests (
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'denied')),
  requested_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  primary key (league_id, user_id)
);

alter table public.league_join_requests enable row level security;

create policy "Solicitudes visibles para admin y solicitante"
  on public.league_join_requests for select using (true);

create policy "Usuario solicita unirse"
  on public.league_join_requests for insert with check (auth.uid() = user_id);

create policy "Admin acepta o deniega"
  on public.league_join_requests for update using (
    exists (select 1 from public.leagues l where l.id = league_id and l.admin_id = auth.uid())
  );

create index idx_league_join_requests_league on public.league_join_requests(league_id);

-- Invitaciones del admin (ligas privadas)
create table if not exists public.league_invitations (
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'denied')),
  invited_at timestamptz default now(),
  primary key (league_id, user_id)
);

alter table public.league_invitations enable row level security;

create policy "Invitaciones visibles para interesados"
  on public.league_invitations for select using (true);

create policy "Solo admin invita"
  on public.league_invitations for insert with check (
    exists (select 1 from public.leagues l where l.id = league_id and l.admin_id = auth.uid())
  );

create policy "Admin actualiza o invitado acepta/deniega"
  on public.league_invitations for update using (true);

create index idx_league_invitations_user on public.league_invitations(user_id);
