import { Instagram } from 'lucide-react';
import { siteSettings } from '@/data/placeholder';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder';

const tones = [
  'from-[#e9d9d2] to-[#f6eee8]',
  'from-[#d9dde0] to-[#eef0f1]',
  'from-[#e6dfcf] to-[#f6f2e8]',
  'from-[#dfd5cf] to-[#f3ece7]',
  'from-[#d6dadf] to-[#ecedf0]',
  'from-[#e8e1d2] to-[#f7f3ea]',
];

/**
 * Social grid. Real feed posts need an Instagram integration or admin-uploaded images
 * (Phase 8). Until then tiles are neutral placeholders and link only when a URL is set.
 */
export function SocialSection() {
  const url = siteSettings.instagramUrl;
  return (
    <section className="container-page py-16 lg:py-24">
      <SectionHeading align="center" eyebrow="Follow us" title="@vayorafashion" description="Style inspiration from our community." />
      <ul className="grid grid-cols-3 gap-1.5 sm:gap-3 lg:grid-cols-6">
        {tones.map((tone, i) => (
          <li key={i} className="aspect-square overflow-hidden">
            <ImagePlaceholder alt={`Social post ${i + 1}`} tone={tone} label="V" />
          </li>
        ))}
      </ul>
      {url && (
        <div className="mt-8 text-center">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="link-underline inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-primary"
          >
            <Instagram size={16} /> Follow on Instagram
          </a>
        </div>
      )}
    </section>
  );
}
