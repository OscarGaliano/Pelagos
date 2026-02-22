-- Quedadas / salidas: el creador es administrador
create table if not exists public.quedadas (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete cascade,
  title text,
  meetup_date date not null,
  meetup_time time not null,
  place text not null,
  max_participants int,
  join_mode text not null check (join_mode in ('invite', 'open', 'request')),
  published_in_novedades boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.quedadas enable row level security;

create policy "Quedadas visibles por todos"
  on public.quedadas for select using (true);

create policy "Usuarios autenticados crean quedadas"
  on public.quedadas for insert with check (auth.uid() = admin_id);

create policy "Solo admin actualiza su quedada"
  on public.quedadas for update using (auth.uid() = admin_id);

create policy "Solo admin elimina su quedada"
  on public.quedadas for delete using (auth.uid() = admin_id);

-- Participantes (incluye al admin)
create table if not exists public.quedada_participants (
  quedada_id uuid not null references public.quedadas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'participant' check (role in ('admin', 'participant')),
  joined_at timestamptz default now(),
  primary key (quedada_id, user_id)
);

alter table public.quedada_participants enable row level security;

create policy "Participantes visibles por todos"
  on public.quedada_participants for select using (true);

create policy "Admin añade participantes o usuario se une si open"
  on public.quedada_participants for insert with check (true);

create policy "Admin o propio usuario puede borrarse"
  on public.quedada_participants for delete using (
    auth.uid() = user_id or
    exists (select 1 from public.quedadas q where q.id = quedada_id and q.admin_id = auth.uid())
  );

-- Invitaciones (admin invita a usuarios)
create table if not exists public.quedada_invitations (
  quedada_id uuid not null references public.quedadas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'denied')),
  invited_at timestamptz default now(),
  primary key (quedada_id, user_id)
);

alter table public.quedada_invitations enable row level security;

create policy "Invitaciones visibles para participantes y admin"
  on public.quedada_invitations for select using (true);

create policy "Solo admin invita"
  on public.quedada_invitations for insert with check (
    exists (select 1 from public.quedadas q where q.id = quedada_id and q.admin_id = auth.uid())
  );

create policy "Admin actualiza invitación o invitado acepta/deniega"
  on public.quedada_invitations for update using (true);

-- Solicitudes para unirse (join_mode = 'request')
create table if not exists public.quedada_join_requests (
  quedada_id uuid not null references public.quedadas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'denied')),
  requested_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  primary key (quedada_id, user_id)
);

alter table public.quedada_join_requests enable row level security;

create policy "Solicitudes visibles para admin y solicitante"
  on public.quedada_join_requests for select using (true);

create policy "Usuario solicita unirse"
  on public.quedada_join_requests for insert with check (auth.uid() = user_id);

create policy "Admin acepta o deniega"
  on public.quedada_join_requests for update using (
    exists (select 1 from public.quedadas q where q.id = quedada_id and q.admin_id = auth.uid())
  );

create index idx_quedadas_meetup_date on public.quedadas(meetup_date);
create index idx_quedadas_admin on public.quedadas(admin_id);
create index idx_quedada_participants_quedada on public.quedada_participants(quedada_id);
create index idx_quedada_participants_user on public.quedada_participants(user_id);
create index idx_quedada_invitations_user on public.quedada_invitations(user_id);
create index idx_quedada_join_requests_quedada on public.quedada_join_requests(quedada_id);
