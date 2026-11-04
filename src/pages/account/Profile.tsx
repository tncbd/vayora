import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { profileSchema, type ProfileInput, type ProfileOutput } from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { Field, FormMessage } from '@/components/ui/Field';

export default function Profile() {
  const { user } = useAuth();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileInput, unknown, ProfileOutput>({ resolver: zodResolver(profileSchema), defaultValues: { fullName: '', phone: '' } });

  useEffect(() => {
    if (!supabase || !user) return;
    let active = true;
    supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) return setLoadError('Could not load your profile.');
        reset({ fullName: data?.full_name ?? '', phone: data?.phone ?? '' });
      });
    return () => {
      active = false;
    };
  }, [user, reset]);

  const onSubmit = async (v: ProfileOutput) => {
    if (!supabase || !user) return;
    setStatus(null);
    const { error } = await supabase.from('profiles').update({ full_name: v.fullName, phone: v.phone }).eq('id', user.id);
    if (error) return setStatus({ kind: 'error', text: 'Could not save your profile. Please try again.' });
    reset({ fullName: v.fullName, phone: v.phone ?? '' });
    setStatus({ kind: 'success', text: 'Profile updated.' });
  };

  return (
    <div className="max-w-md">
      <h2 className="text-2xl font-medium">Profile</h2>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-5">
        {loadError && <FormMessage kind="error">{loadError}</FormMessage>}
        {status && <FormMessage kind={status.kind}>{status.text}</FormMessage>}
        <Field label="Email" hint="Your email cannot be changed here.">
          <input className="input bg-secondary" value={user?.email ?? ''} readOnly disabled />
        </Field>
        <Field label="Full name" error={errors.fullName?.message}>
          <input autoComplete="name" className="input" {...register('fullName')} />
        </Field>
        <Field label="Mobile number" error={errors.phone?.message} hint="e.g. 01712345678">
          <input type="tel" inputMode="tel" autoComplete="tel" className="input" {...register('phone')} />
        </Field>
        <Button type="submit" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? 'Saving…' : 'Save Changes'}
        </Button>
      </form>
    </div>
  );
}
