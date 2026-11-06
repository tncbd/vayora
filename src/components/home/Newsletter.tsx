import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { newsletterSchema, subscribeToNewsletter, NotConnectedError, type NewsletterInput } from '@/lib/newsletter';
import { Button } from '@/components/ui/Button';

export function Newsletter({ title, description }: { title?: string | null; description?: string | null }) {
  const [status, setStatus] = useState<{ kind: 'idle' | 'success' | 'error'; message?: string }>({ kind: 'idle' });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewsletterInput>({ resolver: zodResolver(newsletterSchema) });

  const onSubmit = async (data: NewsletterInput) => {
    setStatus({ kind: 'idle' });
    try {
      await subscribeToNewsletter(data);
      setStatus({ kind: 'success', message: 'Thank you for subscribing!' });
      reset();
    } catch (err) {
      setStatus({
        kind: 'error',
        message:
          err instanceof NotConnectedError
            ? 'Newsletter sign-up is not live yet. Please check back soon.'
            : err instanceof Error && err.message.length < 120 ? err.message : 'Something went wrong. Please try again.',
      });
    }
  };

  return (
    <section className="bg-secondary">
      <div className="container-page flex flex-col items-center py-16 text-center lg:py-20">
        <p className="eyebrow">Newsletter</p>
        <h2 className="mt-2 text-3xl font-medium sm:text-4xl">{title || 'Join the VAYORA List'}</h2>
        <p className="mt-3 max-w-md text-sm text-muted">
          {description || 'Be first to hear about new arrivals, seasonal collections and exclusive offers.'}
        </p>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 w-full max-w-md">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1 text-left">
              <label htmlFor="newsletter-email" className="sr-only">Email address</label>
              <input
                id="newsletter-email"
                type="email"
                autoComplete="email"
                placeholder="Your email address"
                className="input"
                aria-invalid={!!errors.email}
                aria-describedby="newsletter-feedback"
                {...register('email')}
              />
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Please wait…' : 'Subscribe'}
            </Button>
          </div>
          <p
            id="newsletter-feedback"
            role="status"
            className={`mt-3 min-h-[1.25rem] text-left text-xs ${status.kind === 'success' ? 'text-green-700' : 'text-red-700'}`}
          >
            {errors.email?.message ?? status.message}
          </p>
        </form>
      </div>
    </section>
  );
}
