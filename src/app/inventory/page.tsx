import DashboardLayout from "@/components/layout/DashboardLayout";
import { createClient } from "@/lib/supabase/server";
import { firstRelation } from "@/lib/supabase/relations";
import {
  AlertTriangle,
  Boxes,
  Package,
  Warehouse,
} from "lucide-react";

import InventoryTable from "./InventoryTable";

type InventoryBalance = {
  id: string;
  product_id: string;
  location_id: string;
  available_quantity: number;
  reserved_quantity: number;
  minimum_quantity: number;
  maximum_quantity: number | null;
  last_count_date: string | null;
  updated_at: string;

  products:
    | {
        id: string;
        name: string;
        sku: string;
        company_id: string;
      }
    | null;

  locations:
    | {
        id: string;
        name: string;
        code: string;
        company_id: string;
      }
    | null;
};

type Location = {
  id: string;
  name: string;
  code: string;
};

const BATCH_SIZE = 1000;

export default async function InventoryPage() {
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
    .select(
      "id, company_id, is_active, location_id"
    )
    .eq(
      "auth_user_id",
      user.id
    )
    .eq(
      "is_active",
      true
    )
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

  if (!dbUser.company_id) {
    return (
      <DashboardLayout>
        <div
          dir="rtl"
          className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-700"
        >
          المستخدم غير مرتبط بشركة.
        </div>
      </DashboardLayout>
    );
  }

  const companyId =
    dbUser.company_id;

  // ============================================================
  // تحديد نطاق المواقع
  //
  // المستخدم المرتبط بموقع:
  // يشاهد أرصدة موقعه فقط.
  //
  // المستخدم غير المرتبط بموقع:
  // يشاهد جميع مواقع الشركة.
  // ============================================================

  const currentLocationId =
    dbUser.location_id ?? null;

  // ============================================================
  // جلب جميع أرصدة المخزون
  //
  // يتم الجلب على دفعات حتى لا نتوقف عند أول 1000 سجل.
  // ============================================================

  const allBalances: InventoryBalance[] =
    [];

  try {
    for (
      let from = 0;
      ;
      from += BATCH_SIZE
    ) {
      let query = supabase
        .from("stock_balances")
        .select(`
          id,
          product_id,
          location_id,
          available_quantity,
          reserved_quantity,
          minimum_quantity,
          maximum_quantity,
          last_count_date,
          updated_at,

          products!inner (
            id,
            name,
            sku,
            company_id
          ),

          locations!inner (
            id,
            name,
            code,
            company_id
          )
        `)
        .eq(
          "products.company_id",
          companyId
        )
        .eq(
          "locations.company_id",
          companyId
        )
        .order(
          "updated_at",
          {
            ascending: false,
          }
        )
        .range(
          from,
          from + BATCH_SIZE - 1
        );

      // إذا كان المستخدم مرتبطًا بموقع،
      // نعرض أرصدة موقعه فقط.
      if (currentLocationId) {
        query = query.eq(
          "location_id",
          currentLocationId
        );
      }

      const {
        data,
        error,
      } = await query;

      if (error) {
        throw error;
      }

      const batch =
        (data ?? []).map(
          (balance) => ({
            ...balance,
            products:
              firstRelation(
                balance.products
              ),
            locations:
              firstRelation(
                balance.locations
              ),
          })
        ) as InventoryBalance[];

      allBalances.push(
        ...batch
      );

      // انتهت البيانات.
      if (
        batch.length <
        BATCH_SIZE
      ) {
        break;
      }
    }
  } catch (error) {
    return (
      <DashboardLayout>
        <div
          dir="rtl"
          className="rounded-2xl border border-red-200 bg-red-50 p-6"
        >
          <p className="font-semibold text-red-700">
            تعذر تحميل أرصدة المخزون
          </p>

          <p className="mt-2 text-sm text-red-600">
            {error instanceof Error
              ? error.message
              : "حدث خطأ غير متوقع."}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  // ============================================================
  // حماية إضافية
  // ============================================================

  const companyInventory =
    allBalances.filter(
      (item) =>
        item.products
          ?.company_id ===
          companyId &&
        item.locations
          ?.company_id ===
          companyId
    );

  // ============================================================
  // الإحصائيات
  // ============================================================

  const totalRows =
    companyInventory.length;

  const totalProducts =
    new Set(
      companyInventory.map(
        (item) =>
          item.product_id
      )
    ).size;

  const totalAvailable =
    companyInventory.reduce(
      (sum, item) =>
        sum +
        Number(
          item.available_quantity ??
            0
        ),
      0
    );

  const totalReserved =
    companyInventory.reduce(
      (sum, item) =>
        sum +
        Number(
          item.reserved_quantity ??
            0
        ),
      0
    );

  const lowStockCount =
    companyInventory.filter(
      (item) => {
        const available =
          Number(
            item.available_quantity ??
              0
          );

        const minimum =
          Number(
            item.minimum_quantity ??
              0
          );

        return (
          available > 0 &&
          minimum > 0 &&
          available <= minimum
        );
      }
    ).length;

  const outOfStockCount =
    companyInventory.filter(
      (item) =>
        Number(
          item.available_quantity ??
            0
        ) <= 0
    ).length;

  // ============================================================
  // المواقع
  // ============================================================

  const locationMap =
    new Map<
      string,
      Location
    >();

  companyInventory.forEach(
    (item) => {
      if (
        item.locations &&
        !locationMap.has(
          item.locations.id
        )
      ) {
        locationMap.set(
          item.locations.id,
          {
            id:
              item.locations.id,
            name:
              item.locations.name,
            code:
              item.locations.code,
          }
        );
      }
    }
  );

  const locations =
    Array.from(
      locationMap.values()
    );

  // ============================================================
  // الصفحة
  // ============================================================

  return (
    <DashboardLayout>
      <div
        dir="rtl"
        className="mx-auto w-full max-w-[1600px] space-y-6"
      >
        {/* ======================================================
            الرأس
        ======================================================= */}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
                <Boxes size={16} />

                <span>
                  إدارة المخزون
                </span>

                <span>/</span>

                <span className="text-slate-500">
                  أرصدة المخزون
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                أرصدة المخزون
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                متابعة الكميات المتاحة
                والمحجوزة حسب المنتجات
                والمواقع.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-500 shadow-sm">
                <Warehouse
                  size={17}
                  className="text-teal-600"
                />

                <span>
                  {locations.length.toLocaleString(
                    "ar-SA"
                  )}{" "}
                  موقع
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================
            الإحصائيات
        ======================================================= */}

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard
            icon={
              <Boxes size={19} />
            }
            label="المنتجات"
            value={totalProducts}
            description={`${totalRows.toLocaleString(
              "ar-SA"
            )} رصيد`}
          />

          <StatCard
            icon={
              <Package size={19} />
            }
            label="الكمية المتاحة"
            value={totalAvailable}
            description="إجمالي الكمية المتاحة"
          />

          <StatCard
            icon={
              <Warehouse size={19} />
            }
            label="الكمية المحجوزة"
            value={totalReserved}
            description="إجمالي الكمية المحجوزة"
          />

          <StatCard
            icon={
              <AlertTriangle
                size={19}
              />
            }
            label="تنبيهات المخزون"
            value={
              lowStockCount +
              outOfStockCount
            }
            description={`${outOfStockCount.toLocaleString(
              "ar-SA"
            )} نافد · ${lowStockCount.toLocaleString(
              "ar-SA"
            )} منخفض`}
            danger={
              lowStockCount +
                outOfStockCount >
              0
            }
          />
        </div>

        {/* ======================================================
            الجدول
        ======================================================= */}

        <InventoryTable
          inventory={
            companyInventory
          }
          locations={locations}
        />
      </div>
    </DashboardLayout>
  );
}

/* ==============================================================
   Stat Card
================================================================ */

function StatCard({
  icon,
  label,
  value,
  description,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  description: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            danger
              ? "bg-red-50 text-red-500"
              : "bg-teal-50 text-teal-600"
          }`}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 sm:text-sm">
            {label}
          </p>

          <p
            className={`mt-1 text-xl font-bold sm:text-2xl ${
              danger
                ? "text-red-600"
                : "text-slate-900"
            }`}
          >
            {value.toLocaleString(
              "ar-SA",
              {
                maximumFractionDigits: 2,
              }
            )}
          </p>

          <p className="mt-1 text-[11px] text-slate-400">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}