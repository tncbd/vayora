// ============================================================================
// PHASE 1 PLACEHOLDER CONTENT — NOT A REAL CATALOGUE
// Everything here is sample data used to build and review the UI before Supabase
// exists. It is replaced by database queries in Phases 2–4 and becomes editable
// from the admin panel in Phase 8. Do not treat any value here as business data.
// ============================================================================
import type {
  Category,
  HeroSlide,
  NavItem,
  Product,
  PromoBanner,
  Review,
  SiteSettings,
} from '@/types';

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

// ---- Sample products ------------------------------------------------------
const palette = {
  black: { name: 'Black', hex: '#171717' },
  white: { name: 'White', hex: '#F4F1EA' },
  navy: { name: 'Navy', hex: '#1F2A44' },
  olive: { name: 'Olive', hex: '#6B6B3A' },
  maroon: { name: 'Maroon', hex: '#6D1F2B' },
  sand: { name: 'Sand', hex: '#C9B796' },
  rose: { name: 'Rose', hex: '#C98B94' },
};

type Seed = {
  n: string;
  g: Product['gender'];
  c: string;
  reg: number;
  sell: number;
  flags?: Partial<
    Pick<Product, 'isFeatured' | 'isBestseller' | 'isNewArrival' | 'isTrending' | 'isWinter'>
  >;
  colors: (keyof typeof palette)[];
  sizes: string[];
  sales: number;
  day: number;
};

const SIZES_ALPHA = ['S', 'M', 'L', 'XL'];

const seeds: Seed[] = [
  { n: 'Premium Cotton T-Shirt', g: 'men', c: 't-shirt', reg: 799, sell: 599, flags: { isBestseller: true, isNewArrival: true }, colors: ['black', 'white', 'navy'], sizes: ['M', 'L', 'XL', 'XXL'], sales: 320, day: 2 },
  { n: 'Classic Pique Polo', g: 'men', c: 'polo-shirt', reg: 1199, sell: 999, flags: { isBestseller: true, isFeatured: true }, colors: ['navy', 'white', 'olive'], sizes: SIZES_ALPHA, sales: 280, day: 9 },
  { n: 'Oxford Casual Shirt', g: 'men', c: 'casual-shirt', reg: 1490, sell: 1290, flags: { isTrending: true, isNewArrival: true }, colors: ['sand', 'navy'], sizes: SIZES_ALPHA, sales: 190, day: 4 },
  { n: 'Embroidered Cotton Panjabi', g: 'men', c: 'panjabi', reg: 2490, sell: 1990, flags: { isFeatured: true, isTrending: true }, colors: ['white', 'maroon', 'navy'], sizes: ['M', 'L', 'XL', 'XXL'], sales: 410, day: 12 },
  { n: 'Slim Fit Denim Jeans', g: 'men', c: 'jeans', reg: 1990, sell: 1690, flags: { isBestseller: true }, colors: ['navy', 'black'], sizes: ['30', '32', '34', '36'], sales: 260, day: 20 },
  { n: 'Fleece Pullover Hoodie', g: 'men', c: 'hoodie', reg: 1890, sell: 1490, flags: { isWinter: true, isNewArrival: true, isTrending: true }, colors: ['black', 'olive', 'sand'], sizes: SIZES_ALPHA, sales: 150, day: 1 },
  { n: 'Quilted Winter Jacket', g: 'men', c: 'jacket', reg: 3490, sell: 2790, flags: { isWinter: true, isFeatured: true }, colors: ['black', 'navy'], sizes: SIZES_ALPHA, sales: 95, day: 6 },
  { n: 'Merino Blend Sweater', g: 'men', c: 'sweater', reg: 2290, sell: 1890, flags: { isWinter: true, isBestseller: true }, colors: ['sand', 'navy', 'maroon'], sizes: SIZES_ALPHA, sales: 120, day: 15 },
  { n: 'Handloom Cotton Saree', g: 'women', c: 'saree', reg: 3290, sell: 2690, flags: { isFeatured: true, isBestseller: true }, colors: ['maroon', 'navy', 'rose'], sizes: ['Free Size'], sales: 340, day: 8 },
  { n: 'Printed Three Piece Set', g: 'women', c: 'three-piece', reg: 2790, sell: 2290, flags: { isTrending: true, isNewArrival: true }, colors: ['rose', 'sand', 'olive'], sizes: ['M', 'L', 'XL'], sales: 270, day: 3 },
  { n: 'Everyday Cotton Kurti', g: 'women', c: 'kurti', reg: 1390, sell: 1090, flags: { isBestseller: true, isTrending: true }, colors: ['rose', 'white', 'navy'], sizes: SIZES_ALPHA, sales: 360, day: 11 },
  { n: 'Relaxed Linen Top', g: 'women', c: 'tops', reg: 990, sell: 790, flags: { isNewArrival: true, isFeatured: true }, colors: ['white', 'sand', 'rose'], sizes: SIZES_ALPHA, sales: 140, day: 5 },
  { n: 'Silk Blend Salwar Kameez', g: 'women', c: 'salwar-kameez', reg: 3890, sell: 3290, flags: { isFeatured: true }, colors: ['maroon', 'navy'], sizes: ['M', 'L', 'XL'], sales: 110, day: 18 },
  { n: 'High-Rise Stretch Leggings', g: 'women', c: 'leggings', reg: 699, sell: 549, flags: { isBestseller: true }, colors: ['black', 'navy', 'maroon'], sizes: SIZES_ALPHA, sales: 300, day: 25 },
  { n: 'Wool Blend Winter Shawl Set', g: 'women', c: 'womens-winter', reg: 2990, sell: 2390, flags: { isWinter: true, isNewArrival: true, isTrending: true }, colors: ['sand', 'maroon', 'olive'], sizes: ['Free Size'], sales: 85, day: 2 },
  { n: 'Straight Leg Women’s Jeans', g: 'women', c: 'womens-jeans', reg: 1890, sell: 1590, flags: { isTrending: true }, colors: ['navy', 'black'], sizes: ['28', '30', '32', '34'], sales: 175, day: 14 },
];

const DAY_MS = 86_400_000;

export const products: Product[] = seeds.map((s, i) => ({
  id: `sample-${i + 1}`,
  slug: s.n
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, ''),
  sku: `VAY-SAMPLE-${String(i + 1).padStart(3, '0')}`,
  name: s.n,
  shortDescription: 'Sample product — replace with real catalogue data.',
  gender: s.g,
  categorySlug: s.c,
  regularPrice: s.reg,
  sellingPrice: s.sell,
  imageUrl: null,
  hoverImageUrl: null,
  colors: s.colors.map((k) => palette[k]),
  sizes: s.sizes,
  isFeatured: !!s.flags?.isFeatured,
  isBestseller: !!s.flags?.isBestseller,
  isNewArrival: !!s.flags?.isNewArrival,
  isTrending: !!s.flags?.isTrending,
  isWinter: !!s.flags?.isWinter,
  createdAt: new Date(Date.now() - s.day * DAY_MS).toISOString(),
  salesCount: s.sales,
}));

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
