-- Citymarket Dakar schema for a self-hosted Postgres (Neon).
-- Mirrors scripts/migration-tables.sql but in the public schema and idempotent.
-- Safe to re-run: uses CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  role text NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  pass_hash text NOT NULL,
  pass_salt text NOT NULL,
  created_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id text PRIMARY KEY,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS addresses (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  label text,
  recipient_name text,
  phone text,
  zone_id uuid,
  address_text text,
  lat jsonb,
  lng jsonb,
  is_default boolean,
  created_at timestamptz
);

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY,
  slug text UNIQUE,
  name text NOT NULL,
  description text,
  icon text,
  sort integer
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY,
  category_id uuid NOT NULL,
  name text NOT NULL,
  slug text,
  description text,
  image_url text,
  price integer NOT NULL,
  compare_price integer,
  stock integer,
  active boolean,
  rating jsonb,
  sold_count integer,
  created_at timestamptz
);

CREATE TABLE IF NOT EXISTS product_variants (
  id uuid PRIMARY KEY,
  product_id uuid NOT NULL,
  kind text,
  label text NOT NULL,
  price_delta integer,
  stock integer
);

CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  created_at timestamptz
);

CREATE TABLE IF NOT EXISTS packages (
  id uuid PRIMARY KEY,
  user_id uuid,
  name text NOT NULL,
  description text,
  discount_percent integer,
  active boolean,
  created_at timestamptz
);

CREATE TABLE IF NOT EXISTS package_items (
  id uuid PRIMARY KEY,
  package_id uuid NOT NULL,
  product_id uuid NOT NULL,
  variant_id uuid,
  qty integer
);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY,
  code text UNIQUE,
  user_id uuid NOT NULL,
  status text NOT NULL,
  subtotal integer,
  package_discount integer,
  coupon_discount integer,
  bonus_discount integer,
  delivery_fee integer,
  total integer,
  coupon_code text,
  address_snapshot jsonb,
  gift jsonb,
  payment_method text,
  zone_id uuid,
  delivery_staff_id uuid,
  created_at timestamptz,
  updated_at timestamptz
);

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY,
  order_id uuid NOT NULL,
  product_id uuid,
  variant_id uuid,
  name_snapshot text,
  qty integer,
  unit_price integer
);

CREATE TABLE IF NOT EXISTS order_events (
  id uuid PRIMARY KEY,
  order_id uuid NOT NULL,
  status text,
  note text,
  created_at timestamptz
);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY,
  order_id uuid NOT NULL,
  method text,
  status text,
  reference text,
  confirmed_by uuid,
  created_at timestamptz,
  updated_at timestamptz
);

CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY,
  code text UNIQUE,
  kind text,
  value integer,
  min_order integer,
  expires_at text,
  usage_limit integer,
  used_count integer,
  active boolean,
  category_id uuid
);

CREATE TABLE IF NOT EXISTS bonus_transactions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  amount integer,
  reason text,
  order_id uuid,
  created_at timestamptz
);

CREATE TABLE IF NOT EXISTS reward_campaigns (
  id uuid PRIMARY KEY,
  name text,
  kind text,
  value integer,
  threshold integer,
  active boolean,
  created_at timestamptz
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  title text,
  body text,
  kind text,
  read boolean,
  created_at timestamptz
);

CREATE TABLE IF NOT EXISTS delivery_zones (
  id uuid PRIMARY KEY,
  slug text,
  name text NOT NULL,
  fee integer,
  cod_enabled boolean,
  lat jsonb,
  lng jsonb,
  radius_km integer,
  active boolean
);

CREATE TABLE IF NOT EXISTS delivery_staff (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  phone text,
  active boolean
);

CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value text
);

-- Indexes for the hot read paths (auth lookups, per-user listings, order timelines).
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses (user_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category_id);
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants (product_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites (user_id);
CREATE INDEX IF NOT EXISTS idx_package_items_package ON package_items (package_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_events_order ON order_events (order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments (order_id);
CREATE INDEX IF NOT EXISTS idx_bonus_user ON bonus_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id);
