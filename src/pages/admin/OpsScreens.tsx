import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Field, FormMessage } from '@/components/ui/Field';
import { Card, PageTitle, Pill, TableWrap, cell, dangerBtn, smallBtn, thCls } from '@/components/admin/AdminUi';
import { formatBDT } from '@/lib/format';
import { APP_ROLES, ROLE_LABELS, sectionsFor, type AppRole } from '@/lib/roles';
import * as api from '@/lib/adminContent';
import type { Row, SettingValues, Stats } from '@/lib/adminContent';

const errText = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong.');
const when = (s?: string | null) => (s ? new Date(s).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '');

function download(name: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

/** Loads rows, tracks loading/error, and offers reload. */
function useRows<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(() => {
    setLoading(true);
    load().then((d) => { setData(d); setError(null); }).catch((e) => setError(errText(e))).finally(() => setLoading(false));
  }, [load]);
  useEffect(() => { reload(); }, [reload]);
  return { data, error, loading, reload, setError };
}

// ---------------- Dashboard ----------------
const Stat = ({ label, value, to, warn }: { label: string; value: string | number; to?: string; warn?: boolean }) => {
  const inner = (
    <div className={`border bg-white p-4 ${warn ? 'border-amber-400' : 'border-line'}`}>
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-2 text-2xl font-medium text-primary">{value}</p>
    </div>
  );
  return to ? <Link to={to} className="block hover:opacity-80">{inner}</Link> : inner;
};

