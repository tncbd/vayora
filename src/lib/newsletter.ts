import { z } from 'zod';
import { supabase } from './supabase';

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

/** Saved through a database function that never reveals whether the address was already subscribed. */
export async function subscribeToNewsletter(input: NewsletterInput): Promise<void> {
  if (!supabase) throw new NotConnectedError('Newsletter subscription');
  const { error } = await supabase.rpc('subscribe_newsletter', { p_email: input.email });
  if (error) throw new Error(error.message.length < 120 ? error.message : 'Something went wrong. Please try again.');
}
