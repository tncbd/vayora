import { z } from 'zod';
import { DISTRICTS } from './districts';

/**
 * Normalise a Bangladeshi mobile number to 01XXXXXXXXX.
 * Accepts +8801…, 8801…, 01… with spaces or dashes. Returns null if invalid.
 */
export function normalizeBdPhone(input: string): string | null {
  let d = input.replace(/[\s\-().]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  if (d.startsWith('880')) d = d.slice(3);
  if (/^1[3-9]\d{8}$/.test(d)) d = '0' + d;
  return /^01[3-9]\d{8}$/.test(d) ? d : null;
}

const phone = z
  .string()
  .trim()
  .min(1, 'Mobile number is required')
  .transform((v, ctx) => {
    const n = normalizeBdPhone(v);
    if (!n) {
      ctx.addIssue({ code: 'custom', message: 'Enter a valid Bangladeshi mobile number (e.g. 01712345678)' });
      return z.NEVER;
    }
    return n;
  });

const optionalPhone = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === '') return null;
    const n = normalizeBdPhone(v);
    if (!n) {
      ctx.addIssue({ code: 'custom', message: 'Enter a valid Bangladeshi mobile number (e.g. 01712345678)' });
      return z.NEVER;
    }
    return n;
  });

const email = z.string().trim().toLowerCase().min(1, 'Email is required').email('Enter a valid email address').max(254);

export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(72, 'Use at most 72 characters')
  .regex(/[a-z]/, 'Include a lowercase letter')
  .regex(/[A-Z]/, 'Include an uppercase letter')
  .regex(/\d/, 'Include a number');

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Enter your full name').max(120),
    phone,
    email,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name').max(120),
  phone: optionalPhone,
});

export const addressSchema = z.object({
  label: z.string().trim().max(40).optional().default(''),
  fullName: z.string().trim().min(2, 'Enter the recipient name').max(120),
  phone,
  altPhone: optionalPhone,
  district: z.string().refine((v) => DISTRICTS.includes(v), 'Select a district'),
  area: z.string().trim().min(2, 'Enter your area').max(120),
  addressLine: z.string().trim().min(5, 'Enter the full delivery address').max(300),
  isDefault: z.boolean().default(false),
});

// react-hook-form needs the raw (input) shapes
export type LoginInput = z.input<typeof loginSchema>;
export type RegisterInput = z.input<typeof registerSchema>;
export type ForgotPasswordInput = z.input<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;
export type ProfileInput = z.input<typeof profileSchema>;
export type ProfileOutput = z.output<typeof profileSchema>;
export type AddressInput = z.input<typeof addressSchema>;
export type AddressOutput = z.output<typeof addressSchema>;
