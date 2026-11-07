import { describe, expect, it } from 'vitest';
import { STATIC_PATHS, blogEntries, buildSitemap, robotsTxt, slugOk } from './sitemap';

describe('sitemap', () => {
  it('lists pages with absolute urls, skips duplicates and bad paths', () => {
    const x = buildSitemap('https://s.example/', [...STATIC_PATHS, { path: '/product/a', lastmod: '2026-11-01T10:00:00Z' }, { path: '/product/a' }, { path: 'javascript:1' }]);
    expect(x).toContain('<loc>https://s.example/</loc>');
    expect(x).toContain('<loc>https://s.example/product/a</loc><lastmod>2026-11-01</lastmod>');
    expect(x.match(/\/product\/a</g)).toHaveLength(1);
    expect(x).not.toContain('javascript');
  });
  it('escapes xml characters', () => expect(buildSitemap('https://s', [{ path: '/a&b' }])).toContain('/a&amp;b'));
  it('only accepts safe slugs', () => {
    expect(slugOk('cotton-tee')).toBe(true);
    for (const b of ['A', 'a b', '../x', '', 'a--b', null]) expect(slugOk(b)).toBe(false);
  });
  it('robots hides private pages and points at the sitemap', () => {
    const r = robotsTxt('https://s.example/');
    for (const p of ['/admin', '/account', '/checkout', '/cart']) expect(r).toContain(`Disallow: ${p}`);
    expect(r).toContain('Sitemap: https://s.example/sitemap.xml');
  });
  it('lists blog posts only when there are some, with safe slugs', () => {
    expect(blogEntries([])).toEqual([]);
    expect(blogEntries([{ slug: 'bad slug' }])).toEqual([]);
    const e = blogEntries([{ slug: 'eid-guide', published_at: '2026-11-01T00:00:00Z' }, { slug: '../x' }]);
    expect(e.map((x) => x.path)).toEqual(['/blog', '/blog/eid-guide']);
  });
});
