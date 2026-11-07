// Edge Function: place-order
// The ONLY way an order is created. The browser sends what the customer chose (variant ids,
// quantities, delivery details, coupon code); prices, stock, coupon rules and delivery charge are
// all decided inside the database by public.place_order(), never taken from the request.
//
// Secrets: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided to Edge Functions automatically.
// Optional secret ALLOWED_ORIGINS (comma separated, e.g. https://vayora.example,http://localhost:5173).
// Optional secrets for order confirmation emails (nothing is sent unless both are set):
//   RESEND_API_KEY, EMAIL_FROM (e.g. "VAYORA FASHION <orders@yourdomain.com>"); also SITE_URL and STORE_NAME if you want to override.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { sendOrderEmail } from './email.ts';

const allowed = (Deno.env.get('ALLOWED_ORIGINS') ?? 'http://localhost:5173').split(',').map((s) => s.trim()).filter(Boolean);

function corsHeaders(origin: string | null): Record<string, string> {
  const h: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
  if (origin && allowed.includes(origin)) h['Access-Control-Allow-Origin'] = origin;
  return h;
}

const json = (status: number, body: unknown, origin: string | null) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } });

// Best-effort abuse brake (per function instance): 8 orders per IP per 10 minutes.
const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 600_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > 8;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed.' }, origin);

  const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
  if (limited(ip)) return json(429, { error: 'Too many orders from this connection. Please wait a few minutes.' }, origin);

  const raw = await req.text();
  if (raw.length > 20_000) return json(413, { error: 'Request too large.' }, origin);
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { error: 'Invalid request.' }, origin);
  }
  const { customer, items, coupon, expected_total, idempotency_key } = body ?? {};
  if (!customer || typeof customer !== 'object' || !Array.isArray(items)) return json(400, { error: 'Invalid request.' }, origin);
  if (coupon !== null && coupon !== undefined && (typeof coupon !== 'string' || coupon.length > 40)) return json(400, { error: 'Invalid request.' }, origin);
  if (expected_total !== null && expected_total !== undefined && typeof expected_total !== 'number') return json(400, { error: 'Invalid request.' }, origin);
  if (idempotency_key !== null && idempotency_key !== undefined && typeof idempotency_key !== 'string') return json(400, { error: 'Invalid request.' }, origin);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Signed-in customer? The browser sends its session token; the anon key alone means "guest".
  let userId: string | null = null;
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (token) {
    const { data } = await admin.auth.getUser(token);
    userId = data?.user?.id ?? null;
  }

  const { data, error } = await admin.rpc('place_order', {
    p_user_id: userId,
    p_customer: customer,
    p_items: items,
    p_coupon: (coupon as string | null) ?? null,
    p_expected_total: (expected_total as number | null) ?? null,
    p_idempotency_key: (idempotency_key as string | null) ?? null,
  });

  if (error) {
    // P0001 = a rule we raised on purpose with a customer-safe message; anything else is hidden.
    if (error.code === 'P0001') return json(422, { error: error.message }, origin);
    console.error('place_order failed', error.code, error.message);
    return json(500, { error: 'We could not place your order. Please try again.' }, origin);
  }

  // Confirmation email: optional, best effort, never delays or breaks the order.
  const order = data as { duplicate?: boolean; order_number: string; total: number; advance_amount: number; cod_amount: number };
  if (!order.duplicate) {
    const task = sendOrderEmail(
      { apiKey: Deno.env.get('RESEND_API_KEY'), from: Deno.env.get('EMAIL_FROM') },
      (customer as Record<string, unknown>).email,
      {
        storeName: Deno.env.get('STORE_NAME') ?? 'VAYORA FASHION',
        siteUrl: Deno.env.get('SITE_URL') ?? allowed[0],
        customerName: String((customer as Record<string, unknown>).name ?? ''),
        orderNumber: order.order_number, total: Number(order.total), advanceAmount: Number(order.advance_amount), codAmount: Number(order.cod_amount),
      },
    );
    // keep the function alive until the email is handed over, without making the customer wait
    (globalThis as unknown as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime?.waitUntil?.(task);
  }
  return json(200, data, origin);
});
