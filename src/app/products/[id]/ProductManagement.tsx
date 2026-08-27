"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Barcode,
  Check,
  CheckCircle2,
  Edit3,
  Hash,
  Package,
  Plus,
  Ruler,
  Star,
  Trash2,
  X,
} from "lucide-react";

type Unit = {
  id: string;
  name: string;
  symbol: string | null;
};

type ProductUnit = {
  id: string;
  unit_id: string;
  conversion_factor: number;
  is_base: boolean;
  units: Unit | null;
};

type BarcodeItem = {
  id: string;
  barcode: string;
  unit_id: string | null;
  is_default: boolean;
  units: Unit | null;
};

type Props = {
  productId: string;
  units: Unit[];
  productUnits: ProductUnit[];
  barcodes: BarcodeItem[];
};

type ApiResult = {
  success?: boolean;
  id?: string;
  error?: string;
  message?: string;
  code?: string | null;
  details?: string | null;
  hint?: string | null;
};

export default function ProductManagement({
  productId,
  units,
  productUnits,
  barcodes,
}: Props) {
  const router = useRouter();

  // =========================================================
  // الوحدات
  // =========================================================

  const [unitId, setUnitId] = useState("");
  const [conversionFactor, setConversionFactor] =
    useState("1");
  const [isBase, setIsBase] = useState(false);

  const [editingUnitId, setEditingUnitId] =
    useState<string | null>(null);
  const [editUnitId, setEditUnitId] = useState("");
  const [editConversionFactor, setEditConversionFactor] =
    useState("1");
  const [editIsBase, setEditIsBase] = useState(false);

  // =========================================================
  // الباركود
  // =========================================================

  const [barcode, setBarcode] = useState("");
  const [barcodeUnitId, setBarcodeUnitId] =
    useState("");
  const [barcodeDefault, setBarcodeDefault] =
    useState(false);

  const [editingBarcodeId, setEditingBarcodeId] =
    useState<string | null>(null);
  const [editBarcode, setEditBarcode] = useState("");
  const [editBarcodeUnitId, setEditBarcodeUnitId] =
    useState("");
  const [editBarcodeDefault, setEditBarcodeDefault] =
    useState(false);

  // =========================================================
  // الحالة
  // =========================================================

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function clearMessages() {
    setError("");
    setMessage("");
  }

  async function parseResponse(
    response: Response
  ): Promise<ApiResult> {
    const text = await response.text();

    if (!text) {
      return {};
    }

    try {
      return JSON.parse(text);
    } catch {
      return {
        error: `الخادم أرجع استجابة غير صالحة. Status: ${response.status}`,
      };
    }
  }

  // =========================================================
  // إضافة وحدة
  // =========================================================

  async function addUnit() {
    clearMessages();

    if (!unitId) {
      setError("اختر الوحدة أولًا.");
      return;
    }

    const factor = Number(conversionFactor);

    if (!Number.isFinite(factor) || factor <= 0) {
      setError(
        "معامل التحويل يجب أن يكون أكبر من صفر."
      );
      return;
    }

    if (isBase && factor !== 1) {
      setError(
        "الوحدة الأساسية يجب أن يكون معاملها 1."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/products/units",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productId,
            unitId,
            conversionFactor: factor,
            isBase,
          }),
        }
      );

      const result = await parseResponse(response);

      if (!response.ok) {
        throw new Error(
          result.error ||
            result.message ||
            `تعذر إضافة الوحدة. Status: ${response.status}`
        );
      }

      setUnitId("");
      setConversionFactor("1");
      setIsBase(false);

      setMessage("تمت إضافة الوحدة بنجاح.");
      router.refresh();
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

  // =========================================================
  // تعديل الوحدة
  // =========================================================

  function startEditUnit(item: ProductUnit) {
    clearMessages();

    setEditingUnitId(item.id);
    setEditUnitId(item.unit_id);
    setEditConversionFactor(
      String(item.conversion_factor)
    );
    setEditIsBase(item.is_base);
  }

  function cancelEditUnit() {
    setEditingUnitId(null);
    setEditUnitId("");
    setEditConversionFactor("1");
    setEditIsBase(false);
    clearMessages();
  }

  async function updateUnit() {
    if (!editingUnitId) {
      return;
    }

    clearMessages();

    if (!editUnitId) {
      setError("اختر الوحدة.");
      return;
    }

    const factor = Number(editConversionFactor);

    if (!Number.isFinite(factor) || factor <= 0) {
      setError(
        "معامل التحويل يجب أن يكون أكبر من صفر."
      );
      return;
    }

    if (editIsBase && factor !== 1) {
      setError(
        "الوحدة الأساسية يجب أن يكون معاملها 1."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/products/units/${editingUnitId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            unitId: editUnitId,
            conversionFactor: factor,
            isBase: editIsBase,
          }),
        }
      );

      const result = await parseResponse(response);

      if (!response.ok) {
        throw new Error(
          result.error ||
            result.message ||
            `تعذر تعديل الوحدة. Status: ${response.status}`
        );
      }

      cancelEditUnit();
      setMessage("تم تعديل الوحدة بنجاح.");
      router.refresh();
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

  // =========================================================
  // حذف الوحدة
  // =========================================================

  async function deleteUnit(id: string) {
    if (
      !confirm(
        "هل أنت متأكد من حذف هذه الوحدة؟"
      )
    ) {
      return;
    }

    clearMessages();
    setLoading(true);

    try {
      const response = await fetch(
        `/api/products/units/${id}`,
        {
          method: "DELETE",
        }
      );

      const result = await parseResponse(response);

      if (!response.ok) {
        throw new Error(
          result.error ||
            result.message ||
            `تعذر حذف الوحدة. Status: ${response.status}`
        );
      }

      setMessage("تم حذف الوحدة بنجاح.");
      router.refresh();
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

  // =========================================================
  // إضافة باركود
  // =========================================================

  async function addBarcode() {
    clearMessages();

    if (!barcode.trim()) {
      setError("أدخل رقم الباركود.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/products/barcodes",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productId,
            barcode: barcode.trim(),
            unitId: barcodeUnitId || null,
            isDefault: barcodeDefault,
          }),
        }
      );

      const result = await parseResponse(response);

      if (!response.ok) {
        throw new Error(
          result.error ||
            result.message ||
            `تعذر إضافة الباركود. Status: ${response.status}`
        );
      }

      setBarcode("");
      setBarcodeUnitId("");
      setBarcodeDefault(false);

      setMessage("تمت إضافة الباركود بنجاح.");
      router.refresh();
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

  // =========================================================
  // تعديل الباركود
  // =========================================================

  function startEditBarcode(item: BarcodeItem) {
    clearMessages();

    setEditingBarcodeId(item.id);
    setEditBarcode(item.barcode);
    setEditBarcodeUnitId(
      item.unit_id ?? ""
    );
    setEditBarcodeDefault(
      item.is_default
    );
  }

  function cancelEditBarcode() {
    setEditingBarcodeId(null);
    setEditBarcode("");
    setEditBarcodeUnitId("");
    setEditBarcodeDefault(false);
    clearMessages();
  }

  async function updateBarcode() {
    if (!editingBarcodeId) {
      return;
    }

    clearMessages();

    if (!editBarcode.trim()) {
      setError("أدخل رقم الباركود.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/products/barcodes/${editingBarcodeId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            barcode: editBarcode.trim(),
            unitId:
              editBarcodeUnitId || null,
            isDefault:
              editBarcodeDefault,
          }),
        }
      );

      const result = await parseResponse(response);

      if (!response.ok) {
        throw new Error(
          result.error ||
            result.message ||
            `تعذر تعديل الباركود. Status: ${response.status}`
        );
      }

      cancelEditBarcode();
      setMessage("تم تعديل الباركود بنجاح.");
      router.refresh();
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

  // =========================================================
  // حذف الباركود
  // =========================================================

  async function deleteBarcode(id: string) {
    if (
      !confirm(
        "هل أنت متأكد من حذف هذا الباركود؟"
      )
    ) {
      return;
    }

    clearMessages();
    setLoading(true);

    try {
      const response = await fetch(
        `/api/products/barcodes/${id}`,
        {
          method: "DELETE",
        }
      );

      const result = await parseResponse(response);

      if (!response.ok) {
        throw new Error(
          result.error ||
            result.message ||
            `تعذر حذف الباركود. Status: ${response.status}`
        );
      }

      setMessage("تم حذف الباركود بنجاح.");
      router.refresh();
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
      className="space-y-6"
    >
      {/* =====================================================
          الرسائل
      ====================================================== */}

      {(error || message) && (
        <div
          className={`flex items-center gap-3 rounded-2xl border px-5 py-4 text-sm shadow-sm transition-all duration-300 ${
            error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
              error
                ? "bg-red-100"
                : "bg-emerald-100"
            }`}
          >
            {error ? (
              <X size={17} />
            ) : (
              <CheckCircle2 size={17} />
            )}
          </div>

          <span>{error || message}</span>
        </div>
      )}

      {/* =====================================================
          الوحدات
      ====================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* رأس القسم */}

        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                <Ruler size={20} />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  وحدات المنتج
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  إدارة وحدات المنتج ومعاملات التحويل.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
              <Ruler size={14} />

              <span>
                {productUnits.length} وحدة مرتبطة
              </span>
            </div>
          </div>
        </div>

        {/* نموذج إضافة الوحدة */}

        <div className="border-b border-slate-100 bg-slate-50/40 p-5 sm:p-6">
          <div className="mb-4">
            <p className="text-sm font-semibold text-slate-800">
              إضافة وحدة للمنتج
            </p>

            <p className="mt-1 text-xs text-slate-400">
              حدد الوحدة ومعامل التحويل، ويمكن تحديدها
              كوحدة أساسية.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr_1fr_auto]">
            {/* الوحدة */}

            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-600">
                الوحدة
              </label>

              <select
                value={unitId}
                onChange={(e) =>
                  setUnitId(e.target.value)
                }
                disabled={loading}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition-all duration-200 hover:border-slate-300 focus:border-teal-400 focus:ring-4 focus:ring-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">
                  اختر الوحدة
                </option>

                {units.map((unit) => (
                  <option
                    key={unit.id}
                    value={unit.id}
                  >
                    {unit.name}
                    {unit.symbol
                      ? ` (${unit.symbol})`
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* معامل التحويل */}

            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-600">
                معامل التحويل
              </label>

              <div className="relative">
                <Hash
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="number"
                  min="0"
                  step="any"
                  value={conversionFactor}
                  onChange={(e) =>
                    setConversionFactor(
                      e.target.value
                    )
                  }
                  disabled={
                    loading || isBase
                  }
                  placeholder="1"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-9 pl-4 text-sm text-slate-700 outline-none transition-all duration-200 hover:border-slate-300 focus:border-teal-400 focus:ring-4 focus:ring-teal-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70"
                />
              </div>
            </div>

            {/* الوحدة الأساسية */}

            <label className="flex h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 transition-all duration-200 hover:border-teal-200 hover:bg-teal-50/40">
              <input
                type="checkbox"
                checked={isBase}
                disabled={loading}
                onChange={(e) => {
                  const checked =
                    e.target.checked;

                  setIsBase(checked);

                  if (checked) {
                    setConversionFactor("1");
                  }
                }}
                className="h-4 w-4 accent-teal-600"
              />

              <div>
                <span className="block text-sm font-semibold text-slate-700">
                  وحدة أساسية
                </span>

                <span className="block text-[10px] text-slate-400">
                  معاملها دائمًا 1
                </span>
              </div>
            </label>

            {/* زر الإضافة */}

            <button
              type="button"
              disabled={
                loading || !unitId
              }
              onClick={addUnit}
              className="group flex h-11 items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 text-sm font-semibold text-white shadow-sm shadow-teal-200 transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-700 hover:shadow-md hover:shadow-teal-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <Plus
                  size={17}
                  className="transition-transform duration-200 group-hover:rotate-90"
                />
              )}

              <span>
                {loading
                  ? "جاري..."
                  : "إضافة الوحدة"}
              </span>
            </button>
          </div>
        </div>

        {/* جدول الوحدات */}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-right">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="px-5 py-4 text-xs font-semibold text-slate-500">
                  الوحدة
                </th>

                <th className="px-5 py-4 text-xs font-semibold text-slate-500">
                  معامل التحويل
                </th>

                <th className="px-5 py-4 text-xs font-semibold text-slate-500">
                  النوع
                </th>

                <th className="px-5 py-4 text-xs font-semibold text-slate-500">
                  الإجراءات
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {productUnits.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-14 text-center"
                  >
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                        <Ruler size={27} />
                      </div>

                      <p className="font-medium text-slate-700">
                        لا توجد وحدات مرتبطة بالمنتج
                      </p>

                      <p className="mt-1 text-sm text-slate-400">
                        أضف وحدة من النموذج أعلاه.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                productUnits.map((item) => {
                  const isEditing =
                    editingUnitId === item.id;

                  if (isEditing) {
                    return (
                      <tr
                        key={item.id}
                        className="bg-teal-50/40"
                      >
                        {/* الوحدة */}

                        <td className="px-5 py-4">
                          <select
                            value={editUnitId}
                            onChange={(e) =>
                              setEditUnitId(
                                e.target.value
                              )
                            }
                            disabled={loading}
                            className="h-10 w-full rounded-xl border border-teal-200 bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-teal-50"
                          >
                            {units.map(
                              (unit) => (
                                <option
                                  key={unit.id}
                                  value={unit.id}
                                >
                                  {unit.name}
                                  {unit.symbol
                                    ? ` (${unit.symbol})`
                                    : ""}
                                </option>
                              )
                            )}
                          </select>
                        </td>

                        {/* المعامل */}

                        <td className="px-5 py-4">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={
                              editConversionFactor
                            }
                            onChange={(e) =>
                              setEditConversionFactor(
                                e.target.value
                              )
                            }
                            disabled={
                              loading ||
                              editIsBase
                            }
                            className="h-10 w-full rounded-xl border border-teal-200 bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-teal-50"
                          />
                        </td>

                        {/* النوع */}

                        <td className="px-5 py-4">
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                            <input
                              type="checkbox"
                              checked={
                                editIsBase
                              }
                              disabled={loading}
                              onChange={(e) => {
                                const checked =
                                  e.target
                                    .checked;

                                setEditIsBase(
                                  checked
                                );

                                if (checked) {
                                  setEditConversionFactor(
                                    "1"
                                  );
                                }
                              }}
                              className="h-4 w-4 accent-teal-600"
                            />

                            <span className="text-xs font-medium text-slate-600">
                              أساسية
                            </span>
                          </label>
                        </td>

                        {/* الإجراءات */}

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={
                                updateUnit
                              }
                              disabled={
                                loading
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                            >
                              <Check
                                size={14}
                              />
                              حفظ
                            </button>

                            <button
                              type="button"
                              onClick={
                                cancelEditUnit
                              }
                              disabled={
                                loading
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                            >
                              <X
                                size={14}
                              />
                              إلغاء
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={item.id}
                      className="group transition-colors duration-150 hover:bg-slate-50/80"
                    >
                      {/* الوحدة */}

                      <td className="px-5 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600 transition-transform duration-200 group-hover:scale-105">
                            <Ruler size={18} />
                          </div>

                          <div>
                            <p className="font-semibold text-slate-800">
                              {item.units
                                ?.name ??
                                "غير معروف"}
                            </p>

                            {item.units
                              ?.symbol && (
                              <p className="mt-0.5 font-mono text-xs text-slate-400">
                                {
                                  item
                                    .units
                                    .symbol
                                }
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* المعامل */}

                      <td className="px-5 py-5">
                        <span className="inline-flex rounded-lg bg-slate-100 px-3 py-1.5 font-mono text-xs font-semibold text-slate-600">
                          {item.conversion_factor}
                        </span>
                      </td>

                      {/* النوع */}

                      <td className="px-5 py-5">
                        {item.is_base ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700">
                            <Star
                              size={13}
                              fill="currentColor"
                            />
                            أساسية
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">
                            إضافية
                          </span>
                        )}
                      </td>

                      {/* الإجراءات */}

                      <td className="px-5 py-5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              startEditUnit(
                                item
                              )
                            }
                            disabled={loading}
                            className="group/edit inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-all duration-200 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-600 disabled:opacity-50"
                          >
                            <Edit3
                              size={14}
                              className="transition-transform duration-200 group-hover/edit:scale-110"
                            />
                            تعديل
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteUnit(
                                item.id
                              )
                            }
                            disabled={loading}
                            className="group/delete inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 transition-all duration-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          >
                            <Trash2
                              size={14}
                              className="transition-transform duration-200 group-hover/delete:scale-110"
                            />
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* =====================================================
          الباركود
      ====================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* رأس القسم */}

        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                <Barcode size={20} />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  الباركود
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  إدارة باركودات المنتج وربطها بالوحدات.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
              <Barcode size={14} />

              <span>
                {barcodes.length} باركود
              </span>
            </div>
          </div>
        </div>

        {/* نموذج إضافة الباركود */}

        <div className="border-b border-slate-100 bg-slate-50/40 p-5 sm:p-6">
          <div className="mb-4">
            <p className="text-sm font-semibold text-slate-800">
              إضافة باركود
            </p>

            <p className="mt-1 text-xs text-slate-400">
              أدخل الباركود وحدد الوحدة المرتبطة به إن وجدت.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr_1fr_auto]">
            {/* رقم الباركود */}

            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-600">
                رقم الباركود
              </label>

              <div className="relative">
                <Barcode
                  size={17}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={barcode}
                  onChange={(e) =>
                    setBarcode(
                      e.target.value
                    )
                  }
                  disabled={loading}
                  placeholder="أدخل رقم الباركود..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-10 pl-4 font-mono text-sm text-slate-700 outline-none transition-all duration-200 placeholder:font-sans placeholder:text-slate-400 hover:border-slate-300 focus:border-teal-400 focus:ring-4 focus:ring-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            </div>

            {/* الوحدة */}

            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-600">
                الوحدة المرتبطة
              </label>

              <select
                value={barcodeUnitId}
                onChange={(e) =>
                  setBarcodeUnitId(
                    e.target.value
                  )
                }
                disabled={loading}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition-all duration-200 hover:border-slate-300 focus:border-teal-400 focus:ring-4 focus:ring-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">
                  بدون وحدة
                </option>

                {productUnits.map(
                  (item) => (
                    <option
                      key={item.unit_id}
                      value={item.unit_id}
                    >
                      {item.units?.name ??
                        "غير معروف"}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* افتراضي */}

            <label className="flex h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 transition-all duration-200 hover:border-teal-200 hover:bg-teal-50/40">
              <input
                type="checkbox"
                checked={barcodeDefault}
                disabled={loading}
                onChange={(e) =>
                  setBarcodeDefault(
                    e.target.checked
                  )
                }
                className="h-4 w-4 accent-teal-600"
              />

              <div>
                <span className="block text-sm font-semibold text-slate-700">
                  باركود افتراضي
                </span>

                <span className="block text-[10px] text-slate-400">
                  الباركود الرئيسي للمنتج
                </span>
              </div>
            </label>

            {/* إضافة */}

            <button
              type="button"
              disabled={
                loading ||
                !barcode.trim()
              }
              onClick={addBarcode}
              className="group flex h-11 items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 text-sm font-semibold text-white shadow-sm shadow-teal-200 transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-700 hover:shadow-md hover:shadow-teal-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <Plus
                  size={17}
                  className="transition-transform duration-200 group-hover:rotate-90"
                />
              )}

              <span>
                {loading
                  ? "جاري..."
                  : "إضافة الباركود"}
              </span>
            </button>
          </div>
        </div>

        {/* جدول الباركود */}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-right">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="px-5 py-4 text-xs font-semibold text-slate-500">
                  الباركود
                </th>

                <th className="px-5 py-4 text-xs font-semibold text-slate-500">
                  الوحدة
                </th>

                <th className="px-5 py-4 text-xs font-semibold text-slate-500">
                  الحالة
                </th>

                <th className="px-5 py-4 text-xs font-semibold text-slate-500">
                  الإجراءات
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {barcodes.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-14 text-center"
                  >
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                        <Barcode size={27} />
                      </div>

                      <p className="font-medium text-slate-700">
                        لا توجد باركودات مرتبطة بالمنتج
                      </p>

                      <p className="mt-1 text-sm text-slate-400">
                        أضف أول باركود من النموذج أعلاه.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                barcodes.map((item) => {
                  const isEditing =
                    editingBarcodeId ===
                    item.id;

                  if (isEditing) {
                    return (
                      <tr
                        key={item.id}
                        className="bg-teal-50/40"
                      >
                        {/* الباركود */}

                        <td className="px-5 py-4">
                          <input
                            type="text"
                            value={editBarcode}
                            onChange={(e) =>
                              setEditBarcode(
                                e.target.value
                              )
                            }
                            disabled={loading}
                            className="h-10 w-full rounded-xl border border-teal-200 bg-white px-3 font-mono text-sm outline-none focus:ring-4 focus:ring-teal-50"
                          />
                        </td>

                        {/* الوحدة */}

                        <td className="px-5 py-4">
                          <select
                            value={
                              editBarcodeUnitId
                            }
                            onChange={(e) =>
                              setEditBarcodeUnitId(
                                e.target.value
                              )
                            }
                            disabled={loading}
                            className="h-10 w-full rounded-xl border border-teal-200 bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-teal-50"
                          >
                            <option value="">
                              بدون وحدة
                            </option>

                            {productUnits.map(
                              (
                                productUnit
                              ) => (
                                <option
                                  key={
                                    productUnit.unit_id
                                  }
                                  value={
                                    productUnit.unit_id
                                  }
                                >
                                  {productUnit
                                    .units
                                    ?.name ??
                                    "غير معروف"}
                                </option>
                              )
                            )}
                          </select>
                        </td>

                        {/* الحالة */}

                        <td className="px-5 py-4">
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                            <input
                              type="checkbox"
                              checked={
                                editBarcodeDefault
                              }
                              disabled={
                                loading
                              }
                              onChange={(e) =>
                                setEditBarcodeDefault(
                                  e.target
                                    .checked
                                )
                              }
                              className="h-4 w-4 accent-teal-600"
                            />

                            <span className="text-xs font-medium text-slate-600">
                              افتراضي
                            </span>
                          </label>
                        </td>

                        {/* الإجراءات */}

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={
                                updateBarcode
                              }
                              disabled={
                                loading
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                            >
                              <Check
                                size={14}
                              />
                              حفظ
                            </button>

                            <button
                              type="button"
                              onClick={
                                cancelEditBarcode
                              }
                              disabled={
                                loading
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                            >
                              <X
                                size={14}
                              />
                              إلغاء
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={item.id}
                      className="group transition-colors duration-150 hover:bg-slate-50/80"
                    >
                      {/* الباركود */}

                      <td className="px-5 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600 transition-transform duration-200 group-hover:scale-105">
                            <Barcode size={18} />
                          </div>

                          <span className="font-mono text-sm font-semibold tracking-wide text-slate-700">
                            {item.barcode}
                          </span>
                        </div>
                      </td>

                      {/* الوحدة */}

                      <td className="px-5 py-5">
                        <div className="flex items-center gap-2">
                          <Package
                            size={16}
                            className="text-slate-400"
                          />

                          <span className="text-sm font-medium text-slate-600">
                            {item.units?.name ??
                              "بدون وحدة"}
                          </span>
                        </div>
                      </td>

                      {/* الحالة */}

                      <td className="px-5 py-5">
                        {item.is_default ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                            <Star
                              size={13}
                              fill="currentColor"
                            />
                            افتراضي
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">
                            إضافي
                          </span>
                        )}
                      </td>

                      {/* الإجراءات */}

                      <td className="px-5 py-5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              startEditBarcode(
                                item
                              )
                            }
                            disabled={loading}
                            className="group/edit inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-all duration-200 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-600 disabled:opacity-50"
                          >
                            <Edit3
                              size={14}
                              className="transition-transform duration-200 group-hover/edit:scale-110"
                            />
                            تعديل
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteBarcode(
                                item.id
                              )
                            }
                            disabled={loading}
                            className="group/delete inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 transition-all duration-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          >
                            <Trash2
                              size={14}
                              className="transition-transform duration-200 group-hover/delete:scale-110"
                            />
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}