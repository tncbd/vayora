import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const root = join(__dirname, '..');
const U = {
  staff: '00000000-0000-0000-0000-0000000000f1',
  pm: '00000000-0000-0000-0000-0000000000f2',
  alice: '00000000-0000-0000-0000-0000000000a1',
  bob: '00000000-0000-0000-0000-0000000000b2',
};
let db: PGlite;

async function as(uid: string) {
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [JSON.stringify({ sub: uid, role: 'authenticated' })]);
  await db.exec('set role authenticated');
}
async function asAnon() {
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [JSON.stringify({ role: 'anon' })]);
  await db.exec('set role anon');
}
async function asOwner() {
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claims', '', false)`);
}
const rows = async <T = Record<string, unknown>>(sql: string, p: unknown[] = []) => (await db.query<T>(sql, p)).rows;

let tee: string;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(readFileSync(join(root, 'tests', 'supabase_stubs.sql'), 'utf8'));
  for (const f of readdirSync(join(root, 'migrations')).filter((x) => x.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(root, 'migrations', f), 'utf8'));
  }
  for (const [n, id] of Object.entries(U)) {
    await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1,$2,$3)`, [id, `${n}@example.test`, JSON.stringify({ full_name: n === 'alice' ? 'Alice Rahman' : n })]);
  }
  await db.query(`insert into public.user_roles (user_id, role) values ($1,'super_admin'), ($2,'product_manager')`, [U.staff, U.pm]);
  await db.exec(readFileSync(join(root, 'demo', 'demo_products.sql'), 'utf8'));
  tee = (await rows<{ id: string }>(`select id from public.products where sku = 'DEMO-TEE-001'`))[0].id;
  await db.query(`insert into public.product_images (product_id, url, sort_order, is_main) values ($1,'https://x/2.jpg',2,false), ($1,'https://x/1.jpg',1,true)`, [tee]);
  await db.query(`insert into public.products (slug, sku, name, regular_price, selling_price, status) values ('hidden-draft','HID-1','Hidden Draft',100,100,'draft')`);
});
afterAll(async () => db.close());

describe('storefront_products view', () => {
  it('shows only active products to anonymous visitors', async () => {
    await asAnon();
    const r = await rows<{ slug: string }>(`select slug from public.storefront_products`);
    expect(r).toHaveLength(8);
    expect(r.map((x) => x.slug)).not.toContain('hidden-draft');
  });

  it('computes discount, main/hover images, sizes, colours and stock', async () => {
    await asAnon();
    const t = (await rows<Record<string, unknown>>(`select * from public.storefront_products where slug = 'demo-premium-cotton-t-shirt'`))[0];
    expect(t.discount_pct).toBe(25);
    expect(t.image_url).toBe('https://x/1.jpg'); // main image wins over sort order
    expect(t.hover_image_url).toBe('https://x/2.jpg');
    expect((t.sizes as string[]).slice().sort()).toEqual(['L', 'M', 'XL']);
    expect((t.colors as { name: string }[]).map((c) => c.name).sort()).toEqual(['Black', 'Navy']);
    expect(t.in_stock).toBe(true);
    expect(t.category_slug).toBe('t-shirt');
    expect(t.parent_category_slug).toBe('men');
  });

  it('marks a product with zero stock as not in stock, and hides exact quantities', async () => {
    await asAnon();
    const legs = (await rows<{ in_stock: boolean }>(`select in_stock from public.storefront_products where sku = 'DEMO-LEG-001'`))[0];
    expect(legs.in_stock).toBe(false);
    const cols = (await db.query(`select * from public.storefront_products limit 1`)).fields.map((f) => f.name);
    expect(cols).not.toContain('quantity');
    expect(cols).not.toContain('reserved');
  });

  it('treats reserved stock as unavailable', async () => {
    await asOwner();
    await db.query(`update public.inventory set reserved = quantity where variant_id in (select id from public.product_variants where product_id = (select id from public.products where sku = 'DEMO-POLO-001'))`);
    await asAnon();
    expect((await rows<{ in_stock: boolean }>(`select in_stock from public.storefront_products where sku = 'DEMO-POLO-001'`))[0].in_stock).toBe(false);
    await asOwner();
    await db.query(`update public.inventory set reserved = 0`);
  });

  it('ignores inactive variants and reports collections', async () => {
    await asOwner();
    await db.query(`update public.product_variants set is_active = false where sku like 'DEMO-PANJ-001-XL-%'`);
    await asAnon();
    const p = (await rows<{ sizes: string[]; collection_slugs: string[] }>(`select sizes, collection_slugs from public.storefront_products where sku = 'DEMO-PANJ-001'`))[0];
    expect(p.sizes.slice().sort()).toEqual(['L', 'M']);
    expect(p.collection_slugs).toContain('featured');
    await asOwner();
    await db.query(`update public.product_variants set is_active = true`);
  });

  it('hides a product as soon as it is deactivated', async () => {
    await as(U.pm);
    await db.query(`update public.products set status = 'inactive' where sku = 'DEMO-LEG-001'`);
    await asAnon();
    expect(await rows(`select 1 from public.storefront_products where sku = 'DEMO-LEG-001'`)).toHaveLength(0);
    await as(U.pm);
    await db.query(`update public.products set status = 'active' where sku = 'DEMO-LEG-001'`);
  });

  it('demo seed is idempotent', async () => {
    await asOwner();
    await db.exec(readFileSync(join(root, 'demo', 'demo_products.sql'), 'utf8'));
    expect((await rows(`select 1 from public.products where sku like 'DEMO-%'`))).toHaveLength(8);
    expect((await rows(`select 1 from public.product_variants where sku like 'DEMO-%'`))).toHaveLength(48);
  });
});

describe('public_reviews view', () => {
  it('shows only approved reviews, first name only, and no private data', async () => {
    await as(U.alice);
    await db.query(`insert into public.reviews (product_id, user_id, rating, title, comment) values ($1,$2,5,'Great','Loved it')`, [tee, U.alice]);
    await asAnon();
    expect(await rows(`select 1 from public.public_reviews`)).toHaveLength(0); // pending
    await as(U.staff);
    await db.query(`update public.reviews set status = 'approved'`);
    await asAnon();
    const r = await rows<Record<string, unknown>>(`select * from public.public_reviews`);
    expect(r).toHaveLength(1);
    expect(r[0].reviewer_name).toBe('Alice');
    expect(Object.keys(r[0])).not.toContain('user_id');
    expect(JSON.stringify(r[0])).not.toMatch(/example\.test|Rahman/);
  });

  it('feeds rating stats into storefront_products', async () => {
    await asAnon();
    const t = (await rows<{ review_count: number; avg_rating: string }>(`select review_count, avg_rating from public.storefront_products where sku = 'DEMO-TEE-001'`))[0];
    expect(t.review_count).toBe(1);
    expect(Number(t.avg_rating)).toBe(5);
  });

  it('does not let a customer review twice or approve their own review', async () => {
    await as(U.alice);
    await expect(db.query(`insert into public.reviews (product_id, user_id, rating) values ($1,$2,4)`, [tee, U.alice])).rejects.toThrow(/unique|duplicate/);
    const r = await db.query(`update public.reviews set status = 'approved' where user_id = $1`, [U.alice]);
    expect(r.affectedRows).toBe(0); // already approved -> not editable as pending
  });
});

describe('wishlist', () => {
  it('lets a customer keep a private wishlist', async () => {
    await as(U.alice);
    const w = (await rows<{ id: string }>(`insert into public.wishlists (user_id) values ($1) returning id`, [U.alice]))[0].id;
    await db.query(`insert into public.wishlist_items (wishlist_id, product_id) values ($1,$2)`, [w, tee]);
    await expect(db.query(`insert into public.wishlist_items (wishlist_id, product_id) values ($1,$2)`, [w, tee])).rejects.toThrow(/unique|duplicate/);
    await as(U.bob);
    expect(await rows(`select 1 from public.wishlist_items`)).toHaveLength(0);
    await expect(db.query(`insert into public.wishlist_items (wishlist_id, product_id) values ($1,$2)`, [w, tee])).rejects.toThrow(/row-level security/);
    await asAnon();
    await expect(db.query(`select 1 from public.wishlist_items`)).rejects.toThrow(/permission denied/);
  });
});

describe('catalogue admin permissions', () => {
  it('lets product managers manage variants, stock and categories but customers cannot', async () => {
    await as(U.pm);
    await db.query(`update public.inventory set quantity = 50, low_stock_threshold = 8 where variant_id = (select id from public.product_variants where sku = 'DEMO-TEE-001-M-BLA')`);
    await db.query(`insert into public.categories (slug, name, gender, parent_id) values ('demo-sub','Demo Sub','men', (select id from public.categories where slug = 't-shirt'))`);
    await as(U.alice);
    const r = await db.query(`update public.inventory set quantity = 9999`);
    expect(r.affectedRows).toBe(0);
    await expect(db.query(`insert into public.categories (slug, name) values ('x','x')`)).rejects.toThrow(/row-level security/);
  });

  it('refuses stock below reserved and deleting a category that still has products', async () => {
    await as(U.pm);
    await expect(db.query(`update public.inventory set reserved = 5, quantity = 2 where variant_id = (select id from public.product_variants where sku = 'DEMO-TEE-001-L-BLA')`)).rejects.toThrow();
    await expect(db.query(`delete from public.categories where slug = 't-shirt'`)).rejects.toThrow(/foreign key|violates/);
  });

  it('removes demo data cleanly', async () => {
    await asOwner();
    await db.exec(readFileSync(join(root, 'demo', 'remove_demo_products.sql'), 'utf8'));
    expect(await rows(`select 1 from public.products where sku like 'DEMO-%'`)).toHaveLength(0);
    expect(await rows(`select 1 from public.product_variants where sku like 'DEMO-%'`)).toHaveLength(0);
  });

  it('exposes the storefront views read-only (no writes through any API role)', async () => {
    for (const run of [asAnon, () => as(U.staff), () => as(U.pm)]) {
      await run();
      for (const v of ['storefront_products', 'public_reviews', 'variant_availability']) {
        await expect(db.query(`delete from public.${v}`), `delete ${v}`).rejects.toThrow(/permission denied|cannot delete|not allowed/i);
        await expect(db.query(`update public.${v} set id = id`), `update ${v}`).rejects.toThrow(/permission denied|cannot update|column/i);
      }
    }
  });
});
