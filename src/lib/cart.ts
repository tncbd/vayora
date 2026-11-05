// Cart = a list of (variant id, quantity). Prices are NEVER stored here: the server prices every
// cart (quote_order / place_order), so a tampered browser cart can change quantities but not money.
export const CART_KEY = 'vayora.cart.v1';
export const MAX_LINE_QTY = 10;
export const MAX_LINES = 30;

export interface CartLine {
  variantId: string;
  quantity: number;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID.test(v);

const clamp = (n: number) => Math.min(MAX_LINE_QTY, Math.max(1, Math.floor(n)));

/** Accepts anything (e.g. text from localStorage) and returns only valid, merged lines. */
export function sanitizeCart(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  const merged = new Map<string, number>();
  for (const l of raw) {
    if (!l || typeof l !== 'object') continue;
    const { variantId, quantity } = l as Record<string, unknown>;
    if (!isUuid(variantId) || typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity < 1) continue;
    const id = variantId.toLowerCase();
    merged.set(id, clamp((merged.get(id) ?? 0) + quantity));
  }
  return [...merged].slice(0, MAX_LINES).map(([variantId, quantity]) => ({ variantId, quantity }));
}

export function addLine(lines: readonly CartLine[], variantId: string, quantity = 1): CartLine[] {
  if (!isUuid(variantId)) return [...lines];
  return sanitizeCart([...lines, { variantId, quantity }]);
}

/** quantity <= 0 removes the line. */
export function setQuantity(lines: readonly CartLine[], variantId: string, quantity: number): CartLine[] {
  const id = variantId.toLowerCase();
  if (!(quantity >= 1)) return lines.filter((l) => l.variantId !== id);
  return lines.map((l) => (l.variantId === id ? { ...l, quantity: clamp(quantity) } : l));
}

export const removeLine = (lines: readonly CartLine[], variantId: string): CartLine[] => setQuantity(lines, variantId, 0);
export const cartCount = (lines: readonly CartLine[]): number => lines.reduce((n, l) => n + l.quantity, 0);

export function loadCart(storage: Pick<Storage, 'getItem'> | null = safeStorage()): CartLine[] {
  try {
    const t = storage?.getItem(CART_KEY);
    return t ? sanitizeCart(JSON.parse(t)) : [];
  } catch {
    return [];
  }
}

export function saveCart(lines: readonly CartLine[], storage: Pick<Storage, 'setItem' | 'removeItem'> | null = safeStorage()): void {
  try {
    if (lines.length) storage?.setItem(CART_KEY, JSON.stringify(lines));
    else storage?.removeItem(CART_KEY);
  } catch {
    /* storage unavailable (private mode / quota): cart simply stays in memory */
  }
}

function safeStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}
