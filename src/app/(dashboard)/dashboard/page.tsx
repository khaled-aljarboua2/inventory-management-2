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
            rounded-3xl
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
          <div className="flex items-center justify-between gap-6">
            <div className="min-w-0">
              <div
                className="
                  mb-3
                  inline-flex
                  items-center
                  gap-2
                  rounded-full
                  bg-teal-50
                  px-3
                  py-1.5
                  text-xs
                  font-semibold
                  text-teal-700
                "
              >
                <span className="h-1.5 w-1.5 rounded-full bg-teal-600" />
                WAREVANCE
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

              <p
                className="
                  mt-2
                  max-w-2xl
                  text-sm
                  leading-6
                  text-slate-500
                "
              >
                مرحبًا بك، هذه نظرة سريعة على المخزون
                وعمليات النقل والفروع.
              </p>
            </div>

            <div
              className="
                hidden
                h-14
                w-14
                shrink-0
                items-center
                justify-center
                rounded-2xl
                bg-teal-50
                text-teal-600
                lg:flex
              "
            >
              <span className="text-2xl">◉</span>
            </div>
          </div>
        </section>

        {/* =====================================================
            Dashboard
        ====================================================== */}

        <StatsGrid />
      </main>
    </DashboardLayout>
  );
}
