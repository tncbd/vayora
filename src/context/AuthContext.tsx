import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { isAppRole, type AppRole } from '@/lib/roles';

export type AuthResult = { ok: true; needsConfirmation?: boolean } | { ok: false; message: string };

interface AuthState {
  /** false when VITE_SUPABASE_* are missing: auth features are unavailable. */
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  isStaff: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (input: { email: string; password: string; fullName: string; phone: string }) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
}

const NOT_CONFIGURED: AuthResult = {
  ok: false,
  message: 'Accounts are not available yet because the store is not connected to its database.',
};

const AuthContext = createContext<AuthState | null>(null);

const siteUrl = () => (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/$/, '');

/** Turn Supabase errors into short, safe, customer-friendly messages. */
export function friendlyAuthError(error: { message?: string; status?: number; code?: string }): string {
  const msg = (error.message ?? '').toLowerCase();
  if (error.status === 429 || msg.includes('rate limit') || msg.includes('too many')) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  if (msg.includes('invalid login credentials')) return 'Incorrect email or password.';
  if (msg.includes('email not confirmed')) return 'Please confirm your email address first. Check your inbox.';
  if (msg.includes('already registered') || msg.includes('already been registered')) {
    return 'An account with this email may already exist. Try signing in or resetting your password.';
  }
  if (msg.includes('password') && msg.includes('weak')) return 'That password is too weak. Choose a stronger one.';
  if (msg.includes('same password')) return 'Choose a password different from your current one.';
  if (msg.includes('network') || msg.includes('failed to fetch')) return 'Network problem. Check your connection and try again.';
  return 'Something went wrong. Please try again.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [roleState, setRoleState] = useState<{ userId: string; roles: AppRole[] } | null>(null);

  // session + auth events
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next); // never await Supabase calls inside this callback
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const user = session?.user ?? null;
  const userId = user?.id ?? null;

  // roles for the signed-in user (RLS lets each user read only their own rows)
  useEffect(() => {
    if (!supabase || !userId) return;
    let active = true;
    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .then(({ data, error }) => {
        if (!active) return;
        const roles = error ? [] : (data ?? []).map((r) => r.role).filter(isAppRole);
        setRoleState({ userId, roles });
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const rolesReady = !userId || roleState?.userId === userId;
  const roles = useMemo<AppRole[]>(
    () => (userId && roleState?.userId === userId ? roleState.roles : []),
    [userId, roleState],
  );

  const signIn = useCallback<AuthState['signIn']>(async (email, password) => {
    if (!supabase) return NOT_CONFIGURED;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { ok: false, message: friendlyAuthError(error) } : { ok: true };
  }, []);

  const signUp = useCallback<AuthState['signUp']>(async ({ email, password, fullName, phone }) => {
    if (!supabase) return NOT_CONFIGURED;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone }, emailRedirectTo: `${siteUrl()}/login` },
    });
    if (error) return { ok: false, message: friendlyAuthError(error) };
    return { ok: true, needsConfirmation: !data.session };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setRoleState(null);
  }, []);

  const requestPasswordReset = useCallback<AuthState['requestPasswordReset']>(async (email) => {
    if (!supabase) return NOT_CONFIGURED;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl()}/reset-password` });
    // Only surface rate-limit / network problems; never reveal whether an email exists.
    if (error && (error.status === 429 || /rate|network|fetch/i.test(error.message))) {
      return { ok: false, message: friendlyAuthError(error) };
    }
    return { ok: true };
  }, []);

  const updatePassword = useCallback<AuthState['updatePassword']>(async (password) => {
    if (!supabase) return NOT_CONFIGURED;
    const { error } = await supabase.auth.updateUser({ password });
    return error ? { ok: false, message: friendlyAuthError(error) } : { ok: true };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      configured: isSupabaseConfigured,
      loading: authLoading || !rolesReady,
      session,
      user,
      roles,
      isStaff: roles.length > 0,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updatePassword,
    }),
    [authLoading, rolesReady, session, user, roles, signIn, signUp, signOut, requestPasswordReset, updatePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
