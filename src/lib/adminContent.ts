// Admin: website settings, reviews, newsletter, messages, customers, staff and activity log.
// Everything runs as the signed-in staff member; row-level security and role-checked functions decide access.
import { supabase } from './supabase';
import { friendlyDbError, toCsv } from './adminCatalog';
import { isLink } from './adminResource';
import type { AppRole } from './roles';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;
const db = () => { if (!supabase) throw new Error('Not connected to the database.'); return supabase; };
const ok = <T,>(res: { data: T; error: { code?: string; message?: string } | null }): T => {
  if (res.error) throw new Error(res.error.message && res.error.message.length < 140 && !/^\d/.test(res.error.code ?? '') ? res.error.message : friendlyDbError(res.error));
  return res.data;
};

// ---------- website settings ----------
export interface SettingDef { key: string; label: string; kind: 'text' | 'textarea' | 'phone' | 'whatsapp' | 'email' | 'url' | 'bool'; max?: number; hint?: string; group: string }

export const SETTING_DEFS: SettingDef[] = [
  { group: 'Store', key: 'store_name', label: 'Store name', kind: 'text', max: 60 },
  { group: 'Store', key: 'tagline', label: 'Tagline', kind: 'text', max: 120 },
  { group: 'Store', key: 'announcement_enabled', label: 'Show the top announcement bar', kind: 'bool' },
  { group: 'Store', key: 'announcement_text', label: 'Announcement text', kind: 'text', max: 140 },
  { group: 'Contact', key: 'contact_phone', label: 'Phone number', kind: 'phone', hint: 'Shown on the Contact page and mobile menu.' },
  { group: 'Contact', key: 'whatsapp_number', label: 'WhatsApp number', kind: 'whatsapp', hint: 'With country code, digits only, e.g. 8801712345678. Shows a WhatsApp button on the site.' },
  { group: 'Contact', key: 'contact_email', label: 'Email', kind: 'email' },
  { group: 'Contact', key: 'address', label: 'Address', kind: 'textarea', max: 300 },
  { group: 'Social', key: 'facebook_url', label: 'Facebook page link', kind: 'url' },
  { group: 'Social', key: 'instagram_url', label: 'Instagram link', kind: 'url' },
  { group: 'Social', key: 'youtube_url', label: 'YouTube link', kind: 'url' },
  { group: 'Social', key: 'tiktok_url', label: 'TikTok link', kind: 'url' },
  { group: 'Footer', key: 'footer_text', label: 'Footer text', kind: 'textarea', max: 240 },
  { group: 'Footer', key: 'copyright_text', label: 'Copyright line', kind: 'text', max: 120 },
];

export type SettingValues = Record<string, string | boolean>;

export function validateSettings(v: SettingValues): Record<string, string> {
  const e: Record<string, string> = {};
  for (const d of SETTING_DEFS) {
    if (d.kind === 'bool') continue;
    const s = String(v[d.key] ?? '').trim();
    if (!s) { if (d.key === 'store_name') e[d.key] = 'Store name is required'; continue; }
    if (d.max && s.length > d.max) e[d.key] = `Maximum ${d.max} characters`;
    else if (d.kind === 'phone' && !/^[0-9+\-() ]{6,30}$/.test(s)) e[d.key] = 'Use digits, spaces, + and - only';
    else if (d.kind === 'whatsapp' && !/^[0-9]{10,15}$/.test(s)) e[d.key] = 'Digits only with country code (10 to 15 digits)';
    else if (d.kind === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)) e[d.key] = 'Enter a valid email';
    else if (d.kind === 'url' && !(isLink(s) && !s.startsWith('/'))) e[d.key] = 'Enter a full link starting with https://';
  }
  return e;
}

export async function loadSettings(): Promise<SettingValues> {
  const rows = ok(await db().from('site_settings').select('key, value').in('key', SETTING_DEFS.map((d) => d.key))) ?? [];
  const m = Object.fromEntries(rows.map((r: Row) => [r.key, r.value]));
  const out: SettingValues = {};
  for (const d of SETTING_DEFS) out[d.key] = d.kind === 'bool' ? m[d.key] !== false : typeof m[d.key] === 'string' ? m[d.key] : '';
  return out;
}

export async function saveSettings(v: SettingValues): Promise<void> {
  const rows = SETTING_DEFS.map((d) => ({ key: d.key, value: d.kind === 'bool' ? !!v[d.key] : String(v[d.key] ?? '').trim() }));
  ok(await db().from('site_settings').upsert(rows, { onConflict: 'key' }));
}

