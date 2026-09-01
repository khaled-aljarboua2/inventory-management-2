import type { ReactNode } from "react";

import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Boxes,
  ClipboardList,
  MapPin,
  Package,
} from "lucide-react";

import ReportExportPanel from "./ReportExportPanel";
import ReportLocationSelector from "./ReportLocationSelector";
import ProductImportExport from "../products/ProductImportExport";
import {
  formatReportDate,
  formatReportNumber,
  hasPositiveBalance,
  isLowStockBalance,
  getReportAccess,
  resolveReportLocation,
  loadReportData,
  TRANSACTION_LABELS,
} from "@/lib/reports";

type UnitTotals = Map<string, number>;
type StatTone = "teal" | "blue" | "amber" | "red" | "slate";

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

function addTotal(totals: UnitTotals, unitName: string, quantity: number) {
  totals.set(unitName, (totals.get(unitName) ?? 0) + quantity);
}

function UnitTotalsGrid({
  totals,
  muted = false,
}: {
  totals: UnitTotals;
  muted?: boolean;
}) {
  const entries = Array.from(totals.entries()).sort(
    ([, left], [, right]) => right - left
  );

  if (entries.length === 0) {
    return (
      <p
        dir="ltr"
        className="font-mono text-2xl font-bold tabular-nums text-slate-900"
      >
        0
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {entries.map(([unitName, quantity]) => (
        <div
          key={unitName}
          className={
            muted
              ? "rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
              : "rounded-xl border border-teal-100 bg-teal-50/70 px-3 py-3"
          }
        >
          <p
            className={
              muted
                ? "text-[11px] font-semibold text-slate-500"
                : "text-[11px] font-semibold text-teal-700"
            }
          >
            {unitName}
          </p>
          <p
            dir="ltr"
            className="mt-1.5 font-mono text-base font-bold tabular-nums text-slate-900"
          >
            {formatReportNumber(quantity)}
          </p>
        </div>
      ))}
    </div>
  );
}

const STAT_TONES: Record<
  StatTone,
  { icon: string; value: string; border: string }
> = {
  teal: {
    icon: "bg-teal-50 text-teal-600",
    value: "text-slate-950",
    border: "border-r-teal-500",
  },
  blue: {
    icon: "bg-blue-50 text-blue-600",
    value: "text-slate-950",
    border: "border-r-blue-500",
  },
  amber: {
    icon: "bg-amber-50 text-amber-600",
    value: "text-amber-700",
    border: "border-r-amber-400",
  },
  red: {
    icon: "bg-red-50 text-red-600",
    value: "text-red-600",
    border: "border-r-red-500",
  },
  slate: {
    icon: "bg-slate-100 text-slate-600",
    value: "text-slate-950",
    border: "border-r-slate-400",
  },
};

function StatCard({
  icon,
  label,
  value,
  description,
  tone = "teal",
}: {
  icon: ReactNode;
  label: string;
  value: number;
  description: string;
  tone?: StatTone;
}) {
  const styles = STAT_TONES[tone];

  return (
    <div
      className={`rounded-2xl border border-slate-200 border-r-4 bg-white p-4 shadow-sm ${styles.border}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <p
            dir="ltr"
            className={`mt-3 font-mono text-2xl font-bold leading-none tabular-nums ${styles.value}`}
          >
            {formatReportNumber(value)}
          </p>
          <p className="mt-2 truncate text-[11px] text-slate-400">
            {description}
          </p>
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="px-5 py-12 text-center text-sm text-slate-400">{message}</p>
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string }>;
}) {
  const session = await getReportAccess();

  if (session.error || !session.supabase || !session.access) {
    return <ErrorBox>{session.error ?? "تعذر تحميل التقارير."}</ErrorBox>;
  }

  const { location: requestedLocation, locations } = await resolveReportLocation(
    session.supabase,
    session.access,
    (await searchParams).location
  );

  if (!requestedLocation) {
    return <ErrorBox>لا يوجد فرع نشط متاح لعرض تقريره.</ErrorBox>;
  }

  const reportResult = await loadReportData(session.supabase, session.access, {
    locationId: requestedLocation.id,
  })
    .then((data) => ({ data, error: null }))
    .catch((error: unknown) => ({ data: null, error }));

  if (reportResult.error || !reportResult.data) {
    return (
      <ErrorBox>
        <p className="font-semibold">تعذر تحميل بيانات التقارير.</p>
        <p className="mt-2">
          {reportResult.error instanceof Error
            ? reportResult.error.message
            : "حدث خطأ غير متوقع."}
        </p>
      </ErrorBox>
    );
  }

  const { balances, transactions } = reportResult.data;
  const availableTotals = new Map<string, number>();
  const reservedTotals = new Map<string, number>();
  const productIds = new Set<string>();
  const lowStock = balances
    .filter(isLowStockBalance)
    .sort(
      (left, right) =>
        Number(left.available_quantity ?? 0) -
        Number(right.available_quantity ?? 0)
    );

  for (const balance of balances) {
    if (hasPositiveBalance(balance)) {
      productIds.add(balance.product_id);
    }
    addTotal(
      availableTotals,
      balance.unitName,
      Number(balance.available_quantity ?? 0)
    );
    addTotal(
      reservedTotals,
      balance.unitName,
      Number(balance.reserved_quantity ?? 0)
    );
  }

  const movementCounts = new Map<string, number>();
  for (const transaction of transactions) {
    movementCounts.set(
      transaction.transaction_type,
      (movementCounts.get(transaction.transaction_type) ?? 0) + 1
    );
  }

  const movementTypes = Array.from(movementCounts.entries())
    .map(([type, count]) => ({
      label: TRANSACTION_LABELS[type] ?? type,
      count,
    }))
    .sort((left, right) => right.count - left.count);

  const movementTotal = Math.max(
    1,
    movementTypes.reduce((total, movement) => total + movement.count, 0)
  );

  return (
    <DashboardLayout>
      <div dir="rtl" className="mx-auto w-full max-w-[1680px] space-y-5">
        <header className="flex flex-col gap-4 px-1 sm:px-0 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
              <BarChart3 size={15} className="text-teal-600" />
              <span>إدارة المخزون</span>
              <span>/</span>
              <span>التقارير</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              التقارير
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              متابعة شاملة للأرصدة والتنبيهات وحركة المخزون خلال آخر 30 يومًا.
            </p>
          </div>

          <div className="w-full lg:w-auto lg:min-w-72">
            <ReportLocationSelector
              locations={locations}
              selectedLocationId={requestedLocation.id}
              canChooseLocation={session.access.isAdmin && locations.length > 1}
            />
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard
            icon={<MapPin size={19} />}
            label="المواقع"
            value={locations.length}
            description="مواقع متاحة ضمن صلاحياتك"
            tone="teal"
          />
          <StatCard
            icon={<Package size={19} />}
            label="منتجات لها رصيد"
            value={productIds.size}
            description={`في ${requestedLocation.name}`}
            tone="blue"
          />
          <StatCard
            icon={<Boxes size={19} />}
            label="سجلات الرصيد"
            value={balances.length}
            description="منتج × موقع"
            tone="slate"
          />
          <StatCard
            icon={<AlertTriangle size={19} />}
            label="تنبيهات المخزون"
            value={lowStock.length}
            description="عند الحد الأدنى أو أقل"
            tone={lowStock.length > 0 ? "red" : "teal"}
          />
          <StatCard
            icon={<Activity size={19} />}
            label="حركات 30 يومًا"
            value={transactions.length}
            description="كل أنواع الحركات"
            tone="amber"
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <ProductImportExport
            key={requestedLocation.id}
            showExport={false}
            locations={locations}
            selectedLocationId={requestedLocation.id}
          />

          <ReportExportPanel
            locationId={requestedLocation.id}
            locationName={requestedLocation.name}
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-900">إجمالي المتاح حسب الوحدة</h2>
                <p className="mt-1 text-xs text-slate-400">
                  الكميات المتاحة مفصولة حسب وحدة القياس.
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                <Boxes size={18} />
              </div>
            </div>
            <UnitTotalsGrid totals={availableTotals} />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-900">إجمالي المحجوز حسب الوحدة</h2>
                <p className="mt-1 text-xs text-slate-400">
                  الكميات المحجوزة دون دمج وحدات مختلفة.
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <ClipboardList size={18} />
              </div>
            </div>
            <UnitTotalsGrid totals={reservedTotals} muted />
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-bold text-slate-900">تنبيهات المخزون</h2>
                <p className="mt-1 text-xs text-slate-400">
                  أقل المنتجات مقارنة بالحد الأدنى.
                </p>
              </div>
              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600">
                {formatReportNumber(lowStock.length)}
              </span>
            </div>

            {lowStock.length === 0 ? (
              <EmptyState message="لا توجد تنبيهات حاليًا." />
            ) : (
              <div className="divide-y divide-slate-100">
                {lowStock.slice(0, 8).map((balance) => (
                  <div
                    key={balance.id}
                    className="grid gap-3 px-5 py-3.5 sm:grid-cols-[minmax(0,1.5fr)_minmax(120px,1fr)_110px] sm:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {balance.products?.name ?? "منتج غير متاح"}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-400">
                        {balance.products?.sku ?? "—"}
                      </p>
                    </div>

                    <p className="truncate text-xs font-medium text-slate-500">
                      {balance.locations?.name ?? "—"}
                    </p>

                    <div className="flex items-center justify-between gap-3 sm:block sm:text-left">
                      <span
                        dir="ltr"
                        className="font-mono text-sm font-bold tabular-nums text-red-600"
                      >
                        {formatReportNumber(
                          Number(balance.available_quantity ?? 0)
                        )}
                        <span
                          dir="rtl"
                          className="mr-1 font-sans text-[10px] text-slate-500"
                        >
                          {balance.unitName}
                        </span>
                      </span>
                      <p className="text-[10px] text-slate-400 sm:mt-1">
                        الحد {formatReportNumber(Number(balance.minimum_quantity ?? 0))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-bold text-slate-900">أحدث الحركات</h2>
                <p className="mt-1 text-xs text-slate-400">
                  آخر 8 حركات مسجلة ضمن صلاحياتك.
                </p>
              </div>
              <ClipboardList size={19} className="text-teal-600" />
            </div>

            {transactions.length === 0 ? (
              <EmptyState message="لا توجد حركات لعرضها." />
            ) : (
              <div className="divide-y divide-slate-100">
                {transactions.slice(0, 8).map((transaction) => {
                  const quantity = Number(transaction.quantity ?? 0);
                  return (
                    <div
                      key={transaction.id}
                      className="grid gap-3 px-5 py-3.5 sm:grid-cols-[minmax(0,1.5fr)_minmax(110px,1fr)_105px] sm:items-center"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {transaction.products?.name ?? "منتج غير متاح"}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {formatReportDate(transaction.created_at)}
                        </p>
                      </div>

                      <span className="w-fit rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                        {TRANSACTION_LABELS[transaction.transaction_type] ??
                          transaction.transaction_type}
                      </span>

                      <span
                        dir="ltr"
                        className={`font-mono text-sm font-bold tabular-nums sm:text-left ${
                          quantity < 0 ? "text-red-600" : "text-teal-700"
                        }`}
                      >
                        {quantity > 0 ? "+" : ""}
                        {formatReportNumber(quantity)}
                        <span
                          dir="rtl"
                          className="mr-1 font-sans text-[10px] text-slate-500"
                        >
                          {transaction.unitName}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-900">ملخص حركة المخزون</h2>
              <p className="mt-1 text-xs text-slate-400">
                توزيع الحركات حسب النوع خلال آخر 30 يومًا.
              </p>
            </div>
            <p className="text-xs text-slate-400">
              إجمالي الحركات: {formatReportNumber(transactions.length)}
            </p>
          </div>

          {movementTypes.length === 0 ? (
            <EmptyState message="لا توجد حركات خلال الفترة المحددة." />
          ) : (
            <>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
                {movementTypes.map((movement, index) => {
                  const tones = [
                    "bg-teal-500",
                    "bg-blue-500",
                    "bg-amber-400",
                    "bg-red-400",
                    "bg-violet-400",
                    "bg-slate-400",
                  ];
                  return (
                    <div
                      key={movement.label}
                      className={tones[index % tones.length]}
                      style={{
                        width: `${(movement.count / movementTotal) * 100}%`,
                      }}
                      title={`${movement.label}: ${movement.count}`}
                    />
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
                {movementTypes.map((movement, index) => {
                  const dots = [
                    "bg-teal-500",
                    "bg-blue-500",
                    "bg-amber-400",
                    "bg-red-400",
                    "bg-violet-400",
                    "bg-slate-400",
                  ];
                  return (
                    <div key={movement.label} className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          dots[index % dots.length]
                        }`}
                      />
                      <span className="text-xs text-slate-500">
                        {movement.label}
                      </span>
                      <span
                        dir="ltr"
                        className="font-mono text-xs font-bold tabular-nums text-slate-800"
                      >
                        {formatReportNumber(movement.count)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
