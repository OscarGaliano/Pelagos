import { supabase } from '@/lib/supabase';
import type { MarketplaceProduct } from '@/lib/types';

export type ProductCategory = 'all' | 'spearguns' | 'suits' | 'fins' | 'gear';

export async function getMarketplaceProducts(
  category: ProductCategory = 'all'
): Promise<MarketplaceProduct[]> {
  let query = supabase
    .from('marketplace_products')
    .select(`
      *,
      profiles (display_name)
    `)
    .order('created_at', { ascending: false });

  if (category !== 'all') {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as MarketplaceProduct[];
}

export async function createProduct(product: {
  user_id: string;
  title: string;
  price: number;
  category: string;
  condition?: string;
  location?: string;
  image_url?: string;
  featured?: boolean;
}) {
  const { data, error } = await supabase.from('marketplace_products').insert(product).select().single();
  if (error) throw error;
  return data;
}
