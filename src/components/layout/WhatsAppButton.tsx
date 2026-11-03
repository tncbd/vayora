import { MessageCircle } from 'lucide-react';
import { siteSettings } from '@/data/placeholder';

/** Only renders when a valid WhatsApp number (digits, country code included) is configured. */
export function WhatsAppButton() {
  const number = siteSettings.whatsapp.replace(/\D/g, '');
  if (!/^\d{10,15}$/.test(siteSettings.whatsapp)) return null;
  return (
    <a
      href={`https://wa.me/${number}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105"
    >
      <MessageCircle size={24} />
    </a>
  );
}
