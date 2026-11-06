-- ==============================================================================
-- TautanAI: PostgreSQL Database Schema & Row Level Security (RLS) Policies
-- Built for Supabase Backend with Autonomous AI WhatsApp Commerce
-- ==============================================================================

-- 1. Profiles / Tenants (Stores)
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tagline TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  whatsapp_number TEXT DEFAULT '', -- Format: 628...
  is_onboarded BOOLEAN DEFAULT false,
  -- AI Configuration Fields
  ai_enabled BOOLEAN DEFAULT true,
  ai_persona TEXT DEFAULT 'Ramah, sopan, sigap membantu, dan mengedepankan keramahan wirausaha Bali.',
  ai_instructions TEXT DEFAULT 'Bantu pembeli mengecek ketersediaan produk, jelaskan detail dan varian barang, hitung total pesanan, dan pandu pembayaran.',
  ai_payment_info TEXT DEFAULT 'BCA: 1234567890 a/n Toko | QRIS tersedia',
  ai_model TEXT DEFAULT 'gemini-2.0-flash',
  fonnte_token TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure all columns and defaults are up to date if table already exists
ALTER TABLE stores ADD COLUMN IF NOT EXISTS tagline TEXT DEFAULT '';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS whatsapp_number TEXT DEFAULT '';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN DEFAULT false;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT true;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS ai_persona TEXT DEFAULT 'Ramah, sopan, sigap membantu, dan mengedepankan keramahan wirausaha Bali.';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS ai_instructions TEXT DEFAULT 'Bantu pembeli mengecek ketersediaan produk, jelaskan detail dan varian barang, hitung total pesanan, dan pandu pembayaran.';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS ai_payment_info TEXT DEFAULT 'BCA: 1234567890 a/n Toko | QRIS tersedia';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS ai_model TEXT DEFAULT 'gemini-2.0-flash';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS fonnte_token TEXT DEFAULT '';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE stores ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DO $$
BEGIN
  ALTER TABLE stores ALTER COLUMN whatsapp_number DROP NOT NULL;
  ALTER TABLE stores ALTER COLUMN whatsapp_number SET DEFAULT '';
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 2. External Social Links (Link-in-Bio)
CREATE TABLE IF NOT EXISTS store_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT DEFAULT 'link',
  sort_order INT DEFAULT 0
);

ALTER TABLE store_links ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'link';
ALTER TABLE store_links ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;

-- 3. Product Categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0
);

ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;

-- 4. Products
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  base_price INT NOT NULL, -- In IDR (Rupiah)
  image_url TEXT DEFAULT '',
  stock INT DEFAULT NULL, -- NULL means unlimited/always available, number means tracked physical stock
  is_digital BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  -- Product Specific Context for AI Knowledge
  ai_context TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Backward compatibility column updates for products
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INT DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_digital BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS ai_context TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- 5. Product Variant Groups (e.g. Size, Color)
CREATE TABLE IF NOT EXISTS variant_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0
);

ALTER TABLE variant_groups ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;

-- 6. Product Variant Options
CREATE TABLE IF NOT EXISTS variant_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES variant_groups(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  price_delta INT DEFAULT 0,
  sort_order INT DEFAULT 0
);

ALTER TABLE variant_options ADD COLUMN IF NOT EXISTS price_delta INT DEFAULT 0;
ALTER TABLE variant_options ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;

