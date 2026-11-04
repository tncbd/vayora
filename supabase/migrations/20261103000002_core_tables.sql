-- VAYORA FASHION — 0002 core tables
-- Money columns are numeric(12,2) BDT. Slugs are lowercase-hyphenated.
-- Bangladeshi mobile numbers are stored normalised as 01XXXXXXXXX (11 digits).

-- ---------- identity ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text check (phone is null or phone ~ '^01[3-9][0-9]{8}$'),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
create index user_roles_user_id_idx on public.user_roles (user_id);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text,
  full_name text not null,
  phone text not null check (phone ~ '^01[3-9][0-9]{8}$'),
  alt_phone text check (alt_phone is null or alt_phone ~ '^01[3-9][0-9]{8}$'),
  district text not null,
  area text not null,
  address_line text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index addresses_user_id_idx on public.addresses (user_id);

-- ---------- catalogue ----------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories (id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  gender public.gender_type,
  description text,
  image_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index categories_parent_idx on public.categories (parent_id);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  description text,
  image_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  sku text not null unique,
  name text not null,
  short_description text,
  description text,
  category_id uuid references public.categories (id) on delete restrict,
  subcategory_id uuid references public.categories (id) on delete restrict,
  gender public.gender_type not null default 'unisex',
  regular_price numeric(12, 2) not null check (regular_price >= 0),
  selling_price numeric(12, 2) not null check (selling_price >= 0),
  status public.product_status not null default 'draft',
  is_featured boolean not null default false,
  is_bestseller boolean not null default false,
  is_new_arrival boolean not null default false,
  is_trending boolean not null default false,
  sales_count integer not null default 0 check (sales_count >= 0),
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (selling_price <= regular_price)
);
create index products_category_idx on public.products (category_id);
create index products_status_idx on public.products (status);
create index products_created_idx on public.products (created_at desc);
create index products_name_search_idx on public.products using gin (to_tsvector('simple', name));

create table public.product_collections (
  product_id uuid not null references public.products (id) on delete cascade,
  collection_id uuid not null references public.collections (id) on delete cascade,
  primary key (product_id, collection_id)
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null,
  alt text,
  sort_order integer not null default 0,
  is_main boolean not null default false,
  created_at timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id, sort_order);
create unique index product_images_one_main_idx on public.product_images (product_id) where is_main;

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  sku text not null unique,
  size text,
  color text,
  color_hex text check (color_hex is null or color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  price numeric(12, 2) check (price is null or price >= 0), -- optional override of product selling price
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index product_variants_product_idx on public.product_variants (product_id);
create unique index product_variants_combo_idx
  on public.product_variants (product_id, coalesce(size, ''), coalesce(color, ''));

create table public.inventory (
  variant_id uuid primary key references public.product_variants (id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0),
  reserved integer not null default 0 check (reserved >= 0),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  updated_at timestamptz not null default now(),
  check (reserved <= quantity)
);

-- ---------- cart / wishlist ----------
create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  quantity integer not null check (quantity between 1 and 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, variant_id)
);

create table public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.wishlists (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (wishlist_id, product_id)
);

-- ---------- delivery & coupons ----------
create table public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  districts text[] not null default '{}',
  areas text[] not null default '{}',
  charge numeric(12, 2) not null default 0 check (charge >= 0),
  free_delivery_threshold numeric(12, 2) check (free_delivery_threshold is null or free_delivery_threshold >= 0),
  estimated_days_min integer check (estimated_days_min is null or estimated_days_min >= 0),
  estimated_days_max integer check (estimated_days_max is null or estimated_days_max >= coalesce(estimated_days_min, 0)),
  priority integer not null default 0, -- higher = more specific, wins when several zones match
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code) and length(code) between 3 and 40),
  type public.coupon_type not null,
  value numeric(12, 2) not null check (value > 0),
  min_order_value numeric(12, 2) not null default 0 check (min_order_value >= 0),
  max_discount numeric(12, 2) check (max_discount is null or max_discount > 0),
  starts_at timestamptz,
  expires_at timestamptz,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  per_customer_limit integer check (per_customer_limit is null or per_customer_limit > 0),
  used_count integer not null default 0 check (used_count >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (type <> 'percentage' or value <= 100),
  check (expires_at is null or starts_at is null or expires_at > starts_at)
);

