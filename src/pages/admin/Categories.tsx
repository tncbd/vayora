import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { adminDeleteCategory, adminListCategories, adminSaveCategory, type AdminCategory } from '@/lib/adminApi';
import { flattenCategories, selfAndDescendantIds } from '@/lib/categoryTree';
import { slugify } from '@/lib/format';
import { friendlyDbError } from '@/lib/adminCatalog';
import { Button } from '@/components/ui/Button';
import { Field, FormMessage } from '@/components/ui/Field';
import { Card, Pill, TableWrap, PageTitle, cell, dangerBtn, smallBtn, thCls } from '@/components/admin/AdminUi';

const schema = z.object({
  name: z.string().trim().min(2, 'Enter a name').max(80),
  slug: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens only'),
  parentId: z.string(),
  gender: z.enum(['', 'women', 'men', 'unisex']),
  description: z.string().trim().max(500),
  sortOrder: z.number({ message: 'Enter a number' }).int('Whole number').min(0).max(9999),
  isActive: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

const EMPTY: FormValues = { name: '', slug: '', parentId: '', gender: '', description: '', sortOrder: 0, isActive: true };

export default function Categories() {
  const [rows, setRows] = useState<AdminCategory[] | null>(null);
  const [editing, setEditing] = useState<AdminCategory | 'new' | null>(null);
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await adminListCategories());
    } catch (e) {
      setRows([]);
      setMsg({ kind: 'error', text: e instanceof Error ? e.message : 'Could not load categories.' });
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const flat = useMemo(() => flattenCategories(rows ?? []), [rows]);

  const remove = async (c: AdminCategory) => {
    if (!window.confirm(`Delete "${c.name}"? This cannot be undone.`)) return;
    try {
      await adminDeleteCategory(c.id, c.name);
      setMsg({ kind: 'success', text: 'Category deleted.' });
      await load();
    } catch (e) {
      setMsg({ kind: 'error', text: e instanceof Error ? e.message : friendlyDbError(null) });
    }
  };

  return (
    <div>
      <PageTitle title="Categories" subtitle="Create unlimited categories and subcategories. Inactive categories are hidden from the storefront. A category that still has products or subcategories cannot be deleted.">
        {editing === null && <Button onClick={() => { setMsg(null); setEditing('new'); }}>Add Category</Button>}
      </PageTitle>

      <div className="space-y-5">
        {msg && <FormMessage kind={msg.kind}>{msg.text}</FormMessage>}

        {editing !== null && rows && (
          <CategoryForm
            all={rows}
            editing={editing === 'new' ? null : editing}
            onCancel={() => setEditing(null)}
            onSaved={async () => {
              setEditing(null);
              setMsg({ kind: 'success', text: 'Category saved.' });
              await load();
            }}
          />
        )}

        {rows === null ? (
          <p role="status" className="text-sm text-muted">Loading…</p>
        ) : rows.length === 0 ? (
          <Card><p className="text-sm text-muted">No categories yet.</p></Card>
        ) : (
          <TableWrap>
            <table className="w-full min-w-[640px]">
              <thead className="border-b border-line bg-secondary">
                <tr>
                  <th className={thCls}>Name</th>
                  <th className={thCls}>Slug</th>
                  <th className={thCls}>Gender</th>
                  <th className={thCls}>Order</th>
                  <th className={thCls}>Status</th>
                  <th className={thCls}><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {flat.map(({ row, depth }) => (
                  <tr key={row.id}>
                    <td className={cell}>
                      <span style={{ paddingLeft: depth * 20 }} className={depth ? 'text-ink' : 'font-medium text-primary'}>
                        {depth > 0 && <span className="mr-1 text-muted">↳</span>}
                        {row.name}
                      </span>
                    </td>
                    <td className={`${cell} text-muted`}>{row.slug}</td>
                    <td className={`${cell} capitalize text-muted`}>{row.gender ?? '—'}</td>
                    <td className={`${cell} text-muted`}>{row.sort_order}</td>
                    <td className={cell}>{row.is_active ? <Pill tone="ok">Active</Pill> : <Pill>Hidden</Pill>}</td>
                    <td className={`${cell} whitespace-nowrap text-right`}>
                      <button className={smallBtn} onClick={() => { setMsg(null); setEditing(row); }}>Edit</button>{' '}
                      <button className={dangerBtn} onClick={() => remove(row)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </div>
    </div>
  );
}

function CategoryForm({ all, editing, onSaved, onCancel }: { all: AdminCategory[]; editing: AdminCategory | null; onSaved: () => void; onCancel: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const slugTouched = useRef(!!editing);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: editing
      ? { name: editing.name, slug: editing.slug, parentId: editing.parent_id ?? '', gender: editing.gender ?? '', description: editing.description ?? '', sortOrder: editing.sort_order, isActive: editing.is_active }
      : EMPTY,
  });

  const name = watch('name');
  useEffect(() => {
    if (!slugTouched.current) setValue('slug', slugify(name ?? ''), { shouldValidate: false });
  }, [name, setValue]);

  const blocked = editing ? selfAndDescendantIds(all, editing.id) : new Set<string>();
  const parentOptions = flattenCategories(all).filter(({ row }) => !blocked.has(row.id));

  const onSubmit = async (v: FormValues) => {
    setError(null);
    try {
      await adminSaveCategory(
        { parent_id: v.parentId || null, slug: v.slug, name: v.name, gender: v.gender || null, description: v.description || null, is_active: v.isActive, sort_order: v.sortOrder },
        editing?.id,
      );
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5 border border-line bg-white p-5 sm:grid-cols-2 sm:p-6">
      <h2 className="text-xl font-medium sm:col-span-2">{editing ? `Edit “${editing.name}”` : 'New category'}</h2>
      {error && <div className="sm:col-span-2"><FormMessage kind="error">{error}</FormMessage></div>}
      <Field label="Name" error={errors.name?.message}><input className="input" {...register('name')} /></Field>
      <Field label="URL slug" error={errors.slug?.message} hint="Used in the page address, e.g. /category/kurti">
        <input className="input" {...register('slug', { onChange: () => { slugTouched.current = true; } })} />
      </Field>
      <Field label="Parent category" hint="Leave empty for a top-level category">
        <select className="input" {...register('parentId')}>
          <option value="">— None (top level) —</option>
          {parentOptions.map(({ row, depth }) => (
            <option key={row.id} value={row.id}>{`${'— '.repeat(depth)}${row.name}`}</option>
          ))}
        </select>
      </Field>
      <Field label="Gender">
        <select className="input" {...register('gender')}>
          <option value="">Not set</option>
          <option value="women">Women</option>
          <option value="men">Men</option>
          <option value="unisex">Unisex</option>
        </select>
      </Field>
      <Field label="Sort order" error={errors.sortOrder?.message} hint="Lower numbers appear first">
        <input type="number" min={0} className="input" {...register('sortOrder', { valueAsNumber: true })} />
      </Field>
      <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" {...register('isActive')} /> Visible on the storefront</label>
      <div className="sm:col-span-2">
        <Field label="Description (optional)" error={errors.description?.message}><textarea rows={2} className="input" {...register('description')} /></Field>
      </div>
      <div className="flex gap-3 sm:col-span-2">
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save Category'}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
