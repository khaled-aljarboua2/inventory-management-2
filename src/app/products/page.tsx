import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { createClient } from "@/lib/supabase/server";
import ProductForm from "./ProductForm";
import ProductStatusButton from "./ProductStatusButton";

export default async function ProductsPage() {
  const supabase = await createClient();

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
      .order("created_at", { ascending: false }),

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
      <div dir="rtl" className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            المنتجات
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            إدارة منتجات الشركة وتصنيفاتها وعلاماتها التجارية.
          </p>
        </div>

        {(productsError || categoriesError || brandsError) && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            حدث خطأ أثناء تحميل بيانات المنتجات.
          </div>
        )}

        <ProductForm
          categories={categories ?? []}
          brands={brands ?? []}
        />

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="font-semibold text-slate-900">
              قائمة المنتجات
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {products?.length ?? 0} منتج
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-700">
                    SKU
                  </th>

                  <th className="px-6 py-4 text-sm font-semibold text-slate-700">
                    المنتج
                  </th>

                  <th className="px-6 py-4 text-sm font-semibold text-slate-700">
                    الحد الأدنى
                  </th>

                  <th className="px-6 py-4 text-sm font-semibold text-slate-700">
                    الحالة
                  </th>

                  <th className="px-6 py-4 text-sm font-semibold text-slate-700">
                    الإجراءات
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {!products || products.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-sm text-slate-500"
                    >
                      لا توجد منتجات حاليًا.
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr
                      key={product.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        {product.sku}
                      </td>

                      <td className="px-6 py-4">
                        <Link
                          href={`/products/${product.id}`}
                          className="font-medium text-slate-900 hover:text-blue-600"
                        >
                          {product.name}
                        </Link>

                        {product.description && (
                          <div className="mt-1 max-w-md truncate text-xs text-slate-500">
                            {product.description}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {product.minimum_quantity ?? 0}
                      </td>

                      <td className="px-6 py-4">
                        {product.is_active ? (
                          <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                            نشط
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                            غير نشط
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <Link
                            href={`/products/${product.id}/edit`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800"
                          >
                            تعديل
                          </Link>

                          <ProductStatusButton
                            productId={product.id}
                            isActive={product.is_active ?? false}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
