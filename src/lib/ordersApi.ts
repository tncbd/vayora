// Customer-side order reads and actions. A customer's own orders are read through row-level security;
// guests look an order up with its number plus the phone number used on it (track_order).
import { supabase } from './supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
const client = () => { if (!supabase) throw new Error('The store is not connected to its database.'); return supabase; };
const clean = (m: string) => (m.length < 160 ? m : 'Something went wrong. Please try again.');
const num = (v: unknown) => Number(v ?? 0);

export interface OrderItem { name: string; size: string | null; color: string | null; quantity: number; lineTotal: number; imageUrl: string | null }
export interface HistoryEntry { status: string; note: string | null; at: string }
export interface OrderView {
  id: string; orderNumber: string; status: string; placedAt: string; district: string; area: string;
  subtotal: number; discountTotal: number; deliveryCharge: number; total: number; advanceAmount: number; codAmount: number;
  courier: string | null; trackingNumber: string | null; items: OrderItem[]; history: HistoryEntry[];
}
export interface OrderSummary { id: string; orderNumber: string; status: string; placedAt: string; total: number; itemCount: number; firstItem: string | null }

const mapItem = (i: Row): OrderItem => ({ name: i.name ?? i.product_name, size: i.size ?? null, color: i.color ?? null, quantity: num(i.quantity), lineTotal: num(i.line_total), imageUrl: i.image_url ?? null });

export function mapTracked(r: Row): OrderView {
  return {
    id: r.order_id, orderNumber: r.order_number, status: r.status, placedAt: r.placed_at, district: r.district, area: r.area,
    subtotal: num(r.subtotal), discountTotal: num(r.discount_total), deliveryCharge: num(r.delivery_charge), total: num(r.total),
    advanceAmount: num(r.advance_amount), codAmount: num(r.cod_amount), courier: r.courier_company ?? null, trackingNumber: r.tracking_number ?? null,
    items: (r.items ?? []).map(mapItem), history: (r.history ?? []).map((h: Row) => ({ status: h.status, note: h.note ?? null, at: h.at })),
  };
}

export async function trackOrder(orderNumber: string, phone: string): Promise<OrderView> {
  const { data, error } = await client().rpc('track_order', { p_order_number: orderNumber, p_phone: phone });
  if (error) throw new Error(error.message.startsWith('No order') ? error.message : 'We could not look up your order. Please try again.');
  return mapTracked(data as Row);
}

export async function listMyOrders(): Promise<OrderSummary[]> {
  const { data, error } = await client().from('orders')
    .select('id, order_number, status, placed_at, total, order_items(product_name, quantity)')
    .order('placed_at', { ascending: false }).limit(50);
  if (error) throw new Error('Could not load your orders.');
  return (data ?? []).map((o: Row) => ({
    id: o.id, orderNumber: o.order_number, status: o.status, placedAt: o.placed_at, total: num(o.total),
    itemCount: (o.order_items ?? []).reduce((n: number, i: Row) => n + num(i.quantity), 0), firstItem: o.order_items?.[0]?.product_name ?? null,
  }));
}

export async function getMyOrder(orderNumber: string): Promise<OrderView | null> {
  const { data, error } = await client().from('orders')
    .select('id, order_number, status, placed_at, district, area, subtotal, discount_total, delivery_charge, total, advance_amount, cod_amount, courier_company, tracking_number, order_items(product_name, size, color, quantity, line_total, image_url), order_status_history(to_status, note, created_at, is_public)')
    .eq('order_number', orderNumber).maybeSingle();
  if (error) throw new Error('Could not load this order.');
  if (!data) return null;
  const d = data as Row;
  return mapTracked({
    ...d, order_id: d.id, items: d.order_items,
    history: (d.order_status_history ?? []).filter((h: Row) => h.is_public).sort((a: Row, b: Row) => a.created_at.localeCompare(b.created_at))
      .map((h: Row) => ({ status: h.to_status, note: h.note, at: h.created_at })),
  });
}

export async function cancelMyOrder(orderId: string, token: string | null): Promise<void> {
  const { error } = await client().rpc('cancel_my_order', { p_order_id: orderId, p_tracking_token: token });
  if (error) throw new Error(clean(error.message));
}
