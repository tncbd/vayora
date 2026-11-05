import { describe, expect, it } from 'vitest';
import { CART_KEY, MAX_LINE_QTY, MAX_LINES, addLine, cartCount, loadCart, removeLine, sanitizeCart, saveCart, setQuantity } from './cart';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

describe('cart', () => {
  it('adds, merges and caps quantity', () => {
    let c = addLine([], A, 2);
    c = addLine(c, A, 3);
    expect(c).toEqual([{ variantId: A, quantity: 5 }]);
    expect(addLine(c, A, 99)[0].quantity).toBe(MAX_LINE_QTY);
  });
  it('ignores invalid ids when adding', () => {
    expect(addLine([], 'nope', 1)).toEqual([]);
  });
  it('updates and removes lines', () => {
    const c = addLine(addLine([], A, 1), B, 2);
    expect(setQuantity(c, B, 4)).toEqual([{ variantId: A, quantity: 1 }, { variantId: B, quantity: 4 }]);
    expect(setQuantity(c, B, 0)).toEqual([{ variantId: A, quantity: 1 }]);
    expect(setQuantity(c, B, 500)[1].quantity).toBe(MAX_LINE_QTY);
    expect(removeLine(c, A)).toEqual([{ variantId: B, quantity: 2 }]);
    expect(cartCount(c)).toBe(3);
  });
  it('sanitises untrusted data', () => {
    expect(sanitizeCart('x')).toEqual([]);
    expect(sanitizeCart(null)).toEqual([]);
    const dirty = [null, 5, { variantId: A, quantity: -1 }, { variantId: A, quantity: 'x' }, { variantId: 'bad', quantity: 1 }, { variantId: A, quantity: NaN }, { variantId: A, quantity: 2.7 }, { variantId: A.toUpperCase(), quantity: 1 }];
    expect(sanitizeCart(dirty)).toEqual([{ variantId: A, quantity: 3 }]);
  });
  it('limits the number of lines', () => {
    const many = Array.from({ length: 80 }, (_, i) => ({ variantId: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`, quantity: 1 }));
    expect(sanitizeCart(many)).toHaveLength(MAX_LINES);
  });
  it('round-trips through storage and survives corrupt or missing storage', () => {
    const mem = new Map<string, string>();
    const s = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
    saveCart([{ variantId: A, quantity: 2 }], s);
    expect(loadCart(s)).toEqual([{ variantId: A, quantity: 2 }]);
    mem.set(CART_KEY, '{not json');
    expect(loadCart(s)).toEqual([]);
    saveCart([], s);
    expect(mem.has(CART_KEY)).toBe(false);
    expect(loadCart(null)).toEqual([]);
    expect(() => saveCart([{ variantId: A, quantity: 1 }], null)).not.toThrow();
  });
});
