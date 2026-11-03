import { Link } from 'react-router-dom';
import { Facebook, Instagram, Youtube } from 'lucide-react';
import { siteSettings } from '@/data/placeholder';

const shopLinks = [
  { label: 'Shop All', to: '/shop' },
  { label: "Women's Collection", to: '/women' },
  { label: "Men's Collection", to: '/men' },
  { label: 'New Arrivals', to: '/collections/new-arrivals' },
  { label: 'Winter Collection', to: '/collections/winter' },
];

const helpLinks = [
  { label: 'Track Order', to: '/track-order' },
  { label: 'Contact Us', to: '/contact' },
  { label: 'FAQ', to: '/faq' },
  { label: 'Shipping Policy', to: '/shipping-policy' },
  { label: 'Return & Refund Policy', to: '/return-refund-policy' },
];

const companyLinks = [
  { label: 'About Us', to: '/about' },
  { label: 'Privacy Policy', to: '/privacy-policy' },
  { label: 'Terms & Conditions', to: '/terms-and-conditions' },
  { label: 'My Account', to: '/account' },
];

function LinkColumn({ title, links }: { title: string; links: { label: string; to: string }[] }) {
  return (
    <div>
      <h3 className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-white">{title}</h3>
      <ul className="mt-5 space-y-3">
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="text-sm text-white/65 transition-colors hover:text-accent">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  const socials = [
    { label: 'Facebook', url: siteSettings.facebookUrl, Icon: Facebook },
    { label: 'Instagram', url: siteSettings.instagramUrl, Icon: Instagram },
    { label: 'YouTube', url: siteSettings.youtubeUrl, Icon: Youtube },
  ].filter((s) => s.url);

  return (
    <footer className="bg-primary text-white">
      <div className="container-page grid gap-12 py-14 sm:grid-cols-2 lg:grid-cols-4 lg:py-16">
        <div>
          <p className="font-display text-3xl font-semibold tracking-[0.12em]">VAYORA</p>
          <p className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.5em] text-accent">Fashion</p>
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/65">{siteSettings.footerText}</p>
          {socials.length > 0 && (
            <ul className="mt-6 flex gap-3">
              {socials.map(({ label, url, Icon }) => (
                <li key={label}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex h-9 w-9 items-center justify-center border border-white/25 transition-colors hover:border-accent hover:text-accent"
                  >
                    <Icon size={16} />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        <LinkColumn title="Shop" links={shopLinks} />
        <LinkColumn title="Customer Care" links={helpLinks} />
        <LinkColumn title="Company" links={companyLinks} />
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-3 py-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>{siteSettings.copyright}</p>
          <p>Cash on Delivery · bKash · Nagad · Upay</p>
        </div>
      </div>
    </footer>
  );
}
