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
  const [showCreate, setShowCreate] =
    useState(false);

  const [locationId, setLocationId] =
    useState("");

  const [notes, setNotes] = useState("");
  const [creating, setCreating] =
    useState(false);

  const [error, setError] = useState("");

  const filteredCounts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return counts;

    return counts.filter((count) => {
      const locationName =
        count.locations?.name.toLowerCase() ?? "";

      const locationCode =
        count.locations?.code.toLowerCase() ?? "";

      return (
        locationName.includes(query) ||
        locationCode.includes(query) ||
        count.status.toLowerCase().includes(query)
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
    if (creating) return;

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
            "Content-Type":
              "application/json",
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
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              عمليات الجرد
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              {counts.length} عملية جرد
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <Search
                size={17}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="ابحث عن موقع أو حالة..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-10 pl-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 sm:w-72"
              />
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              disabled={locations.length === 0}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={18} />
              إنشاء جرد
            </button>
          </div>
        </div>

        {filteredCounts.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <ClipboardCheck
              size={32}
              className="mx-auto text-slate-300"
            />

            <p className="mt-4 font-semibold text-slate-700">
              لا توجد عمليات جرد
            </p>

            <p className="mt-1 text-sm text-slate-400">
              أنشئ جردًا جديدًا للبدء.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-right">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="px-6 py-4 text-xs text-slate-500">
                    الموقع
                  </th>

                  <th className="px-6 py-4 text-xs text-slate-500">
                    تاريخ الإنشاء
                  </th>

                  <th className="px-6 py-4 text-xs text-slate-500">
                    الحالة
                  </th>

                  <th className="px-6 py-4 text-xs text-slate-500">
                    ملاحظات
                  </th>

                  <th className="px-6 py-4 text-xs text-slate-500">
                    إجراء
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredCounts.map((count) => {
                  const isCompleted =
                    count.status === "completed";

                  return (
                    <tr
                      key={count.id}
                      className="transition hover:bg-slate-50/60"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <MapPin size={18} />
                          </div>

                          <div>
                            <p className="font-semibold text-slate-800">
                              {count.locations?.name ??
                                "موقع غير معروف"}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {count.locations?.code ??
                                "—"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-600">
                        {new Date(
                          count.created_at
                        ).toLocaleDateString("ar-SA")}
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                            isCompleted
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-orange-50 text-orange-700"
                          }`}
                        >
                          {isCompleted
                            ? "مكتمل"
                            : "قيد التنفيذ"}
                        </span>
                      </td>

                      <td className="max-w-xs truncate px-6 py-5 text-sm text-slate-500">
                        {count.notes ?? "—"}
                      </td>

                      <td className="px-6 py-5">
                        <Link
                          href={`/inventory/counts/${count.id}`}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <Eye size={16} />
                          فتح الجرد
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  إنشاء جرد جديد
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  سيبدأ الجرد فارغًا.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCreateModal}
                disabled={creating}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={19} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  الموقع
                </label>

                <select
                  value={locationId}
                  onChange={(event) =>
                    setLocationId(event.target.value)
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                >
                  <option value="">
                    اختر الموقع
                  </option>

                  {locations.map((location) => (
                    <option
                      key={location.id}
                      value={location.id}
                    >
                      {location.name} —{" "}
                      {location.code}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  ملاحظات — اختياري
                </label>

                <textarea
                  value={notes}
                  onChange={(event) =>
                    setNotes(event.target.value)
                  }
                  rows={3}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  placeholder="مثال: جرد نهاية اليوم"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-5">
              <button
                type="button"
                onClick={closeCreateModal}
                disabled={creating}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={createCount}
                disabled={creating || !locationId}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating && (
                  <Loader2
                    size={17}
                    className="animate-spin"
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