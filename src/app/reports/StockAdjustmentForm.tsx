"use client";

import { AlertCircle, CheckCircle2, LoaderCircle, Search, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState, useTransition } from "react";

import { adjustProductStock } from "@/app/inventory/actions";

type Product = { id: string; sku: string; name: string };
type Location = { id: string; name: string; code: string };

export default function StockAdjustmentForm({ products, locations }: { products: Product[]; locations: Location[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [productId, setProductId] = useState("");
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const visibleProducts = useMemo(() => {
    const key = query.trim().toLowerCase();
    const matching = key
      ? products.filter((product) => product.name.toLowerCase().includes(key) || product.sku.toLowerCase().includes(key))
      : products;
    return matching;
  }, [products, query]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const adjustmentDelta = Number(delta);
    setError("");
    setMessage("");

    if (!productId || !locationId) {
      setError("اختر المنتج والموقع أولًا.");
      return;
    }

    if (!Number.isFinite(adjustmentDelta) || adjustmentDelta === 0) {
      setError("أدخل فرقًا صحيحًا أكبر أو أقل من صفر.");
      return;
    }

    startTransition(async () => {
      const result = await adjustProductStock({ productId, locationId, adjustmentDelta, reason });

      if (!result.success) {
        setError(result.error ?? "تعذر تنفيذ التسوية.");
        return;
      }

      setMessage("تمت التسوية وتسجيل حركة المخزون بنجاح.");
      setDelta("");
      setReason("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-700">ابحث عن المنتج</span>
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => { setQuery(event.target.value); setProductId(""); }}
              placeholder="اسم المنتج أو SKU"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pr-9 pl-3 text-sm outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-50"
            />
          </div>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-700">المنتج</span>
          <select
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
            disabled={visibleProducts.length === 0}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-50 disabled:bg-slate-50"
          >
            <option value="">{visibleProducts.length ? "اختر المنتج" : "لا توجد نتائج"}</option>
            {visibleProducts.map((product) => <option key={product.id} value={product.id}>{product.name} — {product.sku}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-700">الموقع</span>
          <select
            value={locationId}
            onChange={(event) => setLocationId(event.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-50"
          >
            {locations.map((location) => <option key={location.id} value={location.id}>{location.name} ({location.code})</option>)}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-700">فرق الكمية</span>
          <input
            dir="ltr"
            type="number"
            step="any"
            value={delta}
            onChange={(event) => setDelta(event.target.value)}
            placeholder="مثال: 5 أو -2"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm tabular-nums outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-50"
          />
          <p className="mt-1 text-[11px] text-slate-400">الرقم الموجب يزيد المخزون والسالب يخصمه.</p>
        </label>

        <label className="block md:col-span-2">
          <span className="mb-1.5 block text-xs font-semibold text-slate-700">سبب التسوية</span>
          <textarea
            required
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="مثال: فرق جرد فعلي"
            className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-50"
          />
        </label>
      </div>

      {error ? <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"><AlertCircle size={16} className="mt-0.5 shrink-0" />{error}</div> : null}
      {message ? <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700"><CheckCircle2 size={16} className="mt-0.5 shrink-0" />{message}</div> : null}

      <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
        <button type="submit" disabled={isPending || products.length === 0 || locations.length === 0} className="inline-flex h-10 items-center gap-2 rounded-lg bg-teal-600 px-5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60">
          {isPending ? <LoaderCircle size={16} className="animate-spin" /> : <SlidersHorizontal size={16} />}
          {isPending ? "جاري الحفظ..." : "تنفيذ التسوية"}
        </button>
      </div>
    </form>
  );
}
