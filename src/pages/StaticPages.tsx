import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Field, FormMessage } from '@/components/ui/Field';
import NotFound from '@/pages/NotFound';
import { faqs as defaultFaqs } from '@/data/placeholder';
import { useSiteSettings } from '@/context/SiteContentContext';
import { useAsync } from '@/hooks/useAsync';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useSeo } from '@/hooks/useSeo';
import { clip } from '@/lib/seo';
import { fetchPage } from '@/lib/contentApi';
import { parseContent, parseFaq } from '@/lib/siteContent';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { contactSchema, type ContactInput, type ContactOutput } from '@/lib/validation';

const PROSE = 'mx-auto max-w-3xl space-y-5 text-[15px] leading-relaxed text-ink [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-medium';

/** A page whose text is edited in Admin > Website Pages. Without a database the built-in text is shown. */
function DbPage({ slug, title, fallback }: { slug: string; title: string; fallback: ReactNode }) {
  const { data, loading } = useAsync(() => fetchPage(slug), [slug]);
  usePageTitle(data?.seo_title || data?.title || title);
  useSeo(data ? { description: data.seo_description || clip(data.content.replace(/^## /gm, ''), 160) } : null);
  if (!isSupabaseConfigured) return <Shell title={title}>{fallback}</Shell>;
  if (loading && data === undefined) return <Shell title={title}><p role="status" className="text-sm text-muted">Loading…</p></Shell>;
  if (!data) return <NotFound />;
  const draft = /^\s*DRAFT/i.test(data.content);
  return (
    <Shell title={data.title}>
      {draft && <p className="border border-accent/40 bg-accent/10 px-4 py-3 text-xs">This page still has placeholder text. Edit it in Admin &gt; Website Pages before launch.</p>}
      {parseContent(data.content).map((b, i) => (b.type === 'h2' ? <h2 key={i}>{b.text}</h2> : <p key={i} className="whitespace-pre-line">{b.text}</p>))}
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <PageHeader title={title} crumbs={[{ label: title }]} />
      <div className="container-page py-12 sm:py-16"><div className={PROSE}>{children}</div></div>
    </>
  );
}

export function AboutPage() {
  const { storeName } = useSiteSettings();
  return (
    <DbPage slug="about" title="About Us" fallback={<>
      <p>{storeName} is a Bangladesh-based fashion retailer offering men’s and women’s clothing for every moment, from everyday essentials to festive wear and winter collections.</p>
      <h2>Our promise</h2>
      <p>Quality you can feel, styles you will love, and a simple way to shop with Cash on Delivery across Bangladesh.</p>
    </>} />
  );
}
const note = <p className="border border-accent/40 bg-accent/10 px-4 py-3 text-xs">Draft text. The store owner edits this page in the admin panel.</p>;
export const PrivacyPage = () => <DbPage slug="privacy-policy" title="Privacy Policy" fallback={<>{note}<p>We collect only the information needed to process your orders and support you, such as your name, phone number and delivery address.</p></>} />;
export const TermsPage = () => <DbPage slug="terms-and-conditions" title="Terms and Conditions" fallback={<>{note}<p>By placing an order you agree to provide accurate information and to pay the product price on delivery, plus any delivery charge shown at checkout.</p></>} />;
export const RefundPage = () => <DbPage slug="return-refund-policy" title="Return and Refund Policy" fallback={<>{note}<p>If you receive a damaged, defective or incorrect item, please contact us promptly so we can arrange a resolution.</p></>} />;
export const ShippingPage = () => <DbPage slug="shipping-policy" title="Shipping Policy" fallback={<>{note}<p>We deliver across Bangladesh. Delivery charges and estimated delivery times depend on your delivery zone and are shown at checkout.</p></>} />;

export function FaqPage() {
  usePageTitle('FAQ');
  const { data } = useAsync(() => fetchPage('faq'), []);
  const items = data?.content ? parseFaq(data.content) : [];
  const list = items.length ? items : defaultFaqs;
  return (
    <>
      <PageHeader title="Frequently Asked Questions" crumbs={[{ label: 'FAQ' }]} />
      <div className="container-page py-12 sm:py-16">
        <div className="mx-auto max-w-3xl divide-y divide-line border-y border-line">
          {list.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-primary">
                {f.q}
                <span className="text-xl text-accent-dark transition-transform group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </>
  );
}

export function ContactPage() {
  usePageTitle('Contact Us');
  const s = useSiteSettings();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ContactInput, unknown, ContactOutput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', phone: '', email: '', message: '' },
  });
  const rows = [
    { label: 'Phone', value: s.phone, href: s.phone ? `tel:${s.phone.replace(/[^0-9+]/g, '')}` : '' },
    { label: 'Email', value: s.email, href: s.email ? `mailto:${s.email}` : '' },
    { label: 'Address', value: s.address, href: '' },
  ].filter((r) => r.value);

  const onSubmit = async (v: ContactOutput) => {
    setError(null);
    if (!supabase) { setError('The contact form is not connected right now.'); return; }
    const { error: e } = await supabase.rpc('submit_contact_message', { p_name: v.name, p_phone: v.phone ?? null, p_email: v.email || null, p_message: v.message });
    if (e) { setError(e.message.length < 140 ? e.message : 'We could not send your message. Please try again.'); return; }
    setSent(true);
    reset();
  };

  return (
    <>
      <PageHeader title="Contact Us" description="We are happy to help with orders and questions." crumbs={[{ label: 'Contact' }]} />
      <div className="container-page py-12 sm:py-16">
        <div className="mx-auto max-w-3xl space-y-10">
          {rows.length > 0 && (
            <dl className="grid gap-6 sm:grid-cols-3">
              {rows.map((r) => (
                <div key={r.label} className="border border-line p-5">
                  <dt className="eyebrow">{r.label}</dt>
                  <dd className="mt-2 text-sm text-ink">{r.href ? <a href={r.href} className="link-underline">{r.value}</a> : r.value}</dd>
                </div>
              ))}
            </dl>
          )}
          <section aria-labelledby="msg-h">
            <h2 id="msg-h" className="text-2xl font-medium">Send us a message</h2>
            {sent ? (
              <div className="mt-5"><FormMessage kind="success">Thank you. We have received your message and will reply soon.</FormMessage></div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-5 space-y-5">
                {error && <FormMessage kind="error">{error}</FormMessage>}
                <div className="grid gap-5 sm:grid-cols-3">
                  <Field label="Your name" error={errors.name?.message}><input className="input" autoComplete="name" {...register('name')} /></Field>
                  <Field label="Mobile number" error={errors.phone?.message}><input className="input" type="tel" inputMode="tel" autoComplete="tel" {...register('phone')} /></Field>
                  <Field label="Email (optional if you gave a number)" error={errors.email?.message}><input className="input" type="email" autoComplete="email" {...register('email')} /></Field>
                </div>
                <Field label="Message" error={errors.message?.message}><textarea className="input min-h-[140px]" {...register('message')} /></Field>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Sending…' : 'Send Message'}</Button>
              </form>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
