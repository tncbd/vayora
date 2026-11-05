import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getFilterOptions } from '@/lib/catalogApi';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAsync } from '@/hooks/useAsync';
import type { ListParams } from '@/lib/catalogParams';
import type { Category } from '@/types';
import { cn } from '@/lib/cn';

type Filters = Pick<ListParams, 'gender' | 'minPrice' | 'maxPrice' | 'sizes' | 'colors' | 'inStockOnly' | 'newOnly' | 'discountOnly'>;

interface Props {
  value: Filters;
  onChange: (patch: Partial<Filters>) => void;
  onClear: () => void;
  showGender: boolean;
  categories?: Category[];
  hasActive: boolean;
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-b border-line py-5">
      <legend className="mb-3 float-left w-full text-xs font-medium uppercase tracking-[0.18em] text-primary">{title}</legend>
      <div className="clear-both">{children}</div>
    </fieldset>
  );
}

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export function FilterPanel({ value, onChange, onClear, showGender, categories = [], hasActive }: Props) {
  const opts = useAsync(() => (isSupabaseConfigured ? getFilterOptions() : Promise.resolve({ sizes: [], colors: [] })), []);
  const [min, setMin] = useState(value.minPrice?.toString() ?? '');
  const [max, setMax] = useState(value.maxPrice?.toString() ?? '');
  useEffect(() => {
    setMin(value.minPrice?.toString() ?? '');
    setMax(value.maxPrice?.toString() ?? '');
  }, [value.minPrice, value.maxPrice]);

  const applyPrice = (e: React.FormEvent) => {
    e.preventDefault();
    const n = (s: string) => (s.trim() === '' || !(Number(s) >= 0) ? undefined : Number(s));
    let lo = n(min);
    let hi = n(max);
    if (lo !== undefined && hi !== undefined && lo > hi) [lo, hi] = [hi, lo];
    onChange({ minPrice: lo, maxPrice: hi });
  };

  const sizes = opts.data?.sizes ?? [];
  const colors = opts.data?.colors ?? [];
  const parents = categories.filter((c) => !c.parentId);

  return (
    <div>
      <div className="flex items-center justify-between border-b border-line pb-3">
        <h2 className="font-sans text-xs font-medium uppercase tracking-[0.2em]">Filters</h2>
        {hasActive && <button onClick={onClear} className="link-underline text-xs text-muted">Clear all</button>}
      </div>

      {showGender && (
        <Group title="Gender">
          <div className="flex flex-wrap gap-2">
            {(['women', 'men'] as const).map((g) => (
              <button key={g} aria-pressed={value.gender === g} onClick={() => onChange({ gender: value.gender === g ? undefined : g })}
                className={cn('border px-3.5 py-1.5 text-xs uppercase tracking-[0.12em]', value.gender === g ? 'border-primary bg-primary text-white' : 'border-line hover:border-primary')}>
                {g}
              </button>
            ))}
          </div>
        </Group>
      )}

      {categories.length > 0 && (
        <Group title="Category">
          <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-1 text-sm">
            {parents.map((p) => (
              <li key={p.id}>
                <Link to={`/category/${p.slug}`} className="font-medium text-primary hover:text-accent-dark">{p.name}</Link>
                <ul className="ml-3 mt-1 space-y-1">
                  {categories.filter((c) => c.parentId === p.id).map((c) => (
                    <li key={c.id}><Link to={`/category/${c.slug}`} className="text-muted hover:text-accent-dark">{c.name}</Link></li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </Group>
      )}

      <Group title="Price (৳)">
        <form onSubmit={applyPrice} className="flex items-center gap-2">
          <input inputMode="numeric" aria-label="Minimum price" placeholder="Min" value={min} onChange={(e) => setMin(e.target.value)} className="input !px-3 !py-2" />
          <span className="text-muted">–</span>
          <input inputMode="numeric" aria-label="Maximum price" placeholder="Max" value={max} onChange={(e) => setMax(e.target.value)} className="input !px-3 !py-2" />
          <button type="submit" className="border border-primary px-3 py-2 text-xs uppercase tracking-widest hover:bg-primary hover:text-white">Go</button>
        </form>
      </Group>

      {sizes.length > 0 && (
        <Group title="Size">
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => (
              <button key={s} aria-pressed={value.sizes.includes(s)} onClick={() => onChange({ sizes: toggle(value.sizes, s) })}
                className={cn('min-w-10 border px-3 py-1.5 text-xs', value.sizes.includes(s) ? 'border-primary bg-primary text-white' : 'border-line hover:border-primary')}>
                {s}
              </button>
            ))}
          </div>
        </Group>
      )}

      {colors.length > 0 && (
        <Group title="Color">
          <div className="flex flex-wrap gap-2.5">
            {colors.map((c) => (
              <button key={c.name} title={c.name} aria-label={c.name} aria-pressed={value.colors.includes(c.name)} onClick={() => onChange({ colors: toggle(value.colors, c.name) })}
                className={cn('h-7 w-7 rounded-full border bg-secondary', value.colors.includes(c.name) ? 'ring-2 ring-primary ring-offset-2' : 'border-line')}
                style={c.hex ? { backgroundColor: c.hex } : undefined}>
                {!c.hex && <span className="text-[9px]">{c.name.charAt(0)}</span>}
              </button>
            ))}
          </div>
        </Group>
      )}

      <Group title="Availability & offers">
        {([
          ['inStockOnly', 'In stock only'],
          ['newOnly', 'New arrivals'],
          ['discountOnly', 'On sale'],
        ] as const).map(([k, label]) => (
          <label key={k} className="flex cursor-pointer items-center gap-2.5 py-1.5 text-sm">
            <input type="checkbox" checked={value[k]} onChange={(e) => onChange({ [k]: e.target.checked })} className="h-4 w-4 accent-[#171717]" />
            {label}
          </label>
        ))}
      </Group>
    </div>
  );
}
