import DashboardLayout from "@/components/layout/DashboardLayout";
import { createClient } from "@/lib/supabase/server";
import StockCountTable from "./StockCountTable";

type StockCount = {
  id: string;
  location_id: string;
  created_by: string;
  status: string;
  notes: string | null;
  created_at: string;
  completed_at: string | null;

  locations:
    | {
        id: string;
        name: string;
        code: string;
      }
    | null;
};

type Location = {
  id: string;
  name: string;
  code: string;
};

export default async function StockCountsPage() {
  const supabase = await createClient();

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

  const {
    data: dbUser,
    error: userError,
  } = await supabase
    .from("users")
    .select(
      "id, company_id, is_active"
    )
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (userError || !dbUser) {
    return (
      <DashboardLayout>
        <div
          dir="rtl"
          className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700"
        >
          لم يتم العثور على المستخدم في النظام.
        </div>
      </DashboardLayout>
    );
  }

  const [
    {
      data: counts,
      error: countsError,
    },
    {
      data: locations,
      error: locationsError,
    },
  ] = await Promise.all([
    supabase
      .from("stock_counts")
      .select(`
        id,
        location_id,
        created_by,
        status,
        notes,
        created_at,
        completed_at,

        locations (
          id,
          name,
          code
        )
      `)
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from("locations")
      .select(
        "id, name, code"
      )
      .eq(
        "company_id",
        dbUser.company_id
      )
      .eq("is_active", true)
      .order("name"),
  ]);

  if (
    countsError ||
    locationsError
  ) {
    return (
      <DashboardLayout>
        <div
          dir="rtl"
          className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700"
        >
          تعذر تحميل بيانات الجرد.
        </div>
      </DashboardLayout>
    );
  }

  const companyCounts: StockCount[] =
    (counts ?? []).filter(
      (count: any) =>
        count.locations
    );

  return (
    <DashboardLayout>
      <div
        dir="rtl"
        className="mx-auto w-full max-w-[1600px] space-y-7"
      >
        <div>
          <p className="text-sm text-slate-400">
            إدارة المخزون / الجرد
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            جرد المخزون
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            إنشاء عمليات الجرد ومقارنة الكميات الفعلية
            مع أرصدة النظام.
          </p>
        </div>

        <StockCountTable
          counts={companyCounts}
          locations={
            locations ?? []
          }
        />
      </div>
    </DashboardLayout>
  );
}