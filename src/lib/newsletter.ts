import { z } from 'zod';

export const newsletterSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address').max(254),
});

export type NewsletterInput = z.infer<typeof newsletterSchema>;

export class NotConnectedError extends Error {
  constructor(feature: string) {
    super(`${feature} is not connected to a backend yet.`);
    this.name = 'NotConnectedError';
  }
}

/**
 * Phase 1: there is no backend, so this intentionally FAILS rather than pretending
 * the subscription was saved. Phase 2/8 will insert into `newsletter_subscribers`
 * through Supabase (with RLS allowing insert-only for anonymous visitors).
 */
export async function subscribeToNewsletter(_input: NewsletterInput): Promise<void> {
  throw new NotConnectedError('Newsletter subscription');
}
