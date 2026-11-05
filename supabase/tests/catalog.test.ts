import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const root = join(__dirname, '..');
const U = {
  superAdmin: '00000000-0000-0000-0000-000000000001',
  productMgr: '00000000-0000-0000-0000-000000000004',
  orderMgr: '00000000-0000-0000-0000-000000000003',
  alice: '00000000-0000-0000-0000-0000000000a1',
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
const rows = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows;

const ids: Record<string, string> = {};

async function addProduct(o: {
  slug: string; name: string; gender?: string; cat?: string; reg: number; sell: number; status?: string;
  flags?: Partial<Record<'is_featured' | 'is_bestseller' | 'is_new_arrival' | 'is_trending', boolean>>;
  sales?: number; created?: string;
}) {
  const cat = o.cat ? (await rows<{ id: string }>(`select id from public.categories where slug = $1`, [o.cat]))[0].id : null;
  const f = o.flags ?? {};
  const r = await rows<{ id: string }>(
    `insert into public.products (slug, sku, name, gender, category_id, regular_price, selling_price, status,
       is_featured, is_bestseller, is_new_arrival, is_trending, sales_count, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, coalesce($14::timestamptz, now())) returning id`,
    [o.slug, 'SKU-' + o.slug.toUpperCase(), o.name, o.gender ?? 'unisex', cat, o.reg, o.sell, o.status ?? 'active',
      !!f.is_featured, !!f.is_bestseller, !!f.is_new_arrival, !!f.is_trending, o.sales ?? 0, o.created ?? null],
  );
  ids[o.slug] = r[0].id;
  return r[0].id;
}
async function addVariant(slug: string, size: string | null, color: string | null, qty: number, active = true) {
  const v = await rows<{ id: string }>(
    `insert into public.product_variants (product_id, sku, size, color, is_active) values ($1, $2, $3, $4, $5) returning id`,
    [ids[slug], `${slug}-${size}-${color}`, size, color, active],
  );
  await db.query(`update public.inventory set quantity = $2 where variant_id = $1`, [v[0].id, qty]);
  return v[0].id;
}
const list = async (args: Record<string, unknown> = {}) => {
  const keys = Object.keys(args);
  const named = keys.map((k, i) => `${k} => $${i + 1}`).join(', ');
  return rows<{ product_id: string; total_count: string }>(`select * from public.list_products(${named})`, keys.map((k) => args[k]));
};
const slugsOf = async (args: Record<string, unknown> = {}) => {
  const r = await list(args);
  const inv = Object.fromEntries(Object.entries(ids).map(([s, id]) => [id, s]));
  return r.map((x) => inv[x.product_id]);
};

beforeAll(async () => {
  db = new PGlite();
  await db.exec(readFileSync(join(root, 'tests', 'supabase_stubs.sql'), 'utf8'));
  for (const f of readdirSync(join(root, 'migrations')).filter((x) => x.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(root, 'migrations', f), 'utf8'));
  }
  for (const [name, id] of Object.entries(U)) {
    await db.query(`insert into auth.users (id, email) values ($1, $2)`, [id, `${name}@example.test`]);
  }
  await db.query(`insert into public.user_roles (user_id, role) values ($1,'super_admin'), ($2,'product_manager'), ($3,'order_manager')`, [U.superAdmin, U.productMgr, U.orderMgr]);

  await addProduct({ slug: 'mens-tee', name: 'Cotton Tee', gender: 'men', cat: 't-shirt', reg: 800, sell: 600, flags: { is_new_arrival: true }, sales: 50, created: '2026-10-01' });
  await addProduct({ slug: 'mens-polo', name: 'Pique Polo', gender: 'men', cat: 'polo-shirt', reg: 1200, sell: 1200, flags: { is_bestseller: true, is_featured: true }, sales: 300, created: '2026-09-01' });
  await addProduct({ slug: 'womens-saree', name: 'Handloom Saree', gender: 'women', cat: 'saree', reg: 3000, sell: 2500, flags: { is_trending: true }, sales: 120, created: '2026-10-20' });
  await addProduct({ slug: 'unisex-hoodie', name: 'Fleece Hoodie', gender: 'unisex', cat: 'hoodie', reg: 1800, sell: 1500, sales: 10, created: '2026-10-25' });
  await addProduct({ slug: 'draft-item', name: 'Secret Draft', gender: 'men', reg: 500, sell: 500, status: 'draft' });
  await addProduct({ slug: 'percent-name', name: '100% Cotton Socks', gender: 'men', reg: 200, sell: 200, created: '2026-08-01' });

  await addVariant('mens-tee', 'M', 'Black', 5);
  await addVariant('mens-tee', 'L', 'White', 0);
  await addVariant('mens-polo', 'M', 'White', 3);
  await addVariant('mens-polo', 'XL', 'Black', 0);
  await addVariant('womens-saree', 'Free Size', 'Maroon', 2);
  await addVariant('unisex-hoodie', 'L', 'Black', 4, false); // inactive variant
  await db.query(`update public.inventory set reserved = 5 where variant_id = (select id from public.product_variants where sku = 'mens-tee-M-Black')`); // fully reserved

  const col = (await rows<{ id: string }>(`select id from public.collections where slug = 'winter'`))[0].id;
  await db.query(`insert into public.product_collections (product_id, collection_id) values ($1, $2)`, [ids['unisex-hoodie'], col]);
});
afterAll(async () => { await db.close(); });

