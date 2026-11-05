// Admin coupon management. Runs as the signed-in admin; RLS only lets super_admin/admin touch coupons.
import { z } from 'zod';
import { supabase } from './supabase';
import { friendlyDbError } from './adminCatalog';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CouponRow = Record<string, any> & {
  id: string; code: string; type: 'fixed' | 'percentage'; value: number; min_order_value: number; max_discount: number | null;
  starts_at: string | null; expires_at: string | null; usage_limit: number | null; per_customer_limit: number | null;
  used_count: number; is_active: boolean;
};

const optInt = z.union([z.literal(''), z.coerce.number().int('Whole number').min(1, 'Must be at least 1')]);
const optMoney = z.union([z.literal(''), z.coerce.number().min(0.01, 'Must be above 0')]);

export const couponSchema = z
  .object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,40}$/, 'Use 3-40 letters, numbers, - or _'),
    type: z.enum(['percentage', 'fixed']),
    value: z.coerce.number({ message: 'Enter a number' }).positive('Must be above 0'),
    minOrderValue: z.coerce.number({ message: 'Enter a number' }).min(0, 'Cannot be negative'),
    maxDiscount: optMoney,
    startsAt: z.string(),
    expiresAt: z.string(),
    usageLimit: optInt,
    perCustomerLimit: optInt,
    isActive: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.type === 'percentage' && v.value > 100) ctx.addIssue({ code: 'custom', path: ['value'], message: 'A percentage cannot exceed 100' });
    if (v.startsAt && v.expiresAt && new Date(v.expiresAt) <= new Date(v.startsAt)) ctx.addIssue({ code: 'custom', path: ['expiresAt'], message: 'Must be after the start date' });
  });
export type CouponInput = z.input<typeof couponSchema>;
export type CouponOutput = z.output<typeof couponSchema>;

export const EMPTY_COUPON: CouponInput = { code: '', type: 'percentage', value: '' as unknown as number, minOrderValue: 0, maxDiscount: '', startsAt: '', expiresAt: '', usageLimit: '', perCustomerLimit: '', isActive: true };

/** datetime-local <-> ISO (the admin enters Bangladesh local time via the browser). */
export const toLocalInput = (iso: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const toIso = (local: string): string | null => (local ? new Date(local).toISOString() : null);

export const fromRow = (r: CouponRow): CouponInput => ({
  code: r.code, type: r.type, value: Number(r.value), minOrderValue: Number(r.min_order_value),
  maxDiscount: r.max_discount === null ? '' : Number(r.max_discount), startsAt: toLocalInput(r.starts_at), expiresAt: toLocalInput(r.expires_at),
  usageLimit: r.usage_limit ?? '', perCustomerLimit: r.per_customer_limit ?? '', isActive: r.is_active,
});

export const toPayload = (v: CouponOutput) => ({
  code: v.code, type: v.type, value: v.value, min_order_value: v.minOrderValue,
  max_discount: v.type === 'percentage' && v.maxDiscount !== '' ? v.maxDiscount : null,
  starts_at: toIso(v.startsAt), expires_at: toIso(v.expiresAt),
  usage_limit: v.usageLimit === '' ? null : v.usageLimit, per_customer_limit: v.perCustomerLimit === '' ? null : v.perCustomerLimit,
  is_active: v.isActive,
});

function db() {
  if (!supabase) throw new Error('Not connected to the database.');
  return supabase;
}

export async function listCoupons(): Promise<CouponRow[]> {
  const { data, error } = await db().from('coupons').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(friendlyDbError(error));
  return (data ?? []) as CouponRow[];
}

export async function saveCoupon(id: string | null, v: CouponOutput): Promise<void> {
  const payload = toPayload(v);
  const res = id ? await db().from('coupons').update(payload).eq('id', id) : await db().from('coupons').insert(payload);
  if (res.error) {
    throw new Error(res.error.code === '23505' ? 'A coupon with that code already exists.' : friendlyDbError(res.error));
  }
}

export async function setCouponActive(id: string, active: boolean): Promise<void> {
  const { error } = await db().from('coupons').update({ is_active: active }).eq('id', id);
  if (error) throw new Error(friendlyDbError(error));
}

export async function deleteCoupon(id: string): Promise<void> {
  const { error } = await db().from('coupons').delete().eq('id', id);
  if (error) throw new Error(friendlyDbError(error));
}
