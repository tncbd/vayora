import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/context/AuthContext';
import { registerSchema, type RegisterInput } from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { Field, FormMessage } from '@/components/ui/Field';
import { usePageTitle } from '@/hooks/usePageTitle';
import { AuthShell } from './AuthShell';

export default function Register() {
  usePageTitle('Create Account');
  const { signUp, user, configured } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  if (user) return <Navigate to="/account" replace />;

  const onSubmit = async (values: RegisterInput) => {
    setError(null);
    const v = registerSchema.parse(values);
    const res = await signUp({ email: v.email, password: v.password, fullName: v.fullName, phone: v.phone });
    if (!res.ok) return setError(res.message);
    if (res.needsConfirmation) setConfirmEmail(v.email);
    // otherwise a session exists and the <Navigate> above takes over
  };

  if (confirmEmail) {
    return (
      <AuthShell title="Check your email" subtitle="One more step.">
        <FormMessage kind="success">
          We sent a confirmation link to {confirmEmail}. Open it to activate your account, then sign in.
        </FormMessage>
        <Link to="/login" className="link-underline block text-center text-sm font-medium text-primary">
          Go to Sign In
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create Account"
      subtitle="Track orders and check out faster."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="link-underline font-medium text-primary">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {error && <FormMessage kind="error">{error}</FormMessage>}
        <Field label="Full name" error={errors.fullName?.message}>
          <input autoComplete="name" className="input" {...register('fullName')} />
        </Field>
        <Field label="Mobile number" error={errors.phone?.message} hint="e.g. 01712345678">
          <input type="tel" inputMode="tel" autoComplete="tel" className="input" {...register('phone')} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <input type="email" autoComplete="email" className="input" {...register('email')} />
        </Field>
        <Field label="Password" error={errors.password?.message} hint="8+ characters with upper, lower case and a number">
          <input type="password" autoComplete="new-password" className="input" {...register('password')} />
        </Field>
        <Field label="Confirm password" error={errors.confirmPassword?.message}>
          <input type="password" autoComplete="new-password" className="input" {...register('confirmPassword')} />
        </Field>
        <Button type="submit" className="w-full" disabled={isSubmitting || !configured}>
          {isSubmitting ? 'Creating account…' : 'Create Account'}
        </Button>
      </form>
    </AuthShell>
  );
}
