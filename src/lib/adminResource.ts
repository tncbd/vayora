// A small, safe framework for the simple "list + edit form" admin screens (banners, hero slides, pages, menus...).
// Validation and payload building are pure so they can be tested; saving runs as the signed-in admin (RLS decides).
import { supabase } from './supabase';
import { friendlyDbError } from './adminCatalog';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;
export type FieldType = 'text' | 'textarea' | 'number' | 'bool' | 'datetime' | 'select' | 'image' | 'link' | 'slug';

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  max?: number;
  min?: number;
  options?: { value: string; label: string }[];
  hint?: string;
  /** show as a column in the list */
  list?: boolean;
  /** cannot be changed after creation (e.g. a fixed key) */
  fixed?: boolean;
  rows?: number;
}

export type Values = Record<string, string | boolean>;

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function isLink(v: string): boolean {
  if (v.startsWith('/')) return !v.startsWith('//') && !v.includes('\\') && !/\s/.test(v);
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export function validate(fields: readonly FieldDef[], v: Values): Record<string, string> {
  const e: Record<string, string> = {};
  for (const f of fields) {
    const raw = v[f.name];
    if (f.type === 'bool') continue;
    const s = typeof raw === 'string' ? raw.trim() : '';
    if (!s) { if (f.required) e[f.name] = `${f.label} is required`; continue; }
    if (f.max && s.length > f.max) e[f.name] = `Maximum ${f.max} characters`;
    else if (f.type === 'number') {
      const n = Number(s);
      if (!Number.isFinite(n) || !Number.isInteger(n)) e[f.name] = 'Enter a whole number';
      else if (f.min !== undefined && n < f.min) e[f.name] = `Must be at least ${f.min}`;
    } else if (f.type === 'slug' && !SLUG.test(s)) e[f.name] = 'Use lowercase letters, numbers and single hyphens';
    else if ((f.type === 'link' || f.type === 'image') && !isLink(s)) e[f.name] = 'Enter a site path like /shop or a full https:// link';
    else if (f.type === 'datetime' && Number.isNaN(new Date(s).getTime())) e[f.name] = 'Enter a valid date and time';
    else if (f.type === 'select' && f.options && !f.options.some((o) => o.value === s)) e[f.name] = 'Choose an option';
  }
  const starts = fields.find((f) => f.name === 'starts_at'), ends = fields.find((f) => f.name === 'ends_at');
  if (starts && ends && v.starts_at && v.ends_at && !e.starts_at && !e.ends_at && new Date(String(v.ends_at)) <= new Date(String(v.starts_at))) e.ends_at = 'Must be after the start';
  return e;
}

export const toLocalInput = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export function toValues(fields: readonly FieldDef[], row: Row | null, defaults: Row = {}): Values {
  const out: Values = {};
  for (const f of fields) {
    const src = row ? row[f.name] : defaults[f.name];
    if (f.type === 'bool') out[f.name] = src === undefined || src === null ? false : !!src;
    else if (f.type === 'datetime') out[f.name] = toLocalInput(src);
    else out[f.name] = src === undefined || src === null ? '' : String(src);
  }
  return out;
}

/** Empty optional fields become NULL; numbers become numbers; local date-times become ISO. */
export function toPayload(fields: readonly FieldDef[], v: Values, opts: { creating: boolean }): Row {
  const out: Row = {};
  for (const f of fields) {
    if (f.fixed && !opts.creating) continue;
    const raw = v[f.name];
    if (f.type === 'bool') { out[f.name] = !!raw; continue; }
    const s = typeof raw === 'string' ? raw.trim() : '';
    if (f.type === 'number') out[f.name] = s === '' ? (f.required ? 0 : null) : Number(s);
    else if (f.type === 'datetime') out[f.name] = s ? new Date(s).toISOString() : null;
    else out[f.name] = s === '' ? (f.required ? '' : null) : s;
  }
  return out;
}

function db() {
  if (!supabase) throw new Error('Not connected to the database.');
  return supabase;
}
const fail = (e: { code?: string; message?: string }) => new Error(e.code === '23505' ? 'That value is already used. Choose another.' : friendlyDbError(e));

export async function listRows(table: string, orderBy: string[]): Promise<Row[]> {
  let q = db().from(table).select('*');
  for (const o of orderBy) q = q.order(o);
  const { data, error } = await q;
  if (error) throw fail(error);
  return data ?? [];
}
export async function saveRow(table: string, id: string | null, payload: Row): Promise<void> {
  const res = id ? await db().from(table).update(payload).eq('id', id) : await db().from(table).insert(payload);
  if (res.error) throw fail(res.error);
}
export async function deleteRow(table: string, id: string): Promise<void> {
  const { error } = await db().from(table).delete().eq('id', id);
  if (error) throw fail(error);
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
export function validateImageFile(f: { type: string; size: number }, maxMb = 5): string | null {
  if (!IMAGE_TYPES.includes(f.type)) return 'Use a JPG, PNG, WebP or AVIF image.';
  if (f.size > maxMb * 1024 * 1024) return `The image must be smaller than ${maxMb} MB.`;
  return null;
}
export async function uploadPublicImage(bucket: 'banners' | 'site-assets', file: File): Promise<string> {
  const err = validateImageFile(file, bucket === 'site-assets' ? 2 : 5);
  if (err) throw new Error(err);
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : file.type === 'image/avif' ? 'avif' : 'jpg';
  const path = `${crypto.randomUUID()}.${ext}`;
  const up = await db().storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) throw new Error('Could not upload the image. Please try again.');
  return db().storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
