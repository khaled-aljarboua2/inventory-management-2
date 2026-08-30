"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ClipboardCheck,
  Eye,
  Loader2,
  MapPin,
  Plus,
  Search,
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

  locations: {
    id: string;
    name: string;
    code: string;
  } | null;
};

type Location = {
  id: string;
  name: string;
  code: string;
};

export default function StockCountTable({
  counts,
  locations,
}: {
  counts: StockCount[];
  locations: Location[];
}) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const [locationId, setLocationId] = useState("");
  const [notes, setNotes] = useState("");

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const filteredCounts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return counts;
    }

    return counts.filter((count) => {
      const locationName =
        count.locations?.name?.toLowerCase() ?? "";

      const locationCode =
        count.locations?.code?.toLowerCase() ?? "";

      const status =
        count.status?.toLowerCase() ?? "";

      return (
        locationName.includes(query) ||
        locationCode.includes(query) ||
        status.includes(query)
      );
    });
  }, [counts, search]);

  function openCreateModal() {
    setLocationId(locations[0]?.id ?? "");
    setNotes("");
    setError("");
    setShowCreate(true);
  }

  function closeCreateModal() {
    if (creating) {
      return;
    }

    setShowCreate(false);
    setError("");
  }

  async function createCount() {
    setError("");

    if (!locationId) {
      setError("اختر الموقع أولًا.");
      return;
    }

    setCreating(true);

    try {
      const response = await fetch(
        "/api/inventory/counts",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            locationId,
            notes,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ??
            "تعذر إنشاء الجرد."
        );
      }

      const countId = result.count?.id;

      if (!countId) {
        throw new Error(
          "تم إنشاء الجرد، لكن لم يتم استلام معرّفه."
        );
      }

      router.push(
        `/inventory/counts/${countId}`
      );

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "تعذر إنشاء الجرد."
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-l from-teal-50/70 via-white to-white px-5 py-6 sm:px-6">
          <div className="pointer-events-none absolute -left-12 -top-12 h-32 w-32 rounded-full bg-teal-100/40 blur-3xl" />

          <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-200/60">
                <ClipboardCheck
                  size={23}
                  strokeWidth={1.9}
                />
              </div>

              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  عمليات الجرد
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  إنشاء ومتابعة عمليات جرد المخزون.
                </p>

                <div className="mt-3 inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">
                  {counts.length.toLocaleString(
                    "ar-SA"
                  )}{" "}
                  عملية جرد
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <Search
                  size={17}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="ابحث عن موقع أو حالة..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-10 pl-10 text-sm text-slate-700 outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-teal-400 focus:ring-4 focus:ring-teal-50 sm:w-72"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() =>
                      setSearch("")
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    aria-label="مسح البحث"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={openCreateModal}
                disabled={
                  locations.length === 0
                }
                className="group inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 text-sm font-semibold text-white shadow-sm shadow-teal-200 transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-700 hover:shadow-md hover:shadow-teal-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                <Plus
                  size={18}
                  className="transition-transform duration-200 group-hover:rotate-90"
                />

                إنشاء جرد
              </button>
            </div>
          </div>
        </div>

        {filteredCounts.length === 0 ? (
          <div className="px-6 py-20 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
              <ClipboardCheck size={30} />
            </div>

            <p className="mt-5 font-semibold text-slate-700">
              {search
                ? "لا توجد نتائج مطابقة"
                : "لا توجد عمليات جرد"}
            </p>

            <p className="mt-1 text-sm text-slate-400">
              {search
                ? "جرّب البحث باستخدام اسم موقع مختلف."
                : "أنشئ جردًا جديدًا للبدء."}
            </p>

            {search && (
              <button
                type="button"
                onClick={() =>
                  setSearch("")
                }
                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
              >
                <X size={15} />
                مسح البحث
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-right">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                    الموقع
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                    تاريخ الإنشاء
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                    الحالة
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                    ملاحظات
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                    الإجراء
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredCounts.map(
                  (count) => {
                    const isCompleted =
                      count.status ===
                      "completed";

                    return (
                      <tr
                        key={count.id}
                        className="group transition-colors duration-150 hover:bg-slate-50/70"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600 transition-transform duration-200 group-hover:scale-105">
                              <MapPin size={18} />
                            </div>

                            <div>
                              <p className="font-semibold text-slate-800">
                                {count.locations
                                  ?.name ??
                                  "موقع غير معروف"}
                              </p>

                              <p className="mt-1 font-mono text-xs text-slate-400">
                                {count.locations
                                  ?.code ??
                                  "—"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <div className="text-sm font-medium text-slate-600">
                            {new Date(
                              count.created_at
                            ).toLocaleDateString(
                              "ar-SA",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                timeZone: "Asia/Riyadh",
                              }
                            )}
                          </div>

                          <div className="mt-1 text-xs text-slate-400">
                            {new Date(
                              count.created_at
                            ).toLocaleTimeString(
                              "ar-SA",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                                timeZone: "Asia/Riyadh",
                              }
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              مكتمل
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                              قيد التنفيذ
                            </span>
                          )}
                        </td>

                        <td className="max-w-xs px-6 py-5">
                          <span
                            title={
                              count.notes ??
                              ""
                            }
                            className="block max-w-xs truncate text-sm text-slate-500"
                          >
                            {count.notes ??
                              "—"}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <Link
                            href={`/inventory/counts/${count.id}`}
                            className="group/action inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-600"
                          >
                            <Eye
                              size={16}
                              className="transition-transform duration-200 group-hover/action:scale-110"
                            />
                            فتح الجرد
                          </Link>
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

      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeCreateModal();
            }
          }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-l from-teal-50/70 via-white to-white px-6 py-6">
              <div className="pointer-events-none absolute -left-10 -top-10 h-28 w-28 rounded-full bg-teal-100/50 blur-2xl" />

              <div className="relative flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white shadow-md shadow-teal-200">
                    <ClipboardCheck size={21} />
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      إنشاء جرد جديد
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      سيبدأ الجرد فارغًا.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={creating}
                  className="rounded-xl p-2 text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="إغلاق"
                >
                  <X size={19} />
                </button>
              </div>
            </div>

            <div className="space-y-5 p-6">
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <MapPin
                    size={15}
                    className="text-teal-500"
                  />
                  الموقع
                </label>

                <select
                  value={locationId}
                  onChange={(event) =>
                    setLocationId(
                      event.target.value
                    )
                  }
                  disabled={creating}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 outline-none transition-all duration-200 hover:border-slate-300 hover:bg-white focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
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
                        {location.name} —{" "}
                        {location.code}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  ملاحظات
                  <span className="mr-1 text-xs font-normal text-slate-400">
                    (اختياري)
                  </span>
                </label>

                <textarea
                  value={notes}
                  onChange={(event) =>
                    setNotes(
                      event.target.value
                    )
                  }
                  disabled={creating}
                  rows={4}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-700 outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
                  placeholder="مثال: جرد نهاية اليوم..."
                />
              </div>

              {error && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm font-medium text-red-700">
                  <X
                    size={17}
                    className="mt-0.5 shrink-0"
                  />

                  <span>{error}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeCreateModal}
                disabled={creating}
                className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={createCount}
                disabled={
                  creating ||
                  !locationId
                }
                className="group inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 text-sm font-semibold text-white shadow-sm shadow-teal-200 transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-700 hover:shadow-md hover:shadow-teal-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {creating ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Plus
                    size={17}
                    className="transition-transform duration-200 group-hover:rotate-90"
                  />
                )}

                {creating
                  ? "جاري الإنشاء..."
                  : "إنشاء الجرد"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
