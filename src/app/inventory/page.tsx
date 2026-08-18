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
      }
    | null;

  locations:
    | {
        id: string;
        name: string;
        code: string;
      }
    | null;
};

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
      "id, company_id, is_active"
    )
    .eq("auth_user_id", user.id)
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

  // ============================================================
  // أرصدة المخزون
  // ============================================================

  const {
    data: balances,
    error: balancesError,
  } = await supabase
    .from("stock_balances")
    .select(
      `
        id,
        product_id,
        location_id,
        available_quantity,
        reserved_quantity,
        minimum_quantity,
        maximum_quantity,
        last_count_date,
        updated_at,

        products (
          id,
          name,
          sku
        ),

        locations (
          id,
          name,
          code
        )
      `
    )
    .order("updated_at", {
      ascending: false,
    });

  if (balancesError) {
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
            {balancesError.message}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  // ============================================================
  // التحقق من الشركة
  // ============================================================

  const inventory: InventoryBalance[] =
    (balances ?? []).map((balance) => ({
      ...balance,
      products: firstRelation(
        balance.products
      ),
      locations: firstRelation(
        balance.locations
      ),
    }));

  const locationIds = [
    ...new Set(
      inventory
        .map(
          (item) =>
            item.locations?.id
        )
        .filter(Boolean) as string[]
    ),
  ];

  const productIds = [
    ...new Set(
      inventory
        .map(
          (item) =>
            item.products?.id
        )
        .filter(Boolean) as string[]
    ),
  ];

  const [
    {
      data: companyLocations,
      error: locationsError,
    },
    {
      data: companyProducts,
      error: productsError,
    },
  ] = await Promise.all([
    locationIds.length
      ? supabase
          .from("locations")
          .select("id")
          .eq(
            "company_id",
            companyId
          )
          .in(
            "id",
            locationIds
          )
      : Promise.resolve({
          data: [],
          error: null,
        }),

    productIds.length
      ? supabase
          .from("products")
          .select("id")
          .eq(
            "company_id",
            companyId
          )
          .in(
            "id",
            productIds
          )
      : Promise.resolve({
          data: [],
          error: null,
        }),
  ]);

  if (locationsError) {
    return (
      <DashboardLayout>
        <div
          dir="rtl"
          className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700"
        >
          تعذر التحقق من مواقع المخزون:
          <span className="mr-1">
            {locationsError.message}
          </span>
        </div>
      </DashboardLayout>
    );
  }

  if (productsError) {
    return (
      <DashboardLayout>
        <div
          dir="rtl"
          className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700"
        >
          تعذر التحقق من منتجات المخزون:
          <span className="mr-1">
            {productsError.message}
          </span>
        </div>
      </DashboardLayout>
    );
  }

  const validLocationIds =
    new Set(
      (companyLocations ?? []).map(
        (location) =>
          location.id
      )
    );

  const validProductIds =
    new Set(
      (companyProducts ?? []).map(
        (product) =>
          product.id
      )
    );

  const companyInventory =
    inventory.filter(
      (item) =>
        item.products &&
        item.locations &&
        validLocationIds.has(
          item.locations.id
        ) &&
        validProductIds.has(
          item.products.id
        )
    );

  // ============================================================
  // الإحصائيات
  // ============================================================

  const totalRows =
    companyInventory.length;

  const totalAvailable =
    companyInventory.reduce(
      (sum, item) =>
        sum +
        Number(
          item.available_quantity ?? 0
        ),
      0
    );

  const totalReserved =
    companyInventory.reduce(
      (sum, item) =>
        sum +
        Number(
          item.reserved_quantity ?? 0
        ),
      0
    );

  const lowStockCount =
    companyInventory.filter(
      (item) => {
        const available =
          Number(
            item.available_quantity ?? 0
          );

        const minimum =
          Number(
            item.minimum_quantity ?? 0
          );

        return (
          minimum > 0 &&
          available <= minimum
        );
      }
    ).length;

  const outOfStockCount =
    companyInventory.filter(
      (item) =>
        Number(
          item.available_quantity ?? 0
        ) <= 0
    ).length;

  const locationMap =
    new Map<
      string,
      {
        id: string;
        name: string;
        code: string;
      }
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
          item.locations
        );
      }
    }
  );

  const locations = Array.from(
    locationMap.values()
  );

  return (
    <DashboardLayout>
      <div
        dir="rtl"
        className="mx-auto w-full max-w-[1600px] space-y-7"
      >
        {/* ======================================================
            رأس الصفحة
        ======================================================= */}

        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
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

            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              أرصدة المخزون
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              متابعة الكميات المتاحة والمحجوزة
              حسب المنتجات والمواقع.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-500 shadow-sm sm:flex">
              <Warehouse
                size={17}
                className="text-blue-500"
              />

              <span>
                {locations.length} موقع
              </span>
            </div>

            <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-500 shadow-sm sm:flex">
              <Package
                size={17}
                className="text-blue-500"
              />

              <span>
                {totalRows} رصيد
              </span>
            </div>
          </div>
        </div>

        {/* ======================================================
            الإحصائيات
        ======================================================= */}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={
              <Boxes size={20} />
            }
            label="أرصدة المخزون"
            value={totalRows.toLocaleString(
              "ar-SA"
            )}
            description="عدد سجلات المنتجات والمواقع"
          />

          <StatCard
            icon={
              <Package size={20} />
            }
            label="الكمية المتاحة"
            value={totalAvailable.toLocaleString(
              "ar-SA",
              {
                maximumFractionDigits: 2,
              }
            )}
            description="إجمالي الكمية المتاحة"
          />

          <StatCard
            icon={
              <Warehouse size={20} />
            }
            label="الكمية المحجوزة"
            value={totalReserved.toLocaleString(
              "ar-SA",
              {
                maximumFractionDigits: 2,
              }
            )}
            description="إجمالي الكمية المحجوزة"
          />

          <StatCard
            icon={
              <AlertTriangle size={20} />
            }
            label="تنبيهات المخزون"
            value={(
              lowStockCount +
              outOfStockCount
            ).toLocaleString("ar-SA")}
            description={`${outOfStockCount} نافد · ${lowStockCount} منخفض`}
            danger={
              lowStockCount > 0 ||
              outOfStockCount > 0
            }
          />
        </div>

        {/* ======================================================
            الجدول
        ======================================================= */}

        <InventoryTable
          inventory={companyInventory}
          locations={locations}
        />
      </div>
    </DashboardLayout>
  );
}

function StatCard({
  icon,
  label,
  value,
  description,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p
            className={`mt-2 text-2xl font-bold ${
              danger
                ? "text-red-600"
                : "text-slate-900"
            }`}
          >
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {description}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            danger
              ? "bg-red-50 text-red-500"
              : "bg-blue-50 text-blue-600"
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
