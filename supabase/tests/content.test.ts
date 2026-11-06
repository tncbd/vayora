import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const root = join(__dirname, '..');
const SUPER = '00000000-0000-0000-0000-0000000000a1';
const ADMIN = '00000000-0000-0000-0000-0000000000a2';
const ORDMGR = '00000000-0000-0000-0000-0000000000a3';
const PRODMGR = '00000000-0000-0000-0000-0000000000a4';
const CUST = '00000000-0000-0000-0000-0000000000a5';
let db: PGlite;

async function role(r: 'anon' | 'authenticated' | 'service_role' | 'owner', uid?: string) {
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [JSON.stringify(uid ? { sub: uid, role: r } : { role: r })]);
  if (r !== 'owner') await db.exec(`set role ${r}`);
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rows = async <T = Record<string, any>>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(readFileSync(join(root, 'tests', 'supabase_stubs.sql'), 'utf8'));
  for (const f of readdirSync(join(root, 'migrations')).filter((x) => x.endsWith('.sql')).sort()) await db.exec(readFileSync(join(root, 'migrations', f), 'utf8'));
  for (const [id, e] of [[SUPER, 'super'], [ADMIN, 'admin'], [ORDMGR, 'ord'], [PRODMGR, 'prod'], [CUST, 'cust']]) await db.query(`insert into auth.users (id, email) values ($1, $2)`, [id, e + '@example.test']);
  await db.exec(`insert into public.user_roles (user_id, role) values ('${SUPER}','super_admin'),('${ADMIN}','admin'),('${ORDMGR}','order_manager'),('${PRODMGR}','product_manager')`);
  await db.exec(`insert into public.profiles (id, full_name, phone) values ('${CUST}', 'Karim Hossain', '01711111111') on conflict (id) do update set full_name = excluded.full_name, phone = excluded.phone`);
});
afterAll(async () => { await db.close(); });

describe('contact form', () => {
  const send = (n: string, p: string | null, e: string | null, m: string) => rows(`select public.submit_contact_message($1,$2,$3,$4)`, [n, p, e, m]);
  it('stores a valid message for anonymous visitors', async () => {
    await role('anon');
    await send('Rahim', '01712345678', null, 'Is the blue panjabi available in XL?');
    await role('owner');
    const m = await rows(`select * from public.contact_messages`);
    expect(m).toHaveLength(1);
    expect(m[0].status).toBe('new');
  });
  it('validates input and has no direct table access', async () => {
    await role('anon');
    await expect(send('R', '01712345678', null, 'hello there')).rejects.toThrow(/name/);
    await expect(send('Rahim', null, null, 'hello there')).rejects.toThrow(/phone number or an email/);
    await expect(send('Rahim', '123', null, 'hello there')).rejects.toThrow(/mobile/);
    await expect(send('Rahim', null, 'nope', 'hello there')).rejects.toThrow(/email/);
    await expect(send('Rahim', '01712345678', null, 'hi')).rejects.toThrow(/message/);
    await expect(send('Rahim', '01712345678', null, 'x'.repeat(5001))).rejects.toThrow(/message/);
    await expect(rows(`insert into public.contact_messages (name, message) values ('x','hello there')`)).rejects.toThrow();
    expect(await rows(`select * from public.contact_messages`)).toHaveLength(0); // anon cannot read
  });
  it('throttles repeated messages from the same contact', async () => {
    await role('anon');
    for (let i = 0; i < 5; i++) await send('Spammer', '01799999999', null, 'message number ' + i);
    await expect(send('Spammer', '01799999999', null, 'one more please')).rejects.toThrow(/several messages/);
    await send('Someone else', '01788888888', null, 'a different person'); // others are unaffected
  });
});

describe('newsletter', () => {
  it('subscribes without revealing whether the address existed', async () => {
    await role('anon');
    await rows(`select public.subscribe_newsletter(' Fan@Example.com ')`);
    await rows(`select public.subscribe_newsletter('fan@example.com')`);
    await role('owner');
    const s = await rows(`select * from public.newsletter_subscribers`);
    expect(s).toHaveLength(1);
    expect(s[0].email).toBe('fan@example.com');
    await role('anon');
    await expect(rows(`select public.subscribe_newsletter('not-an-email')`)).rejects.toThrow(/email/);
    expect(await rows(`select * from public.newsletter_subscribers`)).toHaveLength(0);
  });
});

