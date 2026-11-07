import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const root = join(__dirname, '..');
const ALICE = '00000000-0000-0000-0000-0000000000a1';
let db: PGlite;
const ids: Record<string, string> = {};

async function role(r: 'anon' | 'authenticated' | 'service_role' | 'owner', uid?: string) {
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [JSON.stringify(uid ? { sub: uid, role: r } : { role: r })]);
  if (r !== 'owner') await db.exec(`set role ${r}`);
}
const rows = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows;

async function variant(slug: string, price: number, size: string, qty: number, o: { status?: string; active?: boolean; vprice?: number } = {}) {
  const p = await rows<{ id: string }>(
    `insert into public.products (slug, sku, name, regular_price, selling_price, status) values ($1,$2,$3,$4,$4,$5) returning id`,
    [slug, 'SKU-' + slug, slug, price, o.status ?? 'active'],
  );
  const v = await rows<{ id: string }>(
    `insert into public.product_variants (product_id, sku, size, color, price, is_active) values ($1,$2,$3,'Black',$4,$5) returning id`,
    [p[0].id, slug + '-' + size, size, o.vprice ?? null, o.active ?? true],
  );
  await db.query(`update public.inventory set quantity = $2 where variant_id = $1`, [v[0].id, qty]);
  ids[slug] = v[0].id;
}
const item = (slug: string, quantity: number) => ({ variant_id: ids[slug], quantity });
const quote = async (items: unknown[], district: string | null = null, coupon: string | null = null, phone: string | null = null) =>
  (await rows<{ q: Record<string, any> }>(`select public.quote_order($1::jsonb, $2, $3, $4) as q`, [JSON.stringify(items), district, coupon, phone]))[0].q;

const customer = { name: 'Rahim Uddin', phone: '01712345678', district: 'Dhaka', area: 'Mirpur', address: 'House 1, Road 2, Mirpur 10' };
const place = async (items: unknown[], o: { coupon?: string | null; expected?: number | null; key?: string | null; user?: string | null; c?: Record<string, unknown> } = {}) =>
  (await rows<{ r: Record<string, any> }>(
    `select public.place_order($1::uuid, $2::jsonb, $3::jsonb, $4, $5::numeric, $6) as r`,
    [o.user ?? null, JSON.stringify({ ...customer, ...(o.c ?? {}) }), JSON.stringify(items), o.coupon ?? null, o.expected ?? null, o.key ?? null],
  ))[0].r;
const stock = async (slug: string) => (await rows<{ quantity: number; reserved: number }>(`select quantity, reserved from public.inventory where variant_id = $1`, [ids[slug]]))[0];

beforeAll(async () => {
  db = new PGlite();
  await db.exec(readFileSync(join(root, 'tests', 'supabase_stubs.sql'), 'utf8'));
  for (const f of readdirSync(join(root, 'migrations')).filter((x) => x.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(root, 'migrations', f), 'utf8'));
  }
  await db.query(`insert into auth.users (id, email) values ($1, 'alice@example.test')`, [ALICE]);
  await variant('tee', 500, 'M', 10);
  await variant('bulk', 500, 'M', 100);
  await variant('shirt', 1200, 'L', 3);
  await variant('lastone', 900, 'M', 1);
  await variant('draft', 100, 'M', 5, { status: 'draft' });
  await variant('inactive', 100, 'M', 5, { active: false });
  await variant('override', 700, 'M', 5, { vprice: 650 });
  // Inside Dhaka 60 (free over 3000), Outside Dhaka 120
  await db.exec(`update public.delivery_zones set charge = 60, free_delivery_threshold = 3000, is_active = true where name = 'Inside Dhaka';
                 update public.delivery_zones set charge = 120, is_active = true where name = 'Outside Dhaka'`);
  await db.exec(`insert into public.coupons (code, type, value, min_order_value, max_discount, usage_limit, per_customer_limit) values
    ('PCT10', 'percentage', 10, 0, 100, null, null),
    ('FIX50', 'fixed', 50, 1000, null, null, null),
    ('BIGFIX', 'fixed', 99999, 0, null, null, null),
    ('ONCE', 'fixed', 20, 0, null, 1, null),
    ('PERCUST', 'fixed', 20, 0, null, null, 1),
    ('EXPIRED', 'fixed', 20, 0, null, null, null),
    ('OFF', 'fixed', 20, 0, null, null, null),
    ('FUTURE', 'fixed', 20, 0, null, null, null)`);
  await db.exec(`update public.coupons set expires_at = now() - interval '1 day', starts_at = now() - interval '2 days' where code = 'EXPIRED';
                 update public.coupons set is_active = false where code = 'OFF';
                 update public.coupons set starts_at = now() + interval '1 day' where code = 'FUTURE'`);
});
afterAll(async () => { await db.close(); });

