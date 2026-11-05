import { describe, expect, it } from 'vitest';
import { flattenCategories, selfAndDescendantIds } from './categoryTree';

const c = (id: string, parent_id: string | null, sort_order = 0, name = id) => ({ id, parent_id, sort_order, name });

describe('flattenCategories', () => {
  it('lists parents followed by their children with depth', () => {
    const rows = [c('saree', 'women', 1), c('men', null, 2), c('women', null, 1), c('kurti', 'women', 2), c('tee', 'men', 1)];
    expect(flattenCategories(rows).map((x) => `${x.depth}:${x.row.id}`)).toEqual(['0:women', '1:saree', '1:kurti', '0:men', '1:tee']);
  });
  it('shows orphans at the top level instead of hiding them', () => {
    expect(flattenCategories([c('a', 'missing')]).map((x) => x.depth)).toEqual([0]);
  });
  it('survives accidental cycles without looping', () => {
    const out = flattenCategories([c('a', 'b'), c('b', 'a')]);
    expect(out.length).toBeLessThanOrEqual(2);
  });
});

describe('selfAndDescendantIds', () => {
  it('includes the category and all depths below it, nothing else', () => {
    const rows = [c('a', null), c('b', 'a'), c('c', 'b'), c('d', null)];
    expect([...selfAndDescendantIds(rows, 'a')].sort()).toEqual(['a', 'b', 'c']);
    expect([...selfAndDescendantIds(rows, 'd')]).toEqual(['d']);
  });
});
