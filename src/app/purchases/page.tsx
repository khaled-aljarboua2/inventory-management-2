import DashboardLayout from "@/components/layout/DashboardLayout";
import { createClient } from "@/lib/supabase/server";
import { firstRelation } from "@/lib/supabase/relations";
import PurchaseTable from "./PurchaseTable";

export default async function PurchasesPage() {
  const supabase = await createClient();

  // المستخدم الحالي
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <DashboardLayout>
        <div
          dir="rtl"
          className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700"
        >
          يجب تسجيل الدخول أولًا.
        </div>
      </DashboardLayout>
    );
  }

  // بيانات مستخدم النظام
  const {
    data: dbUser,
    error: userError,
  } = await supabase
    .from("users")
    .select("id, company_id, is_active")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (userError || !dbUser) {
    return (
      <DashboardLayout>
        <div
          dir="rtl"
          className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700"
        >
          لم يتم العثور على المستخدم في النظام.
        </div>
      </DashboardLayout>
    );
  }

  const companyId = dbUser.company_id;

  const [
    { data: orders, error: ordersError },
    { data: suppliers, error: suppliersError },
    { data: locations, error: locationsError },
    { data: units, error: unitsError },
  ] = await Promise.all([
    // =========================================================
    // أوامر الشراء
    // =========================================================
    supabase
      .from("purchase_orders")
      .select(`
        id,
        order_number,
        supplier_id,
        location_id,
        status,
        ordered_by,
        notes,
        created_at,
        updated_at,

        suppliers (
          id,
          name
        ),

        locations (
          id,
          name,
          code
        ),

        purchase_order_items (
          id,
          product_id,
          unit_id,
          quantity,
          unit_cost,
          total,

          products (
            id,
            name,
            sku
          ),

          units (
            id,
            name,
            symbol
          )
        )
      `)
      .eq("company_id", companyId)
      .order("created_at", {
        ascending: false,
      }),

    // =========================================================
    // الموردون
    // =========================================================
    supabase
      .from("suppliers")
      .select(
        "id, name, phone, email"
      )
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("name"),

    // =========================================================
    // المواقع
    // =========================================================
    supabase
      .from("locations")
      .select(
        "id, name, code, type"
      )
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("name"),

    // =========================================================
    // الوحدات
    // =========================================================
    supabase
      .from("units")
      .select(
        "id, name, symbol"
      )
      .eq("company_id", companyId)
      .order("name"),
  ]);

  // =========================================================
  // تجميع أخطاء الاستعلامات
  // =========================================================

  const queryErrors = [
    ordersError,
    suppliersError,
    locationsError,
    unitsError,
  ].filter(Boolean);

  const normalizedOrders = (orders ?? []).map(
    (order) => ({
      ...order,
      suppliers: firstRelation(
        order.suppliers
      ),
      locations: firstRelation(
        order.locations
      ),
      purchase_order_items:
        (order.purchase_order_items ?? []).map(
          (item) => ({
            ...item,
            products: firstRelation(
              item.products
            ),
            units: firstRelation(
              item.units
            ),
          })
        ),
    })
  );

  return (
    <DashboardLayout>
      <div
        dir="rtl"
        className="space-y-6"
      >
        {/* العنوان */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            المشتريات
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            إدارة أوامر الشراء والاستلام وربطها بالمخزون.
          </p>
        </div>

        {/* أخطاء قاعدة البيانات */}
        {queryErrors.length > 0 && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
            <p className="font-semibold text-red-700">
              حدث خطأ أثناء تحميل بيانات المشتريات
            </p>

            <div className="mt-2 space-y-1 text-sm text-red-600">
              {ordersError && (
                <p>
                  أوامر الشراء:
                  <span className="mr-1 font-medium">
                    {ordersError.message}
                  </span>
                </p>
              )}

              {suppliersError && (
                <p>
                  الموردون:
                  <span className="mr-1 font-medium">
                    {suppliersError.message}
                  </span>
                </p>
              )}

              {locationsError && (
                <p>
                  المواقع:
                  <span className="mr-1 font-medium">
                    {locationsError.message}
                  </span>
                </p>
              )}

              {unitsError && (
                <p>
                  الوحدات:
                  <span className="mr-1 font-medium">
                    {unitsError.message}
                  </span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* =====================================================
            جدول المشتريات
        ===================================================== */}

        <PurchaseTable
          orders={normalizedOrders}
          suppliers={suppliers ?? []}
          locations={locations ?? []}
          units={units ?? []}
        />
      </div>
    </DashboardLayout>
  );
}
