import { useEffect, useRef, useState } from 'react';
import type { CartLine } from '@/lib/cart';
import { quoteOrder, type Quote } from '@/lib/checkoutApi';
import { isSupabaseConfigured } from '@/lib/supabase';

interface Opts { district?: string; coupon?: string; phone?: string }

/** Prices the cart on the server whenever the cart or delivery details change. */
export function useQuote(lines: readonly CartLine[], opts: Opts = {}) {
  const [state, setState] = useState<{ quote: Quote | null; loading: boolean; error: string | null }>({ quote: null, loading: lines.length > 0, error: null });
  const [tick, setTick] = useState(0);
  const key = JSON.stringify([lines, opts.district ?? '', opts.coupon ?? '', opts.phone ?? '']);
  const seq = useRef(0);

  useEffect(() => {
    if (!lines.length || !isSupabaseConfigured) {
      setState({ quote: null, loading: false, error: null });
      return;
    }
    const mine = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    const t = setTimeout(() => {
      quoteOrder(lines, opts)
        .then((quote) => mine === seq.current && setState({ quote, loading: false, error: null }))
        .catch((e: unknown) => mine === seq.current && setState({ quote: null, loading: false, error: e instanceof Error ? e.message : 'Could not price your cart.' }));
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick]);

  return { ...state, reload: () => setTick((t) => t + 1) };
}