-- 7. Orders (Manual Progress Tracking & Financial Ledger)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  order_code TEXT UNIQUE NOT NULL,
  buyer_name TEXT NOT NULL,
  buyer_phone TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  order_notes TEXT DEFAULT '',
  subtotal INT NOT NULL,                          -- Subtotal of items in IDR
  shipping_fee INT DEFAULT 0,                     -- Manual shipping fee agreed via WA
  total_amount INT NOT NULL,                      -- subtotal + shipping_fee
  payment_method TEXT DEFAULT 'MANUAL_TRANSFER',  -- 'Transfer BCA', 'Mandiri', 'QRIS', 'COD'
  status TEXT DEFAULT 'PENDING_WA',               -- 'PENDING_WA', 'PAID', 'PROCESSING', 'SHIPPED', 'COMPLETED', 'CANCELLED'
  courier_name TEXT DEFAULT '',                   -- e.g. 'JNE Regular', 'J&T', 'SiCepat'
  tracking_number TEXT DEFAULT '',                -- Resi pengiriman
  seller_internal_note TEXT DEFAULT '',           -- Catatan khusus penjual
  -- AI Automation tracking
  managed_by_ai BOOLEAN DEFAULT true,
  ai_summary TEXT DEFAULT '',
  payment_proof_url TEXT DEFAULT '',
  paid_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  items_snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Backward compatibility column updates for orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_notes TEXT DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_fee INT DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'MANUAL_TRANSFER';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_name TEXT DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number TEXT DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS seller_internal_note TEXT DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS managed_by_ai BOOLEAN DEFAULT true;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ai_summary TEXT DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_proof_url TEXT DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 8. Reviews / Testimonials (Buyer Reviews)
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  buyer_name TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. AI WhatsApp Chat Sessions (Conversation Context for Gemini)
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  buyer_phone TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'model', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- Indexes for High Performance Querying
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_stores_slug ON stores(slug);
CREATE INDEX IF NOT EXISTS idx_stores_user ON stores(user_id);
CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_store_active ON products(store_id, is_active);
CREATE INDEX IF NOT EXISTS idx_variant_groups_prod ON variant_groups(product_id);
CREATE INDEX IF NOT EXISTS idx_variant_options_group ON variant_options(group_id);
CREATE INDEX IF NOT EXISTS idx_orders_store_status ON orders(store_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_store ON reviews(store_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_session ON ai_chat_sessions(store_id, buyer_phone, created_at ASC);

-- ==============================================================================
-- Row Level Security (RLS) Setup
-- ==============================================================================
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE variant_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE variant_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;

-- 1. Stores Policies
DROP POLICY IF EXISTS "Public can view active stores" ON stores;
CREATE POLICY "Public can view active stores" ON stores
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners can insert their store" ON stores;
CREATE POLICY "Owners can insert their store" ON stores
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can update their store" ON stores;
CREATE POLICY "Owners can update their store" ON stores
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can delete their store" ON stores;
CREATE POLICY "Owners can delete their store" ON stores
  FOR DELETE USING (auth.uid() = user_id);

-- 2. Store Links Policies
DROP POLICY IF EXISTS "Public can view store links" ON store_links;
CREATE POLICY "Public can view store links" ON store_links
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners can manage store links" ON store_links;
CREATE POLICY "Owners can manage store links" ON store_links
  FOR ALL 
  USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = store_links.store_id AND stores.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM stores WHERE stores.id = store_links.store_id AND stores.user_id = auth.uid()));

-- 3. Categories Policies
DROP POLICY IF EXISTS "Public can view categories" ON categories;
CREATE POLICY "Public can view categories" ON categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners can manage categories" ON categories;
CREATE POLICY "Owners can manage categories" ON categories
  FOR ALL 
  USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = categories.store_id AND stores.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM stores WHERE stores.id = categories.store_id AND stores.user_id = auth.uid()));

-- 4. Products Policies
DROP POLICY IF EXISTS "Public can view active products" ON products;
CREATE POLICY "Public can view active products" ON products
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Owners can manage products" ON products;
CREATE POLICY "Owners can manage products" ON products
  FOR ALL 
  USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = products.store_id AND stores.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM stores WHERE stores.id = products.store_id AND stores.user_id = auth.uid()));

