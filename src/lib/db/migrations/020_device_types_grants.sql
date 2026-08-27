-- Migration 020: Grant privileges on device_types
-- Migration 019 created device_types via a direct connection, which left
-- the table without the usual data privileges for service_role (the role
-- used by the app's server-side queries). RLS is already enabled with a
-- permissive public SELECT policy, so we only need to fix table/sequence
-- grants so service_role (and the public roles) can actually read/write.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_types TO service_role;
GRANT SELECT ON public.device_types TO anon, authenticated;

-- Allow the admin API (service_role) to consume the serial sequence on insert
GRANT USAGE, SELECT ON SEQUENCE public.device_types_id_seq TO service_role;
GRANT SELECT ON SEQUENCE public.device_types_id_seq TO anon, authenticated;
