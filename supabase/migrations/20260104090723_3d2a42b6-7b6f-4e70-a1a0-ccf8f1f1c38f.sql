-- Create enum types
CREATE TYPE public.order_status AS ENUM ('pending', 'paid', 'delivered', 'failed', 'refunded');
CREATE TYPE public.product_type AS ENUM ('rank', 'crate', 'money');

-- Orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT UNIQUE NOT NULL,
  minecraft_username TEXT NOT NULL,
  discord_username TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_type product_type NOT NULL,
  amount INTEGER NOT NULL,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  payment_status order_status NOT NULL DEFAULT 'pending',
  delivery_status TEXT DEFAULT 'pending',
  gift_to TEXT,
  command_executed TEXT,
  error_log TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Active ranks table (for expiry tracking)
CREATE TABLE public.active_ranks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  minecraft_username TEXT NOT NULL,
  rank_name TEXT NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  removed_at TIMESTAMP WITH TIME ZONE
);

-- Coupons table
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('flat', 'percentage')),
  value INTEGER NOT NULL,
  max_uses INTEGER DEFAULT 100,
  uses_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Logs table
CREATE TABLE public.logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Site settings table
CREATE TABLE public.site_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Admin users table
CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default settings
INSERT INTO public.site_settings (key, value) VALUES 
  ('maintenance_mode', 'false'),
  ('admin_email', 'axiseconomy@gmail.com'),
  ('support_email', 'axiseconomy@gmail.com');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_ranks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Public read policies for orders (users can check their order status)
CREATE POLICY "Anyone can read orders by order_id"
  ON public.orders FOR SELECT
  USING (true);

-- Public can read active coupons
CREATE POLICY "Anyone can read active coupons"
  ON public.coupons FOR SELECT
  USING (is_active = true);

-- Public can read site settings
CREATE POLICY "Anyone can read site settings"
  ON public.site_settings FOR SELECT
  USING (true);

-- Create indexes for performance
CREATE INDEX idx_orders_order_id ON public.orders(order_id);
CREATE INDEX idx_orders_minecraft_username ON public.orders(minecraft_username);
CREATE INDEX idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX idx_active_ranks_minecraft_username ON public.active_ranks(minecraft_username);
CREATE INDEX idx_active_ranks_expires_at ON public.active_ranks(expires_at);
CREATE INDEX idx_coupons_code ON public.coupons(code);
CREATE INDEX idx_logs_order_id ON public.logs(order_id);
CREATE INDEX idx_logs_created_at ON public.logs(created_at);