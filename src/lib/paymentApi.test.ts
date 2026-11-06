import { describe, expect, it } from 'vitest';
import { paymentSchema, paymentStage, validateProofFile } from './paymentApi';

describe('paymentSchema', () => {
  const ok = { method: 'bkash', senderNumber: '+8801811111111', transactionId: ' 8n7a6b5c4d ' };
  it('normalises phone and transaction id', () => {
    const r = paymentSchema.safeParse(ok);
    expect(r.success).toBe(true);
    if (r.success) { expect(r.data.senderNumber).toBe('01811111111'); expect(r.data.transactionId).toBe('8N7A6B5C4D'); }
  });
  it.each([['method', { method: 'paypal' }], ['phone', { senderNumber: '123' }], ['short txn', { transactionId: 'ABC' }], ['spaces', { transactionId: 'AB CD 1234' }], ['symbols', { transactionId: 'ABC-12345' }]])('rejects bad %s', (_n, patch) => {
    expect(paymentSchema.safeParse({ ...ok, ...patch }).success).toBe(false);
  });
});

describe('paymentStage', () => {
  it('maps order + payment state to the next customer step', () => {
    const s = (orderStatus: string, paymentStatus: any, attemptsLeft = 3) => paymentStage({ orderStatus, paymentStatus, attemptsLeft });
    expect(s('pending_payment_verification', null)).toBe('awaiting');
    expect(s('pending_payment_verification', 'submitted')).toBe('submitted');
    expect(s('confirmed', 'verified')).toBe('verified');
    expect(s('pending_payment_verification', 'rejected', 1)).toBe('rejected_can_retry');
    expect(s('pending_payment_verification', 'rejected', 0)).toBe('rejected_locked');
    expect(s('cancelled', null)).toBe('cancelled');
    expect(s('pending_order_review', null)).toBe('none');
  });
});

describe('validateProofFile', () => {
  it('accepts small images only', () => {
    expect(validateProofFile({ type: 'image/png', size: 1000 })).toBeNull();
    expect(validateProofFile({ type: 'application/pdf', size: 1000 })).toBeTruthy();
    expect(validateProofFile({ type: 'image/jpeg', size: 4 * 1024 * 1024 })).toBeTruthy();
  });
});
