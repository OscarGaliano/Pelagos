-- ============================================
-- Sistema de notificaciones
-- ============================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in (
    'league_join_request',     -- Solicitud de unirse a liga/campeonato
    'league_request_accepted', -- Solicitud aceptada
    'league_request_rejected', -- Solicitud rechazada
    'quedada_join_request',    -- Solicitud de unirse a quedada/salida
    'quedada_request_accepted',
    'quedada_request_rejected',
    'dive_like',               -- Me gusta en jornada compartida
    'dive_comment',            -- Comentario en jornada compartida
    'new_message'              -- Nuevo mensaje (opcional)
  )),
  title text not null,
  body text,
  data jsonb default '{}',
  read_at timestamptz,
  created_at timestamptz default now()
);

-- Índices
create index if not exists idx_notifications_user on public.notifications(user_id);
create index if not exists idx_notifications_created on public.notifications(created_at desc);
create index if not exists idx_notifications_unread on public.notifications(user_id) where read_at is null;

-- RLS
alter table public.notifications enable row level security;

create policy "Users can view their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "System can create notifications"
  on public.notifications for insert
  with check (true);

create policy "Users can update their own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

create policy "Users can delete their own notifications"
  on public.notifications for delete
  using (auth.uid() = user_id);

-- Función para crear notificación
create or replace function create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text default null,
  p_data jsonb default '{}'
) returns uuid as $$
declare
  notif_id uuid;
begin
  insert into public.notifications (user_id, type, title, body, data)
  values (p_user_id, p_type, p_title, p_body, p_data)
  returning id into notif_id;
  return notif_id;
end;
$$ language plpgsql security definer;

-- Trigger para crear notificación cuando alguien da like a una jornada
create or replace function notify_on_dive_like()
returns trigger as $$
declare
  dive_owner_id uuid;
  liker_name text;
begin
  -- Obtener dueño de la jornada
  select user_id into dive_owner_id
  from public.shared_dives
  where id = NEW.shared_dive_id;

  -- No notificar si es el mismo usuario
  if dive_owner_id = NEW.user_id then
    return NEW;
  end if;

  -- Obtener nombre del que dio like
  select display_name into liker_name
  from public.profiles
  where id = NEW.user_id;

  -- Crear notificación
  perform create_notification(
    dive_owner_id,
    'dive_like',
    'Nuevo me gusta',
    coalesce(liker_name, 'Alguien') || ' le ha gustado tu jornada',
    jsonb_build_object('shared_dive_id', NEW.shared_dive_id, 'liker_id', NEW.user_id)
  );

  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists on_dive_like_notify on public.shared_dive_likes;
create trigger on_dive_like_notify
  after insert on public.shared_dive_likes
  for each row
  execute function notify_on_dive_like();

-- Trigger para crear notificación cuando alguien comenta en una jornada
create or replace function notify_on_dive_comment()
returns trigger as $$
declare
  dive_owner_id uuid;
  commenter_name text;
begin
  -- Obtener dueño de la jornada
  select user_id into dive_owner_id
  from public.shared_dives
  where id = NEW.shared_dive_id;

  -- No notificar si es el mismo usuario
  if dive_owner_id = NEW.user_id then
    return NEW;
  end if;

  -- Obtener nombre del comentador
  select display_name into commenter_name
  from public.profiles
  where id = NEW.user_id;

  -- Crear notificación
  perform create_notification(
    dive_owner_id,
    'dive_comment',
    'Nuevo comentario',
    coalesce(commenter_name, 'Alguien') || ' ha comentado en tu jornada',
    jsonb_build_object('shared_dive_id', NEW.shared_dive_id, 'comment_id', NEW.id, 'commenter_id', NEW.user_id)
  );

  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists on_dive_comment_notify on public.shared_dive_comments;
create trigger on_dive_comment_notify
  after insert on public.shared_dive_comments
  for each row
  execute function notify_on_dive_comment();

comment on table public.notifications is 'Notificaciones del usuario';
