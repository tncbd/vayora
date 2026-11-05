import { describe, expect, it } from 'vitest';
import { colorsOf, defaultSelection, effectivePrice, findVariant, isOptionAvailable, isSelectionComplete, sizesOf } from './variantLogic';
import type { ProductVariant } from '@/types';

const v = (size: string | null, color: string | null, inStock: boolean, price: number | null = null): ProductVariant => ({
  id: `${size}-${color}`, sku: `S-${size}-${color}`, size, color, colorHex: color === 'Black' ? '#171717' : null, price, inStock, availableQty: inStock ? 5 : 0,
});
const variants = [v('M', 'Black', true), v('L', 'Black', false), v('M', 'White', false), v('L', 'White', true, 650), v('XL', 'White', true)];

describe('variant selection', () => {
  it('lists sizes in natural order and unique colours', () => {
    expect(sizesOf(variants)).toEqual(['M', 'L', 'XL']);
    expect(colorsOf(variants).map((c) => c.name)).toEqual(['Black', 'White']);
    expect(colorsOf(variants)[0].hex).toBe('#171717');
  });

  it('finds the exact variant', () => {
    expect(findVariant(variants, { size: 'L', color: 'White' })?.price).toBe(650);
    expect(findVariant(variants, { size: 'XL', color: 'Black' })).toBeNull();
    expect(findVariant([v('M', null, true)], { size: 'M', color: null })).not.toBeNull();
  });

  it('knows when the selection is complete', () => {
    expect(isSelectionComplete(variants, { size: 'M', color: null })).toBe(false);
    expect(isSelectionComplete(variants, { size: 'M', color: 'Black' })).toBe(true);
    expect(isSelectionComplete([v('S', null, true)], { size: 'S', color: null })).toBe(true);
    expect(isSelectionComplete([v(null, 'Red', true)], { size: null, color: null })).toBe(false);
  });

  it('disables options that are sold out for the other choice', () => {
    expect(isOptionAvailable(variants, 'size', 'L', { size: null, color: 'Black' })).toBe(false); // L/Black sold out
    expect(isOptionAvailable(variants, 'size', 'L', { size: null, color: 'White' })).toBe(true);
    expect(isOptionAvailable(variants, 'color', 'White', { size: 'M', color: null })).toBe(false); // M/White sold out
    expect(isOptionAvailable(variants, 'color', 'Black', { size: null, color: null })).toBe(true);
  });

  it('starts on the first in-stock variant, or nothing if all are sold out', () => {
    expect(defaultSelection(variants)).toEqual({ size: 'M', color: 'Black' });
    expect(defaultSelection([v('M', 'Black', false)])).toEqual({ size: null, color: null });
  });

  it('uses the variant price override when present', () => {
    expect(effectivePrice(599, variants[3])).toBe(650);
    expect(effectivePrice(599, variants[0])).toBe(599);
    expect(effectivePrice(599, null)).toBe(599);
  });
});