describe('list_products (storefront)', () => {
  it('only ever returns active products, to anonymous visitors', async () => {
    await asAnon();
    const s = await slugsOf();
    expect(s).not.toContain('draft-item');
    expect(s).toHaveLength(5);
  });

  it('filters by gender, including unisex items', async () => {
    await asAnon();
    expect((await slugsOf({ p_gender: 'women' })).sort()).toEqual(['unisex-hoodie', 'womens-saree']);
    expect(await slugsOf({ p_gender: 'men' })).toContain('unisex-hoodie');
    expect(await slugsOf({ p_gender: 'men' })).not.toContain('womens-saree');
  });

  it('filters by category and by parent category (subcategories roll up)', async () => {
    await asAnon();
    expect(await slugsOf({ p_category: 't-shirt' })).toEqual(['mens-tee']);
    expect((await slugsOf({ p_category: 'men' })).sort()).toEqual(['mens-polo', 'mens-tee', 'unisex-hoodie']);
  });

  it('supports the collection pages', async () => {
    await asAnon();
    expect(await slugsOf({ p_collection: 'new-arrivals' })).toEqual(['mens-tee']);
    expect(await slugsOf({ p_collection: 'best-sellers' })).toEqual(['mens-polo']);
    expect(await slugsOf({ p_collection: 'trending' })).toEqual(['womens-saree']);
    expect(await slugsOf({ p_collection: 'featured' })).toEqual(['mens-polo']);
    expect((await slugsOf({ p_collection: 'special-offers' })).sort()).toEqual(['mens-tee', 'unisex-hoodie', 'womens-saree']);
    expect(await slugsOf({ p_collection: 'winter' })).toEqual(['unisex-hoodie']); // via product_collections
    expect(await slugsOf({ p_collection: 'no-such-collection' })).toEqual([]);
  });

  it('searches name/sku and treats % and _ literally', async () => {
    await asAnon();
    expect(await slugsOf({ p_q: 'polo' })).toEqual(['mens-polo']);
    expect(await slugsOf({ p_q: 'sku-mens-tee' })).toEqual(['mens-tee']);
    expect(await slugsOf({ p_q: 'saree' })).toEqual(['womens-saree']);
    expect(await slugsOf({ p_q: '100%' })).toEqual(['percent-name']); // not a wildcard
    expect(await slugsOf({ p_q: '%' })).toEqual(['percent-name']);
    expect(await slugsOf({ p_q: '_' })).toEqual([]);
    expect(await slugsOf({ p_q: 'secret' })).toEqual([]); // draft never leaks via search
  });

  it('filters by price range, new arrivals and discounts', async () => {
    await asAnon();
    expect((await slugsOf({ p_min_price: 1000, p_max_price: 1600 })).sort()).toEqual(['mens-polo', 'unisex-hoodie']);
    expect(await slugsOf({ p_new_only: true })).toEqual(['mens-tee']);
    expect((await slugsOf({ p_on_sale: true })).sort()).toEqual(['mens-tee', 'unisex-hoodie', 'womens-saree']);
  });

  it('matches size and colour on the SAME active variant', async () => {
    await asAnon();
    expect(await slugsOf({ p_sizes: ['M'] })).toEqual(expect.arrayContaining(['mens-tee', 'mens-polo']));
    expect(await slugsOf({ p_sizes: ['M'], p_colors: ['White'] })).toEqual(['mens-polo']); // tee has M/Black and L/White, not M/White
    expect(await slugsOf({ p_sizes: ['L'], p_colors: ['Black'] })).toEqual([]); // hoodie L/Black is inactive
  });

  it('availability uses stock minus reservations and ignores inactive variants', async () => {
    await asAnon();
    const s = await slugsOf({ p_in_stock: true });
    expect(s.sort()).toEqual(['mens-polo', 'womens-saree']); // tee: M fully reserved, L zero; hoodie variant inactive
  });

  it('sorts correctly', async () => {
    await asAnon();
    expect((await slugsOf({ p_sort: 'price_asc' }))[0]).toBe('percent-name');
    expect((await slugsOf({ p_sort: 'price_desc' }))[0]).toBe('womens-saree');
    expect((await slugsOf({ p_sort: 'best_selling' }))[0]).toBe('mens-polo');
    expect((await slugsOf({ p_sort: 'popular' }))[0]).toBe('womens-saree'); // trending first
    expect((await slugsOf({ p_sort: 'latest' }))[0]).toBe('unisex-hoodie');
  });

  it('paginates and reports the total', async () => {
    await asAnon();
    const p1 = await list({ p_limit: 2, p_offset: 0, p_sort: 'price_asc' });
    const p2 = await list({ p_limit: 2, p_offset: 2, p_sort: 'price_asc' });
    expect(p1).toHaveLength(2);
    expect(Number(p1[0].total_count)).toBe(5);
    expect(p2.map((x) => x.product_id)).not.toEqual(expect.arrayContaining(p1.map((x) => x.product_id)));
    expect((await list({ p_limit: 5000 })).length).toBeLessThanOrEqual(100); // capped
  });

  it('never exposes stock numbers', async () => {
    await asAnon();
    const r = await list();
    expect(Object.keys(r[0]).sort()).toEqual(['product_id', 'total_count']);
    expect(await rows(`select * from public.inventory`)).toHaveLength(0);
  });

  it('is callable by signed-in users too', async () => {
    await as(U.alice);
    expect((await list()).length).toBe(5);
  });
});

