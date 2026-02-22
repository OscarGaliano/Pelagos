import { supabase } from '@/lib/supabase';

export type NotificationType =
  | 'league_join_request'
  | 'league_request_accepted'
  | 'league_request_rejected'
  | 'quedada_join_request'
  | 'quedada_request_accepted'
  | 'quedada_request_rejected'
  | 'dive_like'
  | 'dive_comment'
  | 'new_message';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

/** Obtiene las notificaciones del usuario actual */
export async function getNotifications(limit = 50): Promise<Notification[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as Notification[];
}

/** Obtiene el conteo de notificaciones no leídas */
export async function getUnreadNotificationsCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('read_at', null);

  if (error) return 0;
  return count || 0;
}

/** Marca una notificación como leída */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId);
}

/** Marca todas las notificaciones como leídas */
export async function markAllNotificationsAsRead(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('read_at', null);
}

/** Elimina una notificación */
export async function deleteNotification(notificationId: string): Promise<void> {
  await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);
}

/** Crea una notificación (para usar desde el cliente cuando sea necesario) */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body?: string,
  data?: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.rpc('create_notification', {
    p_user_id: userId,
    p_type: type,
    p_title: title,
    p_body: body || null,
    p_data: data || {},
  });

  if (error) throw error;
}

/** Suscripción a nuevas notificaciones */
export function subscribeToNotifications(
  userId: string,
  callback: (notification: Notification) => void
) {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        callback(payload.new as Notification);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
