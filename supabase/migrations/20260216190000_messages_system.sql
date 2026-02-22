-- ============================================
-- Sistema de mensajes privados entre usuarios
-- ============================================

-- Tabla de conversaciones (entre dos usuarios)
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user1_id uuid not null references auth.users(id) on delete cascade,
  user2_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint unique_conversation unique (user1_id, user2_id),
  constraint different_users check (user1_id <> user2_id)
);

-- Tabla de mensajes
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  read_at timestamptz,
  created_at timestamptz default now()
);

-- Índices para mejor rendimiento
create index if not exists idx_conversations_user1 on public.conversations(user1_id);
create index if not exists idx_conversations_user2 on public.conversations(user2_id);
create index if not exists idx_messages_conversation on public.messages(conversation_id);
create index if not exists idx_messages_sender on public.messages(sender_id);
create index if not exists idx_messages_created on public.messages(created_at desc);
create index if not exists idx_messages_unread on public.messages(conversation_id) where read_at is null;

-- RLS para conversaciones
alter table public.conversations enable row level security;

create policy "Users can view their own conversations"
  on public.conversations for select
  using (auth.uid() = user1_id or auth.uid() = user2_id);

create policy "Users can create conversations"
  on public.conversations for insert
  with check (auth.uid() = user1_id or auth.uid() = user2_id);

create policy "Users can update their own conversations"
  on public.conversations for update
  using (auth.uid() = user1_id or auth.uid() = user2_id);

-- RLS para mensajes
alter table public.messages enable row level security;

create policy "Users can view messages in their conversations"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
      and (c.user1_id = auth.uid() or c.user2_id = auth.uid())
    )
  );

create policy "Users can send messages in their conversations"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
      and (c.user1_id = auth.uid() or c.user2_id = auth.uid())
    )
  );

create policy "Users can update messages they received (mark read)"
  on public.messages for update
  using (
    sender_id <> auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
      and (c.user1_id = auth.uid() or c.user2_id = auth.uid())
    )
  );

-- Función para actualizar updated_at en conversaciones
create or replace function update_conversation_timestamp()
returns trigger as $$
begin
  update public.conversations
  set updated_at = now()
  where id = NEW.conversation_id;
  return NEW;
end;
$$ language plpgsql security definer;

-- Trigger para actualizar timestamp de conversación al enviar mensaje
drop trigger if exists on_new_message_update_conversation on public.messages;
create trigger on_new_message_update_conversation
  after insert on public.messages
  for each row
  execute function update_conversation_timestamp();

-- Función para obtener o crear conversación
create or replace function get_or_create_conversation(other_user_id uuid)
returns uuid as $$
declare
  conv_id uuid;
  current_user_id uuid := auth.uid();
  user_a uuid;
  user_b uuid;
begin
  -- Ordenar IDs para consistencia
  if current_user_id < other_user_id then
    user_a := current_user_id;
    user_b := other_user_id;
  else
    user_a := other_user_id;
    user_b := current_user_id;
  end if;

  -- Buscar conversación existente
  select id into conv_id
  from public.conversations
  where user1_id = user_a and user2_id = user_b;

  -- Si no existe, crearla
  if conv_id is null then
    insert into public.conversations (user1_id, user2_id)
    values (user_a, user_b)
    returning id into conv_id;
  end if;

  return conv_id;
end;
$$ language plpgsql security definer;

-- Comentarios
comment on table public.conversations is 'Conversaciones privadas entre dos usuarios';
comment on table public.messages is 'Mensajes dentro de una conversación';
comment on function get_or_create_conversation is 'Obtiene o crea una conversación con otro usuario';

-- ============================================
-- Habilitar Realtime para mensajes
-- ============================================
-- Agregar tablas a la publicación de realtime
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
