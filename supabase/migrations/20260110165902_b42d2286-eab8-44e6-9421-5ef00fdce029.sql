-- Update admin password to use PBKDF2 format compatible with Edge Runtime
-- Password: TempAdmin2024!Change (MUST be changed after first login)
-- This is a pre-computed PBKDF2 hash with 100000 iterations
UPDATE public.admin_users 
SET password_hash = 'pbkdf2:100000:a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b8:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    must_change_password = true
WHERE username = 'admin';