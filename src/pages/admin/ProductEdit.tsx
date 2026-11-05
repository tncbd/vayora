import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  adminGetProduct, adminListCategories, adminListCollections, adminSaveProduct, PRODUCT_STATUSES, type AdminCategory, type ProductForm,
} from '@/lib/adminApi';
import { sellingFromDiscount } from '@/lib/adminCatalog';
import { flattenCategories } from '@/lib/categoryTree';
import { slugify } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Field, FormMessage } from '@/components/ui/Field';
import { ImageManager } from '@/components/admin/ImageManager';
import { VariantManager } from '@/components/admin/VariantManager';
import { Card, PageTitle } from '@/components/admin/AdminUi';

const money = (label: string) => z.number({ message: `Enter the ${label}` }).min(0, 'Must be 0 or more').max(10_000_000, 'Too large');

const schema = z
  .object({
    name: z.string().trim().min(2, 'Enter a product name').max(200),
    slug: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens only'),
    sku: z.string().trim().min(2, 'Enter a SKU').max(60),
    shortDescription: z.string().trim().max(300),
    description: z.string().trim().max(10000),
    categoryId: z.string(),
    subcategoryId: z.string(),
    gender: z.enum(['women', 'men', 'unisex']),
    regularPrice: money('regular price'),
    sellingPrice: money('selling price'),
    status: z.enum(PRODUCT_STATUSES),
    isFeatured: z.boolean(),
    isBestseller: z.boolean(),
    isNewArrival: z.boolean(),
    isTrending: z.boolean(),
    seoTitle: z.string().trim().max(70, 'Keep it under 70 characters'),
    seoDescription: z.string().trim().max(160, 'Keep it under 160 characters'),
  })
  .refine((v) => v.sellingPrice <= v.regularPrice, { path: ['sellingPrice'], message: 'Selling price cannot be higher than the regular price' });
type Values = z.infer<typeof schema>;

const DEFAULTS: Values = {
  name: '', slug: '', sku: '', shortDescription: '', description: '', categoryId: '', subcategoryId: '', gender: 'unisex',
  regularPrice: 0, sellingPrice: 0, status: 'draft', isFeatured: false, isBestseller: false, isNewArrival: false, isTrending: false,
  seoTitle: '', seoDescription: '',
};

const toPayload = (v: Values): ProductForm => ({
  name: v.name, slug: v.slug, sku: v.sku.toUpperCase(),
  short_description: v.shortDescription || null, description: v.description || null,
  category_id: v.categoryId || null, subcategory_id: v.subcategoryId || null, gender: v.gender,
  regular_price: Math.round(v.regularPrice * 100) / 100, selling_price: Math.round(v.sellingPrice * 100) / 100,
  status: v.status, is_featured: v.isFeatured, is_bestseller: v.isBestseller, is_new_arrival: v.isNewArrival, is_trending: v.isTrending,
  seo_title: v.seoTitle || null, seo_description: v.seoDescription || null,
});

