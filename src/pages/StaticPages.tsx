import type { ReactNode } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { siteSettings, faqs } from '@/data/placeholder';
import { usePageTitle } from '@/hooks/usePageTitle';

function Prose({ title, children }: { title: string; children: ReactNode }) {
  usePageTitle(title);
  return (
    <>
      <PageHeader title={title} crumbs={[{ label: title }]} />
      <div className="container-page py-12 sm:py-16">
        <div className="mx-auto max-w-3xl space-y-5 text-[15px] leading-relaxed text-ink [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-medium">
          <p className="border border-accent/40 bg-accent/10 px-4 py-3 text-xs">
            Draft content. This page will be fully editable from the admin panel (Phase 8). Please review with your legal advisor before launch.
          </p>
          {children}
        </div>
      </div>
    </>
  );
}

export function AboutPage() {
  return (
    <Prose title="About Us">
      <p>
        {siteSettings.storeName} is a Bangladesh-based fashion retailer offering men’s and women’s clothing for every
        moment — from everyday essentials to festive wear and winter collections.
      </p>
      <h2>Our promise</h2>
      <p>Quality you can feel, styles you will love, and a simple way to shop with Cash on Delivery across Bangladesh.</p>
    </Prose>
  );
}

export function PrivacyPage() {
  return (
    <Prose title="Privacy Policy">
      <p>We collect only the information needed to process your orders and support you, such as your name, phone number and delivery address.</p>
      <h2>How we use your information</h2>
      <p>To deliver orders, verify payments, provide customer support and improve our store. We do not sell your personal information.</p>
      <h2>Your choices</h2>
      <p>You may contact us to access, correct or request deletion of your personal data.</p>
    </Prose>
  );
}

export function TermsPage() {
  return (
    <Prose title="Terms and Conditions">
      <p>By placing an order you agree to provide accurate information and to pay the product price on delivery, plus any delivery charge shown at checkout.</p>
      <h2>Orders</h2>
      <p>Orders are subject to availability and confirmation. We may cancel orders we cannot fulfil.</p>
      <h2>Prices</h2>
      <p>All prices are in Bangladeshi Taka (BDT) and may change without notice.</p>
    </Prose>
  );
}

export function RefundPage() {
  return (
    <Prose title="Return and Refund Policy">
      <p>If you receive a damaged, defective or incorrect item, please contact us promptly so we can arrange a resolution.</p>
      <h2>Eligibility</h2>
      <p>Items should be unused and in original condition. Detailed return windows will be confirmed by the store before launch.</p>
      <h2>Refunds</h2>
      <p>Approved refunds are processed using a method agreed with the customer.</p>
    </Prose>
  );
}

export function ShippingPage() {
  return (
    <Prose title="Shipping Policy">
      <p>We deliver across Bangladesh. Delivery charges and estimated delivery times depend on your delivery zone and are shown at checkout.</p>
      <h2>Cash on Delivery</h2>
      <p>You pay the product price in cash on delivery. Depending on store settings, the delivery charge may be collected in advance via bKash, Nagad or Upay.</p>
    </Prose>
  );
}

export function FaqPage() {
  usePageTitle('FAQ');
  return (
    <>
      <PageHeader title="Frequently Asked Questions" crumbs={[{ label: 'FAQ' }]} />
      <div className="container-page py-12 sm:py-16">
        <div className="mx-auto max-w-3xl divide-y divide-line border-y border-line">
          {faqs.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-primary">
                {f.q}
                <span className="text-xl text-accent-dark transition-transform group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </>
  );
}

export function ContactPage() {
  usePageTitle('Contact Us');
  const rows = [
    { label: 'Phone', value: siteSettings.phone },
    { label: 'Email', value: siteSettings.email },
    { label: 'Address', value: siteSettings.address },
  ];
  return (
    <>
      <PageHeader title="Contact Us" description="We are happy to help with orders and questions." crumbs={[{ label: 'Contact' }]} />
      <div className="container-page py-12 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <dl className="grid gap-6 sm:grid-cols-3">
            {rows.map((r) => (
              <div key={r.label} className="border border-line p-5">
                <dt className="eyebrow">{r.label}</dt>
                <dd className="mt-2 text-sm text-ink">{r.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-8 border border-accent/40 bg-accent/10 px-4 py-3 text-xs">
            Contact details above are placeholders and become editable from the admin panel in Phase 8. The contact form is delivered with the backend (Phase 8).
          </p>
        </div>
      </div>
    </>
  );
}
