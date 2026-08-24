"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  Layers3,
  Loader2,
  Package,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";

type CountItem = {
  id: string;
  product_id: string;
  system_quantity: number;
  counted_quantity: number | null;
  notes: string | null;
  products: {
    id: string;
    name: string;
    sku: string;
  } | null;
};

type StockCount = {
  id: string;
  status: string;
  locations: {
    id: string;
    name: string;
    code: string;
  } | null;
  items: CountItem[];
};

type Product = {
  id: string;
  name: string;
  sku: string;
  system_quantity: number;
};

type AddMode =
  | "all"
  | "with_stock"
  | "selected";

export default function CountDetail({
  countId,
}: {
  countId: string;
}) {
  const [count, setCount] =
    useState<StockCount | null>(null);

  const [quantities, setQuantities] =
    useState<Record<string, string>>({});

  const [notes, setNotes] =
    useState<Record<string, string>>({});

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [completing, setCompleting] =
    useState(false);

  const [deletingItemId, setDeletingItemId] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [countSearch, setCountSearch] =
    useState("");

  const [showAddProducts, setShowAddProducts] =
    useState(false);

  const [addMode, setAddMode] =
    useState<AddMode>("with_stock");

  const [products, setProducts] =
    useState<Product[]>([]);

  const [productSearch, setProductSearch] =
    useState("");

  const [selectedProductIds, setSelectedProductIds] =
    useState<string[]>([]);

  const [loadingProducts, setLoadingProducts] =
    useState(false);

  const [addingProducts, setAddingProducts] =
    useState(false);

  const [addError, setAddError] =
    useState("");

  // ============================================================
  // تحميل الجرد
  // ============================================================

  const loadCount = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/inventory/counts/${countId}`,
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.count) {
        throw new Error(
          result.error ?? "تعذر تحميل الجرد."
        );
      }

      setCount(result.count);

      const newQuantities: Record<
        string,
        string
      > = {};

      const newNotes: Record<
        string,
        string
      > = {};

      for (
        const item of result.count.items ?? []
      ) {
        newQuantities[item.id] =
          item.counted_quantity === null
            ? ""
            : String(item.counted_quantity);

        newNotes[item.id] =
          item.notes ?? "";
      }

      setQuantities(newQuantities);
      setNotes(newNotes);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "تعذر تحميل الجرد."
      );
    } finally {
      setLoading(false);
    }
  }, [countId]);

  // ============================================================
  // تحميل المنتجات
  // ============================================================

  const loadProducts = useCallback(
    async (
      search = "",
      withStock = false
    ) => {
      setLoadingProducts(true);
      setAddError("");

      try {
        const params =
          new URLSearchParams();

        if (search.trim()) {
          params.set(
            "search",
            search.trim()
          );
        }

        if (withStock) {
          params.set(
            "withStock",
            "true"
          );
        }

        const response = await fetch(
          `/api/inventory/counts/${countId}/items?${params.toString()}`,
          {
            cache: "no-store",
          }
        );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ??
              "تعذر تحميل المنتجات."
          );
        }

        setProducts(
          result.products ?? []
        );
      } catch (err) {
        setAddError(
          err instanceof Error
            ? err.message
            : "تعذر تحميل المنتجات."
        );
      } finally {
        setLoadingProducts(false);
      }
    },
    [countId]
  );

  // ============================================================
  // تحميل الجرد
  // ============================================================

  useEffect(() => {
    void loadCount();
  }, [loadCount]);

  // ============================================================
  // تحميل المنتجات
  // ============================================================

  useEffect(() => {
    if (!showAddProducts) {
      return;
    }

    const timer =
      window.setTimeout(() => {
        void loadProducts(
          productSearch,
          addMode === "with_stock"
        );
      }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    showAddProducts,
    addMode,
    productSearch,
    loadProducts,
  ]);

  // ============================================================
  // الإحصائيات
  // ============================================================

  const totalItems =
    count?.items.length ?? 0;

  const filledCount = useMemo(() => {
    if (!count) return 0;

    return count.items.filter(
      (item) => {
        const value =
          quantities[item.id];

        return (
          value !== undefined &&
          value !== "" &&
          Number.isFinite(
            Number(value)
          ) &&
          Number(value) >= 0
        );
      }
    ).length;
  }, [count, quantities]);

  const allCounted =
    totalItems > 0 &&
    totalItems === filledCount;

  // ============================================================
  // البحث داخل الجرد
  // ============================================================

  const filteredItems =
    useMemo(() => {
      if (!count) return [];

      const search =
        countSearch
          .trim()
          .toLowerCase();

      if (!search) {
        return count.items;
      }

      return count.items.filter(
        (item) => {
          const name =
            item.products?.name.toLowerCase() ??
            "";

          const sku =
            item.products?.sku.toLowerCase() ??
            "";

          return (
            name.includes(search) ||
            sku.includes(search)
          );
        }
      );
    }, [
      count,
      countSearch,
    ]);

  const isCompleted =
    count?.status === "completed";

  // ============================================================
  // فتح نافذة إضافة المنتجات
  // ============================================================

  function openAddProducts() {
    setShowAddProducts(true);
    setAddMode("with_stock");
    setProductSearch("");
    setSelectedProductIds([]);
    setAddError("");

    void loadProducts("", true);
  }

  // ============================================================
  // تحديد المنتج
  // ============================================================

  function toggleProduct(
    productId: string
  ) {
    setSelectedProductIds(
      (current) =>
        current.includes(productId)
          ? current.filter(
              (id) => id !== productId
            )
          : [
              ...current,
              productId,
            ]
    );
  }

  // ============================================================
  // إضافة المنتجات
  // ============================================================

  async function addProducts() {
    if (
      addMode === "selected" &&
      selectedProductIds.length === 0
    ) {
      setAddError(
        "اختر منتجًا واحدًا على الأقل."
      );

      return;
    }

    if (
      addMode === "with_stock" &&
      selectedProductIds.length === 0
    ) {
      setAddError(
        "اختر منتجًا واحدًا على الأقل من المنتجات ذات الرصيد."
      );

      return;
    }

    setAddingProducts(true);
    setAddError("");
    setMessage("");
    setError("");

    try {
      let body:
        | {
            mode: "all";
          }
        | {
            mode: "selected";
            productIds: string[];
          };

      if (
        addMode === "with_stock" ||
        addMode === "selected"
      ) {
        body = {
          mode: "selected",
          productIds:
            selectedProductIds,
        };
      } else {
        body = {
          mode: "all",
        };
      }

      const response =
        await fetch(
          `/api/inventory/counts/${countId}/items`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(body),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ??
            "تعذر إضافة المنتجات."
        );
      }

      setShowAddProducts(false);
      setSelectedProductIds([]);

      setMessage(
        result.message ??
          "تمت إضافة المنتجات بنجاح."
      );

      await loadCount();
    } catch (err) {
      setAddError(
        err instanceof Error
          ? err.message
          : "تعذر إضافة المنتجات."
      );
    } finally {
      setAddingProducts(false);
    }
  }

  // ============================================================
  // حذف منتج
  // ============================================================

  async function deleteItem(
    item: CountItem
  ) {
    const confirmed =
      window.confirm(
        `هل تريد حذف "${item.products?.name ?? "هذا المنتج"}" من الجرد؟`
      );

    if (!confirmed) {
      return;
    }

    setDeletingItemId(item.id);
    setMessage("");
    setError("");

    try {
      const response =
        await fetch(
          `/api/inventory/counts/${countId}/items`,
          {
            method: "DELETE",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              itemId: item.id,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ??
            "تعذر حذف المنتج من الجرد."
        );
      }

      setMessage(
        result.message ??
          "تم حذف المنتج من عملية الجرد."
      );

      await loadCount();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "تعذر حذف المنتج من الجرد."
      );
    } finally {
      setDeletingItemId(null);
    }
  }

  // ============================================================
  // حفظ الكميات
  // ============================================================

  async function saveItems() {
    if (
      !count ||
      totalItems === 0
    ) {
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response =
        await fetch(
          `/api/inventory/counts/${countId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              items:
                count.items.map(
                  (item) => ({
                    id: item.id,
                    counted_quantity:
                      quantities[
                        item.id
                      ] === ""
                        ? null
                        : Number(
                            quantities[
                              item.id
                            ]
                          ),
                    notes:
                      notes[
                        item.id
                      ]?.trim() || null,
                  })
                ),
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ??
            "تعذر حفظ الكميات."
        );
      }

      setMessage(
        "تم حفظ كميات الجرد بنجاح."
      );

      await loadCount();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "تعذر حفظ الكميات."
      );
    } finally {
      setSaving(false);
    }
  }

  // ============================================================
  // إكمال الجرد
  // ============================================================

  async function completeCount() {
    if (
      !count ||
      !allCounted
    ) {
      setError(
        "يجب إدخال الكمية الفعلية لجميع الأصناف قبل إكمال الجرد."
      );

      return;
    }

    if (
      !window.confirm(
        "هل أنت متأكد من إكمال الجرد؟ لا يمكن التراجع عن العملية."
      )
    ) {
      return;
    }

    setCompleting(true);
    setMessage("");
    setError("");

    try {
      const items =
        count.items.map(
          (item) => ({
            id: item.id,
            counted_quantity:
              Number(
                quantities[item.id]
              ),
            notes:
              notes[item.id]?.trim() ||
              null,
          })
        );

      const saveResponse =
        await fetch(
          `/api/inventory/counts/${countId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              items,
            }),
          }
        );

      const saveResult =
        await saveResponse.json();

      if (!saveResponse.ok) {
        throw new Error(
          saveResult.error ??
            "تعذر حفظ الكميات."
        );
      }

      const response =
        await fetch(
          `/api/inventory/counts/${countId}/complete`,
          {
            method: "POST",
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ??
            "تعذر إكمال الجرد."
        );
      }

      setMessage(
        "تم إكمال الجرد وتحديث المخزون بنجاح."
      );

      await loadCount();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "تعذر إكمال الجرد."
      );
    } finally {
      setCompleting(false);
    }
  }

  // ============================================================
  // Loading
  // ============================================================

  if (loading) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-[0_10px_40px_rgba(15,23,42,0.06)]">
        جاري تحميل الجرد...
      </div>
    );
  }

  if (!count) {
    return (
      <div className="rounded-[28px] border border-red-200 bg-red-50 p-6 font-semibold text-red-700">
        {error || "الجرد غير موجود."}
      </div>
    );
  }

  // ============================================================
  // الصفحة
  // ============================================================

  return (
    <>
      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <Link
            href="/inventory/counts"
            className="mb-5 inline-flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-medium text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-blue-600"
          >
            <ArrowRight size={16} />
            العودة إلى الجرد
          </Link>

          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-200">
              <ClipboardCheck size={25} />
            </div>

            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                جرد المخزون
              </h1>

              <p className="mt-1.5 text-sm font-medium text-slate-500">
                {count.locations?.name}
                {" — "}
                <span className="font-mono text-xs text-slate-400">
                  {count.locations?.code}
                </span>
              </p>
            </div>
          </div>
        </div>

        {!isCompleted && (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openAddProducts}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-100 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-200"
            >
              <Plus size={17} />
              إضافة منتجات
            </button>

            <button
              type="button"
              disabled={
                saving ||
                completing ||
                totalItems === 0
              }
              onClick={saveItems}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={17} />

              {saving
                ? "جاري الحفظ..."
                : "حفظ"}
            </button>

            <button
              type="button"
              disabled={
                saving ||
                completing ||
                !allCounted
              }
              onClick={completeCount}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-100 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircle2 size={17} />

              {completing
                ? "جاري الإكمال..."
                : "إكمال الجرد"}
            </button>
          </div>
        )}
      </div>

      {message && (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700 shadow-sm">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
            <CheckCircle2 size={17} />
          </div>

          {message}
        </div>
      )}

      {error && (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700 shadow-sm">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
            <AlertTriangle size={17} />
          </div>

          {error}
        </div>
      )}

      {!isCompleted &&
        totalItems === 0 && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm font-medium text-blue-700">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <AlertTriangle size={18} />
            </div>

            <span>
              لم تتم إضافة أي أصناف للجرد بعد.
            </span>
          </div>
        )}

      <section className="mt-7 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_10px_40px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-5 border-b border-slate-100 bg-gradient-to-l from-slate-50/80 to-white p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Package size={19} />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  أصناف الجرد
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  تم العد:{" "}
                  <span className="font-semibold text-slate-600">
                    {filledCount}
                  </span>{" "}
                  / {totalItems}
                </p>
              </div>
            </div>
          </div>

          {totalItems > 0 && (
            <div className="relative">
              <Search
                size={17}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={countSearch}
                onChange={(event) =>
                  setCountSearch(
                    event.target.value
                  )
                }
                placeholder="ابحث بالاسم أو SKU..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-10 pl-4 text-sm text-slate-700 outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 sm:w-72"
              />
            </div>
          )}
        </div>

        {totalItems === 0 ? (
          <div className="px-6 py-20 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
              <Package size={32} />
            </div>

            <p className="mt-5 font-semibold text-slate-700">
              الجرد فارغ
            </p>

            <p className="mt-1 text-sm text-slate-400">
              أضف المنتجات التي تريد جردها للبدء.
            </p>

            <button
              type="button"
              onClick={openAddProducts}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-100 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg"
            >
              <Plus size={17} />
              إضافة منتجات
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px] text-right">
              <thead className="bg-slate-50/80 text-xs text-slate-500">
                <tr>
                  <th className="border-b border-slate-100 px-6 py-4 font-semibold">
                    المنتج
                  </th>

                  <th className="border-b border-slate-100 px-6 py-4 font-semibold">
                    SKU
                  </th>

                  <th className="border-b border-slate-100 px-6 py-4 font-semibold">
                    كمية النظام
                  </th>

                  <th className="border-b border-slate-100 px-6 py-4 font-semibold">
                    الكمية الفعلية
                  </th>

                  <th className="border-b border-slate-100 px-6 py-4 font-semibold">
                    الفرق
                  </th>

                  <th className="border-b border-slate-100 px-6 py-4 font-semibold">
                    ملاحظات
                  </th>

                  <th className="border-b border-slate-100 px-6 py-4 font-semibold">
                    إجراء
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredItems.map(
                  (item) => {
                    const value =
                      quantities[item.id] ??
                      "";

                    const actual =
                      value === ""
                        ? null
                        : Number(value);

                    const difference =
                      actual === null
                        ? null
                        : actual -
                          Number(
                            item.system_quantity
                          );

                    return (
                      <tr
                        key={item.id}
                        className="group transition-all duration-150 hover:bg-blue-50/30"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-all duration-200 group-hover:bg-blue-50 group-hover:text-blue-600">
                              <Package size={17} />
                            </div>

                            <span className="font-semibold text-slate-800">
                              {item.products?.name}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-5 font-mono text-xs font-medium text-slate-500">
                          {item.products?.sku}
                        </td>

                        <td className="px-6 py-5">
                          <span className="inline-flex rounded-lg bg-slate-100 px-3 py-1.5 font-mono text-sm font-bold text-slate-700">
                            {item.system_quantity}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            disabled={isCompleted}
                            value={value}
                            onChange={(event) =>
                              setQuantities(
                                (current) => ({
                                  ...current,
                                  [item.id]:
                                    event.target.value,
                                })
                              )
                            }
                            className="h-11 w-28 rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm font-semibold text-slate-700 outline-none transition-all duration-200 hover:border-blue-200 hover:bg-white focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60"
                          />
                        </td>

                        <td
                          className={`px-6 py-5 font-bold ${
                            difference === null
                              ? "text-slate-300"
                              : difference > 0
                              ? "text-emerald-600"
                              : difference < 0
                              ? "text-red-600"
                              : "text-slate-600"
                          }`}
                        >
                          {difference === null
                            ? "—"
                            : difference > 0
                            ? `+${difference}`
                            : difference}
                        </td>

                        <td className="px-6 py-5">
                          <input
                            disabled={isCompleted}
                            value={
                              notes[item.id] ??
                              ""
                            }
                            onChange={(event) =>
                              setNotes(
                                (current) => ({
                                  ...current,
                                  [item.id]:
                                    event.target.value,
                                })
                              )
                            }
                            placeholder="ملاحظة..."
                            className="h-11 min-w-56 rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm text-slate-700 outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                          />
                        </td>

                        <td className="px-6 py-5">
                          {!isCompleted && (
                            <button
                              type="button"
                              disabled={
                                deletingItemId ===
                                item.id
                              }
                              onClick={() =>
                                void deleteItem(
                                  item
                                )
                              }
                              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition-all duration-200 hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {deletingItemId ===
                              item.id ? (
                                <Loader2
                                  size={16}
                                  className="animate-spin"
                                />
                              ) : (
                                <Trash2 size={16} />
                              )}

                              حذف
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ========================================================
          نافذة إضافة المنتجات
      ========================================================= */}

      {showAddProducts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_25px_80px_rgba(15,23,42,0.25)]">
            {/* Header */}

            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-l from-slate-50 to-white p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Plus size={20} />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    إضافة منتجات للجرد
                  </h2>

                  <p className="mt-1 text-xs text-slate-400">
                    اختر طريقة عرض المنتجات ثم حدد المنتجات التي تريد إضافتها.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  !addingProducts &&
                  setShowAddProducts(false)
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700"
                aria-label="إغلاق"
              >
                <X size={20} />
              </button>
            </div>

            {/* خيارات الإضافة */}

            <div className="grid gap-3 border-b border-slate-100 bg-slate-50/50 p-5 md:grid-cols-3">
              {/* جرد شامل */}

              <button
                type="button"
                onClick={() => {
                  setAddMode("all");
                  setSelectedProductIds([]);
                  setProductSearch("");
                }}
                className={`group rounded-2xl border p-4 text-right transition-all duration-200 ${
                  addMode === "all"
                    ? "border-blue-300 bg-blue-50 text-blue-700 shadow-sm ring-2 ring-blue-50"
                    : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/40"
                }`}
              >
                <Layers3
                  size={20}
                  className="transition-transform duration-200 group-hover:scale-110"
                />

                <p className="mt-2 font-semibold">
                  جرد شامل
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  جميع المنتجات
                </p>
              </button>

              {/* ذات رصيد */}

              <button
                type="button"
                onClick={() => {
                  setAddMode("with_stock");
                  setSelectedProductIds([]);
                  setProductSearch("");
                }}
                className={`group rounded-2xl border p-4 text-right transition-all duration-200 ${
                  addMode === "with_stock"
                    ? "border-blue-300 bg-blue-50 text-blue-700 shadow-sm ring-2 ring-blue-50"
                    : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/40"
                }`}
              >
                <Boxes
                  size={20}
                  className="transition-transform duration-200 group-hover:scale-110"
                />

                <p className="mt-2 font-semibold">
                  ذات رصيد
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  اعرض المنتجات ذات الرصيد واختر منها
                </p>
              </button>

              {/* اختيار يدوي */}

              <button
                type="button"
                onClick={() => {
                  setAddMode("selected");
                  setSelectedProductIds([]);
                  setProductSearch("");
                }}
                className={`group rounded-2xl border p-4 text-right transition-all duration-200 ${
                  addMode === "selected"
                    ? "border-blue-300 bg-blue-50 text-blue-700 shadow-sm ring-2 ring-blue-50"
                    : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/40"
                }`}
              >
                <Search
                  size={20}
                  className="transition-transform duration-200 group-hover:scale-110"
                />

                <p className="mt-2 font-semibold">
                  اختيار يدوي
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  البحث في جميع المنتجات
                </p>
              </button>
            </div>

            {/* المنتجات */}

            <div className="flex-1 overflow-y-auto p-5">
              {addError && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                  <AlertTriangle size={16} />
                  {addError}
                </div>
              )}

              <div className="relative mb-4">
                <Search
                  size={18}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={productSearch}
                  onChange={(event) =>
                    setProductSearch(
                      event.target.value
                    )
                  }
                  placeholder="ابحث باسم المنتج أو SKU..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pr-10 pl-4 text-sm text-slate-700 outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>

              {addMode === "with_stock" && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
                  <Boxes size={17} />

                  <span>
                    يتم عرض المنتجات ذات الرصيد في موقع الجرد فقط. حدد المنتجات التي تريد جردها.
                  </span>
                </div>
              )}

              {loadingProducts ? (
                <div className="py-12 text-center">
                  <Loader2
                    className="mx-auto animate-spin text-blue-500"
                  />
                </div>
              ) : (
                <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                  {products.length === 0 ? (
                    <div className="py-12 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                        <Package size={32} />
                      </div>

                      <p className="mt-4 font-semibold text-slate-600">
                        لا توجد منتجات
                      </p>

                      {addMode ===
                        "with_stock" && (
                        <p className="mt-1 text-sm text-slate-400">
                          لا توجد منتجات ذات رصيد في هذا الموقع.
                        </p>
                      )}
                    </div>
                  ) : (
                    products.map(
                      (product) => {
                        const selected =
                          selectedProductIds.includes(
                            product.id
                          );

                        return (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() =>
                              toggleProduct(
                                product.id
                              )
                            }
                            className={`group flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-right transition-all duration-200 ${
                              selected
                                ? "border-blue-300 bg-blue-50 shadow-sm"
                                : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50 hover:shadow-sm"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`flex h-5 w-5 items-center justify-center rounded-md border text-xs transition-all duration-200 ${
                                  selected
                                    ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                                    : "border-slate-300 bg-white text-transparent group-hover:border-blue-300"
                                }`}
                              >
                                {selected && "✓"}
                              </span>

                              <div>
                                <p className="font-semibold text-slate-800">
                                  {product.name}
                                </p>

                                <p className="mt-1 font-mono text-xs text-slate-400">
                                  {product.sku}
                                </p>
                              </div>
                            </div>

                            <div className="rounded-xl bg-slate-50 px-3 py-2 text-left">
                              <p className="text-[10px] font-medium text-slate-400">
                                رصيد النظام
                              </p>

                              <p className="mt-0.5 font-bold text-slate-900">
                                {product.system_quantity}
                              </p>
                            </div>
                          </button>
                        );
                      }
                    )
                  )}
                </div>
              )}
            </div>

            {/* Footer */}

            <div className="flex flex-col gap-4 border-t border-slate-100 bg-slate-50/50 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm font-medium text-slate-500">
                {selectedProductIds.length >
                0
                  ? `تم تحديد ${selectedProductIds.length} منتج`
                  : "لم يتم تحديد أي منتج"}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setShowAddProducts(false)
                  }
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition-all duration-200 hover:bg-slate-100"
                >
                  إلغاء
                </button>

                <button
                  type="button"
                  disabled={
                    addingProducts ||
                    loadingProducts ||
                    (addMode !== "all" &&
                      selectedProductIds.length ===
                        0)
                  }
                  onClick={() =>
                    void addProducts()
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-100 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {addingProducts && (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  )}

                  {addMode === "all"
                    ? "إضافة جميع المنتجات"
                    : "إضافة المحدد"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}