export default function ProductEdit() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>(isNew ? 'ready' : 'loading');
  const [cats, setCats] = useState<AdminCategory[]>([]);
  const [collections, setCollections] = useState<{ id: string; name: string }[]>([]);
  const [collectionIds, setCollectionIds] = useState<string[]>([]);
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const slugTouched = useRef(!isNew);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: DEFAULTS });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [c, col] = await Promise.all([adminListCategories(), adminListCollections()]);
        if (!active) return;
        setCats(c);
        setCollections(col);
        if (id) {
          const found = await adminGetProduct(id);
          if (!active) return;
          if (!found) return setState('missing');
          const p = found.product;
          reset({
            name: p.name, slug: p.slug, sku: p.sku, shortDescription: p.short_description ?? '', description: p.description ?? '',
            categoryId: p.category_id ?? '', subcategoryId: p.subcategory_id ?? '', gender: p.gender,
            regularPrice: Number(p.regular_price), sellingPrice: Number(p.selling_price), status: p.status,
            isFeatured: p.is_featured, isBestseller: p.is_bestseller, isNewArrival: p.is_new_arrival, isTrending: p.is_trending,
            seoTitle: p.seo_title ?? '', seoDescription: p.seo_description ?? '',
          });
          setCollectionIds(found.collectionIds);
          setState('ready');
        }
      } catch (e) {
        if (active) {
          setMsg({ kind: 'error', text: e instanceof Error ? e.message : 'Could not load the product.' });
          setState(id ? 'missing' : 'ready');
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [id, reset]);

  const name = watch('name');
  useEffect(() => {
    if (isNew && !slugTouched.current) setValue('slug', slugify(name ?? ''));
  }, [name, isNew, setValue]);

  const categoryId = watch('categoryId');
  const subOptions = cats.filter((c) => c.parent_id && c.parent_id === categoryId);
  const catOptions = flattenCategories(cats);
  const sku = watch('sku');
  const regular = watch('regularPrice');

  const onSubmit = async (v: Values) => {
    setMsg(null);
    try {
      const savedId = await adminSaveProduct(toPayload(v), collectionIds, id);
      if (isNew) {
        navigate(`/admin/products/${savedId}`, { replace: true });
      } else {
        reset(v);
        setMsg({ kind: 'success', text: 'Product saved.' });
      }
    } catch (e) {
      setMsg({ kind: 'error', text: e instanceof Error ? e.message : 'Could not save the product.' });
    }
  };

  if (state === 'loading') return <p role="status" className="text-sm text-muted">Loading…</p>;
  if (state === 'missing') {
    return (
      <div>
        <PageTitle title="Product not found" />
        {msg && <FormMessage kind={msg.kind}>{msg.text}</FormMessage>}
        <Link to="/admin/products" className="link-underline text-sm font-medium text-primary">Back to products</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageTitle title={isNew ? 'Add Product' : 'Edit Product'} subtitle={isNew ? 'Save the details first; photos and variants are added right after.' : undefined}>
        <Link to="/admin/products" className="link-underline self-center text-xs font-medium uppercase tracking-[0.16em] text-primary">← All products</Link>
      </PageTitle>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        {msg && <FormMessage kind={msg.kind}>{msg.text}</FormMessage>}

        <Card title="Details">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Product name" error={errors.name?.message}><input className="input" {...register('name')} /></Field></div>
            <Field label="URL slug" error={errors.slug?.message} hint="Page address: /product/your-slug">
              <input className="input" {...register('slug', { onChange: () => { slugTouched.current = true; } })} />
            </Field>
            <Field label="SKU" error={errors.sku?.message} hint="Unique stock code, e.g. VAY-TEE-001"><input className="input uppercase" {...register('sku')} /></Field>
            <div className="sm:col-span-2"><Field label="Short description" error={errors.shortDescription?.message}><input className="input" {...register('shortDescription')} /></Field></div>
            <div className="sm:col-span-2"><Field label="Description" error={errors.description?.message}><textarea rows={6} className="input" {...register('description')} /></Field></div>
          </div>
        </Card>

        <Card title="Organisation">
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Category">
              <select className="input" {...register('categoryId', { onChange: () => setValue('subcategoryId', '') })}>
                <option value="">— None —</option>
                {catOptions.map(({ row, depth }) => <option key={row.id} value={row.id}>{`${'— '.repeat(depth)}${row.name}`}</option>)}
              </select>
            </Field>
            <Field label="Subcategory" hint={subOptions.length ? undefined : 'Pick a category that has subcategories'}>
              <select className="input" disabled={subOptions.length === 0} {...register('subcategoryId')}>
                <option value="">— None —</option>
                {subOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Gender">
              <select className="input" {...register('gender')}>
                <option value="unisex">Unisex</option>
                <option value="women">Women</option>
                <option value="men">Men</option>
              </select>
            </Field>
          </div>
          {collections.length > 0 && (
            <fieldset className="mt-5">
              <legend className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-primary">Collections</legend>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                {collections.map((c) => (
                  <label key={c.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={collectionIds.includes(c.id)}
                      onChange={(e) => setCollectionIds(e.target.checked ? [...collectionIds, c.id] : collectionIds.filter((x) => x !== c.id))}
                    />
                    {c.name}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted">The flags below (New Arrival, Best Seller, Trending, Featured) also place the product in those collections automatically.</p>
            </fieldset>
          )}
        </Card>

        <Card title="Pricing (BDT ৳)">
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Regular price" error={errors.regularPrice?.message}><input type="number" min={0} step="0.01" className="input" {...register('regularPrice', { valueAsNumber: true })} /></Field>
            <Field label="Selling price" error={errors.sellingPrice?.message}><input type="number" min={0} step="0.01" className="input" {...register('sellingPrice', { valueAsNumber: true })} /></Field>
            <label className="block text-left">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.14em] text-primary">Or set a discount %</span>
              <input
                type="number" min={0} max={100} className="input" placeholder="e.g. 20"
                onChange={(e) => e.target.value !== '' && setValue('sellingPrice', sellingFromDiscount(Number(getValues('regularPrice')) || 0, Number(e.target.value)), { shouldValidate: true })}
                aria-label="Discount percent"
              />
              <span className="mt-1 block text-xs text-muted">Fills the selling price from {regular || 0} less this %.</span>
            </label>
          </div>
        </Card>

        <Card title="Status & flags">
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Status" hint="Only Active products are shown to customers">
              <select className="input capitalize" {...register('status')}>{PRODUCT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" {...register('isFeatured')} /> Featured</label>
            <label className="flex items-center gap-2"><input type="checkbox" {...register('isBestseller')} /> Best seller</label>
            <label className="flex items-center gap-2"><input type="checkbox" {...register('isNewArrival')} /> New arrival</label>
            <label className="flex items-center gap-2"><input type="checkbox" {...register('isTrending')} /> Trending</label>
          </div>
        </Card>

        <Card title="Search engines (SEO)">
          <div className="grid gap-5">
            <Field label="SEO title" error={errors.seoTitle?.message} hint="Leave empty to use the product name"><input className="input" {...register('seoTitle')} /></Field>
            <Field label="SEO description" error={errors.seoDescription?.message}><textarea rows={2} className="input" {...register('seoDescription')} /></Field>
          </div>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : isNew ? 'Create Product' : 'Save Changes'}</Button>
          <Button type="button" variant="outline" onClick={() => navigate('/admin/products')}>Cancel</Button>
        </div>
      </form>

      {id ? (
        <>
          <ImageManager productId={id} />
          <VariantManager productId={id} productSku={sku} />
        </>
      ) : (
        <p className="text-sm text-muted">Photos and variants (sizes, colours, stock) become available after you create the product.</p>
      )}
    </div>
  );
}
