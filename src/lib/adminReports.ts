import { supabase } from './supabase';
import { friendlyDbError, toCsv } from './adminCatalog';

export interface Report {
  summary: { orders: number; sales: number; sales_orders: number; delivered_sales: number; discounts: number; delivery_charges: number; cancelled: number; returned: number };
  advance_verified: number;
  daily: { date: string; orders: number; sales: number }[];
  by_status: { status: string; orders: number }[];
  products: { name: string; units: number; sales: number }[];
  districts: { district: string; orders: number; sales: number }[];
  coupons: { code: string; uses: number; discount: number }[];
}

export type Preset = '7d' | '30d' | 'this_month' | 'last_month';
export const PRESETS: { key: Preset; label: string }[] = [
  { key: '7d', label: 'Last 7 days' }, { key: '30d', label: 'Last 30 days' }, { key: 'this_month', label: 'This month' }, { key: 'last_month', label: 'Last month' },
];

const iso = (d: Date) => d.toISOString().slice(0, 10);
/** Today in Bangladesh (UTC+6, no daylight saving) as a UTC-midnight Date, so day arithmetic is exact. */
export const dhakaToday = (now = new Date()): Date => { const t = new Date(now.getTime() + 6 * 3600_000); return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate())); };

export function presetRange(p: Preset, now = new Date()): { from: string; to: string } {
  const today = dhakaToday(now);
  const add = (d: Date, n: number) => new Date(d.getTime() + n * 86400_000);
  if (p === '7d') return { from: iso(add(today, -6)), to: iso(today) };
  if (p === '30d') return { from: iso(add(today, -29)), to: iso(today) };
  const first = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  if (p === 'this_month') return { from: iso(first), to: iso(today) };
  const lastEnd = add(first, -1);
  return { from: iso(new Date(Date.UTC(lastEnd.getUTCFullYear(), lastEnd.getUTCMonth(), 1))), to: iso(lastEnd) };
}

export function validRange(from: string, to: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return 'Choose both dates';
  const a = Date.parse(from), b = Date.parse(to);
  if (Number.isNaN(a) || Number.isNaN(b)) return 'Choose both dates';
  if (b < a) return 'The end date must be on or after the start date';
  if ((b - a) / 86400_000 > 366) return 'Choose a range of at most one year';
  return null;
}

export async function loadReport(from: string, to: string): Promise<Report> {
  if (!supabase) throw new Error('Not connected to the database.');
  const { data, error } = await supabase.rpc('admin_sales_report', { p_from: from, p_to: to });
  if (error) throw new Error(error.message.length < 140 ? error.message : friendlyDbError(error));
  return data as Report;
}

export const dailyCsv = (r: Report) => toCsv(['Date', 'Orders', 'Sales (BDT)'], r.daily.map((d) => [d.date, d.orders, d.sales]));
export const productsCsv = (r: Report) => toCsv(['Product', 'Units sold', 'Sales (BDT)'], r.products.map((p) => [p.name, p.units, p.sales]));
export const districtsCsv = (r: Report) => toCsv(['District', 'Orders', 'Sales (BDT)'], r.districts.map((d) => [d.district, d.orders, d.sales]));
export const avgOrderValue = (r: Report) => (r.summary.sales_orders > 0 ? Math.round(r.summary.sales / r.summary.sales_orders) : 0);
