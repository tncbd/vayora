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

  it('renders the 404 page for unknown routes', () => {
    expect(render('/does-not-exist')).toContain('Page not found');
    expect(render('/category/not-a-real-category')).toContain('Page not found');
  });

  it('homepage shows fixed sections but no invented products or reviews', () => {
    const html = render('/');
    for (const text of ['Join the VAYORA List', 'Women&#x27;s Collection', 'Men&#x27;s Collection']) expect(html).toContain(text);
    // product rails and testimonials only appear once real data exists
    for (const text of ['Best Sellers', 'Trending Products', 'Featured Products', 'What Our Customers Say', 'Sample Customer', 'Embroidered Cotton Panjabi']) {
      expect(html).not.toContain(text);
    }
  });

  it('search page renders its heading and never invents results', () => {
    const html = render('/search?q=panjabi');
    expect(html).toContain('Results for');
    expect(html).not.toContain('Embroidered Cotton Panjabi');
  });

  it('cart, checkout and confirmation render honestly without a backend or an order', () => {
    expect(render('/cart')).toContain('Your cart is empty');
    expect(render('/checkout')).toContain('Your cart is empty');
    const c = render('/order-confirmation');
    expect(c).toContain('no recent order');
    expect(c).not.toContain('Thank you for your order');
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
