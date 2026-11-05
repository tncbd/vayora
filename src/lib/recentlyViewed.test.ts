import { describe, expect, it } from 'vitest';
import { pushRecent } from './recentlyViewed';

describe('pushRecent', () => {
  it('puts the newest first, removes duplicates and caps the list', () => {
    expect(pushRecent(['a', 'b'], 'c')).toEqual(['c', 'a', 'b']);
    expect(pushRecent(['a', 'b', 'c'], 'b')).toEqual(['b', 'a', 'c']);
    expect(pushRecent(['1', '2', '3'], '4', 3)).toEqual(['4', '1', '2']);
  });
});
