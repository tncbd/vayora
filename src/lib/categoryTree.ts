// Pure helpers for showing categories as an indented tree in admin.
export interface TreeCategory {
  id: string;
  parent_id: string | null;
  sort_order: number;
  name: string;
}

export interface FlatCategory<T extends TreeCategory> {
  row: T;
  depth: number;
}

/** Depth-first list: each parent followed by its children. Orphans (missing parent) are shown at the top level. */
export function flattenCategories<T extends TreeCategory>(rows: readonly T[]): FlatCategory<T>[] {
  const byParent = new Map<string | null, T[]>();
  const ids = new Set(rows.map((r) => r.id));
  for (const r of rows) {
    const key = r.parent_id && ids.has(r.parent_id) ? r.parent_id : null;
    byParent.set(key, [...(byParent.get(key) ?? []), r]);
  }
  for (const list of byParent.values()) list.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  const out: FlatCategory<T>[] = [];
  const seen = new Set<string>();
  const walk = (parent: string | null, depth: number) => {
    for (const r of byParent.get(parent) ?? []) {
      if (seen.has(r.id)) continue; // guards against accidental cycles
      seen.add(r.id);
      out.push({ row: r, depth });
      walk(r.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

/** The category itself plus everything below it (used to stop a category becoming its own ancestor). */
export function selfAndDescendantIds(rows: readonly TreeCategory[], id: string): Set<string> {
  const out = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const r of rows) {
      if (r.parent_id && out.has(r.parent_id) && !out.has(r.id)) {
        out.add(r.id);
        grew = true;
      }
    }
  }
  return out;
}
