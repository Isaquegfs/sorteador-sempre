-- Fix Security Definer View issue
-- Drop and recreate the formulario_status view without SECURITY DEFINER

-- Drop the existing view
DROP VIEW IF EXISTS formulario_status;

-- Recreate the view with proper security
-- Using SECURITY INVOKER (default) instead of SECURITY DEFINER
-- This ensures the view respects the calling user's permissions
CREATE VIEW formulario_status 
WITH (security_invoker = true) AS
SELECT id, aberto
FROM formulario_config;

-- Grant SELECT to anon and authenticated users
-- This is intentional for the public registration form to check if it's open
GRANT SELECT ON formulario_status TO anon, authenticated;