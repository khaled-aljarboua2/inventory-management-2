"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

type Barcode = {
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
  barcodes: Barcode[];
};

export default function ProductManagement({
  productId,
  units,
  productUnits,
  barcodes,
}: Props) {
  const router = useRouter();

  const [unitId, setUnitId] = useState("");
  const [conversionFactor, setConversionFactor] = useState("1");
  const [isBase, setIsBase] = useState(false);

  const [barcode, setBarcode] = useState("");
  const [barcodeUnitId, setBarcodeUnitId] = useState("");
  const [barcodeDefault, setBarcodeDefault] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function addUnit() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/products/units", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          unitId,
          conversionFactor: Number(conversionFactor),
          isBase,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "تعذر إضافة الوحدة.");
      }

      setUnitId("");
      setConversionFactor("1");
      setIsBase(false);
      setMessage("تمت إضافة الوحدة بنجاح.");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "حدث خطأ غير متوقع."
      );
    } finally {
      setLoading(false);
    }
  }

  async function addBarcode() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/products/barcodes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          barcode,
          unitId: barcodeUnitId || null,
          isDefault: barcodeDefault,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "تعذر إضافة الباركود.");
      }

      setBarcode("");
      setBarcodeUnitId("");
      setBarcodeDefault(false);
      setMessage("تمت إضافة الباركود بنجاح.");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "حدث خطأ غير متوقع."
      );
    } finally {
      setLoading(false);
    }
  }

  async function deleteUnit(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذه الوحدة؟")) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/products/units/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "تعذر حذف الوحدة.");
      }

      setMessage("تم حذف الوحدة بنجاح.");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "حدث خطأ غير متوقع."
      );
    } finally {
      setLoading(false);
    }
  }

  async function deleteBarcode(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا الباركود؟")) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/products/barcodes/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "تعذر حذف الباركود.");
      }

      setMessage("تم حذف الباركود بنجاح.");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "حدث خطأ غير متوقع."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div dir="rtl" className="space-y-6">
      {(error || message) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {error || message}
        </div>
      )}

      {/* Units */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900">
            وحدات المنتج
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            إضافة وإدارة وحدات المنتج ومعاملات التحويل.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <select
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3"
          >
            <option value="">اختر الوحدة</option>

            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
                {unit.symbol ? ` (${unit.symbol})` : ""}
              </option>
            ))}
          </select>

          <input
            type="number"
            min="0"
            step="any"
            value={conversionFactor}
            onChange={(e) => setConversionFactor(e.target.value)}
            placeholder="معامل التحويل"
            className="rounded-xl border border-slate-300 px-4 py-3"
          />

          <label className="flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-3">
            <input
              type="checkbox"
              checked={isBase}
              onChange={(e) => {
                setIsBase(e.target.checked);

                if (e.target.checked) {
                  setConversionFactor("1");
                }
              }}
            />

            <span className="text-sm">
              وحدة أساسية
            </span>
          </label>

          <button
            type="button"
            disabled={loading || !unitId}
            onClick={addUnit}
            className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            إضافة الوحدة
          </button>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-right">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-sm font-semibold">
                  الوحدة
                </th>

                <th className="px-4 py-3 text-sm font-semibold">
                  معامل التحويل
                </th>

                <th className="px-4 py-3 text-sm font-semibold">
                  النوع
                </th>

                <th className="px-4 py-3 text-sm font-semibold">
                  الإجراء
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {productUnits.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    لا توجد وحدات مرتبطة بالمنتج.
                  </td>
                </tr>
              ) : (
                productUnits.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-sm font-medium">
                      {item.units?.name ?? "غير معروف"}
                    </td>

                    <td className="px-4 py-3 text-sm">
                      {item.conversion_factor}
                    </td>

                    <td className="px-4 py-3">
                      {item.is_base ? (
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">
                          أساسية
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">
                          إضافية
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => deleteUnit(item.id)}
                        disabled={loading}
                        className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Barcodes */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900">
            الباركود
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            إضافة وإدارة باركودات المنتج.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <input
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="رقم الباركود"
            className="rounded-xl border border-slate-300 px-4 py-3"
          />

          <select
            value={barcodeUnitId}
            onChange={(e) => setBarcodeUnitId(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3"
          >
            <option value="">بدون وحدة</option>

            {productUnits.map((item) => (
              <option key={item.unit_id} value={item.unit_id}>
                {item.units?.name ?? "غير معروف"}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-3">
            <input
              type="checkbox"
              checked={barcodeDefault}
              onChange={(e) => setBarcodeDefault(e.target.checked)}
            />

            <span className="text-sm">
              باركود افتراضي
            </span>
          </label>

          <button
            type="button"
            disabled={loading || !barcode.trim()}
            onClick={addBarcode}
            className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            إضافة الباركود
          </button>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-right">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-sm font-semibold">
                  الباركود
                </th>

                <th className="px-4 py-3 text-sm font-semibold">
                  الوحدة
                </th>

                <th className="px-4 py-3 text-sm font-semibold">
                  الحالة
                </th>

                <th className="px-4 py-3 text-sm font-semibold">
                  الإجراء
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {barcodes.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    لا توجد باركودات مرتبطة بالمنتج.
                  </td>
                </tr>
              ) : (
                barcodes.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-mono text-sm">
                      {item.barcode}
                    </td>

                    <td className="px-4 py-3 text-sm">
                      {item.units?.name ?? "بدون وحدة"}
                    </td>

                    <td className="px-4 py-3">
                      {item.is_default ? (
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
                          افتراضي
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">
                          إضافي
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => deleteBarcode(item.id)}
                        disabled={loading}
                        className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
