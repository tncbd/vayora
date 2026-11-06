import { describe, expect, it } from 'vitest';
import { safeSearch, statusChangeSchema } from './adminOrders';

describe('safeSearch', () => {
  it('removes characters that could alter a PostgREST filter', () => {
    expect(safeSearch('rahim,status.eq.cancelled')).toBe('rahim status.eq.cancelled');
    expect(safeSearch('a%b*c(d)e"f\'g')).toBe('a b c d e f g');
    expect(safeSearch('  VAY-261106-00001  ')).toBe('VAY-261106-00001');
    expect(safeSearch('x'.repeat(200))).toHaveLength(60);
    expect(safeSearch(',,,')).toBe('');
  });
});

describe('statusChangeSchema', () => {
  const ok = { status: 'confirmed', note: '', isPublic: true, courier: '', trackingNumber: '' };
  it('accepts a plain move and requires a reason to cancel', () => {
    expect(statusChangeSchema.safeParse(ok).success).toBe(true);
    expect(statusChangeSchema.safeParse({ ...ok, status: 'cancelled' }).success).toBe(false);
    expect(statusChangeSchema.safeParse({ ...ok, status: 'cancelled', note: 'Out of stock' }).success).toBe(true);
    expect(statusChangeSchema.safeParse({ ...ok, status: '' }).success).toBe(false);
    expect(statusChangeSchema.safeParse({ ...ok, note: 'x'.repeat(501) }).success).toBe(false);
  });
});
