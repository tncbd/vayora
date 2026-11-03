/** Format a BDT amount, e.g. 1200 -> "৳1,200". Uses en-US grouping for consistency. */
export function formatBDT(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const hasFraction = Math.round(safe * 100) % 100 !== 0;
  return (
    '৳' +
    safe.toLocaleString('en-US', {
      minimumFractionDigits: hasFraction ? 2 : 0,
      maximumFractionDigits: 2,
    })
  );
}

/** Whole-number discount percentage between regular and selling price (0 if none). */
export function discountPercent(regularPrice: number, sellingPrice: number): number {
  if (!(regularPrice > 0) || sellingPrice >= regularPrice || sellingPrice < 0) return 0;
  return Math.round(((regularPrice - sellingPrice) / regularPrice) * 100);
}

/** Lowercase, hyphenated, URL-safe slug. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
