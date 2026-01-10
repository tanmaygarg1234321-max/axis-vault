-- Fix 1: Remove dangerous RLS policy that allows unauthenticated access to orders
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;

-- Create secure policy - only authenticated users can see their own orders
CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

-- Fix 2: Remove dangerous RLS policy on active_ranks that allows unauthenticated access
DROP POLICY IF EXISTS "Users can view their own ranks" ON public.active_ranks;

-- Create secure policy for active_ranks
CREATE POLICY "Users can view their own ranks" ON public.active_ranks
  FOR SELECT USING (
    minecraft_username IN (
      SELECT o.minecraft_username
      FROM orders o
      WHERE o.user_id = auth.uid()
    )
  );

-- Fix 3: Add columns for forced password change
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT true;
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

-- Mark existing admin to force password change
UPDATE public.admin_users SET must_change_password = true WHERE username = 'admin';