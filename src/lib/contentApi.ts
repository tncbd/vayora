import { supabase } from './supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;

const live = (q: any) => q; // (kept simple: RLS already hides inactive and out-of-window content from visitors)

export async function fetchSettings(): Promise<{ key: string; value: unknown }[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('site_settings').select('key, value');
  if (error) throw error;
  return data ?? [];
}

export async function fetchHomeSections(): Promise<Row[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('homepage_sections').select('key, title, description, is_enabled, sort_order');
  if (error) throw error;
  return data ?? [];
}

export async function fetchMenus(): Promise<Row[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('menus').select('id, location, parent_id, label, url, sort_order, is_active').order('sort_order');
  if (error) throw error;
  return data ?? [];
}

export async function fetchHeroSlides(): Promise<Row[]> {
  if (!supabase) return [];
  const { data, error } = await live(supabase.from('hero_slides').select('id, eyebrow, title, description, image_url, button_label, button_link, sort_order').order('sort_order'));
  if (error) throw error;
  return data ?? [];
}

export async function fetchBanners(position: string): Promise<Row[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('banners').select('id, title, subtitle, image_url, button_label, button_link, sort_order').eq('position', position).order('sort_order');
  if (error) throw error;
  return data ?? [];
}

export async function fetchPage(slug: string): Promise<Row | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('pages').select('slug, title, content, seo_title, seo_description').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return data;
}
