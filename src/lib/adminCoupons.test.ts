import { describe, expect, it } from 'vitest';
import { EMPTY_COUPON, couponSchema, fromRow, toPayload, type CouponRow } from './adminCoupons';

const base = { ...EMPTY_COUPON, code: ' eid10 ', value: 10 as unknown as number };

describe('couponSchema', () => {
  it('upper-cases the code and accepts blanks for optional limits', () => {
    const r = couponSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.code).toBe('EID10');
      expect(toPayload(r.data)).toMatchObject({ code: 'EID10', type: 'percentage', value: 10, max_discount: null, usage_limit: null, per_customer_limit: null, starts_at: null, expires_at: null });
    }
  });
  it.each([
    ['percentage over 100', { value: 150 }], ['zero value', { value: 0 }], ['bad code', { code: 'a b' }], ['short code', { code: 'ab' }],
    ['negative minimum', { minOrderValue: -1 }], ['zero usage limit', { usageLimit: 0 }], ['fractional limit', { perCustomerLimit: 1.5 }],
    ['end before start', { startsAt: '2026-12-02T10:00', expiresAt: '2026-12-01T10:00' }],
  ])('rejects %s', (_n, patch) => {
    expect(couponSchema.safeParse({ ...base, ...patch }).success).toBe(false);
  });
  it('allows a fixed discount above 100 and drops max_discount for fixed coupons', () => {
    const r = couponSchema.safeParse({ ...base, type: 'fixed', value: 250, maxDiscount: 99 });
    expect(r.success).toBe(true);
    if (r.success) expect(toPayload(r.data).max_discount).toBeNull();
  });
  it('round-trips a database row', () => {
    const row = { id: '1', code: 'X1Y', type: 'percentage', value: '15.00', min_order_value: '500.00', max_discount: '200.00', starts_at: null, expires_at: null, usage_limit: 50, per_customer_limit: 1, used_count: 3, is_active: false } as unknown as CouponRow;
    const form = fromRow(row);
    expect(form).toMatchObject({ code: 'X1Y', value: 15, minOrderValue: 500, maxDiscount: 200, usageLimit: 50, perCustomerLimit: 1, isActive: false });
    const parsed = couponSchema.parse(form);
    expect(toPayload(parsed)).toMatchObject({ value: 15, max_discount: 200, usage_limit: 50 });
  });
});
