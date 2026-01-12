-- Drop the overly permissive site_settings policy
DROP POLICY IF EXISTS "Anyone can read site settings" ON public.site_settings;

-- The "Anyone can view maintenance status" policy already exists and is correctly scoped
-- Add a whitelist policy for public settings
CREATE POLICY "Public can read whitelisted settings"
  ON public.site_settings FOR SELECT
  USING (key IN ('maintenance_mode', 'support_email'));

-- Create login_attempts table for rate limiting admin logins
CREATE TABLE public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  success BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on login_attempts (only service role can access)
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Create index for efficient lookups
CREATE INDEX idx_login_attempts_recent 
  ON public.login_attempts(username, created_at DESC);

-- Auto-cleanup old login attempts (older than 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.login_attempts
  WHERE created_at < now() - interval '24 hours';
END;
$$;

-- Function to check if login is allowed (returns true if under rate limit)
CREATE OR REPLACE FUNCTION public.check_login_allowed(p_username TEXT, p_ip TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  failed_by_username INTEGER;
  failed_by_ip INTEGER;
BEGIN
  -- Count failed attempts by username in last 15 minutes
  SELECT COUNT(*) INTO failed_by_username
  FROM public.login_attempts
  WHERE username = p_username
    AND success = false
    AND created_at > now() - interval '15 minutes';
  
  -- Count failed attempts by IP in last 15 minutes
  SELECT COUNT(*) INTO failed_by_ip
  FROM public.login_attempts
  WHERE ip_address = p_ip
    AND success = false
    AND created_at > now() - interval '15 minutes';
  
  -- Block if more than 5 failed attempts by username or 10 by IP
  RETURN failed_by_username < 5 AND failed_by_ip < 10;
END;
$$;

-- Function to log a login attempt
CREATE OR REPLACE FUNCTION public.log_login_attempt(p_username TEXT, p_ip TEXT, p_success BOOLEAN)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.login_attempts (username, ip_address, success)
  VALUES (p_username, p_ip, p_success);
  
  -- Cleanup old attempts periodically (1% chance per login)
  IF random() < 0.01 THEN
    PERFORM public.cleanup_old_login_attempts();
  END IF;
END;
$$;