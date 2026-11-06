import { Facebook, Instagram, Youtube } from 'lucide-react';
import { useSiteSettings } from '@/context/SiteContentContext';
import { SectionHeading } from '@/components/ui/SectionHeading';

/** Links to the shop's real social pages (Admin > Website Settings). Hidden until at least one is set. */
export function SocialSection({ title, description }: { title?: string | null; description?: string | null }) {
  const s = useSiteSettings();
  const links = [
    { label: 'Facebook', url: s.facebookUrl, Icon: Facebook },
    { label: 'Instagram', url: s.instagramUrl, Icon: Instagram },
    { label: 'YouTube', url: s.youtubeUrl, Icon: Youtube },
  ].filter((l) => l.url);
  if (links.length === 0) return null;
  return (
    <section className="container-page py-16 lg:py-20">
      <SectionHeading align="center" eyebrow="Follow us" title={title || 'Stay in touch'} description={description || 'New arrivals, offers and style inspiration.'} />
      <ul className="flex flex-wrap items-center justify-center gap-4">
        {links.map(({ label, url, Icon }) => (
          <li key={label}>
            <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 border border-line px-5 py-3 text-xs font-medium uppercase tracking-[0.16em] text-primary transition-colors hover:border-primary">
              <Icon size={16} aria-hidden="true" /> {label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
