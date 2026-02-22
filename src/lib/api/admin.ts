import { supabase } from '@/lib/supabase';

export const ADMIN_EMAIL = 'pelagosapp@gmail.com';

export async function isCurrentUserAdmin(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_app_admin')
    .eq('id', user.id)
    .single();

  return profile?.is_app_admin ?? false;
}

export async function getAdminProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile?.is_app_admin) return null;

  return {
    user,
    profile,
  };
}

export type AdminEmail = {
  email: string;
  added_at: string;
  added_by: string | null;
};

export async function getAdminEmails(): Promise<AdminEmail[]> {
  const { data, error } = await supabase
    .from('admin_emails')
    .select('*')
    .order('added_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function addAdminEmail(email: string): Promise<void> {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) throw new Error('No tienes permisos de administrador');

  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('admin_emails')
    .insert({
      email: email.toLowerCase().trim(),
      added_by: user?.email ?? 'desconocido',
    });

  if (error) {
    if (error.code === '23505') {
      throw new Error('Este email ya está en la lista de administradores');
    }
    throw error;
  }

  const { data: existingUser } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', (
      await supabase.rpc('get_user_id_by_email', { user_email: email.toLowerCase().trim() })
    ).data)
    .single();

  if (existingUser) {
    await supabase
      .from('profiles')
      .update({ is_app_admin: true })
      .eq('id', existingUser.id);
  }
}

export async function removeAdminEmail(email: string): Promise<void> {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) throw new Error('No tienes permisos de administrador');

  if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    throw new Error('No puedes eliminar al administrador principal');
  }

  const { error } = await supabase
    .from('admin_emails')
    .delete()
    .eq('email', email.toLowerCase());

  if (error) throw error;
}

export async function setUserAsAdmin(userId: string): Promise<void> {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) throw new Error('No tienes permisos de administrador');

  const { error } = await supabase
    .from('profiles')
    .update({ is_app_admin: true })
    .eq('id', userId);

  if (error) throw error;
}

export async function removeUserAdmin(userId: string): Promise<void> {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) throw new Error('No tienes permisos de administrador');

  const { data: { user } } = await supabase.auth.getUser();
  if (user?.id === userId) {
    throw new Error('No puedes quitarte los permisos de admin a ti mismo');
  }

  const { error } = await supabase
    .from('profiles')
    .update({ is_app_admin: false })
    .eq('id', userId);

  if (error) throw error;
}
