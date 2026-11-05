import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CART_KEY, addLine, cartCount, loadCart, removeLine, saveCart, setQuantity, type CartLine } from '@/lib/cart';

interface CartState {
  lines: CartLine[];
  count: number;
  add: (variantId: string, quantity?: number) => void;
  setQty: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  // read after mount so server and first client render agree
  useEffect(() => {
    setLines(loadCart());
    setReady(true);
    const onStorage = (e: StorageEvent) => e.key === CART_KEY && setLines(loadCart());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const update = useCallback((fn: (l: CartLine[]) => CartLine[]) => {
    setLines((prev) => {
      const next = fn(prev);
      saveCart(next);
      return next;
    });
  }, []);

  const value = useMemo<CartState>(
    () => ({
      lines,
      count: ready ? cartCount(lines) : 0,
      add: (id, q = 1) => update((l) => addLine(l, id, q)),
      setQty: (id, q) => update((l) => setQuantity(l, id, q)),
      remove: (id) => update((l) => removeLine(l, id)),
      clear: () => update(() => []),
    }),
    [lines, ready, update],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