// ---------- dashboard ----------
export interface Stats {
  orders_today: number; orders_30d: number; revenue_today: number | null; revenue_30d: number | null;
  awaiting_review: number; awaiting_payment: number; payments_to_verify: number; to_ship: number;
  low_stock: number; out_of_stock: number; new_messages: number; pending_reviews: number;
  daily: { date: string; orders: number; revenue: number | null }[]; top_products: { name: string; units: number }[];
}
export const getStats = async (): Promise<Stats> => ok(await db().rpc('admin_dashboard_stats')) as Stats;

// ---------- reviews ----------
export type ReviewFilter = 'pending' | 'approved' | 'rejected';
export const listReviews = async (status: ReviewFilter): Promise<Row[]> =>
  ok(await db().from('reviews').select('id, rating, title, comment, status, created_at, user_id, products(name, slug)').eq('status', status).order('created_at', { ascending: false }).limit(100)) ?? [];
export const setReviewStatus = async (id: string, status: ReviewFilter) => void ok(await db().from('reviews').update({ status }).eq('id', id));
export const deleteReview = async (id: string) => void ok(await db().from('reviews').delete().eq('id', id));

// ---------- newsletter ----------
export const listSubscribers = async (): Promise<Row[]> => ok(await db().from('newsletter_subscribers').select('*').order('created_at', { ascending: false }).limit(5000)) ?? [];
export const setSubscriberActive = async (id: string, active: boolean) => void ok(await db().from('newsletter_subscribers').update({ is_active: active }).eq('id', id));
export const deleteSubscriber = async (id: string) => void ok(await db().from('newsletter_subscribers').delete().eq('id', id));
export const subscribersCsv = (rows: Row[]) => toCsv(['Email', 'Subscribed', 'Active'], rows.map((r) => [r.email, r.created_at, r.is_active ? 'yes' : 'no']));

// ---------- contact messages ----------
export type MessageFilter = 'new' | 'read' | 'resolved' | 'all';
export async function listMessages(f: MessageFilter): Promise<Row[]> {
  let q = db().from('contact_messages').select('*').order('created_at', { ascending: false }).limit(200);
  if (f !== 'all') q = q.eq('status', f);
  return ok(await q) ?? [];
}
export const setMessageStatus = async (id: string, status: 'new' | 'read' | 'resolved') => void ok(await db().from('contact_messages').update({ status }).eq('id', id));
export const deleteMessage = async (id: string) => void ok(await db().from('contact_messages').delete().eq('id', id));

// ---------- customers ----------
export async function listCustomers(search: string, page: number, pageSize: number): Promise<{ rows: Row[]; total: number }> {
  const rows: Row[] = ok(await db().rpc('admin_list_customers', { p_search: search.replace(/[%_\\]/g, '').trim() || null, p_limit: pageSize, p_offset: (page - 1) * pageSize })) ?? [];
  return { rows, total: rows.length ? Number(rows[0].total_count) : 0 };
}
export const customersCsv = (rows: Row[]) =>
  toCsv(['Name', 'Email', 'Phone', 'Joined', 'Orders', 'Total spent', 'Last order'], rows.map((r) => [r.full_name, r.email, r.phone, r.joined_at, r.orders_count, r.total_spent, r.last_order_at]));

// ---------- staff and roles (super admin) ----------
export const listStaff = async (): Promise<{ user_id: string; email: string; full_name: string | null; roles: AppRole[] }[]> => ok(await db().rpc('admin_list_staff')) ?? [];
export async function grantRole(email: string, role: AppRole, grantedBy: string): Promise<void> {
  const id = ok(await db().rpc('admin_find_user', { p_email: email })) as string;
  ok(await db().from('user_roles').insert({ user_id: id, role, granted_by: grantedBy }));
}
export const revokeRole = async (userId: string, role: AppRole) => void ok(await db().from('user_roles').delete().eq('user_id', userId).eq('role', role));

// ---------- activity log ----------
export async function listLogs(page: number, pageSize: number): Promise<{ rows: Row[]; total: number }> {
  const { data, error, count } = await db().from('admin_activity_logs').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
  if (error) throw new Error(friendlyDbError(error));
  const rows = data ?? [];
  const ids = [...new Set(rows.map((r: Row) => r.actor_id).filter(Boolean))];
  const names: Record<string, string> = {};
  if (ids.length) {
    const { data: ps } = await db().from('profiles').select('id, full_name').in('id', ids);
    for (const p of ps ?? []) if (p.full_name) names[p.id] = p.full_name;
  }
  return { rows: rows.map((r: Row) => ({ ...r, actor: r.actor_id ? names[r.actor_id] ?? `${String(r.actor_id).slice(0, 8)}…` : 'System' })), total: count ?? 0 };
}
