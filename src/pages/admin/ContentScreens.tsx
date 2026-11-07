import { ResourceAdmin, type ResourceConfig } from '@/components/admin/ResourceAdmin';
import type { FieldDef } from '@/lib/adminResource';

const win: FieldDef[] = [
  { name: 'starts_at', label: 'Show from (optional)', type: 'datetime' },
  { name: 'ends_at', label: 'Show until (optional)', type: 'datetime' },
];

const BANNERS: ResourceConfig = {
  table: 'banners', title: 'Banners', singular: 'Banner', orderBy: ['sort_order', 'created_at'], activeField: 'is_active', bucket: 'banners',
  subtitle: 'Promotional banners shown on the homepage. Add a photo, a short title and where the button should go. Banners can be scheduled.',
  defaults: { position: 'home_promo', sort_order: 0, is_active: true },
  fields: [
    { name: 'title', label: 'Title', type: 'text', required: true, max: 80, list: true },
    { name: 'subtitle', label: 'Subtitle', type: 'text', max: 160, list: true },
    { name: 'image_url', label: 'Photo', type: 'image', list: true, hint: 'Wide photos work best (at least 1200 px). JPG, PNG, WebP or AVIF, up to 5 MB.' },
    { name: 'button_label', label: 'Button text', type: 'text', max: 30 },
    { name: 'button_link', label: 'Button link', type: 'link', max: 300, hint: 'A page on your site like /collections/winter, or a full https:// link.' },
    { name: 'position', label: 'Where it shows', type: 'select', required: true, options: [{ value: 'home_promo', label: 'Homepage promotions' }] },
    ...win,
    { name: 'sort_order', label: 'Order (lowest first)', type: 'number', required: true, min: 0, list: true },
    { name: 'is_active', label: 'Visible', type: 'bool' },
  ],
};

const HERO: ResourceConfig = {
  table: 'hero_slides', title: 'Hero Slider', singular: 'Slide', orderBy: ['sort_order', 'created_at'], activeField: 'is_active', bucket: 'banners',
  subtitle: 'The large slides at the top of the homepage. Until you add a slide, a simple welcome slide is shown.',
  defaults: { sort_order: 0, is_active: true },
  fields: [
    { name: 'title', label: 'Headline', type: 'text', required: true, max: 80, list: true },
    { name: 'eyebrow', label: 'Small text above headline', type: 'text', max: 40, list: true },
    { name: 'description', label: 'Description', type: 'textarea', max: 240, rows: 2 },
    { name: 'image_url', label: 'Photo', type: 'image', list: true, hint: 'Landscape, at least 1600 px wide. Text sits on the left, so keep the left side calm.' },
    { name: 'button_label', label: 'Button text', type: 'text', max: 30 },
    { name: 'button_link', label: 'Button link', type: 'link', max: 300 },
    ...win,
    { name: 'sort_order', label: 'Order (lowest first)', type: 'number', required: true, min: 0, list: true },
    { name: 'is_active', label: 'Visible', type: 'bool' },
  ],
};

const SECTION_NAMES: Record<string, string> = {
  hero: 'Hero slider', trust_bar: 'Trust bar', collections: "Women's / Men's tiles", new_arrivals: 'New arrivals', best_sellers: 'Best sellers',
  promo_banners: 'Promotional banners', trending: 'Trending products', winter: 'Winter collection', discount: 'Special offers', featured: 'Featured products',
  reviews: 'Customer reviews', newsletter: 'Newsletter sign-up', social: 'Social links',
};

const HOME: ResourceConfig = {
  table: 'homepage_sections', title: 'Homepage Builder', singular: 'Section', orderBy: ['sort_order'], activeField: 'is_enabled', canCreate: false, canDelete: false,
  subtitle: 'Choose which sections appear on the homepage and in what order (lowest number first). You can also change a section’s heading and text.',
  fields: [
    { name: 'key', label: 'Section', type: 'text', fixed: true, list: true },
    { name: 'title', label: 'Heading (optional)', type: 'text', max: 80, list: true, hint: 'Leave empty to use the standard heading.' },
    { name: 'description', label: 'Text under the heading (optional)', type: 'textarea', max: 200, rows: 2 },
    { name: 'sort_order', label: 'Order (lowest first)', type: 'number', required: true, min: 0, list: true },
    { name: 'is_enabled', label: 'Show on homepage', type: 'bool' },
  ],
  intro: <p className="text-xs text-muted">Sections: {Object.values(SECTION_NAMES).join(', ')}. Product rows show products flagged in Products (New Arrival, Best Seller, Trending, Featured) or in the Winter and Special Offers collections.</p>,
};

