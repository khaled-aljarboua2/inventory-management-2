import type { ReactNode } from "react";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { firstRelation } from "@/lib/supabase/relations";
import { createClient } from "@/lib/supabase/server";
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

type ProductUnitRow = {
  product_id: string;
  is_base: boolean;
  units: {
    name: string;
    symbol: string | null;
  } | {
    name: string;
    symbol: string | null;
  }[] | null;
};

type ProductBarcodeRow = {
  product_id: string;
  barcode: string;
  is_default: boolean;
};

type InventoryRow = InventoryBalance & {
  unit_name: string;
  barcodes: string[];
};

type Location = {
  id: string;
  name: string;
  code: string;
};

type UnitTotals = Map<string, number>;

const BALANCE_PAGE_SIZE = 1000;
const RELATED_PRODUCTS_BATCH_SIZE = 500;
const UNKNOWN_UNIT = "وحدة غير محددة";

function formatInventoryNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

function ErrorBox({ children }: { children: ReactNode }) {
  return (
    <DashboardLayout>
      <div
        dir="rtl"
        className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700"
      >
        {children}
      </div>
    </DashboardLayout>
  );
}

function splitIntoBatches<T>(items: T[], size = RELATED_PRODUCTS_BATCH_SIZE): T[][] {
  const batches: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }

  return batches;
}

function sumByUnit(
  inventory: InventoryRow[],
  quantityKey: "available_quantity" | "reserved_quantity"
): UnitTotals {
  const totals = new Map<string, number>();

  for (const item of inventory) {
    const unitName = item.unit_name || UNKNOWN_UNIT;
    const quantity = Number(item[quantityKey] ?? 0);

    totals.set(unitName, (totals.get(unitName) ?? 0) + quantity);
  }

  return totals;
}

