import { supabase } from '@/lib/supabase';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  updated_at: string;
  other_user?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  last_message?: Message;
  unread_count: number;
}

/** Obtiene o crea una conversación con otro usuario */
export async function getOrCreateConversation(otherUserId: string): Promise<string> {
  const { data, error } = await supabase.rpc('get_or_create_conversation', {
    other_user_id: otherUserId,
  });

  if (error) throw error;
  return data as string;
}

/** Obtiene todas las conversaciones del usuario actual */
export async function getConversations(): Promise<Conversation[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: convs, error } = await supabase
    .from('conversations')
    .select('*')
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  if (!convs || convs.length === 0) return [];

  // Obtener el otro usuario y el último mensaje para cada conversación
  const result: Conversation[] = [];

  for (const conv of convs) {
    const otherUserId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;

    // Obtener perfil del otro usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .eq('id', otherUserId)
      .maybeSingle();

    // Obtener último mensaje
    const { data: lastMsg } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Contar mensajes no leídos (mensajes del otro usuario que no he leído)
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conv.id)
      .eq('sender_id', otherUserId)
      .is('read_at', null);

    result.push({
      ...conv,
      other_user: profile || { id: otherUserId, display_name: null, avatar_url: null },
      last_message: lastMsg || undefined,
      unread_count: count || 0,
    });
  }

  return result;
}

/** Obtiene los mensajes de una conversación */
export async function getMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []) as Message[];
}

/** Envía un mensaje en una conversación */
export async function sendMessage(conversationId: string, content: string): Promise<Message> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: content.trim(),
    })
    .select()
    .single();

  if (error) throw error;
  return data as Message;
}

/** Marca los mensajes de una conversación como leídos */
export async function markMessagesAsRead(conversationId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', user.id)
    .is('read_at', null);
}

/** Obtiene el conteo total de mensajes no leídos */
export async function getUnreadCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  // Obtener conversaciones del usuario
  const { data: convs } = await supabase
    .from('conversations')
    .select('id, user1_id, user2_id')
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

  if (!convs || convs.length === 0) return 0;

  let total = 0;

  for (const conv of convs) {
    const otherUserId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;

    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conv.id)
      .eq('sender_id', otherUserId)
      .is('read_at', null);

    total += count || 0;
  }

  return total;
}

/** Suscripción a nuevos mensajes y actualizaciones */
export function subscribeToMessages(
  conversationId: string,
  onNewMessage: (message: Message) => void,
  onMessageUpdate?: (message: Message) => void
) {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onNewMessage(payload.new as Message);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onMessageUpdate?.(payload.new as Message);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
