import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder';

const tiles = [
  {
    title: "Women's Collection",
    text: 'Saree · Three Piece · Kurti · Tops',
    to: '/women',
    tone: 'from-[#e9d9d2] to-[#f6eee8]',
    label: 'W',
  },
  {
    title: "Men's Collection",
    text: 'Panjabi · Polo · Shirts · Jeans',
    to: '/men',
    tone: 'from-[#d9dde0] to-[#eef0f1]',
    label: 'M',
  },
];

export function GenderCollections() {
  return (
    <section className="container-page py-16 lg:py-24">
      <SectionHeading
        align="center"
        eyebrow="Shop by"
        title="Collections"
        description="Fashion curated for every wardrobe."
      />
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
        {tiles.map((t) => (
          <Link key={t.to} to={t.to} className="group relative block aspect-[4/5] overflow-hidden sm:aspect-[3/4] lg:aspect-[4/5]">
            <ImagePlaceholder
              alt={t.title}
              tone={t.tone}
              label={t.label}
              className="transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-6 pt-20 sm:p-8">
              <h3 className="font-display text-3xl !text-white sm:text-4xl">{t.title}</h3>
              <p className="mt-1.5 text-sm text-white/80">{t.text}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-white">
                Shop now <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
