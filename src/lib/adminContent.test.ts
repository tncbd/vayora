import { describe, expect, it } from 'vitest';
import { SETTING_DEFS, customersCsv, subscribersCsv, validateSettings, type SettingValues } from './adminContent';

const base = (): SettingValues => Object.fromEntries(SETTING_DEFS.map((d) => [d.key, d.kind === 'bool' ? true : ''])) as SettingValues;
const good = { ...base(), store_name: 'VAYORA FASHION' };

describe('validateSettings', () => {
  it('accepts empty optional values', () => expect(validateSettings(good)).toEqual({}));
  it('requires the store name', () => expect(validateSettings({ ...good, store_name: ' ' }).store_name).toBeTruthy());
  it('checks phone, whatsapp, email and links', () => {
    const e = validateSettings({ ...good, contact_phone: 'abc', whatsapp_number: '+880171234', contact_email: 'nope', facebook_url: 'javascript:alert(1)', instagram_url: '/relative', youtube_url: 'http://x' });
    expect(Object.keys(e).sort()).toEqual(['contact_email', 'contact_phone', 'facebook_url', 'instagram_url', 'whatsapp_number']);
  });
  it('accepts good values', () => {
    expect(validateSettings({ ...good, contact_phone: '+880 1712-345678', whatsapp_number: '8801712345678', contact_email: 'hi@shop.com', facebook_url: 'https://facebook.com/vayora' })).toEqual({});
  });
  it('checks analytics and search console codes', () => {
    expect(Object.keys(validateSettings({ ...good, ga_measurement_id: 'UA-1', google_site_verification: '<meta name=x>' })).sort()).toEqual(['ga_measurement_id', 'google_site_verification']);
    expect(validateSettings({ ...good, ga_measurement_id: 'G-ABC123XYZ', google_site_verification: 'abcDEF_123-xyzABC' })).toEqual({});
  });
  it('limits text length', () => expect(validateSettings({ ...good, announcement_text: 'x'.repeat(141) }).announcement_text).toMatch(/Maximum 140/));
});

describe('CSV exports', () => {
  it('neutralises spreadsheet formulas', () => {
    expect(subscribersCsv([{ email: '=HYPERLINK("http://evil")', created_at: '2026-11-07', is_active: true }])).toContain("'=HYPERLINK");
    expect(customersCsv([{ full_name: '+cmd|calc', email: 'a@b.co', phone: '', joined_at: '', orders_count: 1, total_spent: 10, last_order_at: null }])).toContain("'+cmd");
  });
});