export function Dashboard() {
  const { roles } = useAuth();
  const load = useCallback(() => api.getStats(), []);
  const { data: s, error, loading } = useRows<Stats>(load);
  const links = sectionsFor(roles).filter((x) => x.path);
  const max = s ? Math.max(1, ...s.daily.map((d) => d.orders)) : 1;
  return (
    <div>
      <PageTitle title="Dashboard" subtitle="What needs your attention today." />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      {loading && <p role="status" className="text-sm text-muted">Loading…</p>}
      {s && (
        <div className="space-y-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Orders today" value={s.orders_today} />
            <Stat label="Orders (30 days)" value={s.orders_30d} />
            {s.revenue_today !== null && <Stat label="Sales today" value={formatBDT(s.revenue_today)} />}
            {s.revenue_30d !== null && <Stat label="Sales (30 days)" value={formatBDT(s.revenue_30d)} />}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Orders to review" value={s.awaiting_review} to="/admin/orders" warn={s.awaiting_review > 0} />
            <Stat label="Payments to verify" value={s.payments_to_verify} to="/admin/payment-verification" warn={s.payments_to_verify > 0} />
            <Stat label="Waiting for payment" value={s.awaiting_payment} to="/admin/payment-verification" />
            <Stat label="Ready to ship" value={s.to_ship} to="/admin/orders" />
            <Stat label="Low stock" value={s.low_stock} to="/admin/inventory" warn={s.low_stock > 0} />
            <Stat label="Out of stock" value={s.out_of_stock} to="/admin/inventory" warn={s.out_of_stock > 0} />
            <Stat label="New messages" value={s.new_messages} to="/admin/messages" warn={s.new_messages > 0} />
            <Stat label="Reviews to approve" value={s.pending_reviews} to="/admin/reviews" warn={s.pending_reviews > 0} />
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            <Card title="Orders, last 14 days" className="lg:col-span-2">
              <div className="flex h-36 items-end gap-1.5" role="img" aria-label="Orders per day for the last 14 days">
                {s.daily.map((d) => (
                  <div key={d.date} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${d.date}: ${d.orders} orders`}>
                    <span className="text-[10px] text-muted">{d.orders || ''}</span>
                    <div className="w-full bg-accent" style={{ height: `${Math.max(2, (d.orders / max) * 100)}%` }} />
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Top products (30 days)">
              {s.top_products.length === 0 ? <p className="text-sm text-muted">No sales yet.</p> : (
                <ol className="space-y-2 text-sm">{s.top_products.map((p) => <li key={p.name} className="flex justify-between gap-3"><span className="truncate">{p.name}</span><span className="text-muted">{p.units} sold</span></li>)}</ol>
              )}
            </Card>
          </div>
        </div>
      )}
      <h2 className="mb-3 mt-10 text-xl font-medium">All sections</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((x) => (
          <li key={x.key}><Link to={x.path!} className="flex items-center justify-between border border-line bg-white px-4 py-3 text-sm hover:border-primary"><span className="font-medium text-primary">{x.label}</span><span className="text-[10px] uppercase tracking-widest text-accent-dark">Open</span></Link></li>
        ))}
      </ul>
    </div>
  );
}

// ---------------- Website settings ----------------
const SEO_GROUP = 'Search & Analytics';
function SettingsForm({ seo }: { seo: boolean }) {
  const [v, setV] = useState<SettingValues | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { api.loadSettings().then(setV).catch((e) => setMsg({ kind: 'error', text: errText(e) })); }, []);
  const groups = [...new Set(api.SETTING_DEFS.map((d) => d.group))].filter((g) => (g === SEO_GROUP) === seo);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v) return;
    const er = api.validateSettings(v);
    setErrors(er);
    if (Object.keys(er).length) { setMsg({ kind: 'error', text: 'Please fix the highlighted fields.' }); return; }
    setSaving(true); setMsg(null);
    try { await api.saveSettings(v); setMsg({ kind: 'success', text: 'Saved. The website shows the new details within a minute.' }); } catch (x) { setMsg({ kind: 'error', text: errText(x) }); } finally { setSaving(false); }
  };
  return (
    <div>
      <PageTitle title={seo ? 'SEO Settings' : 'Website Settings'} subtitle={seo ? 'How your shop looks in Google and when shared, plus optional analytics. Product and page titles and descriptions are edited on the product or page itself.' : 'Store name, contact details, social links, announcement bar and footer.'} />
      {msg && <div className="mb-4"><FormMessage kind={msg.kind}>{msg.text}</FormMessage></div>}
      {!v && !msg && <p role="status" className="text-sm text-muted">Loading…</p>}
      {v && (
        <form onSubmit={save} noValidate className="space-y-5">
          {groups.map((g) => (
            <Card key={g} title={g}>
              <div className="grid max-w-3xl gap-5 sm:grid-cols-2">
                {api.SETTING_DEFS.filter((d) => d.group === g).map((d) =>
                  d.kind === 'bool' ? (
                    <label key={d.key} className="flex items-center gap-3 text-sm sm:col-span-2"><input type="checkbox" checked={!!v[d.key]} onChange={(e) => setV({ ...v, [d.key]: e.target.checked })} />{d.label}</label>
                  ) : (
                    <div key={d.key} className={d.kind === 'textarea' ? 'sm:col-span-2' : ''}>
                      <Field label={d.label} error={errors[d.key]} hint={d.hint}>
                        {d.kind === 'textarea'
                          ? <textarea className="input min-h-[80px]" value={String(v[d.key])} onChange={(e) => setV({ ...v, [d.key]: e.target.value })} />
                          : <input className="input" value={String(v[d.key])} inputMode={d.kind === 'phone' || d.kind === 'whatsapp' ? 'tel' : undefined} onChange={(e) => setV({ ...v, [d.key]: e.target.value })} />}
                      </Field>
                    </div>
                  ))}
              </div>
            </Card>
          ))}
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Settings'}</Button>
        </form>
      )}
    </div>
  );
}

export const WebsiteSettings = () => <SettingsForm seo={false} />;
export const SeoSettings = () => <SettingsForm seo />;

// ---------------- Reviews ----------------
export function Reviews() {
  const [tab, setTab] = useState<api.ReviewFilter>('pending');
  const load = useCallback(() => api.listReviews(tab), [tab]);
  const { data, error, loading, reload, setError } = useRows<Row[]>(load);
  const act = async (fn: () => Promise<void>) => { try { await fn(); reload(); } catch (e) { setError(errText(e)); } };
  return (
    <div>
      <PageTitle title="Reviews" subtitle="Customer reviews appear on the product page only after you approve them." />
      <div className="mb-4 flex gap-2">{(['pending', 'approved', 'rejected'] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={`${smallBtn} ${tab === t ? '!border-primary bg-primary !text-white' : ''}`}>{t}</button>)}</div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      {loading && <p role="status" className="text-sm text-muted">Loading…</p>}
      {data && data.length === 0 && !loading && <p className="text-sm text-muted">No {tab} reviews.</p>}
      <ul className="space-y-3">
        {data?.map((r) => (
          <li key={r.id} className="border border-line bg-white p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{r.products?.name ?? 'Product'} <span className="ml-2 text-accent-dark">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span></p>
              <span className="text-xs text-muted">{when(r.created_at)}</span>
            </div>
            {r.title && <p className="mt-2 font-medium">{r.title}</p>}
            {r.comment && <p className="mt-1 whitespace-pre-line text-muted">{r.comment}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {tab !== 'approved' && <button className={smallBtn} onClick={() => act(() => api.setReviewStatus(r.id, 'approved'))}>Approve</button>}
              {tab !== 'rejected' && <button className={smallBtn} onClick={() => act(() => api.setReviewStatus(r.id, 'rejected'))}>Reject</button>}
              <button className={dangerBtn} onClick={() => { if (window.confirm('Delete this review permanently?')) void act(() => api.deleteReview(r.id)); }}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------- Newsletter ----------------
export function Newsletter() {
  const { data, error, loading, reload, setError } = useRows<Row[]>(api.listSubscribers);
  const act = async (fn: () => Promise<void>) => { try { await fn(); reload(); } catch (e) { setError(errText(e)); } };
  return (
    <div>
      <PageTitle title="Newsletter" subtitle="People who signed up on the website. Export the list to use in your email tool.">
        <button className={smallBtn} disabled={!data?.length} onClick={() => data && download('newsletter-subscribers.csv', api.subscribersCsv(data))}>Export CSV</button>
      </PageTitle>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      {loading && <p role="status" className="text-sm text-muted">Loading…</p>}
      {data && (data.length === 0 ? <p className="text-sm text-muted">No subscribers yet.</p> : (
        <TableWrap><table className="w-full"><thead><tr><th className={thCls}>Email</th><th className={thCls}>Joined</th><th className={thCls}>Status</th><th className={thCls} /></tr></thead>
          <tbody className="divide-y divide-line">{data.map((r) => (
            <tr key={r.id}><td className={cell}>{r.email}</td><td className={cell}>{when(r.created_at)}</td><td className={cell}><Pill tone={r.is_active ? 'ok' : 'muted'}>{r.is_active ? 'Active' : 'Unsubscribed'}</Pill></td>
              <td className={`${cell} space-x-2 text-right`}><button className={smallBtn} onClick={() => act(() => api.setSubscriberActive(r.id, !r.is_active))}>{r.is_active ? 'Unsubscribe' : 'Resubscribe'}</button><button className={dangerBtn} onClick={() => { if (window.confirm(`Delete ${r.email}?`)) void act(() => api.deleteSubscriber(r.id)); }}>Delete</button></td></tr>
          ))}</tbody></table></TableWrap>
      ))}
    </div>
  );
}

// ---------------- Contact messages ----------------
export function Messages() {
  const [f, setF] = useState<api.MessageFilter>('new');
  const load = useCallback(() => api.listMessages(f), [f]);
  const { data, error, loading, reload, setError } = useRows<Row[]>(load);
  const act = async (fn: () => Promise<void>) => { try { await fn(); reload(); } catch (e) { setError(errText(e)); } };
  return (
    <div>
      <PageTitle title="Contact Messages" subtitle="Messages sent from the Contact page. Reply by phone, WhatsApp or email, then mark as resolved." />
      <div className="mb-4 flex gap-2">{(['new', 'read', 'resolved', 'all'] as const).map((t) => <button key={t} onClick={() => setF(t)} className={`${smallBtn} ${f === t ? '!border-primary bg-primary !text-white' : ''}`}>{t}</button>)}</div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      {loading && <p role="status" className="text-sm text-muted">Loading…</p>}
      {data && data.length === 0 && !loading && <p className="text-sm text-muted">No messages here.</p>}
      <ul className="space-y-3">
        {data?.map((m) => (
          <li key={m.id} className="border border-line bg-white p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{m.name} <Pill tone={m.status === 'new' ? 'warn' : m.status === 'resolved' ? 'ok' : 'muted'}>{m.status}</Pill></p>
              <span className="text-xs text-muted">{when(m.created_at)}</span>
            </div>
            <p className="mt-1 text-xs text-muted">
              {m.phone && <a className="link-underline mr-3" href={`tel:${String(m.phone).replace(/[^0-9+]/g, '')}`}>{m.phone}</a>}
              {m.email && <a className="link-underline" href={`mailto:${m.email}`}>{m.email}</a>}
            </p>
            <p className="mt-2 whitespace-pre-line">{m.message}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {m.status !== 'read' && <button className={smallBtn} onClick={() => act(() => api.setMessageStatus(m.id, 'read'))}>Mark read</button>}
              {m.status !== 'resolved' && <button className={smallBtn} onClick={() => act(() => api.setMessageStatus(m.id, 'resolved'))}>Resolved</button>}
              {m.status !== 'new' && <button className={smallBtn} onClick={() => act(() => api.setMessageStatus(m.id, 'new'))}>Mark new</button>}
              <button className={dangerBtn} onClick={() => { if (window.confirm('Delete this message?')) void act(() => api.deleteMessage(m.id)); }}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------- Customers ----------------
const PAGE = 25;
export function Customers() {
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const load = useCallback(() => api.listCustomers(term, page, PAGE), [term, page]);
  const { data, error, loading } = useRows(load);
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE)) : 1;
  return (
    <div>
      <PageTitle title="Customers" subtitle="People who created an account. Guest orders appear under Orders.">
        <button className={smallBtn} disabled={!data?.rows.length} onClick={() => data && download('customers.csv', api.customersCsv(data.rows))}>Export this page (CSV)</button>
      </PageTitle>
      <form className="mb-4 flex max-w-md gap-2" onSubmit={(e) => { e.preventDefault(); setPage(1); setTerm(q); }}>
        <input className="input" placeholder="Search name, email or phone" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search customers" />
        <Button type="submit" className="!px-5 !py-2.5">Search</Button>
      </form>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      {loading && <p role="status" className="text-sm text-muted">Loading…</p>}
      {data && (data.rows.length === 0 ? <p className="text-sm text-muted">No customers found.</p> : (
        <>
          <TableWrap><table className="w-full"><thead><tr>{['Name', 'Contact', 'Joined', 'Orders', 'Spent', 'Last order'].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-line">{data.rows.map((c) => (
              <tr key={c.id}><td className={cell}>{c.full_name || '—'}</td><td className={cell}><div>{c.email}</div><div className="text-xs text-muted">{c.phone}</div></td><td className={cell}>{when(c.joined_at)}</td><td className={cell}>{c.orders_count}</td><td className={cell}>{formatBDT(Number(c.total_spent))}</td><td className={cell}>{when(c.last_order_at) || '—'}</td></tr>
            ))}</tbody></table></TableWrap>
          <div className="mt-4 flex items-center justify-between text-sm text-muted">
            <span>{data.total} customers</span>
            <span className="flex items-center gap-2"><button className={smallBtn} disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>Page {page} of {pages}<button className={smallBtn} disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button></span>
          </div>
        </>
      ))}
    </div>
  );
}

// ---------------- Admin users & roles ----------------
const ROLE_HELP: Record<AppRole, string> = {
  super_admin: 'Everything, including staff and roles.',
  admin: 'Everything except staff and roles.',
  order_manager: 'Orders and customers.',
  product_manager: 'Products, categories and inventory (no sales figures).',
  payment_manager: 'Payment settings and verification.',
};

export function AdminUsers() {
  const { user } = useAuth();
  const { data, error, loading, reload, setError } = useRows(api.listStaff);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AppRole>('order_manager');
  const [msg, setMsg] = useState<string | null>(null);
  const grant = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null); setError(null);
    if (!user) return;
    try { await api.grantRole(email, role, user.id); setEmail(''); setMsg('Role added.'); reload(); } catch (x) { setError(errText(x)); }
  };
  const revoke = async (id: string, r: AppRole, who: string) => {
    if (!window.confirm(`Remove "${ROLE_LABELS[r]}" from ${who}?`)) return;
    try { await api.revokeRole(id, r); reload(); } catch (x) { setError(errText(x)); }
  };
  return (
    <div>
      <PageTitle title="Admin Users" subtitle="Give a person access to the admin panel. They must first create a normal account on the website with their email." />
      {error && <div className="mb-4"><FormMessage kind="error">{error}</FormMessage></div>}
      {msg && <div className="mb-4"><FormMessage kind="success">{msg}</FormMessage></div>}
      <Card title="Add a role">
        <form onSubmit={grant} className="grid max-w-3xl gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <Field label="Account email"><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Role"><select className="input" value={role} onChange={(e) => setRole(e.target.value as AppRole)}>{APP_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select></Field>
          <Button type="submit">Add</Button>
        </form>
      </Card>
      <h2 className="mb-3 mt-8 text-xl font-medium">Current staff</h2>
      {loading && <p role="status" className="text-sm text-muted">Loading…</p>}
      {data && (
        <TableWrap><table className="w-full"><thead><tr><th className={thCls}>Person</th><th className={thCls}>Roles</th></tr></thead>
          <tbody className="divide-y divide-line">{data.map((s) => (
            <tr key={s.user_id}><td className={cell}><div className="font-medium">{s.full_name || s.email}</div><div className="text-xs text-muted">{s.email}{s.user_id === user?.id ? ' (you)' : ''}</div></td>
              <td className={cell}><div className="flex flex-wrap gap-2">{s.roles.map((r) => (
                <span key={r} className="inline-flex items-center gap-2 border border-line px-2 py-1 text-xs">{ROLE_LABELS[r]}<button aria-label={`Remove ${ROLE_LABELS[r]} from ${s.email}`} className="text-red-700" onClick={() => revoke(s.user_id, r, s.email)}>×</button></span>
              ))}</div></td></tr>
          ))}</tbody></table></TableWrap>
      )}
      <p className="mt-3 text-xs text-muted">The last Super Admin cannot be removed.</p>
    </div>
  );
}

export function RolesPermissions() {
  return (
    <div>
      <PageTitle title="Roles & Permissions" subtitle="What each role can open. These limits are enforced by the database, not only hidden in the menu." />
      <TableWrap><table className="w-full"><thead><tr><th className={thCls}>Role</th><th className={thCls}>Can do</th><th className={thCls}>Sections</th></tr></thead>
        <tbody className="divide-y divide-line">{APP_ROLES.map((r) => (
          <tr key={r}><td className={`${cell} font-medium`}>{ROLE_LABELS[r]}</td><td className={cell}>{ROLE_HELP[r]}</td><td className={`${cell} text-xs text-muted`}>{sectionsFor([r]).filter((s) => s.path).map((s) => s.label).join(', ')}</td></tr>
        ))}</tbody></table></TableWrap>
      <p className="mt-3 text-xs text-muted">To give or remove a role, use Admin Users.</p>
    </div>
  );
}

// ---------------- Activity logs ----------------
export function ActivityLogs() {
  const [page, setPage] = useState(1);
  const load = useCallback(() => api.listLogs(page, 30), [page]);
  const { data, error, loading } = useRows(load);
  const pages = data ? Math.max(1, Math.ceil(data.total / 30)) : 1;
  return (
    <div>
      <PageTitle title="Activity Logs" subtitle="Who changed what, and when. Entries cannot be edited." />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      {loading && <p role="status" className="text-sm text-muted">Loading…</p>}
      {data && (data.rows.length === 0 ? <p className="text-sm text-muted">Nothing logged yet.</p> : (
        <>
          <TableWrap><table className="w-full"><thead><tr>{['When', 'Who', 'Action', 'Item'].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-line">{data.rows.map((l) => (
              <tr key={l.id}><td className={cell}>{when(l.created_at)}</td><td className={cell}>{l.actor}</td><td className={cell}>{l.action}</td><td className={`${cell} text-xs text-muted`}>{l.entity_type}{l.details?.label ? ` · ${String(l.details.label)}` : l.details?.order_number ? ` · ${String(l.details.order_number)}` : ''}</td></tr>
            ))}</tbody></table></TableWrap>
          <div className="mt-4 flex items-center justify-end gap-2 text-sm text-muted"><button className={smallBtn} disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>Page {page} of {pages}<button className={smallBtn} disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button></div>
        </>
      ))}
    </div>
  );
}
