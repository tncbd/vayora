import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const root = join(__dirname, '..');
const ALICE = '00000000-0000-0000-0000-0000000000a1';
const BOB = '00000000-0000-0000-0000-0000000000b2';
const PAYMGR = '00000000-0000-0000-0000-000000000005';
const ORDMGR = '00000000-0000-0000-0000-000000000003';
let db: PGlite;
let vid: string;

async function role(r: 'anon' | 'authenticated' | 'service_role' | 'owner', uid?: string) {
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [r === 'owner' ? '' : JSON.stringify(uid ? { sub: uid, role: r } : { role: r })]);
  if (r !== 'owner') await db.exec(`set role ${r}`);
}
const rows = async <T = Record<string, any>>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows;
const customer = { name: 'Rahim Uddin', phone: '01712345678', district: 'Dhaka', area: 'Mirpur', address: 'House 1, Road 2, Mirpur 10' };

async function placeAdvance(user: string | null = null, qty = 1) {
  await role('service_role');
  const r = await rows<{ r: any }>(`select public.place_order($1::uuid, $2::jsonb, $3::jsonb, null) as r`,
    [user, JSON.stringify(customer), JSON.stringify([{ variant_id: vid, quantity: qty }])]);
  return r[0].r;
}
const submit = async (o: any, over: Record<string, any> = {}) => {
  const a = { token: o.tracking_token, method: 'bkash', sender: '01811111111', txn: 'ABC123XYZ', proof: null, ...over };
  return (await rows<{ r: any }>(`select public.submit_payment($1::uuid, $2::uuid, $3::public.payment_method_code, $4, $5, $6) as r`, [o.order_id, a.token, a.method, a.sender, a.txn, a.proof]))[0].r;
};
const stock = async () => (await rows(`select quantity, reserved from public.inventory where variant_id = $1`, [vid]))[0];
let txnCounter = 0;
const txn = () => `TXN${String(++txnCounter).padStart(6, '0')}`;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(readFileSync(join(root, 'tests', 'supabase_stubs.sql'), 'utf8'));
  for (const f of readdirSync(join(root, 'migrations')).filter((x) => x.endsWith('.sql')).sort()) await db.exec(readFileSync(join(root, 'migrations', f), 'utf8'));
  for (const [id, e] of [[ALICE, 'alice'], [BOB, 'bob'], [PAYMGR, 'paymgr'], [ORDMGR, 'ordmgr']]) await db.query(`insert into auth.users (id, email) values ($1, $2)`, [id, `${e}@example.test`]);
  await db.query(`insert into public.user_roles (user_id, role) values ($1, 'payment_manager'), ($2, 'order_manager')`, [PAYMGR, ORDMGR]);
  const p = await rows<{ id: string }>(`insert into public.products (slug, sku, name, regular_price, selling_price, status) values ('tee','T','Tee',500,500,'active') returning id`);
  const v = await rows<{ id: string }>(`insert into public.product_variants (product_id, sku, size, color) values ($1,'T-M','M','Black') returning id`, [p[0].id]);
  vid = v[0].id;
  await db.query(`update public.inventory set quantity = 100 where variant_id = $1`, [vid]);
  await db.exec(`update public.delivery_zones set charge = 80, is_active = true where name = 'Inside Dhaka';
                 update public.delivery_zones set charge = 130, is_active = true where name = 'Outside Dhaka';
                 update public.site_settings set value = 'true' where key = 'delivery_advance_required'`);
});
afterAll(async () => { await db.close(); });

describe('advance payment at order placement', () => {
  it('refuses to take an advance order until a payment method is enabled with a number', async () => {
    await expect(placeAdvance()).rejects.toThrow(/temporarily unavailable/);
    await role('owner');
    await db.exec(`update public.payment_methods set is_enabled = true where code = 'bkash'`); // enabled but no number
    await expect(placeAdvance()).rejects.toThrow(/temporarily unavailable/);
    await db.exec(`update public.payment_methods set merchant_number = '01700000000', is_enabled = true where code = 'bkash';
                   update public.payment_methods set merchant_number = '01900000000', is_enabled = true where code = 'nagad'`);
  });

  it('creates the order awaiting payment with advance = delivery charge and the rest as COD', async () => {
    const before = await stock();
    const o = await placeAdvance(ALICE, 2);
    expect(o.status).toBe('pending_payment_verification');
    expect(o.delivery_charge).toBe(80);
    expect(o.advance_amount).toBe(80);
    expect(o.total).toBe(1080);
    expect(o.cod_amount).toBe(1000);
    expect((await stock()).reserved).toBe(before.reserved + 2);
  });

  it('charges no advance when delivery is free, and none when the setting is off', async () => {
    await role('owner');
    await db.exec(`update public.delivery_zones set free_delivery_threshold = 1000 where name = 'Inside Dhaka'`);
    const free = await placeAdvance(null, 2);
    expect(free.advance_amount).toBe(0);
    expect(free.status).toBe('pending_order_review');
    await role('owner');
    await db.exec(`update public.delivery_zones set free_delivery_threshold = null where name = 'Inside Dhaka'; update public.site_settings set value = 'false' where key = 'delivery_advance_required'`);
    const off = await placeAdvance();
    expect(off.advance_amount).toBe(0);
    expect(off.cod_amount).toBe(off.total);
    await role('owner');
    await db.exec(`update public.site_settings set value = 'true' where key = 'delivery_advance_required'`);
  });

  it('quote_order reports the advance/COD split', async () => {
    await role('anon');
    const q = (await rows<{ q: any }>(`select public.quote_order($1::jsonb, 'Dhaka', null, null) as q`, [JSON.stringify([{ variant_id: vid, quantity: 1 }])]))[0].q;
    expect(q.advance_required).toBe(true);
    expect(q.advance_amount).toBe(80);
    expect(q.cod_amount).toBe(500);
    expect(q.total).toBe(580);
  });
});

