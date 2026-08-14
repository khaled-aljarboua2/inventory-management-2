import { notFound } from "next/navigation";
import Link from "next/link";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { createClient } from "@/lib/supabase/server";
import ProductManagement from "./ProductManagement";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProductDetailsPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select(`
      id,
      sku,
      name,
      description,
      image_url,
      minimum_quantity,
      is_active,
      category_id,
      brand_id
    `)
    .eq("id", id)
    .single();

  if (!product) {
    notFound();
  }

  const [
    { data: category },
    { data: brand },
    { data: units },
    { data: productUnits },
    { data: barcodes },
  ] = await Promise.all([
    product.category_id
      ? supabase
          .from("categories")
          .select("id, name")
          .eq("id", product.category_id)
          .single()
      : Promise.resolve({ data: null }),

    product.brand_id
      ? supabase
          .from("brands")
          .select("id, name")
          .eq("id", product.brand_id)
          .single()
      : Promise.resolve({ data: null }),

    supabase
      .from("units")
      .select("id, name, symbol")
      .order("name"),

    supabase
      .from("product_units")
      .select(`
        id,
        unit_id,
        conversion_factor,
        is_base,
        units (
          id,
          name,
          symbol
        )
      `)
      .eq("product_id", id),

    supabase
      .from("product_barcodes")
      .select(`
        id,
        barcode,
        unit_id,
        is_default,
        units (
          id,
          name,
          symbol
        )
      `)
      .eq("product_id", id)
      .order("is_default", { ascending: false }),
  ]);

  return (
    <DashboardLayout>
      <div dir="rtl" className="space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900">
                {product.name}
              </h1>

              {product.is_active ? (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  نشط
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  غير نشط
                </span>
              )}
            </div>

            <p className="mt-2 text-sm text-slate-500">
              SKU: {product.sku}
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/products"
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              العودة للمنتجات
            </Link>

            <Link
              href={`/products/${product.id}/edit`}
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800"
            >
              تعديل المنتج
            </Link>
          </div>
        </div>

        {/* بيانات المنتج */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-lg font-semibold text-slate-900">
            بيانات المنتج
          </h2>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

            <div>
              <p className="text-xs text-slate-500">
                اسم المنتج
              </p>

              <p className="mt-1 font-medium text-slate-900">
                {product.name}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                SKU
              </p>

              <p className="mt-1 font-medium text-slate-900">
                {product.sku}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                التصنيف
              </p>

              <p className="mt-1 font-medium text-slate-900">
                {category?.name ?? "بدون تصنيف"}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                العلامة التجارية
              </p>

              <p className="mt-1 font-medium text-slate-900">
                {brand?.name ?? "بدون علامة تجارية"}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                الحد الأدنى للمخزون
              </p>

              <p className="mt-1 font-medium text-slate-900">
                {product.minimum_quantity ?? 0}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                الحالة
              </p>

              <p className="mt-1 font-medium text-slate-900">
                {product.is_active ? "نشط" : "غير نشط"}
              </p>
            </div>

          </div>

          {product.description && (
            <div className="mt-6 border-t border-slate-100 pt-5">
              <p className="text-xs text-slate-500">
                الوصف
              </p>

              <p className="mt-2 text-sm leading-7 text-slate-700">
                {product.description}
              </p>
            </div>
          )}
        </div>

        {/* إدارة الوحدات والباركود */}
        <ProductManagement
          productId={product.id}
          units={units ?? []}
          productUnits={(productUnits ?? []) as any}
          barcodes={(barcodes ?? []) as any}
        />

      </div>
    </DashboardLayout>
  );
}
