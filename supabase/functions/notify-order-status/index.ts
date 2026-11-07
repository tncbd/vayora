// Edge Function: notify-order-status
// Called by the admin panel right after staff change an order's status. Emails the customer (if they gave an
// email address and Resend is configured). Staff only; the status, address and tracking details are read from the
// database, never taken from the request, so nobody can use this to send arbitrary email.
//
// Secrets: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.
// Optional: ALLOWED_ORIGINS (shared with place-order), RESEND_API_KEY, EMAIL_FROM, SITE_URL, STORE_NAME.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { emailableStatus, sendEmail, buildStatusEmail } from '../place-order/email.ts';

const allowed = (Deno.env.get('ALLOWED_ORIGINS') ?? 'http://localhost:5173').split(',').map((s) => s.trim()).filter(Boolean);
const cors = (origin: string | null): Record<string, string> => {
  const h: Record<string, string> = { 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' };
  if (origin && allowed.includes(origin)) h['Access-Control-Allow-Origin'] = origin;
  return h;
};
const json = (status: number, body: unknown, origin: string | null) => new Response(JSON.stringify(body), { status, headers: { ...cors(origin), 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(origin) });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed.' }, origin);

  let orderId: unknown;
  try { orderId = (await req.json())?.order_id; } catch { return json(400, { error: 'Invalid request.' }, origin); }
  if (typeof orderId !== 'string' || !/^[0-9a-f-]{36}$/i.test(orderId)) return json(400, { error: 'Invalid request.' }, origin);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: u } = jwt ? await admin.auth.getUser(jwt) : { data: null };
  const uid = u?.user?.id;
  if (!uid) return json(401, { error: 'Sign in required.' }, origin);
  const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', uid);
  if (!(roles ?? []).some((r: { role: string }) => ['super_admin', 'admin', 'order_manager'].includes(r.role))) return json(403, { error: 'Not allowed.' }, origin);

  const { data: o } = await admin.from('orders').select('order_number, status, email, customer_name, courier_company, tracking_number, cod_amount').eq('id', orderId).maybeSingle();
  if (!o || !o.email || !emailableStatus(o.status)) return json(200, { sent: false }, origin);

  const sent = await sendEmail(
    { apiKey: Deno.env.get('RESEND_API_KEY'), from: Deno.env.get('EMAIL_FROM') },
    o.email,
    buildStatusEmail({
      storeName: Deno.env.get('STORE_NAME') ?? 'VAYORA FASHION', siteUrl: Deno.env.get('SITE_URL') ?? allowed[0],
      customerName: o.customer_name ?? '', orderNumber: o.order_number, status: o.status,
      courier: o.courier_company, trackingNumber: o.tracking_number, codAmount: Number(o.cod_amount ?? 0),
    }),
  );
  return json(200, { sent }, origin);
});
