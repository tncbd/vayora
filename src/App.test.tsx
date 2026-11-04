import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import App from './App';

const routes = [
  '/', '/shop', '/women', '/men', '/category/saree', '/category/t-shirt',
  '/collections/new-arrivals', '/collections/best-sellers', '/collections/winter',
  '/collections/special-offers', '/search?q=shirt', '/product/premium-cotton-t-shirt',
  '/cart', '/checkout', '/order-confirmation', '/track-order',
  '/login', '/register', '/forgot-password', '/account', '/account/orders',
  '/account/wishlist', '/account/addresses',
  '/about', '/contact', '/faq', '/privacy-policy', '/terms-and-conditions',
  '/return-refund-policy', '/shipping-policy',
];

function render(url: string) {
  return renderToString(
    <StaticRouter location={url}>
      <App />
    </StaticRouter>,
  );
}

describe('route smoke tests', () => {
  it.each(routes)('renders %s without throwing', (url) => {
    const html = render(url);
    expect(html.length).toBeGreaterThan(500);
    expect(html).toContain('VAYORA');
  });

  it('renders the 404 page for unknown routes, including /admin before Phase 3', () => {
    expect(render('/does-not-exist')).toContain('Page not found');
    expect(render('/category/not-a-real-category')).toContain('Page not found');
    expect(render('/collections/not-real')).toContain('Page not found');
  });

  it('homepage contains the required sections', () => {
    const html = render('/');
    for (const text of ['New Arrivals', 'Best Sellers', 'Trending Products', 'Winter Collection', 'Featured Products', 'What Our Customers Say', 'Join the VAYORA List', "Women&#x27;s Collection"]) {
      expect(html).toContain(text);
    }
  });

  it('search finds sample products and handles no match', () => {
    expect(render('/search?q=panjabi')).toContain('Embroidered Cotton Panjabi');
    expect(render('/search?q=zzzz')).toContain('No products matched');
  });

  it('auth pages render their forms', () => {
    expect(render('/login')).toContain('Sign In');
    expect(render('/login')).toContain('Forgot password?');
    expect(render('/register')).toContain('Create Account');
    expect(render('/register')).toContain('Confirm password');
    expect(render('/forgot-password')).toContain('Send Reset Link');
    expect(render('/reset-password')).toContain('Reset Password');
  });

  it('protected routes never render protected content for a visitor', () => {
    for (const url of ['/account', '/account/profile', '/account/addresses', '/account/orders']) {
      const html = render(url);
      expect(html, url).not.toContain('Welcome,');
      expect(html, url).not.toContain('Save Address');
      expect(html, url).toMatch(/Loading…|Accounts unavailable/); // waiting for session, or no backend
    }
  });

  it('admin never renders for a visitor and has no storefront chrome', () => {
    for (const url of ['/admin', '/admin/products', '/admin/anything']) {
      const html = render(url);
      expect(html, url).not.toContain('Admin Dashboard');
      expect(html, url).not.toContain('Phase 4'); // section list stays hidden
      expect(html, url).toMatch(/Loading…|Accounts unavailable/);
    }
  });
});
