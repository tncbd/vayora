import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const root = join(__dirname, '..');
const U = {
  superAdmin: '00000000-0000-0000-0000-000000000001',
  admin: '00000000-0000-0000-0000-000000000002',
  orderMgr: '00000000-0000-0000-0000-000000000003',
  productMgr: '00000000-0000-0000-0000-000000000004',
  paymentMgr: '00000000-0000-0000-0000-000000000005',
  alice: '00000000-0000-0000-0000-0000000000a1',
  bob: '00000000-0000-0000-0000-0000000000b2',
};

let db: PGlite;

/** Run following statements as a signed-in user. */
async function as(uid: string) {
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [
    JSON.stringify({ sub: uid, role: 'authenticated' }),
  ]);
  await db.exec('set role authenticated');
}
async function asAnon() {
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [JSON.stringify({ role: 'anon' })]);
  await db.exec('set role anon');
}
async function asService() {
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [JSON.stringify({ role: 'service_role' })]);
  await db.exec('set role service_role');
}
/** Project owner / SQL editor. */
async function asOwner() {
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claims', '', false)`);
}
async function rows<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
  return (await db.query<T>(sql, params)).rows;
}

let orderId: string;
let paymentId: string;
let variantId: string;
let productId: string;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(readFileSync(join(root, 'tests', 'supabase_stubs.sql'), 'utf8'));
  const files = readdirSync(join(root, 'migrations')).filter((f) => f.endsWith('.sql')).sort();
  for (const f of files) await db.exec(readFileSync(join(root, 'migrations', f), 'utf8'));

  for (const [name, id] of Object.entries(U)) {
    await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [
      id,
      `${name}@example.test`,
      JSON.stringify({ full_name: name }),
    ]);
  }
  const grants: [string, string][] = [
    [U.superAdmin, 'super_admin'],
    [U.admin, 'admin'],
    [U.orderMgr, 'order_manager'],
    [U.productMgr, 'product_manager'],
    [U.paymentMgr, 'payment_manager'],
  ];
  for (const [id, role] of grants) {
    await db.query(`insert into public.user_roles (user_id, role) values ($1, $2)`, [id, role]);
  }

  // an active product with one variant and stock, plus a draft product
  const cat = (await rows<{ id: string }>(`select id from public.categories where slug = 't-shirt'`))[0].id;
  productId = (
    await rows<{ id: string }>(
      `insert into public.products (slug, sku, name, category_id, gender, regular_price, selling_price, status)
       values ('cotton-tee', 'VAY-TEE-1', 'Cotton Tee', $1, 'men', 799, 599, 'active') returning id`,
      [cat],
    )
  )[0].id;
  await db.query(
    `insert into public.products (slug, sku, name, regular_price, selling_price, status)
     values ('draft-item', 'VAY-DRAFT-1', 'Draft Item', 500, 500, 'draft')`,
  );
  variantId = (
    await rows<{ id: string }>(
      `insert into public.product_variants (product_id, sku, size, color) values ($1, 'VAY-TEE-1-M-BLK', 'M', 'Black') returning id`,
      [productId],
    )
  )[0].id;
  await db.query(`update public.inventory set quantity = 5 where variant_id = $1`, [variantId]);

  // an order for Alice (inserted as the server would) with a submitted payment
  await db.query(`update public.payment_methods set merchant_number = '01712345678', is_enabled = true where code = 'bkash'`);
  orderId = (
    await rows<{ id: string }>(
      `insert into public.orders (user_id, customer_name, phone, district, area, address,
         subtotal, discount_total, delivery_charge, total, advance_amount, cod_amount, status)
       values ($1, 'Alice', '01711111111', 'Dhaka', 'Mirpur', 'House 1',
         1200, 0, 80, 1280, 80, 1200, 'pending_payment_verification') returning id`,
      [U.alice],
    )
  )[0].id;
  paymentId = (
    await rows<{ id: string }>(
      `insert into public.payments (order_id, method, amount, status, sender_number, transaction_id, submitted_at)
       values ($1, 'bkash', 80, 'submitted', '01711111111', 'TXN123456', now()) returning id`,
      [orderId],
    )
  )[0].id;
  await db.query(
    `insert into public.addresses (user_id, full_name, phone, district, area, address_line)
     values ($1, 'Bob', '01722222222', 'Dhaka', 'Uttara', 'Bob house')`,
    [U.bob],
  );
});

