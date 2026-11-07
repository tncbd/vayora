// ============================================================================
// PHASE 1 PLACEHOLDER CONTENT — NOT A REAL CATALOGUE
// Everything here is sample data used to build and review the UI before Supabase
// exists. It is replaced by database queries in Phases 2–4 and becomes editable
// from the admin panel in Phase 8. Do not treat any value here as business data.
// ============================================================================
import type { Category, HeroSlide, NavItem, PromoBanner, Review, SiteSettings } from '@/types';

export const siteSettings: SiteSettings = {
  storeName: 'VAYORA FASHION',
  tagline: 'Style for Everyone. Fashion for Every Moment.',
  phone: '+880 1XXX-XXXXXX',
  whatsapp: '8801XXXXXXXXX',
  email: 'hello@example.com',
  address: 'Dhaka, Bangladesh',
  facebookUrl: '',
  instagramUrl: '',
  tiktokUrl: '',
  youtubeUrl: '',
  announcement: 'Cash on Delivery available all over Bangladesh',
  footerText:
    'Premium men’s and women’s fashion, delivered to your door across Bangladesh.',
  copyright: `© ${new Date().getFullYear()} VAYORA FASHION. All rights reserved.`,
  seoDescription: '',
  ogImage: '',
  gaId: '',
  verification: '',
};

const cat = (
  slug: string,
  name: string,
  gender: Category['gender'],
  sortOrder: number,
): Category => ({
  id: `cat-${slug}`,
  slug,
  name,
  gender,
  parentId: null,
  imageUrl: null,
  sortOrder,
});

export const womenCategories: Category[] = [
  cat('saree', 'Saree', 'women', 1),
  cat('three-piece', 'Three Piece', 'women', 2),
  cat('kurti', 'Kurti', 'women', 3),
  cat('tops', 'Tops', 'women', 4),
  cat('womens-t-shirt', "Women's T-Shirt", 'women', 5),
  cat('womens-shirt', "Women's Shirt", 'women', 6),
  cat('salwar-kameez', 'Salwar Kameez', 'women', 7),
  cat('leggings', 'Leggings', 'women', 8),
  cat('womens-jeans', "Women's Jeans", 'women', 9),
  cat('womens-winter', 'Winter Collection', 'women', 10),
  cat('other-womens', "Other Women's Clothing", 'women', 11),
];

export const menCategories: Category[] = [
  cat('t-shirt', 'T-Shirt', 'men', 1),
  cat('polo-shirt', 'Polo Shirt', 'men', 2),
  cat('casual-shirt', 'Casual Shirt', 'men', 3),
  cat('formal-shirt', 'Formal Shirt', 'men', 4),
  cat('panjabi', 'Panjabi', 'men', 5),
  cat('jeans', 'Jeans', 'men', 6),
  cat('trousers', 'Trousers', 'men', 7),
  cat('shorts', 'Shorts', 'men', 8),
  cat('jacket', 'Jacket', 'men', 9),
  cat('hoodie', 'Hoodie', 'men', 10),
  cat('sweater', 'Sweater', 'men', 11),
  cat('mens-winter', 'Winter Collection', 'men', 12),
  cat('other-mens', "Other Men's Clothing", 'men', 13),
];

export const allCategories: Category[] = [...womenCategories, ...menCategories];

export const collections = [
  { slug: 'new-arrivals', name: 'New Arrivals' },
  { slug: 'best-sellers', name: 'Best Sellers' },
  { slug: 'trending', name: 'Trending Products' },
  { slug: 'featured', name: 'Featured Products' },
  { slug: 'special-offers', name: 'Special Offers' },
  { slug: 'winter', name: 'Winter Collection' },
  { slug: 'clearance', name: 'Clearance Sale' },
];

export const navItems: NavItem[] = [
  { label: 'New Arrivals', to: '/collections/new-arrivals' },
  {
    label: 'Women',
    to: '/women',
    children: womenCategories.slice(0, 8).map((c) => ({ label: c.name, to: `/category/${c.slug}` })),
  },
  {
    label: 'Men',
    to: '/men',
    children: menCategories.slice(0, 8).map((c) => ({ label: c.name, to: `/category/${c.slug}` })),
  },
  { label: 'Winter', to: '/collections/winter' },
  { label: 'Offers', to: '/collections/special-offers' },
];

export const heroSlides: HeroSlide[] = [
  {
    id: 'hero-1',
    eyebrow: 'New Season',
    title: 'Style for Everyone',
    description: 'Discover refined essentials and statement pieces, designed for every moment of your day.',
    buttonLabel: 'Shop New Arrivals',
    buttonLink: '/collections/new-arrivals',
    imageUrl: null,
    tone: 'from-[#2a2723] via-[#171717] to-[#3a332a]',
  },
  {
    id: 'hero-2',
    eyebrow: "Women's Edit",
    title: 'Grace in Every Drape',
    description: 'Sarees, three-pieces and kurtis crafted for celebrations and everyday elegance.',
    buttonLabel: "Shop Women's",
    buttonLink: '/women',
    imageUrl: null,
    tone: 'from-[#3b2f26] via-[#241d18] to-[#171717]',
  },
  {
    id: 'hero-3',
    eyebrow: "Men's Edit",
    title: 'Effortless, Tailored',
    description: 'From Panjabi to polo, sharp silhouettes and comfortable fabrics for the modern man.',
    buttonLabel: "Shop Men's",
    buttonLink: '/men',
    imageUrl: null,
    tone: 'from-[#1f2429] via-[#171717] to-[#2d2a24]',
  },
];

export const promoBanners: PromoBanner[] = [
  {
    id: 'promo-1',
    title: 'Winter Collection',
    subtitle: 'Layer up in warmth and style',
    buttonLabel: 'Shop Winter',
    buttonLink: '/collections/winter',
    imageUrl: null,
    tone: 'from-[#d9cfc0] to-[#efe8dc]',
  },
  {
    id: 'promo-2',
    title: 'Special Offers',
    subtitle: 'Limited-time prices on favourites',
    buttonLabel: 'View Offers',
    buttonLink: '/collections/special-offers',
    imageUrl: null,
    tone: 'from-[#c6a46a] to-[#e2cd9f]',
  },
];

export const reviews: Review[] = [
  {
    id: 'rev-1',
    customerName: 'Sample Customer',
    location: 'Dhaka',
    rating: 5,
    comment: 'Sample review text. Real customer reviews will appear here once the review system is live.',
  },
  {
    id: 'rev-2',
    customerName: 'Sample Customer',
    location: 'Chattogram',
    rating: 5,
    comment: 'Sample review text. Real customer reviews will appear here once the review system is live.',
  },
  {
    id: 'rev-3',
    customerName: 'Sample Customer',
    location: 'Sylhet',
    rating: 4,
    comment: 'Sample review text. Real customer reviews will appear here once the review system is live.',
  },
];

export const faqs: { q: string; a: string }[] = [
  {
    q: 'How does Cash on Delivery work?',
    a: 'You pay the product price in cash when your order is delivered. Depending on store settings, the delivery charge may be collected in advance via bKash, Nagad or Upay.',
  },
  {
    q: 'How long does delivery take?',
    a: 'Delivery time depends on your location and is shown at checkout. Final timings are configured by the store.',
  },
  {
    q: 'Can I return or exchange a product?',
    a: 'Please see our Return and Refund Policy for eligibility and the process.',
  },
  {
    q: 'How can I track my order?',
    a: 'Use the Order Tracking page with your order number, or open My Orders from your account.',
  },
];