describe('catalog_facets', () => {
  it('reports sizes, colours and price range from active products only', async () => {
    await asAnon();
    const f = (await rows<{ catalog_facets: { sizes: string[]; colors: { name: string }[]; min_price: string; max_price: string } }>(`select public.catalog_facets()`))[0].catalog_facets;
    expect(f.sizes.sort()).toEqual(['Free Size', 'L', 'M', 'XL']);
    expect(f.colors.map((c) => c.name).sort()).toEqual(['Black', 'Maroon', 'White']);
    expect(Number(f.min_price)).toBe(200);
    expect(Number(f.max_price)).toBe(2500);
  });
});

describe('duplicate_product', () => {
  it('copies a product as a draft with new SKUs and zero stock', async () => {
    await as(U.productMgr);
    const newId = (await rows<{ duplicate_product: string }>(`select public.duplicate_product($1)`, [ids['mens-polo']]))[0].duplicate_product;
    const p = (await rows<{ status: string; sku: string; slug: string; name: string }>(`select status, sku, slug, name from public.products where id = $1`, [newId]))[0];
    expect(p.status).toBe('draft');
    expect(p.sku).not.toBe('SKU-MENS-POLO');
    expect(p.name).toBe('Pique Polo (Copy)');
    const v = await rows<{ sku: string; quantity: number }>(
      `select v.sku, i.quantity from public.product_variants v join public.inventory i on i.variant_id = v.id where v.product_id = $1 order by v.sku`, [newId]);
    expect(v).toHaveLength(2);
    expect(v.every((x) => x.quantity === 0)).toBe(true);
    const originals = await rows<{ sku: string }>(`select sku from public.product_variants where product_id = $1`, [ids['mens-polo']]);
    expect(v.map((x) => x.sku).some((s) => originals.map((o) => o.sku).includes(s))).toBe(false);
    await asOwner();
    expect(await rows(`select 1 from public.admin_activity_logs where action = 'product.duplicated'`)).toHaveLength(1);
  });

  it('is refused for customers and other roles', async () => {
    for (const uid of [U.alice, U.orderMgr]) {
      await as(uid);
      await expect(db.query(`select public.duplicate_product($1)`, [ids['mens-tee']])).rejects.toThrow(/Not authorised/);
    }
    await asAnon();
    await expect(db.query(`select public.duplicate_product($1)`, [ids['mens-tee']])).rejects.toThrow();
  });
});

describe('set_main_image', () => {
  it('moves the main flag atomically and is role-checked', async () => {
    await asOwner();
    const a = (await rows<{ id: string }>(`insert into public.product_images (product_id, url, is_main, sort_order) values ($1,'a.jpg',true,0) returning id`, [ids['mens-tee']]))[0].id;
    const b = (await rows<{ id: string }>(`insert into public.product_images (product_id, url, is_main, sort_order) values ($1,'b.jpg',false,1) returning id`, [ids['mens-tee']]))[0].id;
    await as(U.productMgr);
    await db.query(`select public.set_main_image($1)`, [b]);
    await asOwner();
    const r = await rows<{ id: string; is_main: boolean }>(`select id, is_main from public.product_images where product_id = $1`, [ids['mens-tee']]);
    expect(r.filter((x) => x.is_main).map((x) => x.id)).toEqual([b]);
    expect(r.find((x) => x.id === a)?.is_main).toBe(false);
    await as(U.alice);
    await expect(db.query(`select public.set_main_image($1)`, [a])).rejects.toThrow(/Not authorised/);
  });
});

describe('admin inventory edits', () => {
  it('product managers can set stock; reserved can never exceed quantity', async () => {
    await as(U.productMgr);
    const v = (await rows<{ variant_id: string }>(`select variant_id from public.inventory where reserved = 5`))[0].variant_id;
    await expect(db.query(`update public.inventory set quantity = 2 where variant_id = $1`, [v])).rejects.toThrow(); // check constraint
    await db.query(`update public.inventory set quantity = 20 where variant_id = $1`, [v]);
    await as(U.orderMgr);
    expect((await db.query(`update public.inventory set quantity = 99 where variant_id = $1`, [v])).affectedRows).toBe(0);
  });
});