-- 5. Variant Groups & Options Policies
DROP POLICY IF EXISTS "Public can view variant groups" ON variant_groups;
CREATE POLICY "Public can view variant groups" ON variant_groups
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners can manage variant groups" ON variant_groups;
CREATE POLICY "Owners can manage variant groups" ON variant_groups
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM products 
    JOIN stores ON stores.id = products.store_id 
    WHERE products.id = variant_groups.product_id AND stores.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM products 
    JOIN stores ON stores.id = products.store_id 
    WHERE products.id = variant_groups.product_id AND stores.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Public can view variant options" ON variant_options;
CREATE POLICY "Public can view variant options" ON variant_options
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners can manage variant options" ON variant_options;
CREATE POLICY "Owners can manage variant options" ON variant_options
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM variant_groups
    JOIN products ON products.id = variant_groups.product_id
    JOIN stores ON stores.id = products.store_id
    WHERE variant_groups.id = variant_options.group_id AND stores.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM variant_groups
    JOIN products ON products.id = variant_groups.product_id
    JOIN stores ON stores.id = products.store_id
    WHERE variant_groups.id = variant_options.group_id AND stores.user_id = auth.uid()
  ));

-- 6. Orders Policies (Strict RLS: Public can only insert PENDING_WA, only Store Owner can view/manage)
DROP POLICY IF EXISTS "Public can insert orders" ON orders;
CREATE POLICY "Public can insert orders" ON orders
  FOR INSERT WITH CHECK (status = 'PENDING_WA');

DROP POLICY IF EXISTS "Public can view orders" ON orders;
DROP POLICY IF EXISTS "Owners can manage orders" ON orders;
CREATE POLICY "Owners can view orders" ON orders
  FOR SELECT 
  USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = orders.store_id AND stores.user_id = auth.uid()));

CREATE POLICY "Owners can update orders" ON orders
  FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = orders.store_id AND stores.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM stores WHERE stores.id = orders.store_id AND stores.user_id = auth.uid()));

-- Allow AI WhatsApp Copilot / Payment Webhook to update pending orders to PAID or CANCELLED
DROP POLICY IF EXISTS "Allow AI order updates" ON orders;
CREATE POLICY "Allow AI order updates" ON orders
  FOR UPDATE 
  USING (status IN ('PENDING_WA', 'PENDING'))
  WITH CHECK (status IN ('PAID', 'PROCESSING', 'CANCELLED', 'PENDING_WA'));

CREATE POLICY "Owners can delete orders" ON orders
  FOR DELETE 
  USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = orders.store_id AND stores.user_id = auth.uid()));

-- 7. Reviews Policies (Public can view; Insert requires valid rating and existing order)
DROP POLICY IF EXISTS "Public can view reviews" ON reviews;
CREATE POLICY "Public can view reviews" ON reviews
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can insert reviews" ON reviews;
CREATE POLICY "Public can insert reviews" ON reviews
  FOR INSERT WITH CHECK (
    rating >= 1 AND rating <= 5 
    AND (order_id IS NULL OR EXISTS (SELECT 1 FROM orders WHERE orders.id = reviews.order_id))
  );

DROP POLICY IF EXISTS "Owners can manage reviews" ON reviews;
CREATE POLICY "Owners can manage reviews" ON reviews
  FOR ALL 
  USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = reviews.store_id AND stores.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM stores WHERE stores.id = reviews.store_id AND stores.user_id = auth.uid()));

-- 8. AI Chat Sessions Policies (Strict RLS: Only Store Owner or Service Role can read)
DROP POLICY IF EXISTS "Public or service role can manage ai_chat_sessions" ON ai_chat_sessions;
DROP POLICY IF EXISTS "Public can insert ai_chat_sessions" ON ai_chat_sessions;
DROP POLICY IF EXISTS "Owners can view ai_chat_sessions" ON ai_chat_sessions;
DROP POLICY IF EXISTS "Owners can manage ai_chat_sessions" ON ai_chat_sessions;

