import DashboardLayout from "@/components/layout/DashboardLayout";
import { createClient } from "@/lib/supabase/server";
import { SlidersHorizontal } from "lucide-react";

import StockAdjustmentForm from "./StockAdjustmentForm";

type Product = {
  id: string;
  sku: string;
  name: string;
};

type Location = {
  id: string;
  name: string;
  code: string;
};

const PAGE_SIZE = 1000;

function PageError({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout>
      <div dir="rtl" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {children}
      </div>
    </DashboardLayout>
  );
}

async function getAllProducts(supabase: Awaited<ReturnType<typeof createClient>>, companyId: string) {
  const products: Product[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select("id, sku, name")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("name")
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    const batch = (data ?? []) as Product[];
    products.push(...batch);

    if (batch.length < PAGE_SIZE) {
      return products;
    }

    from += PAGE_SIZE;
  }
}

export default async function StockAdjustmentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <PageError>يجب تسجيل الدخول أولًا.</PageError>;
  }

  const { data: dbUser, error: userError } = await supabase
    .from("users")
    .select("company_id, role_id, location_id")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (userError || !dbUser?.company_id) {
    return <PageError>تعذر العثور على الشركة المرتبطة بالمستخدم.</PageError>;
  }

  const [{ data: canAdjust, error: permissionError }, { data: role, error: roleError }] = await Promise.all([
    supabase.rpc("has_permission", { permission_code: "stock.adjust" }),
    supabase.from("roles").select("name").eq("id", dbUser.role_id).single(),
  ]);

  if (permissionError || canAdjust !== true) {
    return <PageError>ليس لديك صلاحية تسوية المخزون.</PageError>;
  }

  if (roleError || !role) {
    return <PageError>تعذر تحديد صلاحيات الموقع.</PageError>;
  }

  const isAdmin = role.name === "admin";

  if (!isAdmin && !dbUser.location_id) {
    return <PageError>المستخدم غير مرتبط بموقع لإجراء التسوية.</PageError>;
  }

  try {
    let locationsQuery = supabase
      .from("locations")
      .select("id, name, code")
      .eq("company_id", dbUser.company_id)
      .eq("is_active", true)
      .order("name");

    if (!isAdmin) {
      locationsQuery = locationsQuery.eq("id", dbUser.location_id);
    }

    const [products, locationsResponse] = await Promise.all([
      getAllProducts(supabase, dbUser.company_id),
      locationsQuery,
    ]);

    if (locationsResponse.error) {
      throw locationsResponse.error;
    }

    const locations = (locationsResponse.data ?? []) as Location[];

    return (
      <DashboardLayout>
        <div dir="rtl" className="mx-auto w-full max-w-5xl space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                <SlidersHorizontal size={20} />
              </div>
              <div>
                <div className="mb-1 flex items-center gap-2 text-xs text-slate-400">
                  <span>إدارة المخزون</span>
                  <span>/</span>
                  <span>تسوية المخزون</span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">تسوية المخزون</h1>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  تعديل الكمية بزيادة أو نقصان مع تسجيل السبب كحركة مخزون قابلة للمراجعة.
                </p>
              </div>
            </div>
          </section>

          <StockAdjustmentForm products={products} locations={locations} />
        </div>
      </DashboardLayout>
    );
  } catch (error) {
    return <PageError>{error instanceof Error ? error.message : "تعذر تحميل بيانات التسوية."}</PageError>;
  }
}
