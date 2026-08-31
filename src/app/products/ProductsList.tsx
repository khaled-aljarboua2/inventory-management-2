"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";
import {
  Boxes,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleOff,
  Loader2,
  Pencil,
  Search,
  X,
} from "lucide-react";

import ProductStatusButton from "./ProductStatusButton";

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

type Props = {
  initialProducts: Product[];
  initialTotal: number;
  initialActive: number;
  initialInactive: number;
};

type FilterType = "all" | "active" | "inactive";

const PRODUCTS_PER_PAGE = 50;

export default function ProductsList({
  initialProducts,
  initialTotal,
  initialActive,
  initialInactive,
}: Props) {
  const [products, setProducts] = useState(initialProducts);
  const [total, setTotal] = useState(initialTotal);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [filter, setFilter] = useState<FilterType>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [firstLoad, setFirstLoad] = useState(true);

  useEffect(() => {
    if (
      firstLoad &&
      currentPage === 1 &&
      deferredSearch.trim() === "" &&
      filter === "all"
    ) {
      setFirstLoad(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          page: String(currentPage),
          limit: String(PRODUCTS_PER_PAGE),
          q: deferredSearch.trim(),
          status: filter,
        });

        const response = await fetch(`/api/products/list?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error ?? "تعذر تحميل المنتجات.");
        }

        setProducts(result.products ?? []);
        setTotal(Number(result.total ?? 0));
      } catch (caughtError) {
        if (controller.signal.aborted) return;
        setProducts([]);
        setTotal(0);
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "تعذر تحميل المنتجات."
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, deferredSearch.trim() ? 350 : 0);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [currentPage, deferredSearch, filter, firstLoad]);

  const totalPages = Math.max(1, Math.ceil(total / PRODUCTS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const firstProductNumber = total === 0 ? 0 : (safeCurrentPage - 1) * PRODUCTS_PER_PAGE + 1;
  const lastProductNumber = Math.min(safeCurrentPage * PRODUCTS_PER_PAGE, total);

  function handleSearchChange(value: string) {
    setSearch(value);
    setCurrentPage(1);
  }

  function handleFilterChange(nextFilter: FilterType) {
    setFilter(nextFilter);
    setCurrentPage(1);
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-1 gap-4 border-b border-slate-100 bg-slate-50/40 p-5 sm:grid-cols-3">
        <StatButton active={filter === "all"} label="إجمالي المنتجات" value={initialTotal} icon={<Boxes size={23} />} onClick={() => handleFilterChange("all")} />
        <StatButton active={filter === "active"} label="المنتجات النشطة" value={initialActive} icon={<CheckCircle2 size={23} />} onClick={() => handleFilterChange("active")} />
        <StatButton active={filter === "inactive"} label="غير النشطة" value={initialInactive} icon={<CircleOff size={23} />} onClick={() => handleFilterChange("inactive")} />
      </div>

      <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">قائمة المنتجات</h2>
            <p className="mt-1 text-sm text-slate-400">يعرض 50 منتجًا فقط في الصفحة، والبحث يشمل كامل قاعدة المنتجات.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative sm:w-80">
              <Search size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="البحث بالاسم أو SKU أو الباركود..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pr-10 pl-10 text-sm outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-50"
              />
              {search && (
                <button type="button" onClick={() => handleSearchChange("")} className="absolute left-3 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="مسح البحث">
                  <X size={15} />
                </button>
              )}
            </div>

            <div className="flex h-11 items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
              {(["all", "active", "inactive"] as FilterType[]).map((item) => (
                <button key={item} type="button" onClick={() => handleFilterChange(item)} className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all ${filter === item ? "bg-white text-teal-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
                  {item === "all" ? "الكل" : item === "active" ? "نشط" : "غير نشط"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span>عرض {firstProductNumber.toLocaleString("ar-SA")} إلى {lastProductNumber.toLocaleString("ar-SA")} من {total.toLocaleString("ar-SA")} منتج</span>
          {search && <span className="rounded-full bg-teal-50 px-2 py-1 font-medium text-teal-600">البحث: {search}</span>}
          <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-500">البحث من السيرفر</span>
        </div>
      </div>

      {error ? (
        <div className="m-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>
      ) : (
        <div className="relative overflow-x-auto">
          {loading && (
            <div className="absolute inset-0 z-10 flex min-h-60 items-center justify-center bg-white/70 backdrop-blur-[1px]">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                <Loader2 size={17} className="animate-spin text-teal-600" />
                جاري تحميل النتائج...
              </div>
            </div>
          )}

          <table className="w-full min-w-[900px] text-right">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500">SKU</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500">الباركود</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500">المنتج</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500">الحد الأدنى</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500">الحالة</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <Search size={28} className="mx-auto text-slate-300" />
                    <p className="mt-4 font-semibold text-slate-700">لا توجد نتائج</p>
                    <p className="mt-1 text-sm text-slate-400">جرّب الاسم أو SKU أو الباركود.</p>
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="transition-colors hover:bg-teal-50/30">
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{product.sku}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{product.barcode ?? "—"}</td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800">{product.name}</p>
                      {product.description ? <p className="mt-1 max-w-sm truncate text-xs text-slate-400">{product.description}</p> : null}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{Number(product.minimum_quantity ?? 0).toLocaleString("ar-SA")}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${product.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {product.is_active ? "نشط" : "غير نشط"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Link href={`/products/${product.id}`} className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-teal-200 hover:text-teal-700">فتح</Link>
                        <Link href={`/products/${product.id}/edit`} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-teal-200 hover:text-teal-700"><Pencil size={14} />تعديل</Link>
                        <ProductStatusButton productId={product.id} isActive={Boolean(product.is_active)} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {total > 0 && (
        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>صفحة {safeCurrentPage.toLocaleString("ar-SA")} من {totalPages.toLocaleString("ar-SA")}</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))} disabled={safeCurrentPage === 1 || loading} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-600 transition hover:border-teal-200 hover:text-teal-700 disabled:opacity-40"><ChevronRight size={14} />السابق</button>
              <button type="button" onClick={() => setCurrentPage(Math.min(totalPages, safeCurrentPage + 1))} disabled={safeCurrentPage === totalPages || loading} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-600 transition hover:border-teal-200 hover:text-teal-700 disabled:opacity-40">التالي<ChevronLeft size={14} /></button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function StatButton({ active, label, value, icon, onClick }: { active: boolean; label: string; value: number; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`group relative overflow-hidden rounded-2xl border p-5 text-right transition-all ${active ? "border-teal-200 bg-teal-50/70 shadow-sm" : "border-slate-200 bg-white hover:border-teal-200 hover:shadow-md"}`}>
      <div className="flex items-center justify-between">
        <div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value.toLocaleString("ar-SA")}</p></div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-600">{icon}</div>
      </div>
    </button>
  );
}
