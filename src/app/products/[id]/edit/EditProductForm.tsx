"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProduct } from "../../actions";

type Option = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category_id: string | null;
  brand_id: string | null;
  minimum_quantity: number | null;
};

type Props = {
  product: Product;
  categories: Option[];
  brands: Option[];
};

export default function EditProductForm({
  product,
  categories,
  brands,
}: Props) {
  const router = useRouter();

  const [sku, setSku] = useState(product.sku);
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(
    product.description ?? ""
  );
  const [categoryId, setCategoryId] = useState(
    product.category_id ?? ""
  );
  const [brandId, setBrandId] = useState(product.brand_id ?? "");
  const [minimumQuantity, setMinimumQuantity] = useState(
    String(product.minimum_quantity ?? 0)
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const result = await updateProduct(product.id, {
      sku,
      name,
      description,
      category_id: categoryId || undefined,
      brand_id: brandId || undefined,
      minimum_quantity: Number(minimumQuantity),
    });

    if (!result.success) {
      setError(result.error || "An error occurred");
      setLoading(false);
      return;
    }

    router.push("/products");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium">
            رمز المنتج (SKU)
          </label>

          <input
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            required
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            اسم المنتج
          </label>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            التصنيف
          </label>

          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
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
          <label className="mb-2 block text-sm font-medium">
            العلامة التجارية
          </label>

          <select
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
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
          <label className="mb-2 block text-sm font-medium">
            الحد الأدنى للمخزون
          </label>

          <input
            type="number"
            min="0"
            step="any"
            value={minimumQuantity}
            onChange={(e) => setMinimumQuantity(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">
          الوصف
        </label>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full rounded-xl border border-slate-300 px-4 py-3"
        />
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/products")}
          className="rounded-xl border border-slate-300 px-6 py-3"
        >
          إلغاء
        </button>

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-slate-900 px-6 py-3 font-medium text-white disabled:opacity-50"
        >
          {loading ? "جاري الحفظ..." : "حفظ التعديلات"}
        </button>
      </div>
    </form>
  );
}
