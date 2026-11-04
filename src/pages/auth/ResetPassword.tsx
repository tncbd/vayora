import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/context/AuthContext';
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { Field, FormMessage } from '@/components/ui/Field';
import { usePageTitle } from '@/hooks/usePageTitle';
import { AuthShell } from './AuthShell';

/** Reached from the emailed link; Supabase turns the link into a temporary recovery session. */
export default function ResetPassword() {
  usePageTitle('Reset Password');
  const { user, loading, updatePassword, signOut } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = async (values: ResetPasswordInput) => {
    setError(null);
    const res = await updatePassword(resetPasswordSchema.parse(values).password);
    if (!res.ok) return setError(res.message);
    setDone(true);
    await signOut();
    setTimeout(() => navigate('/login', { replace: true }), 2000);
  };

  if (loading) {
    return (
      <AuthShell title="Reset Password">
        <p role="status" className="text-center text-sm text-muted">Checking your reset link…</p>
      </AuthShell>
    );
  }

  if (!user && !done) {
    return (
      <AuthShell title="Reset Password" footer={<Link to="/forgot-password" className="link-underline font-medium text-primary">Request a new link</Link>}>
        <FormMessage kind="error">This reset link is invalid or has expired.</FormMessage>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a New Password">
      {done ? (
        <FormMessage kind="success">Your password was updated. Redirecting to Sign In…</FormMessage>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          {error && <FormMessage kind="error">{error}</FormMessage>}
          <Field label="New password" error={errors.password?.message} hint="8+ characters with upper, lower case and a number">
            <input type="password" autoComplete="new-password" className="input" {...register('password')} />
          </Field>
          <Field label="Confirm new password" error={errors.confirmPassword?.message}>
            <input type="password" autoComplete="new-password" className="input" {...register('confirmPassword')} />
          </Field>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Update Password'}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