describe('quote_order: prices come from the database', () => {
  it('works for anonymous visitors and ignores client-supplied prices', async () => {
    await role('anon');
    const q = await quote([{ ...item('tee', 2), price: 1, unit_price: 1 }]);
    expect(q.ok).toBe(true);
    expect(q.subtotal).toBe(1000);
    expect(q.lines[0].unit_price).toBe(500);
  });
  it('uses a variant price override', async () => {
    await role('anon');
    expect((await quote([item('override', 2)])).subtotal).toBe(1300);
  });
  it('merges duplicate lines and caps quantity at 50', async () => {
    await role('anon');
    const q = await quote([item('tee', 4), item('tee', 3)]);
    expect(q.lines).toHaveLength(1);
    expect(q.lines[0].quantity).toBe(7);
  });
  it('flags unavailable, draft, inactive and insufficient items', async () => {
    await role('anon');
    expect((await quote([item('shirt', 5)])).lines[0].status).toBe('insufficient');
    expect((await quote([item('draft', 1)])).lines[0].status).toBe('unavailable');
    expect((await quote([item('inactive', 1)])).lines[0].status).toBe('unavailable');
    expect((await quote([{ variant_id: '11111111-1111-1111-1111-111111111111', quantity: 1 }])).ok).toBe(false);
    expect((await quote([item('shirt', 5)])).ok).toBe(false);
  });
  it('rejects malformed carts', async () => {
    await role('anon');
    for (const bad of [[], [{ variant_id: 'nope', quantity: 1 }], [{ variant_id: ids.tee, quantity: 0 }], [{ variant_id: ids.tee, quantity: 51 }], [{ variant_id: ids.tee, quantity: -3 }], [{ variant_id: ids.tee, quantity: 'x' }], ['str']]) {
      await expect(quote(bad as unknown[]), JSON.stringify(bad)).rejects.toThrow();
    }
  });
});

describe('delivery zones', () => {
  it('prices Dhaka and other districts separately, case-insensitively', async () => {
    await role('anon');
    expect((await quote([item('tee', 1)], 'Dhaka')).delivery_charge).toBe(60);
    expect((await quote([item('tee', 1)], 'dhaka')).delivery_charge).toBe(60);
    const o = await quote([item('tee', 1)], 'Sylhet');
    expect(o.delivery_charge).toBe(120);
    expect(o.total).toBe(620);
  });
  it('gives free delivery above the zone threshold (after discount)', async () => {
    await role('anon');
    const q = await quote([item('tee', 7)], 'Dhaka'); // 3500
    expect(q.delivery_charge).toBe(0);
    expect(q.free_delivery).toBe(true);
    const q2 = await quote([item('tee', 7)], 'Dhaka', 'PCT10'); // 3500 - 100 = 3400, still free
    expect(q2.free_delivery).toBe(true);
    const q3 = await quote([item('tee', 6), item('override', 1)], 'Dhaka'); // 3650
    expect(q3.free_delivery).toBe(true);
  });
  it('reports districts with no active zone', async () => {
    await role('owner');
    await db.exec(`update public.delivery_zones set is_active = false where name = 'Outside Dhaka'`);
    await role('anon');
    const q = await quote([item('tee', 1)], 'Sylhet');
    expect(q.delivery_error).toBeTruthy();
    expect(q.ok).toBe(false);
    await role('owner');
    await db.exec(`update public.delivery_zones set is_active = true where name = 'Outside Dhaka'`);
  });
});