describe('dashboard stats', () => {
  it('is staff only, and hides revenue from catalogue-only staff', async () => {
    await role('anon');
    await expect(rows(`select public.admin_dashboard_stats()`)).rejects.toThrow(/permission denied/);
    await role('authenticated', CUST);
    await expect(rows(`select public.admin_dashboard_stats()`)).rejects.toThrow(/Not authorised/);
    await role('authenticated', ADMIN);
    const a = (await rows<{ s: Record<string, any> }>(`select public.admin_dashboard_stats() as s`))[0].s;
    expect(a.revenue_30d).toBe(0);
    expect(a.daily).toHaveLength(14);
    expect(a.new_messages).toBeGreaterThan(0);
    await role('authenticated', PRODMGR);
    const p = (await rows<{ s: Record<string, any> }>(`select public.admin_dashboard_stats() as s`))[0].s;
    expect(p.revenue_30d).toBeNull();
    expect(p.daily[0].revenue).toBeNull();
    expect(p.low_stock).toBeDefined();
  });
});

describe('customers and staff lists', () => {
  it('lists customers for order staff with order totals', async () => {
    await role('authenticated', ORDMGR);
    const c = await rows(`select * from public.admin_list_customers('karim')`);
    expect(c).toHaveLength(1);
    expect(c[0].full_name).toBe('Karim Hossain');
    expect(Number(c[0].orders_count)).toBe(0);
    expect(Number((await rows(`select * from public.admin_list_customers(null, 500, 0)`)).length)).toBeGreaterThanOrEqual(5);
    await role('authenticated', PRODMGR);
    await expect(rows(`select * from public.admin_list_customers()`)).rejects.toThrow(/Not authorised/);
    await role('authenticated', CUST);
    await expect(rows(`select * from public.admin_list_customers()`)).rejects.toThrow(/Not authorised/);
  });
  it('staff list and email lookup are super admin only', async () => {
    await role('authenticated', SUPER);
    const staff = await rows(`select * from public.admin_list_staff()`);
    expect(staff.map((s) => s.email).sort()).toEqual(['admin@example.test', 'ord@example.test', 'prod@example.test', 'super@example.test']);
    expect((await rows(`select public.admin_find_user('CUST@example.test') as id`))[0].id).toBe(CUST);
    await expect(rows(`select public.admin_find_user('ghost@example.test')`)).rejects.toThrow(/No account/);
    await role('authenticated', ADMIN);
    await expect(rows(`select * from public.admin_list_staff()`)).rejects.toThrow(/Not authorised/);
    await expect(rows(`select public.admin_find_user('cust@example.test')`)).rejects.toThrow(/Not authorised/);
  });
  it('only a super admin can grant roles, and the last super admin cannot be removed', async () => {
    await role('authenticated', ADMIN);
    await expect(rows(`insert into public.user_roles (user_id, role) values ($1, 'admin')`, [CUST])).rejects.toThrow();
    await role('authenticated', SUPER);
    await rows(`insert into public.user_roles (user_id, role) values ($1, 'payment_manager')`, [CUST]);
    await expect(rows(`delete from public.user_roles where user_id = $1 and role = 'super_admin'`, [SUPER])).rejects.toThrow(/last super_admin/);
  });
});

describe('audit trail', () => {
  it('records who changed content and settings, without storing the values', async () => {
    await role('authenticated', ADMIN);
    await rows(`update public.site_settings set value = '"New announcement"' where key = 'announcement_text'`);
    await rows(`insert into public.banners (title) values ('Eid Sale')`);
    await role('owner');
    const logs = await rows(`select actor_id, action, entity_type, details from public.admin_activity_logs where actor_id = $1 order by created_at`, [ADMIN]);
    expect(logs.map((l) => l.action)).toEqual(['site_settings.update', 'banners.insert']);
    expect(logs[0].details.label).toBe('announcement_text');
    expect(JSON.stringify(logs)).not.toContain('New announcement');
    await role('authenticated', ADMIN);
    expect((await rows(`select * from public.admin_activity_logs`)).length).toBeGreaterThan(0);
    await role('authenticated', ORDMGR);
    expect(await rows(`select * from public.admin_activity_logs`)).toHaveLength(0); // not for order staff
  });
});

describe('content RLS', () => {
  it('visitors read only live content; only admins write', async () => {
    await role('owner');
    await db.exec(`insert into public.banners (title, is_active) values ('Hidden', false)`);
    await role('anon');
    const b = await rows<{ title: string }>(`select title from public.banners`);
    expect(b.map((x) => x.title)).toEqual(['Eid Sale']);
    await expect(rows(`update public.banners set title = 'Hacked'`)).rejects.toThrow();
    await role('authenticated', ORDMGR);
    expect(await rows(`update public.site_settings set value = '"x"' where key = 'store_name' returning key`)).toHaveLength(0);
  });
});
