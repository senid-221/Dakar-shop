CREATE TABLE app.users (
  id uuid PRIMARY KEY,
  role text NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  pass_hash text NOT NULL,
  pass_salt text NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE TABLE app.sessions (
  id text PRIMARY KEY,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE TABLE app.addresses (
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
CREATE TABLE app.categories (
  id uuid PRIMARY KEY,
  slug text UNIQUE,
  name text NOT NULL,
  description text,
  icon text,
  sort integer
);
CREATE TABLE app.products (
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
CREATE TABLE app.product_variants (
  id uuid PRIMARY KEY,
  product_id uuid NOT NULL,
  kind text,
  label text NOT NULL,
  price_delta integer,
  stock integer
);
CREATE TABLE app.favorites (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  created_at timestamptz
);
CREATE TABLE app.packages (
  id uuid PRIMARY KEY,
  user_id uuid,
  name text NOT NULL,
  description text,
  discount_percent integer,
  active boolean,
  created_at timestamptz
);
CREATE TABLE app.package_items (
  id uuid PRIMARY KEY,
  package_id uuid NOT NULL,
  product_id uuid NOT NULL,
  variant_id uuid,
  qty integer
);
CREATE TABLE app.orders (
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
CREATE TABLE app.order_items (
  id uuid PRIMARY KEY,
  order_id uuid NOT NULL,
  product_id uuid,
  variant_id uuid,
  name_snapshot text,
  qty integer,
  unit_price integer
);
CREATE TABLE app.order_events (
  id uuid PRIMARY KEY,
  order_id uuid NOT NULL,
  status text,
  note text,
  created_at timestamptz
);
CREATE TABLE app.payments (
  id uuid PRIMARY KEY,
  order_id uuid NOT NULL,
  method text,
  status text,
  reference text,
  confirmed_by uuid,
  created_at timestamptz,
  updated_at timestamptz
);
CREATE TABLE app.coupons (
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
CREATE TABLE app.bonus_transactions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  amount integer,
  reason text,
  created_at timestamptz
);
CREATE TABLE app.reward_campaigns (
  id uuid PRIMARY KEY,
  name text,
  kind text,
  value integer,
  threshold integer,
  active boolean,
  created_at timestamptz
);
CREATE TABLE app.notifications (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  title text,
  body text,
  kind text,
  read boolean,
  created_at timestamptz
);
CREATE TABLE app.delivery_zones (
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
CREATE TABLE app.delivery_staff (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  phone text,
  active boolean
);
CREATE TABLE app.settings (
  key text PRIMARY KEY,
  value text
);