describe('submit_payment', () => {
  it('guests need the secret token; a wrong token or order is "not found"', async () => {
    const o = await placeAdvance();
    await role('anon');
    await expect(submit(o, { token: '11111111-1111-4111-8111-111111111111' })).rejects.toThrow(/Order not found/);
    await expect(submit(o, { token: null })).rejects.toThrow(/Order not found/);
    const r = await submit(o);
    expect(r.status).toBe('submitted');
    const stored = (await rows(`select amount, status, transaction_id, method from public.payments where order_id = $1`, [o.order_id]))[0];
    expect(stored).toBeUndefined(); // anon cannot read payments table directly
    await role('owner');
    const p = (await rows(`select amount, status, transaction_id, method from public.payments where order_id = $1`, [o.order_id]))[0];
    expect(Number(p.amount)).toBe(80);
    expect(p.status).toBe('submitted');
    expect(p.transaction_id).toBe('ABC123XYZ');
  });

  it('validates sender, transaction id and method', async () => {
    const o = await placeAdvance();
    await role('anon');
    await expect(submit(o, { sender: '123', txn: txn() })).rejects.toThrow(/mobile number/);
    await expect(submit(o, { txn: 'ab' })).rejects.toThrow(/Transaction ID/);
    await expect(submit(o, { txn: 'bad id!!', })).rejects.toThrow(/Transaction ID/);
    await expect(submit(o, { method: 'upay', txn: txn() })).rejects.toThrow(/not available/); // upay has no number
  });

  it('rejects a transaction id that is already in use (case-insensitive), and allows only one live submission', async () => {
    const a = await placeAdvance();
    const b = await placeAdvance();
    await role('anon');
    const t = txn();
    await submit(a, { txn: t });
    await expect(submit(b, { txn: t.toLowerCase() })).rejects.toThrow(/already been used/);
    await expect(submit(a, { txn: txn() })).rejects.toThrow(/already been submitted/);
    await submit(b, { txn: txn(), method: 'nagad' });
  });

  it('proof files are only accepted from the signed-in owner under their own folder', async () => {
    const o = await placeAdvance(ALICE);
    await role('anon');
    await expect(submit(o, { txn: txn(), proof: `${ALICE}/x.png` })).rejects.toThrow(/Invalid payment proof/);
    await role('authenticated', BOB);
    await expect(submit(o, { token: null, txn: txn(), proof: `${BOB}/x.png` })).rejects.toThrow(/Order not found/);
    await role('authenticated', ALICE);
    await expect(submit(o, { token: null, txn: txn(), proof: `${BOB}/x.png` })).rejects.toThrow(/Invalid payment proof/);
    await expect(submit(o, { token: null, txn: txn(), proof: `${ALICE}/../${BOB}/x.png` })).rejects.toThrow(/Invalid payment proof/);
    const r = await submit(o, { token: null, txn: txn(), proof: `${ALICE}/${o.order_id}/proof.png` });
    expect(r.status).toBe('submitted');
  });

  it('cannot pay an order that is not waiting for an advance', async () => {
    await role('owner');
    await db.exec(`update public.site_settings set value = 'false' where key = 'delivery_advance_required'`);
    const plain = await placeAdvance();
    await role('owner');
    await db.exec(`update public.site_settings set value = 'true' where key = 'delivery_advance_required'`);
    await role('anon');
    await expect(submit(plain, { txn: txn() })).rejects.toThrow(/not waiting/);
  });
});