afterAll(async () => {
  await db.close();
});

describe('schema and seed', () => {
  it('creates every required table', async () => {
    await asOwner();
    const need = [
      'profiles', 'user_roles', 'categories', 'products', 'product_images', 'product_variants', 'inventory',
      'addresses', 'carts', 'cart_items', 'wishlists', 'wishlist_items', 'orders', 'order_items', 'payments',
      'payment_methods', 'delivery_zones', 'coupons', 'coupon_usages', 'banners', 'hero_slides',
      'homepage_sections', 'reviews', 'pages', 'menus', 'site_settings', 'newsletter_subscribers',
      'blog_posts', 'order_status_history', 'admin_activity_logs',
    ];
    const have = (await rows<{ tablename: string }>(`select tablename from pg_tables where schemaname = 'public'`)).map((r) => r.tablename);
    for (const t of need) expect(have, t).toContain(t);
  });

  it('enables RLS on every public table', async () => {
    await asOwner();
    const off = await rows(`select tablename from pg_tables where schemaname = 'public' and not rowsecurity`);
    expect(off).toEqual([]);
  });

  it('seeds categories, collections and disabled payment methods without inventing business values', async () => {
    await asOwner();
    expect((await rows(`select 1 from public.categories`)).length).toBe(26);
    expect((await rows(`select 1 from public.collections`)).length).toBe(7);
    const zones = await rows<{ charge: string; is_active: boolean }>(`select charge, is_active from public.delivery_zones`);
    expect(zones.every((z) => Number(z.charge) === 0 && z.is_active === false)).toBe(true);
    const adv = await rows<{ value: unknown }>(`select value from public.site_settings where key = 'delivery_advance_required'`);
    expect(adv[0].value).toBe(false);
  });

  it('creates a profile on sign-up and never grants a role', async () => {
    await asOwner();
    const id = '00000000-0000-0000-0000-0000000000c3';
    await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, 'new@example.test', '{"full_name":"New","phone":"bad"}')`, [id]);
    const p = await rows<{ full_name: string; phone: string | null }>(`select full_name, phone from public.profiles where id = $1`, [id]);
    expect(p[0].full_name).toBe('New');
    expect(p[0].phone).toBeNull(); // invalid phone dropped, sign-up not blocked
    expect(await rows(`select 1 from public.user_roles where user_id = $1`, [id])).toHaveLength(0);
  });
});

describe('anonymous visitors', () => {
  it('can read storefront data but only active/enabled rows', async () => {
    await asAnon();
    expect((await rows(`select 1 from public.categories`)).length).toBe(26);
    const products = await rows<{ slug: string }>(`select slug from public.products`);
    expect(products.map((p) => p.slug)).toEqual(['cotton-tee']); // draft hidden
    expect((await rows(`select 1 from public.payment_methods`)).map(() => 1)).toHaveLength(1); // only enabled
    expect((await rows(`select 1 from public.site_settings`)).length).toBeGreaterThan(5);
  });

  it('cannot read private data', async () => {
    await asAnon();
    for (const t of ['orders', 'payments', 'order_items', 'profiles', 'addresses', 'coupons', 'newsletter_subscribers', 'contact_messages', 'admin_activity_logs', 'inventory', 'user_roles']) {
      let n = 0;
      try { n = (await rows(`select 1 from public.${t}`)).length; } catch { n = 0; } // permission denied also counts as no access
      expect(n, t).toBe(0);
    }
  });

  it('cannot write anywhere', async () => {
    await asAnon();
    for (const sql of [
      `insert into public.newsletter_subscribers (email) values ('a@b.co')`,
      `insert into public.contact_messages (name, message) values ('x', 'y')`,
      `insert into public.products (slug, sku, name, regular_price, selling_price) values ('h','h','h',1,1)`,
      `update public.products set selling_price = 1`,
      `delete from public.categories`,
    ]) {
      await expect(db.query(sql), sql).rejects.toThrow();
    }
  });

  it('sees stock only as a capped availability flag', async () => {
    await asAnon();
    const v = await rows<{ in_stock: boolean; available_qty: number }>(`select in_stock, available_qty from public.variant_availability`);
    expect(v[0]).toEqual({ in_stock: true, available_qty: 5 });
    await expect(rows(`select * from public.inventory`)).rejects.toThrow(/permission denied/); // exact stock hidden
  });
});

describe('role-based access', () => {
  it('lets product managers (and only catalogue roles) edit products', async () => {
    await as(U.productMgr);
    await db.query(`insert into public.products (slug, sku, name, regular_price, selling_price) values ('pm-item','PM-1','PM item',100,90)`);
    for (const uid of [U.alice, U.orderMgr, U.paymentMgr]) {
      await as(uid);
      await expect(
        db.query(`insert into public.products (slug, sku, name, regular_price, selling_price) values ('x-${uid.slice(-2)}','X-${uid.slice(-2)}','x',1,1)`),
      ).rejects.toThrow(/row-level security/);
    }
  });

  it('rejects a selling price above the regular price', async () => {
    await as(U.productMgr);
    await expect(
      db.query(`insert into public.products (slug, sku, name, regular_price, selling_price) values ('bad','BAD','bad',100,200)`),
    ).rejects.toThrow();
  });

  it('only a super admin can grant roles; nobody can self-promote', async () => {
    await as(U.alice);
    await expect(db.query(`insert into public.user_roles (user_id, role) values ($1, 'super_admin')`, [U.alice])).rejects.toThrow(/row-level security/);
    await as(U.admin);
    await expect(db.query(`insert into public.user_roles (user_id, role) values ($1, 'admin')`, [U.alice])).rejects.toThrow(/row-level security/);
    await as(U.superAdmin);
    await db.query(`insert into public.user_roles (user_id, role) values ($1, 'product_manager')`, [U.bob]);
    const granted = await rows<{ granted_by: string }>(`select granted_by from public.user_roles where user_id = $1`, [U.bob]);
    expect(granted[0].granted_by).toBe(U.superAdmin);
    await db.query(`delete from public.user_roles where user_id = $1`, [U.bob]);
  });

  it('users only see their own roles; super admin sees all', async () => {
    await as(U.orderMgr);
    expect(await rows(`select 1 from public.user_roles`)).toHaveLength(1);
    await as(U.superAdmin);
    expect((await rows(`select 1 from public.user_roles`)).length).toBeGreaterThanOrEqual(5);
  });

  it('never allows removing the last super admin', async () => {
    await asOwner();
    await expect(db.query(`delete from public.user_roles where role = 'super_admin'`)).rejects.toThrow(/last super_admin/);
    await expect(db.query(`update public.user_roles set role = 'admin' where role = 'super_admin'`)).rejects.toThrow(/last super_admin/);
  });
});

describe('customer isolation', () => {
  it('each customer sees only their own profile, address, order, payment', async () => {
    await as(U.alice);
    expect(await rows(`select 1 from public.profiles`)).toHaveLength(1);
    expect(await rows(`select 1 from public.addresses`)).toHaveLength(0); // Bob's is hidden
    expect(await rows(`select 1 from public.orders`)).toHaveLength(1);
    expect(await rows(`select 1 from public.payments`)).toHaveLength(1);
    await as(U.bob);
    expect(await rows(`select 1 from public.orders`)).toHaveLength(0);
    expect(await rows(`select 1 from public.payments`)).toHaveLength(0);
    expect(await rows(`select 1 from public.order_status_history`)).toHaveLength(0);
  });

  it('customers cannot write addresses for someone else', async () => {
    await as(U.alice);
    await expect(
      db.query(`insert into public.addresses (user_id, full_name, phone, district, area, address_line) values ($1,'x','01733333333','Dhaka','a','b')`, [U.bob]),
    ).rejects.toThrow(/row-level security/);
    await db.query(`insert into public.addresses (user_id, full_name, phone, district, area, address_line) values ($1,'Alice','01733333333','Dhaka','a','b')`, [U.alice]);
  });

  it('customers cannot create or edit orders directly', async () => {
    await as(U.alice);
    await expect(
      db.query(`insert into public.orders (user_id, customer_name, phone, district, area, address, subtotal, total, cod_amount) values ($1,'A','01711111111','D','a','b',1,1,1)`, [U.alice]),
    ).rejects.toThrow(/row-level security|permission denied/);
    const r = await db.query(`update public.orders set status = 'confirmed' where id = $1`, [orderId]);
    expect(r.affectedRows).toBe(0);
  });

  it('customers cannot read coupons, and reviews follow moderation', async () => {
    await asOwner();
    await db.query(`insert into public.coupons (code, type, value) values ('SAVE10','percentage',10)`);
    await as(U.alice);
    expect(await rows(`select 1 from public.coupons`)).toHaveLength(0);
    await db.query(`insert into public.reviews (product_id, user_id, rating, comment) values ($1,$2,5,'nice')`, [productId, U.alice]);
    await expect(
      db.query(`insert into public.reviews (product_id, user_id, rating, status) values ($1,$2,5,'approved')`, [productId, U.bob]),
    ).rejects.toThrow(/row-level security/);
    await asAnon();
    expect(await rows(`select 1 from public.reviews`)).toHaveLength(0); // still pending
    await as(U.admin);
    await db.query(`update public.reviews set status = 'approved'`);
    await asAnon();
    expect(await rows(`select 1 from public.reviews`)).toHaveLength(1);
  });
});

describe('orders', () => {
  it('generates readable unique order numbers and an initial history row', async () => {
    await asOwner();
    const o = await rows<{ order_number: string }>(`select order_number from public.orders where id = $1`, [orderId]);
    expect(o[0].order_number).toMatch(/^VAY-\d{6}-\d{5}$/);
    const h = await rows<{ to_status: string }>(`select to_status from public.order_status_history where order_id = $1`, [orderId]);
    expect(h[0].to_status).toBe('pending_payment_verification');
  });

  it('enforces the payment model arithmetic in the database', async () => {
    await asOwner();
    // total must equal subtotal - discount + delivery
    await expect(
      db.query(`insert into public.orders (customer_name, phone, district, area, address, subtotal, delivery_charge, total, advance_amount, cod_amount)
                values ('x','01711111111','D','a','b',1200,80,9999,0,9999)`),
    ).rejects.toThrow();
    // advance must be 0 or exactly the delivery charge
    await expect(
      db.query(`insert into public.orders (customer_name, phone, district, area, address, subtotal, delivery_charge, total, advance_amount, cod_amount)
                values ('x','01711111111','D','a','b',1200,80,1280,50,1230)`),
    ).rejects.toThrow();
    // advance disabled: whole 1,280 payable on delivery
    await db.query(`insert into public.orders (customer_name, phone, district, area, address, subtotal, delivery_charge, total, advance_amount, cod_amount)
                    values ('x','01711111111','D','a','b',1200,80,1280,0,1280)`);
    // advance enabled: 80 now, 1,200 on delivery
    await db.query(`insert into public.orders (customer_name, phone, district, area, address, subtotal, delivery_charge, total, advance_amount, cod_amount)
                    values ('x','01711111111','D','a','b',1200,80,1280,80,1200)`);
  });

  it('lets order managers edit shipping details but never money or status directly', async () => {
    await as(U.orderMgr);
    await db.query(`update public.orders set courier_company = 'Pathao', tracking_number = 'T-1' where id = $1`, [orderId]);
    await expect(db.query(`update public.orders set status = 'shipped' where id = $1`, [orderId])).rejects.toThrow(/set_order_status/);
    await expect(db.query(`update public.orders set total = 1, cod_amount = 1, subtotal = 1, delivery_charge = 0, advance_amount = 0 where id = $1`, [orderId])).rejects.toThrow(/immutable/);
    await expect(db.query(`update public.orders set user_id = $2 where id = $1`, [orderId, U.bob])).rejects.toThrow(/immutable/);
  });

  it('does not let a product manager touch orders', async () => {
    await as(U.productMgr);
    expect(await rows(`select 1 from public.orders`)).toHaveLength(0);
  });
});

describe('manual payment verification', () => {
  it('blocks direct edits to payment status, even for payment managers', async () => {
    for (const uid of [U.paymentMgr, U.admin, U.superAdmin, U.alice]) {
      await as(uid);
      const r = await db.query(`update public.payments set status = 'verified' where id = $1`, [paymentId]);
      expect(r.affectedRows, uid).toBe(0); // no UPDATE policy: nothing can change
    }
    await asOwner();
    expect((await rows<{ status: string }>(`select status from public.payments where id = $1`, [paymentId]))[0].status).toBe('submitted');
    await as(U.alice);
    await expect(db.query(`insert into public.payments (order_id, method, amount) values ($1,'bkash',80)`, [orderId])).rejects.toThrow(/row-level security/);
  });

  it('only payment staff may call verify_payment', async () => {
    for (const uid of [U.alice, U.orderMgr, U.productMgr]) {
      await as(uid);
      await expect(db.query(`select public.verify_payment($1, true)`, [paymentId]), uid).rejects.toThrow(/Not authorised/);
    }
    await asAnon();
    await expect(db.query(`select public.verify_payment($1, true)`, [paymentId])).rejects.toThrow();
  });

  it('requires a reason to reject, then frees the transaction id for resubmission', async () => {
    await as(U.paymentMgr);
    await expect(db.query(`select public.verify_payment($1, false, '  ')`, [paymentId])).rejects.toThrow(/reason is required/);
    await db.query(`select public.verify_payment($1, false, 'Amount does not match')`, [paymentId]);
    await asOwner();
    expect((await rows<{ status: string }>(`select status from public.payments where id = $1`, [paymentId]))[0].status).toBe('rejected');
    expect((await rows<{ status: string }>(`select status from public.orders where id = $1`, [orderId]))[0].status).toBe('pending_payment_verification');
    // customer resubmits a new attempt, even reusing the rejected txn id
    await db.query(`insert into public.payments (order_id, method, amount, status, sender_number, transaction_id, attempt, submitted_at)
                    values ($1,'bkash',80,'submitted','01711111111','TXN123456',2, now())`, [orderId]);
  });

  it('blocks duplicate live transaction ids', async () => {
    await asOwner();
    await expect(
      db.query(`insert into public.payments (order_id, method, amount, status, transaction_id, attempt)
                values ($1,'bkash',80,'submitted','txn123456',3)`, [orderId]),
    ).rejects.toThrow(/duplicate|unique/);
  });

  it('approving confirms the order, stamps the verifier and writes an audit log', async () => {
    await asOwner();
    const live = (await rows<{ id: string }>(`select id from public.payments where order_id = $1 and status = 'submitted'`, [orderId]))[0].id;
    await as(U.paymentMgr);
    await db.query(`select public.verify_payment($1, true)`, [live]);
    await asOwner();
    const p = await rows<{ status: string; verified_by: string }>(`select status, verified_by from public.payments where id = $1`, [live]);
    expect(p[0]).toEqual({ status: 'verified', verified_by: U.paymentMgr });
    expect((await rows<{ status: string }>(`select status from public.orders where id = $1`, [orderId]))[0].status).toBe('confirmed');
    const log = await rows(`select 1 from public.admin_activity_logs where action = 'payment.verified' and entity_id = $1`, [live]);
    expect(log).toHaveLength(1);
    await as(U.paymentMgr);
    await expect(db.query(`select public.verify_payment($1, true)`, [live])).rejects.toThrow(/Only submitted/);
  });

  it('audit logs are readable by admins only and cannot be forged', async () => {
    await as(U.admin);
    expect((await rows(`select 1 from public.admin_activity_logs`)).length).toBeGreaterThan(0);
    await as(U.paymentMgr);
    expect(await rows(`select 1 from public.admin_activity_logs`)).toHaveLength(0);
    await as(U.alice);
    await expect(db.query(`insert into public.admin_activity_logs (action) values ('forged')`)).rejects.toThrow();
    await expect(db.query(`select public.log_admin_action('forged')`)).rejects.toThrow(/Not authorised/);
  });
});

describe('stock safety', () => {
  it('browser roles cannot call stock functions; the service role can', async () => {
    for (const run of [asAnon, () => as(U.productMgr), () => as(U.superAdmin)]) {
      await run();
      await expect(db.query(`select public.reserve_stock($1, 1)`, [variantId])).rejects.toThrow(/permission denied/);
    }
    await asService();
    await db.query(`select public.reserve_stock($1, 2)`, [variantId]);
  });

  it('never oversells', async () => {
    await asService();
    await expect(db.query(`select public.reserve_stock($1, 4)`, [variantId])).rejects.toThrow(/Insufficient stock/); // 5 total, 2 reserved
    await db.query(`select public.reserve_stock($1, 3)`, [variantId]); // exactly the remainder
    await expect(db.query(`select public.reserve_stock($1, 1)`, [variantId])).rejects.toThrow(/Insufficient stock/);
  });

  it('releases and commits stock correctly', async () => {
    await asService();
    await db.query(`select public.release_stock($1, 3)`, [variantId]);
    await db.query(`select public.commit_stock($1, 2)`, [variantId]);
    await asOwner();
    expect((await rows(`select quantity, reserved from public.inventory where variant_id = $1`, [variantId]))[0]).toEqual({ quantity: 3, reserved: 0 });
    await asService();
    await expect(db.query(`select public.commit_stock($1, 1)`, [variantId])).rejects.toThrow(/Cannot commit/);
  });
});

describe('storage policies', () => {
  const put = (bucket: string, name: string) =>
    db.query(`insert into storage.objects (bucket_id, name) values ($1, $2)`, [bucket, name]);

  it('keeps payment proofs private to the owner and payment staff', async () => {
    await as(U.alice);
    await put('payment-proofs', `${U.alice}/VAY-1/proof.png`);
    await expect(put('payment-proofs', `${U.bob}/VAY-1/proof.png`)).rejects.toThrow(/row-level security/);
    expect(await rows(`select 1 from storage.objects where bucket_id = 'payment-proofs'`)).toHaveLength(1);
    await as(U.bob);
    expect(await rows(`select 1 from storage.objects where bucket_id = 'payment-proofs'`)).toHaveLength(0);
    await asAnon();
    expect(await rows(`select 1 from storage.objects where bucket_id = 'payment-proofs'`)).toHaveLength(0);
    await as(U.paymentMgr);
    expect(await rows(`select 1 from storage.objects where bucket_id = 'payment-proofs'`)).toHaveLength(1);
    await as(U.productMgr);
    expect(await rows(`select 1 from storage.objects where bucket_id = 'payment-proofs'`)).toHaveLength(0);
  });

  it('does not let customers edit or delete submitted proofs', async () => {
    await as(U.alice);
    expect((await db.query(`delete from storage.objects where bucket_id = 'payment-proofs'`)).affectedRows).toBe(0);
    expect((await db.query(`update storage.objects set name = 'x' where bucket_id = 'payment-proofs'`)).affectedRows).toBe(0);
  });

  it('restricts product, banner and site asset uploads to staff', async () => {
    await as(U.alice);
    await expect(put('product-images', 'a.png')).rejects.toThrow(/row-level security/);
    await expect(put('banners', 'a.png')).rejects.toThrow(/row-level security/);
    await as(U.productMgr);
    await put('product-images', 'a.png');
    await expect(put('banners', 'b.png')).rejects.toThrow(/row-level security/);
    await as(U.admin);
    await put('banners', 'b.png');
    await put('site-assets', 'logo.png');
  });

  it('lets customers upload review images only to their own folder', async () => {
    await as(U.alice);
    await put('review-images', `${U.alice}/r1.jpg`);
    await expect(put('review-images', `${U.bob}/r1.jpg`)).rejects.toThrow(/row-level security/);
  });

  it('configures buckets with size and type limits; only payment-proofs is private', async () => {
    await asOwner();
    const b = await rows<{ id: string; public: boolean; file_size_limit: number; allowed_mime_types: string[] }>(`select * from storage.buckets order by id`);
    expect(b.map((x) => x.id)).toEqual(['banners', 'payment-proofs', 'product-images', 'review-images', 'site-assets']);
    expect(b.filter((x) => !x.public).map((x) => x.id)).toEqual(['payment-proofs']);
    expect(b.every((x) => x.file_size_limit > 0 && x.allowed_mime_types.length > 0)).toBe(true);
  });
});
