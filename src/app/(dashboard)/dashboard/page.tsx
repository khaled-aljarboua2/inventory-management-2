import DashboardLayout from "@/components/layout/DashboardLayout";
import StatsGrid from "@/components/dashboard/StatsGrid";

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div
        dir="rtl"
        className="mx-auto w-full max-w-[1600px] space-y-8"
      >
        {/* =====================================================
            Header
        ====================================================== */}

        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-6 py-7 shadow-sm sm:px-8">
          {/* Glow */}
          <div className="pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-blue-100/50 blur-3xl" />

          <div className="pointer-events-none absolute -bottom-20 right-1/3 h-40 w-40 rounded-full bg-indigo-100/40 blur-3xl" />

          <div className="relative">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              نظام إدارة المخزون
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              لوحة التحكم
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              نظرة سريعة على المنتجات والفروع والمستودعات
              وحالة المخزون في النظام.
            </p>
          </div>
        </div>

        {/* =====================================================
            Statistics
        ====================================================== */}

        <StatsGrid />
      </div>
    </DashboardLayout>
  );
}