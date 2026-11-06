import { useEffect, useMemo, useState } from 'react';
import { getCategories } from '@/lib/catalogApi';
import { isSupabaseConfigured } from '@/lib/supabase';
import { allCategories, navItems as staticNav } from '@/data/placeholder';
import type { Category, NavItem } from '@/types';
import { useSiteContent } from '@/context/SiteContentContext';

let cache: Promise<Category[]> | null = null;
const load = () => (cache ??= getCategories().catch((e) => {
  cache = null; // allow a retry on the next mount
  throw e;
}));

/** All active categories (cached for the session). Falls back to the built-in list if the database is unavailable. */
export function useCategories(): { categories: Category[]; loaded: boolean } {
  const [state, setState] = useState<{ categories: Category[]; loaded: boolean }>({
    categories: isSupabaseConfigured ? [] : allCategories,
    loaded: !isSupabaseConfigured,
  });
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    load()
      .then((c) => active && setState({ categories: c, loaded: true }))
      .catch(() => active && setState({ categories: allCategories, loaded: true }));
    return () => {
      active = false;
    };
  }, []);
  return state;
}

/** Header navigation: static top-level links, with Women/Men dropdowns built from real categories. */
export function useNavItems(): NavItem[] {
  const { categories } = useCategories();
  const { menus } = useSiteContent();
  return useMemo(() => {
    // Admin > Navigation Menu overrides the built-in header when it has items
    if (menus.header.length > 0) return menus.header.map((m) => ({ label: m.label, to: m.to, ...(m.children.length ? { children: m.children } : {}) }));
    const kids = (gender: 'women' | 'men') => {
      const parent = categories.find((c) => c.slug === gender && !c.parentId);
      const list = parent ? categories.filter((c) => c.parentId === parent.id) : categories.filter((c) => c.gender === gender && c.parentId !== null);
      return list.slice(0, 10).map((c) => ({ label: c.name, to: `/category/${c.slug}` }));
    };
    return staticNav.map((item) =>
      item.label === 'Women' ? { ...item, children: kids('women') } : item.label === 'Men' ? { ...item, children: kids('men') } : item,
    );
  }, [categories, menus.header]);
}
