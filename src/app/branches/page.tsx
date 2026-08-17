import DashboardLayout from "@/components/layout/DashboardLayout";
import { createClient } from "@/lib/supabase/server";
import BranchesList from "./BranchesList";

export default async function BranchesPage() {
  const supabase = await createClient();

  const { data: branches, error } =
    await supabase
      .from("locations")
      .select(`
        id,
        name,
        code,
        city,
        address,
        is_active,
        created_at
      `)
      .eq("type", "branch")
      .order("created_at", {
        ascending: false,
      });

  return (
    <DashboardLayout>
      <div
        dir="rtl"
        className="mx-auto w-full max-w-[1600px] space-y-7"
      >
        <div>
          <div className="mb-2 text-sm text-slate-400">
            إدارة المخزون / الفروع
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            الفروع
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            إدارة فروع الشركة ومواقعها التشغيلية.
          </p>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            حدث خطأ أثناء تحميل الفروع.
          </div>
        )}

        <BranchesList
          branches={branches ?? []}
        />
      </div>
    </DashboardLayout>
  );
}
