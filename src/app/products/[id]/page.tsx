import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Building2,
  CheckCircle2,
  CircleOff,
  Edit3,
  Factory,
  Package,
  Tag,
} from "lucide-react";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { createClient } from "@/lib/supabase/server";
import ProductManagement from "./ProductManagement";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProductDetailsPage({
  params,
}: Props) {
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
      .order("is_default", {
        ascending: false,
      }),
  ]);

  return (
    <DashboardLayout>
      <div
        dir="rtl"
        className="mx-auto w-full max-w-[1600px] space-y-7"
      >
        {/* =====================================================
            Breadcrumb
        ====================================================== */}

        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Link
            href="/products"
            className="transition-colors hover:text-teal-600"
          >
            المنتجات
          </Link>

          <ArrowRight
            size={15}
            className="rotate-180"
          />

          <span className="text-slate-500">
            تفاصيل المنتج
          </span>
        </div>

        {/* =====================================================
            رأس المنتج
        ====================================================== */}

        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-teal-100/60 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">

              {/* أيقونة المنتج */}

              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-200/60 transition-transform duration-300 hover:scale-105">
                <Package
                  size={29}
                  strokeWidth={1.8}
                />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    {product.name}
                  </h1>

                  {product.is_active ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      نشط
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                      غير نشط
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className="rounded-lg bg-slate-100 px-3 py-1.5 font-mono text-xs font-semibold text-slate-600">
                    SKU: {product.sku}
                  </span>

                  {category?.name && (
                    <span className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Tag size={14} />
                      {category.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* الأزرار */}

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/products"
                className="group inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
              >
                <ArrowRight
                  size={17}
                  className="transition-transform duration-200 group-hover:-translate-x-1"
                />

                <span>المنتجات</span>
              </Link>

              <Link
                href={`/products/${product.id}/edit`}
                className="group inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-teal-200 transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-700 hover:shadow-md hover:shadow-teal-200"
              >
                <Edit3
                  size={17}
                  className="transition-transform duration-200 group-hover:scale-110"
                />

                <span>تعديل المنتج</span>
              </Link>
            </div>
          </div>
        </div>

        {/* =====================================================
            معلومات سريعة
        ====================================================== */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          {/* التصنيف */}

          <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400">
                  التصنيف
                </p>

                <p className="mt-2 font-semibold text-slate-800">
                  {category?.name ??
                    "بدون تصنيف"}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600 transition-transform duration-300 group-hover:scale-110">
                <Tag size={21} />
              </div>
            </div>
          </div>

          {/* العلامة التجارية */}

          <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400">
                  العلامة التجارية
                </p>

                <p className="mt-2 font-semibold text-slate-800">
                  {brand?.name ??
                    "بدون علامة تجارية"}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600 transition-transform duration-300 group-hover:scale-110">
                <Factory size={21} />
              </div>
            </div>
          </div>

          {/* الحد الأدنى */}

          <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400">
                  الحد الأدنى للمخزون
                </p>

                <p className="mt-2 text-xl font-bold text-slate-800">
                  {product.minimum_quantity ??
                    0}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600 transition-transform duration-300 group-hover:scale-110">
                <Boxes size={21} />
              </div>
            </div>
          </div>

          {/* الحالة */}

          <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400">
                  حالة المنتج
                </p>

                <p className="mt-2 font-semibold text-slate-800">
                  {product.is_active
                    ? "المنتج نشط"
                    : "المنتج غير نشط"}
                </p>
              </div>

              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${
                  product.is_active
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {product.is_active ? (
                  <CheckCircle2 size={21} />
                ) : (
                  <CircleOff size={21} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================
            بيانات المنتج
        ====================================================== */}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                <Package size={19} />
              </div>

              <div>
                <h2 className="font-bold text-slate-900">
                  بيانات المنتج
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  المعلومات الأساسية للمنتج.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-x-8 gap-y-6 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
            <div>
              <p className="text-xs font-medium text-slate-400">
                اسم المنتج
              </p>

              <p className="mt-2 font-semibold text-slate-800">
                {product.name}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-400">
                SKU
              </p>

              <p className="mt-2 font-mono text-sm font-semibold text-slate-700">
                {product.sku}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-400">
                التصنيف
              </p>

              <p className="mt-2 font-semibold text-slate-800">
                {category?.name ??
                  "بدون تصنيف"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-400">
                العلامة التجارية
              </p>

              <p className="mt-2 font-semibold text-slate-800">
                {brand?.name ??
                  "بدون علامة تجارية"}
              </p>
            </div>
          </div>

          {product.description && (
            <div className="border-t border-slate-100 px-5 py-5 sm:px-6">
              <p className="text-xs font-medium text-slate-400">
                وصف المنتج
              </p>

              <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-600">
                {product.description}
              </p>
            </div>
          )}
        </section>

        {/* =====================================================
            الوحدات والباركود
        ====================================================== */}

        <section>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <Building2 size={19} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                الوحدات والباركود
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                إدارة وحدات المنتج ومعاملات التحويل
                والباركود المرتبط بها.
              </p>
            </div>
          </div>

          <ProductManagement
            productId={product.id}
            units={units ?? []}
            productUnits={
              (productUnits ?? []) as any
            }
            barcodes={
              (barcodes ?? []) as any
            }
          />
        </section>
      </div>
    </DashboardLayout>
  );
}