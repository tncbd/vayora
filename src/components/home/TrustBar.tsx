import { Banknote, RefreshCw, Truck, MessageCircle } from 'lucide-react';

const items = [
  { Icon: Banknote, title: 'Cash on Delivery', text: 'Pay when you receive' },
  { Icon: Truck, title: 'Nationwide Delivery', text: 'Across Bangladesh' },
  { Icon: RefreshCw, title: 'Easy Returns', text: 'See our return policy' },
  { Icon: MessageCircle, title: 'Customer Support', text: 'We are here to help' },
];

export function TrustBar() {
  return (
    <section className="border-b border-line bg-secondary" aria-label="Store benefits">
      <ul className="container-page grid grid-cols-2 gap-y-6 py-7 lg:grid-cols-4">
        {items.map(({ Icon, title, text }) => (
          <li key={title} className="flex items-center gap-3.5 pr-2">
            <Icon size={26} strokeWidth={1.4} className="shrink-0 text-accent-dark" aria-hidden="true" />
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">{title}</p>
              <p className="mt-0.5 text-xs text-muted">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
