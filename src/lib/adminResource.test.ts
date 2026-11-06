import { describe, expect, it } from 'vitest';
import { isLink, toPayload, toValues, validate, validateImageFile, type FieldDef } from './adminResource';

const fields: FieldDef[] = [
  { name: 'slug', label: 'Slug', type: 'slug', required: true, fixed: true },
  { name: 'title', label: 'Title', type: 'text', required: true, max: 10 },
  { name: 'link', label: 'Link', type: 'link' },
  { name: 'sort_order', label: 'Order', type: 'number', min: 0, required: true },
  { name: 'starts_at', label: 'Starts', type: 'datetime' },
  { name: 'ends_at', label: 'Ends', type: 'datetime' },
  { name: 'kind', label: 'Kind', type: 'select', options: [{ value: 'a', label: 'A' }] },
  { name: 'is_active', label: 'Active', type: 'bool' },
];
const ok = { slug: 'about-us', title: 'About', link: '/shop', sort_order: '1', starts_at: '', ends_at: '', kind: '', is_active: true };

describe('validate', () => {
  it('accepts valid values', () => expect(validate(fields, ok)).toEqual({}));
  it('requires required fields and enforces length, number, slug, link, select', () => {
    const e = validate(fields, { ...ok, slug: 'Bad Slug', title: '', link: 'javascript:alert(1)', sort_order: '-1', kind: 'z' });
    expect(Object.keys(e).sort()).toEqual(['kind', 'link', 'slug', 'sort_order', 'title']);
    expect(validate(fields, { ...ok, title: 'x'.repeat(11) }).title).toMatch(/Maximum 10/);
    expect(validate(fields, { ...ok, sort_order: '1.5' }).sort_order).toMatch(/whole number/);
  });
  it('checks the date window', () => {
    expect(validate(fields, { ...ok, starts_at: '2026-12-02T10:00', ends_at: '2026-12-01T10:00' }).ends_at).toBeTruthy();
    expect(validate(fields, { ...ok, starts_at: '2026-12-01T10:00', ends_at: '2026-12-02T10:00' })).toEqual({});
  });
});

describe('isLink', () => {
  it('allows site paths and http(s) only', () => {
    for (const g of ['/shop', '/collections/winter', 'https://a.com/x', 'http://a.com']) expect(isLink(g)).toBe(true);
    for (const b of ['//evil.com', 'javascript:alert(1)', 'data:text/html,1', '/a b', '/\\x', 'ftp://x.com', 'shop']) expect(isLink(b)).toBe(false);
  });
});

describe('toPayload / toValues', () => {
  it('turns empty optional fields into null and numbers into numbers', () => {
    const p = toPayload(fields, ok, { creating: true });
    expect(p).toMatchObject({ slug: 'about-us', title: 'About', link: '/shop', sort_order: 1, starts_at: null, ends_at: null, kind: null, is_active: true });
  });
  it('never changes fixed fields on update', () => {
    expect(toPayload(fields, ok, { creating: false })).not.toHaveProperty('slug');
  });
  it('converts local date-times to ISO and back', () => {
    const p = toPayload(fields, { ...ok, starts_at: '2026-12-01T10:00' }, { creating: true });
    expect(typeof p.starts_at).toBe('string');
    expect(toValues(fields, { ...p, slug: 'x' }).starts_at).toBe('2026-12-01T10:00');
  });
  it('fills defaults for a new row', () => {
    expect(toValues(fields, null, { sort_order: 5, is_active: true })).toMatchObject({ sort_order: '5', is_active: true, title: '' });
  });
});

describe('validateImageFile', () => {
  it('limits type and size', () => {
    expect(validateImageFile({ type: 'image/png', size: 1000 })).toBeNull();
    expect(validateImageFile({ type: 'image/svg+xml', size: 1000 })).toMatch(/JPG/);
    expect(validateImageFile({ type: 'image/png', size: 6 * 1024 * 1024 })).toMatch(/smaller/);
    expect(validateImageFile({ type: 'image/png', size: 3 * 1024 * 1024 }, 2)).toMatch(/2 MB/);
  });
});
