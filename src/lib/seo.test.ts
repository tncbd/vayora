import { describe, expect, it } from 'vitest';
import { absoluteUrl, breadcrumbJsonLd, canonicalUrl, clip, isGaId, isPrivatePath, productJsonLd, safeJsonLd } from './seo';
import { mapSettings } from './siteContent';
import type { ProductDetail } from '@/types';

const product = {
  id: '1', slug: 'cotton-tee', sku: 'TEE-1', name: 'Cotton Tee', shortDescription: 'Soft tee', description: 'Long text', regularPrice: 900, sellingPrice: 700,
  seoTitle: null, seoDescription: null, images: [{ id: 'i', url: 'https://cdn.x/a.jpg', alt: '', sortOrder: 0, isMain: true }],
  variants: [{ id: 'v1', price: null, inStock: false, availableQty: 0 }, { id: 'v2', price: 650, inStock: true, availableQty: 4 }],
} as unknown as ProductDetail;

describe('seo helpers', () => {
  it('builds clean canonical urls', () => {
    expect(canonicalUrl('https://vayora.pages.dev/', '/shop/')).toBe('https://vayora.pages.dev/shop');
    expect(canonicalUrl('https://vayora.pages.dev', '/')).toBe('https://vayora.pages.dev/');
  });
  it('marks private pages noindex', () => {
    for (const p of ['/admin', '/admin/orders', '/cart', '/checkout', '/account/orders', '/track-order', '/login', '/search']) expect(isPrivatePath(p), p).toBe(true);
    for (const p of ['/', '/shop', '/product/x', '/about', '/category/saree', '/accounting']) expect(isPrivatePath(p), p).toBe(false);
  });
  it('clips on a word boundary', () => {
    expect(clip('a '.repeat(200), 20).length).toBeLessThanOrEqual(20);
    expect(clip('  short   text ')).toBe('short text');
    expect(clip(null)).toBe('');
  });
  it('only makes absolute urls from http(s) or paths', () => {
    expect(absoluteUrl('https://s', '/a.jpg')).toBe('https://s/a.jpg');
    expect(absoluteUrl('https://s', 'javascript:alert(1)')).toBe('');
    expect(absoluteUrl('https://s', 'https://c/x.png')).toBe('https://c/x.png');
  });
  it('product JSON-LD uses the lowest price, BDT and real stock', () => {
    const j = productJsonLd(product, 'https://s', 'VAYORA') as { offers: { price: string; priceCurrency: string; availability: string; url: string } };
    expect(j.offers.price).toBe('650.00');
    expect(j.offers.priceCurrency).toBe('BDT');
    expect(j.offers.availability).toMatch(/InStock/);
    expect(j.offers.url).toBe('https://s/product/cotton-tee');
    expect(productJsonLd({ ...product, variants: [] }, 'https://s', 'V')).toMatchObject({ offers: { availability: 'https://schema.org/OutOfStock' } });
  });
  it('breadcrumbs are numbered', () => {
    expect(breadcrumbJsonLd('https://s', [{ name: 'Home', path: '/' }, { name: 'Shop', path: '/shop' }])).toMatchObject({ itemListElement: [{ position: 1 }, { position: 2, item: 'https://s/shop' }] });
  });
  it('JSON-LD can never close the script tag', () => {
    expect(safeJsonLd({ name: '</script><script>alert(1)</script>' })).not.toContain('<');
  });
  it('validates GA ids and settings mapping drops bad ones', () => {
    expect(isGaId('G-ABC123XYZ')).toBe(true);
    expect(isGaId('UA-12345-1')).toBe(false);
    const bad = mapSettings([{ key: 'ga_measurement_id', value: 'evil"><script>' }, { key: 'google_site_verification', value: '<x>' }, { key: 'seo_og_image_url', value: 'javascript:1' }]);
    expect([bad.gaId, bad.verification, bad.ogImage]).toEqual(['', '', '']);
    const ok = mapSettings([{ key: 'ga_measurement_id', value: 'G-ABC123XYZ' }]);
    expect(ok.gaId).toBe('G-ABC123XYZ');
  });
});
