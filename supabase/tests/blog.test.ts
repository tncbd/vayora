import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const root = join(__dirname, '..');
const ADMIN = '00000000-0000-0000-0000-0000000000b2';
const PM = '00000000-0000-0000-0000-0000000000b3';
let db: PGlite;
async function role(r: 'anon' | 'authenticated' | 'owner', uid?: string) {
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [JSON.stringify(uid ? { sub: uid, role: r } : { role: r })]);
  if (r !== 'owner') await db.exec(`set role ${r}`);
}
const slugs = async () => (await db.query<{ slug: string }>(`select slug from public.blog_posts order by slug`)).rows.map((r) => r.slug);

beforeAll(async () => {
  db = new PGlite();
  await db.exec(readFileSync(join(root, 'tests', 'supabase_stubs.sql'), 'utf8'));
  for (const f of readdirSync(join(root, 'migrations')).filter((x) => x.endsWith('.sql')).sort()) await db.exec(readFileSync(join(root, 'migrations', f), 'utf8'));
  for (const [id, e] of [[ADMIN, 'admin'], [PM, 'pm']]) await db.query(`insert into auth.users (id, email) values ($1, $2)`, [id, e + '@example.test']);
  await db.exec(`insert into public.user_roles (user_id, role) values ('${ADMIN}','admin'),('${PM}','product_manager')`);
  await db.exec(`insert into public.blog_posts (slug, title, content, is_published, published_at) values
    ('live', 'Live', 'x', true, now() - interval '1 day'),
    ('live-no-date', 'Live2', 'x', true, null),
    ('draft', 'Draft', 'x', false, null),
    ('scheduled', 'Later', 'x', true, now() + interval '2 days')`);
});
afterAll(async () => { await db.close(); });

describe('blog access', () => {
  it('visitors see only published posts whose date has passed', async () => {
    await role('anon');
    expect(await slugs()).toEqual(['live', 'live-no-date']);
  });
  it('visitors cannot write', async () => {
    await role('anon');
    await expect(db.query(`insert into public.blog_posts (slug, title, content) values ('hack','x','x')`)).rejects.toThrow(/permission denied/);
  });
  it('admins see drafts and can publish; slugs are validated', async () => {
    await role('authenticated', ADMIN);
    expect(await slugs()).toHaveLength(4);
    await db.query(`update public.blog_posts set is_published = true where slug = 'draft'`);
    await expect(db.query(`insert into public.blog_posts (slug, title, content) values ('Bad Slug','x','x')`)).rejects.toThrow();
  });
  it('other staff roles and customers cannot manage posts', async () => {
    await role('authenticated', PM);
    await expect(db.query(`insert into public.blog_posts (slug, title, content) values ('pm','x','x')`)).rejects.toThrow(/row-level security/);
    expect(await slugs()).toEqual(['draft', 'live', 'live-no-date']);
  });
});