describe('verification and resubmission', () => {
  it('approving confirms the order; only payment staff can verify; amounts cannot be edited by customers', async () => {
    const o = await placeAdvance(ALICE);
    await role('authenticated', ALICE);
    const s = await submit(o, { token: null, txn: txn() });
    await expect(rows(`select public.verify_payment($1, true)`, [s.payment_id])).rejects.toThrow(/Not authorised/);
    expect(await rows(`update public.payments set status = 'verified' returning id`)).toHaveLength(0); // no UPDATE policy: touches nothing
    await role('authenticated', ORDMGR);
    await expect(rows(`select public.verify_payment($1, true)`, [s.payment_id])).rejects.toThrow(/Not authorised/);
    await role('authenticated', PAYMGR);
    await rows(`select public.verify_payment($1, true)`, [s.payment_id]);
    await role('owner');
    expect((await rows(`select status from public.orders where id = $1`, [o.order_id]))[0].status).toBe('confirmed');
    expect((await rows(`select status from public.payments where id = $1`, [s.payment_id]))[0].status).toBe('verified');
    await role('anon');
    await expect(submit(o, { txn: txn() })).rejects.toThrow(/not waiting|already/);
  });

  it('a rejected payment (with reason) lets the customer resubmit up to the limit, then locks', async () => {
    await role('owner');
    await db.exec(`update public.site_settings set value = '2' where key = 'payment_resubmission_limit'`);
    const o = await placeAdvance();
    await role('anon');
    const first = await submit(o, { txn: txn() });
    await role('authenticated', PAYMGR);
    await expect(rows(`select public.verify_payment($1, false)`, [first.payment_id])).rejects.toThrow(/reason/);
    await rows(`select public.verify_payment($1, false, 'Amount received is lower')`, [first.payment_id]);
    await role('anon');
    const info = (await rows<{ i: any }>(`select public.get_payment_info($1, $2) as i`, [o.order_id, o.tracking_token]))[0].i;
    expect(info.payment_status).toBe('rejected');
    expect(info.rejection_reason).toBe('Amount received is lower');
    expect(info.attempts_left).toBe(1);
    expect(info.order_status).toBe('pending_payment_verification');
    const second = await submit(o, { txn: txn() });
    expect(second.attempt).toBe(2);
    await role('authenticated', PAYMGR);
    await rows(`select public.verify_payment($1, false, 'Wrong transaction')`, [second.payment_id]);
    await role('anon');
    await expect(submit(o, { txn: txn() })).rejects.toThrow(/maximum number/);
    await role('owner');
    await db.exec(`update public.site_settings set value = '3' where key = 'payment_resubmission_limit'`);
  });

  it('get_payment_info shows only enabled methods with numbers, and only to the order owner/token holder', async () => {
    const o = await placeAdvance();
    await role('anon');
    const info = (await rows<{ i: any }>(`select public.get_payment_info($1, $2) as i`, [o.order_id, o.tracking_token]))[0].i;
    expect(info.methods.map((m: any) => m.code)).toEqual(['bkash', 'nagad']);
    expect(info.advance_amount).toBe(80);
    expect(info.expires_at).toBeTruthy();
    await expect(rows(`select public.get_payment_info($1, $2)`, [o.order_id, '11111111-1111-4111-8111-111111111111'])).rejects.toThrow(/Order not found/);
    await role('authenticated', BOB); // signed in, but this is someone else's guest order
    await expect(rows(`select public.get_payment_info($1, null)`, [o.order_id])).rejects.toThrow(/Order not found/);
    await expect(submit(o, { token: null, txn: txn() })).rejects.toThrow(/Order not found/);
  });
});

describe('expire_unpaid_orders', () => {
  it('cancels only stale orders with no submitted payment and releases their stock', async () => {
    const stale = await placeAdvance();
    const fresh = await placeAdvance();
    const paid = await placeAdvance();
    await role('anon');
    await submit(paid, { txn: txn() });
    await role('owner');
    await db.query(`update public.orders set placed_at = now() - interval '48 hours' where id = any($1::uuid[])`, [[stale.order_id, paid.order_id]]);
    const before = await stock();
    const n = (await rows<{ n: number }>(`select public.expire_unpaid_orders() as n`))[0].n;
    expect(n).toBeGreaterThanOrEqual(1);
    const st = async (id: string) => (await rows(`select status from public.orders where id = $1`, [id]))[0].status;
    expect(await st(stale.order_id)).toBe('cancelled');
    expect(await st(fresh.order_id)).toBe('pending_payment_verification');
    expect(await st(paid.order_id)).toBe('pending_payment_verification'); // payment awaiting staff review is never expired
    expect((await stock()).reserved).toBeLessThan(before.reserved);
  });

  it('is limited to staff, service role and direct database access', async () => {
    await role('anon');
    await expect(rows(`select public.expire_unpaid_orders()`)).rejects.toThrow(/permission denied/);
    await role('authenticated', ALICE);
    await expect(rows(`select public.expire_unpaid_orders()`)).rejects.toThrow(/Not authorised/);
    await role('authenticated', PAYMGR);
    await expect(rows(`select public.expire_unpaid_orders()`)).resolves.toBeTruthy();
  });
});
