import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True only when both public env values are present. */
export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * Browser client. Uses the public anon key only; every table is protected by RLS.
 * The service role key must never be used here (it belongs in Edge Functions).
 * Null when env values are missing so the storefront can still render sample content.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;
