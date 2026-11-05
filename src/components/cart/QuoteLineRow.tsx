import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import type { QuoteLine } from '@/lib/checkoutApi';
import { MAX_LINE_QTY } from '@/lib/cart';
import { formatBDT } from '@/lib/format';
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder';

interface Props {
  line: QuoteLine;
  /** When provided, quantity can be changed and the line removed. */
  onQty?: (q: number) => void;
  onRemove?: () => void;
}

export function QuoteLineRow({ line, onQty, onRemove }: Props) {
  const bad = line.status !== 'ok';
  const max = Math.max(1, Math.min(MAX_LINE_QTY, line.available || MAX_LINE_QTY));
  const options = [line.size, line.color].filter(Boolean).join(' · ');
  return (
    <li className="flex gap-4 border-b border-line py-5">
      <div className="h-28 w-24 shrink-0 overflow-hidden bg-secondary">
        <ImagePlaceholder src={line.imageUrl} alt={line.productName} className="h-full w-full" label={line.productName.charAt(0)} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex justify-between gap-3">
          <div className="min-w-0">
            {line.slug && !bad ? (
              <Link to={`/product/${line.slug}`} className="block truncate font-medium text-primary hover:text-accent-dark">{line.productName}</Link>
            ) : (
              <p className="truncate font-medium text-primary">{line.productName}</p>
            )}
            {options && <p className="mt-0.5 text-xs text-muted">{options}</p>}
            {!bad && <p className="mt-1 text-sm text-muted">{formatBDT(line.unitPrice)} each</p>}
          </div>
          {!bad && <p className="whitespace-nowrap text-sm font-medium">{formatBDT(line.lineTotal)}</p>}
        </div>
        {line.status === 'unavailable' && <p role="alert" className="mt-2 text-xs text-red-700">This item is no longer available. Please remove it.</p>}
        {line.status === 'insufficient' && (
          <p role="alert" className="mt-2 text-xs text-red-700">
            {line.available > 0 ? `Only ${line.available} left. Please lower the quantity.` : 'Sold out. Please remove it.'}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between pt-3">
          {onQty ? (
            <div className="inline-flex items-center border border-line" role="group" aria-label={`Quantity for ${line.productName}`}>
              <button className="p-2 disabled:opacity-40" aria-label="Decrease quantity" disabled={line.quantity <= 1} onClick={() => onQty(line.quantity - 1)}><Minus size={14} /></button>
              <span className="w-9 text-center text-sm" aria-live="polite">{line.quantity}</span>
              <button className="p-2 disabled:opacity-40" aria-label="Increase quantity" disabled={line.quantity >= max} onClick={() => onQty(line.quantity + 1)}><Plus size={14} /></button>
            </div>
          ) : (
            <span className="text-sm text-muted">Qty {line.quantity}</span>
          )}
          {onRemove && (
            <button onClick={onRemove} className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.12em] text-muted hover:text-red-700" aria-label={`Remove ${line.productName}`}>
              <Trash2 size={14} /> Remove
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
