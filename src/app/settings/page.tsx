import {
  Settings,
  Save,
  ShieldCheck,
  PackageCheck,
  Languages,
  Clock3,
} from "lucide-react";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { createClient } from "@/lib/supabase/server";
import SettingsForm from "./SettingsForm";

type SettingsRow = {
  id: string;
  company_id: string | null;
  require_transfer_approval: boolean | null;
  allow_negative_stock: boolean | null;
  default_language: string | null;
  timezone: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export default async function SettingsPage() {
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
  // ملف المستخدم الحالي
  // ============================================================

  const {
    data: currentUser,
    error: currentUserError,
  } = await supabase
    .from("users")
    .select("id, company_id, is_active")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (currentUserError || !currentUser) {
    return (
      <DashboardLayout>
        <div
          dir="rtl"
          className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700"
        >
          لم يتم العثور على المستخدم الحالي.
        </div>
      </DashboardLayout>
    );
  }

  // ============================================================
  // صلاحية عرض الإعدادات
  // ============================================================

  const {
    data: canViewSettings,
    error: viewPermissionError,
  } = await supabase.rpc("has_permission", {
    permission_code: "settings.view",
  });

  if (
    viewPermissionError ||
    canViewSettings !== true
  ) {
    return (
      <DashboardLayout>
        <div
          dir="rtl"
          className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-700"
        >
          ليس لديك صلاحية عرض الإعدادات العامة.
        </div>
      </DashboardLayout>
    );
  }

  // ============================================================
  // صلاحية تعديل الإعدادات
  // ============================================================

  const {
    data: canUpdateSettings,
  } = await supabase.rpc("has_permission", {
    permission_code: "settings.update",
  });

  // ============================================================
  // إعدادات الشركة
  // ============================================================

  const {
    data: settings,
    error: settingsError,
  } = await supabase
    .from("settings")
    .select(`
      id,
      company_id,
      require_transfer_approval,
      allow_negative_stock,
      default_language,
      timezone,
      created_at,
      updated_at
    `)
    .eq("company_id", currentUser.company_id)
    .maybeSingle();

  if (settingsError) {
    return (
      <DashboardLayout>
        <div
          dir="rtl"
          className="space-y-5"
        >
          <div>
            <div className="mb-2 text-sm text-slate-400">
              الإدارة / الإعدادات العامة
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              الإعدادات العامة
            </h1>
          </div>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            <p className="font-semibold">
              تعذر تحميل إعدادات النظام.
            </p>

            <p className="mt-2 text-xs">
              {settingsError.message}
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const settingsData =
    (settings as SettingsRow | null) ?? {
      id: "",
      company_id: currentUser.company_id,
      require_transfer_approval: true,
      allow_negative_stock: false,
      default_language: "ar",
      timezone: "Asia/Riyadh",
      created_at: null,
      updated_at: null,
    };

  return (
    <DashboardLayout>
      <div
        dir="rtl"
        className="mx-auto w-full max-w-[1200px] space-y-7"
      >
        {/* ======================================================
            رأس الصفحة
        ======================================================= */}

        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
            <Settings size={16} />

            <span>الإدارة</span>

            <span>/</span>

            <span className="text-slate-500">
              الإعدادات العامة
            </span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            الإعدادات العامة
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            إدارة إعدادات النظام الأساسية وسياسات المخزون والنقل.
          </p>
        </div>

        {/* ======================================================
            معلومات مختصرة
        ======================================================= */}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCard
            icon={<ShieldCheck size={20} />}
            title="سياسة النقل"
            value={
              settingsData.require_transfer_approval
                ? "تحتاج موافقة"
                : "بدون موافقة"
            }
          />

          <InfoCard
            icon={<PackageCheck size={20} />}
            title="المخزون السالب"
            value={
              settingsData.allow_negative_stock
                ? "مسموح"
                : "غير مسموح"
            }
          />

          <InfoCard
            icon={<Languages size={20} />}
            title="اللغة"
            value={
              settingsData.default_language === "ar"
                ? "العربية"
                : "English"
            }
          />

          <InfoCard
            icon={<Clock3 size={20} />}
            title="المنطقة الزمنية"
            value={
              settingsData.timezone ??
              "Asia/Riyadh"
            }
          />
        </div>

        {/* ======================================================
            إعدادات النظام
        ======================================================= */}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                <Settings size={21} />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  إعدادات النظام
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  التحكم في السلوك العام لنظام إدارة المخزون.
                </p>
              </div>
            </div>
          </div>

          <SettingsForm
            settings={settingsData}
            canUpdate={canUpdateSettings === true}
          />
        </section>
      </div>
    </DashboardLayout>
  );
}

function InfoCard({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/60">
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-teal-100/50 blur-2xl opacity-0 transition group-hover:opacity-100" />

      <div className="relative flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-400">
            {title}
          </p>

          <p className="mt-2 text-sm font-bold text-slate-800">
            {value}
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition group-hover:bg-teal-50 group-hover:text-teal-600">
          {icon}
        </div>
      </div>
    </div>
  );
}
