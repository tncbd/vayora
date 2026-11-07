import { describe, expect, it, vi } from 'vitest';
import { buildOrderEmail, sendOrderEmail, validEmail, type OrderEmailInput } from './email';

const base: OrderEmailInput = { storeName: 'VAYORA FASHION', siteUrl: 'https://vayora.pages.dev/', customerName: 'Rahim <b>Uddin</b>', orderNumber: 'VAY-261107-0001', total: 2060, advanceAmount: 60, codAmount: 2000 };

describe('order email', () => {
  it('states the amounts and escapes the customer name', () => {
    const m = buildOrderEmail(base);
    expect(m.subject).toBe('Your VAYORA FASHION order VAY-261107-0001');
    expect(m.text).toContain('Pay on delivery: ৳2,000');
    expect(m.text).toContain('Pay now (delivery charge, by bKash/Nagad/Upay): ৳60');
    expect(m.html).not.toContain('<b>Uddin');
    expect(m.html).toContain('https://vayora.pages.dev/track-order');
    expect(m.html).not.toMatch(/token/i);
  });
  it('omits the advance line for plain cash on delivery', () => {
    const m = buildOrderEmail({ ...base, advanceAmount: 0, codAmount: 2060 });
    expect(m.text).not.toContain('Pay now');
    expect(m.text).toContain('Pay on delivery: ৳2,060');
  });
  it('validates addresses and rejects header-injection characters', () => {
    expect(validEmail('a@b.co')).toBe(true);
    for (const bad of ['a@b', 'a b@c.co', 'a@b.co\nBcc: x@y.co', '"x"@b.co', 'a@b.co,c@d.co', null, 123]) expect(validEmail(bad)).toBe(false);
  });
});

describe('sendOrderEmail', () => {
  const ok = () => Promise.resolve(new Response('{}', { status: 200 }));
  it('sends nothing without a key, sender or valid address', async () => {
    const f = vi.fn(ok);
    expect(await sendOrderEmail({}, 'a@b.co', base, f as unknown as typeof fetch)).toBe(false);
    expect(await sendOrderEmail({ apiKey: 'k', from: 'S <o@s.co>' }, 'nope', base, f as unknown as typeof fetch)).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });
  it('posts to Resend with the key in the header only', async () => {
    const f = vi.fn(ok);
    expect(await sendOrderEmail({ apiKey: 'secret-key', from: 'S <o@s.co>' }, ' a@b.co ', base, f as unknown as typeof fetch)).toBe(true);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer secret-key');
    expect(String(init.body)).not.toContain('secret-key');
    expect(JSON.parse(String(init.body)).to).toEqual(['a@b.co']);
  });
  it('never throws when the provider fails', async () => {
    expect(await sendOrderEmail({ apiKey: 'k', from: 'f' }, 'a@b.co', base, (() => Promise.reject(new Error('down'))) as unknown as typeof fetch)).toBe(false);
    expect(await sendOrderEmail({ apiKey: 'k', from: 'f' }, 'a@b.co', base, (() => Promise.resolve(new Response('x', { status: 403 }))) as unknown as typeof fetch)).toBe(false);
  });
});