export default async function InventoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <ErrorBox>يجب تسجيل الدخول أولًا.</ErrorBox>;
  }

  const { data: dbUser, error: userError } = await supabase
    .from("users")
    .select("id, company_id, role_id, location_id, is_active")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (userError || !dbUser) {
    return <ErrorBox>لم يتم العثور على المستخدم في النظام.</ErrorBox>;
  }

  if (!dbUser.company_id) {
    return <ErrorBox>المستخدم غير مرتبط بشركة.</ErrorBox>;
  }

  const [
    { data: role, error: roleError },
    { data: hasFullAccess, error: fullAccessError },
  ] = await Promise.all([
    supabase
      .from("roles")
      .select("name")
      .eq("id", dbUser.role_id)
      .single(),
    supabase.rpc("has_full_location_access"),
  ]);

  if (roleError || !role || fullAccessError) {
    return <ErrorBox>تعذر تحديد صلاحية المستخدم.</ErrorBox>;
  }

  const isAdmin = hasFullAccess === true;
  const currentLocationId = dbUser.location_id ?? null;

  if (!isAdmin && !currentLocationId) {
    return <ErrorBox>المستخدم غير مرتبط بموقع.</ErrorBox>;
  }

  const allBalances: InventoryBalance[] = [];

  try {
    let from = 0;

    while (true) {
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
          products!inner (id, name, sku, company_id),
          locations!inner (id, name, code, company_id)
        `)
        .eq("products.company_id", dbUser.company_id)
        .eq("locations.company_id", dbUser.company_id)
        .order("updated_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, from + BALANCE_PAGE_SIZE - 1);

      if (!isAdmin) {
        query = query.eq("location_id", currentLocationId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const batch = (data ?? []).map((row) => ({
        ...row,
        products: firstRelation(row.products),
        locations: firstRelation(row.locations),
      })) as InventoryBalance[];

      allBalances.push(...batch);

      if (batch.length < BALANCE_PAGE_SIZE) {
        break;
      }

      from += BALANCE_PAGE_SIZE;
    }
  } catch (error) {
    return (
      <ErrorBox>
        <p className="font-semibold">تعذر تحميل أرصدة المخزون</p>
        <p className="mt-2">
          {error instanceof Error ? error.message : "حدث خطأ غير متوقع."}
        </p>
      </ErrorBox>
    );
  }

  const companyInventory = allBalances.filter(
    (item) =>
      item.products?.company_id === dbUser.company_id &&
      item.locations?.company_id === dbUser.company_id &&
      (isAdmin || item.location_id === currentLocationId)
  );

  const productIds = Array.from(
    new Set(companyInventory.map((item) => item.product_id))
  );
  const productBatches = splitIntoBatches(productIds);
  const unitNameByProduct = new Map<string, string>();
  const barcodesByProduct = new Map<string, string[]>();

  try {
    const [unitResponses, barcodeResponses] = await Promise.all([
      Promise.all(
        productBatches.map((ids) =>
          supabase
            .from("product_units")
            .select("product_id, is_base, units(name, symbol)")
            .in("product_id", ids)
            .order("is_base", { ascending: false })
        )
      ),
      Promise.all(
        productBatches.map((ids) =>
          supabase
            .from("product_barcodes")
            .select("product_id, barcode, is_default")
            .in("product_id", ids)
            .order("is_default", { ascending: false })
        )
      ),
    ]);

    for (const response of unitResponses) {
      if (response.error) {
        throw response.error;
      }

      for (const row of (response.data ?? []) as ProductUnitRow[]) {
        const unit = Array.isArray(row.units)
          ? row.units[0] ?? null
          : row.units;
        const unitName = unit?.symbol || unit?.name || UNKNOWN_UNIT;

        if (!unitNameByProduct.has(row.product_id) || row.is_base) {
          unitNameByProduct.set(row.product_id, unitName);
        }
      }
    }

    for (const response of barcodeResponses) {
      if (response.error) {
        throw response.error;
      }

      for (const row of (response.data ?? []) as ProductBarcodeRow[]) {
        const barcode = row.barcode?.trim();

        if (!barcode) {
          continue;
        }

        const currentBarcodes = barcodesByProduct.get(row.product_id) ?? [];

        if (!currentBarcodes.includes(barcode)) {
          currentBarcodes.push(barcode);
          barcodesByProduct.set(row.product_id, currentBarcodes);
        }
      }
    }
  } catch (error) {
    return (
      <ErrorBox>
        <p className="font-semibold">تعذر تحميل وحدات أو باركودات المنتجات</p>
        <p className="mt-2">
          {error instanceof Error ? error.message : "حدث خطأ غير متوقع."}
        </p>
      </ErrorBox>
    );
  }

  const inventory: InventoryRow[] = companyInventory.map((item) => ({
    ...item,
    unit_name: unitNameByProduct.get(item.product_id) ?? UNKNOWN_UNIT,
    barcodes: barcodesByProduct.get(item.product_id) ?? [],
  }));

  const totalRows = inventory.length;
  const totalProducts = new Set(inventory.map((item) => item.product_id)).size;
  const availableTotals = sumByUnit(inventory, "available_quantity");
  const reservedTotals = sumByUnit(inventory, "reserved_quantity");
  const lowStockCount = inventory.filter((item) => {
    const available = Number(item.available_quantity ?? 0);
    const minimum = Number(item.minimum_quantity ?? 0);

    return available > 0 && minimum > 0 && available <= minimum;
  }).length;
  const outOfStockCount = inventory.filter(
    (item) => Number(item.available_quantity ?? 0) <= 0
  ).length;

  const locationMap = new Map<string, Location>();

  for (const item of inventory) {
    if (item.locations && !locationMap.has(item.locations.id)) {
      locationMap.set(item.locations.id, {
        id: item.locations.id,
        name: item.locations.name,
        code: item.locations.code,
      });
    }
  }

  const locations = Array.from(locationMap.values());

  return (
    <DashboardLayout>
      <div dir="rtl" className="mx-auto w-full max-w-[1600px] space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
                <Boxes size={16} />
                <span>إدارة المخزون</span>
                <span>/</span>
                <span>أرصدة المخزون</span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                أرصدة المخزون
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                متابعة الكميات حسب المنتج والوحدة والموقع.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-500 shadow-sm">
              <Warehouse size={17} className="text-teal-600" />
              <span dir="ltr" className="font-mono tabular-nums text-slate-700">{formatInventoryNumber(locations.length)}</span>
              <span>مواقع</span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={<Boxes size={19} />}
            label="المنتجات"
            value={<MetricNumber value={totalProducts} />}
            description={`${formatInventoryNumber(totalRows)} رصيد`}
          />

          <StatCard
            icon={<Package size={19} />}
            label="إجمالي المتاح"
            value={<UnitTotalsList totals={availableTotals} />}
            description="المجموع مفصول حسب الوحدة"
          />

          <StatCard
            icon={<Warehouse size={19} />}
            label="إجمالي المحجوز"
            value={<UnitTotalsList totals={reservedTotals} />}
            description="المجموع مفصول حسب الوحدة"
          />

          <StatCard
            icon={<AlertTriangle size={19} />}
            label="تنبيهات المخزون"
            value={<MetricNumber value={lowStockCount + outOfStockCount} danger={lowStockCount + outOfStockCount > 0} />}
            description={`${formatInventoryNumber(outOfStockCount)} نافد · ${formatInventoryNumber(lowStockCount)} منخفض`}
            danger={lowStockCount + outOfStockCount > 0}
          />
        </div>

        <InventoryTable
          inventory={inventory}
          locations={locations}
          canViewAllLocations={isAdmin}
        />
      </div>
    </DashboardLayout>
  );
}

function MetricNumber({ value, danger = false }: { value: number; danger?: boolean }) {
  return (
    <p
      dir="ltr"
      className={`font-mono text-2xl font-bold leading-none tabular-nums sm:text-3xl ${
        danger ? "text-red-600" : "text-slate-900"
      }`}
    >
      {formatInventoryNumber(value)}
    </p>
  );
}

function UnitTotalsList({
  totals,
  muted = false,
}: {
  totals: UnitTotals;
  muted?: boolean;
}) {
  const entries = Array.from(totals.entries()).sort(([, left], [, right]) => right - left);

  if (entries.length === 0) {
    return <MetricNumber value={0} />;
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {entries.map(([unitName, quantity]) => (
        <div
          key={unitName}
          className={
            muted
              ? "min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2"
              : "min-w-0 rounded-xl border border-teal-100 bg-teal-50/70 px-2.5 py-2"
          }
        >
          <span
            dir="rtl"
            className={muted ? "block truncate text-[10px] font-semibold text-slate-500" : "block truncate text-[10px] font-semibold text-teal-700"}
          >
            {unitName}
          </span>
          <span dir="ltr" className="mt-0.5 block font-mono text-sm font-bold tabular-nums text-slate-800">
            {formatInventoryNumber(quantity)}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  description,
  danger = false,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  description: string;
  danger?: boolean;
}) {
  return (
    <section className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      <div
        className={`pointer-events-none absolute -left-10 -top-10 h-28 w-28 rounded-full blur-3xl ${
          danger ? "bg-red-100/80" : "bg-teal-100/80"
        }`}
      />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-slate-500">{label}</p>
          <div className="mt-3">{value}</div>
          <p className="mt-3 text-[11px] leading-5 text-slate-400">{description}</p>
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-8 ${
            danger
              ? "bg-red-50 text-red-600 ring-red-50/80"
              : "bg-teal-50 text-teal-600 ring-teal-50/80"
          }`}
        >
          {icon}
        </div>
      </div>
    </section>
  );
}
