// Admin order management. Runs as the signed-in staff member (row-level security applies).
// Status changes go ONLY through the set_order_status() database function, which validates the move,
// keeps stock in step, and writes the history and audit log.
import { z } from 'zod';
import { supabase } from './supabase';
import { friendlyDbError } from './adminCatalog';
import type { OrderStatus } from './orderStatus';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;
const db = () => { if (!supabase) throw new Error('Not connected to the database.'); return supabase; };

/** Make free text safe to embed in a PostgREST filter (no commas, parentheses, wildcards or quotes). */
export function safeSearch(q: string): string {
  return q.replace(/[,()%*\\"'`;:]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
}

export interface OrderFilters { status: OrderStatus | 'all' | 'open'; q: string; page: number; pageSize: number }
const OPEN: OrderStatus[] = ['pending_payment_verification', 'pending_order_review', 'confirmed', 'processing', 'shipped', 'out_for_delivery'];

export async function listOrders(f: OrderFilters): Promise<{ rows: Row[]; total: number }> {
  let q = db().from('orders').select('id, order_number, customer_name, phone, district, status, total, cod_amount, advance_amount, placed_at', { count: 'exact' });
  if (f.status === 'open') q = q.in('status', OPEN);
  else if (f.status !== 'all') q = q.eq('status', f.status);
  const s = safeSearch(f.q);
  if (s) q = q.or(`order_number.ilike.%${s}%,phone.ilike.%${s}%,customer_name.ilike.%${s}%`);
  const from = (f.page - 1) * f.pageSize;
  const { data, error, count } = await q.order('placed_at', { ascending: false }).range(from, from + f.pageSize - 1);
  if (error) throw new Error(friendlyDbError(error));
  return { rows: data ?? [], total: count ?? 0 };
}

export async function getOrder(id: string): Promise<Row | null> {
  const { data, error } = await db().from('orders')
    .select('*, order_items(*), order_status_history(*), payments(id, method, amount, status, sender_number, transaction_id, rejection_reason, attempt, submitted_at)')
    .eq('id', id).maybeSingle();
  if (error) throw new Error(friendlyDbError(error));
  return data;
}

export const statusChangeSchema = z.object({
  status: z.string().min(1, 'Choose the new status'),
  note: z.string().trim().max(500, 'Maximum 500 characters'),
  isPublic: z.boolean(),
  courier: z.string().trim().max(80),
  trackingNumber: z.string().trim().max(80),
}).superRefine((v, ctx) => {
  if (v.status === 'cancelled' && !v.note) ctx.addIssue({ code: 'custom', path: ['note'], message: 'Add the reason for cancelling' });
});
export type StatusChangeInput = z.input<typeof statusChangeSchema>;
export type StatusChangeOutput = z.output<typeof statusChangeSchema>;

export async function setOrderStatus(orderId: string, v: StatusChangeOutput): Promise<void> {
  const { error } = await db().rpc('set_order_status', {
    p_order_id: orderId, p_new: v.status, p_note: v.note || null, p_public: v.isPublic, p_courier: v.courier || null, p_tracking_number: v.trackingNumber || null,
  });
  if (error) throw new Error(error.message.length < 160 ? error.message : 'Could not change the status.');
}

export async function saveOrderMeta(orderId: string, v: { courier: string; trackingNumber: string; internalNotes: string }): Promise<void> {
  const { error } = await db().from('orders').update({
    courier_company: v.courier.trim() || null, tracking_number: v.trackingNumber.trim() || null, internal_notes: v.internalNotes.trim() || null,
  }).eq('id', orderId);
  if (error) throw new Error(friendlyDbError(error));
}

export async function exportOrders(f: Omit<OrderFilters, 'page' | 'pageSize'>): Promise<Row[]> {
  const all: Row[] = [];
  for (let page = 1; page <= 10; page++) {
    const { rows, total } = await listOrders({ ...f, page, pageSize: 100 });
    all.push(...rows);
    if (all.length >= total || rows.length === 0) break;
  }
  return all;
}
