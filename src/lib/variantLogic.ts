import { sortSizes } from './catalogParams';
import type { ProductColor, ProductVariant } from '@/types';

export interface Selection {
  size: string | null;
  color: string | null;
}

export const sizesOf = (variants: readonly ProductVariant[]): string[] =>
  sortSizes(variants.map((v) => v.size).filter((s): s is string => !!s));

export function colorsOf(variants: readonly ProductVariant[]): ProductColor[] {
  const m = new Map<string, ProductColor>();
  for (const v of variants) if (v.color && !m.has(v.color.toLowerCase())) m.set(v.color.toLowerCase(), { name: v.color, hex: v.colorHex });
  return [...m.values()];
}

/** The variant that exactly matches the chosen size and colour (null parts must match null). */
export function findVariant(variants: readonly ProductVariant[], sel: Selection): ProductVariant | null {
  return variants.find((v) => (v.size ?? null) === sel.size && (v.color ?? null) === sel.color) ?? null;
}

/** Selection is complete once every option the product offers has been chosen. */
export function isSelectionComplete(variants: readonly ProductVariant[], sel: Selection): boolean {
  const needsSize = variants.some((v) => v.size);
  const needsColor = variants.some((v) => v.color);
  return (!needsSize || !!sel.size) && (!needsColor || !!sel.color);
}

/** Can the shopper still pick `value` for `kind`, given what they already chose for the other option? */
export function isOptionAvailable(variants: readonly ProductVariant[], kind: 'size' | 'color', value: string, sel: Selection): boolean {
  return variants.some((v) => {
    if (!v.inStock) return false;
    if (kind === 'size') return v.size === value && (!sel.color || v.color === sel.color);
    return v.color === value && (!sel.size || v.size === sel.size);
  });
}

/** Starting choice: the first in-stock variant, so the page never opens on "sold out" needlessly. */
export function defaultSelection(variants: readonly ProductVariant[]): Selection {
  const first = variants.find((v) => v.inStock);
  return first ? { size: first.size, color: first.color } : { size: null, color: null };
}

export const effectivePrice = (sellingPrice: number, variant: ProductVariant | null): number =>
  variant && variant.price !== null ? variant.price : sellingPrice;
