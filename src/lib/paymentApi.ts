// Customer side of the manual advance payment. Nothing here marks a payment as paid:
// the customer submits what they sent, and staff verify it against their own bKash/Nagad/Upay account.
import { z } from 'zod';
import { supabase } from './supabase';
import { normalizeBdPhone } from './validation';

export type MethodCode = 'bkash' | 'nagad' | 'upay';
export const METHOD_LABEL: Record<MethodCode, string> = { bkash: 'bKash', nagad: 'Nagad', upay: 'Upay' };

export const paymentSchema = z.object({
  method: z.enum(['bkash', 'nagad', 'upay'], { message: 'Choose how you paid' }),
  senderNumber: z.string().trim().transform((v, ctx) => {
    const n = normalizeBdPhone(v);
    if (!n) { ctx.addIssue({ code: 'custom', message: 'Enter the mobile number you sent the money from' }); return z.NEVER; }
    return n;
  }),
  transactionId: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{6,40}$/, 'Transaction ID: 6-40 letters and numbers, no spaces'),
});
export type PaymentInput = z.input<typeof paymentSchema>;
export type PaymentOutput = z.output<typeof paymentSchema>;

export interface PaymentInfo {
  orderNumber: string;
  orderStatus: string;
  total: number;
  advanceAmount: number;
  codAmount: number;
  paymentStatus: 'submitted' | 'verified' | 'rejected' | 'pending' | null;
  rejectionReason: string | null;
  attemptsLeft: number;
  expiresAt: string | null;
  methods: { code: MethodCode; displayName: string; merchantNumber: string; instructions: string | null }[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
const client = () => { if (!supabase) throw new Error('The store is not connected to its database.'); return supabase; };
const clean = (m: string) => (m.length < 160 ? m : 'Something went wrong. Please try again.');

/** What the customer should do next, from the order and its latest payment. */
export function paymentStage(i: Pick<PaymentInfo, 'orderStatus' | 'paymentStatus' | 'attemptsLeft'>): 'verified' | 'submitted' | 'cancelled' | 'rejected_can_retry' | 'rejected_locked' | 'awaiting' | 'none' {
  if (i.orderStatus === 'cancelled') return 'cancelled';
  if (i.paymentStatus === 'verified') return 'verified';
  if (i.paymentStatus === 'submitted') return 'submitted';
  if (i.paymentStatus === 'rejected') return i.attemptsLeft > 0 ? 'rejected_can_retry' : 'rejected_locked';
  return i.orderStatus === 'pending_payment_verification' ? 'awaiting' : 'none';
}

export async function getPaymentInfo(orderId: string, token: string | null): Promise<PaymentInfo> {
  const { data, error } = await client().rpc('get_payment_info', { p_order_id: orderId, p_tracking_token: token });
  if (error) throw new Error(clean(error.message));
  const r = data as Row;
  return {
    orderNumber: r.order_number, orderStatus: r.order_status, total: Number(r.total), advanceAmount: Number(r.advance_amount), codAmount: Number(r.cod_amount),
    paymentStatus: r.payment_status ?? null, rejectionReason: r.rejection_reason ?? null, attemptsLeft: Number(r.attempts_left), expiresAt: r.expires_at ?? null,
    methods: (r.methods ?? []).map((m: Row) => ({ code: m.code, displayName: m.display_name, merchantNumber: m.merchant_number, instructions: m.instructions ?? null })),
  };
}

const PROOF_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export function validateProofFile(f: { type: string; size: number }): string | null {
  if (!PROOF_TYPES.includes(f.type)) return 'Use a JPG, PNG or WebP screenshot.';
  if (f.size > 3 * 1024 * 1024) return 'The screenshot must be smaller than 3 MB.';
  return null;
}

/** `proof` is optional. Signed-in customers upload under their own folder, guests under guest/<order token>/ (the database checks both). */
export async function submitPayment(orderId: string, token: string | null, v: PaymentOutput, proof?: File | null, userId?: string | null): Promise<void> {
  const db = client();
  let proofPath: string | null = null;
  if (proof && (userId || token)) {
    const err = validateProofFile(proof);
    if (err) throw new Error(err);
    const ext = proof.type === 'image/png' ? 'png' : proof.type === 'image/webp' ? 'webp' : 'jpg';
    proofPath = userId ? `${userId}/${orderId}/${crypto.randomUUID()}.${ext}` : `guest/${token}/${crypto.randomUUID()}.${ext}`;
    const up = await db.storage.from('payment-proofs').upload(proofPath, proof, { contentType: proof.type, upsert: false });
    if (up.error) throw new Error('Could not upload the screenshot. You can submit without it.');
  }
  const { error } = await db.rpc('submit_payment', {
    p_order_id: orderId, p_tracking_token: token, p_method: v.method, p_sender: v.senderNumber, p_txn: v.transactionId, p_proof_path: proofPath,
  });
  if (error) throw new Error(clean(error.message));
}
