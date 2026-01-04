-- Create profiles table for authenticated users
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT profiles_user_id_key UNIQUE (user_id)
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies - users can read/update their own profile
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Trigger to auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add trigger for updating profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add user_id to orders table to link purchases to authenticated users
ALTER TABLE public.orders ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.orders ADD COLUMN user_email TEXT;

-- Create index for user orders lookup
CREATE INDEX idx_orders_user_id ON public.orders(user_id);

-- RLS policies for orders - allow public insert but restrict reads
DROP POLICY IF EXISTS "Anyone can view orders" ON public.orders;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.orders;

CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Service role can do anything" ON public.orders
  FOR ALL USING (true) WITH CHECK (true);

-- RLS policies for coupons - only allow reading active coupons, not usage stats
DROP POLICY IF EXISTS "Anyone can view coupons" ON public.coupons;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.coupons;

CREATE POLICY "Anyone can check if coupon is valid" ON public.coupons
  FOR SELECT USING (is_active = true);

-- RLS policies for site_settings - only maintenance_mode should be public
DROP POLICY IF EXISTS "Anyone can view site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.site_settings;

CREATE POLICY "Anyone can view maintenance status" ON public.site_settings
  FOR SELECT USING (key = 'maintenance_mode');

-- RLS policies for admin_users - no public access
DROP POLICY IF EXISTS "Anyone can view admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.admin_users;

-- RLS policies for active_ranks - users can only see their own
DROP POLICY IF EXISTS "Anyone can view active_ranks" ON public.active_ranks;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.active_ranks;

CREATE POLICY "Users can view their own ranks" ON public.active_ranks
  FOR SELECT USING (
    minecraft_username IN (
      SELECT o.minecraft_username FROM public.orders o WHERE o.user_id = auth.uid()
    ) OR auth.uid() IS NULL
  );

-- RLS policies for logs - no public access (admin only via service role)
DROP POLICY IF EXISTS "Anyone can view logs" ON public.logs;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.logs;