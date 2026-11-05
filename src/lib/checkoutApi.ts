// Checkout talks to the database only through server-priced functions:
//   quote_order (RPC)        -> what the cart costs, computed from database prices
//   place-order (Edge Function) -> atomically re-prices, reserves stock and creates the order
import { supabase } from './supabase';
import type { CartLine } from './cart';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export interface QuoteLine {
  variantId: string;
  productId: string | null;
  productName: string;
  slug: string | null;
  size: string | null;
  color: string | null;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  available: number;
  status: 'ok' | 'insufficient' | 'unavailable';
}

export interface Quote {
  ok: boolean;
  lines: QuoteLine[];
  subtotal: number;
  discountTotal: number;
  deliveryCharge: number;
  freeDelivery: boolean;
  deliveryZoneName: string | null;
  estimatedDaysMin: number | null;
  estimatedDaysMax: number | null;
  deliveryError: string | null;
  couponCode: string | null;
  couponError: string | null;
  total: number;
  advanceRequired: boolean;
}

const n = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));
const nn = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export function mapQuote(r: Row): Quote {
  return {
    ok: !!r.ok,
    lines: (r.lines ?? []).map((l: Row): QuoteLine => ({
      variantId: l.variant_id, productId: l.product_id ?? null, productName: l.product_name, slug: l.slug ?? null,
      size: l.size ?? null, color: l.color ?? null, imageUrl: l.image_url ?? null,
      unitPrice: n(l.unit_price), quantity: n(l.quantity), lineTotal: n(l.line_total), available: n(l.available), status: l.status,
    })),
    subtotal: n(r.subtotal), discountTotal: n(r.discount_total), deliveryCharge: n(r.delivery_charge), freeDelivery: !!r.free_delivery,
    deliveryZoneName: r.delivery_zone_name ?? null, estimatedDaysMin: nn(r.estimated_days_min), estimatedDaysMax: nn(r.estimated_days_max),
    deliveryError: r.delivery_error ?? null, couponCode: r.coupon_code ?? null, couponError: r.coupon_error ?? null,
    total: n(r.total), advanceRequired: !!r.advance_required,
  };
}

const toItems = (lines: readonly CartLine[]) => lines.map((l) => ({ variant_id: l.variantId, quantity: l.quantity }));

export async function quoteOrder(lines: readonly CartLine[], opts: { district?: string; coupon?: string; phone?: string } = {}): Promise<Quote> {
  if (!supabase) throw new Error('The store is not connected to its database.');
  const { data, error } = await supabase.rpc('quote_order', {
    p_items: toItems(lines),
    p_district: opts.district || null,
    p_coupon: opts.coupon || null,
    p_phone: opts.phone || null,
  });
  if (error) throw new Error(error.message.includes('cart') ? error.message : 'We could not price your cart. Please try again.');
  return mapQuote(data as Row);
}

export interface PlaceOrderInput {
  customer: { name: string; phone: string; alt_phone: string; email: string; district: string; area: string; address: string; delivery_instructions: string; notes: string };
  lines: readonly CartLine[];
  coupon: string | null;
  expectedTotal: number;
  idempotencyKey: string;
}

export interface PlacedOrder {
  orderNumber: string;
  subtotal: number;
  discountTotal: number;
  deliveryCharge: number;
  total: number;
  advanceAmount: number;
  codAmount: number;
}

export async function placeOrder(input: PlaceOrderInput): Promise<PlacedOrder> {
  if (!supabase) throw new Error('The store is not connected to its database.');
  const { data, error } = await supabase.functions.invoke('place-order', {
    body: {
      customer: input.customer,
      items: toItems(input.lines),
      coupon: input.coupon,
      expected_total: input.expectedTotal,
      idempotency_key: input.idempotencyKey,
    },
  });
  if (error) {
    let message = 'We could not place your order. Please try again.';
    const ctx = (error as { context?: unknown }).context;
    if (typeof Response !== 'undefined' && ctx instanceof Response) {
      const body = await ctx.json().catch(() => null);
      if (body && typeof body.error === 'string') message = body.error;
    }
    throw new Error(message);
  }
  const r = data as Row;
  return {
    orderNumber: r.order_number, subtotal: n(r.subtotal), discountTotal: n(r.discount_total), deliveryCharge: n(r.delivery_charge),
    total: n(r.total), advanceAmount: n(r.advance_amount), codAmount: n(r.cod_amount),
  };
}

/** Last placed order, kept for the confirmation page only (no personal details). */
export const LAST_ORDER_KEY = 'vayora.lastOrder';
