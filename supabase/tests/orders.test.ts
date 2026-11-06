import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { ORDER_STATUSES, nextStatuses } from '../../src/lib/orderStatus';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const root = join(__dirname, '..');
const ALICE = '00000000-0000-0000-0000-0000000000a1';
const BOB = '00000000-0000-0000-0000-0000000000b2';
const MGR = '00000000-0000-0000-0000-0000000000c3'; // order_manager
const PRODMGR = '00000000-0000-0000-0000-0000000000d4'; // product_manager
let db: PGlite;
let variantId: string;

async function role(r: 'anon' | 'authenticated' | 'service_role' | 'owner', uid?: string) {
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [JSON.stringify(uid ? { sub: uid, role: r } : { role: r })]);
  if (r !== 'owner') await db.exec(`set role ${r}`);
}
const rows = async <T = Record<string, any>>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows;
const stock = async () => (await rows<{ quantity: number; reserved: number }>(`select quantity, reserved from public.inventory where variant_id = $1`, [variantId]))[0];

const customer = { name: 'Rahim Uddin', phone: '01712345678', district: 'Dhaka', area: 'Mirpur', address: 'House 1, Road 2, Mirpur 10', email: 'secret@example.com' };
async function order(o: { user?: string | null; qty?: number; phone?: string } = {}) {
  await role('service_role');
  const r = (await rows<{ r: Record<string, any> }>(
    `select public.place_order($1::uuid, $2::jsonb, $3::jsonb, null) as r`,
    [o.user ?? null, JSON.stringify({ ...customer, phone: o.phone ?? customer.phone }), JSON.stringify([{ variant_id: variantId, quantity: o.qty ?? 2 }])],
  ))[0].r;
  return r;
}
async function setStatus(id: string, to: string, o: { note?: string | null; pub?: boolean; courier?: string | null; uid?: string } = {}) {
  await role('authenticated', o.uid ?? MGR);
  await db.query(`select public.set_order_status($1, $2::public.order_status, $3, $4, $5, $6)`, [id, to, o.note ?? null, o.pub ?? true, o.courier ?? null, null]);
}
const status = async (id: string) => { await role('owner'); return (await rows<{ status: string }>(`select status from public.orders where id = $1`, [id]))[0].status; };

beforeAll(async () => {
  db = new PGlite();
  await db.exec(readFileSync(join(root, 'tests', 'supabase_stubs.sql'), 'utf8'));
  for (const f of readdirSync(join(root, 'migrations')).filter((x) => x.endsWith('.sql')).sort()) await db.exec(readFileSync(join(root, 'migrations', f), 'utf8'));
  for (const [id, e] of [[ALICE, 'alice'], [BOB, 'bob'], [MGR, 'mgr'], [PRODMGR, 'pm']]) await db.query(`insert into auth.users (id, email) values ($1, $2)`, [id, e + '@example.test']);
  await db.exec(`insert into public.user_roles (user_id, role) values ('${MGR}', 'order_manager'), ('${PRODMGR}', 'product_manager')`);
  const p = await rows<{ id: string }>(`insert into public.products (slug, sku, name, regular_price, selling_price, status) values ('tee','SKU-tee','Tee',500,500,'active') returning id`);
  const v = await rows<{ id: string }>(`insert into public.product_variants (product_id, sku, size, color) values ($1,'tee-M','M','Black') returning id`, [p[0].id]);
  variantId = v[0].id;
  await db.query(`update public.inventory set quantity = 50 where variant_id = $1`, [variantId]);
  await db.exec(`update public.delivery_zones set charge = 60, is_active = true where name = 'Inside Dhaka'; update public.delivery_zones set charge = 120, is_active = true where name = 'Outside Dhaka'`);
});
afterAll(async () => { await db.close(); });

