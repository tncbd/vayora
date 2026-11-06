// Admin side of delivery and manual payments. Everything runs as the signed-in staff member, so row-level
// security decides who may do what. Payments are verified ONLY through the verify_payment() database
// function, which checks the role and writes the audit log.
import { z } from 'zod';
import { supabase } from './supabase';
import { friendlyDbError } from './adminCatalog';
import { DISTRICTS } from './districts';
import { normalizeBdPhone } from './validation';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;

function db() {
  if (!supabase) throw new Error('Not connected to the database.');
  return supabase;
}
function check<T>(res: { data: T; error: { code?: string; message?: string } | null }): T {
  if (res.error) throw new Error(res.error.message && res.error.message.length < 140 && !res.error.code?.startsWith('2') ? res.error.message : friendlyDbError(res.error));
  return res.data;
}

// ---------- delivery zones ----------
const optMoney = z.union([z.literal(''), z.coerce.number().min(0, 'Cannot be negative')]);
const optDays = z.union([z.literal(''), z.coerce.number().int('Whole number').min(0).max(60)]);

export const zoneSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter a name').max(80),
    description: z.string().trim().max(300),
    districts: z.array(z.string()).refine((a) => a.every((d) => DISTRICTS.includes(d)), 'Unknown district'),
    charge: z.coerce.number({ message: 'Enter a number' }).min(0, 'Cannot be negative').max(100000),
    freeThreshold: optMoney,
    daysMin: optDays,
    daysMax: optDays,
    priority: z.coerce.number({ message: 'Enter a number' }).int('Whole number').min(0).max(1000),
    isActive: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.daysMin !== '' && v.daysMax !== '' && v.daysMax < v.daysMin) ctx.addIssue({ code: 'custom', path: ['daysMax'], message: 'Must not be less than the minimum' });
  });
export type ZoneInput = z.input<typeof zoneSchema>;
export type ZoneOutput = z.output<typeof zoneSchema>;
export const EMPTY_ZONE: ZoneInput = { name: '', description: '', districts: [], charge: '' as unknown as number, freeThreshold: '', daysMin: '', daysMax: '', priority: 0 as unknown as number, isActive: true };

export const zoneFromRow = (r: Row): ZoneInput => ({
  name: r.name, description: r.description ?? '', districts: r.districts ?? [], charge: Number(r.charge),
  freeThreshold: r.free_delivery_threshold === null ? '' : Number(r.free_delivery_threshold),
  daysMin: r.estimated_days_min ?? '', daysMax: r.estimated_days_max ?? '', priority: r.priority, isActive: r.is_active,
});
export const zonePayload = (v: ZoneOutput) => ({
  name: v.name, description: v.description || null, districts: v.districts, charge: v.charge,
  free_delivery_threshold: v.freeThreshold === '' ? null : v.freeThreshold,
  estimated_days_min: v.daysMin === '' ? null : v.daysMin, estimated_days_max: v.daysMax === '' ? null : v.daysMax,
  priority: v.priority, is_active: v.isActive,
});

/** Districts that no active zone covers (an all-districts zone covers everything). */
export function uncoveredDistricts(zones: readonly { districts: string[]; is_active: boolean }[]): string[] {
  const active = zones.filter((z) => z.is_active);
  if (active.some((z) => z.districts.length === 0)) return [];
  const covered = new Set(active.flatMap((z) => z.districts.map((d) => d.toLowerCase())));
  return DISTRICTS.filter((d) => !covered.has(d.toLowerCase()));
}

export const listZones = async (): Promise<Row[]> => check(await db().from('delivery_zones').select('*').order('sort_order').order('created_at')) ?? [];
export async function saveZone(id: string | null, v: ZoneOutput): Promise<void> {
  const p = zonePayload(v);
  check(id ? await db().from('delivery_zones').update(p).eq('id', id) : await db().from('delivery_zones').insert(p));
}
export const deleteZone = async (id: string) => void check(await db().from('delivery_zones').delete().eq('id', id));

