import { describe, expect, it } from 'vitest';
import { ADMIN_SECTIONS, canAccess, resolveGuard, safeRedirect, sectionsFor } from './roles';

describe('role -> section access', () => {
  it('lists all 27 admin sidebar sections from the brief', () => {
    expect(ADMIN_SECTIONS).toHaveLength(27);
  });

  it('super admin sees everything', () => {
    expect(sectionsFor(['super_admin'])).toHaveLength(27);
  });

  it('only super admin manages admin users and roles', () => {
    for (const r of ['admin', 'order_manager', 'product_manager', 'payment_manager'] as const) {
      expect(canAccess([r], 'admin-users'), r).toBe(false);
      expect(canAccess([r], 'roles-permissions'), r).toBe(false);
    }
    expect(canAccess(['super_admin'], 'admin-users')).toBe(true);
  });

  it('scopes managers to their own area', () => {
    expect(canAccess(['product_manager'], 'products')).toBe(true);
    expect(canAccess(['product_manager'], 'orders')).toBe(false);
    expect(canAccess(['order_manager'], 'orders')).toBe(true);
    expect(canAccess(['order_manager'], 'payment-verification')).toBe(false);
    expect(canAccess(['payment_manager'], 'payment-verification')).toBe(true);
    expect(canAccess(['payment_manager'], 'products')).toBe(false);
  });

  it('customers (no roles) see no admin sections', () => {
    expect(sectionsFor([])).toHaveLength(0);
    expect(canAccess([], 'dashboard')).toBe(false);
  });
});

describe('resolveGuard', () => {
  it('waits while loading', () => {
    expect(resolveGuard({ loading: true, signedIn: false, roles: [] })).toBe('loading');
  });
  it('sends signed-out visitors to login', () => {
    expect(resolveGuard({ loading: false, signedIn: false, roles: [], requireStaff: true })).toBe('login');
  });
  it('lets signed-in customers into the account area but not admin', () => {
    expect(resolveGuard({ loading: false, signedIn: true, roles: [] })).toBe('allow');
    expect(resolveGuard({ loading: false, signedIn: true, roles: [], requireStaff: true })).toBe('forbidden');
  });
  it('lets staff into admin', () => {
    expect(resolveGuard({ loading: false, signedIn: true, roles: ['order_manager'], requireStaff: true })).toBe('allow');
  });
});

describe('safeRedirect', () => {
  it('allows internal paths', () => {
    expect(safeRedirect('/account/orders')).toBe('/account/orders');
    expect(safeRedirect('/admin?x=1')).toBe('/admin?x=1');
  });
  it.each(['//evil.com', 'https://evil.com', '/\\evil.com', 'javascript:alert(1)', '', undefined, 42, '/a\nb'])(
    'blocks %s',
    (v) => expect(safeRedirect(v)).toBe('/account'),
  );
});

describe('implemented sections', () => {
  it('only link finished screens, and every linked path is covered by the same role rules', () => {
    const linked = ADMIN_SECTIONS.filter((s) => s.path);
    expect(linked.map((s) => s.key).sort()).toEqual(['categories', 'inventory', 'products', 'subcategories', 'variants']);
    for (const s of linked) expect(s.path).toMatch(/^\/admin\/[a-z-]+$/);
  });
});
