import {
  Boxes,
  ArrowLeftRight,
  Building2,
  PackageCheck,
  ArrowUpLeft,
  ArrowDownLeft,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { firstRelation } from "@/lib/supabase/relations";
import StatCard from "./StatCard";

export default async function StatsGrid() {
  const supabase = await createClient();

  // ============================================================
  // المستخدم الحالي
  // ============================================================

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div
        dir="rtl"
        className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700"
      >
        يجب تسجيل الدخول أولًا.
      </div>
    );
  }

  // ============================================================
  // بيانات المستخدم
  // ============================================================

  const {
    data: currentUser,
    error: currentUserError,
  } = await supabase
    .from("users")
    .select(`
      id,
      company_id,
      location_id,
      is_active,
      roles (
        id,
        name
      )
    `)
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (currentUserError || !currentUser) {
    return (
      <div
        dir="rtl"
        className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700"
      >
        تعذر تحميل بيانات المستخدم.
      </div>
    );
  }

  const roleName =
    firstRelation(currentUser.roles)?.name ?? "";

  const isBranchUser =
    roleName.toLowerCase() === "branch";

  // ============================================================
  // البيانات
  // ============================================================

  const productsPromise = supabase
    .from("products")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq(
      "company_id",
      currentUser.company_id
    )
    .eq("is_active", true);

  const branchesPromise = supabase
    .from("locations")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq(
      "company_id",
      currentUser.company_id
    )
    .eq("type", "branch")
    .eq("is_active", true);

  const locationsPromise = supabase
    .from("locations")
    .select(`
      id,
      name,
      type,
      company_id,
      is_active
    `)
    .eq(
      "company_id",
      currentUser.company_id
    )
    .eq("is_active", true);

  const transfersPromise = supabase
    .from("transfer_requests")
    .select(`
      id,
      request_number,
      from_location_id,
      to_location_id,
      status,
      request_date,
      created_at
    `)
    .order("created_at", {
      ascending: false,
    });

  // ============================================================
  // تنفيذ الاستعلامات
  // ============================================================

  const [
    productsResult,
    branchesResult,
    locationsResult,
    transfersResult,
  ] = await Promise.all([
    productsPromise,
    branchesPromise,
    locationsPromise,
    transfersPromise,
  ]);

  // ============================================================
  // النتائج
  // ============================================================

  const totalProducts =
    productsResult.count ?? 0;

  let totalBranches =
    branchesResult.count ?? 0;

  const locations =
    locationsResult.data ?? [];

  const locationMap = new Map(
    locations.map((location) => [
      location.id,
      location,
    ])
  );

  // ============================================================
  // طلبات النقل
  // ============================================================

  const transfers = (
    transfersResult.data ?? []
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

      fromLocation:
        locationMap.get(
          transfer.from_location_id
        ),

      toLocation:
        locationMap.get(
          transfer.to_location_id
        ),
    }));

  const totalTransfers =
    transfers.length;

  const receivedTransfers =
    transfers.filter(
      (transfer) =>
        transfer.status === "received"
    ).length;

  const cancelledTransfers =
    transfers.filter(
      (transfer) =>
        transfer.status === "cancelled"
    ).length;

  const preparingTransfers =
    transfers.filter(
      (transfer) =>
        transfer.status === "preparing"
    ).length;

  const pendingTransfers =
    transfers.filter((transfer) =>
      [
        "pending",
        "approved",
        "preparing",
        "shipped",
        "in_transit",
      ].includes(transfer.status)
    ).length;

  // ============================================================
  // مستخدم الفرع
  // ============================================================

  if (isBranchUser) {
    totalBranches =
      currentUser.location_id ? 1 : 0;
  }

  // ============================================================
  // آخر الطلبات
  // ============================================================

  const latestTransfers =
    transfers.slice(0, 5);

  // ============================================================
  // النسب
  // ============================================================

  const receivedPercent =
    totalTransfers > 0
      ? (receivedTransfers /
          totalTransfers) *
        100
      : 0;

  const cancelledPercent =
    totalTransfers > 0
      ? (cancelledTransfers /
          totalTransfers) *
        100
      : 0;

  const preparingPercent =
    totalTransfers > 0
      ? (preparingTransfers /
          totalTransfers) *
        100
      : 0;

  // ============================================================
  // حالة طلب النقل
  // ============================================================

  const getStatusLabel = (
    status: string
  ) => {
    switch (status) {
      case "received":
        return "مستلم";

      case "cancelled":
        return "ملغى";

      case "preparing":
        return "قيد التجهيز";

      case "pending":
        return "معلق";

      case "approved":
        return "معتمد";

      case "shipped":
        return "تم الشحن";

      case "in_transit":
        return "قيد النقل";

      default:
        return status;
    }
  };

  const getStatusClass = (
    status: string
  ) => {
    switch (status) {
      case "received":
        return "bg-emerald-50 text-emerald-700";

      case "cancelled":
        return "bg-red-50 text-red-700";

      case "preparing":
        return "bg-amber-50 text-amber-700";

      case "pending":
        return "bg-teal-50 text-teal-700";

      case "approved":
        return "bg-indigo-50 text-indigo-700";

      case "shipped":
      case "in_transit":
        return "bg-violet-50 text-violet-700";

      default:
        return "bg-slate-50 text-slate-600";
    }
  };

  // ============================================================
  // قيمة المخزون
  // ============================================================

  const inventoryValue = "—";

  return (
    <div
      dir="rtl"
      className="space-y-6"
    >
      {/* ======================================================
          KPI
      ======================================================= */}

      <div
        className="
          grid
          grid-cols-1
          gap-4
          sm:grid-cols-2
          xl:grid-cols-4
        "
      >
        <StatCard
          title="إجمالي المنتجات"
          value={totalProducts.toLocaleString("ar-SA")}
          description="المنتجات النشطة"
          icon={
            <Boxes
              size={21}
              strokeWidth={2}
            />
          }
          color="teal"
        />

        <StatCard
          title="طلبات النقل"
          value={totalTransfers.toLocaleString("ar-SA")}
          description={
            pendingTransfers > 0
              ? `${pendingTransfers} قيد التنفيذ`
              : "لا توجد طلبات قيد التنفيذ"
          }
          icon={
            <ArrowLeftRight
              size={21}
              strokeWidth={2}
            />
          }
          color="green"
        />

        <StatCard
          title="الفروع"
          value={totalBranches.toLocaleString("ar-SA")}
          description="الفروع النشطة"
          icon={
            <Building2
              size={21}
              strokeWidth={2}
            />
          }
          color="orange"
        />

        <StatCard
          title="قيمة المخزون"
          value={inventoryValue}
          description="بانتظار ربط تكلفة المخزون"
          icon={
            <PackageCheck
              size={21}
              strokeWidth={2}
            />
          }
          color="purple"
        />
      </div>

      {/* ======================================================
          المحتوى الرئيسي
      ======================================================= */}

      <div
        className="
          grid
          grid-cols-1
          gap-5
          xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]
        "
      >
        {/* ====================================================
            آخر طلبات النقل
        ===================================================== */}

        <section
          className="
            overflow-hidden
            rounded-3xl
            border
            border-slate-200
            bg-white
            shadow-sm
          "
        >
          <div
            className="
              flex
              items-center
              justify-between
              border-b
              border-slate-100
              px-5
              py-5
              sm:px-6
            "
          >
            <div>
              <h2 className="text-base font-bold text-slate-900">
                آخر طلبات النقل
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                أحدث عمليات نقل المخزون
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
              {totalTransfers} طلب
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-right">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-xs text-slate-400">
                  <th className="px-6 py-3 font-medium">
                    الطلب
                  </th>

                  <th className="px-6 py-3 font-medium">
                    من
                  </th>

                  <th className="px-6 py-3 font-medium">
                    إلى
                  </th>

                  <th className="px-6 py-3 font-medium">
                    الحالة
                  </th>
                </tr>
              </thead>

              <tbody>
                {latestTransfers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-12 text-center text-sm text-slate-400"
                    >
                      لا توجد طلبات نقل حاليًا.
                    </td>
                  </tr>
                ) : (
                  latestTransfers.map(
                    (transfer) => (
                      <tr
                        key={transfer.id}
                        className="
                          border-b
                          border-slate-100
                          last:border-0
                          transition-colors
                          hover:bg-slate-50/70
                        "
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="
                                flex
                                h-9
                                w-9
                                shrink-0
                                items-center
                                justify-center
                                rounded-xl
                                bg-slate-100
                                text-slate-500
                              "
                            >
                              <ArrowLeftRight
                                size={17}
                              />
                            </div>

                            <div>
                              <p className="text-sm font-semibold text-slate-800">
                                {transfer.request_number}
                              </p>

                              <p className="mt-0.5 text-[11px] text-slate-400">
                                طلب نقل
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-sm text-slate-600">
                          {transfer.fromLocation?.name ??
                            "—"}
                        </td>

                        <td className="px-6 py-4 text-sm text-slate-600">
                          {transfer.toLocation?.name ??
                            "—"}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`
                              inline-flex
                              rounded-full
                              px-3
                              py-1.5
                              text-xs
                              font-semibold
                              ${getStatusClass(
                                transfer.status
                              )}
                            `}
                          >
                            {getStatusLabel(
                              transfer.status
                            )}
                          </span>
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ====================================================
            حالة الطلبات
        ===================================================== */}

        <section
          className="
            rounded-3xl
            border
            border-slate-200
            bg-white
            p-5
            shadow-sm
            sm:p-6
          "
        >
          <div>
            <h2 className="text-base font-bold text-slate-900">
              حالة طلبات النقل
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              توزيع الطلبات الحالية
            </p>
          </div>

          {/* الدائرة */}

          <div className="mt-7 flex justify-center">
            <div
              className="
                relative
                flex
                h-44
                w-44
                items-center
                justify-center
                rounded-full
              "
              style={{
                background: `
                  conic-gradient(
                    #10b981 0% ${receivedPercent}%,
                    #ef4444 ${receivedPercent}% ${
                  receivedPercent +
                  cancelledPercent
                }%,
                    #f59e0b ${
                      receivedPercent +
                      cancelledPercent
                    }% 100%
                  )
                `,
              }}
            >
              <div
                className="
                  flex
                  h-32
                  w-32
                  flex-col
                  items-center
                  justify-center
                  rounded-full
                  bg-white
                "
              >
                <span className="text-3xl font-bold text-slate-900">
                  {totalTransfers}
                </span>

                <span className="mt-1 text-xs text-slate-400">
                  إجمالي الطلبات
                </span>
              </div>
            </div>
          </div>

          {/* الحالات */}

          <div className="mt-7 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />

                <span className="text-sm text-slate-600">
                  مستلمة
                </span>
              </div>

              <span className="text-sm font-bold text-slate-900">
                {receivedTransfers}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />

                <span className="text-sm text-slate-600">
                  قيد التجهيز
                </span>
              </div>

              <span className="text-sm font-bold text-slate-900">
                {preparingTransfers}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />

                <span className="text-sm text-slate-600">
                  ملغاة
                </span>
              </div>

              <span className="text-sm font-bold text-slate-900">
                {cancelledTransfers}
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* ======================================================
          ملخص سريع
      ======================================================= */}

      <section
        className="
          grid
          grid-cols-1
          gap-4
          sm:grid-cols-3
        "
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <ArrowDownLeft size={20} />
            </div>

            <div>
              <p className="text-xs text-slate-400">
                طلبات مستلمة
              </p>

              <p className="mt-1 text-xl font-bold text-slate-900">
                {receivedTransfers}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <ArrowLeftRight size={20} />
            </div>

            <div>
              <p className="text-xs text-slate-400">
                قيد التجهيز
              </p>

              <p className="mt-1 text-xl font-bold text-slate-900">
                {preparingTransfers}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <ArrowUpLeft size={20} />
            </div>

            <div>
              <p className="text-xs text-slate-400">
                طلبات ملغاة
              </p>

              <p className="mt-1 text-xl font-bold text-slate-900">
                {cancelledTransfers}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}