const PAGES: ResourceConfig = {
  table: 'pages', title: 'Website Pages', singular: 'Page', orderBy: ['title'], activeField: 'is_published',
  subtitle: 'The text of About Us, policies and FAQ. Pages with these addresses are linked from the site: about, privacy-policy, terms-and-conditions, return-refund-policy, shipping-policy, faq.',
  defaults: { is_published: true },
  fields: [
    { name: 'title', label: 'Title', type: 'text', required: true, max: 120, list: true },
    { name: 'slug', label: 'Address (slug)', type: 'slug', required: true, max: 80, fixed: true, list: true, hint: 'Set once when created, e.g. about. Lowercase letters, numbers and hyphens.' },
    { name: 'content', label: 'Text', type: 'textarea', required: true, max: 50000, rows: 14, hint: 'Start a line with ## for a heading. Leave a blank line between paragraphs. For the FAQ page write each question on its own line, the answer on the next lines, and leave a blank line between questions.' },
    { name: 'seo_title', label: 'Search engine title (optional)', type: 'text', max: 70 },
    { name: 'seo_description', label: 'Search engine description (optional)', type: 'textarea', max: 160, rows: 2 },
    { name: 'is_published', label: 'Published', type: 'bool' },
  ],
  confirmDelete: (r) => `Delete the page "${r.title}"? Its link will stop working.`,
};

const BLOG: ResourceConfig = {
  table: 'blog_posts', title: 'Blog Posts', singular: 'Post', orderBy: ['created_at'], activeField: 'is_published', bucket: 'banners',
  subtitle: 'Articles shown at /blog. A post is visible only when Published is ticked and its publish date has passed. Add a Blog link in Navigation Menu, or it appears in the footer once a post is published.',
  defaults: { is_published: false },
  fields: [
    { name: 'title', label: 'Title', type: 'text', required: true, max: 140, list: true },
    { name: 'slug', label: 'Address (slug)', type: 'slug', required: true, max: 100, fixed: true, list: true, hint: 'Set once when created, e.g. eid-style-guide. The article link will be /blog/eid-style-guide.' },
    { name: 'cover_image_url', label: 'Cover photo', type: 'image', hint: 'Landscape, at least 1200 px wide. This is also the picture shown when the article is shared.' },
    { name: 'excerpt', label: 'Short summary', type: 'textarea', max: 300, rows: 2, hint: 'Shown on the blog list and in Google/WhatsApp previews.' },
    { name: 'content', label: 'Article', type: 'textarea', required: true, max: 50000, rows: 16, hint: 'Start a line with ## for a heading. Leave a blank line between paragraphs. Plain text only.' },
    { name: 'published_at', label: 'Publish date (optional)', type: 'datetime', list: true, hint: 'Leave empty to publish immediately when ticked. Set a future date to schedule.' },
    { name: 'seo_title', label: 'Search engine title (optional)', type: 'text', max: 70 },
    { name: 'seo_description', label: 'Search engine description (optional)', type: 'textarea', max: 160, rows: 2 },
    { name: 'is_published', label: 'Published', type: 'bool' },
  ],
  confirmDelete: (r) => `Delete the post "${r.title}"? Its link will stop working.`,
};

const MENUS: ResourceConfig = {
  table: 'menus', title: 'Navigation Menu', singular: 'Menu item', orderBy: ['location', 'sort_order'], activeField: 'is_active',
  subtitle: 'Header links override the built-in navigation as soon as you add one (leave empty to keep the standard menu with category dropdowns). For the footer, add a heading item, then links under it using "Parent"; up to three headings show as columns.',
  defaults: { location: 'header', sort_order: 0, is_active: true },
  fields: [
    { name: 'label', label: 'Text', type: 'text', required: true, max: 40, list: true },
    { name: 'url', label: 'Link', type: 'link', required: true, max: 300, list: true, hint: 'A page on your site like /shop, or a full https:// link.' },
    { name: 'location', label: 'Where', type: 'select', required: true, list: true, options: [{ value: 'header', label: 'Header' }, { value: 'footer', label: 'Footer' }, { value: 'mobile', label: 'Mobile menu' }] },
    { name: 'parent_id', label: 'Parent (for dropdowns and footer columns)', type: 'select' },
    { name: 'sort_order', label: 'Order (lowest first)', type: 'number', required: true, min: 0, list: true },
    { name: 'is_active', label: 'Visible', type: 'bool' },
  ],
  dynamicOptions: (rows, editing) => ({
    parent_id: rows.filter((r) => !r.parent_id && r.id !== editing?.id).map((r) => ({ value: r.id, label: `${r.label} (${r.location})` })),
  }),
  extraCheck: (v, editing, rows): Record<string, string> => {
    const p = rows.find((r) => r.id === v.parent_id);
    if (v.parent_id && p && p.location !== v.location) return { parent_id: 'The parent must be in the same place' };
    if (editing && v.parent_id === editing.id) return { parent_id: 'An item cannot be its own parent' };
    return {};
  },
  confirmDelete: (r) => `Delete "${r.label}"? Items under it are deleted too.`,
};

export const Banners = () => <ResourceAdmin cfg={BANNERS} />;
export const HeroSlides = () => <ResourceAdmin cfg={HERO} />;
export const HomepageBuilder = () => <ResourceAdmin cfg={HOME} />;
export const WebsitePages = () => <ResourceAdmin cfg={PAGES} />;
export const BlogPosts = () => <ResourceAdmin cfg={BLOG} />;
export const NavigationMenu = () => <ResourceAdmin cfg={MENUS} />;
