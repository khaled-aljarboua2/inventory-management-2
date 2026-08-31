import type { ReactNode } from "react";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { createClient } from "@/lib/supabase/server";
import { AlertTriangle, Boxes, Package, Warehouse } from "lucide-react";

import InventoryTable from "./InventoryTable";

type Location = {
  id: string;
  name: string;
  code: string;
};

type Summary = {
  totalRows: number;
  totalProducts: number;
  outOfStockCount: number;
  lowStockCount: number;
  availableTotals: Record<string, number>;
  reservedTotals: Record<string, number>;
};

function formatInventoryNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

function ErrorBox({ children }: { children: ReactNode }) {
  return (
    <DashboardLayout>
      <div dir="rtl" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {children}
      </div>
    </DashboardLayout>
  );
}

export default async function InventoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <ErrorBox>يجب تسجيل الدخول أولًا.</ErrorBox>;

  const { data: dbUser, error: userError } = await supabase
    .from("users")
    .select("company_id, location_id, is_active")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (userError || !dbUser?.company_id) {
    return <ErrorBox>لم يتم العثور على المستخدم في النظام.</ErrorBox>;
  }

  const { data: hasFullAccess, error: fullAccessError } = await supabase.rpc(
    "has_full_location_access"
  );

  if (fullAccessError) return <ErrorBox>تعذر تحديد صلاحية المستخدم.</ErrorBox>;

  const canViewAllLocations = hasFullAccess === true;
  const currentLocationId = dbUser.location_id ?? null;

  if (!canViewAllLocations && !currentLocationId) {
    return <ErrorBox>المستخدم غير مرتبط بموقع.</ErrorBox>;
  }

  let locationsQuery = supabase
    .from("locations")
    .select("id, name, code")
    .eq("company_id", dbUser.company_id)
    .eq("is_active", true)
    .order("name");

  if (!canViewAllLocations && currentLocationId) {
    locationsQuery = locationsQuery.eq("id", currentLocationId);
  }

  const [{ data: locations, error: locationsError }, { data: summaryData, error: summaryError }] =
    await Promise.all([
      locationsQuery,
      supabase.rpc("get_inventory_summary_v1", {
        p_company_id: dbUser.company_id,
        p_location_id: canViewAllLocations ? null : currentLocationId,
      }),
    ]);

  if (locationsError || summaryError) {
    return (
      <ErrorBox>
        {locationsError?.message ?? summaryError?.message ?? "تعذر تحميل بيانات المخزون."}
      </ErrorBox>
    );
  }

  const rawSummary = (summaryData ?? {}) as Partial<Summary>;
  const summary: Summary = {
    totalRows: Number(rawSummary.totalRows ?? 0),
    totalProducts: Number(rawSummary.totalProducts ?? 0),
    outOfStockCount: Number(rawSummary.outOfStockCount ?? 0),
    lowStockCount: Number(rawSummary.lowStockCount ?? 0),
    availableTotals: rawSummary.availableTotals ?? {},
    reservedTotals: rawSummary.reservedTotals ?? {},
  };

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
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">أرصدة المخزون</h1>
              <p className="mt-2 text-sm text-slate-500">متابعة الكميات حسب المنتج والوحدة والموقع.</p>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-500 shadow-sm">
              <Warehouse size={17} className="text-teal-600" />
              <span dir="ltr" className="font-mono tabular-nums text-slate-700">
                {formatInventoryNumber((locations ?? []).length)}
              </span>
              <span>مواقع</span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={<Boxes size={19} />}
            label="المنتجات"
            value={<MetricNumber value={summary.totalProducts} />}
            description={`${formatInventoryNumber(summary.totalRows)} رصيد`}
          />
          <StatCard
            icon={<Package size={19} />}
            label="إجمالي المتاح"
            value={<UnitTotalsList totals={summary.availableTotals} />}
            description="المجموع مفصول حسب الوحدة"
          />
          <StatCard
            icon={<Warehouse size={19} />}
            label="إجمالي المحجوز"
            value={<UnitTotalsList totals={summary.reservedTotals} muted />}
            description="المجموع مفصول حسب الوحدة"
          />
          <StatCard
            icon={<AlertTriangle size={19} />}
            label="تنبيهات المخزون"
            value={<MetricNumber value={summary.lowStockCount + summary.outOfStockCount} danger={summary.lowStockCount + summary.outOfStockCount > 0} />}
            description={`${formatInventoryNumber(summary.outOfStockCount)} نافد · ${formatInventoryNumber(summary.lowStockCount)} منخفض`}
            danger={summary.lowStockCount + summary.outOfStockCount > 0}
          />
        </div>

        <InventoryTable
          locations={(locations ?? []) as Location[]}
          canViewAllLocations={canViewAllLocations}
        />
      </div>
    </DashboardLayout>
  );
}

function MetricNumber({ value, danger = false }: { value: number; danger?: boolean }) {
  return (
    <p dir="ltr" className={`font-mono text-2xl font-bold leading-none tabular-nums sm:text-3xl ${danger ? "text-red-600" : "text-slate-900"}`}>
      {formatInventoryNumber(value)}
    </p>
  );
}

function UnitTotalsList({ totals, muted = false }: { totals: Record<string, number>; muted?: boolean }) {
  const entries = Object.entries(totals).sort(([, left], [, right]) => Number(right) - Number(left));
  if (entries.length === 0) return <MetricNumber value={0} />;

  return (
    <div className="grid grid-cols-2 gap-2">
      {entries.map(([unitName, quantity]) => (
        <div key={unitName} className={muted ? "min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2" : "min-w-0 rounded-xl border border-teal-100 bg-teal-50/70 px-2.5 py-2"}>
          <span className={muted ? "block truncate text-[10px] font-semibold text-slate-500" : "block truncate text-[10px] font-semibold text-teal-700"}>{unitName}</span>
          <span dir="ltr" className="mt-0.5 block font-mono text-sm font-bold tabular-nums text-slate-800">{formatInventoryNumber(Number(quantity))}</span>
        </div>
      ))}
    </div>
  );
}

function StatCard({ icon, label, value, description, danger = false }: { icon: ReactNode; label: string; value: ReactNode; description: string; danger?: boolean }) {
  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-sm ${danger ? "border-red-200" : "border-slate-200"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <div className="mt-3">{value}</div>
          <p className="mt-2 text-xs text-slate-400">{description}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${danger ? "bg-red-50 text-red-600" : "bg-teal-50 text-teal-600"}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
