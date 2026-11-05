import { useCallback, useEffect, useRef, useState } from 'react';
import {
  adminDeleteImage, adminListImages, adminMoveImage, adminSetMainImage, adminUpdateImageAlt, adminUploadImage, type AdminImage,
} from '@/lib/adminApi';
import { FormMessage } from '@/components/ui/Field';
import { Card, dangerBtn, smallBtn } from './AdminUi';

/** Upload, order, choose the main image, and delete product photos. Files go to the public product-images bucket. */
export function ImageManager({ productId }: { productId: string }) {
  const [images, setImages] = useState<AdminImage[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setImages(await adminListImages(productId));
    } catch (e) {
      setImages([]);
      setMsg({ kind: 'error', text: e instanceof Error ? e.message : 'Could not load images.' });
    }
  }, [productId]);
  useEffect(() => {
    load();
  }, [load]);

  const act = async (fn: () => Promise<void>, ok?: string) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      if (ok) setMsg({ kind: 'success', text: ok });
    } catch (e) {
      setMsg({ kind: 'error', text: e instanceof Error ? e.message : 'Something went wrong.' });
    } finally {
      await load();
      setBusy(false);
    }
  };

  const upload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = [...files];
    void act(async () => {
      let current = images ?? [];
      let done = 0;
      const failures: string[] = [];
      for (const f of list) {
        try {
          await adminUploadImage(productId, f, current);
          current = await adminListImages(productId);
          done++;
        } catch (e) {
          failures.push(`${f.name}: ${e instanceof Error ? e.message : 'failed'}`);
        }
      }
      if (input.current) input.current.value = '';
      if (failures.length) throw new Error(`${done} uploaded. ${failures.join(' · ')}`);
    }, `${list.length} image${list.length === 1 ? '' : 's'} uploaded.`);
  };

  const ordered = images ?? [];

  return (
    <Card title="Photos">
      <p className="mb-4 text-sm text-muted">JPG, PNG, WebP or AVIF, up to 5 MB each. The first photo (or the one marked Main) is used on product cards.</p>
      {msg && <div className="mb-4"><FormMessage kind={msg.kind}>{msg.text}</FormMessage></div>}

      {images === null ? (
        <p role="status" className="text-sm text-muted">Loading…</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {ordered.map((img, i) => (
            <li key={img.id} className="border border-line">
              <div className="relative aspect-[3/4] bg-secondary">
                <img src={img.url} alt={img.alt ?? ''} className="h-full w-full object-cover" loading="lazy" />
                {img.is_main && <span className="absolute left-2 top-2 bg-primary px-2 py-0.5 text-[10px] uppercase tracking-widest text-white">Main</span>}
              </div>
              <div className="space-y-2 p-2">
                <input
                  className="input !py-1.5 text-xs"
                  placeholder="Alt text (describes the photo)"
                  defaultValue={img.alt ?? ''}
                  maxLength={150}
                  aria-label="Alt text"
                  onBlur={(e) => e.target.value.trim() !== (img.alt ?? '') && act(() => adminUpdateImageAlt(img.id, e.target.value))}
                />
                <div className="flex flex-wrap gap-1">
                  <button className={smallBtn} disabled={busy || i === 0} onClick={() => act(() => adminMoveImage(img, ordered[i - 1]))} aria-label="Move earlier">←</button>
                  <button className={smallBtn} disabled={busy || i === ordered.length - 1} onClick={() => act(() => adminMoveImage(img, ordered[i + 1]))} aria-label="Move later">→</button>
                  {!img.is_main && <button className={smallBtn} disabled={busy} onClick={() => act(() => adminSetMainImage(productId, img.id), 'Main photo updated.')}>Main</button>}
                  <button
                    className={dangerBtn}
                    disabled={busy}
                    onClick={() => window.confirm('Delete this photo?') && act(() => adminDeleteImage(img, ordered.filter((x) => x.id !== img.id)), 'Photo deleted.')}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5">
        <label className={`${smallBtn} inline-block cursor-pointer`}>
          {busy ? 'Working…' : 'Upload photos'}
          <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" disabled={busy} onChange={(e) => upload(e.target.files)} />
        </label>
      </div>
    </Card>
  );
}
