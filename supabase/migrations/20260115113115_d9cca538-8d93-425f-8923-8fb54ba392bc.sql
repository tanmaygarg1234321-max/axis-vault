-- Drop the dangerous "Service role can do anything" policy
-- Service role already bypasses RLS by default, so this policy is unnecessary and dangerous
DROP POLICY IF EXISTS "Service role can do anything" ON public.orders;

-- The existing policy "Users can view their own orders" will remain and properly restrict access