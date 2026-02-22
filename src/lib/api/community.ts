import { supabase } from '@/lib/supabase';
import type { CommunityPost } from '@/lib/types';

export async function getCommunityPosts(limit = 20): Promise<CommunityPost[]> {
  const { data, error } = await supabase
    .from('community_posts')
    .select(`
      *,
      profiles (display_name, avatar_url, fishing_infantry, fishing_boat)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as CommunityPost[];
}

export async function createPost(post: {
  user_id: string;
  location?: string;
  image_url?: string;
  species?: string[];
  conditions?: Record<string, string>;
}) {
  const { data, error } = await supabase
    .from('community_posts')
    .insert({
      ...post,
      species: post.species ?? [],
      conditions: post.conditions ?? {},
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleLike(postId: string, userId: string, liked: boolean) {
  if (liked) {
    const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: userId });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);
    if (error) throw error;
  }
}