describe('status flow', () => {
  it('defines the allowed transitions', async () => {
    await role('anon');
    const next = async (s: string) => (await rows<{ n: string }>(`select public.allowed_next_statuses($1::public.order_status)::text as n`, [s]))[0].n;
    expect(await next('pending_order_review')).toBe('{confirmed,cancelled}');
    expect(await next('delivered')).toBe('{returned,refunded}');
    expect(await next('cancelled')).toBe('{}');
    expect(await next('refunded')).toBe('{}');
  });

  it('matches the transitions the admin screen offers (front end and database agree)', async () => {
    await role('anon');
    for (const st of ORDER_STATUSES) {
      const r = (await rows<{ n: string }>(`select array_to_string(public.allowed_next_statuses($1::public.order_status), ',') as n`, [st]))[0].n;
      expect(r.split(',').filter(Boolean), st).toEqual(nextStatuses(st));
    }
  });

  it('staff cannot change status with a direct UPDATE (stock would drift)', async () => {
    const o = await order();
    await role('authenticated', MGR);
    await expect(db.query(`update public.orders set status = 'shipped' where id = $1`, [o.order_id])).rejects.toThrow(/set_order_status/);
    // but non-status fields stay editable by staff (courier, notes)
    await db.query(`update public.orders set internal_notes = 'call before delivery' where id = $1`, [o.order_id]);
    expect(await status(o.order_id)).toBe('pending_order_review');
  });

  it('only order staff may call set_order_status', async () => {
    const o = await order();
    for (const uid of [ALICE, PRODMGR]) await expect(setStatus(o.order_id, 'confirmed', { uid })).rejects.toThrow(/Not authorised/);
    await role('anon');
    await expect(db.query(`select public.set_order_status($1, 'confirmed')`, [o.order_id])).rejects.toThrow(/permission denied/);
  });

  it('rejects invalid jumps, a cancel without reason and shipping without a courier', async () => {
    const o = await order();
    await expect(setStatus(o.order_id, 'delivered')).rejects.toThrow(/cannot be moved/);
    await expect(setStatus(o.order_id, 'cancelled')).rejects.toThrow(/reason/);
    await setStatus(o.order_id, 'confirmed');
    await setStatus(o.order_id, 'processing');
    await expect(setStatus(o.order_id, 'shipped')).rejects.toThrow(/courier/);
    expect(await status(o.order_id)).toBe('processing');
  });

  it('keeps stock in step: reserve -> sold on shipping -> restocked on return', async () => {
    await role('owner');
    const base = await stock();
    const o = await order({ qty: 3 });
    await role('owner');
    expect(await stock()).toEqual({ quantity: base.quantity, reserved: base.reserved + 3 });
    await setStatus(o.order_id, 'confirmed');
    await setStatus(o.order_id, 'processing');
    await setStatus(o.order_id, 'shipped', { courier: 'Pathao' });
    await role('owner');
    expect(await stock()).toEqual({ quantity: base.quantity - 3, reserved: base.reserved });
    await setStatus(o.order_id, 'out_for_delivery');
    await setStatus(o.order_id, 'delivered');
    await setStatus(o.order_id, 'returned', { note: 'Customer refused' });
    await role('owner');
    expect(await stock()).toEqual({ quantity: base.quantity, reserved: base.reserved });
    await setStatus(o.order_id, 'refunded');
    await expect(setStatus(o.order_id, 'delivered')).rejects.toThrow(/cannot be moved/);
    await role('owner');
    const log = await rows(`select * from public.admin_activity_logs where action = 'order.status' and entity_id = $1`, [o.order_id]);
    expect(log.length).toBe(7);
  });

  it('cancelling before shipping releases the reservation; after shipping it is impossible', async () => {
    await role('owner');
    const base = await stock();
    const o = await order({ qty: 4 });
    await setStatus(o.order_id, 'cancelled', { note: 'Out of fabric' });
    await role('owner');
    expect(await stock()).toEqual(base);
    expect(await status(o.order_id)).toBe('cancelled');
    const o2 = await order();
    await setStatus(o2.order_id, 'confirmed'); await setStatus(o2.order_id, 'processing'); await setStatus(o2.order_id, 'shipped', { courier: 'Steadfast' });
    await expect(setStatus(o2.order_id, 'cancelled', { note: 'x' })).rejects.toThrow(/cannot be moved/);
  });

  it('records notes and visibility on the history row', async () => {
    const o = await order();
    await setStatus(o.order_id, 'confirmed', { note: 'Called customer', pub: false });
    await setStatus(o.order_id, 'processing', { note: 'Packing now', pub: true });
    await role('owner');
    const h = await rows<{ to_status: string; note: string | null; is_public: boolean; changed_by: string | null }>(
      `select to_status, note, is_public, changed_by from public.order_status_history where order_id = $1 order by created_at, id`, [o.order_id]);
    expect(h.map((x) => [x.to_status, x.note, x.is_public])).toEqual([
      ['pending_order_review', null, true], ['confirmed', 'Called customer', false], ['processing', 'Packing now', true]]);
    expect(h[1].changed_by).toBe(MGR);
  });
});

describe('payment-pending orders', () => {
  it('cannot be cancelled by staff while a payment awaits verification', async () => {
    await role('owner');
    await db.exec(`update public.site_settings set value = 'true' where key = 'delivery_advance_required';
                   update public.payment_methods set is_enabled = true, merchant_number = '01800000000' where code = 'bkash'`);
    const o = await order({ user: ALICE });
    expect(o.status).toBe('pending_payment_verification');
    await role('authenticated', ALICE);
    await db.query(`select public.submit_payment($1, null, 'bkash', '01711111111', 'TXN123456')`, [o.order_id]);
    await expect(setStatus(o.order_id, 'cancelled', { note: 'x' })).rejects.toThrow(/waiting for verification/);
    await role('authenticated', ALICE);
    await expect(db.query(`select public.cancel_my_order($1)`, [o.order_id])).rejects.toThrow(/payment has been submitted/);
    await role('owner');
    await db.exec(`update public.site_settings set value = 'false' where key = 'delivery_advance_required'`);
  });
});