describe('coupons', () => {
  it('percentage is capped by max_discount', async () => {
    await role('anon');
    const q = await quote([item('tee', 10)], null, 'pct10'); // 5000 -> 10% = 500, cap 100
    expect(q.discount_total).toBe(100);
    expect(q.coupon_code).toBe('PCT10');
    expect(q.total).toBe(4900);
  });
  it('fixed discount never exceeds the subtotal; total never negative', async () => {
    await role('anon');
    const q = await quote([item('tee', 1)], null, 'BIGFIX');
    expect(q.discount_total).toBe(500);
    expect(q.total).toBe(0);
  });
  it('enforces minimum order, expiry, start date, inactive and unknown codes with a generic message', async () => {
    await role('anon');
    expect((await quote([item('tee', 1)], null, 'FIX50')).coupon_error).toMatch(/minimum order/);
    for (const code of ['EXPIRED', 'OFF', 'FUTURE', 'NOPE']) {
      const q = await quote([item('tee', 1)], null, code);
      expect(q.coupon_error, code).toBe('This coupon is not valid.');
      expect(q.ok).toBe(false);
      expect(q.discount_total).toBe(0);
    }
  });
  it('coupon rows and ids are never readable by customers', async () => {
    await role('anon');
    await expect(rows(`select * from public.coupons`)).rejects.toThrow(/permission denied/); // visitors have no access at all
    await role('authenticated', ALICE);
    expect(await rows(`select * from public.coupons`)).toHaveLength(0);
    const q = await quote([item('tee', 1)], null, 'PCT10');
    expect(q).not.toHaveProperty('coupon_id');
  });
  it('cannot call internal or placement functions directly', async () => {
    for (const r of ['anon', 'authenticated'] as const) {
      await role(r, ALICE);
      await expect(rows(`select public._quote('[]'::jsonb, null, null, null, null)`)).rejects.toThrow(/permission denied/);
      await expect(rows(`select public.place_order(null, '{}'::jsonb, '[]'::jsonb, null)`)).rejects.toThrow(/permission denied/);
    }
  });
});

