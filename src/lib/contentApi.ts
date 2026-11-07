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

export interface BlogPost { slug: string; title: string; excerpt: string; content: string; coverImage: string; date: string; seoTitle: string; seoDescription: string }
const toPost = (r: Row): BlogPost => ({
  slug: r.slug, title: r.title, excerpt: r.excerpt ?? '', content: r.content ?? '', coverImage: r.cover_image_url ?? '',
  date: r.published_at ?? r.created_at ?? '', seoTitle: r.seo_title ?? '', seoDescription: r.seo_description ?? '',
});
/** Published posts, newest first (RLS hides drafts and future-dated posts from visitors). */
export async function fetchBlogPosts(limit = 50): Promise<BlogPost[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('blog_posts').select('slug, title, excerpt, content, cover_image_url, published_at, created_at, seo_title, seo_description').order('published_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []).map(toPost);
}
export async function fetchBlogPost(slug: string): Promise<BlogPost | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('blog_posts').select('slug, title, excerpt, content, cover_image_url, published_at, created_at, seo_title, seo_description').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return data ? toPost(data) : null;
}
