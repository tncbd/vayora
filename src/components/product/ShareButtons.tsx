import { useState } from 'react';
import { Check, Copy, Facebook, MessageCircle } from 'lucide-react';
import { shareLinks } from '@/lib/shareMeta';

const btn = 'inline-flex items-center gap-2 border border-line px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] text-primary transition-colors hover:border-primary';

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const links = shareLinks(url, title);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this link', url);
    }
  };
  return (
    <div className="mt-6 flex flex-wrap items-center gap-2" aria-label="Share this product">
      <span className="mr-1 text-xs uppercase tracking-[0.14em] text-muted">Share</span>
      <a className={btn} href={links.whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle size={14} aria-hidden="true" />WhatsApp</a>
      <a className={btn} href={links.facebook} target="_blank" rel="noopener noreferrer"><Facebook size={14} aria-hidden="true" />Facebook</a>
      <button type="button" className={btn} onClick={copy}>{copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}{copied ? 'Copied' : 'Copy link'}</button>
    </div>
  );
}
