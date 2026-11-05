import { useState } from 'react';
import type { ProductImage } from '@/types';
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder';
import { cn } from '@/lib/cn';

export function ProductGallery({ images, name, label }: { images: ProductImage[]; name: string; label: string }) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const current = images[Math.min(index, images.length - 1)];

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      {images.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto sm:w-20 sm:flex-col sm:overflow-visible" aria-label="Product images">
          {images.map((img, i) => (
            <li key={img.id} className="shrink-0">
              <button
                onClick={() => setIndex(i)}
                aria-label={`Show image ${i + 1}`}
                aria-current={i === index}
                className={cn('block h-24 w-[4.5rem] overflow-hidden border sm:h-24 sm:w-20', i === index ? 'border-primary' : 'border-line opacity-70 hover:opacity-100')}
              >
                <img src={img.url} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div
        className="relative aspect-[3/4] flex-1 cursor-zoom-in overflow-hidden bg-secondary"
        onMouseMove={current ? onMove : undefined}
        onMouseLeave={() => setZoom(null)}
      >
        {current ? (
          <img
            src={current.url}
            alt={current.alt || name}
            className="h-full w-full object-cover transition-transform duration-150"
            style={zoom ? { transform: 'scale(2)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
          />
        ) : (
          <ImagePlaceholder alt={name} label={label} />
        )}
      </div>
    </div>
  );
}
