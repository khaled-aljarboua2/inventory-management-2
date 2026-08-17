"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ClipboardCheck,
  Plus,
  X,
} from "lucide-react";

type StockCount = {
  id: string;
  location_id: string;
  created_by: string;
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
};

type Location = {
  id: string;
  name: string;
  code: string;
};

type Props = {
  counts: StockCount[];
  locations: Location[];
};

export default function StockCountTable({
  counts,
  locations,
}: Props) {
  const [showCreate, setShowCreate] =
    useState(false);

  const [locationId, setLocationId] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  async function createCount() {
    if (!locationId) {
      setMessage(
        "اختر الموقع أولًا."
      );
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/inventory/counts",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              locationId,
              notes,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ??
            "تعذر إنشاء الجرد."
        );
      }

      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "حدث خطأ غير متوقع."
      );
    } finally {
      setLoading(false);
    }
  }

  function statusLabel(
    status: string
  ) {
    switch (
      status.toLowerCase()
    ) {
      case "in_progress":
        return "قيد التنفيذ";

      case "completed":
        return "مكتمل";

      case "draft":
        return "مسودة";

      case "pending":
        return "معلق";

      default:
        return status;
    }
  }

  function statusClass(
    status: string
  ) {
    switch (
      status.toLowerCase()
    ) {
      case "completed":
        return "bg-emerald-50 text-emerald-700";

      case "draft":
        return "bg-slate-100 text-slate-600";

      case "pending":
        return "bg-blue-50 text-blue-700";

      default:
        return "bg-orange-50 text-orange-700";
    }
  }

  function formatDate(
    value: string
  ) {
    return new Intl.DateTimeFormat(
      "ar-SA",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    ).format(new Date(value));
  }

  return (
    <>
      {/* =====================================================
          جدول عمليات الجرد
      ====================================================== */}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              عمليات الجرد
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              {counts.length} عملية جرد
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setLocationId("");
              setNotes("");
              setMessage("");
              setShowCreate(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600"
          >
            <Plus size={17} />
            جرد جديد
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-right">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                  الموقع
                </th>

                <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                  الحالة
                </th>

                <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                  تاريخ الإنشاء
                </th>

                <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                  الاكتمال
                </th>

                <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                  الإجراءات
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {counts.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-20 text-center"
                  >
                    <ClipboardCheck
                      size={34}
                      className="mx-auto mb-3 text-slate-300"
                    />

                    <p className="font-semibold text-slate-700">
                      لا توجد عمليات جرد
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                      أنشئ أول عملية جرد من زر «جرد جديد».
                    </p>
                  </td>
                </tr>
              ) : (
                counts.map((count) => (
                  <tr
                    key={count.id}
                    className="transition hover:bg-slate-50/70"
                  >
                    {/* الموقع */}
                    <td className="px-6 py-5">
                      <div>
                        <p className="font-semibold text-slate-800">
                          {count.locations?.name ??
                            "—"}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {count.locations?.code ??
                            "—"}
                        </p>
                      </div>
                    </td>

                    {/* الحالة */}
                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${statusClass(
                          count.status
                        )}`}
                      >
                        {statusLabel(
                          count.status
                        )}
                      </span>
                    </td>

                    {/* تاريخ الإنشاء */}
                    <td className="px-6 py-5 text-sm text-slate-500">
                      {formatDate(
                        count.created_at
                      )}
                    </td>

                    {/* تاريخ الإكمال */}
                    <td className="px-6 py-5 text-sm text-slate-500">
                      {count.completed_at
                        ? formatDate(
                            count.completed_at
                          )
                        : "—"}
                    </td>

                    {/* الإجراءات */}
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/inventory/counts/${count.id}`}
                          className="inline-flex items-center rounded-lg px-3 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-50"
                        >
                          فتح الجرد
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* =====================================================
          نافذة إنشاء جرد
      ====================================================== */}

      {showCreate && (
        <div
          dir="rtl"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
            {/* الرأس */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  إنشاء جرد جديد
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  اختر الموقع الذي تريد جرده.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowCreate(false)
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="إغلاق"
              >
                <X size={18} />
              </button>
            </div>

            {/* المحتوى */}
            <div className="space-y-5 p-6">
              {/* الموقع */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  الموقع
                </label>

                <select
                  value={locationId}
                  onChange={(event) =>
                    setLocationId(
                      event.target.value
                    )
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                >
                  <option value="">
                    اختر الموقع
                  </option>

                  {locations.map(
                    (location) => (
                      <option
                        key={location.id}
                        value={location.id}
                      >
                        {location.name} (
                        {location.code})
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* الملاحظات */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  ملاحظات
                </label>

                <textarea
                  value={notes}
                  onChange={(event) =>
                    setNotes(
                      event.target.value
                    )
                  }
                  rows={4}
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  placeholder="ملاحظات الجرد..."
                />
              </div>

              {/* الرسالة */}
              {message && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {message}
                </div>
              )}

              {/* الأزرار */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setShowCreate(false)
                  }
                  disabled={loading}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  إلغاء
                </button>

                <button
                  type="button"
                  disabled={
                    loading ||
                    !locationId
                  }
                  onClick={createCount}
                  className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading
                    ? "جاري الإنشاء..."
                    : "إنشاء الجرد"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}