import { describe, expect, it } from 'vitest';
import { ORDER_STATUSES, STATUS_CUSTOMER_TEXT, STATUS_LABEL, customerCanCancel, isClosed, nextStatuses, progressIndex, statusTone } from './orderStatus';

describe('order status', () => {
  it('has a label and customer text for every status', () => {
    for (const s of ORDER_STATUSES) { expect(STATUS_LABEL[s]).toBeTruthy(); expect(STATUS_CUSTOMER_TEXT[s]).toBeTruthy(); }
  });
  it('only allows forward moves and closed orders go nowhere', () => {
    expect(nextStatuses('pending_order_review')).toEqual(['confirmed', 'cancelled']);
    expect(nextStatuses('shipped')).toEqual(['out_for_delivery', 'delivered', 'returned']);
    expect(nextStatuses('cancelled')).toEqual([]);
    expect(nextStatuses('refunded')).toEqual([]);
    expect(nextStatuses('nonsense')).toEqual([]);
    for (const s of ORDER_STATUSES) for (const n of nextStatuses(s)) expect(n).not.toBe(s);
  });
  it('cannot cancel once shipped, and a payment-pending order cannot be confirmed by hand', () => {
    expect(nextStatuses('shipped')).not.toContain('cancelled');
    expect(nextStatuses('pending_payment_verification')).toEqual(['cancelled']);
  });
  it('knows who can cancel, progress and closed states', () => {
    expect(customerCanCancel('pending_order_review')).toBe(true);
    expect(customerCanCancel('confirmed')).toBe(false);
    expect(progressIndex('processing')).toBe(2);
    expect(progressIndex('pending_payment_verification')).toBe(-1);
    expect(progressIndex('cancelled')).toBe(-1);
    expect(isClosed('returned')).toBe(true);
    expect(isClosed('shipped')).toBe(false);
    expect(statusTone('cancelled')).toBe('bad');
  });
});

import { mapTracked } from './ordersApi';
describe('mapTracked', () => {
  it('maps the database response and tolerates missing optional parts', () => {
    const o = mapTracked({ order_id: 'x', order_number: 'VAY-1', status: 'shipped', placed_at: '2026-11-06T00:00:00Z', district: 'Dhaka', area: 'Mirpur', subtotal: '1000.00', discount_total: 0, delivery_charge: '60', total: '1060', advance_amount: 0, cod_amount: '1060', items: [{ name: 'Tee', quantity: 2, line_total: '1000' }], history: [{ status: 'shipped', at: 'a' }] });
    expect(o).toMatchObject({ orderNumber: 'VAY-1', total: 1060, courier: null, trackingNumber: null });
    expect(o.items[0]).toMatchObject({ name: 'Tee', quantity: 2, lineTotal: 1000, size: null });
    expect(o.history[0].note).toBeNull();
    expect(mapTracked({ order_id: 'y', order_number: 'V', status: 'confirmed' }).items).toEqual([]);
  });
});
