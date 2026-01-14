-- Update Schema V2
-- Run this in your Supabase SQL Editor

-- 1. Add 'banned' and 'email' columns to profiles
DO $$ BEGIN
    ALTER TABLE profiles ADD COLUMN banned BOOLEAN DEFAULT FALSE;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE profiles ADD COLUMN email TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 2. Create rate_limits table for simple DB-based rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY, -- usually the IP address
  count INTEGER DEFAULT 0,
  last_request TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on rate_limits
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow public access for rate limiting (needed for login page)
CREATE POLICY "Public can manage rate limits" ON rate_limits
  USING (true)
  WITH CHECK (true);

-- 3. Enhance audit_logs with details
DO $$ BEGIN
    ALTER TABLE audit_logs ADD COLUMN details JSONB;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 4. Sync Email Trigger & Backfill
-- Create function to sync email
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

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_email_sync ON auth.users;
CREATE TRIGGER on_auth_user_email_sync
AFTER INSERT OR UPDATE OF email ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_email();

-- Backfill existing emails
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
AND p.email IS DISTINCT FROM u.email;
