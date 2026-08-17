import DashboardLayout from "@/components/layout/DashboardLayout";
import { createClient } from "@/lib/supabase/server";
import SupplierTable from "./SupplierTable";

export default async function SuppliersPage() {
  const supabase = await createClient();

  const { data: suppliers, error } =
    await supabase
      .from("suppliers")
      .select(`
        id,
        name,
        phone,
        email,
        address,
        contact_person,
        is_active,
        created_at,
        updated_at
      `)
      .order("created_at", {
        ascending: false,
      });

  return (
    <DashboardLayout>
      <div
        dir="rtl"
        className="space-y-6"
      >
        {/* العنوان */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            الموردون
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            إدارة الموردين وبيانات التواصل الخاصة بهم.
          </p>
        </div>

        {/* الخطأ */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            حدث خطأ أثناء تحميل الموردين:
            <span className="mr-1 font-medium">
              {error.message}
            </span>
          </div>
        )}

        <SupplierTable
          suppliers={suppliers ?? []}
        />
      </div>
    </DashboardLayout>
  );
}