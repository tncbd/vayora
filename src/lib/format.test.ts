import { describe, expect, it } from 'vitest';
import { discountPercent, formatBDT, slugify } from './format';

describe('formatBDT', () => {
  it('formats whole amounts with grouping', () => {
    expect(formatBDT(1200)).toBe('৳1,200');
    expect(formatBDT(0)).toBe('৳0');
    expect(formatBDT(1234567)).toBe('৳1,234,567');
  });
  it('keeps two decimals only when needed', () => {
    expect(formatBDT(80.5)).toBe('৳80.50');
  });
  it('treats non-finite input as zero', () => {
    expect(formatBDT(NaN)).toBe('৳0');
  });
});

describe('discountPercent', () => {
  it('computes rounded percentage', () => {
    expect(discountPercent(1000, 800)).toBe(20);
    expect(discountPercent(1500, 1200)).toBe(20);
  });
  it('returns 0 when there is no discount or bad input', () => {
    expect(discountPercent(1000, 1000)).toBe(0);
    expect(discountPercent(1000, 1200)).toBe(0);
    expect(discountPercent(0, 0)).toBe(0);
  });
});

describe('slugify', () => {
  it('creates url-safe slugs', () => {
    expect(slugify("Women's T-Shirt")).toBe('women-s-t-shirt');
    expect(slugify('  Three  Piece ')).toBe('three-piece');
  });
});
