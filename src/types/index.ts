// Shapes mirror the planned Supabase tables (Phase 2) so Phase 1 placeholder data
// can be swapped for real queries without changing components.

export type Gender = 'women' | 'men' | 'unisex';

export interface Category {
  id: string;
  slug: string;
  name: string;
  gender: Gender | null;
  parentId: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive?: boolean;
}

export interface ProductColor {
  name: string;
  hex: string | null;
}

export interface Product {
  id: string;
  slug: string;
  sku: string;
  name: string;
  shortDescription: string;
  gender: Gender;
  categorySlug: string | null;
  categoryName: string | null;
  regularPrice: number; // BDT
  sellingPrice: number; // BDT
  discountPct: number;
  imageUrl: string | null;
  hoverImageUrl: string | null;
  colors: ProductColor[];
  sizes: string[];
  isFeatured: boolean;
  isBestseller: boolean;
  isNewArrival: boolean;
  isTrending: boolean;
  createdAt: string;
  salesCount: number;
  inStock: boolean;
  avgRating: number | null;
  reviewCount: number;
}

export interface ProductImage {
  id: string;
  url: string;
  alt: string | null;
}

export interface ProductVariant {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  colorHex: string | null;
  /** Variant price override; null means use the product selling price. */
  price: number | null;
  inStock: boolean;
  /** Capped at 10 by the database so exact stock is never exposed. */
  availableQty: number;
}

export interface ProductDetail extends Product {
  description: string;
  seoTitle: string | null;
  seoDescription: string | null;
  images: ProductImage[];
  variants: ProductVariant[];
}

export interface PublicReview {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  createdAt: string;
  reviewerName: string;
}

export interface HeroSlide {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  buttonLabel: string;
  buttonLink: string;
  imageUrl: string | null;
  tone: string; // placeholder background gradient classes until real images exist
}

export interface PromoBanner {
  id: string;
  title: string;
  subtitle: string;
  buttonLabel: string;
  buttonLink: string;
  imageUrl: string | null;
  tone: string;
}

export interface Review {
  id: string;
  customerName: string;
  location: string;
  rating: number;
  comment: string;
}

export interface NavItem {
  label: string;
  to: string;
  children?: { label: string; to: string }[];
}

export interface SiteSettings {
  storeName: string;
  tagline: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  facebookUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
  announcement: string;
  footerText: string;
  copyright: string;
}