describe('place_order', () => {
  it('creates a consistent order, snapshots items, reserves stock and records history', async () => {
    await role('service_role');
    const before = await stock('tee');
    const r = await place([item('tee', 2), item('override', 1)], { user: ALICE, expected: 1650 + 60, c: { email: 'r@example.com', notes: 'Call first' } });
    expect(r.order_number).toMatch(/^VAY-\d{6}-\d{5}$/);
    expect(r.subtotal).toBe(1650);
    expect(r.delivery_charge).toBe(60);
    expect(r.total).toBe(1710);
    expect(r.cod_amount).toBe(1710);
    expect(r.advance_amount).toBe(0);
    expect(r.status).toBe('pending_order_review');
    expect((await stock('tee')).reserved).toBe(before.reserved + 2);
    await role('owner');
    const items = await rows<{ product_name: string; unit_price: string; quantity: number; line_total: string; sku: string }>(
      `select * from public.order_items where order_id = $1 order by product_name`, [r.order_id]);
    expect(items.map((i) => [i.product_name, Number(i.unit_price), i.quantity, Number(i.line_total)])).toEqual([['override', 650, 1, 650], ['tee', 500, 2, 1000]]);
    expect((await rows(`select * from public.order_status_history where order_id = $1`, [r.order_id]))).toHaveLength(1);
    expect((await rows<{ user_id: string }>(`select user_id from public.orders where id = $1`, [r.order_id]))[0].user_id).toBe(ALICE);
  });

  it('works for guests and returns a tracking token', async () => {
    await role('service_role');
    const r = await place([item('tee', 1)], { c: { district: 'Sylhet' } });
    expect(r.tracking_token).toMatch(/^[0-9a-f-]{36}$/);
    expect(r.delivery_charge).toBe(120);
  });

  it('applies coupons, records usage and counts it', async () => {
    await role('service_role');
    const r = await place([item('bulk', 10)], { coupon: 'pct10', c: { district: 'Dhaka' } });
    expect(r.discount_total).toBe(100);
    expect(r.total).toBe(4900);
    await role('owner');
    expect((await rows<{ used_count: number }>(`select used_count from public.coupons where code = 'PCT10'`))[0].used_count).toBe(1);
    expect(await rows(`select * from public.coupon_usages where order_id = $1`, [r.order_id])).toHaveLength(1);
  });

  it('enforces usage limits and per-customer limits', async () => {
    await role('service_role');
    await place([item('tee', 1)], { coupon: 'ONCE' });
    await expect(place([item('tee', 1)], { coupon: 'ONCE' })).rejects.toThrow(/not valid/);
    await place([item('tee', 1)], { coupon: 'PERCUST', c: { phone: '01911111111' } });
    await expect(place([item('tee', 1)], { coupon: 'PERCUST', c: { phone: '01911111111' } })).rejects.toThrow(/already used/);
    await place([item('tee', 1)], { coupon: 'PERCUST', c: { phone: '01922222222' } }); // another customer is fine
  });

  it('refuses a stale total and leaves no trace', async () => {
    await role('service_role');
    const before = await stock('tee');
    await expect(place([item('tee', 1)], { expected: 1 })).rejects.toThrow(/Prices changed/);
    expect(await stock('tee')).toEqual(before);
  });

  it('never oversells: the last unit goes to exactly one order, failures roll back', async () => {
    await role('service_role');
    await place([item('lastone', 1)]);
    await expect(place([item('tee', 1), item('lastone', 1)])).rejects.toThrow(/review your cart/);
    expect(await stock('lastone')).toEqual({ quantity: 1, reserved: 1 });
    const teeBefore = await stock('tee');
    await expect(place([item('tee', 1), item('lastone', 1)])).rejects.toThrow();
    expect(await stock('tee')).toEqual(teeBefore); // tee reservation rolled back with the failed order
  });

  it('is idempotent for the same key', async () => {
    await role('service_role');
    const key = '5f1c7a6e-0b0e-4c2a-9a39-3f9d1d0f7a11';
    const a = await place([item('tee', 1)], { key });
    const reserved = (await stock('tee')).reserved;
    const b = await place([item('tee', 1)], { key });
    expect(b.order_id).toBe(a.order_id);
    expect(b.duplicate).toBe(true);
    expect((await stock('tee')).reserved).toBe(reserved);
    await expect(place([item('tee', 1)], { key: 'not-a-uuid' })).rejects.toThrow();
  });

  it('rejects bad customer data, draft products and unserved districts', async () => {
    await role('service_role');
    await expect(place([item('tee', 1)], { c: { phone: '12345' } })).rejects.toThrow(/mobile/);
    await expect(place([item('tee', 1)], { c: { name: 'A' } })).rejects.toThrow(/name/);
    await expect(place([item('tee', 1)], { c: { address: 'x' } })).rejects.toThrow(/address/);
    await expect(place([item('tee', 1)], { c: { email: 'nope' } })).rejects.toThrow(/email/);
    await expect(place([item('draft', 1)])).rejects.toThrow(/no longer available/);
    await expect(place([])).rejects.toThrow();
  });

  it('honours the guest-checkout setting and requires an enabled payment method for advance orders', async () => {
    await role('owner');
    await db.exec(`update public.site_settings set value = 'false' where key = 'allow_guest_checkout'`);
    await role('service_role');
    await expect(place([item('tee', 1)])).rejects.toThrow(/sign in/);
    await place([item('tee', 1)], { user: ALICE });
    await role('owner');
    await db.exec(`update public.site_settings set value = 'true' where key = 'allow_guest_checkout'; update public.site_settings set value = 'true' where key = 'delivery_advance_required'`);
    await role('service_role');
    await expect(place([item('tee', 1)])).rejects.toThrow(/temporarily unavailable/);
    await role('owner');
    await db.exec(`update public.site_settings set value = 'false' where key = 'delivery_advance_required'`);
  });

  it('customers cannot read other customers orders or write orders directly', async () => {
    await role('anon');
    await expect(rows(`select * from public.orders`)).rejects.toThrow(/permission denied/); // visitors have no access at all
    await role('authenticated', ALICE);
    const mine = await rows<{ user_id: string }>(`select user_id from public.orders`);
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((o) => o.user_id === ALICE)).toBe(true);
    await expect(db.exec(`insert into public.orders (customer_name, phone, district, area, address, subtotal, total, cod_amount) values ('x','01712345678','Dhaka','a','address1',1,1,1)`)).rejects.toThrow();
  });
});
