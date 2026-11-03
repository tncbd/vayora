import { allCategories, products } from '@/data/placeholder';
import type { Product } from '@/types';

export type CollectionSlug =
  | 'new-arrivals'
  | 'best-sellers'
  | 'trending'
  | 'featured'
  | 'special-offers'
  | 'winter'
  | 'clearance';

/**
 * Phase 1: selectors over placeholder data.
 * Phase 4 replaces these with Supabase queries of the same shape.
 */
export function getByCollection(slug: string): Product[] {
  switch (slug) {
    case 'new-arrivals':
      return [...products].filter((p) => p.isNewArrival).sort(byNewest);
    case 'best-sellers':
      return [...products].filter((p) => p.isBestseller).sort((a, b) => b.salesCount - a.salesCount);
    case 'trending':
      return products.filter((p) => p.isTrending);
    case 'featured':
      return products.filter((p) => p.isFeatured);
    case 'special-offers':
    case 'clearance':
      return products.filter((p) => p.sellingPrice < p.regularPrice);
    case 'winter':
      return products.filter((p) => p.isWinter);
    default:
      return [];
  }
}

export function byNewest(a: Product, b: Product): number {
  return +new Date(b.createdAt) - +new Date(a.createdAt);
}

export function getByGender(gender: 'men' | 'women'): Product[] {
  return products.filter((p) => p.gender === gender);
}

export function getByCategory(slug: string): Product[] {
  return products.filter((p) => p.categorySlug === slug);
}

export function getCategory(slug: string) {
  return allCategories.find((c) => c.slug === slug);
}

export function searchProducts(query: string): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return products.filter((p) => {
    const category = getCategory(p.categorySlug)?.name.toLowerCase() ?? '';
    return (
      p.name.toLowerCase().includes(q) ||
      category.includes(q) ||
      p.gender.includes(q) ||
      p.colors.some((c) => c.name.toLowerCase().includes(q))
    );
  });
}