describe('cancel_my_order', () => {
  it('lets the signed-in owner cancel before confirmation and frees the stock', async () => {
    await role('owner');
    const base = await stock();
    const o = await order({ user: ALICE, qty: 2 });
    await role('authenticated', ALICE);
    await db.query(`select public.cancel_my_order($1)`, [o.order_id]);
    await role('owner');
    expect(await stock()).toEqual(base);
    expect(await status(o.order_id)).toBe('cancelled');
  });
  it('lets a guest cancel with the secret token only', async () => {
    const o = await order();
    await role('anon');
    await expect(db.query(`select public.cancel_my_order($1, $2)`, [o.order_id, '11111111-1111-1111-1111-111111111111'])).rejects.toThrow(/not found/);
    await expect(db.query(`select public.cancel_my_order($1)`, [o.order_id])).rejects.toThrow(/not found/);
    await db.query(`select public.cancel_my_order($1, $2)`, [o.order_id, o.tracking_token]);
    expect(await status(o.order_id)).toBe('cancelled');
  });
  it('refuses other customers and confirmed orders', async () => {
    const o = await order({ user: ALICE });
    await role('authenticated', BOB);
    await expect(db.query(`select public.cancel_my_order($1)`, [o.order_id])).rejects.toThrow(/not found/);
    await setStatus(o.order_id, 'confirmed');
    await role('authenticated', ALICE);
    await expect(db.query(`select public.cancel_my_order($1)`, [o.order_id])).rejects.toThrow(/no longer be cancelled/);
  });
});

describe('track_order', () => {
  it('needs the order number AND the phone on the order', async () => {
    const o = await order();
    await role('anon');
    const t = (await rows<{ t: Record<string, any> }>(`select public.track_order($1, $2) as t`, [o.order_number.toLowerCase(), '+8801712345678']))[0].t;
    expect(t.order_number).toBe(o.order_number);
    expect(t.items).toHaveLength(1);
    expect(t.history.length).toBeGreaterThan(0);
    await expect(db.query(`select public.track_order($1, $2)`, [o.order_number, '01999999999'])).rejects.toThrow(/No order found/);
    await expect(db.query(`select public.track_order($1, $2)`, ['VAY-000000-00000', customer.phone])).rejects.toThrow(/No order found/);
    await expect(db.query(`select public.track_order($1, null)`, [o.order_number])).rejects.toThrow(/No order found/);
  });
  it('shows only public history and never leaks private fields', async () => {
    const o = await order();
    await setStatus(o.order_id, 'confirmed', { note: 'INTERNAL: suspicious address', pub: false });
    await setStatus(o.order_id, 'processing', { note: 'Packing now', pub: true });
    await role('owner');
    await db.query(`update public.orders set internal_notes = 'SECRET NOTE' where id = $1`, [o.order_id]);
    await role('anon');
    const t = (await rows<{ t: Record<string, any> }>(`select public.track_order($1, $2) as t`, [o.order_number, customer.phone]))[0].t;
    const json = JSON.stringify(t);
    expect(json).not.toContain('INTERNAL');
    expect(json).not.toContain('SECRET NOTE');
    expect(json).not.toContain('secret@example.com');
    expect(json).not.toContain('Mirpur 10'); // full street address stays private
    expect(t.history.map((h: any) => h.status)).toEqual(['pending_order_review', 'processing']);
    expect(t.history[1].note).toBe('Packing now');
  });
  it('does not let anonymous users read orders directly', async () => {
    await role('anon');
    expect(await rows(`select * from public.orders`)).toHaveLength(0);
    expect(await rows(`select * from public.order_status_history`)).toHaveLength(0);
  });
});

describe('customers read their own order history', () => {
  it('sees own orders, items and PUBLIC history only', async () => {
    const o = await order({ user: BOB });
    await setStatus(o.order_id, 'confirmed', { note: 'staff only', pub: false });
    await role('authenticated', BOB);
    expect((await rows(`select id from public.orders`)).length).toBeGreaterThan(0);
    expect((await rows<{ user_id: string }>(`select user_id from public.orders`)).every((r) => r.user_id === BOB)).toBe(true);
    expect((await rows(`select * from public.order_items where order_id = $1`, [o.order_id])).length).toBe(1);
    const h = await rows<{ note: string | null }>(`select note from public.order_status_history where order_id = $1`, [o.order_id]);
    expect(h.some((x) => x.note === 'staff only')).toBe(false);
    await role('authenticated', ALICE);
    expect(await rows(`select * from public.orders where id = $1`, [o.order_id])).toHaveLength(0);
  });
});
