"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Package,
  Save,
  AlertTriangle,
} from "lucide-react";

type CountItem = {
  id: string;
  product_id: string;
  system_quantity: number;
  counted_quantity: number | null;
  difference_quantity: number | null;
  notes: string | null;

  products:
    | {
        id: string;
        name: string;
        sku: string;
      }
    | null;
};

type StockCount = {
  id: string;
  location_id: string;
  status: string;
  notes: string | null;
  created_at: string;
  completed_at: string | null;

  locations:
    | {
        id: string;
        name: string;
        code: string;
      }
    | null;

  items: CountItem[];
};

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

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  async function loadCount() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/inventory/counts/${countId}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ??
            "تعذر تحميل الجرد."
        );
      }

      setCount(result.count);

      const quantityMap: Record<
        string,
        string
      > = {};

      const notesMap: Record<
        string,
        string
      > = {};

      for (const item of result.count.items) {
        quantityMap[item.id] =
          item.counted_quantity === null
            ? ""
            : String(
                item.counted_quantity
              );

        notesMap[item.id] =
          item.notes ?? "";
      }

      setQuantities(quantityMap);
      setNotes(notesMap);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "تعذر تحميل الجرد."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCount();
  }, [countId]);

  const filledCount =
    useMemo(() => {
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

  const totalItems =
    count?.items.length ?? 0;

  const allCounted =
    totalItems > 0 &&
    filledCount === totalItems;

  async function saveItems() {
    if (!count) return;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const items = count.items.map(
        (item) => ({
          id: item.id,
          counted_quantity:
            quantities[item.id] === ""
              ? null
              : Number(
                  quantities[item.id]
                ),
          notes:
            notes[item.id]?.trim() ||
            null,
        })
      );

      const response = await fetch(
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

  async function completeCount() {
    if (!count) return;

    if (!allCounted) {
      setError(
        "يجب إدخال الكمية الفعلية لجميع الأصناف قبل إكمال الجرد."
      );
      return;
    }

    const confirmed =
      window.confirm(
        "هل أنت متأكد من إكمال الجرد؟ سيتم تطبيق الفروقات على المخزون وتسجيل التسويات، ولا يمكن التراجع عن العملية."
      );

    if (!confirmed) {
      return;
    }

    setCompleting(true);
    setMessage("");
    setError("");

    try {
      /*
       * نحفظ آخر التعديلات أولًا.
       */
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
              items: count.items.map(
                (item) => ({
                  id: item.id,
                  counted_quantity:
                    Number(
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

      const saveResult =
        await saveResponse.json();

      if (!saveResponse.ok) {
        throw new Error(
          saveResult.error ??
            "تعذر حفظ الكميات."
        );
      }

      /*
       * إكمال الجرد
       */
      const response = await fetch(
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

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <p className="text-sm text-slate-500">
          جاري تحميل الجرد...
        </p>
      </div>
    );
  }

  if (error && !count) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
        <p className="font-semibold text-red-700">
          {error}
        </p>
      </div>
    );
  }

  if (!count) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
        <p className="font-semibold text-slate-700">
          الجرد غير موجود.
        </p>
      </div>
    );
  }

  const isCompleted =
    count.status === "completed";

  return (
    <>
      {/* ======================================================
          رأس الصفحة
      ======================================================= */}

      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <Link
            href="/inventory/counts"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-blue-600"
          >
            <ArrowRight size={16} />
            العودة إلى الجرد
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <ClipboardCheck
                size={24}
              />
            </div>

            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                جرد المخزون
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                {count.locations?.name}
                {" — "}
                {count.locations?.code}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-4 py-2 text-xs font-semibold ${
              isCompleted
                ? "bg-emerald-50 text-emerald-700"
                : "bg-orange-50 text-orange-700"
            }`}
          >
            {isCompleted
              ? "مكتمل"
              : "قيد التنفيذ"}
          </span>

          {!isCompleted && (
            <>
              <button
                type="button"
                disabled={
                  saving ||
                  completing
                }
                onClick={saveItems}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
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
                onClick={
                  completeCount
                }
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle2
                  size={17}
                />

                {completing
                  ? "جاري الإكمال..."
                  : "إكمال الجرد"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ======================================================
          معلومات الجرد
      ======================================================= */}

      <div className="grid gap-4 md:grid-cols-3">
        <InfoCard
          label="الموقع"
          value={
            count.locations
              ?.name ?? "—"
          }
        />

        <InfoCard
          label="الأصناف"
          value={`${totalItems}`}
        />

        <InfoCard
          label="تم العد"
          value={`${filledCount} / ${totalItems}`}
        />
      </div>

      {/* ======================================================
          التنبيهات
      ======================================================= */}

      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {!isCompleted &&
        !allCounted && (
          <div className="flex items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4 text-sm text-orange-700">
            <AlertTriangle
              size={18}
            />

            <span>
              أدخل الكمية الفعلية لجميع الأصناف
              قبل إكمال الجرد.
            </span>
          </div>
        )}

      {/* ======================================================
          جدول الجرد
      ======================================================= */}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5 sm:p-6">
          <h2 className="text-lg font-bold text-slate-900">
            أصناف الجرد
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            قارن رصيد النظام بالكمية الفعلية.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-right">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="px-6 py-4 text-xs text-slate-500">
                  المنتج
                </th>

                <th className="px-6 py-4 text-xs text-slate-500">
                  SKU
                </th>

                <th className="px-6 py-4 text-xs text-slate-500">
                  كمية النظام
                </th>

                <th className="px-6 py-4 text-xs text-slate-500">
                  الكمية الفعلية
                </th>

                <th className="px-6 py-4 text-xs text-slate-500">
                  الفرق
                </th>

                <th className="px-6 py-4 text-xs text-slate-500">
                  ملاحظات
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {count.items.map(
                (item) => {
                  const countedValue =
                    quantities[item.id];

                  const counted =
                    countedValue ===
                      undefined ||
                    countedValue === ""
                      ? null
                      : Number(
                          countedValue
                        );

                  const system =
                    Number(
                      item.system_quantity ??
                        0
                    );

                  const difference =
                    counted === null
                      ? null
                      : counted - system;

                  return (
                    <tr
                      key={item.id}
                      className="transition hover:bg-slate-50/60"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <Package
                              size={18}
                            />
                          </div>

                          <p className="font-semibold text-slate-800">
                            {
                              item.products
                                ?.name
                            }
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-600">
                          {
                            item.products
                              ?.sku
                          }
                        </span>
                      </td>

                      <td className="px-6 py-5 text-lg font-bold text-slate-800">
                        {system}
                      </td>

                      <td className="px-6 py-5">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          disabled={
                            isCompleted
                          }
                          value={
                            countedValue ??
                            ""
                          }
                          onChange={(event) =>
                            setQuantities(
                              (current) => ({
                                ...current,
                                [item.id]:
                                  event.target
                                    .value,
                              })
                            )
                          }
                          className="h-11 w-32 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-100"
                          placeholder="0"
                        />
                      </td>

                      <td className="px-6 py-5">
                        {difference ===
                        null ? (
                          <span className="text-sm text-slate-400">
                            —
                          </span>
                        ) : difference ===
                          0 ? (
                          <span className="font-semibold text-emerald-600">
                            0
                          </span>
                        ) : difference >
                          0 ? (
                          <span className="font-bold text-blue-600">
                            +{difference}
                          </span>
                        ) : (
                          <span className="font-bold text-red-600">
                            {difference}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-5">
                        <input
                          type="text"
                          disabled={
                            isCompleted
                          }
                          value={
                            notes[item.id] ??
                            ""
                          }
                          onChange={(event) =>
                            setNotes(
                              (current) => ({
                                ...current,
                                [item.id]:
                                  event.target
                                    .value,
                              })
                            )
                          }
                          className="h-11 w-full min-w-64 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-100"
                          placeholder="ملاحظة..."
                        />
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-xl font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}