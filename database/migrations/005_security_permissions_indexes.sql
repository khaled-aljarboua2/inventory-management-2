BEGIN;

-- Internal notification creation is invoked by the transfer-status trigger.
-- It must never be callable directly by ordinary signed-in users.
REVOKE ALL ON FUNCTION public.create_notification(uuid, text, text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text)
TO service_role;

-- Trigger functions are internal implementation details, not public RPCs.
REVOKE ALL ON FUNCTION public.notify_transfer_status_change()
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column()
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reject_out_of_stock_transfer_item()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.notify_transfer_status_change()
TO service_role;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column()
TO service_role;
GRANT EXECUTE ON FUNCTION public.reject_out_of_stock_transfer_item()
TO service_role;

-- Product balance initialization remains an application RPC, but it is now
-- bound to the authenticated caller's company and product-create permission.
CREATE OR REPLACE FUNCTION public.initialize_product_stock_balances(
  p_product_id uuid,
  p_company_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  caller_company_id uuid;
  inserted_count integer := 0;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT u.company_id
  INTO caller_company_id
  FROM public.users u
  WHERE u.auth_user_id = (SELECT auth.uid())
    AND u.is_active = true
  LIMIT 1;

  IF caller_company_id IS NULL OR p_company_id IS DISTINCT FROM caller_company_id THEN
    RAISE EXCEPTION 'Invalid or unauthorized company';
  END IF;

  IF NOT public.has_permission('products.create') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.products p
    WHERE p.id = p_product_id
      AND p.company_id = caller_company_id
      AND p.is_active = true
  ) THEN
    RAISE EXCEPTION 'Invalid or unauthorized product';
  END IF;

  INSERT INTO public.stock_balances (
    id,
    product_id,
    location_id,
    available_quantity,
    reserved_quantity,
    updated_at
  )
  SELECT
    gen_random_uuid(),
    p_product_id,
    l.id,
    0,
    0,
    now()
  FROM public.locations l
  WHERE l.company_id = caller_company_id
    AND l.is_active = true
  ON CONFLICT (product_id, location_id) DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.initialize_product_stock_balances(uuid, uuid)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.initialize_product_stock_balances(uuid, uuid)
TO authenticated, service_role;

-- A user may read only their own overrides. Authorized access managers may
-- read targets inside the same company and permitted location scope.
DROP POLICY IF EXISTS "Authenticated users can view user permissions"
ON public.user_permissions;

CREATE POLICY "users_view_scoped_user_permissions"
ON public.user_permissions
FOR SELECT
TO authenticated
USING (
  user_id = (
    SELECT u.id
    FROM public.users u
    WHERE u.auth_user_id = (SELECT auth.uid())
      AND u.is_active = true
    LIMIT 1
  )
  OR (
    public.has_permission('users.manage_access')
    AND EXISTS (
      SELECT 1
      FROM public.users target
      WHERE target.id = user_permissions.user_id
        AND target.company_id = public.current_company_id()
        AND (
          public.has_full_location_access()
          OR target.location_id = public.current_user_location_id()
        )
    )
  )
);

DROP POLICY IF EXISTS "authenticated_users_can_view_role_permissions"
ON public.role_permissions;

CREATE POLICY "users_view_scoped_role_permissions"
ON public.role_permissions
FOR SELECT
TO authenticated
USING (
  role_id = (
    SELECT u.role_id
    FROM public.users u
    WHERE u.auth_user_id = (SELECT auth.uid())
      AND u.is_active = true
    LIMIT 1
  )
  OR public.has_permission('users.manage_access')
);

DROP POLICY IF EXISTS "authenticated_users_can_view_roles"
ON public.roles;

CREATE POLICY "users_view_scoped_roles"
ON public.roles
FOR SELECT
TO authenticated
USING (
  id = (
    SELECT u.role_id
    FROM public.users u
    WHERE u.auth_user_id = (SELECT auth.uid())
      AND u.is_active = true
    LIMIT 1
  )
  OR public.has_permission('users.manage_access')
);

-- Cover operational foreign keys used by joins, RLS checks and lifecycle work.
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_stock_counts_location_id
  ON public.stock_counts (location_id);
CREATE INDEX IF NOT EXISTS idx_stock_counts_created_by
  ON public.stock_counts (created_by);
CREATE INDEX IF NOT EXISTS idx_stock_count_items_product_id
  ON public.stock_count_items (product_id);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_user_id
  ON public.stock_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_transfer_items_product_id
  ON public.transfer_items (product_id);
CREATE INDEX IF NOT EXISTS idx_transfer_items_unit_id
  ON public.transfer_items (unit_id);
CREATE INDEX IF NOT EXISTS idx_transfer_requests_from_location
  ON public.transfer_requests (from_location_id);
CREATE INDEX IF NOT EXISTS idx_transfer_requests_to_location
  ON public.transfer_requests (to_location_id);
CREATE INDEX IF NOT EXISTS idx_transfer_requests_requested_by
  ON public.transfer_requests (requested_by);
CREATE INDEX IF NOT EXISTS idx_transfer_requests_approved_by
  ON public.transfer_requests (approved_by);
CREATE INDEX IF NOT EXISTS idx_transfer_requests_prepared_by
  ON public.transfer_requests (prepared_by);
CREATE INDEX IF NOT EXISTS idx_transfer_requests_received_by
  ON public.transfer_requests (received_by);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id
  ON public.purchase_orders (supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_ordered_by
  ON public.purchase_orders (ordered_by);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_order_id
  ON public.purchase_order_items (purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_purchase_order_id
  ON public.goods_receipts (purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipt_items_receipt_id
  ON public.goods_receipt_items (goods_receipt_id);

-- Keep the constraint-backed or clearly named copy of each duplicate index.
DROP INDEX IF EXISTS public.idx_product_barcodes_barcode;
DROP INDEX IF EXISTS public.product_one_base_unit;
DROP INDEX IF EXISTS public.stock_balances_product_location_unique;

COMMIT;
