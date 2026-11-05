const KEY = 'vayora.recent';

/** Most-recent-first list without duplicates, capped at `max`. */
export function pushRecent(list: readonly string[], slug: string, max = 8): string[] {
  return [slug, ...list.filter((s) => s !== slug)].slice(0, max);
}

export function readRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string' && /^[a-z0-9-]+$/.test(s)).slice(0, 8) : [];
  } catch {
    return []; // storage unavailable or corrupted: behave as empty
  }
}

export function rememberProduct(slug: string): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(pushRecent(readRecent(), slug)));
  } catch {
    /* ignore: private mode / quota */
  }
}
