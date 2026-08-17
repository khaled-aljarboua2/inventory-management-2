import DashboardLayout from "@/components/layout/DashboardLayout";
import { createClient } from "@/lib/supabase/server";
import WarehousesList from "./WarehousesList";

export default async function WarehousesPage() {
  const supabase = await createClient();

  const { data: warehouses, error } = await supabase
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
    .eq("type", "warehouse")
    .order("created_at", {
      ascending: false,
    });

  return (
    <DashboardLayout>
      <div
        dir="rtl"
        className="mx-auto w-full max-w-[1600px] space-y-7"
      >
        {/* Header */}
        <div>
          <div className="mb-2 text-sm text-slate-400">
            إدارة المخزون / المستودعات
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            المستودعات
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            إدارة مستودعات الشركة ومواقع التخزين.
          </p>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            حدث خطأ أثناء تحميل المستودعات.
          </div>
        )}

        <WarehousesList
          warehouses={warehouses ?? []}
        />
      </div>
    </DashboardLayout>
  );
}
