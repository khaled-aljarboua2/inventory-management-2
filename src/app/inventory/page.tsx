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

  products: {
    id: string;
    name: string;
    sku: string;
    company_id: string;
  } | null;

  locations: {
    id: string;
    name: string;
    code: string;
    company_id: string;
  } | null;
};

type Location = {
  id: string;
  name: string;
  code: string;
};

const BATCH_SIZE = 1000;

async function loadAllBalances(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  locationId: string | null,
) {
  const all: InventoryBalance[] = [];

  for (let from = 0; ; from += BATCH_SIZE) {
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
      .eq("products.company_id", companyId)
      .eq("locations.company_id", companyId)
      .order("updated_at", {
        ascending: false,
      })
      .range(
        from,
        from + BATCH_SIZE - 1,
      );

    if (locationId) {
      query = query.eq(
        "location_id",
        locationId,
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
      (data ?? []).map((row) => ({
        ...row,
        products: firstRelation(
          row.products,
        ),
        locations: firstRelation(
          row.locations,
        ),
      })) as InventoryBalance[];

    all.push(...batch);

    if (
      batch.length <
      BATCH_SIZE
    ) {
      break;
    }
  }

  return all;
}

async function loadBarcodes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  productIds: string[],
) {
  const map = new Map<
    string,
    string
  >();

  const ids = [
    ...new Set(productIds),
  ];

  for (
    let i = 0;
    i < ids.length;
    i += 500
  ) {
    const chunk = ids.slice(
      i,
      i + 500,
    );

    const {
      data,
      error,
    } = await supabase
      .from("product_barcodes")
      .select(
        "product_id, barcode, is_default",
      )
      .in(
        "product_id",
        chunk,
      )
      .order(
        "is_default",
        {
          ascending: false,
        },
      );

    if (error) {
      throw error;
    }

    for (
      const row of data ?? []
    ) {
      if (
        !map.has(
          row.product_id,
        )
      ) {
        map.set(
          row.product_id,
          row.barcode,
        );
      }
    }
  }

  return map;
}

export default async function InventoryPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return (
      <DashboardLayout>
        <ErrorBox text="يجب تسجيل الدخول أولًا." />
      </DashboardLayout>
    );
  }

  const {
    data: dbUser,
    error: userError,
  } = await supabase
    .from("users")
    .select(
      "id, company_id, role_id, location_id, is_active",
    )
    .eq(
      "auth_user_id",
      user.id,
    )
    .eq(
      "is_active",
      true,
    )
    .single();

  if (
    userError ||
    !dbUser
  ) {
    return (
      <DashboardLayout>
        <ErrorBox text="لم يتم العثور على المستخدم في النظام." />
      </DashboardLayout>
    );
  }

  if (!dbUser.company_id) {
    return (
      <DashboardLayout>
        <ErrorBox text="المستخدم غير مرتبط بشركة." />
      </DashboardLayout>
    );
  }

  const companyId =
    dbUser.company_id;

  const canViewAllLocations =
    !dbUser.location_id;

  let inventory: InventoryBalance[];

  try {
    inventory =
      await loadAllBalances(
        supabase,
        companyId,
        canViewAllLocations
          ? null
          : dbUser.location_id,
      );
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

  const barcodeMap =
    await loadBarcodes(
      supabase,
      inventory.map(
        (item) =>
          item.product_id,
      ),
    );

  const totalRows =
    inventory.length;

  const uniqueProducts =
    new Set(
      inventory.map(
        (item) =>
          item.product_id,
      ),
    ).size;

  const totalAvailable =
    inventory.reduce(
      (sum, item) =>
        sum +
        Number(
          item.available_quantity ??
            0,
        ),
      0,
    );

  const totalReserved =
    inventory.reduce(
      (sum, item) =>
        sum +
        Number(
          item.reserved_quantity ??
            0,
        ),
      0,
    );

  const lowStockCount =
    inventory.filter(
      (item) => {
        const available =
          Number(
            item.available_quantity ??
              0,
          );

        const minimum =
          Number(
            item.minimum_quantity ??
              0,
          );

        return (
          available > 0 &&
          minimum > 0 &&
          available <=
            minimum
        );
      },
    ).length;

  const outOfStockCount =
    inventory.filter(
      (item) =>
        Number(
          item.available_quantity ??
            0,
        ) <= 0,
    ).length;

  const locationMap =
    new Map<
      string,
      Location
    >();

  for (
    const item of inventory
  ) {
    if (
      item.locations &&
      !locationMap.has(
        item.locations.id,
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
        },
      );
    }
  }

  const locations =
    [...locationMap.values()];

  return (
    <DashboardLayout>
      <div
        dir="rtl"
        className="mx-auto w-full max-w-[1600px] space-y-5 sm:space-y-6"
      >
        <header className="rounded-2xl border border-slate-200 bg-white px-4 py-5 shadow-sm sm:px-6 sm:py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-400 sm:text-sm">
                <Boxes size={15} />

                <span>
                  إدارة المخزون
                </span>

                <span>/</span>

                <span>
                  أرصدة المخزون
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                أرصدة المخزون
              </h1>

              <p className="mt-1.5 text-sm text-slate-500">
                متابعة الكميات المتاحة
                والمحجوزة حسب المنتجات
                والمواقع.
              </p>
            </div>

            <div className="hidden shrink-0 items-center gap-2 rounded-xl bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-700 sm:flex">
              <Warehouse
                size={17}
              />

              {locations.length.toLocaleString(
                "ar-SA",
              )}{" "}
              مواقع
            </div>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={
              <Boxes size={18} />
            }
            label="المنتجات"
            value={uniqueProducts}
            description={`${totalRows.toLocaleString(
              "ar-SA",
            )} رصيد حسب المواقع`}
          />

          <StatCard
            icon={
              <Package size={18} />
            }
            label="الكمية المتاحة"
            value={totalAvailable}
            description="إجمالي الكمية المتاحة"
          />

          <StatCard
            icon={
              <Warehouse size={18} />
            }
            label="الكمية المحجوزة"
            value={totalReserved}
            description="إجمالي الكمية المحجوزة"
          />

          <StatCard
            icon={
              <AlertTriangle
                size={18}
              />
            }
            label="تنبيهات المخزون"
            value={
              lowStockCount +
              outOfStockCount
            }
            description={`${outOfStockCount.toLocaleString(
              "ar-SA",
            )} نافد · ${lowStockCount.toLocaleString(
              "ar-SA",
            )} منخفض`}
            danger={
              lowStockCount +
                outOfStockCount >
              0
            }
          />
        </div>

        <InventoryTable
          inventory={inventory}
          locations={locations}
          barcodeMap={barcodeMap}
          canViewAllLocations={
            canViewAllLocations
          }
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
  value: number;
  description: string;
  danger?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            danger
              ? "bg-red-50 text-red-500"
              : "bg-teal-50 text-teal-600"
          }`}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-500 sm:text-sm">
            {label}
          </p>

          <p
            className={`mt-1 text-xl font-bold leading-tight sm:text-2xl ${
              danger
                ? "text-red-600"
                : "text-slate-900"
            }`}
          >
            {value.toLocaleString(
              "ar-SA",
              {
                maximumFractionDigits: 2,
              },
            )}
          </p>

          <p className="mt-1 hidden truncate text-[11px] text-slate-400 sm:block">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function ErrorBox({
  text,
}: {
  text: string;
}) {
  return (
    <div
      dir="rtl"
      className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700"
    >
      {text}
    </div>
  );
}