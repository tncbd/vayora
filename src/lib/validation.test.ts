import { describe, expect, it } from 'vitest';
import { DISTRICTS } from './districts';
import {
  addressSchema,
  forgotPasswordSchema,
  loginSchema,
  normalizeBdPhone,
  profileSchema,
  registerSchema,
  resetPasswordSchema,
} from './validation';

describe('normalizeBdPhone', () => {
  it.each([
    ['01712345678', '01712345678'],
    ['+8801712345678', '01712345678'],
    ['8801712345678', '01712345678'],
    ['017-1234 5678', '01712345678'],
    ['1712345678', '01712345678'],
  ])('accepts %s', (input, out) => expect(normalizeBdPhone(input)).toBe(out));

  it.each(['', '123', '01212345678', '0171234567', '017123456789', 'abcdefghijk'])('rejects %s', (v) =>
    expect(normalizeBdPhone(v)).toBeNull(),
  );
});

describe('districts', () => {
  it('lists 64 unique districts including Dhaka', () => {
    expect(DISTRICTS).toHaveLength(64);
    expect(new Set(DISTRICTS).size).toBe(64);
    expect(DISTRICTS).toContain('Dhaka');
  });
});

describe('auth schemas', () => {
  it('login lowercases and trims email', () => {
    const r = loginSchema.parse({ email: '  USER@Example.COM ', password: 'x' });
    expect(r.email).toBe('user@example.com');
  });

  it('register normalises phone and enforces a strong password', () => {
    const base = { fullName: 'Ayesha Khan', phone: '+8801712345678', email: 'a@b.co', password: 'Passw0rdX', confirmPassword: 'Passw0rdX' };
    expect(registerSchema.parse(base).phone).toBe('01712345678');
    expect(registerSchema.safeParse({ ...base, password: 'short1A', confirmPassword: 'short1A' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: 'alllowercase1', confirmPassword: 'alllowercase1' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: 'NoNumbersHere', confirmPassword: 'NoNumbersHere' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, phone: '12345' }).success).toBe(false);
  });

  it('register and reset require matching passwords', () => {
    const r = registerSchema.safeParse({ fullName: 'Ayesha', phone: '01712345678', email: 'a@b.co', password: 'Passw0rdX', confirmPassword: 'Different1' });
    expect(r.success).toBe(false);
    expect(resetPasswordSchema.safeParse({ password: 'Passw0rdX', confirmPassword: 'nope' }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ password: 'Passw0rdX', confirmPassword: 'Passw0rdX' }).success).toBe(true);
  });

  it('forgot password validates email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'nope' }).success).toBe(false);
    expect(forgotPasswordSchema.safeParse({ email: 'ok@example.com' }).success).toBe(true);
  });

  it('profile phone is optional but validated when given', () => {
    expect(profileSchema.parse({ fullName: 'Ayesha', phone: '' }).phone).toBeNull();
    expect(profileSchema.parse({ fullName: 'Ayesha', phone: '01712345678' }).phone).toBe('01712345678');
    expect(profileSchema.safeParse({ fullName: 'Ayesha', phone: '999' }).success).toBe(false);
  });

  it('address requires a real district and full details', () => {
    const ok = { fullName: 'Ayesha', phone: '01712345678', altPhone: '', district: 'Dhaka', area: 'Mirpur', addressLine: 'House 1, Road 2', isDefault: true };
    expect(addressSchema.parse(ok).altPhone).toBeNull();
    expect(addressSchema.safeParse({ ...ok, district: 'Atlantis' }).success).toBe(false);
    expect(addressSchema.safeParse({ ...ok, addressLine: 'x' }).success).toBe(false);
  });
});

import { checkoutSchema } from './validation';
describe('checkoutSchema', () => {
  const ok = { fullName: 'Rahim Uddin', phone: '+8801712345678', altPhone: '', email: '', district: 'Dhaka', area: 'Mirpur', addressLine: 'House 1, Road 2', deliveryInstructions: '', notes: '' };
  it('normalises the phone and accepts optional fields empty', () => {
    const r = checkoutSchema.safeParse(ok);
    expect(r.success).toBe(true);
    if (r.success) { expect(r.data.phone).toBe('01712345678'); expect(r.data.altPhone).toBeNull(); }
  });
  it.each([
    ['phone', { phone: '123' }], ['name', { fullName: 'A' }], ['district', { district: 'Atlantis' }],
    ['address', { addressLine: 'x' }], ['email', { email: 'nope' }], ['notes', { notes: 'x'.repeat(501) }],
  ])('rejects bad %s', (_n, patch) => {
    expect(checkoutSchema.safeParse({ ...ok, ...patch }).success).toBe(false);
  });
});
