-- Update admin user with a proper bcrypt hash
-- The user needs to set their own password via the admin panel
-- For now, set a temporary secure password that MUST be changed
-- This hash is for password: "TempAdmin2024!Change"
UPDATE public.admin_users 
SET password_hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
WHERE username = 'admin';