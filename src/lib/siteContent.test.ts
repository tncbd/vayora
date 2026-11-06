import { describe, expect, it } from 'vitest';
import { DEFAULT_HOME, DEFAULT_SETTINGS, buildHomeLayout, buildMenu, mapSettings, parseContent, parseFaq, safeLink, safeUrl } from './siteContent';

describe('mapSettings', () => {
  it('falls back to defaults and leaves contact details empty', () => {
    const s = mapSettings([]);
    expect(s.storeName).toBe(DEFAULT_SETTINGS.storeName);
    expect(s.phone).toBe('');
    expect(s.email).toBe('');
  });
  it('maps database keys', () => {
    const s = mapSettings([
      { key: 'contact_phone', value: ' 01712345678 ' }, { key: 'whatsapp_number', value: '+880 1712-345678' },
      { key: 'announcement_text', value: 'Eid sale' }, { key: 'facebook_url', value: 'https://facebook.com/vayora' },
    ]);
    expect(s.phone).toBe('01712345678');
    expect(s.whatsapp).toBe('8801712345678');
    expect(s.announcement).toBe('Eid sale');
    expect(s.facebookUrl).toBe('https://facebook.com/vayora');
  });
  it('hides the announcement when switched off', () => {
    expect(mapSettings([{ key: 'announcement_enabled', value: false }, { key: 'announcement_text', value: 'x' }]).announcement).toBe('');
  });
  it('ignores wrong types and unsafe social URLs', () => {
    const s = mapSettings([{ key: 'contact_phone', value: 5 }, { key: 'instagram_url', value: 'javascript:alert(1)' }, { key: 'youtube_url', value: 'not a url' }]);
    expect(s.phone).toBe('');
    expect(s.instagramUrl).toBe('');
    expect(s.youtubeUrl).toBe('');
  });
});

describe('links', () => {
  it('accepts site paths and http(s) only', () => {
    expect(safeLink('/shop')).toBe('/shop');
    expect(safeLink('https://example.com/a')).toBe('https://example.com/a');
    for (const bad of ['javascript:alert(1)', '//evil.com', '/\\evil.com', 'data:text/html,x', '', null, 5]) expect(safeLink(bad)).toBe('/');
    expect(safeUrl('ftp://x.com')).toBe('');
  });
});

describe('buildHomeLayout', () => {
  it('uses the default layout when there are no rows', () => {
    expect(buildHomeLayout(null)).toBe(DEFAULT_HOME);
    expect(buildHomeLayout([])).toBe(DEFAULT_HOME);
  });
  it('orders by sort_order, drops disabled and unknown sections, keeps titles', () => {
    const out = buildHomeLayout([
      { key: 'reviews', sort_order: 3, is_enabled: true, title: 'Loved' },
      { key: 'hero', sort_order: 1, is_enabled: true },
      { key: 'winter', sort_order: 2, is_enabled: false },
      { key: 'made_up', sort_order: 0, is_enabled: true },
    ]);
    expect(out.map((s) => s.key)).toEqual(['hero', 'reviews']);
    expect(out[1].title).toBe('Loved');
  });
});

describe('buildMenu', () => {
  it('nests children, sorts, hides inactive and sanitises links', () => {
    const m = buildMenu([
      { id: '1', parent_id: null, label: 'Shop', url: '/shop', sort_order: 2, is_active: true },
      { id: '2', parent_id: null, label: 'Home', url: 'javascript:x', sort_order: 1, is_active: true },
      { id: '3', parent_id: '1', label: 'Women', url: '/women', sort_order: 1, is_active: true },
      { id: '4', parent_id: '1', label: 'Hidden', url: '/x', sort_order: 2, is_active: false },
    ]);
    expect(m.map((x) => x.label)).toEqual(['Home', 'Shop']);
    expect(m[0].to).toBe('/');
    expect(m[1].children).toEqual([{ label: 'Women', to: '/women' }]);
  });
});

describe('parseContent', () => {
  it('builds headings and paragraphs and never interprets HTML', () => {
    const b = parseContent('Intro line\nsecond line\n\n## Our promise\nWe care.\n\n<script>alert(1)</script>');
    expect(b[0]).toEqual({ type: 'p', text: 'Intro line\nsecond line' });
    expect(b[1]).toEqual({ type: 'h2', text: 'Our promise' });
    expect(b[2]).toEqual({ type: 'p', text: 'We care.' });
    expect(b[3].text).toBe('<script>alert(1)</script>'); // shown as text by React, not run
  });
  it('handles empty input', () => expect(parseContent('  \n\n ')).toEqual([]));
});

describe('parseFaq', () => {
  it('splits question and answer', () => {
    expect(parseFaq('Q: Do you deliver?\nA: Yes, everywhere.\n\nHow long?\n3 days')).toEqual([
      { q: 'Do you deliver?', a: 'Yes, everywhere.' }, { q: 'How long?', a: '3 days' },
    ]);
  });
});
