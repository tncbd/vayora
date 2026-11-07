import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Security audit of the finished schema: if a future migration widens access, this file fails.
const root = join(__dirname, '..');
let db: PGlite;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const q = async <T = Record<string, any>>(sql: string, p: unknown[] = []) => (await db.query<T>(sql, p)).rows;

async function role(r: 'anon' | 'authenticated' | 'owner', headers?: string) {
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [JSON.stringify({ role: r })]);
  await db.query(`select set_config('request.headers', $1, false)`, [headers ?? '']);
  if (r !== 'owner') await db.exec(`set role ${r}`);
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(readFileSync(join(root, 'tests', 'supabase_stubs.sql'), 'utf8'));
  for (const f of readdirSync(join(root, 'migrations')).filter((x) => x.endsWith('.sql')).sort()) await db.exec(readFileSync(join(root, 'migrations', f), 'utf8'));
});
afterAll(async () => { await db.close(); });

describe('schema audit', () => {
  it('every public table has row-level security', async () => {
    const r = await q(`select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`);
    expect(r).toEqual([]);
  });

  it('every SECURITY DEFINER function pins its search_path', async () => {
    const r = await q(`select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and prosecdef
      and not exists (select 1 from unnest(coalesce(proconfig, '{}')) c where c like 'search_path=%')`);
    expect(r).toEqual([]);
  });

  it('anonymous visitors can run exactly this list of functions', async () => {
    const r = await q<{ proname: string }>(`select distinct proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.prokind = 'f' and has_function_privilege('anon', p.oid, 'execute') order by 1`);
    expect(r.map((x) => x.proname)).toEqual([
      'allowed_next_statuses', 'cancel_my_order', 'catalog_facets', 'get_payment_info', 'guest_can_upload_proof', 'has_any_role', 'is_staff', 'list_products',
      'quote_order', 'submit_contact_message', 'submit_payment', 'subscribe_newsletter', 'track_order',
    ]);
  });

  it('signed-in customers get no trigger or internal functions either', async () => {
    const r = await q<{ proname: string }>(`select distinct proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.prokind = 'f' and has_function_privilege('authenticated', p.oid, 'execute')
        and (p.prorettype = 'trigger'::regtype or proname like '\\_%' or proname in ('place_order', 'generate_order_number'))`);
    expect(r).toEqual([]);
  });

  it('anonymous visitors can read only public catalogue and content tables', async () => {
    const r = await q<{ table_name: string }>(`select distinct table_name from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public' and privilege_type = 'SELECT' order by 1`);
    expect(r.map((x) => x.table_name)).toEqual([
      'banners', 'blog_posts', 'categories', 'collections', 'delivery_zones', 'hero_slides', 'homepage_sections', 'menus', 'pages', 'payment_methods',
      'product_collections', 'product_images', 'product_variants', 'products', 'public_reviews', 'reviews', 'site_settings', 'storefront_products', 'variant_availability',
    ]);
    const writes = await q(`select distinct table_name from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public' and privilege_type in ('INSERT', 'UPDATE', 'DELETE')`);
    expect(writes).toEqual([]);
  });

  it('private tables are unreadable to visitors even when asked directly', async () => {
    await role('anon');
    for (const t of ['orders', 'order_items', 'payments', 'contact_messages', 'newsletter_subscribers', 'addresses', 'profiles', 'user_roles', 'coupons', 'inventory', 'admin_activity_logs', 'rate_limits']) {
      await expect(q(`select 1 from public.${t} limit 1`), t).rejects.toThrow(/permission denied/);
    }
  });

  it('only the owner-side functions can touch the throttle table', async () => {
    await role('authenticated');
    await expect(q(`select public._throttle('x', 1, 60)`)).rejects.toThrow(/permission denied/);
    await expect(q(`select * from public.rate_limits`)).rejects.toThrow(/permission denied/);
  });
});

describe('storage', () => {
  it('visitors cannot drop files into any bucket without a valid order token', async () => {
    await role('anon');
    for (const [bucket, name] of [['payment-proofs', 'guest/00000000-0000-4000-8000-000000000000/11111111-2222-4333-8444-555555555555.png'], ['payment-proofs', 'anything.png'], ['product-images', 'x.png'], ['banners', 'x.png']]) {
      await expect(q(`insert into storage.objects (bucket_id, name) values ($1, $2)`, [bucket, name]), `${bucket}/${name}`).rejects.toThrow(/row-level security/);
    }
  });
});

describe('throttling', () => {
  it('tracking: 10 tries per order number, then it blocks even a correct lookup', async () => {
    await role('anon', JSON.stringify({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }));
    for (let i = 0; i < 10; i++) expect((await q(`select public.track_order('VF-NOPE', '01712345678') r`))[0].r).toBeNull();
    await expect(q(`select public.track_order('VF-NOPE', '01712345678')`)).rejects.toThrow(/Too many attempts/);
  });
  it('tracking: one visitor is limited across order numbers', async () => {
    await role('anon', JSON.stringify({ 'x-forwarded-for': '198.51.100.9' }));
    for (let i = 0; i < 30; i++) expect((await q(`select public.track_order($1, '01712345678') r`, ['VF-A' + i]))[0].r).toBeNull();
    await expect(q(`select public.track_order('VF-A99', '01712345678')`)).rejects.toThrow(/Too many attempts/);
    // a different visitor is not affected
    await role('anon', JSON.stringify({ 'x-forwarded-for': '198.51.100.10' }));
    expect((await q(`select public.track_order('VF-B1', '01712345678') r`))[0].r).toBeNull();
  });
  it('coupon guessing is limited per visitor, plain quotes are not counted', async () => {
    await role('anon', JSON.stringify({ 'x-forwarded-for': '192.0.2.50' }));
    // a well-formed cart line for a variant that does not exist: the quote reports problems instead of raising, as in production
    const items = `'[{"variant_id":"00000000-0000-0000-0000-00000000dead","quantity":1}]'::jsonb`;
    for (let i = 0; i < 70; i++) await q(`select public.quote_order(${items}, 'Dhaka', null, null)`).catch(() => undefined);
    await q(`select public.quote_order(${items}, 'Dhaka', 'GUESS', null)`).catch((e) => { expect(String(e)).not.toMatch(/Too many/); });
    let blocked = false;
    for (let i = 0; i < 70 && !blocked; i++) blocked = await q(`select public.quote_order(${items}, 'Dhaka', 'GUESS${i}', null)`).then(() => false, (e) => /Too many/.test(String(e)));
    expect(blocked).toBe(true);
  });
  it('the window resets', async () => {
    await role('owner');
    await db.exec(`update public.rate_limits set window_start = now() - interval '11 minutes' where key like 'track:order:%'`);
    await role('anon', JSON.stringify({ 'x-forwarded-for': '203.0.113.99' }));
    expect((await q(`select public.track_order('VF-NOPE', '01712345678') r`))[0].r).toBeNull();
  });
});
