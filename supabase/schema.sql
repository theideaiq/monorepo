-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. ENUMS and TYPES
-- -----------------------------------------------------------------------------

-- Role Enum
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'admin', 'superadmin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Product Types and Categories
DO $$ BEGIN
    CREATE TYPE product_type AS ENUM ('sale', 'rental', 'both');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE product_category AS ENUM ('book', 'game', 'dvd', 'merch', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Rental Tiers and Status
DO $$ BEGIN
    CREATE TYPE rental_tier AS ENUM ('basic', 'pro', 'elite');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE rental_status AS ENUM ('active', 'returned', 'overdue');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Academy Post Status
DO $$ BEGIN
    CREATE TYPE post_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- -----------------------------------------------------------------------------
-- 2. TABLES
-- -----------------------------------------------------------------------------

-- PROFILES (Update existing or create if new)
-- Assuming 'profiles' table usually exists in standard Supabase setups linked to auth.users.
-- If it doesn't exist, here is a basic creation. If it exists, we alter it.

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  updated_at TIMESTAMP WITH TIME ZONE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  website TEXT,
  email TEXT,
  banned BOOLEAN DEFAULT FALSE
);

-- Add role column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE profiles ADD COLUMN role user_role DEFAULT 'user';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add banned column if it doesn't exist (for existing tables)
DO $$ BEGIN
    ALTER TABLE profiles ADD COLUMN banned BOOLEAN DEFAULT FALSE;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;


-- PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  image_url TEXT,
  type product_type NOT NULL DEFAULT 'sale',
  category product_category NOT NULL DEFAULT 'other',
  stock_count INTEGER NOT NULL DEFAULT 0,
  rental_tier rental_tier, -- Nullable
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RENTALS
CREATE TABLE IF NOT EXISTS rentals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status rental_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ACADEMY POSTS
CREATE TABLE IF NOT EXISTS academy_posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT, -- Markdown
  cover_image TEXT,
  status post_status NOT NULL DEFAULT 'draft',
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_resource TEXT NOT NULL,
  details JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RATE LIMITS
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER DEFAULT 0,
  last_request TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- -----------------------------------------------------------------------------
-- 3. RLS POLICIES
-- -----------------------------------------------------------------------------

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can manage rate limits" ON rate_limits
  USING (true)
  WITH CHECK (true);

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PRODUCTS POLICIES
-- Everyone can view products
CREATE POLICY "Public profiles can view products" ON products
  FOR SELECT USING (true);

-- Only admins can insert/update/delete products
CREATE POLICY "Admins can insert products" ON products
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update products" ON products
  FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete products" ON products
  FOR DELETE USING (is_admin());

-- RENTALS POLICIES
-- Users can see their own rentals
CREATE POLICY "Users can view own rentals" ON rentals
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all rentals
CREATE POLICY "Admins can view all rentals" ON rentals
  FOR SELECT USING (is_admin());

-- Admins can manage rentals (Update status etc)
CREATE POLICY "Admins can update rentals" ON rentals
  FOR UPDATE USING (is_admin());

-- ACADEMY POSTS POLICIES
-- Everyone can view published posts
CREATE POLICY "Public can view published posts" ON academy_posts
  FOR SELECT USING (status = 'published');

-- Admins can view all posts (including drafts)
CREATE POLICY "Admins can view all posts" ON academy_posts
  FOR SELECT USING (is_admin());

-- Admins can manage posts
CREATE POLICY "Admins can insert posts" ON academy_posts
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update posts" ON academy_posts
  FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete posts" ON academy_posts
  FOR DELETE USING (is_admin());

-- AUDIT LOGS POLICIES
-- Only admins can view logs
CREATE POLICY "Admins can view audit logs" ON audit_logs
  FOR SELECT USING (is_admin());

-- System inserts logs (usually via triggers or backend code).
-- If inserting from client (Admin App), allow admins to insert.
CREATE POLICY "Admins can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (is_admin());

-- PROFILES POLICIES (Existing ones might exist, but ensuring Admin privileges)
-- Public read of profiles is common, or authenticated read.
-- Assuming standard:
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admins can update any profile (e.g. to change roles) - BE CAREFUL
-- Only superadmin should change roles ideally, but for now 'admin' rule:
CREATE POLICY "Admins can update profiles" ON profiles
  FOR UPDATE USING (is_admin());

-- -----------------------------------------------------------------------------
-- 4. TRIGGERS
-- -----------------------------------------------------------------------------

-- Sync Email Function
CREATE OR REPLACE FUNCTION public.sync_user_email()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sync Email Trigger
-- Note: This requires permissions to create triggers on auth.users (usually superuser)
-- In pure SQL dump, we can include it, but applying it might require specific privileges.
-- We assume this schema represents the desired state.
-- DROP TRIGGER IF EXISTS on_auth_user_email_sync ON auth.users;
-- CREATE TRIGGER on_auth_user_email_sync
-- AFTER INSERT OR UPDATE OF email ON auth.users
-- FOR EACH ROW
-- EXECUTE FUNCTION public.sync_user_email();
