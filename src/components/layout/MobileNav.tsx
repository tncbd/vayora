import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, X } from 'lucide-react';
import { useSiteSettings } from '@/context/SiteContentContext';
import { useNavItems } from '@/hooks/useCategories';
import { cn } from '@/lib/cn';

export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navItems = useNavItems();
  const siteSettings = useSiteSettings();
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[55] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="absolute inset-0 animate-fade-in bg-primary/50" onClick={onClose} aria-hidden="true" />
      <nav className="absolute inset-y-0 left-0 flex w-[85%] max-w-sm animate-slide-in flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <span className="font-display text-2xl font-semibold tracking-wide text-primary">VAYORA</span>
          <button onClick={onClose} aria-label="Close menu" className="p-2">
            <X size={22} />
          </button>
        </div>

        <ul className="flex-1 overflow-y-auto px-5 py-2">
          {navItems.map((item) => (
            <li key={item.label} className="border-b border-line">
              {item.children ? (
                <>
                  <button
                    className="flex w-full items-center justify-between py-4 text-left text-sm font-medium uppercase tracking-[0.15em]"
                    onClick={() => setExpanded(expanded === item.label ? null : item.label)}
                    aria-expanded={expanded === item.label}
                  >
                    {item.label}
                    <ChevronDown size={18} className={cn('transition-transform', expanded === item.label && 'rotate-180')} />
                  </button>
                  {expanded === item.label && (
                    <ul className="pb-3 pl-3">
                      <li>
                        <Link to={item.to} onClick={onClose} className="block py-2 text-sm font-medium text-accent-dark">
                          Shop all {item.label}
                        </Link>
                      </li>
                      {item.children.map((c) => (
                        <li key={c.to}>
                          <Link to={c.to} onClick={onClose} className="block py-2 text-sm text-ink">
                            {c.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <Link to={item.to} onClick={onClose} className="block py-4 text-sm font-medium uppercase tracking-[0.15em]">
                  {item.label}
                </Link>
              )}
            </li>
          ))}
        </ul>

        <div className="space-y-2 border-t border-line bg-secondary px-5 py-5 text-sm">
          <Link to="/account" onClick={onClose} className="block py-1">My Account</Link>
          <Link to="/track-order" onClick={onClose} className="block py-1">Track Order</Link>
          <Link to="/contact" onClick={onClose} className="block py-1">Contact Us</Link>
          {siteSettings.phone && <p className="pt-2 text-xs text-muted">{siteSettings.phone}</p>}
        </div>
      </nav>
    </div>
  );
}
