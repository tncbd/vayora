import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/context/AuthContext';
import { loginSchema, type LoginInput } from '@/lib/validation';
import { safeRedirect } from '@/lib/roles';
import { Button } from '@/components/ui/Button';
import { Field, FormMessage } from '@/components/ui/Field';
import { usePageTitle } from '@/hooks/usePageTitle';
import { AuthShell } from './AuthShell';

export default function Login() {
  usePageTitle('Sign In');
  const { signIn, user, configured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = safeRedirect((location.state as { from?: unknown } | null)?.from);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  if (user) return <Navigate to={from} replace />;

  const onSubmit = async (values: LoginInput) => {
    setError(null);
    const parsed = loginSchema.parse(values);
    const res = await signIn(parsed.email, parsed.password);
    if (!res.ok) return setError(res.message);
    navigate(from, { replace: true });
  };

  return (
    <AuthShell
      title="Sign In"
      subtitle="Welcome back."
      footer={
        <>
          New to VAYORA?{' '}
          <Link to="/register" className="link-underline font-medium text-primary">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {error && <FormMessage kind="error">{error}</FormMessage>}
        <Field label="Email" error={errors.email?.message}>
          <input type="email" autoComplete="email" className="input" {...register('email')} />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <input type="password" autoComplete="current-password" className="input" {...register('password')} />
        </Field>
        <div className="text-right">
          <Link to="/forgot-password" className="link-underline text-xs text-muted">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting || !configured}>
          {isSubmitting ? 'Signing in…' : 'Sign In'}
        </Button>
      </form>
    </AuthShell>
  );
}
