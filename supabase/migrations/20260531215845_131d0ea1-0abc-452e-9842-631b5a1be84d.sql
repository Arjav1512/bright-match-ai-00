-- Least-privilege EXECUTE grants for SECURITY DEFINER functions
-- Trigger-only / service-role-only functions: revoke from PUBLIC, anon, authenticated.
-- Client/edge functions retain the minimum grant they need.

-- Service-role only (called exclusively from edge functions using service_role client)
REVOKE EXECUTE ON FUNCTION public.apply_to_internship_atomic(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_and_increment_rate_limit(uuid, text, integer, integer) FROM PUBLIC, anon, authenticated;

-- Admin-only client RPC: tighten to authenticated only (internal has_role gate)
REVOKE EXECUTE ON FUNCTION public.admin_list_employers_for_verification() FROM anon;
