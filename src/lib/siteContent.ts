// Website content that the shop owner edits in the admin panel. Everything here is a pure mapper so it can be
// tested without a database; contentApi.ts does the fetching.
import type { SiteSettings } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

/** Used until settings load, or when the store has no database. Contact details are empty on purpose. */
export const DEFAULT_SETTINGS: SiteSettings = {
  storeName: 'VAYORA FASHION',
  tagline: 'Style for Everyone. Fashion for Every Moment.',
  phone: '',
  whatsapp: '',
  email: '',
  address: '',
  facebookUrl: '',
  instagramUrl: '',
  tiktokUrl: '',
  youtubeUrl: '',
  announcement: 'Cash on Delivery available all over Bangladesh',
  footerText: 'Premium men’s and women’s fashion, delivered to your door across Bangladesh.',
  copyright: `© ${new Date().getFullYear()} VAYORA FASHION. All rights reserved.`,
};

const str = (v: unknown, fallback: string): string => (typeof v === 'string' ? v.trim() : fallback);

/** Only http(s) links are ever used for social buttons (blocks javascript: and similar). */
export function safeUrl(v: unknown): string {
  if (typeof v !== 'string') return '';
  try {
    const u = new URL(v.trim());
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : '';
  } catch {
    return '';
  }
}

/** Links inside the site ("/shop") or full http(s) links. Anything else is dropped. */
export function safeLink(v: unknown, fallback = '/'): string {
  if (typeof v !== 'string') return fallback;
  const t = v.trim();
  if (t.startsWith('/') && !t.startsWith('//') && !t.includes('\\')) return t;
  return safeUrl(t) || fallback;
}

export function mapSettings(rows: readonly { key: string; value: unknown }[]): SiteSettings {
  const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const d = DEFAULT_SETTINGS;
  const announceOn = m.announcement_enabled !== false;
  return {
    storeName: str(m.store_name, d.storeName) || d.storeName,
    tagline: str(m.tagline, d.tagline),
    phone: str(m.contact_phone, ''),
    whatsapp: str(m.whatsapp_number, '').replace(/[^0-9]/g, ''),
    email: str(m.contact_email, ''),
    address: str(m.address, ''),
    facebookUrl: safeUrl(m.facebook_url),
    instagramUrl: safeUrl(m.instagram_url),
    tiktokUrl: safeUrl(m.tiktok_url),
    youtubeUrl: safeUrl(m.youtube_url),
    announcement: announceOn ? str(m.announcement_text, d.announcement) : '',
    footerText: str(m.footer_text, d.footerText),
    copyright: str(m.copyright_text, d.copyright) || d.copyright,
  };
}

// ---------- homepage layout ----------
export interface HomeSection { key: string; title: string | null; description: string | null; enabled: boolean }

export const HOME_SECTION_KEYS = [
  'hero', 'trust_bar', 'collections', 'new_arrivals', 'best_sellers', 'promo_banners', 'trending', 'winter',
  'discount', 'featured', 'reviews', 'newsletter', 'social',
] as const;

export const DEFAULT_HOME: HomeSection[] = HOME_SECTION_KEYS.map((key) => ({ key, title: null, description: null, enabled: true }));

/** Database order and switches win. With no rows (not configured yet) the full default layout shows. */
export function buildHomeLayout(rows: readonly Row[] | null): HomeSection[] {
  if (!rows || rows.length === 0) return DEFAULT_HOME;
  const known = new Set<string>(HOME_SECTION_KEYS);
  return [...rows]
    .filter((r) => known.has(r.key))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((r) => ({ key: r.key, title: r.title ?? null, description: r.description ?? null, enabled: r.is_enabled !== false }))
    .filter((s) => s.enabled);
}

// ---------- menus ----------
export interface MenuLink { label: string; to: string; children: { label: string; to: string }[] }

export function buildMenu(rows: readonly Row[]): MenuLink[] {
  const live = rows.filter((r) => r.is_active !== false).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const top = live.filter((r) => !r.parent_id);
  return top.map((t) => ({
    label: String(t.label), to: safeLink(t.url),
    children: live.filter((c) => c.parent_id === t.id).map((c) => ({ label: String(c.label), to: safeLink(c.url) })),
  }));
}

// ---------- page text (plain text, never HTML) ----------
export type Block = { type: 'h2' | 'p'; text: string };

/** "## Heading" starts a heading; blank lines separate paragraphs. No HTML is ever interpreted. */
export function parseContent(text: string): Block[] {
  const out: Block[] = [];
  for (const chunk of text.replace(/\r\n/g, '\n').split(/\n{2,}/)) {
    const lines = chunk.split('\n').map((l) => l.trimEnd());
    let para: string[] = [];
    const flush = () => { if (para.length) { out.push({ type: 'p', text: para.join('\n').trim() }); para = []; } };
    for (const l of lines) {
      if (/^##\s+/.test(l)) { flush(); out.push({ type: 'h2', text: l.replace(/^##\s+/, '').trim() }); }
      else if (l.trim()) para.push(l);
    }
    flush();
  }
  return out.filter((b) => b.text);
}

/** FAQ pages: each blank-line separated block is "question line(s) then answer"; first line is the question. */
export function parseFaq(text: string): { q: string; a: string }[] {
  return text.replace(/\r\n/g, '\n').split(/\n{2,}/).map((b) => b.trim()).filter(Boolean).map((b) => {
    const [q, ...rest] = b.split('\n');
    return { q: q.replace(/^Q:\s*/i, '').trim(), a: rest.join('\n').replace(/^A:\s*/i, '').trim() };
  }).filter((f) => f.q && f.a);
}
