import type { ReactNode } from "react";

import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Boxes,
  ClipboardList,
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
function ErrorBox({ children }: { children: ReactNode }) {
  return (
    <DashboardLayout>
      <div dir="rtl" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {children}
      </div>
    </DashboardLayout>
  );
}

function addTotal(totals: UnitTotals, unitName: string, quantity: number) {
  totals.set(unitName, (totals.get(unitName) ?? 0) + quantity);
}

function UnitTotalsList({ totals, muted = false }: { totals: UnitTotals; muted?: boolean }) {
  const entries = Array.from(totals.entries()).sort(([, left], [, right]) => right - left);

  if (entries.length === 0) {
    return <p dir="ltr" className="font-mono text-2xl font-bold tabular-nums text-slate-900">0</p>;
  }

  return (
    <div className="space-y-2">
      {entries.map(([unitName, quantity]) => (
        <div
          key={unitName}
          className={
            muted
              ? "flex items-center justify-between gap-3 rounded-xl bg-slate-100 px-3 py-2"
              : "flex items-center justify-between gap-3 rounded-xl bg-teal-50 px-3 py-2"
          }
        >
          <span className={muted ? "text-xs font-semibold text-slate-600" : "text-xs font-semibold text-teal-700"}>
            {unitName}
          </span>
          <span dir="ltr" className="font-mono text-sm font-bold tabular-nums text-slate-800">
            {formatReportNumber(quantity)}
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
  value: number;
  description: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            danger ? "bg-red-50 text-red-600" : "bg-teal-50 text-teal-600"
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p dir="ltr" className={`mt-2 font-mono text-2xl font-bold leading-none tabular-nums ${
            danger ? "text-red-600" : "text-slate-900"
          }`}>
            {formatReportNumber(value)}
          </p>
          <p className="mt-2 text-[11px] text-slate-400">{description}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="px-5 py-12 text-center text-sm text-slate-400">{message}</p>;
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
      .sort((left, right) => Number(left.available_quantity ?? 0) - Number(right.available_quantity ?? 0));

    for (const balance of balances) {
      if (hasPositiveBalance(balance)) {
        productIds.add(balance.product_id);
      }
      addTotal(availableTotals, balance.unitName, Number(balance.available_quantity ?? 0));
      addTotal(reservedTotals, balance.unitName, Number(balance.reserved_quantity ?? 0));
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
    const highestMovementCount = movementTypes[0]?.count ?? 1;

  return (
      <DashboardLayout>
        <div dir="rtl" className="mx-auto w-full max-w-[1600px] space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
                  <BarChart3 size={16} className="text-teal-600" />
                  <span>إدارة المخزون</span>
                  <span>/</span>
                  <span>التقارير</span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">التقارير</h1>
                <p className="mt-2 text-sm text-slate-500">
                  متابعة عملية للأرصدة والتنبيهات وحركة آخر 30 يومًا.
                </p>
              </div>
              <ReportLocationSelector
                locations={locations}
                selectedLocationId={requestedLocation.id}
                canChooseLocation={session.access.isAdmin && locations.length > 1}
              />
            </div>
          </section>

          <ReportExportPanel locationId={requestedLocation.id} locationName={requestedLocation.name} />

          <section className="space-y-4 rounded-2xl border border-teal-100 bg-teal-50/40 p-4 sm:p-5">
            <div>
              <h2 className="font-bold text-slate-900">استيراد وتسوية المخزون</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                عند استيراد ورقة المخزون تُقارن الكمية الواردة بالرصيد الحالي، ثم يُسجل فرق الزيادة أو النقصان كتسوية في قاعدة البيانات.
              </p>
            </div>

            <ProductImportExport
              key={requestedLocation.id}
              showExport={false}
              locations={locations}
              selectedLocationId={requestedLocation.id}
            />

          </section>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard
              icon={<Package size={19} />}
              label="منتجات لها رصيد"
              value={productIds.size}
              description="منتجات ظاهرة ضمن صلاحياتك"
            />
            <StatCard
              icon={<Boxes size={19} />}
              label="سجلات الرصيد"
              value={balances.length}
              description="منتج × موقع"
            />
            <StatCard
              icon={<AlertTriangle size={19} />}
              label="تنبيهات المخزون"
              value={lowStock.length}
              description="عند الحد الأدنى أو أقل"
              danger={lowStock.length > 0}
            />
            <StatCard
              icon={<Activity size={19} />}
              label="حركات 30 يومًا"
              value={transactions.length}
              description="كل أنواع الحركات"
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="font-bold text-slate-900">الرصيد حسب الوحدة</h2>
                <p className="mt-1 text-xs text-slate-400">لا يتم دمج وحدات قياس مختلفة في رقم واحد.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-semibold text-teal-700">المتاح</p>
                  <UnitTotalsList totals={availableTotals} />
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold text-slate-600">المحجوز</p>
                  <UnitTotalsList totals={reservedTotals} muted />
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="font-bold text-slate-900">توزيع حركة المخزون</h2>
                <p className="mt-1 text-xs text-slate-400">عدد الحركات حسب النوع خلال آخر 30 يومًا.</p>
              </div>
              {movementTypes.length === 0 ? (
                <EmptyState message="لا توجد حركات خلال الفترة المحددة." />
              ) : (
                <div className="space-y-4 p-5">
                  {movementTypes.map((movement) => (
                    <div key={movement.label}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">{movement.label}</span>
                        <span dir="ltr" className="font-mono tabular-nums text-slate-500">{formatReportNumber(movement.count)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-teal-500"
                          style={{ width: `${(movement.count / highestMovementCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="font-bold text-slate-900">تنبيهات المخزون</h2>
                  <p className="mt-1 text-xs text-slate-400">أقل المنتجات مقارنة بالحد الأدنى.</p>
                </div>
                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                  {formatReportNumber(lowStock.length)}
                </span>
              </div>
              {lowStock.length === 0 ? (
                <EmptyState message="لا توجد تنبيهات حاليًا." />
              ) : (
                <div className="divide-y divide-slate-100">
                  {lowStock.slice(0, 8).map((balance) => (
                    <div key={balance.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{balance.products?.name ?? "منتج غير متاح"}</p>
                        <p className="mt-1 text-xs text-slate-400">{balance.products?.sku ?? "—"} · {balance.locations?.name ?? "—"}</p>
                      </div>
                      <div className="shrink-0 text-left">
                        <p dir="ltr" className="font-mono text-sm font-bold tabular-nums text-red-600">
                          {formatReportNumber(Number(balance.available_quantity ?? 0))}
                          <span dir="rtl" className="mr-1 rounded-md bg-red-50 px-1.5 py-0.5 font-sans text-[10px]">{balance.unitName}</span>
                        </p>
                        <p className="mt-1 text-xs text-slate-400">الحد {formatReportNumber(Number(balance.minimum_quantity ?? 0))}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="font-bold text-slate-900">أحدث الحركات</h2>
                  <p className="mt-1 text-xs text-slate-400">آخر 8 حركات مسجلة ضمن صلاحياتك.</p>
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
                      <div key={transaction.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">{transaction.products?.name ?? "منتج غير متاح"}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {TRANSACTION_LABELS[transaction.transaction_type] ?? transaction.transaction_type} · {formatReportDate(transaction.created_at)}
                          </p>
                        </div>
                        <span dir="ltr" className={`shrink-0 font-mono text-sm font-bold tabular-nums ${
                          quantity < 0 ? "text-red-600" : "text-teal-700"
                        }`}>
                          {quantity > 0 ? "+" : ""}{formatReportNumber(quantity)}
                          <span dir="rtl" className="mr-1 rounded-md bg-slate-100 px-1.5 py-0.5 font-sans text-[10px] text-slate-600">{transaction.unitName}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </DashboardLayout>
  );
}
