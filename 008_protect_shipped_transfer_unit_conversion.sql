-- Protect transfer quantity consistency between shipping and receiving.
--
-- process_transfer() converts the selected unit to the base unit at shipping,
-- then reads the product-unit conversion again at receiving. If the conversion
-- were changed while a transfer is in the `shipped` state, source and
-- destination quantities could differ.
--
-- Keep the existing transfer workflow untouched and freeze only the relevant
-- product-unit mapping while an in-transit shipment references it.

CREATE OR REPLACE FUNCTION public.protect_shipped_transfer_unit_conversion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.transfer_items ti
        JOIN public.transfer_requests tr
          ON tr.id = ti.transfer_request_id
        WHERE ti.product_id = OLD.product_id
          AND ti.unit_id = OLD.unit_id
          AND tr.status::text = 'shipped'
    ) THEN
        RAISE EXCEPTION 'لا يمكن تعديل أو حذف وحدة منتج مرتبطة بشحنة تم شحنها ولم تُستلم بعد';
    END IF;

    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS protect_shipped_transfer_unit_conversion_update
ON public.product_units;

CREATE TRIGGER protect_shipped_transfer_unit_conversion_update
BEFORE UPDATE OF product_id, unit_id, conversion_factor
ON public.product_units
FOR EACH ROW
WHEN (
    OLD.product_id IS DISTINCT FROM NEW.product_id
    OR OLD.unit_id IS DISTINCT FROM NEW.unit_id
    OR OLD.conversion_factor IS DISTINCT FROM NEW.conversion_factor
)
EXECUTE FUNCTION public.protect_shipped_transfer_unit_conversion();

DROP TRIGGER IF EXISTS protect_shipped_transfer_unit_conversion_delete
ON public.product_units;

CREATE TRIGGER protect_shipped_transfer_unit_conversion_delete
BEFORE DELETE
ON public.product_units
FOR EACH ROW
EXECUTE FUNCTION public.protect_shipped_transfer_unit_conversion();

REVOKE ALL ON FUNCTION public.protect_shipped_transfer_unit_conversion()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.protect_shipped_transfer_unit_conversion()
TO service_role;