-- ---------- orders & payments ----------
create sequence public.order_number_seq start 1;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  tracking_token uuid not null unique default gen_random_uuid(), -- lets guests track without an account
  user_id uuid references auth.users (id) on delete set null,
  customer_name text not null,
  phone text not null check (phone ~ '^01[3-9][0-9]{8}$'),
  alt_phone text check (alt_phone is null or alt_phone ~ '^01[3-9][0-9]{8}$'),
  email text,
  district text not null,
  area text not null,
  address text not null,
  delivery_instructions text,
  notes text,
  delivery_zone_id uuid references public.delivery_zones (id) on delete set null,
  coupon_id uuid references public.coupons (id) on delete set null,
  coupon_code text,
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  discount_total numeric(12, 2) not null default 0 check (discount_total >= 0),
  delivery_charge numeric(12, 2) not null default 0 check (delivery_charge >= 0),
  total numeric(12, 2) not null check (total >= 0),
  advance_amount numeric(12, 2) not null default 0 check (advance_amount >= 0), -- paid up-front (delivery charge)
  cod_amount numeric(12, 2) not null check (cod_amount >= 0),                    -- collected on delivery
  status public.order_status not null default 'pending_order_review',
  courier_company text,
  tracking_number text,
  internal_notes text,
  placed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (discount_total <= subtotal),
  check (total = subtotal - discount_total + delivery_charge),
  check (advance_amount = 0 or advance_amount = delivery_charge),
  check (cod_amount = total - advance_amount)
);
create index orders_user_idx on public.orders (user_id);
create index orders_status_idx on public.orders (status);
create index orders_phone_idx on public.orders (phone);
create index orders_placed_idx on public.orders (placed_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  product_name text not null, -- snapshots: survive later catalogue edits
  sku text not null,
  size text,
  color text,
  image_url text,
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(12, 2) not null check (line_total >= 0),
  check (line_total = unit_price * quantity)
);
create index order_items_order_idx on public.order_items (order_id);

create table public.payment_methods (
  code public.payment_method_code primary key,
  display_name text not null,
  merchant_number text check (merchant_number is null or merchant_number ~ '^01[3-9][0-9]{8}$'),
  instructions text,
  is_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  method public.payment_method_code not null references public.payment_methods (code),
  amount numeric(12, 2) not null check (amount > 0),
  status public.payment_status not null default 'pending',
  sender_number text check (sender_number is null or sender_number ~ '^01[3-9][0-9]{8}$'),
  transaction_id text check (transaction_id is null or length(trim(transaction_id)) between 6 and 40),
  proof_path text, -- path inside the private payment-proofs bucket
  rejection_reason text,
  attempt integer not null default 1 check (attempt >= 1),
  submitted_at timestamptz,
  verified_by uuid references auth.users (id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_order_idx on public.payments (order_id);
create index payments_status_idx on public.payments (status);
-- one live use of a transaction id per method; a rejected payment frees the id
create unique index payments_txn_unique_idx
  on public.payments (method, upper(transaction_id))
  where transaction_id is not null and status <> 'rejected';

create table public.coupon_usages (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons (id) on delete cascade,
  order_id uuid not null unique references public.orders (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  phone text,
  discount_amount numeric(12, 2) not null check (discount_amount >= 0),
  created_at timestamptz not null default now()
);
create index coupon_usages_coupon_idx on public.coupon_usages (coupon_id);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  note text,
  is_public boolean not null default true, -- customers only see public rows
  changed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index order_status_history_order_idx on public.order_status_history (order_id, created_at);

-- ---------- content ----------
create table public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_url text,
  button_label text,
  button_link text,
  position text not null default 'home_promo',
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.hero_slides (
  id uuid primary key default gen_random_uuid(),
  eyebrow text,
  title text not null,
  description text,
  image_url text,
  button_label text,
  button_link text,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.homepage_sections (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text,
  description text,
  image_url text,
  button_label text,
  button_link text,
  config jsonb not null default '{}',
  is_enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  title text,
  comment text check (comment is null or length(comment) <= 2000),
  image_urls text[] not null default '{}',
  status public.review_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  content text not null default '',
  is_published boolean not null default true,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.menus (
  id uuid primary key default gen_random_uuid(),
  location text not null check (location in ('header', 'footer', 'mobile')),
  parent_id uuid references public.menus (id) on delete cascade,
  label text not null,
  url text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.site_settings (
  key text primary key,
  value jsonb not null,
  is_public boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email) and length(email) <= 254),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index newsletter_email_idx on public.newsletter_subscribers (email);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  message text not null check (length(message) <= 5000),
  status public.message_status not null default 'new',
  created_at timestamptz not null default now()
);

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  excerpt text,
  content text not null default '',
  cover_image_url text,
  is_published boolean not null default false,
  published_at timestamptz,
  author_id uuid references auth.users (id) on delete set null,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index admin_activity_logs_created_idx on public.admin_activity_logs (created_at desc);
create index admin_activity_logs_actor_idx on public.admin_activity_logs (actor_id);

-- ---------- updated_at triggers ----------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'addresses', 'categories', 'collections', 'products', 'product_variants',
    'inventory', 'carts', 'cart_items', 'delivery_zones', 'coupons', 'orders',
    'payment_methods', 'payments', 'banners', 'hero_slides', 'homepage_sections',
    'reviews', 'pages', 'menus', 'site_settings', 'blog_posts'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t);
  end loop;
end
$$;
