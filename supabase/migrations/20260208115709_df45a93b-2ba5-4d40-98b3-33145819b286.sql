
-- Drop the old restrictive policy and replace with one that includes shop_config
DROP POLICY IF EXISTS "Public can read whitelisted settings" ON public.site_settings;

CREATE POLICY "Public can read whitelisted settings"
  ON public.site_settings
  FOR SELECT
  USING (key = ANY (ARRAY['maintenance_mode'::text, 'support_email'::text, 'shop_config'::text]));
