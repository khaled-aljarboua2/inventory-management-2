"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProduct } from "./actions";

type Option = {
  id: string;
  name: string;
};

type Props = {
  categories: Option[];
  brands: Option[];
};

export default function ProductForm({ categories, brands }: Props) {
  const router = useRouter();

  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [minimumQuantity, setMinimumQuantity] = useState("0");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setSuccess("");

    const result = await createProduct({
      sku,
      name,
      description,
      category_id: categoryId || undefined,
      brand_id: brandId || undefined,
      minimum_quantity: Number(minimumQuantity),
    });

    if (!result.success) {
      setError(result.error || "حدث خطأ غير متوقع.");
      setLoading(false);
      return;
    }

    setSuccess("تم إنشاء المنتج بنجاح.");

    setSku("");
    setName("");
    setDescription("");
    setCategoryId("");
    setBrandId("");
    setMinimumQuantity("0");

    router.refresh();

    setLoading(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      dir="rtl"
      className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          إضافة منتج
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          أدخل بيانات المنتج الأساسية.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            رمز المنتج (SKU)
          </label>

          <input
            type="text"
            value={sku}
            onChange={(event) => setSku(event.target.value)}
            required
            placeholder="مثال: PRD-001"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            اسم المنتج
          </label>

          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            placeholder="اسم المنتج"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            التصنيف
          </label>

          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">بدون تصنيف</option>

            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            العلامة التجارية
          </label>

          <select
            value={brandId}
            onChange={(event) => setBrandId(event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">بدون علامة تجارية</option>

            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            الحد الأدنى للمخزون
          </label>

          <input
            type="number"
            min="0"
            step="any"
            value={minimumQuantity}
            onChange={(event) => setMinimumQuantity(event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          الوصف
        </label>

        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
          placeholder="وصف اختياري للمنتج..."
          className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-slate-900 px-6 py-3 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "جاري الحفظ..." : "حفظ المنتج"}
        </button>
      </div>
    </form>
  );
}
