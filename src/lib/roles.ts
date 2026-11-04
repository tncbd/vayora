/**
 * Role -> admin section map. This only decides what the admin UI SHOWS.
 * The real enforcement is in the database (RLS policies and SECURITY DEFINER
 * functions in supabase/migrations/), which does not trust the browser.
 */
export const APP_ROLES = ['super_admin', 'admin', 'order_manager', 'product_manager', 'payment_manager'] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  order_manager: 'Order Manager',
  product_manager: 'Product Manager',
  payment_manager: 'Payment Manager',
};

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === 'string' && (APP_ROLES as readonly string[]).includes(value);
}

export interface AdminSection {
  key: string;
  label: string;
  roles: readonly AppRole[];
  phase: number; // phase in which the real screen is built
}

const SA: AppRole[] = ['super_admin'];
const ADM: AppRole[] = ['super_admin', 'admin'];
const CAT: AppRole[] = ['super_admin', 'admin', 'product_manager'];
const ORD: AppRole[] = ['super_admin', 'admin', 'order_manager'];
const PAY: AppRole[] = ['super_admin', 'admin', 'payment_manager'];

export const ADMIN_SECTIONS: readonly AdminSection[] = [
  { key: 'dashboard', label: 'Dashboard', roles: APP_ROLES, phase: 8 },
  { key: 'products', label: 'Products', roles: CAT, phase: 4 },
  { key: 'categories', label: 'Categories', roles: CAT, phase: 4 },
  { key: 'subcategories', label: 'Subcategories', roles: CAT, phase: 4 },
  { key: 'variants', label: 'Product Variants', roles: CAT, phase: 4 },
  { key: 'inventory', label: 'Inventory', roles: CAT, phase: 4 },
  { key: 'orders', label: 'Orders', roles: ORD, phase: 7 },
  { key: 'payment-verification', label: 'Payment Verification', roles: PAY, phase: 6 },
  { key: 'customers', label: 'Customers', roles: ORD, phase: 8 },
  { key: 'delivery-zones', label: 'Delivery Zones', roles: ADM, phase: 6 },
  { key: 'coupons', label: 'Coupons', roles: ADM, phase: 5 },
  { key: 'banners', label: 'Banners', roles: ADM, phase: 8 },
  { key: 'homepage-builder', label: 'Homepage Builder', roles: ADM, phase: 8 },
  { key: 'hero-slider', label: 'Hero Slider', roles: ADM, phase: 8 },
  { key: 'reviews', label: 'Reviews', roles: ADM, phase: 8 },
  { key: 'blog', label: 'Blog', roles: ADM, phase: 8 },
  { key: 'newsletter', label: 'Newsletter', roles: ADM, phase: 8 },
  { key: 'website-pages', label: 'Website Pages', roles: ADM, phase: 8 },
  { key: 'navigation-menu', label: 'Navigation Menu', roles: ADM, phase: 8 },
  { key: 'payment-settings', label: 'Payment Settings', roles: PAY, phase: 6 },
  { key: 'shipping-settings', label: 'Shipping Settings', roles: ADM, phase: 6 },
  { key: 'website-settings', label: 'Website Settings', roles: ADM, phase: 8 },
  { key: 'seo-settings', label: 'SEO Settings', roles: ADM, phase: 9 },
  { key: 'admin-users', label: 'Admin Users', roles: SA, phase: 8 },
  { key: 'roles-permissions', label: 'Roles & Permissions', roles: SA, phase: 8 },
  { key: 'reports', label: 'Reports', roles: ADM, phase: 9 },
  { key: 'activity-logs', label: 'Activity Logs', roles: ADM, phase: 8 },
];

export const isStaffRoles = (roles: readonly AppRole[]) => roles.length > 0;

export function sectionsFor(roles: readonly AppRole[]): AdminSection[] {
  return ADMIN_SECTIONS.filter((s) => s.roles.some((r) => roles.includes(r)));
}

export function canAccess(roles: readonly AppRole[], sectionKey: string): boolean {
  const s = ADMIN_SECTIONS.find((x) => x.key === sectionKey);
  return !!s && s.roles.some((r) => roles.includes(r));
}

// ---------- route guards ----------
export type GuardResult = 'loading' | 'login' | 'forbidden' | 'allow';

/** Pure decision function for protected routes (unit-tested). */
export function resolveGuard(opts: {
  loading: boolean;
  signedIn: boolean;
  roles: readonly AppRole[];
  requireStaff?: boolean;
}): GuardResult {
  if (opts.loading) return 'loading';
  if (!opts.signedIn) return 'login';
  if (opts.requireStaff && !isStaffRoles(opts.roles)) return 'forbidden';
  return 'allow';
}

/**
 * Only same-site absolute paths are allowed as post-login redirects
 * (blocks open redirects such as //evil.com or /\evil.com or https://evil.com).
 */
export function safeRedirect(path: unknown, fallback = '/account'): string {
  if (typeof path !== 'string') return fallback;
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return fallback;
  if (/[\u0000-\u001f]/.test(path)) return fallback;
  return path;
}
