import { describe, expect, it } from 'vitest';
import { EMPTY_ZONE, methodSchema, shippingSchema, uncoveredDistricts, zoneFromRow, zonePayload, zoneSchema } from './adminPayments';

describe('zoneSchema', () => {
  const ok = { ...EMPTY_ZONE, name: 'Inside Dhaka', charge: 80, districts: ['Dhaka'] };
  it('accepts a zone and maps blanks to null', () => {
    const r = zoneSchema.safeParse(ok);
    expect(r.success).toBe(true);
    if (r.success) expect(zonePayload(r.data)).toMatchObject({ charge: 80, free_delivery_threshold: null, estimated_days_min: null, districts: ['Dhaka'] });
  });
  it.each([['negative charge', { charge: -1 }], ['no name', { name: '' }], ['bad district', { districts: ['Atlantis'] }], ['days reversed', { daysMin: 5, daysMax: 2 }], ['negative threshold', { freeThreshold: -5 }]])('rejects %s', (_n, patch) => {
    expect(zoneSchema.safeParse({ ...ok, ...patch }).success).toBe(false);
  });
  it('round-trips a row', () => {
    const f = zoneFromRow({ name: 'Zone X', description: null, districts: ['Dhaka'], charge: '60.00', free_delivery_threshold: '3000.00', estimated_days_min: 1, estimated_days_max: 3, priority: 10, is_active: true });
    expect(zonePayload(zoneSchema.parse(f))).toMatchObject({ charge: 60, free_delivery_threshold: 3000, estimated_days_max: 3, priority: 10 });
  });
});

describe('uncoveredDistricts', () => {
  it('is empty with an all-districts zone and lists the gaps otherwise', () => {
    expect(uncoveredDistricts([{ districts: [], is_active: true }])).toEqual([]);
    const gaps = uncoveredDistricts([{ districts: ['Dhaka'], is_active: true }, { districts: [], is_active: false }]);
    expect(gaps).toHaveLength(63);
    expect(gaps).not.toContain('Dhaka');
    expect(uncoveredDistricts([])).toHaveLength(64);
  });
});

describe('shippingSchema', () => {
  it('validates limits', () => {
    expect(shippingSchema.safeParse({ advanceRequired: true, allowGuest: true, resubmissionLimit: 3, windowHours: 24 }).success).toBe(true);
    expect(shippingSchema.safeParse({ advanceRequired: true, allowGuest: true, resubmissionLimit: 0, windowHours: 24 }).success).toBe(false);
    expect(shippingSchema.safeParse({ advanceRequired: true, allowGuest: true, resubmissionLimit: 3, windowHours: 0 }).success).toBe(false);
  });
});

describe('methodSchema', () => {
  it('normalises the merchant number and refuses to enable a method without one', () => {
    const r = methodSchema.safeParse({ merchantNumber: '+8801712345678', instructions: '', isEnabled: true });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.merchantNumber).toBe('01712345678');
    expect(methodSchema.safeParse({ merchantNumber: '', instructions: '', isEnabled: true }).success).toBe(false);
    expect(methodSchema.safeParse({ merchantNumber: '', instructions: '', isEnabled: false }).success).toBe(true);
    expect(methodSchema.safeParse({ merchantNumber: '123', instructions: '', isEnabled: false }).success).toBe(false);
  });
});
