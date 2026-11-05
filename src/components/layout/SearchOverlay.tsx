import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { searchSuggestions } from '@/lib/catalogApi';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { Product } from '@/types';
import { formatBDT } from '@/lib/format';

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);

  // debounced suggestions; stale responses are ignored
  useEffect(() => {
    const text = query.trim();
    if (!open || !isSupabaseConfigured || text.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    let active = true;
    setSearching(true);
    const t = setTimeout(() => {
      searchSuggestions(text)
        .then((r) => active && setSuggestions(r))
        .catch(() => active && setSuggestions([]))
        .finally(() => active && setSearching(false));
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query, open]);

  if (!open) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    onClose();
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="fixed inset-0 z-[60] animate-fade-in bg-white" role="dialog" aria-modal="true" aria-label="Search products">
      <div className="container-page pt-6">
        <div className="flex items-center justify-between">
          <p className="eyebrow">Search</p>
          <button onClick={onClose} aria-label="Close search" className="p-2 text-primary hover:text-accent-dark">
            <X size={22} />
          </button>
        </div>
        <form onSubmit={submit} className="mt-4 flex items-center border-b border-primary">
          <Search size={20} className="text-muted" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for products, categories…"
            className="w-full bg-transparent px-3 py-4 font-display text-2xl text-primary placeholder:text-muted/60 focus:outline-none sm:text-3xl"
            aria-label="Search query"
          />
        </form>

        {query.trim() && (
          <div className="mt-6">
            {suggestions.length > 0 ? (
              <ul className="divide-y divide-line">
                {suggestions.map((p) => (
                  <li key={p.id}>
                    <Link
                      to={`/product/${p.slug}`}
                      onClick={onClose}
                      className="flex items-center justify-between py-3 text-sm hover:text-accent-dark"
                    >
                      <span>{p.name}</span>
                      <span className="text-muted">{formatBDT(p.sellingPrice)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted" role="status">{searching ? 'Searching…' : 'No suggestions. Press Enter to search all products.'}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
