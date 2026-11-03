import { siteSettings } from '@/data/placeholder';

export function AnnouncementBar() {
  if (!siteSettings.announcement) return null;
  return (
    <div className="bg-primary px-4 py-2 text-center text-[11px] font-medium uppercase tracking-[0.2em] text-white">
      {siteSettings.announcement}
    </div>
  );
}