CREATE POLICY "Public can insert ai_chat_sessions" ON ai_chat_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Owners can manage ai_chat_sessions" ON ai_chat_sessions
  FOR ALL 
  USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = ai_chat_sessions.store_id AND stores.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM stores WHERE stores.id = ai_chat_sessions.store_id AND stores.user_id = auth.uid()));

-- ==============================================================================
-- Automatic Store Creation Trigger on User Sign Up (Supabase Auth)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  store_name TEXT;
  has_custom_profile BOOLEAN;
BEGIN
  -- Extract store name from metadata or fallback to email prefix
  store_name := COALESCE(
    NEW.raw_user_meta_data->>'store_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1),
    'Toko'
  );
  
  -- Clean slug base from email or metadata
  base_slug := COALESCE(
    NEW.raw_user_meta_data->>'store_slug',
    lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-zA-Z0-9]', '-', 'g'))
  );
  
  IF base_slug IS NULL OR base_slug = '' THEN
    base_slug := 'toko';
  END IF;

  final_slug := base_slug;

  -- Collision avoidance: if slug already taken, loop to guarantee unique slug
  WHILE EXISTS (SELECT 1 FROM public.stores WHERE slug = final_slug) LOOP
    final_slug := base_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  END LOOP;

  -- Check if WhatsApp number was explicitly supplied during signup
  has_custom_profile := (
    NEW.raw_user_meta_data->>'whatsapp_number' IS NOT NULL AND 
    NEW.raw_user_meta_data->>'whatsapp_number' <> ''
  );

  INSERT INTO public.stores (user_id, name, slug, whatsapp_number, tagline, is_onboarded)
  VALUES (
    NEW.id,
    store_name,
    final_slug,
    COALESCE(NEW.raw_user_meta_data->>'whatsapp_number', ''),
    COALESCE(NEW.raw_user_meta_data->>'tagline', ''),
    has_custom_profile
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Prevent failure from blocking user creation in auth.users
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger execution on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- Storage Bucket Setup for Product Images & Payment Proofs
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
CREATE POLICY "Public can view product images" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
CREATE POLICY "Authenticated users can upload product images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update their product images" ON storage.objects;
CREATE POLICY "Authenticated users can update their product images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'product-images' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Authenticated users can delete their product images" ON storage.objects;
CREATE POLICY "Authenticated users can delete their product images" ON storage.objects
  FOR DELETE USING (bucket_id = 'product-images' AND auth.uid() = owner);

-- ==============================================================================
-- AI Agent Copilot Functions (Safe Serverless RPC with SECURITY DEFINER)
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_order_status_by_ai(
  p_order_id uuid,
  p_store_id uuid,
  p_status text DEFAULT 'PAID',
  p_proof_url text DEFAULT '',
  p_notes text DEFAULT ''
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders;
  v_target_status text;
BEGIN
  v_target_status := UPPER(COALESCE(p_status, 'PAID'));
  IF v_target_status NOT IN ('PAID', 'PROCESSING', 'CANCELLED') THEN
    v_target_status := 'PAID';
  END IF;

  UPDATE orders
  SET 
    status = v_target_status,
    paid_at = CASE WHEN v_target_status = 'PAID' THEN NOW() ELSE paid_at END,
    managed_by_ai = true,
    payment_proof_url = CASE 
      WHEN p_proof_url IS NOT NULL AND p_proof_url != '' THEN p_proof_url 
      ELSE payment_proof_url 
    END,
    seller_internal_note = CONCAT('Status diubah oleh AI WhatsApp: ', COALESCE(p_notes, 'Konfirmasi transfer diterima')),
    updated_at = NOW()
  WHERE id = p_order_id AND store_id = p_store_id
  RETURNING * INTO v_order;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Pesanan tidak ditemukan');
  END IF;

  RETURN json_build_object(
    'success', true,
    'order_code', v_order.order_code,
    'status', v_order.status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION update_order_status_by_ai TO anon, authenticated, service_role;
