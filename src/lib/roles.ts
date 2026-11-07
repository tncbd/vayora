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
  /** Route of the finished screen; absent while the screen is not built yet. */
  path?: string;
}

const SA: AppRole[] = ['super_admin'];
const ADM: AppRole[] = ['super_admin', 'admin'];
const CAT: AppRole[] = ['super_admin', 'admin', 'product_manager'];
const ORD: AppRole[] = ['super_admin', 'admin', 'order_manager'];
const PAY: AppRole[] = ['super_admin', 'admin', 'payment_manager'];

export const ADMIN_SECTIONS: readonly AdminSection[] = [
  { key: 'dashboard', label: 'Dashboard', roles: APP_ROLES, phase: 8, path: '/admin' },
  { key: 'products', label: 'Products', roles: CAT, phase: 4, path: '/admin/products' },
  { key: 'categories', label: 'Categories', roles: CAT, phase: 4, path: '/admin/categories' },
  { key: 'subcategories', label: 'Subcategories', roles: CAT, phase: 4, path: '/admin/categories' },
  { key: 'variants', label: 'Product Variants', roles: CAT, phase: 4, path: '/admin/products' },
  { key: 'inventory', label: 'Inventory', roles: CAT, phase: 4, path: '/admin/inventory' },
  { key: 'orders', label: 'Orders', roles: ORD, phase: 7, path: '/admin/orders' },
  { key: 'payment-verification', label: 'Payment Verification', roles: PAY, phase: 6, path: '/admin/payment-verification' },
  { key: 'customers', label: 'Customers', roles: ORD, phase: 8, path: '/admin/customers' },
  { key: 'delivery-zones', label: 'Delivery Zones', roles: ADM, phase: 6, path: '/admin/delivery-zones' },
  { key: 'coupons', label: 'Coupons', roles: ADM, phase: 5, path: '/admin/coupons' },
  { key: 'banners', label: 'Banners', roles: ADM, phase: 8, path: '/admin/banners' },
  { key: 'homepage-builder', label: 'Homepage Builder', roles: ADM, phase: 8, path: '/admin/homepage-builder' },
  { key: 'hero-slider', label: 'Hero Slider', roles: ADM, phase: 8, path: '/admin/hero-slider' },
  { key: 'reviews', label: 'Reviews', roles: ADM, phase: 8, path: '/admin/reviews' },
  { key: 'messages', label: 'Contact Messages', roles: ADM, phase: 8, path: '/admin/messages' },
  { key: 'newsletter', label: 'Newsletter', roles: ADM, phase: 8, path: '/admin/newsletter' },
  { key: 'website-pages', label: 'Website Pages', roles: ADM, phase: 8, path: '/admin/website-pages' },
  { key: 'navigation-menu', label: 'Navigation Menu', roles: ADM, phase: 8, path: '/admin/navigation-menu' },
  { key: 'payment-settings', label: 'Payment Settings', roles: PAY, phase: 6, path: '/admin/payment-settings' },
  { key: 'shipping-settings', label: 'Checkout & Advance Payment', roles: ADM, phase: 6, path: '/admin/shipping-settings' },
  { key: 'website-settings', label: 'Website Settings', roles: ADM, phase: 8, path: '/admin/website-settings' },
  { key: 'seo-settings', label: 'SEO Settings', roles: ADM, phase: 9, path: '/admin/seo-settings' },
  { key: 'admin-users', label: 'Admin Users', roles: SA, phase: 8, path: '/admin/admin-users' },
  { key: 'roles-permissions', label: 'Roles & Permissions', roles: SA, phase: 8, path: '/admin/roles-permissions' },
  { key: 'blog', label: 'Blog', roles: ADM, phase: 10, path: '/admin/blog' },
  { key: 'reports', label: 'Reports', roles: ADM, phase: 9, path: '/admin/reports' },
  { key: 'activity-logs', label: 'Activity Logs', roles: ADM, phase: 8, path: '/admin/activity-logs' },
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
