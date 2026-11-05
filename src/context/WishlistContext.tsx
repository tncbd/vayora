import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

interface WishlistState {
  ids: ReadonlySet<string>;
  loading: boolean;
  has: (productId: string) => boolean;
  /** Returns false if the visitor must sign in first. */
  toggle: (productId: string) => Promise<{ ok: boolean; needsLogin?: boolean; message?: string }>;
}

const Ctx = createContext<WishlistState | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [ids, setIds] = useState<ReadonlySet<string>>(new Set());
  const [wishlistId, setWishlistId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supabase || !userId) {
      setIds(new Set());
      setWishlistId(null);
      return;
    }
    let active = true;
    setLoading(true);
    (async () => {
      const { data: w } = await supabase.from('wishlists').select('id').eq('user_id', userId).maybeSingle();
      if (!active) return;
      if (!w) {
        setWishlistId(null);
        setIds(new Set());
        return;
      }
      const { data: items } = await supabase.from('wishlist_items').select('product_id').eq('wishlist_id', w.id);
      if (!active) return;
      setWishlistId(w.id);
      setIds(new Set((items ?? []).map((i) => i.product_id as string)));
    })()
      .catch(() => undefined)
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [userId]);

  const toggle = useCallback<WishlistState['toggle']>(
    async (productId) => {
      if (!supabase) return { ok: false, message: 'The store is not connected to its database.' };
      if (!userId) return { ok: false, needsLogin: true };
      try {
        let wid = wishlistId;
        if (!wid) {
          const { data, error } = await supabase.from('wishlists').upsert({ user_id: userId }, { onConflict: 'user_id' }).select('id').single();
          if (error) throw error;
          wid = data.id as string;
          setWishlistId(wid);
        }
        if (ids.has(productId)) {
          const { error } = await supabase.from('wishlist_items').delete().eq('wishlist_id', wid).eq('product_id', productId);
          if (error) throw error;
          setIds((s) => new Set([...s].filter((x) => x !== productId)));
        } else {
          const { error } = await supabase.from('wishlist_items').insert({ wishlist_id: wid, product_id: productId });
          if (error && error.code !== '23505') throw error;
          setIds((s) => new Set(s).add(productId));
        }
        return { ok: true };
      } catch {
        return { ok: false, message: 'Could not update your wishlist. Please try again.' };
      }
    },
    [userId, wishlistId, ids],
  );

  const value = useMemo<WishlistState>(() => ({ ids, loading, has: (id) => ids.has(id), toggle }), [ids, loading, toggle]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWishlist(): WishlistState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useWishlist must be used inside <WishlistProvider>');
  return ctx;
}
