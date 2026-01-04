-- Add RLS policies for admin_users and logs (they need no public access, only service role)
-- These tables have RLS enabled but no policies - that means NO access which is correct for admin-only tables

-- For admin_users: We want NO public access (service role bypasses RLS anyway)
-- No policy needed - RLS enabled with no policies = no access

-- For logs: We want NO public access (admin panel uses service role via edge functions)
-- No policy needed - RLS enabled with no policies = no access

-- This is intentional - admin_users and logs should only be accessible via edge functions using service role key
-- The security linter shows "RLS Enabled No Policy" as INFO (not ERROR) because this is a valid pattern

SELECT 1; -- Placeholder to confirm this is intentional