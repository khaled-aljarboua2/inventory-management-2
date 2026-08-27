"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Boxes,
  Check,
  ChevronDown,
  FileText,
  Hash,
  PackagePlus,
  Save,
  Tag,
  X,
} from "lucide-react";

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
  const [brandId, setBrandId] = useState(
    product.brand_id ?? ""
  );
  const [minimumQuantity, setMinimumQuantity] =
    useState(
      String(product.minimum_quantity ?? 0)
    );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setSuccess("");

    const minimum = Number(minimumQuantity);

    if (
      !Number.isFinite(minimum) ||
      minimum < 0
    ) {
      setError(
        "الحد الأدنى للمخزون يجب أن يكون رقمًا صحيحًا أو عشريًا يساوي أو أكبر من صفر."
      );
      setLoading(false);
      return;
    }

    const result = await updateProduct(
      product.id,
      {
        sku: sku.trim(),
        name: name.trim(),
        description: description.trim(),
        category_id:
          categoryId || undefined,
        brand_id:
          brandId || undefined,
        minimum_quantity: minimum,
      }
    );

    if (!result.success) {
      setError(
        result.error ||
          "حدث خطأ أثناء حفظ التعديلات."
      );
      setLoading(false);
      return;
    }

    setSuccess(
      "تم تحديث المنتج بنجاح."
    );

    router.push("/products");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      dir="rtl"
      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
    >
      {/* =====================================================
          Header
      ====================================================== */}

      <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-l from-teal-50 via-white to-white px-6 py-7 sm:px-8">
        <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-teal-100/40 blur-2xl" />

        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-200 transition-transform duration-300 hover:scale-105">
            <PackagePlus size={27} />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900">
              تعديل المنتج
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              تعديل البيانات الأساسية للمنتج
              وتحديث معلوماته في النظام.
            </p>
          </div>
        </div>
      </div>

      {/* =====================================================
          Messages
      ====================================================== */}

      {(error || success) && (
        <div className="space-y-4 px-6 pt-6 sm:px-8">
          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
              <X
                size={18}
                className="mt-0.5 shrink-0"
              />

              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
              <Check
                size={18}
                className="mt-0.5 shrink-0"
              />

              <span>{success}</span>
            </div>
          )}
        </div>
      )}

      <div className="space-y-6 p-6 sm:p-8">

        {/* =====================================================
            Product Information
        ====================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <Boxes size={20} />
            </div>

            <div>
              <h3 className="font-bold text-slate-900">
                بيانات المنتج
              </h3>

              <p className="mt-0.5 text-xs text-slate-400">
                المعلومات الأساسية للمنتج.
              </p>
            </div>
          </div>

          <div className="grid gap-5 p-5 md:grid-cols-2">

            {/* SKU */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Hash size={15} />
                رمز المنتج (SKU)
              </label>

              <input
                type="text"
                value={sku}
                onChange={(event) =>
                  setSku(event.target.value)
                }
                required
                disabled={loading}
                placeholder="مثال: PRD-001"
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-mono text-sm outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-50 disabled:opacity-50"
              />
            </div>

            {/* Name */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <PackagePlus size={15} />
                اسم المنتج
              </label>

              <input
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                required
                disabled={loading}
                placeholder="اسم المنتج"
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-50 disabled:opacity-50"
              />
            </div>

            {/* Category */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Tag size={15} />
                التصنيف
              </label>

              <div className="relative">
                <select
                  value={categoryId}
                  onChange={(event) =>
                    setCategoryId(
                      event.target.value
                    )
                  }
                  disabled={loading}
                  className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 pl-10 text-sm outline-none transition-all duration-200 hover:border-slate-300 hover:bg-white focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-50 disabled:opacity-50"
                >
                  <option value="">
                    بدون تصنيف
                  </option>

                  {categories.map(
                    (category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    )
                  )}
                </select>

                <ChevronDown
                  size={17}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            </div>

            {/* Brand */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Tag size={15} />
                العلامة التجارية
              </label>

              <div className="relative">
                <select
                  value={brandId}
                  onChange={(event) =>
                    setBrandId(
                      event.target.value
                    )
                  }
                  disabled={loading}
                  className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 pl-10 text-sm outline-none transition-all duration-200 hover:border-slate-300 hover:bg-white focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-50 disabled:opacity-50"
                >
                  <option value="">
                    بدون علامة تجارية
                  </option>

                  {brands.map((brand) => (
                    <option
                      key={brand.id}
                      value={brand.id}
                    >
                      {brand.name}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={17}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            </div>

            {/* Minimum */}
            <div className="md:col-span-2">
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Boxes size={15} />
                الحد الأدنى للمخزون
              </label>

              <input
                type="number"
                min="0"
                step="any"
                value={minimumQuantity}
                onChange={(event) =>
                  setMinimumQuantity(
                    event.target.value
                  )
                }
                disabled={loading}
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition-all duration-200 hover:border-slate-300 hover:bg-white focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-50 disabled:opacity-50 md:max-w-md"
              />
            </div>
          </div>
        </section>

        {/* =====================================================
            Description
        ====================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <FileText size={20} />
            </div>

            <div>
              <h3 className="font-bold text-slate-900">
                معلومات إضافية
              </h3>

              <p className="mt-0.5 text-xs text-slate-400">
                أضف وصفًا أو ملاحظات عن المنتج.
              </p>
            </div>
          </div>

          <div className="p-5">
            <textarea
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
              rows={5}
              disabled={loading}
              placeholder="اكتب وصفًا اختياريًا للمنتج..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-50 disabled:opacity-50"
            />
          </div>
        </section>

        {/* =====================================================
            Actions
        ====================================================== */}

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-400">
            تأكد من صحة بيانات المنتج قبل حفظ التعديلات.
          </p>

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() =>
                router.push("/products")
              }
              disabled={loading}
              className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-600 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={loading}
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-teal-600 px-7 text-sm font-semibold text-white shadow-sm shadow-teal-200 transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-700 hover:shadow-lg hover:shadow-teal-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              <Save
                size={18}
                className="transition-transform duration-200 group-hover:scale-110"
              />

              {loading
                ? "جاري الحفظ..."
                : "حفظ التعديلات"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}