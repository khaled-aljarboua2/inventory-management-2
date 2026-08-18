"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { createTransfer } from "./actions";

type Location = {
  id: string;
  name: string;
  code: string;
  type: string;
  is_active: boolean;
};

type ProductUnit = {
  id: string;
  unit_id: string;
  conversion_factor: number;
  is_base: boolean;
  units: {
    id: string;
    name: string;
    symbol: string | null;
  } | null;
};

type Product = {
  id: string;
  name: string;
  sku: string;
  is_active: boolean;
  product_units: ProductUnit[];
};

type TransferRow = {
  id: string;
  product_id: string;
  unit_id: string;
  quantity: string;
};

type Props = {
  locations: Location[];
  products: Product[];

  // موجودة للتوافق مع الصفحة الحالية،
  // لكن لم تعد تستخدم لتحديد المصدر.
  currentLocationId: string | null;
  isGeneralManager: boolean;

  onClose: () => void;
};

export default function TransferModal({
  locations,
  products,
  onClose,
}: Props) {
  // ==========================================================
  // المواقع
  // ==========================================================

  // جميع المستخدمين يختارون المصدر بأنفسهم
  const [fromLocation, setFromLocation] = useState("");

  // جميع المستخدمين يختارون الوجهة بأنفسهم
  const [toLocation, setToLocation] = useState("");

  const [notes, setNotes] = useState("");

  const [rows, setRows] = useState<TransferRow[]>([
    {
      id: crypto.randomUUID(),
      product_id: "",
      unit_id: "",
      quantity: "1",
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ==========================================================
  // المواقع النشطة
  // ==========================================================

  const activeLocations = useMemo(
    () =>
      (locations ?? []).filter(
        (location) => location.is_active !== false
      ),
    [locations]
  );

  // ==========================================================
  // المنتجات النشطة
  // ==========================================================

  const activeProducts = useMemo(
    () =>
      (products ?? []).filter(
        (product) => product.is_active !== false
      ),
    [products]
  );

  // ==========================================================
  // إضافة صنف
  // ==========================================================

  function addRow() {
    setRows((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        product_id: "",
        unit_id: "",
        quantity: "1",
      },
    ]);
  }

  // ==========================================================
  // حذف صنف
  // ==========================================================

  function removeRow(id: string) {
    setRows((current) =>
      current.length === 1
        ? current
        : current.filter((row) => row.id !== id)
    );
  }

  // ==========================================================
  // تعديل صنف
  // ==========================================================

  function updateRow(
    id: string,
    field: keyof TransferRow,
    value: string
  ) {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== id) {
          return row;
        }

        if (field === "product_id") {
          const product = activeProducts.find(
            (item) => item.id === value
          );

          return {
            ...row,
            product_id: value,
            unit_id:
              product?.product_units?.find(
                (unit) => unit.is_base
              )?.unit_id ??
              product?.product_units?.[0]?.unit_id ??
              "",
          };
        }

        return {
          ...row,
          [field]: value,
        };
      })
    );
  }

  // ==========================================================
  // إنشاء الطلب
  // ==========================================================

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    // --------------------------------------------------------
    // المصدر
    // --------------------------------------------------------

    if (!fromLocation) {
      setError("حدد موقع المصدر من القائمة أولًا.");
      return;
    }

    // --------------------------------------------------------
    // الوجهة
    // --------------------------------------------------------

    if (!toLocation) {
      setError("حدد موقع الوجهة من القائمة أولًا.");
      return;
    }

    // --------------------------------------------------------
    // منع تطابق المصدر والوجهة
    // --------------------------------------------------------

    if (fromLocation === toLocation) {
      setError(
        "لا يمكن أن يكون المصدر والوجهة نفس الموقع."
      );
      return;
    }

    // --------------------------------------------------------
    // التحقق من المنتجات
    // --------------------------------------------------------

    if (!Array.isArray(rows) || rows.length === 0) {
      setError("أضف منتجًا واحدًا على الأقل.");
      return;
    }

    const invalidRow = rows.find((row) => {
      const quantity = Number(row.quantity);

      return (
        !row.product_id ||
        !row.unit_id ||
        !Number.isFinite(quantity) ||
        quantity <= 0
      );
    });

    if (invalidRow) {
      setError(
        "تأكد من تحديد المنتج والوحدة والكمية لكل صنف."
      );
      return;
    }

    setLoading(true);

    try {
      const result = await createTransfer({
        sourceLocationId: fromLocation,
        destinationLocationId: toLocation,

        notes,

        items: rows.map((row) => ({
          product_id: row.product_id,
          unit_id: row.unit_id,
          requested_quantity: Number(row.quantity),
        })),
      });

      if (!result.success) {
        setError(
          result.error || "تعذر إنشاء طلب النقل."
        );
        return;
      }

      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ غير متوقع."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
    >
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        {/* ======================================================
            الرأس
        ======================================================= */}

        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <ArrowLeftRight size={20} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                طلب نقل جديد
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                اختر موقع المصدر وموقع الوجهة لإنشاء طلب النقل.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 p-6"
        >
          {/* ====================================================
              الخطأ
          ===================================================== */}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {/* ====================================================
              المواقع
          ===================================================== */}

          <div className="grid gap-4 md:grid-cols-2">
            {/* ==================================================
                المصدر
            =================================================== */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                موقع المصدر
              </label>

              <select
                value={fromLocation}
                onChange={(event) => {
                  const value = event.target.value;

                  setFromLocation(value);

                  if (value === toLocation) {
                    setToLocation("");
                  }
                }}
                disabled={
                  loading ||
                  activeLocations.length === 0
                }
                required
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                <option value="">
                  {activeLocations.length === 0
                    ? "لا توجد مواقع متاحة"
                    : "اختر موقع المصدر"}
                </option>

                {activeLocations.map((location) => (
                  <option
                    key={location.id}
                    value={location.id}
                    disabled={location.id === toLocation}
                  >
                    {location.name} — {location.code}
                  </option>
                ))}
              </select>
            </div>

            {/* ==================================================
                الوجهة
            =================================================== */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                موقع الوجهة
              </label>

              <select
                value={toLocation}
                onChange={(event) => {
                  setToLocation(event.target.value);
                }}
                disabled={
                  loading ||
                  activeLocations.length === 0
                }
                required
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                <option value="">
                  {activeLocations.length === 0
                    ? "لا توجد مواقع متاحة"
                    : "اختر موقع الوجهة"}
                </option>

                {activeLocations.map((location) => (
                  <option
                    key={location.id}
                    value={location.id}
                    disabled={location.id === fromLocation}
                  >
                    {location.name} — {location.code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ====================================================
              تنبيه
          ===================================================== */}

          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            اختر موقع المصدر وموقع الوجهة من المواقع النشطة.
          </div>

          {/* ====================================================
              تنبيه المواقع
          ===================================================== */}

          {activeLocations.length < 2 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              يجب أن يكون لديك موقعان نشطان على الأقل لإنشاء طلب نقل.
            </div>
          )}

          {/* ====================================================
              المنتجات
          ===================================================== */}

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-4">
              <div>
                <h3 className="font-semibold text-slate-800">
                  المنتجات
                </h3>

                <p className="mt-1 text-xs text-slate-400">
                  أضف المنتجات والكميات المطلوب نقلها.
                </p>
              </div>

              <button
                type="button"
                onClick={addRow}
                disabled={
                  loading ||
                  activeProducts.length === 0
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={15} />
                إضافة منتج
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-white text-right">
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500">
                      المنتج
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold text-slate-500">
                      الوحدة
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold text-slate-500">
                      الكمية
                    </th>

                    <th className="w-16 px-5 py-3" />
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => {
                    const product =
                      activeProducts.find(
                        (item) =>
                          item.id === row.product_id
                      );

                    const units =
                      product?.product_units ?? [];

                    return (
                      <tr
                        key={row.id}
                        className="transition hover:bg-slate-50/50"
                      >
                        <td className="px-5 py-4">
                          <select
                            value={row.product_id}
                            onChange={(event) =>
                              updateRow(
                                row.id,
                                "product_id",
                                event.target.value
                              )
                            }
                            disabled={loading}
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                          >
                            <option value="">
                              {activeProducts.length === 0
                                ? "لا توجد منتجات"
                                : "اختر المنتج"}
                            </option>

                            {activeProducts.map((item) => (
                              <option
                                key={item.id}
                                value={item.id}
                              >
                                {item.name} — {item.sku}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="px-5 py-4">
                          <select
                            value={row.unit_id}
                            onChange={(event) =>
                              updateRow(
                                row.id,
                                "unit_id",
                                event.target.value
                              )
                            }
                            disabled={
                              loading || !product
                            }
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-100"
                          >
                            <option value="">
                              اختر الوحدة
                            </option>

                            {units.map((item) => (
                              <option
                                key={item.id}
                                value={item.unit_id}
                              >
                                {item.units?.name ?? "وحدة"}
                                {item.units?.symbol
                                  ? ` (${item.units.symbol})`
                                  : ""}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="px-5 py-4">
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={row.quantity}
                            onChange={(event) =>
                              updateRow(
                                row.id,
                                "quantity",
                                event.target.value
                              )
                            }
                            disabled={loading}
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                          />
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() =>
                              removeRow(row.id)
                            }
                            disabled={
                              loading ||
                              rows.length === 1
                            }
                            className="rounded-lg p-2 text-red-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <Trash2 size={17} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ====================================================
              الملاحظات
          ===================================================== */}

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              ملاحظات
            </label>

            <textarea
              value={notes}
              onChange={(event) =>
                setNotes(event.target.value)
              }
              disabled={loading}
              rows={3}
              placeholder="أضف أي ملاحظات متعلقة بطلب النقل..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50 disabled:bg-slate-100"
            />
          </div>

          {/* ====================================================
              الأزرار
          ===================================================== */}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={
                loading ||
                activeLocations.length < 2 ||
                activeProducts.length === 0 ||
                !fromLocation ||
                !toLocation
              }
              className="rounded-xl bg-slate-900 px-7 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "جاري إنشاء الطلب..."
                : "إنشاء طلب النقل"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}