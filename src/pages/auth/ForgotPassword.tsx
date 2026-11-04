import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/context/AuthContext';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { Field, FormMessage } from '@/components/ui/Field';
import { usePageTitle } from '@/hooks/usePageTitle';
import { AuthShell } from './AuthShell';

export default function ForgotPassword() {
  usePageTitle('Forgot Password');
  const { requestPasswordReset, configured } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (values: ForgotPasswordInput) => {
    setError(null);
    const res = await requestPasswordReset(forgotPasswordSchema.parse(values).email);
    if (!res.ok) return setError(res.message);
    setSent(true);
  };

  return (
    <AuthShell
      title="Forgot Password"
      subtitle="Enter your email and we will send a reset link."
      footer={
        <Link to="/login" className="link-underline font-medium text-primary">
          Back to Sign In
        </Link>
      }
    >
      {sent ? (
        <FormMessage kind="success">
          If an account exists for that email, a password reset link is on its way. Check your inbox (and spam folder).
        </FormMessage>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          {error && <FormMessage kind="error">{error}</FormMessage>}
          <Field label="Email" error={errors.email?.message}>
            <input type="email" autoComplete="email" className="input" {...register('email')} />
          </Field>
          <Button type="submit" className="w-full" disabled={isSubmitting || !configured}>
            {isSubmitting ? 'Sending…' : 'Send Reset Link'}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