// ---------- shipping settings (site_settings) ----------
export const shippingSchema = z.object({
  advanceRequired: z.boolean(),
  allowGuest: z.boolean(),
  resubmissionLimit: z.coerce.number({ message: 'Enter a number' }).int('Whole number').min(1, 'At least 1').max(10, 'At most 10'),
  windowHours: z.coerce.number({ message: 'Enter a number' }).int('Whole number').min(1, 'At least 1 hour').max(720, 'At most 720 hours (30 days)'),
});
export type ShippingInput = z.input<typeof shippingSchema>;
export type ShippingOutput = z.output<typeof shippingSchema>;
const SHIPPING_KEYS = ['delivery_advance_required', 'allow_guest_checkout', 'payment_resubmission_limit', 'advance_payment_window_hours'] as const;

export async function loadShipping(): Promise<ShippingInput> {
  const rows = check(await db().from('site_settings').select('key, value').in('key', [...SHIPPING_KEYS])) ?? [];
  const m = Object.fromEntries(rows.map((r: Row) => [r.key, r.value]));
  return {
    advanceRequired: m.delivery_advance_required === true, allowGuest: m.allow_guest_checkout !== false,
    resubmissionLimit: Number(m.payment_resubmission_limit ?? 3), windowHours: Number(m.advance_payment_window_hours ?? 24),
  };
}
export async function saveShipping(v: ShippingOutput): Promise<void> {
  const rows = [
    { key: 'delivery_advance_required', value: v.advanceRequired }, { key: 'allow_guest_checkout', value: v.allowGuest },
    { key: 'payment_resubmission_limit', value: v.resubmissionLimit }, { key: 'advance_payment_window_hours', value: v.windowHours },
  ];
  check(await db().from('site_settings').upsert(rows, { onConflict: 'key' }));
}

// ---------- payment methods ----------
export const methodSchema = z
  .object({
    merchantNumber: z.string().trim().transform((v, ctx) => {
      if (v === '') return '';
      const n = normalizeBdPhone(v);
      if (!n) { ctx.addIssue({ code: 'custom', message: 'Enter a valid mobile number (e.g. 01712345678)' }); return z.NEVER; }
      return n;
    }),
    instructions: z.string().trim().max(500, 'Maximum 500 characters'),
    isEnabled: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.isEnabled && v.merchantNumber === '') ctx.addIssue({ code: 'custom', path: ['merchantNumber'], message: 'Add your number before enabling this method' });
  });
export type MethodInput = z.input<typeof methodSchema>;
export type MethodOutput = z.output<typeof methodSchema>;

export const listMethods = async (): Promise<Row[]> => check(await db().from('payment_methods').select('*').order('code')) ?? [];
export async function saveMethod(code: string, v: MethodOutput): Promise<void> {
  check(await db().from('payment_methods').update({ merchant_number: v.merchantNumber || null, instructions: v.instructions || null, is_enabled: v.isEnabled, updated_at: new Date().toISOString() }).eq('code', code));
}

// ---------- payment verification ----------
export type PaymentFilter = 'submitted' | 'verified' | 'rejected' | 'all';
export async function listPayments(filter: PaymentFilter): Promise<Row[]> {
  let q = db().from('payments')
    .select('id, method, amount, status, sender_number, transaction_id, proof_path, rejection_reason, attempt, submitted_at, verified_at, orders(order_number, customer_name, phone, total, status)')
    .not('submitted_at', 'is', null).order('submitted_at', { ascending: filter === 'submitted' }).limit(200);
  if (filter !== 'all') q = q.eq('status', filter);
  return check(await q) ?? [];
}
export async function verifyPayment(id: string, approve: boolean, reason?: string): Promise<void> {
  const { error } = await db().rpc('verify_payment', { p_payment_id: id, p_approve: approve, p_reason: reason ?? null });
  if (error) throw new Error(error.message.length < 140 ? error.message : 'Could not update the payment.');
}
export async function proofUrl(path: string): Promise<string> {
  const { data, error } = await db().storage.from('payment-proofs').createSignedUrl(path, 120);
  if (error || !data) throw new Error('Could not open the screenshot.');
  return data.signedUrl;
}
export async function expireUnpaid(): Promise<number> {
  const { data, error } = await db().rpc('expire_unpaid_orders');
  if (error) throw new Error('Could not cancel unpaid orders.');
  return Number(data ?? 0);
}
