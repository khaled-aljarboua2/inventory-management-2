import DashboardLayout from "@/components/layout/DashboardLayout";
import { createClient } from "@/lib/supabase/server";
import TransfersList from "./TransfersList";

export default async function TransfersPage() {
  const supabase = await createClient();

  // ============================================================
  // المستخدم الحالي
  // ============================================================

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <DashboardLayout>
        <div
          dir="rtl"
          className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700"
        >
          يجب تسجيل الدخول أولًا.
        </div>
      </DashboardLayout>
    );
  }

  // ============================================================
  // مستخدم النظام
  // ============================================================

  const {
    data: dbUser,
    error: userError,
  } = await supabase
    .from("users")
    .select(`
      id,
      company_id,
      location_id,
      role_id,
      is_active,

      roles (
        id,
        name
      )
    `)
    .eq(
      "auth_user_id",
      user.id
    )
    .eq("is_active", true)
    .single();

  if (userError || !dbUser) {
    return (
      <DashboardLayout>
        <div
          dir="rtl"
          className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700"
        >
          لم يتم العثور على المستخدم في النظام.
        </div>
      </DashboardLayout>
    );
  }

  const companyId =
    dbUser.company_id;

  const currentLocationId =
    dbUser.location_id;

  const { data: hasFullAccess } = await supabase.rpc(
    "has_full_location_access"
  );

  const isGeneralManager =
    hasFullAccess === true;

  // ============================================================
  // تحميل البيانات
  // ============================================================

  const [
    {
      data: transfers,
      error: transfersError,
    },
    {
      data: locations,
      error: locationsError,
    },
  ] = await Promise.all([
    supabase
      .from("transfer_requests")
      .select(`
        id,
        request_number,
        from_location_id,
        to_location_id,
        status,
        request_date,
        notes,
        created_at,
        updated_at,

        transfer_items (
          id,
          product_id,
          unit_id,
          requested_quantity,
          approved_quantity,
          shipped_quantity,
          received_quantity,
          notes
        )
      `)
      .order(
        "created_at",
        {
          ascending: false,
        }
      ),

    supabase
      .from("locations")
      .select(`
        id,
        company_id,
        name,
        code,
        type,
        is_active
      `)
      .eq(
        "company_id",
        companyId
      )
      .eq(
        "is_active",
        true
      )
      .order("name"),
  ]);

  // ============================================================
  // أخطاء التحميل
  // ============================================================

  const firstError =
    transfersError ||
    locationsError;

  if (firstError) {
    return (
      <DashboardLayout>
        <div
          dir="rtl"
          className="mx-auto w-full max-w-[1600px] space-y-7"
        >
          <div>
            <div className="mb-2 text-sm text-slate-400">
              إدارة المخزون / طلبات النقل
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              طلبات النقل
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              إدارة عمليات نقل المخزون بين الفروع والمستودعات.
            </p>
          </div>

          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            <p className="font-semibold">
              حدث خطأ أثناء تحميل بيانات طلبات النقل.
            </p>

            <p className="mt-2 text-xs text-red-600">
              {firstError.message}
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ============================================================
  // خريطة المواقع
  // ============================================================

  const locationMap =
    new Map(
      (locations ?? []).map(
        (location) => [
          location.id,
          location,
        ]
      )
    );

  // ============================================================
  // تجهيز طلبات النقل
  // ============================================================

  const formattedTransfers = (
    transfers ?? []
  )
    .filter((transfer) => {
      const fromLocation =
        locationMap.get(
          transfer.from_location_id
        );

      const toLocation =
        locationMap.get(
          transfer.to_location_id
        );

      return (
        !!fromLocation &&
        !!toLocation
      );
    })
    .map((transfer) => ({
      ...transfer,

      from_location:
        locationMap.get(
          transfer.from_location_id
        ) ?? null,

      to_location:
        locationMap.get(
          transfer.to_location_id
        ) ?? null,

      items_count:
        transfer
          .transfer_items
          ?.length ?? 0,
    }));

  // ============================================================
  // الصفحة
  // ============================================================

  return (
    <DashboardLayout>
      <div
        dir="rtl"
        className="mx-auto w-full max-w-[1600px] space-y-7"
      >
        {/* ======================================================
            رأس الصفحة
        ======================================================= */}

        <div>
          <div className="mb-2 text-sm text-slate-400">
            إدارة المخزون / طلبات النقل
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            طلبات النقل
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            إدارة عمليات نقل المخزون بين الفروع والمستودعات.
          </p>
        </div>

        {/* ======================================================
            القائمة
        ======================================================= */}

        <TransfersList
          transfers={formattedTransfers}
          locations={
            locations ?? []
          }
          currentLocationId={
            currentLocationId
          }
          isGeneralManager={
            isGeneralManager
          }
        />
      </div>
    </DashboardLayout>
  );
}
