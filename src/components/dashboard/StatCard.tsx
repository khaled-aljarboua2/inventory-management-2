import DashboardLayout from "@/components/layout/DashboardLayout";
import StatsGrid from "@/components/dashboard/StatsGrid";

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <main
        dir="rtl"
        className="
          mx-auto
          w-full
          max-w-[1600px]
          space-y-6
          px-1
          sm:space-y-7
        "
      >
        {/* =====================================================
            Header
        ====================================================== */}

        <section
          className="
            rounded-2xl
            border
            border-slate-200
            bg-white
            px-5
            py-5
            shadow-sm
            sm:px-7
            sm:py-6
          "
        >
          <div className="flex items-center justify-between gap-5">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-600" />

                <span className="text-xs font-semibold text-blue-600">
                  نظام إدارة المخزون
                </span>
              </div>

              <h1
                className="
                  text-2xl
                  font-bold
                  tracking-tight
                  text-slate-950
                  sm:text-3xl
                "
              >
                لوحة التحكم
              </h1>

              <p className="mt-1.5 text-sm text-slate-500">
                نظرة سريعة على المخزون والعمليات في النظام.
              </p>
            </div>
          </div>
        </section>

        {/* =====================================================
            Statistics
        ====================================================== */}

        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                ملخص النظام
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                أهم مؤشرات المخزون الحالية
              </p>
            </div>
          </div>

          <StatsGrid />
        </section>
      </main>
    </DashboardLayout>
  );
}