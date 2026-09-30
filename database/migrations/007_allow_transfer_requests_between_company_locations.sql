-- Allow any user with transfers.create to create a transfer between
-- any two active locations that belong to the user's company.
-- Stage actions (approve/prepare/ship/receive/cancel) remain governed
-- by their existing permissions and workflow rules.

CREATE OR REPLACE FUNCTION public.create_transfer_request(
  source_location_id uuid,
  destination_location_id uuid,
  transfer_items jsonb,
  transfer_notes text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
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
$function$;
