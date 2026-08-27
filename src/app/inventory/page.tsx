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

type ProductBarcode = {
  product_id: string;
  barcode: string;
  is_default: boolean | null;
};

type Location = {
  id: string;
  name: string;
  code: string;
};

const PAGE_SIZE = 100;

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
    location?: string;
    status?: string;
  }>;
}) {
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
      "id, company_id, role_id, location_id, is_active"
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

  const companyId = dbUser.company_id;

  if (!companyId) {
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

  // ============================================================
  // الدور
  // ============================================================

  const {
    data: role,
    error: roleError,
  } = await supabase
    .from("roles")
    .select("id, name")
    .eq("id", dbUser.role_id)
    .maybeSingle();

  if (roleError) {
    return (
      <DashboardLayout>
        <div
          dir="rtl"
          className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700"
        >
          تعذر التحقق من دور المستخدم.
        </div>
      </DashboardLayout>
    );
  }

  const roleName =
    role?.name?.toLowerCase() ?? "";

  const canViewAllLocations =
    roleName === "admin" ||
    roleName === "warehouse manager";

  // ============================================================
  // Parameters
  // ============================================================

  const params = await searchParams;

  const requestedPage = Number(
    params.page ?? "1"
  );

  const currentPage =
    Number.isFinite(requestedPage) &&
    requestedPage > 0
      ? Math.floor(requestedPage)
      : 1;

  const search =
    params.search?.trim() ?? "";

  const requestedLocation =
    params.location ?? "all";

  const statusFilter =
    params.status ?? "all";

  // ============================================================
  // المواقع التابعة للشركة
  // ============================================================

  const {
    data: locationsData,
    error: locationsError,
  } = await supabase
    .from("locations")
    .select("id, name, code")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("name");

  if (locationsError) {
    return (
      <DashboardLayout>
        <div
          dir="rtl"
          className="rounded-2xl border border-red-200 bg-red-50 p-6"
        >
          <p className="font-semibold text-red-700">
            تعذر تحميل المواقع
          </p>

          <p className="mt-2 text-sm text-red-600">
            {locationsError.message}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const locations: Location[] =
    locationsData ?? [];

  // ============================================================
  // تحديد الموقع المسموح به
  // ============================================================

  let effectiveLocation =
    requestedLocation;

  if (!canViewAllLocations) {
    effectiveLocation =
      dbUser.location_id ?? "none";
  }

  // ============================================================
  // البحث عن المنتجات بالباركود
  // ============================================================

  let barcodeProductIds: string[] = [];

  if (search) {
    const {
      data: barcodeRows,
    } = await supabase
      .from("product_barcodes")
      .select("product_id")
      .ilike(
        "barcode",
        `%${search}%`
      );

    barcodeProductIds =
      (barcodeRows ?? []).map(
        (row) => row.product_id
      );
  }

  // ============================================================
  // استعلام أرصدة المخزون
  // ============================================================

  let balanceQuery = supabase
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
      `,
      {
        count: "exact",
      }
    )
    .eq(
      "products.company_id",
      companyId
    )
    .eq(
      "locations.company_id",
      companyId
    );

  // ============================================================
  // فلترة الفرع
  // ============================================================

  if (
    effectiveLocation !== "all"
  ) {
    balanceQuery =
      balanceQuery.eq(
        "location_id",
        effectiveLocation
      );
  }

  // ============================================================
  // البحث
  //
  // الاسم + SKU + الباركود
  // ============================================================

  if (search) {
    const searchConditions = [
      `name.ilike.%${search}%`,
      `sku.ilike.%${search}%`,
    ];

    if (
      barcodeProductIds.length > 0
    ) {
      searchConditions.push(
        `id.in.(${barcodeProductIds.join(",")})`
      );
    }

    balanceQuery =
      balanceQuery.or(
        searchConditions.join(","),
        {
          foreignTable:
            "products",
        }
      );
  }

  // ============================================================
  // فلترة الحالة
  // ============================================================

  if (statusFilter === "out") {
    balanceQuery =
      balanceQuery.lte(
        "available_quantity",
        0
      );
  }

  if (statusFilter === "low") {
    balanceQuery =
      balanceQuery
        .gt(
          "available_quantity",
          0
        )
        .gt(
          "minimum_quantity",
          0
        )
        .lte(
          "available_quantity",
          999999999999
        );
  }

  // ============================================================
  // Pagination
  // ============================================================

  const from =
    (currentPage - 1) *
    PAGE_SIZE;

  const to =
    from + PAGE_SIZE - 1;

  const {
    data: balances,
    error: balancesError,
    count,
  } = await balanceQuery
    .order("updated_at", {
      ascending: false,
    })
    .range(from, to);

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
  // باركودات المنتجات الموجودة في الصفحة
  // ============================================================

  const productIds =
    (balances ?? []).map(
      (balance) =>
        balance.product_id
    );

  const barcodeMap =
    new Map<string, string>();

  if (productIds.length > 0) {
    const {
      data: barcodeRows,
    } = await supabase
      .from("product_barcodes")
      .select(
        "product_id, barcode, is_default"
      )
      .in(
        "product_id",
        productIds
      );

    for (
      const row of barcodeRows ?? []
    ) {
      const existing =
        barcodeMap.get(
          row.product_id
        );

      if (
        !existing ||
        row.is_default === true
      ) {
        barcodeMap.set(
          row.product_id,
          row.barcode
        );
      }
    }
  }

  // ============================================================
  // تجهيز البيانات
  // ============================================================

  const inventory: InventoryBalance[] =
    (balances ?? []).map(
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
    );

  // ============================================================
  // الإحصائيات
  // ============================================================

  const totalRows =
    count ?? 0;

  const totalAvailable =
    inventory.reduce(
      (sum, item) =>
        sum +
        Number(
          item.available_quantity ?? 0
        ),
      0
    );

  const totalReserved =
    inventory.reduce(
      (sum, item) =>
        sum +
        Number(
          item.reserved_quantity ?? 0
        ),
      0
    );

  const lowStockCount =
    inventory.filter(
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
          available > 0 &&
          minimum > 0 &&
          available <= minimum
        );
      }
    ).length;

  const outOfStockCount =
    inventory.filter(
      (item) =>
        Number(
          item.available_quantity ?? 0
        ) <= 0
    ).length;

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        totalRows /
          PAGE_SIZE
      )
    );

  const safeCurrentPage =
    Math.min(
      currentPage,
      totalPages
    );

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
            الرأس
        ======================================================= */}

        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
              <Boxes
                size={16}
                className="text-teal-600"
              />

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
                className="text-teal-600"
              />

              <span>
                {locations.length} موقع
              </span>
            </div>

            <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-500 shadow-sm sm:flex">
              <Package
                size={17}
                className="text-teal-600"
              />

              <span>
                {totalRows.toLocaleString(
                  "ar-SA"
                )}{" "}
                رصيد
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
            description="عدد النتائج"
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
            description="إجمالي الصفحة الحالية"
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
            description="إجمالي الصفحة الحالية"
          />

          <StatCard
            icon={
              <AlertTriangle
                size={20}
              />
            }
            label="تنبيهات المخزون"
            value={(
              lowStockCount +
              outOfStockCount
            ).toLocaleString(
              "ar-SA"
            )}
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
          inventory={inventory}
          locations={locations}
          barcodeMap={barcodeMap}
          currentPage={
            safeCurrentPage
          }
          totalPages={
            totalPages
          }
          totalResults={
            totalRows
          }
          pageSize={
            PAGE_SIZE
          }
          search={search}
          locationFilter={
            effectiveLocation
          }
          statusFilter={
            statusFilter
          }
          canViewAllLocations={
            canViewAllLocations
          }
          currentLocationId={
            dbUser.location_id
          }
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
              : "bg-teal-50 text-teal-600"
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}