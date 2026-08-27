import DashboardLayout from "@/components/layout/DashboardLayout";
import { createClient } from "@/lib/supabase/server";
import ProductForm from "./ProductForm";
import ProductImportExport from "./ProductImportExport";
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

type ProductBarcode = {
  product_id: string;
  barcode: string;
  is_default: boolean | null;
};

const PRODUCT_BATCH_SIZE = 1000;

async function getAllProducts(
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const products: Omit<Product, "barcode">[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
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
      })
      .range(
        from,
        from + PRODUCT_BATCH_SIZE - 1
      );

    if (error) {
      return {
        data: products,
        error,
      };
    }

    const batch = data ?? [];

    products.push(...batch);

    if (batch.length < PRODUCT_BATCH_SIZE) {
      return {
        data: products,
        error: null,
      };
    }

    from += PRODUCT_BATCH_SIZE;
  }
}

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
  } = await supabase.rpc("has_permission", {
    permission_code: "products.view",
  });

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
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                !
              </div>

              <div>
                <h1 className="text-lg font-bold text-amber-800">
                  ليس لديك صلاحية الوصول
                </h1>

                <p className="mt-2 text-sm leading-6 text-amber-700">
                  لا تملك الصلاحية اللازمة لعرض المنتجات.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ============================================================
  // تحميل البيانات
  // ============================================================

  const [
    { data: products, error: productsError },
    { data: categories, error: categoriesError },
    { data: brands, error: brandsError },
    {
      data: productBarcodes,
      error: barcodesError,
    },
  ] = await Promise.all([
    getAllProducts(supabase),

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
      .from("product_barcodes")
      .select(`
        product_id,
        barcode,
        is_default
      `),
  ]);

  // ============================================================
  // ربط الباركود بالمنتج
  //
  // نفضّل الباركود الافتراضي.
  // وإذا لم يوجد، نأخذ أول باركود للمنتج.
  // ============================================================

  const barcodeMap = new Map<
    string,
    ProductBarcode
  >();

  for (
    const barcode of productBarcodes ?? []
  ) {
    const existing =
      barcodeMap.get(
        barcode.product_id
      );

    if (
      !existing ||
      barcode.is_default === true
    ) {
      barcodeMap.set(
        barcode.product_id,
        barcode
      );
    }
  }

  const productsWithBarcodes: Product[] =
    (products ?? []).map((product) => ({
      ...product,
      barcode:
        barcodeMap.get(product.id)
          ?.barcode ?? null,
    }));

  const hasError =
    productsError ||
    categoriesError ||
    brandsError ||
    barcodesError;

  return (
    <DashboardLayout>
      <div
        dir="rtl"
        className="mx-auto w-full max-w-[1600px] space-y-7"
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
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm text-slate-400">
                <span>إدارة المخزون</span>

                <span>/</span>

                <span className="text-slate-500">
                  المنتجات
                </span>
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                المنتجات
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                إدارة منتجات الشركة والوحدات والباركود
                والتصنيفات والعلامات التجارية.
              </p>
            </div>
          </div>
        </section>

        {/* =====================================================
            Errors
        ====================================================== */}

        {hasError && (
          <div
            className="
              rounded-2xl
              border
              border-red-200
              bg-red-50
              px-5
              py-4
              text-sm
              text-red-700
            "
          >
            حدث خطأ أثناء تحميل بيانات المنتجات.
          </div>
        )}

        <ProductImportExport />

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
          products={productsWithBarcodes}
        />
      </div>
    </DashboardLayout>
  );
}
