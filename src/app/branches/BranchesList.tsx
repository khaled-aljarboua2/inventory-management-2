"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  CircleOff,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import {
  createBranch,
  updateBranch,
  deleteBranch,
  setBranchStatus,
} from "./actions";

type Branch = {
  id: string;
  name: string;
  code: string;
  city: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
};

type Props = {
  branches: Branch[];
};

export default function BranchesList({
  branches,
}: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] =
    useState<"all" | "active" | "inactive">("all");

  const [modalOpen, setModalOpen] =
    useState(false);

  const [editing, setEditing] =
    useState<Branch | null>(null);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] =
    useState("");

  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
    useState("");

  const activeCount = branches.filter(
    (branch) => branch.is_active
  ).length;

  const inactiveCount =
    branches.length - activeCount;

  const filteredBranches = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return branches.filter((branch) => {
      const matchesSearch =
        !query ||
        branch.name
          .toLowerCase()
          .includes(query) ||
        branch.code
          .toLowerCase()
          .includes(query) ||
        branch.city
          ?.toLowerCase()
          .includes(query);

      const matchesFilter =
        filter === "all" ||
        (filter === "active" &&
          branch.is_active) ||
        (filter === "inactive" &&
          !branch.is_active);

      return (
        matchesSearch &&
        matchesFilter
      );
    });
  }, [branches, search, filter]);

  function openCreate() {
    setEditing(null);
    setName("");
    setCode("");
    setCity("");
    setAddress("");
    setError("");
    setModalOpen(true);
  }

  function openEdit(branch: Branch) {
    setEditing(branch);
    setName(branch.name);
    setCode(branch.code);
    setCity(branch.city ?? "");
    setAddress(branch.address ?? "");
    setError("");
    setModalOpen(true);
  }

  function closeModal() {
    if (loading) return;

    setModalOpen(false);
    setEditing(null);
    setError("");
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const result = editing
      ? await updateBranch(editing.id, {
          name,
          code,
          city,
          address,
        })
      : await createBranch({
          name,
          code,
          city,
          address,
        });

    if (!result.success) {
      setError(
        result.error ||
          "حدث خطأ غير متوقع."
      );
      setLoading(false);
      return;
    }

    setModalOpen(false);
    setEditing(null);

    window.location.reload();
  }

  async function handleStatus(
    branch: Branch
  ) {
    setLoading(true);
    setError("");

    const result =
      await setBranchStatus(
        branch.id,
        !branch.is_active
      );

    if (!result.success) {
      setError(
        result.error ||
          "تعذر تغيير حالة الفرع."
      );
      setLoading(false);
      return;
    }

    window.location.reload();
  }

  async function handleDelete(
    branch: Branch
  ) {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف الفرع "${branch.name}"؟`
    );

    if (!confirmed) return;

    setLoading(true);
    setError("");

    const result =
      await deleteBranch(branch.id);

    if (!result.success) {
      setError(
        result.error ||
          "تعذر حذف الفرع."
      );
      setLoading(false);
      return;
    }

    window.location.reload();
  }

  return (
    <>
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

        {/* الإحصائيات */}
        <div className="grid gap-4 border-b border-slate-100 bg-slate-50/50 p-5 md:grid-cols-3">

          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-2xl border p-5 text-right transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
              filter === "all"
                ? "border-blue-200 bg-blue-50"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  إجمالي الفروع
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {branches.length}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Building2 size={23} />
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setFilter("active")}
            className={`rounded-2xl border p-5 text-right transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
              filter === "active"
                ? "border-emerald-200 bg-emerald-50"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  الفروع النشطة
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {activeCount}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={23} />
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setFilter("inactive")}
            className={`rounded-2xl border p-5 text-right transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
              filter === "inactive"
                ? "border-slate-300 bg-slate-100"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  غير النشطة
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {inactiveCount}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <CircleOff size={23} />
              </div>
            </div>
          </button>
        </div>

        {/* شريط الأدوات */}
        <div className="border-b border-slate-100 p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                قائمة الفروع
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                {filteredBranches.length} فرع
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">

              <div className="relative sm:w-80">
                <Search
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="ابحث عن فرع..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pr-10 pl-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() =>
                      setSearch("")
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={openCreate}
                className="group inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-100"
              >
                <Plus
                  size={18}
                  className="transition-transform group-hover:rotate-90"
                />
                إضافة فرع
              </button>
            </div>
          </div>
        </div>

        {error && !modalOpen && (
          <div className="mx-5 mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* الجدول */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-right">

            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                  الفرع
                </th>

                <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                  الرمز
                </th>

                <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                  المدينة
                </th>

                <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                  الحالة
                </th>

                <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                  الإجراءات
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">

              {filteredBranches.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-20 text-center"
                  >
                    <div className="mx-auto flex max-w-sm flex-col items-center">

                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                        <Building2 size={28} />
                      </div>

                      <p className="font-semibold text-slate-700">
                        لا توجد فروع
                      </p>

                      <p className="mt-1 text-sm text-slate-400">
                        ابدأ بإضافة أول فرع للنظام.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBranches.map(
                  (branch) => (
                    <tr
                      key={branch.id}
                      className="group transition hover:bg-blue-50/30"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">

                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:scale-105">
                            <Building2 size={19} />
                          </div>

                          <div>
                            <p className="font-semibold text-slate-800">
                              {branch.name}
                            </p>

                            {branch.address && (
                              <p className="mt-1 max-w-xs truncate text-xs text-slate-400">
                                {branch.address}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-600">
                          {branch.code}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                          <MapPin
                            size={15}
                            className="text-slate-400"
                          />
                          {branch.city || "—"}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        {branch.is_active ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            نشط
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                            غير نشط
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">

                          <button
                            type="button"
                            onClick={() =>
                              openEdit(
                                branch
                              )
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Pencil size={14} />
                            تعديل
                          </button>

                          <button
                            type="button"
                            disabled={loading}
                            onClick={() =>
                              handleStatus(
                                branch
                              )
                            }
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                          >
                            {branch.is_active
                              ? "تعطيل"
                              : "تفعيل"}
                          </button>

                          <button
                            type="button"
                            disabled={loading}
                            onClick={() =>
                              handleDelete(
                                branch
                              )
                            }
                            className="inline-flex items-center justify-center rounded-lg border border-red-100 bg-white p-2 text-red-500 transition hover:bg-red-50"
                            title="حذف"
                          >
                            <Trash2 size={15} />
                          </button>

                        </div>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">

          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editing
                    ? "تعديل الفرع"
                    : "إضافة فرع"}
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  أدخل بيانات الفرع الأساسية.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-6"
            >
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  اسم الفرع
                </label>

                <input
                  value={name}
                  onChange={(event) =>
                    setName(
                      event.target.value
                    )
                  }
                  required
                  disabled={loading}
                  placeholder="مثال: فرع بريدة"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  رمز الفرع
                </label>

                <input
                  value={code}
                  onChange={(event) =>
                    setCode(
                      event.target.value
                    )
                  }
                  required
                  disabled={loading}
                  placeholder="BR-001"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 font-mono text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  المدينة
                </label>

                <input
                  value={city}
                  onChange={(event) =>
                    setCity(
                      event.target.value
                    )
                  }
                  disabled={loading}
                  placeholder="بريدة"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  العنوان
                </label>

                <textarea
                  value={address}
                  onChange={(event) =>
                    setAddress(
                      event.target.value
                    )
                  }
                  disabled={loading}
                  rows={3}
                  placeholder="العنوان التفصيلي للفرع..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={loading}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-50"
                >
                  {loading
                    ? "جاري الحفظ..."
                    : editing
                      ? "حفظ التعديل"
                      : "إضافة الفرع"}
                </button>

              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}