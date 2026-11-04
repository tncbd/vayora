import { describe, expect, it } from 'vitest';
import { isSupabaseConfigured, supabase } from './supabase';

describe('supabase client', () => {
  it('is null (not a broken client) when env values are missing', () => {
    if (!isSupabaseConfigured) expect(supabase).toBeNull();
    else expect(supabase).not.toBeNull();
  });
});
