-- Inventory workflow correctness, authorization, and performance fixes.

CREATE TABLE IF NOT EXISTS public.request_rate_limits (
    bucket_key text NOT NULL,
    scope text NOT NULL,
    window_started_at timestamptz NOT NULL DEFAULT now(),
    request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
    PRIMARY KEY (bucket_key, scope)
);

ALTER TABLE public.request_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_user_rate_limit(
    request_scope text,
    max_requests integer,
    window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    current_auth_user uuid := (SELECT auth.uid());
    normalized_scope text := left(trim(COALESCE(request_scope, '')), 80);
    safe_max integer := LEAST(GREATEST(COALESCE(max_requests, 1), 1), 10000);
    safe_window integer := LEAST(GREATEST(COALESCE(window_seconds, 60), 10), 3600);
    resulting_count integer;
BEGIN
    IF current_auth_user IS NULL OR normalized_scope = '' THEN
        RETURN false;
    END IF;

    INSERT INTO public.request_rate_limits (
        bucket_key, scope, window_started_at, request_count
    ) VALUES (
        'user:' || current_auth_user::text, normalized_scope, now(), 1
    )
    ON CONFLICT (bucket_key, scope) DO UPDATE
       SET window_started_at = CASE
               WHEN public.request_rate_limits.window_started_at
                    <= now() - make_interval(secs => safe_window)
               THEN now()
               ELSE public.request_rate_limits.window_started_at
           END,
           request_count = CASE
               WHEN public.request_rate_limits.window_started_at
                    <= now() - make_interval(secs => safe_window)
               THEN 1
               ELSE public.request_rate_limits.request_count + 1
           END
    RETURNING request_count INTO resulting_count;

    RETURN resulting_count <= safe_max;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_login_rate_limit(
    client_hash text,
    request_scope text,
    max_requests integer,
    window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    normalized_hash text := left(trim(COALESCE(client_hash, '')), 128);
    normalized_scope text := left(trim(COALESCE(request_scope, '')), 80);
    safe_max integer := LEAST(GREATEST(COALESCE(max_requests, 1), 1), 1000);
    safe_window integer := LEAST(GREATEST(COALESCE(window_seconds, 900), 10), 3600);
    resulting_count integer;
BEGIN
    IF normalized_hash = '' OR normalized_scope = '' THEN
        RETURN false;
    END IF;

    INSERT INTO public.request_rate_limits (
        bucket_key, scope, window_started_at, request_count
    ) VALUES (
        'login:' || normalized_hash, normalized_scope, now(), 1
    )
    ON CONFLICT (bucket_key, scope) DO UPDATE
       SET window_started_at = CASE
               WHEN public.request_rate_limits.window_started_at
                    <= now() - make_interval(secs => safe_window)
               THEN now()
               ELSE public.request_rate_limits.window_started_at
           END,
           request_count = CASE
               WHEN public.request_rate_limits.window_started_at
                    <= now() - make_interval(secs => safe_window)
               THEN 1
               ELSE public.request_rate_limits.request_count + 1
           END
    RETURNING request_count INTO resulting_count;

    RETURN resulting_count <= safe_max;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS stock_counts_one_open_per_location
ON public.stock_counts (location_id)
WHERE status <> 'completed';

CREATE INDEX IF NOT EXISTS idx_transfer_requests_status_created_at
ON public.transfer_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread_created_at
ON public.notifications (user_id, is_read, created_at DESC);

-- Cover every foreign key reported by the database performance advisor.
CREATE INDEX IF NOT EXISTS idx_api_integrations_company_id ON public.api_integrations (company_id);
CREATE INDEX IF NOT EXISTS idx_attachments_company_id ON public.attachments (company_id);
CREATE INDEX IF NOT EXISTS idx_attachments_uploaded_by ON public.attachments (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_brands_company_id ON public.brands (company_id);
CREATE INDEX IF NOT EXISTS idx_categories_company_id ON public.categories (company_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipt_items_product_id ON public.goods_receipt_items (product_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_received_by ON public.goods_receipts (received_by);
CREATE INDEX IF NOT EXISTS idx_import_jobs_company_id ON public.import_jobs (company_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_imported_by ON public.import_jobs (imported_by);
CREATE INDEX IF NOT EXISTS idx_locations_parent_location_id ON public.locations (parent_location_id);
CREATE INDEX IF NOT EXISTS idx_product_barcodes_unit_id ON public.product_barcodes (unit_id);
CREATE INDEX IF NOT EXISTS idx_product_units_unit_id ON public.product_units (unit_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_product_id ON public.purchase_order_items (product_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_unit_id ON public.purchase_order_items (unit_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_company_id ON public.purchase_orders (company_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON public.role_permissions (permission_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_adjusted_by ON public.stock_adjustments (adjusted_by);
CREATE INDEX IF NOT EXISTS idx_suppliers_company_id ON public.suppliers (company_id);
CREATE INDEX IF NOT EXISTS idx_units_company_id ON public.units (company_id);

-- Keep the internal limiter invisible to direct API queries while satisfying RLS explicitly.
DROP POLICY IF EXISTS request_rate_limits_deny_all ON public.request_rate_limits;
CREATE POLICY request_rate_limits_deny_all
ON public.request_rate_limits
AS RESTRICTIVE
FOR ALL
TO PUBLIC
USING (false)
WITH CHECK (false);

-- Cache auth.uid() once per statement instead of recalculating it per row.
DROP POLICY IF EXISTS users_can_view_own_profile ON public.users;
CREATE POLICY users_can_view_own_profile
ON public.users
FOR SELECT
TO authenticated
USING (auth_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS users_can_view_own_notifications ON public.notifications;
CREATE POLICY users_can_view_own_notifications
ON public.notifications
FOR SELECT
TO authenticated
USING (
    user_id = (
        SELECT u.id
          FROM public.users u
         WHERE u.auth_user_id = (SELECT auth.uid())
         LIMIT 1
    )
);

DROP POLICY IF EXISTS users_can_update_own_notifications ON public.notifications;
CREATE POLICY users_can_update_own_notifications
ON public.notifications
FOR UPDATE
TO authenticated
USING (
    user_id = (
        SELECT u.id
          FROM public.users u
         WHERE u.auth_user_id = (SELECT auth.uid())
           AND u.is_active = true
         LIMIT 1
    )
)
WITH CHECK (
    user_id = (
        SELECT u.id
          FROM public.users u
         WHERE u.auth_user_id = (SELECT auth.uid())
           AND u.is_active = true
         LIMIT 1
    )
);

DROP POLICY IF EXISTS users_can_view_own_audit_logs ON public.audit_logs;
CREATE POLICY users_can_view_own_audit_logs
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
    user_id = (
        SELECT u.id
          FROM public.users u
         WHERE u.auth_user_id = (SELECT auth.uid())
         LIMIT 1
    )
);

CREATE OR REPLACE FUNCTION public.search_stock_count_products(
    target_stock_count_id uuid,
    search_query text DEFAULT '',
    with_stock_only boolean DEFAULT false,
    result_limit integer DEFAULT 100
)
RETURNS TABLE (
    id uuid,
    name text,
    sku text,
    system_quantity numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    current_company uuid;
    count_location uuid;
    count_status text;
    normalized_query text := trim(COALESCE(search_query, ''));
BEGIN
    SELECT u.company_id
      INTO current_company
      FROM public.users u
     WHERE u.auth_user_id = (SELECT auth.uid())
       AND u.is_active = true
     LIMIT 1;

    IF current_company IS NULL OR NOT public.has_permission('stock.count') THEN
        RAISE EXCEPTION 'ليس لديك صلاحية إدارة الجرد';
    END IF;
    IF NOT public.consume_user_rate_limit('stock_count.search', 120, 60) THEN
        RAISE EXCEPTION 'طلبات البحث كثيرة جدًا. حاول بعد دقيقة';
    END IF;

    SELECT sc.location_id, sc.status
      INTO count_location, count_status
      FROM public.stock_counts sc
      JOIN public.locations l ON l.id = sc.location_id
     WHERE sc.id = target_stock_count_id
       AND l.company_id = current_company
       AND l.is_active = true;

    IF count_location IS NULL THEN
        RAISE EXCEPTION 'الجرد غير موجود أو غير تابع للشركة الحالية';
    END IF;
    IF count_status = 'completed' THEN
        RAISE EXCEPTION 'لا يمكن تعديل جرد مكتمل';
    END IF;
    IF NOT public.can_access_location(count_location) THEN
        RAISE EXCEPTION 'لا يمكنك إدارة جرد هذا الموقع';
    END IF;

    RETURN QUERY
    SELECT p.id,
           p.name::text,
           p.sku::text,
           COALESCE(sb.available_quantity, 0)::numeric
      FROM public.products p
      LEFT JOIN public.stock_balances sb
        ON sb.product_id = p.id
       AND sb.location_id = count_location
     WHERE p.company_id = current_company
       AND p.is_active = true
       AND NOT EXISTS (
           SELECT 1
             FROM public.stock_count_items sci
            WHERE sci.stock_count_id = target_stock_count_id
              AND sci.product_id = p.id
       )
       AND (
           normalized_query = ''
           OR p.name ILIKE '%' || normalized_query || '%'
           OR p.sku ILIKE '%' || normalized_query || '%'
           OR EXISTS (
               SELECT 1
                 FROM public.product_barcodes pb
                WHERE pb.product_id = p.id
                  AND pb.barcode ILIKE '%' || normalized_query || '%'
           )
       )
       AND (NOT with_stock_only OR COALESCE(sb.available_quantity, 0) > 0)
     ORDER BY p.name, p.id
     LIMIT LEAST(GREATEST(COALESCE(result_limit, 100), 1), 100);
END;
$$;

CREATE OR REPLACE FUNCTION public.add_stock_count_items(
    target_stock_count_id uuid,
    add_mode text,
    selected_product_ids uuid[] DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    current_company uuid;
    count_location uuid;
    count_status text;
    inserted_count integer := 0;
BEGIN
    SELECT u.company_id
      INTO current_company
      FROM public.users u
     WHERE u.auth_user_id = (SELECT auth.uid())
       AND u.is_active = true
     LIMIT 1;

    IF current_company IS NULL OR NOT public.has_permission('stock.count') THEN
        RAISE EXCEPTION 'ليس لديك صلاحية إدارة الجرد';
    END IF;
    IF NOT public.consume_user_rate_limit('stock_count.add_items', 20, 60) THEN
        RAISE EXCEPTION 'طلبات إضافة الأصناف كثيرة جدًا. حاول بعد دقيقة';
    END IF;
    IF add_mode NOT IN ('all', 'with_stock', 'selected') THEN
        RAISE EXCEPTION 'طريقة إضافة المنتجات غير صالحة';
    END IF;
    IF add_mode = 'selected' AND COALESCE(cardinality(selected_product_ids), 0) = 0 THEN
        RAISE EXCEPTION 'اختر منتجًا واحدًا على الأقل';
    END IF;

    SELECT sc.location_id, sc.status
      INTO count_location, count_status
      FROM public.stock_counts sc
      JOIN public.locations l ON l.id = sc.location_id
     WHERE sc.id = target_stock_count_id
       AND l.company_id = current_company
       AND l.is_active = true
     FOR UPDATE OF sc;

    IF count_location IS NULL THEN
        RAISE EXCEPTION 'الجرد غير موجود أو غير تابع للشركة الحالية';
    END IF;
    IF count_status = 'completed' THEN
        RAISE EXCEPTION 'لا يمكن تعديل جرد مكتمل';
    END IF;
    IF NOT public.can_access_location(count_location) THEN
        RAISE EXCEPTION 'لا يمكنك إدارة جرد هذا الموقع';
    END IF;

    INSERT INTO public.stock_count_items (
        id, stock_count_id, product_id, system_quantity,
        counted_quantity, difference_quantity, notes
    )
    SELECT gen_random_uuid(),
           target_stock_count_id,
           p.id,
           COALESCE(sb.available_quantity, 0),
           NULL,
           NULL,
           NULL
      FROM public.products p
      LEFT JOIN public.stock_balances sb
        ON sb.product_id = p.id
       AND sb.location_id = count_location
     WHERE p.company_id = current_company
       AND p.is_active = true
       AND (add_mode <> 'selected' OR p.id = ANY(selected_product_ids))
       AND (add_mode <> 'with_stock' OR COALESCE(sb.available_quantity, 0) > 0)
    ON CONFLICT (stock_count_id, product_id) DO NOTHING;

    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    RETURN inserted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_stock_count_items(
    target_stock_count_id uuid,
    target_items jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    current_company uuid;
    count_location uuid;
    count_status text;
    item_record jsonb;
    item_id uuid;
    counted_qty numeric;
    item_notes text;
    affected integer;
    saved_count integer := 0;
BEGIN
    SELECT u.company_id
      INTO current_company
      FROM public.users u
     WHERE u.auth_user_id = (SELECT auth.uid())
       AND u.is_active = true
     LIMIT 1;

    IF current_company IS NULL OR NOT public.has_permission('stock.count') THEN
        RAISE EXCEPTION 'ليس لديك صلاحية إدارة الجرد';
    END IF;
    IF NOT public.consume_user_rate_limit('stock_count.save', 30, 60) THEN
        RAISE EXCEPTION 'طلبات حفظ الجرد كثيرة جدًا. حاول بعد دقيقة';
    END IF;
    IF target_items IS NULL
       OR jsonb_typeof(target_items) <> 'array'
       OR jsonb_array_length(target_items) = 0 THEN
        RAISE EXCEPTION 'لا توجد أصناف للحفظ';
    END IF;
    IF (
        SELECT count(*) <> count(DISTINCT value->>'id')
          FROM jsonb_array_elements(target_items)
    ) THEN
        RAISE EXCEPTION 'يوجد صنف مكرر في بيانات الحفظ';
    END IF;

    SELECT sc.location_id, sc.status
      INTO count_location, count_status
      FROM public.stock_counts sc
      JOIN public.locations l ON l.id = sc.location_id
     WHERE sc.id = target_stock_count_id
       AND l.company_id = current_company
       AND l.is_active = true
     FOR UPDATE OF sc;

    IF count_location IS NULL THEN
        RAISE EXCEPTION 'الجرد غير موجود أو غير تابع للشركة الحالية';
    END IF;
    IF count_status = 'completed' THEN
        RAISE EXCEPTION 'لا يمكن تعديل جرد مكتمل';
    END IF;
    IF NOT public.can_access_location(count_location) THEN
        RAISE EXCEPTION 'لا يمكنك إدارة جرد هذا الموقع';
    END IF;

    FOR item_record IN SELECT value FROM jsonb_array_elements(target_items)
    LOOP
        item_id := NULLIF(trim(item_record->>'id'), '')::uuid;
        counted_qty := NULL;
        IF item_record ? 'counted_quantity'
           AND jsonb_typeof(item_record->'counted_quantity') <> 'null'
           AND trim(item_record->>'counted_quantity') <> '' THEN
            counted_qty := (item_record->>'counted_quantity')::numeric;
        END IF;

        IF counted_qty < 0 OR counted_qty::text IN ('NaN', 'Infinity', '-Infinity') THEN
            RAISE EXCEPTION 'الكمية الفعلية يجب أن تكون رقمًا غير سالب';
        END IF;

        item_notes := NULLIF(trim(COALESCE(item_record->>'notes', '')), '');
        UPDATE public.stock_count_items sci
           SET counted_quantity = counted_qty,
               difference_quantity = CASE
                   WHEN counted_qty IS NULL THEN NULL
                   ELSE counted_qty - COALESCE(sci.system_quantity, 0)
               END,
               notes = item_notes
         WHERE sci.id = item_id
           AND sci.stock_count_id = target_stock_count_id;

        GET DIAGNOSTICS affected = ROW_COUNT;
        IF affected <> 1 THEN
            RAISE EXCEPTION 'أحد أصناف الجرد غير صحيح';
        END IF;
        saved_count := saved_count + 1;
    END LOOP;

    RETURN saved_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_stock_count_item(
    target_stock_count_id uuid,
    target_item_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    current_company uuid;
    count_location uuid;
    count_status text;
    affected integer;
BEGIN
    SELECT u.company_id
      INTO current_company
      FROM public.users u
     WHERE u.auth_user_id = (SELECT auth.uid())
       AND u.is_active = true
     LIMIT 1;

    IF current_company IS NULL OR NOT public.has_permission('stock.count') THEN
        RAISE EXCEPTION 'ليس لديك صلاحية إدارة الجرد';
    END IF;
    IF NOT public.consume_user_rate_limit('stock_count.remove_item', 30, 60) THEN
        RAISE EXCEPTION 'طلبات حذف الأصناف كثيرة جدًا. حاول بعد دقيقة';
    END IF;

    SELECT sc.location_id, sc.status
      INTO count_location, count_status
      FROM public.stock_counts sc
      JOIN public.locations l ON l.id = sc.location_id
     WHERE sc.id = target_stock_count_id
       AND l.company_id = current_company
       AND l.is_active = true
     FOR UPDATE OF sc;

    IF count_location IS NULL THEN
        RAISE EXCEPTION 'الجرد غير موجود أو غير تابع للشركة الحالية';
    END IF;
    IF count_status = 'completed' THEN
        RAISE EXCEPTION 'لا يمكن تعديل جرد مكتمل';
    END IF;
    IF NOT public.can_access_location(count_location) THEN
        RAISE EXCEPTION 'لا يمكنك إدارة جرد هذا الموقع';
    END IF;

    DELETE FROM public.stock_count_items
     WHERE id = target_item_id
       AND stock_count_id = target_stock_count_id;
    GET DIAGNOSTICS affected = ROW_COUNT;
    RETURN affected = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_stock_count(target_stock_count_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    current_user_id uuid;
    current_company uuid;
    count_location uuid;
    count_status text;
    item_record record;
    item_count integer;
    current_available numeric;
    current_reserved numeric;
    counted_qty numeric;
    system_qty numeric;
    difference_qty numeric;
BEGIN
    SELECT u.id, u.company_id
      INTO current_user_id, current_company
      FROM public.users u
     WHERE u.auth_user_id = (SELECT auth.uid())
       AND u.is_active = true
     LIMIT 1;

    IF current_user_id IS NULL OR NOT public.has_permission('stock.count') THEN
        RAISE EXCEPTION 'ليس لديك صلاحية إدارة الجرد';
    END IF;
    IF NOT public.consume_user_rate_limit('stock_count.complete', 5, 60) THEN
        RAISE EXCEPTION 'محاولات إكمال الجرد كثيرة جدًا. حاول بعد دقيقة';
    END IF;

    SELECT sc.location_id, sc.status
      INTO count_location, count_status
      FROM public.stock_counts sc
      JOIN public.locations l ON l.id = sc.location_id
     WHERE sc.id = target_stock_count_id
       AND l.company_id = current_company
       AND l.is_active = true
     FOR UPDATE OF sc;

    IF count_location IS NULL THEN
        RAISE EXCEPTION 'الجرد غير موجود أو غير تابع للشركة الحالية';
    END IF;
    IF count_status = 'completed' THEN
        RAISE EXCEPTION 'هذا الجرد مكتمل بالفعل';
    END IF;
    IF NOT public.can_access_location(count_location) THEN
        RAISE EXCEPTION 'لا يمكنك إدارة جرد هذا الموقع';
    END IF;

    SELECT count(*) INTO item_count
      FROM public.stock_count_items
     WHERE stock_count_id = target_stock_count_id;
    IF item_count = 0 THEN
        RAISE EXCEPTION 'لا يمكن إكمال جرد بلا أصناف';
    END IF;

    FOR item_record IN
        SELECT sci.id, sci.product_id,
               COALESCE(sci.system_quantity, 0) AS system_quantity,
               sci.counted_quantity
          FROM public.stock_count_items sci
         WHERE sci.stock_count_id = target_stock_count_id
         ORDER BY sci.product_id
         FOR UPDATE
    LOOP
        IF item_record.counted_quantity IS NULL THEN
            RAISE EXCEPTION 'يجب إدخال الكمية الفعلية لجميع أصناف الجرد';
        END IF;

        counted_qty := item_record.counted_quantity;
        system_qty := item_record.system_quantity;
        IF counted_qty < 0 THEN
            RAISE EXCEPTION 'الكمية الفعلية لا يمكن أن تكون سالبة';
        END IF;

        INSERT INTO public.stock_balances (
            id, product_id, location_id, available_quantity, reserved_quantity, updated_at
        ) VALUES (
            gen_random_uuid(), item_record.product_id, count_location, 0, 0, now()
        ) ON CONFLICT (product_id, location_id) DO NOTHING;

        SELECT COALESCE(sb.available_quantity, 0), COALESCE(sb.reserved_quantity, 0)
          INTO current_available, current_reserved
          FROM public.stock_balances sb
         WHERE sb.product_id = item_record.product_id
           AND sb.location_id = count_location
         FOR UPDATE;

        IF current_available <> system_qty THEN
            RAISE EXCEPTION
                'تغير رصيد أحد المنتجات بعد بدء الجرد. حدّث الجرد قبل الإكمال (المنتج: %)',
                item_record.product_id;
        END IF;

        difference_qty := counted_qty - system_qty;
        UPDATE public.stock_count_items
           SET difference_quantity = difference_qty
         WHERE id = item_record.id;

        IF difference_qty <> 0 THEN
            INSERT INTO public.stock_adjustments (
                id, location_id, product_id, quantity_before, quantity_after,
                adjustment_quantity, reason, adjusted_by, created_at
            ) VALUES (
                gen_random_uuid(), count_location, item_record.product_id,
                current_available, counted_qty, difference_qty,
                'تسوية ناتجة عن إكمال الجرد', current_user_id, now()
            );

            INSERT INTO public.stock_transactions (
                id, company_id, product_id, location_id, transaction_type,
                reference_type, reference_id, quantity, quantity_before,
                quantity_after, notes, user_id, created_at
            ) VALUES (
                gen_random_uuid(), current_company, item_record.product_id,
                count_location, 'adjustment'::public.transaction_type,
                'stock_count', target_stock_count_id, difference_qty,
                current_available, counted_qty, 'تسوية ناتجة عن الجرد',
                current_user_id, now()
            );
        END IF;

        UPDATE public.stock_balances
           SET available_quantity = counted_qty,
               reserved_quantity = current_reserved,
               last_count_date = now(),
               updated_at = now()
         WHERE product_id = item_record.product_id
           AND location_id = count_location;
    END LOOP;

    UPDATE public.stock_counts
       SET status = 'completed', completed_at = now()
     WHERE id = target_stock_count_id;
    RETURN target_stock_count_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_transfer_request(
    source_location_id uuid,
    destination_location_id uuid,
    transfer_items jsonb,
    transfer_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    current_user_id uuid;
    current_company uuid;
    transfer_id uuid := gen_random_uuid();
    generated_request_number text;
    item_record jsonb;
    source_name text;
    destination_name text;
    item_count integer;
    distinct_item_count integer;
BEGIN
    SELECT u.id, u.company_id
      INTO current_user_id, current_company
      FROM public.users u
     WHERE u.auth_user_id = (SELECT auth.uid())
       AND u.is_active = true
     LIMIT 1;

    IF current_user_id IS NULL OR NOT public.has_permission('transfers.create') THEN
        RAISE EXCEPTION 'ليس لديك صلاحية إنشاء طلب نقل';
    END IF;
    IF NOT public.consume_user_rate_limit('transfers.create', 10, 60) THEN
        RAISE EXCEPTION 'طلبات إنشاء النقل كثيرة جدًا. حاول بعد دقيقة';
    END IF;
    IF NOT public.can_access_location(source_location_id) THEN
        RAISE EXCEPTION 'لا يمكنك إنشاء طلب نقل من موقع لا تملك صلاحية الوصول إليه';
    END IF;

    SELECT l.name INTO source_name
      FROM public.locations l
     WHERE l.id = source_location_id
       AND l.company_id = current_company
       AND l.is_active = true;
    SELECT l.name INTO destination_name
      FROM public.locations l
     WHERE l.id = destination_location_id
       AND l.company_id = current_company
       AND l.is_active = true;

    IF source_name IS NULL OR destination_name IS NULL THEN
        RAISE EXCEPTION 'موقع المصدر أو الوجهة غير صالح';
    END IF;
    IF source_location_id = destination_location_id THEN
        RAISE EXCEPTION 'لا يمكن أن يكون المصدر والوجهة نفس الموقع';
    END IF;
    IF transfer_items IS NULL
       OR jsonb_typeof(transfer_items) <> 'array'
       OR jsonb_array_length(transfer_items) = 0 THEN
        RAISE EXCEPTION 'يجب إضافة صنف واحد على الأقل إلى طلب النقل';
    END IF;

    SELECT count(*), count(DISTINCT x.product_id)
      INTO item_count, distinct_item_count
      FROM jsonb_to_recordset(transfer_items)
        AS x(product_id uuid, unit_id uuid, requested_quantity numeric);
    IF item_count <> distinct_item_count THEN
        RAISE EXCEPTION 'لا يمكن تكرار المنتج في طلب النقل';
    END IF;

    FOR item_record IN SELECT value FROM jsonb_array_elements(transfer_items)
    LOOP
        IF (item_record->>'requested_quantity')::numeric <= 0 THEN
            RAISE EXCEPTION 'كمية النقل يجب أن تكون أكبر من صفر';
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM public.products p
             WHERE p.id = (item_record->>'product_id')::uuid
               AND p.company_id = current_company
               AND p.is_active = true
        ) THEN
            RAISE EXCEPTION 'أحد المنتجات غير صالح أو غير تابع للشركة';
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM public.product_units pu
             WHERE pu.product_id = (item_record->>'product_id')::uuid
               AND pu.unit_id = (item_record->>'unit_id')::uuid
        ) THEN
            RAISE EXCEPTION 'وحدة أحد المنتجات غير صالحة';
        END IF;
    END LOOP;

    generated_request_number := 'TR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
    INSERT INTO public.transfer_requests (
        id, request_number, from_location_id, to_location_id, status,
        requested_by, request_date, notes, created_at, updated_at
    ) VALUES (
        transfer_id, generated_request_number, source_location_id,
        destination_location_id, 'pending'::public.transfer_status,
        current_user_id, now(), transfer_notes, now(), now()
    );

    INSERT INTO public.transfer_items (
        id, transfer_request_id, product_id, unit_id, requested_quantity
    )
    SELECT gen_random_uuid(), transfer_id, x.product_id, x.unit_id, x.requested_quantity
      FROM jsonb_to_recordset(transfer_items)
        AS x(product_id uuid, unit_id uuid, requested_quantity numeric);

    INSERT INTO public.notifications (user_id, title, message, is_read, created_at)
    SELECT u.id,
           'طلب نقل جديد',
           'تم إنشاء طلب نقل جديد رقم ' || generated_request_number ||
           ' من ' || source_name || ' إلى ' || destination_name || '.',
           false,
           now()
      FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
     WHERE u.is_active = true
       AND u.company_id = current_company
       AND (lower(trim(r.name)) = 'admin' OR u.location_id = destination_location_id);

    RETURN transfer_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_cancelled_transfer(target_transfer_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    current_company uuid;
    transfer_status text;
    source_company uuid;
    destination_company uuid;
    transfer_number text;
BEGIN
    SELECT u.company_id INTO current_company
      FROM public.users u
     WHERE u.auth_user_id = (SELECT auth.uid())
       AND u.is_active = true
     LIMIT 1;

    IF current_company IS NULL OR NOT public.has_permission('transfers.delete') THEN
        RAISE EXCEPTION 'ليس لديك صلاحية حذف طلب النقل';
    END IF;
    IF NOT public.consume_user_rate_limit('transfers.delete', 10, 60) THEN
        RAISE EXCEPTION 'طلبات حذف النقل كثيرة جدًا. حاول بعد دقيقة';
    END IF;

    SELECT tr.status::text, src.company_id, dst.company_id, tr.request_number
      INTO transfer_status, source_company, destination_company, transfer_number
      FROM public.transfer_requests tr
      JOIN public.locations src ON src.id = tr.from_location_id
      JOIN public.locations dst ON dst.id = tr.to_location_id
     WHERE tr.id = target_transfer_id
     FOR UPDATE OF tr;

    IF transfer_status IS NULL THEN
        RAISE EXCEPTION 'طلب النقل غير موجود';
    END IF;
    IF source_company <> current_company OR destination_company <> current_company THEN
        RAISE EXCEPTION 'طلب النقل لا يتبع الشركة الحالية';
    END IF;
    IF transfer_status <> 'cancelled' THEN
        RAISE EXCEPTION 'يمكن حذف طلبات النقل الملغاة فقط';
    END IF;

    DELETE FROM public.notifications
     WHERE message IS NOT NULL
       AND strpos(message, transfer_number) > 0;
    DELETE FROM public.transfer_items WHERE transfer_request_id = target_transfer_id;
    DELETE FROM public.transfer_requests WHERE id = target_transfer_id;
    RETURN target_transfer_id;
END;
$$;

REVOKE ALL ON FUNCTION public.search_stock_count_products(uuid, text, boolean, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.consume_user_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_login_rate_limit(text, text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.add_stock_count_items(uuid, text, uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.save_stock_count_items(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.remove_stock_count_item(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_stock_count(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_transfer_request(uuid, uuid, jsonb, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_cancelled_transfer(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.search_stock_count_products(uuid, text, boolean, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.consume_user_rate_limit(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_login_rate_limit(text, text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.add_stock_count_items(uuid, text, uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.save_stock_count_items(uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.remove_stock_count_item(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_stock_count(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_transfer_request(uuid, uuid, jsonb, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_cancelled_transfer(uuid) TO authenticated, service_role;
