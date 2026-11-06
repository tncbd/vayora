// Order status vocabulary shared by the storefront and the admin. The allowed moves mirror
// public.allowed_next_statuses() in the database (a test keeps them in sync); the database is what enforces them.
export const ORDER_STATUSES = [
  'pending_payment_verification', 'pending_order_review', 'confirmed', 'processing',
  'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned', 'refunded',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment_verification: 'Awaiting payment',
  pending_order_review: 'Order received',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
  refunded: 'Refunded',
};

/** What the customer is told for each status. */
export const STATUS_CUSTOMER_TEXT: Record<OrderStatus, string> = {
  pending_payment_verification: 'We are waiting for your advance delivery-charge payment to be checked.',
  pending_order_review: 'We have received your order and will confirm it shortly.',
  confirmed: 'Your order is confirmed.',
  processing: 'We are preparing your order.',
  shipped: 'Your order has been handed to the courier.',
  out_for_delivery: 'Your order is out for delivery. Please keep your phone on.',
  delivered: 'Your order has been delivered. Thank you for shopping with VAYORA.',
  cancelled: 'This order was cancelled.',
  returned: 'This order was returned.',
  refunded: 'This order was refunded.',
};

const NEXT: Record<OrderStatus, OrderStatus[]> = {
  pending_payment_verification: ['cancelled'],
  pending_order_review: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['out_for_delivery', 'delivered', 'returned'],
  out_for_delivery: ['delivered', 'returned'],
  delivered: ['returned', 'refunded'],
  returned: ['refunded'],
  cancelled: [],
  refunded: [],
};
export const nextStatuses = (from: string): OrderStatus[] => NEXT[from as OrderStatus] ?? [];

/** The happy path shown as a progress bar. */
export const PROGRESS_STEPS: OrderStatus[] = ['pending_order_review', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'];
export function progressIndex(status: string): number {
  if (status === 'pending_payment_verification') return -1;
  return PROGRESS_STEPS.indexOf(status as OrderStatus);
}
export const isClosed = (s: string) => s === 'cancelled' || s === 'returned' || s === 'refunded';
export const customerCanCancel = (s: string) => s === 'pending_payment_verification' || s === 'pending_order_review';

export type Tone = 'ok' | 'warn' | 'bad' | 'muted';
export function statusTone(s: string): Tone {
  if (s === 'delivered' || s === 'confirmed' || s === 'processing' || s === 'shipped' || s === 'out_for_delivery') return 'ok';
  if (s === 'pending_payment_verification' || s === 'pending_order_review') return 'warn';
  if (s === 'cancelled' || s === 'returned') return 'bad';
  return 'muted';
}
export const labelOf = (s: string) => STATUS_LABEL[s as OrderStatus] ?? s;
