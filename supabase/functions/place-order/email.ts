// Order confirmation email through Resend (https://resend.com). Completely optional: with no RESEND_API_KEY
// secret nothing is sent and checkout behaves exactly as before. Pure and fetch-injectable so it is unit-tested.

export interface OrderEmailInput {
  storeName: string;
  siteUrl: string;
  customerName: string;
  orderNumber: string;
  total: number;
  advanceAmount: number;
  codAmount: number;
}

export const validEmail = (v: unknown): v is string =>
  typeof v === 'string' && v.length <= 254 && /^[^@\s<>"',;]+@[^@\s<>"',;]+\.[^@\s<>"',;]+$/.test(v.trim());

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const bdt = (n: number) => `৳${Math.round(n).toLocaleString('en-US')}`;
const firstName = (n: string) => n.trim().split(/\s+/)[0]?.slice(0, 40) || 'there';

export function buildOrderEmail(i: OrderEmailInput): { subject: string; html: string; text: string } {
  const track = `${i.siteUrl.replace(/\/+$/, '')}/track-order`;
  const advance = i.advanceAmount > 0;
  const lines = [
    `Order number: ${i.orderNumber}`,
    `Order total: ${bdt(i.total)}`,
    advance ? `Pay now (delivery charge, by bKash/Nagad/Upay): ${bdt(i.advanceAmount)}` : '',
    `Pay on delivery: ${bdt(i.codAmount)}`,
  ].filter(Boolean);
  const next = advance
    ? 'Please send the delivery charge and submit your Transaction ID on the order page so we can confirm your order.'
    : 'We will review your order and contact you if anything is needed.';
  const text = `Hi ${firstName(i.customerName)},\n\nThank you for your order at ${i.storeName}.\n\n${lines.join('\n')}\n\n${next}\n\nTrack your order with your order number and phone number: ${track}\n`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#171717">
<h2 style="font-weight:500">Thank you, ${esc(firstName(i.customerName))}</h2>
<p>Your order at ${esc(i.storeName)} has been received.</p>
<table style="border-collapse:collapse;width:100%">${lines.map((l) => { const [k, ...v] = l.split(': '); return `<tr><td style="padding:6px 0;color:#666">${esc(k)}</td><td style="padding:6px 0;text-align:right"><b>${esc(v.join(': '))}</b></td></tr>`; }).join('')}</table>
<p>${esc(next)}</p>
<p><a href="${esc(track)}" style="color:#8a6d3b">Track your order</a> (you will need your order number and the phone number you used).</p>
</div>`;
  return { subject: `Your ${i.storeName} order ${i.orderNumber}`, html, text };
}

export interface Mail { subject: string; html: string; text: string }

/** Returns true if Resend accepted the message. Never throws, never logs the address or the key. */
export async function sendEmail(cfg: { apiKey?: string; from?: string }, to: unknown, m: Mail, doFetch: typeof fetch = fetch): Promise<boolean> {
  if (!cfg.apiKey || !cfg.from || !validEmail(to)) return false;
  try {
    const res = await doFetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: cfg.from, to: [to.trim()], subject: m.subject, html: m.html, text: m.text }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error('email not accepted, status', res.status);
    return res.ok;
  } catch {
    console.error('email failed');
    return false;
  }
}

export const sendOrderEmail = (cfg: { apiKey?: string; from?: string }, to: unknown, input: OrderEmailInput, doFetch: typeof fetch = fetch) =>
  sendEmail(cfg, to, buildOrderEmail(input), doFetch);

export interface StatusEmailInput {
  storeName: string; siteUrl: string; customerName: string; orderNumber: string; status: string;
  courier?: string | null; trackingNumber?: string | null; codAmount: number;
}
const STATUS_TEXT: Record<string, { subject: string; line: string }> = {
  confirmed: { subject: 'confirmed', line: 'Your order has been confirmed and will be prepared soon.' },
  shipped: { subject: 'has shipped', line: 'Your order has been handed to the courier.' },
  out_for_delivery: { subject: 'is out for delivery', line: 'Your order is out for delivery. Please keep your phone nearby.' },
  delivered: { subject: 'was delivered', line: 'Your order has been delivered. We hope you love it.' },
  cancelled: { subject: 'was cancelled', line: 'Your order has been cancelled. If you did not expect this, please contact us.' },
};
export const emailableStatus = (s: string) => Object.prototype.hasOwnProperty.call(STATUS_TEXT, s);

export function buildStatusEmail(i: StatusEmailInput): Mail {
  const t = STATUS_TEXT[i.status] ?? { subject: 'was updated', line: 'Your order status was updated.' };
  const courier = [i.courier?.trim() && `Courier: ${i.courier.trim()}`, i.trackingNumber?.trim() && `Tracking number: ${i.trackingNumber.trim()}`].filter(Boolean) as string[];
  const cod = i.status === 'shipped' || i.status === 'out_for_delivery' ? `Please keep ${bdt(i.codAmount)} ready to pay on delivery.` : '';
  const track = `${i.siteUrl.replace(/\/+$/, '')}/track-order`;
  const text = `Hi ${firstName(i.customerName)},\n\n${i.storeName} order ${i.orderNumber} ${t.subject}.\n${t.line}\n${courier.length ? `\n${courier.join('\n')}\n` : ''}${cod ? `\n${cod}\n` : ''}\nTrack your order: ${track}\n`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#171717">
<h2 style="font-weight:500">Order ${esc(i.orderNumber)} ${esc(t.subject)}</h2>
<p>Hi ${esc(firstName(i.customerName))}, ${esc(t.line)}</p>
${courier.map((c) => `<p style="margin:4px 0"><b>${esc(c)}</b></p>`).join('')}${cod ? `<p>${esc(cod)}</p>` : ''}
<p><a href="${esc(track)}" style="color:#8a6d3b">Track your order</a></p>
</div>`;
  return { subject: `Your ${i.storeName} order ${i.orderNumber} ${t.subject}`, html, text };
}
