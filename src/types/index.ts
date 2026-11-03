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
}

export interface Product {
  id: string;
  slug: string;
  sku: string;
  name: string;
  shortDescription: string;
  gender: Gender;
  categorySlug: string;
  regularPrice: number; // BDT
  sellingPrice: number; // BDT
  imageUrl: string | null;
  hoverImageUrl: string | null;
  colors: { name: string; hex: string }[];
  sizes: string[];
  isFeatured: boolean;
  isBestseller: boolean;
  isNewArrival: boolean;
  isTrending: boolean;
  isWinter: boolean;
  createdAt: string;
  salesCount: number;
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
