import DashboardLayout from "@/components/layout/DashboardLayout";
import { createClient } from "@/lib/supabase/server";
import ProductForm from "./ProductForm";
import ProductsList from "./ProductsList";

type Product = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  minimum_quantity: number | null;
  is_active: boolean | null;
  created_at: string;
};

const PRODUCT_BATCH_SIZE = 1000;

async function getAllProducts(
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const products: Product[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select(`
        id,
        sku,
        barcode,
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
          className="
            rounded-2xl
            border
            border-red-200
            bg-red-50
            p-6
            text-sm
            text-red-700
          "
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
          className="
            mx-auto
            w-full
            max-w-[1600px]
          "
        >
          <div
            className="
              rounded-3xl
              border
              border-amber-200
              bg-amber-50
              p-6
            "
          >
            <div className="flex items-start gap-3">
              <div
                className="
                  mt-0.5
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-amber-100
                  text-amber-700
                "
              >
                !
              </div>

              <div>
                <h1
                  className="
                    text-lg
                    font-bold
                    text-amber-800
                  "
                >
                  ليس لديك صلاحية الوصول
                </h1>

                <p
                  className="
                    mt-2
                    text-sm
                    leading-6
                    text-amber-700
                  "
                >
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
  // تحميل بيانات المنتجات
  // ============================================================

  const [
    { data: products, error: productsError },
    { data: categories, error: categoriesError },
    { data: brands, error: brandsError },
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
  ]);

  // ============================================================
  // الصفحة
  // ============================================================

  return (
    <DashboardLayout>
      <div
        dir="rtl"
        className="
          mx-auto
          w-full
          max-w-[1600px]
          space-y-6
        "
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
          <div
            className="
              flex
              flex-col
              gap-4
              lg:flex-row
              lg:items-center
              lg:justify-between
            "
          >
            <div>
              <div
                className="
                  mb-3
                  flex
                  items-center
                  gap-2
                  text-sm
                  text-slate-400
                "
              >
                <span>
                  إدارة المخزون
                </span>

                <span>/</span>

                <span className="text-teal-600">
                  المنتجات
                </span>
              </div>

              <h1
                className="
                  text-3xl
                  font-bold
                  tracking-tight
                  text-slate-900
                "
              >
                المنتجات
              </h1>

              <p
                className="
                  mt-2
                  max-w-2xl
                  text-sm
                  leading-6
                  text-slate-500
                "
              >
                إدارة منتجات الشركة والوحدات والباركود
                والتصنيفات والعلامات التجارية.
              </p>
            </div>
          </div>
        </section>

        {/* =====================================================
            Errors
        ====================================================== */}

        {(productsError ||
          categoriesError ||
          brandsError) && (
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

        {/* =====================================================
            Add Product
        ====================================================== */}

        <section
          id="add-product"
          className="
            scroll-mt-24
            rounded-3xl
            border
            border-slate-200
            bg-white
            shadow-sm
          "
        >
          <div
            className="
              border-b
              border-slate-100
              px-5
              py-4
              sm:px-6
            "
          >
            <div
              className="
                flex
                items-center
                gap-3
              "
            >
              <div
                className="
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-teal-50
                  text-teal-600
                "
              >
                +
              </div>

              <div>
                <h2
                  className="
                    text-base
                    font-bold
                    text-slate-900
                  "
                >
                  إضافة منتج
                </h2>

                <p
                  className="
                    mt-0.5
                    text-xs
                    text-slate-400
                  "
                >
                  إضافة البيانات الأساسية للمنتج.
                </p>
              </div>
            </div>
          </div>

          <div className="px-4 py-4 sm:px-5">
            <ProductForm
              categories={categories ?? []}
              brands={brands ?? []}
            />
          </div>
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