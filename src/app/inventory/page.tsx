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

  const companyId = dbUser.company_id;

  // ============================================================
  // صلاحية عرض المخزون
  // ============================================================

  const {
    data: canViewStock,
    error: permissionError,
  } = await supabase.rpc("has_permission", {
    permission_code: "stock.view",
  });

  if (
    permissionError ||
    canViewStock !== true
  ) {
    return (
      <DashboardLayout>
        <div
          dir="rtl"
          className="mx-auto w-full max-w-[1600px]"
        >
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
            <h1 className="text-lg font-bold text-amber-800">
              ليس لديك صلاحية الوصول
            </h1>

            <p className="mt-2 text-sm text-amber-700">
              لا تملك الصلاحية اللازمة لعرض أرصدة المخزون.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ============================================================
  // الدور
  // ============================================================

  const {
    data: role,
  } = await supabase
    .from("roles")
    .select("id, name")
    .eq("id", dbUser.role_id)
    .maybeSingle();

  const roleName =
    role?.name?.toLowerCase() ?? "";

  const canViewAllLocations =
    roleName === "admin";

  // ============================================================
  // معاملات URL
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
    (params.search ?? "").trim();

  const locationFilter =
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
  // المواقع المسموح بها
  //
  // Admin:
  // جميع مواقع الشركة.
  //
  // باقي المستخدمين:
  // موقع المستخدم فقط.
  // ============================================================

  let allowedLocationIds =
    locations.map(
      (location) => location.id
    );

  if (!canViewAllLocations) {
    allowedLocationIds =
      dbUser.location_id
        ? [dbUser.location_id]
        : [];
  }

  // ============================================================
  // تحديد فلتر الموقع
  // ============================================================

  let selectedLocationIds =
    allowedLocationIds;

  if (
    canViewAllLocations &&
    locationFilter !== "all" &&
    locationFilter !== "other"
  ) {
    selectedLocationIds =
      allowedLocationIds.filter(
        (id) =>
          id === locationFilter
      );
  }

  // الفروع الأخرى = كل المواقع عدا موقع الـAdmin
  if (
    canViewAllLocations &&
    locationFilter === "other"
  ) {
    selectedLocationIds =
      dbUser.location_id
        ? allowedLocationIds.filter(
            (id) =>
              id !==
              dbUser.location_id
          )
        : allowedLocationIds;
  }

  // ============================================================
  // لا يوجد موقع مسموح
  // ============================================================

  if (
    selectedLocationIds.length === 0
  ) {
    return (
      <DashboardLayout>
        <div
          dir="rtl"
          className="mx-auto w-full max-w-[1600px] space-y-7"
        >
          <PageHeader
            locationsCount={
              locations.length
            }
            balancesCount={0}
          />

          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <Warehouse
              size={40}
              className="mx-auto mb-4 text-slate-300"
            />

            <p className="font-semibold text-slate-700">
              لا يوجد موقع مرتبط بالمستخدم
            </p>

            <p className="mt-1 text-sm text-slate-400">
              تواصل مع مسؤول النظام لربط حسابك بموقع.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ============================================================
  // البحث عن المنتجات
  //
  // نبحث في products أولًا.
  // ثم نبحث في product_barcodes.
  //
  // هذا يتجنب مشكلة Bad Request الناتجة
  // عن البحث داخل العلاقة مباشرة.
  // ============================================================

  let productIdsForSearch: string[] | null =
    null;

  if (search) {
    const escapedSearch =
      search
        .replace(/\\/g, "\\\\")
        .replace(/%/g, "\\%")
        .replace(/_/g, "\\_");

    const [
      { data: productsByName },
      { data: productsBySku },
      { data: barcodesBySearch },
    ] = await Promise.all([
      supabase
        .from("products")
        .select("id")
        .eq(
          "company_id",
          companyId
        )
        .ilike(
          "name",
          `%${escapedSearch}%`
        ),

      supabase
        .from("products")
        .select("id")
        .eq(
          "company_id",
          companyId
        )
        .ilike(
          "sku",
          `%${escapedSearch}%`
        ),

      supabase
        .from("product_barcodes")
        .select(
          "product_id"
        )
        .ilike(
          "barcode",
          `%${escapedSearch}%`
        ),
    ]);

    const ids = new Set<string>();

    for (
      const product of
        productsByName ?? []
    ) {
      ids.add(product.id);
    }

    for (
      const product of
        productsBySku ?? []
    ) {
      ids.add(product.id);
    }

    for (
      const barcode of
        barcodesBySearch ?? []
    ) {
      ids.add(barcode.product_id);
    }

    productIdsForSearch =
      Array.from(ids);

    // لا توجد منتجات مطابقة
    if (
      productIdsForSearch.length ===
      0
    ) {
      return (
        <DashboardLayout>
          <div
            dir="rtl"
            className="mx-auto w-full max-w-[1600px] space-y-7"
          >
            <PageHeader
              locationsCount={
                locations.length
              }
              balancesCount={0}
            />

            <InventoryTable
              inventory={[]}
              locations={locations}
              barcodeMap={
                new Map()
              }
              currentPage={1}
              totalPages={1}
              totalResults={0}
              pageSize={PAGE_SIZE}
              search={search}
              locationFilter={
                locationFilter
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
  }

  // ============================================================
  // استعلام أرصدة المخزون
  // ============================================================

  let balanceQuery =
    supabase
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
      )
      .in(
        "location_id",
        selectedLocationIds
      );

  // ============================================================
  // فلتر المنتجات من البحث
  // ============================================================

  if (
    productIdsForSearch !== null
  ) {
    balanceQuery =
      balanceQuery.in(
        "product_id",
        productIdsForSearch
      );
  }

  // ============================================================
  // Pagination
  // ============================================================

  const from =
    (currentPage - 1) *
    PAGE_SIZE;

  const to =
    from +
    PAGE_SIZE -
    1;

  const {
    data: balances,
    error: balancesError,
    count,
  } = await balanceQuery
    .order(
      "updated_at",
      {
        ascending: false,
      }
    )
    .range(
      from,
      to
    );

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
  // تجهيز الأرصدة
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
  // Pagination totals
  // ============================================================

  const totalResults =
    count ?? 0;

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        totalResults /
          PAGE_SIZE
      )
    );

  const safeCurrentPage =
    Math.min(
      currentPage,
      totalPages
    );

  // ============================================================
  // IDs الموجودة في الصفحة الحالية
  // ============================================================

  const pageProductIds =
    inventory.map(
      (item) =>
        item.product_id
    );

  // ============================================================
  // جلب الباركود للمنتجات الحالية فقط
  // ============================================================

  const barcodeMap =
    new Map<
      string,
      string
    >();

  if (
    pageProductIds.length > 0
  ) {
    const {
      data: barcodes,
    } = await supabase
      .from("product_barcodes")
      .select(
        "product_id, barcode, is_default"
      )
      .in(
        "product_id",
        pageProductIds
      )
      .order(
        "is_default",
        {
          ascending: false,
        }
      );

    for (
      const barcode of
        barcodes ?? []
    ) {
      if (
        !barcodeMap.has(
          barcode.product_id
        )
      ) {
        barcodeMap.set(
          barcode.product_id,
          barcode.barcode
        );
      }
    }
  }

  // ============================================================
  // إحصائيات الصفحة الحالية
  // ============================================================

  const totalAvailable =
    inventory.reduce(
      (sum, item) =>
        sum +
        Number(
          item.available_quantity ??
            0
        ),
      0
    );

  const totalReserved =
    inventory.reduce(
      (sum, item) =>
        sum +
        Number(
          item.reserved_quantity ??
            0
        ),
      0
    );

  const lowStockCount =
    inventory.filter(
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
          minimum > 0 &&
          available > 0 &&
          available <= minimum
        );
      }
    ).length;

  const outOfStockCount =
    inventory.filter(
      (item) =>
        Number(
          item.available_quantity ??
            0
        ) <= 0
    ).length;

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

        <PageHeader
          locationsCount={
            locations.length
          }
          balancesCount={
            totalResults
          }
        />

        {/* ======================================================
            الإحصائيات
        ======================================================= */}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={<Boxes size={20} />}
            label="أرصدة المخزون"
            value={totalResults.toLocaleString(
              "ar-SA"
            )}
            description="إجمالي سجلات المنتجات والمواقع"
          />

          <StatCard
            icon={<Package size={20} />}
            label="الكمية المتاحة"
            value={totalAvailable.toLocaleString(
              "ar-SA",
              {
                maximumFractionDigits: 2,
              }
            )}
            description="إجمالي الكمية في الصفحة الحالية"
          />

          <StatCard
            icon={<Warehouse size={20} />}
            label="الكمية المحجوزة"
            value={totalReserved.toLocaleString(
              "ar-SA",
              {
                maximumFractionDigits: 2,
              }
            )}
            description="إجمالي الكمية المحجوزة في الصفحة"
          />

          <StatCard
            icon={<AlertTriangle size={20} />}
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
          totalPages={totalPages}
          totalResults={
            totalResults
          }
          pageSize={PAGE_SIZE}
          search={search}
          locationFilter={
            locationFilter
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
   Page Header
================================================================ */

function PageHeader({
  locationsCount,
  balancesCount,
}: {
  locationsCount: number;
  balancesCount: number;
}) {
  return (
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
          متابعة الكميات المتاحة والمحجوزة حسب المنتجات والمواقع.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-500 shadow-sm sm:flex">
          <Warehouse
            size={17}
            className="text-teal-600"
          />

          <span>
            {locationsCount.toLocaleString(
              "ar-SA"
            )}{" "}
            موقع
          </span>
        </div>

        <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-500 shadow-sm sm:flex">
          <Package
            size={17}
            className="text-teal-600"
          />

          <span>
            {balancesCount.toLocaleString(
              "ar-SA"
            )}{" "}
            رصيد
          </span>
        </div>
      </div>
    </div>
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