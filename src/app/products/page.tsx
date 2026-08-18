import DashboardLayout from "@/components/layout/DashboardLayout";
import { createClient } from "@/lib/supabase/server";
import ProductForm from "./ProductForm";
import ProductsList from "./ProductsList";

export default async function ProductsPage() {
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
  // التحقق من صلاحية عرض المنتجات
  // ============================================================

  const {
    data: canViewProducts,
    error: permissionError,
  } = await supabase.rpc(
    "has_permission",
    {
      permission_code: "products.view",
    }
  );

  if (
    permissionError ||
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
              لا تملك الصلاحية اللازمة لعرض المنتجات.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ============================================================
  // تحميل بيانات المنتجات
  // ============================================================

  const [
    { data: products, error: productsError },
    { data: categories, error: categoriesError },
    { data: brands, error: brandsError },
  ] = await Promise.all([
    supabase
      .from("products")
      .select(`
        id,
        sku,
        name,
        description,
        minimum_quantity,
        is_active,
        created_at
      `)
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from("categories")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),

    supabase
      .from("brands")
      .select("id, name")
      .order("name"),
  ]);

  return (
    <DashboardLayout>
      <div
        dir="rtl"
        className="mx-auto w-full max-w-[1600px] space-y-7"
      >
        {/* =====================================================
            Header
        ====================================================== */}

        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
              <span>إدارة المخزون</span>
              <span>/</span>
              <span className="text-slate-500">
                المنتجات
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              المنتجات
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              إدارة منتجات الشركة والوحدات والباركود
              والتصنيفات والعلامات التجارية.
            </p>
          </div>
        </div>

        {/* =====================================================
            Errors
        ====================================================== */}

        {(productsError ||
          categoriesError ||
          brandsError) && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            حدث خطأ أثناء تحميل بيانات المنتجات.
          </div>
        )}

        {/* =====================================================
            Add Product
        ====================================================== */}

        <section
          id="add-product"
          className="scroll-mt-24"
        >
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-900">
              إضافة منتج
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              إنشاء منتج جديد وإضافة بياناته الأساسية.
            </p>
          </div>

          <ProductForm
            categories={categories ?? []}
            brands={brands ?? []}
          />
        </section>

        {/* =====================================================
            Products
        ====================================================== */}

        <ProductsList
          products={products ?? []}
        />
      </div>
    </DashboardLayout>
  );
}