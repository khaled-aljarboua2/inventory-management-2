-- Full cross-location access is reserved for:
-- 1) the system administrator (admin role without a location), and
-- 2) administrators assigned to the Al Manar location (business code 1).
-- Other administrators remain scoped to their assigned location.

CREATE OR REPLACE FUNCTION public.has_full_location_access()
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
    LEFT JOIN public.locations l ON l.id = u.location_id
    WHERE u.auth_user_id = (SELECT auth.uid())
      AND u.is_active = true
      AND lower(trim(r.name)) IN ('admin', 'general manager')
      AND (
        u.location_id IS NULL
        OR (
          l.company_id = u.company_id
          AND l.is_active = true
          AND l.code = '1'
        )
      )
  );
$function$;

-- Compatibility wrappers used by existing policies and application code.
CREATE OR REPLACE FUNCTION public.is_general_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.has_full_location_access();
$function$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.has_full_location_access();
$function$;

CREATE OR REPLACE FUNCTION public.can_access_location(target_location_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.locations target ON target.id = target_location_id
    WHERE u.auth_user_id = (SELECT auth.uid())
      AND u.is_active = true
      AND target.company_id = u.company_id
      AND target.is_active = true
      AND (
        public.has_full_location_access()
        OR u.location_id = target_location_id
      )
  );
$function$;

-- Privileged administrators always retain every registered permission,
-- even if an accidental per-user override exists.
CREATE OR REPLACE FUNCTION public.has_permission(permission_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id uuid;
  current_db_user_id uuid;
  permission_uuid uuid;
  direct_permission boolean;
  role_permission_exists boolean;
BEGIN
  current_user_id := (SELECT auth.uid());

  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT id
  INTO current_db_user_id
  FROM public.users
  WHERE auth_user_id = current_user_id
    AND is_active = true
  LIMIT 1;

  IF current_db_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT id
  INTO permission_uuid
  FROM public.permissions
  WHERE code = permission_code
  LIMIT 1;

  IF permission_uuid IS NULL THEN
    RETURN false;
  END IF;

  IF public.has_full_location_access() THEN
    RETURN true;
  END IF;

  SELECT allowed
  INTO direct_permission
  FROM public.user_permissions
  WHERE user_id = current_db_user_id
    AND permission_id = permission_uuid
  LIMIT 1;

  IF FOUND THEN
    RETURN coalesce(direct_permission, false);
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    INNER JOIN public.role_permissions rp ON rp.role_id = u.role_id
    WHERE u.id = current_db_user_id
      AND rp.permission_id = permission_uuid
  )
  INTO role_permission_exists;

  RETURN role_permission_exists;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_current_user_permissions()
RETURNS TABLE(permission_code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_auth_user_id uuid;
  current_db_user_id uuid;
BEGIN
  current_auth_user_id := (SELECT auth.uid());

  IF current_auth_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT u.id
  INTO current_db_user_id
  FROM public.users u
  WHERE u.auth_user_id = current_auth_user_id
    AND u.is_active = true
  LIMIT 1;

  IF current_db_user_id IS NULL THEN
    RETURN;
  END IF;

  IF public.has_full_location_access() THEN
    RETURN QUERY
    SELECT p.code::text
    FROM public.permissions p;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.code::text
  FROM public.permissions p
  WHERE EXISTS (
    SELECT 1
    FROM public.user_permissions up
    WHERE up.user_id = current_db_user_id
      AND up.permission_id = p.id
      AND up.allowed = true
  )
  OR (
    NOT EXISTS (
      SELECT 1
      FROM public.user_permissions up
      WHERE up.user_id = current_db_user_id
        AND up.permission_id = p.id
    )
    AND EXISTS (
      SELECT 1
      FROM public.users u
      JOIN public.role_permissions rp
        ON rp.role_id = u.role_id
       AND rp.permission_id = p.id
      WHERE u.id = current_db_user_id
    )
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.has_full_location_access() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_general_manager() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_access_location(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_permission(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_current_user_permissions() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_full_location_access() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_general_manager() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_location(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_permission(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_current_user_permissions() TO authenticated, service_role;
