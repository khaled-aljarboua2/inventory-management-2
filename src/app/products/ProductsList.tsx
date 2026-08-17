"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Boxes,
  CheckCircle2,
  CircleOff,
  Filter,
  Pencil,
  Plus,
  Search,
  X,
} from "lucide-react";

import ProductStatusButton from "./ProductStatusButton";

type Product = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  minimum_quantity: number | null;
  is_active: boolean | null;
  created_at: string;
};

type Props = {
  products: Product[];
};

type FilterType =
  | "all"
  | "active"
  | "inactive";

export default function ProductsList({
  products,
}: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] =
    useState<FilterType>("all");

  const totalProducts = products.length;

  const activeProducts = products.filter(
    (product) => product.is_active
  ).length;

  const inactiveProducts =
    totalProducts - activeProducts;

  const filteredProducts = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !query ||
        product.name
          .toLowerCase()
          .includes(query) ||
        product.sku
          .toLowerCase()
          .includes(query) ||
        product.description
          ?.toLowerCase()
          .includes(query);

      const matchesFilter =
        filter === "all" ||
        (filter === "active" &&
          product.is_active) ||
        (filter === "inactive" &&
          !product.is_active);

      return (
        matchesSearch &&
        matchesFilter
      );
    });
  }, [products, search, filter]);

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

      {/* =====================================================
          Statistics
      ====================================================== */}

      <div className="grid grid-cols-1 gap-4 border-b border-slate-100 bg-slate-50/40 p-5 sm:grid-cols-3">

        {/* Total */}
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`group relative overflow-hidden rounded-2xl border p-5 text-right transition-all duration-300 ${
            filter === "all"
              ? "border-blue-200 bg-blue-50/70 shadow-sm"
              : "border-slate-200 bg-white hover:-translate-y-1 hover:shadow-md"
          }`}
        >
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                إجمالي المنتجات
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-900">
                {totalProducts}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-transform duration-300 group-hover:scale-110">
              <Boxes size={23} />
            </div>
          </div>
        </button>

        {/* Active */}
        <button
          type="button"
          onClick={() => setFilter("active")}
          className={`group relative overflow-hidden rounded-2xl border p-5 text-right transition-all duration-300 ${
            filter === "active"
              ? "border-emerald-200 bg-emerald-50/70 shadow-sm"
              : "border-slate-200 bg-white hover:-translate-y-1 hover:shadow-md"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                المنتجات النشطة
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-900">
                {activeProducts}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-transform duration-300 group-hover:scale-110">
              <CheckCircle2 size={23} />
            </div>
          </div>
        </button>

        {/* Inactive */}
        <button
          type="button"
          onClick={() => setFilter("inactive")}
          className={`group relative overflow-hidden rounded-2xl border p-5 text-right transition-all duration-300 ${
            filter === "inactive"
              ? "border-slate-300 bg-slate-100 shadow-sm"
              : "border-slate-200 bg-white hover:-translate-y-1 hover:shadow-md"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                غير النشطة
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-900">
                {inactiveProducts}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-transform duration-300 group-hover:scale-110">
              <CircleOff size={23} />
            </div>
          </div>
        </button>
      </div>

      {/* =====================================================
          Toolbar
      ====================================================== */}

      <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

          <div>
            <h2 className="text-lg font-bold text-slate-900">
              قائمة المنتجات
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              عرض وإدارة المنتجات المسجلة في النظام.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">

            {/* Search */}
            <div className="relative sm:w-80">
              <Search
                size={18}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="البحث عن منتج أو SKU..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pr-10 pl-10 text-sm outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute left-3 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Filter */}
            <div className="flex h-11 items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                  filter === "all"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                الكل
              </button>

              <button
                type="button"
                onClick={() =>
                  setFilter("active")
                }
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                  filter === "active"
                    ? "bg-white text-emerald-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                نشط
              </button>

              <button
                type="button"
                onClick={() =>
                  setFilter("inactive")
                }
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                  filter === "inactive"
                    ? "bg-white text-slate-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                غير نشط
              </button>
            </div>
          </div>
        </div>

        {/* Result info */}
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
          <Filter size={14} />

          <span>
            عرض {filteredProducts.length} من{" "}
            {totalProducts} منتج
          </span>

          {search && (
            <span className="rounded-full bg-blue-50 px-2 py-1 font-medium text-blue-600">
              البحث: {search}
            </span>
          )}
        </div>
      </div>

      {/* =====================================================
          Table
      ====================================================== */}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-right">

          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70">
              <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                SKU
              </th>

              <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                المنتج
              </th>

              <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                الحد الأدنى
              </th>

              <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                الحالة
              </th>

              <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                الإجراءات
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">

            {filteredProducts.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-20 text-center"
                >
                  <div className="mx-auto flex max-w-sm flex-col items-center">

                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                      {search ? (
                        <Search size={28} />
                      ) : (
                        <Boxes size={28} />
                      )}
                    </div>

                    <p className="font-semibold text-slate-700">
                      {search
                        ? "لا توجد نتائج"
                        : filter === "active"
                          ? "لا توجد منتجات نشطة"
                          : filter === "inactive"
                            ? "لا توجد منتجات غير نشطة"
                            : "لا توجد منتجات حاليًا"}
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                      {search
                        ? "جرّب البحث باستخدام اسم أو SKU مختلف."
                        : "ابدأ بإضافة منتج إلى النظام."}
                    </p>

                    {search && (
                      <button
                        type="button"
                        onClick={() =>
                          setSearch("")
                        }
                        className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                      >
                        مسح البحث
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredProducts.map(
                (product) => (
                  <tr
                    key={product.id}
                    className="group transition-all duration-200 hover:bg-blue-50/30"
                  >

                    {/* SKU */}
                    <td className="px-6 py-5">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-600 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600">
                        {product.sku}
                      </span>
                    </td>

                    {/* Product */}
                    <td className="px-6 py-5">
                      <Link
                        href={`/products/${product.id}`}
                        className="group/product flex items-center gap-3"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-all duration-300 group-hover/product:scale-105 group-hover/product:bg-blue-100 group-hover/product:shadow-sm">
                          <Boxes size={19} />
                        </div>

                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 transition-colors group-hover/product:text-blue-600">
                            {product.name}
                          </p>

                          {product.description && (
                            <p className="mt-1 max-w-md truncate text-xs text-slate-400">
                              {product.description}
                            </p>
                          )}
                        </div>
                      </Link>
                    </td>

                    {/* Minimum */}
                    <td className="px-6 py-5">
                      <span className="text-sm font-semibold text-slate-600">
                        {product.minimum_quantity ??
                          0}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-5">
                      {product.is_active ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-transform duration-200 group-hover:scale-105">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                          نشط
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                          غير نشط
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">

                        <Link
                          href={`/products/${product.id}/edit`}
                          className="group/edit inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 hover:shadow-sm"
                        >
                          <Pencil
                            size={14}
                            className="transition-transform duration-200 group-hover/edit:scale-110"
                          />

                          <span>
                            تعديل
                          </span>
                        </Link>

                        <ProductStatusButton
                          productId={
                            product.id
                          }
                          isActive={
                            product.is_active ??
                            false
                          }
                        />
                      </div>
                    </td>
                  </tr>
                )
              )
            )}
          </tbody>
        </table>
      </div>

      {/* =====================================================
          Footer
      ====================================================== */}

      {filteredProducts.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/40 px-6 py-4 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span>
            إجمالي المنتجات المعروضة:{" "}
            <strong className="text-slate-600">
              {filteredProducts.length}
            </strong>
          </span>

          <span>
            آخر تحديث عند تحميل الصفحة
          </span>
        </div>
      )}
    </section>
  );
}
