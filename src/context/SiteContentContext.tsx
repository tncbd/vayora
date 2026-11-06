import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { SiteSettings } from '@/types';
import { fetchHomeSections, fetchMenus, fetchSettings } from '@/lib/contentApi';
import { DEFAULT_HOME, DEFAULT_SETTINGS, buildHomeLayout, buildMenu, mapSettings, type HomeSection, type MenuLink } from '@/lib/siteContent';
import { isSupabaseConfigured } from '@/lib/supabase';

interface SiteContent {
  settings: SiteSettings;
  home: HomeSection[];
  menus: { header: MenuLink[]; footer: MenuLink[]; mobile: MenuLink[] };
}

const EMPTY_MENUS = { header: [], footer: [], mobile: [] };
const Ctx = createContext<SiteContent>({ settings: DEFAULT_SETTINGS, home: DEFAULT_HOME, menus: EMPTY_MENUS });

/** Loads the editable site content once. If it cannot load, the built-in brand defaults keep the site usable. */
export function SiteContentProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<SiteContent>({ settings: DEFAULT_SETTINGS, home: DEFAULT_HOME, menus: EMPTY_MENUS });

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    Promise.allSettled([fetchSettings(), fetchHomeSections(), fetchMenus()]).then(([s, h, m]) => {
      if (!active) return;
      const menuRows = m.status === 'fulfilled' ? m.value : [];
      setValue({
        settings: s.status === 'fulfilled' ? mapSettings(s.value) : DEFAULT_SETTINGS,
        home: h.status === 'fulfilled' ? buildHomeLayout(h.value) : DEFAULT_HOME,
        menus: {
          header: buildMenu(menuRows.filter((r) => r.location === 'header')),
          footer: buildMenu(menuRows.filter((r) => r.location === 'footer')),
          mobile: buildMenu(menuRows.filter((r) => r.location === 'mobile')),
        },
      });
    });
    return () => { active = false; };
  }, []);

  return <Ctx.Provider value={useMemo(() => value, [value])}>{children}</Ctx.Provider>;
}

export const useSiteContent = () => useContext(Ctx);
export const useSiteSettings = () => useContext(Ctx).settings;
