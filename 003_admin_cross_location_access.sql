-- The deployed role is named "admin". Keep compatibility with installations
-- that still use "General Manager" while allowing the administrator to access
-- all company locations through the existing RLS policies.
CREATE OR REPLACE FUNCTION public.is_general_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.auth_user_id = auth.uid()
      AND u.is_active = true
      AND lower(trim(r.name)) IN ('admin', 'general manager')
  );
$function$;
