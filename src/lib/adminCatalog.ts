// Pure helpers for the admin catalogue screens (validation, pricing, CSV).
import { slugify } from './format';

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Mirrors the product-images bucket limits so users get a clear message before uploading. */
export function validateImageFile(file: { type: string; size: number; name?: string }): string | null {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) return 'Use a JPG, PNG, WebP or AVIF image.';
  if (file.size > MAX_IMAGE_BYTES) return 'Image is larger than 5 MB.';
  if (file.size === 0) return 'The file is empty.';
  return null;
}

export function imageExtension(mime: string): string {
  return { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' }[mime] ?? 'img';
}

/** Selling price after a percentage discount, rounded to whole taka. */
export function sellingFromDiscount(regular: number, percent: number): number {
  if (!(regular >= 0) || !(percent >= 0) || percent > 100) return regular;
  return Math.round(regular * (1 - percent / 100));
}

export function validatePricing(regular: number, selling: number): string | null {
  if (!Number.isFinite(regular) || regular < 0) return 'Regular price must be 0 or more.';
  if (!Number.isFinite(selling) || selling < 0) return 'Selling price must be 0 or more.';
  if (selling > regular) return 'Selling price cannot be higher than the regular price.';
  return null;
}

/** Build a variant SKU such as VAY-TEE-001-XL-BLK. */
export function variantSku(productSku: string, size: string | null, color: string | null): string {
  const part = (s: string | null) => (s ? s.toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 4) : '');
  return [productSku.trim().toUpperCase(), part(size), part(color)].filter(Boolean).join('-');
}

export interface VariantSeed {
  size: string | null;
  color: string | null;
  colorHex: string | null;
  sku: string;
}

/** Cartesian product of sizes x colours, skipping combinations that already exist. */
export function generateVariants(
  productSku: string,
  sizes: string[],
  colors: { name: string; hex: string | null }[],
  existing: { size: string | null; color: string | null }[],
): VariantSeed[] {
  const sz = sizes.length ? sizes : [null];
  const cl = colors.length ? colors : [{ name: null as string | null, hex: null as string | null }];
  const have = new Set(existing.map((e) => `${(e.size ?? '').toLowerCase()}|${(e.color ?? '').toLowerCase()}`));
  const out: VariantSeed[] = [];
  for (const s of sz) {
    for (const c of cl) {
      if (!s && !c.name) continue;
      const key = `${(s ?? '').toLowerCase()}|${(c.name ?? '').toLowerCase()}`;
      if (have.has(key)) continue;
      have.add(key);
      out.push({ size: s, color: c.name, colorHex: c.hex, sku: variantSku(productSku, s, c.name) });
    }
  }
  return out;
}

/** Parse "S, M, L" (commas/new lines) into a clean unique list. */
export function parseList(input: string): string[] {
  return [...new Set(input.split(/[,\n]/).map((s) => s.trim()).filter(Boolean))].slice(0, 30);
}

/** "Black:#171717, White" -> [{name, hex}] */
export function parseColorList(input: string): { name: string; hex: string | null }[] {
  const seen = new Set<string>();
  const out: { name: string; hex: string | null }[] = [];
  for (const raw of input.split(/[,\n]/)) {
    const [n, h] = raw.split(':').map((s) => s.trim());
    if (!n || seen.has(n.toLowerCase())) continue;
    seen.add(n.toLowerCase());
    out.push({ name: n, hex: h && /^#[0-9a-f]{6}$/i.test(h) ? h : null });
  }
  return out.slice(0, 30);
}

/** Slug for a duplicate: name-copy, name-copy-2, ... */
export function copySlug(slug: string, taken: Set<string>): string {
  const base = slugify(`${slug}-copy`);
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

export function copySku(sku: string, taken: Set<string>): string {
  const base = `${sku}-COPY`;
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}${i}`)) i++;
  return `${base}${i}`;
}

// ---------- CSV ----------
/** Escape a cell for CSV and neutralise spreadsheet formula injection (=, +, -, @). */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
}

export function stockStatus(quantity: number, reserved: number, threshold: number): 'out' | 'low' | 'ok' {
  const available = quantity - reserved;
  if (available <= 0) return 'out';
  if (available <= threshold) return 'low';
  return 'ok';
}

/** Friendly message for the Postgres/PostgREST errors admins are likely to hit. */
export function friendlyDbError(error: { code?: string; message?: string } | null | undefined): string {
  if (!error) return 'Something went wrong.';
  const m = (error.message ?? '').toLowerCase();
  if (error.code === '23505' || m.includes('duplicate key')) {
    if (m.includes('slug')) return 'That URL slug is already used by another item.';
    if (m.includes('sku')) return 'That SKU is already in use.';
    return 'That value must be unique and already exists.';
  }
  if (error.code === '23503' || m.includes('foreign key')) return 'This item is still in use (for example by products or subcategories), so it cannot be deleted.';
  if (error.code === '23514' || m.includes('check constraint')) {
    if (m.includes('reserved')) return 'Stock cannot be set lower than the quantity already reserved for orders.';
    if (m.includes('selling_price')) return 'Selling price cannot be higher than the regular price.';
    return 'One of the values is not allowed. Please check the form.';
  }
  if (error.code === '42501' || m.includes('row-level security') || m.includes('permission denied')) return 'You do not have permission to do that.';
  return 'Could not save. Please try again.';
}
