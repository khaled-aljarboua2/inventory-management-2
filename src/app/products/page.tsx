import DashboardLayout from "@/components/layout/DashboardLayout";
import { createClient } from "@/lib/supabase/server";
import ProductForm from "./ProductForm";
import ProductsList from "./ProductsList";

type Product = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  minimum_quantity: number | null;
  is_active: boolean | null;
  created_at: string;
  barcode: string | null;
};

const INITIAL_LIMIT = 50;

export default async function ProductsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <ErrorBox message="يجب تسجيل الدخول أولًا." />;
  }

  const { data: canViewProducts, error: permissionError } = await supabase.rpc(
    "has_permission",
    { permission_code: "products.view" }
  );

  if (permissionError || canViewProducts !== true) {
    return <ErrorBox message="لا تملك الصلاحية اللازمة لعرض المنتجات." warning />;
  }

  const [
    { data: rawProducts, error: productsError, count: totalProducts },
    { data: categories, error: categoriesError },
    { data: brands, error: brandsError },
    { count: activeProducts },
    { count: inactiveProducts },
  ] = await Promise.all([
    supabase
      .from("products")
      .select(
        `
          id,
          sku,
          name,
          description,
          minimum_quantity,
          is_active,
          created_at,
          product_barcodes (
            barcode,
            is_default
          )
        `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(0, INITIAL_LIMIT - 1),
    supabase
      .from("categories")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("brands")
      .select("id, name")
      .order("name"),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("is_active", false),
  ]);

  const products: Product[] = (rawProducts ?? []).map((product) => {
    const barcodes = product.product_barcodes ?? [];
    const preferred =
      barcodes.find((barcode) => barcode.is_default === true) ??
      barcodes[0] ??
      null;

    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      minimum_quantity: product.minimum_quantity,
      is_active: product.is_active,
      created_at: product.created_at,
      barcode: preferred?.barcode ?? null,
    };
  });

  const hasError = productsError || categoriesError || brandsError;

  return (
    <DashboardLayout>
      <div dir="rtl" className="mx-auto w-full max-w-[1600px] space-y-7">
        <section className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-7 sm:py-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm text-slate-400">
                <span>إدارة المخزون</span>
                <span>/</span>
                <span className="text-slate-500">المنتجات</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">المنتجات</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                إدارة منتجات الشركة والوحدات والباركود والتصنيفات والعلامات التجارية.
              </p>
            </div>
          </div>
        </section>

        {hasError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            حدث خطأ أثناء تحميل بعض بيانات المنتجات.
          </div>
        )}

        <section id="add-product" className="scroll-mt-24">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-900">إضافة منتج</h2>
            <p className="mt-1 text-xs text-slate-400">إنشاء منتج جديد وإضافة بياناته الأساسية.</p>
          </div>
          <ProductForm categories={categories ?? []} brands={brands ?? []} />
        </section>

        <ProductsList
          initialProducts={products}
          initialTotal={totalProducts ?? 0}
          initialActive={activeProducts ?? 0}
          initialInactive={inactiveProducts ?? 0}
        />
      </div>
    </DashboardLayout>
  );
}

function ErrorBox({ message, warning = false }: { message: string; warning?: boolean }) {
  return (
    <DashboardLayout>
      <div
        dir="rtl"
        className={`mx-auto w-full max-w-[1600px] rounded-3xl border p-6 text-sm ${
          warning
            ? "border-amber-200 bg-amber-50 text-amber-700"
            : "border-red-200 bg-red-50 text-red-700"
        }`}
      >
        {message}
      </div>
    </DashboardLayout>
  );
}
