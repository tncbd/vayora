import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const root = join(__dirname, '..');
const SUPER = '00000000-0000-0000-0000-0000000000a1';
const ADMIN = '00000000-0000-0000-0000-0000000000a2';
const ORDMGR = '00000000-0000-0000-0000-0000000000a3';
const CUST = '00000000-0000-0000-0000-0000000000a5';
let db: PGlite;

async function role(r: 'anon' | 'authenticated' | 'owner', uid?: string) {
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [JSON.stringify(uid ? { sub: uid, role: r } : { role: r })]);
  if (r !== 'owner') await db.exec(`set role ${r}`);
}
/* eslint-disable @typescript-eslint/no-explicit-any */
const report = async (from: string, to: string) => ((await db.query<{ r: any }>(`select public.admin_sales_report($1::date, $2::date) r`, [from, to])).rows[0]).r;

async function order(placed: string, district: string, subtotal: number, discount: number, delivery: number, status: string, coupon: string | null, product: string, qty: number) {
  const total = subtotal - discount + delivery;
  const { rows } = await db.query<{ id: string }>(
    `insert into public.orders (customer_name, phone, district, area, address, subtotal, discount_total, delivery_charge, total, advance_amount, cod_amount, placed_at, coupon_code)
     values ('Test','01712345678',$1,'Area','Some address',$2,$3,$4,$5,0,$5,$6::timestamptz,$7) returning id`,
    [district, subtotal, discount, delivery, total, placed, coupon]);
  await db.query(`insert into public.order_items (order_id, product_name, sku, unit_price, quantity, line_total) values ($1,$2,'SKU',$3,$4,$5)`, [rows[0].id, product, subtotal / qty, qty, subtotal]);
  if (status !== 'pending_order_review') await db.query(`update public.orders set status = $1 where id = $2`, [status, rows[0].id]);
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(readFileSync(join(root, 'tests', 'supabase_stubs.sql'), 'utf8'));
  for (const f of readdirSync(join(root, 'migrations')).filter((x) => x.endsWith('.sql')).sort()) await db.exec(readFileSync(join(root, 'migrations', f), 'utf8'));
  for (const [id, e] of [[SUPER, 'super'], [ADMIN, 'admin'], [ORDMGR, 'ord'], [CUST, 'cust']]) await db.query(`insert into auth.users (id, email) values ($1, $2)`, [id, e + '@example.test']);
  await db.exec(`insert into public.user_roles (user_id, role) values ('${SUPER}','super_admin'),('${ADMIN}','admin'),('${ORDMGR}','order_manager')`);
  // 2026-11-01 (Dhaka): two sales and one cancelled. 2026-11-02: one delivered. 2026-10-01: outside the range.
  await order('2026-11-01T05:00:00+06', 'Dhaka', 2000, 200, 60, 'pending_order_review', 'EID10', 'Tee', 2);
  await order('2026-11-01T20:00:00+06', 'Chattogram', 1000, 0, 120, 'confirmed', null, 'Tee', 1);
  await order('2026-11-01T21:00:00+06', 'Dhaka', 500, 0, 60, 'cancelled', null, 'Scarf', 1);
  await order('2026-11-02T10:00:00+06', 'Dhaka', 3000, 0, 60, 'delivered', 'EID10', 'Panjabi', 1);
  await order('2026-10-01T10:00:00+06', 'Dhaka', 9999, 0, 60, 'pending_order_review', null, 'Old', 1);
});
afterAll(async () => { await db.close(); });

describe('admin_sales_report', () => {
  it('counts only the range and excludes cancelled orders from sales', async () => {
    await role('authenticated', ADMIN);
    const r = await report('2026-11-01', '2026-11-02');
    expect(r.summary.orders).toBe(4);
    expect(r.summary.sales_orders).toBe(3);
    expect(Number(r.summary.sales)).toBe(1860 + 1120 + 3060);
    expect(Number(r.summary.delivered_sales)).toBe(3060);
    expect(Number(r.summary.discounts)).toBe(200);
    expect(r.summary.cancelled).toBe(1);
  });
  it('splits by day in Bangladesh time, by product, district and coupon', async () => {
    await role('authenticated', ADMIN);
    const r = await report('2026-11-01', '2026-11-02');
    expect(r.daily.map((d: { orders: number }) => d.orders)).toEqual([3, 1]);
    expect(r.products[0]).toMatchObject({ name: 'Tee', units: 3 });
    expect(r.products.find((p: { name: string }) => p.name === 'Scarf')).toBeUndefined();
    expect(r.districts[0]).toMatchObject({ district: 'Dhaka', orders: 2 });
    expect(r.coupons).toEqual([{ code: 'EID10', uses: 2, discount: 200 }]);
  });
  it('is closed to order managers, customers and visitors', async () => {
    for (const [r, u] of [['authenticated', ORDMGR], ['authenticated', CUST]] as const) {
      await role(r, u);
      await expect(report('2026-11-01', '2026-11-02')).rejects.toThrow(/Not authorised/);
    }
    await role('anon');
    await expect(report('2026-11-01', '2026-11-02')).rejects.toThrow(/permission denied/);
  });
  it('rejects bad ranges', async () => {
    await role('authenticated', SUPER);
    await expect(report('2026-11-02', '2026-11-01')).rejects.toThrow(/valid date range/);
    await expect(report('2025-01-01', '2026-11-01')).rejects.toThrow(/at most one year/);
  });
});
