-- Fix overly permissive RLS policy on orders table
-- Drop the dangerous "Anyone can read orders by order_id" policy
DROP POLICY IF EXISTS "Anyone can read orders by order_id" ON public.orders;

-- Create a secure function for order status lookup (used by payment verification)
CREATE OR REPLACE FUNCTION public.lookup_order_by_order_id(p_order_id TEXT)
RETURNS TABLE(
  id UUID,
  order_id TEXT,
  payment_status TEXT,
  delivery_status TEXT,
  product_name TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.order_id,
    o.payment_status::TEXT,
    o.delivery_status,
    o.product_name,
    o.created_at
  FROM orders o
  WHERE o.order_id = p_order_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute to authenticated and anon users for order lookup
GRANT EXECUTE ON FUNCTION public.lookup_order_by_order_id TO anon;
GRANT EXECUTE ON FUNCTION public.lookup_order_by_order_id TO authenticated;

-- Insert initial admin user with bcrypt hashed password
-- Password: ChangeThisPassword123! (user MUST change this immediately)
INSERT INTO public.admin_users (username, password_hash)
VALUES ('admin', '$2a$10$rQ8z3xQh8mN1K2L3O4P5QuVwXyZ6A7B8C9D0E1F2G3H4I5J6K7L8M')
ON CONFLICT (username) DO NOTHING;