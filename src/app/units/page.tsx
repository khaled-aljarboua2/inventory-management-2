import {
  Ruler,
  Plus,
  Layers3,
  CheckCircle2,
} from "lucide-react";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { createClient } from "@/lib/supabase/server";
import UnitsTable from "./UnitsTable";

export default async function UnitsPage() {
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
  // صلاحية عرض الوحدات
  // ============================================================

  const {
    data: canViewProducts,
    error: viewPermissionError,
  } = await supabase.rpc(
    "has_permission",
    {
      permission_code: "products.view",
    }
  );

  if (
    viewPermissionError ||
    canViewProducts !== true
  ) {
    return (
      <DashboardLayout>
        <div
          dir="rtl"
          className="mx-auto w-full max-w-[1600px]"
        >
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <h1 className="text-lg font-bold text-amber-800">
              ليس لديك صلاحية الوصول
            </h1>

            <p className="mt-2 text-sm text-amber-700">
              لا تملك الصلاحية اللازمة لعرض وحدات القياس.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ============================================================
  // صلاحية إضافة الوحدات
  // ============================================================

  const {
    data: canCreateProducts,
    error: createPermissionError,
  } = await supabase.rpc(
    "has_permission",
    {
      permission_code: "products.create",
    }
  );

  const canCreateUnits =
    !createPermissionError &&
    canCreateProducts === true;

  // ============================================================
  // تحميل الوحدات
  // ============================================================

  const {
    data: units,
    error,
  } = await supabase
    .from("units")
    .select("id, name, symbol")
    .order("name");

  const unitList = units ?? [];
  const totalUnits = unitList.length;

  return (
    <DashboardLayout>
      <div
        dir="rtl"
        className="mx-auto w-full max-w-[1600px] space-y-7"
      >
        {/* =========================
            رأس الصفحة
        ========================== */}

        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
              <Layers3 size={16} />

              <span>إدارة المخزون</span>

              <span>/</span>

              <span className="text-slate-500">
                المنتجات
              </span>

              <span>/</span>

              <span className="text-slate-500">
                الوحدات
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              وحدات القياس
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              إدارة وحدات القياس المستخدمة في المنتجات
              ومعاملات التحويل.
            </p>
          </div>

          {/* إضافة وحدة */}
          {canCreateUnits && (
            <a
              href="#units-table"
              className="group inline-flex items-center justify-center gap-2 self-start rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-teal-200 transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-700 hover:shadow-md hover:shadow-teal-200"
            >
              <Plus
                size={18}
                className="transition-transform duration-200 group-hover:rotate-90"
              />

              <span>إضافة وحدة</span>
            </a>
          )}
        </div>

        {/* =========================
            الخطأ
        ========================== */}

        {error && (
          <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100">
              !
            </span>

            <span>
              حدث خطأ أثناء تحميل الوحدات.
            </span>
          </div>
        )}

        {/* =========================
            الإحصائيات
        ========================== */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* إجمالي الوحدات */}

          <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/60">
            <div className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-teal-100/60 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />

            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  إجمالي الوحدات
                </p>

                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                  {totalUnits}
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  وحدات قياس مسجلة
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-600 transition-all duration-300 group-hover:scale-110 group-hover:rotate-2">
                <Ruler
                  size={23}
                  strokeWidth={1.9}
                />
              </div>
            </div>
          </div>

          {/* حالة النظام */}

          <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/60">
            <div className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-emerald-100/60 blur-2xl" />

            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  حالة الوحدات
                </p>

                <p className="mt-2 text-xl font-bold text-slate-900">
                  جاهزة للاستخدام
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  يمكن ربطها بالمنتجات
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-all duration-300 group-hover:scale-110">
                <CheckCircle2
                  size={23}
                  strokeWidth={1.9}
                />
              </div>
            </div>
          </div>
        </div>

        {/* =========================
            جدول الوحدات
        ========================== */}

        <section
          id="units-table"
          className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  وحدات القياس
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  إضافة وإدارة وحدات القياس المستخدمة
                  في المنتجات.
                </p>
              </div>

              <div className="hidden items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500 sm:flex">
                <Ruler size={15} />

                <span>
                  {totalUnits} وحدة
                </span>
              </div>
            </div>
          </div>

          <UnitsTable
            units={unitList}
          />
        </section>
      </div>
    </DashboardLayout>
  );
}