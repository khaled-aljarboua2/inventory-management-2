"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Edit3,
  Plus,
  Ruler,
  Trash2,
  X,
} from "lucide-react";

import {
  createUnit,
  updateUnit,
  deleteUnit,
} from "./actions";

type Unit = {
  id: string;
  name: string;
  symbol: string | null;
};

type Props = {
  units: Unit[];
};

export default function UnitsTable({ units }: Props) {
  const router = useRouter();

  const [editingUnit, setEditingUnit] =
    useState<Unit | null>(null);

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function startEdit(unit: Unit) {
    setEditingUnit(unit);
    setName(unit.name);
    setSymbol(unit.symbol ?? "");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelEdit() {
    setEditingUnit(null);
    setName("");
    setSymbol("");
    setError("");
  }

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setLoading(true);
    setError("");

    const result = editingUnit
      ? await updateUnit(editingUnit.id, {
          name: name.trim(),
          symbol: symbol.trim(),
        })
      : await createUnit({
          name: name.trim(),
          symbol: symbol.trim(),
        });

    if (!result.success) {
      setError(
        result.error || "حدث خطأ أثناء حفظ الوحدة."
      );
      setLoading(false);
      return;
    }

    cancelEdit();
    router.refresh();
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (
      !confirm(
        "هل أنت متأكد من حذف هذه الوحدة؟"
      )
    ) {
      return;
    }

    setLoading(true);
    setError("");

    const result = await deleteUnit(id);

    if (!result.success) {
      setError(
        result.error ||
          "حدث خطأ أثناء حذف الوحدة."
      );
      setLoading(false);
      return;
    }

    if (editingUnit?.id === id) {
      cancelEdit();
    }

    router.refresh();
    setLoading(false);
  }

  return (
    <div dir="rtl" className="space-y-6">

      {/* =====================================================
          نموذج الإضافة / التعديل
      ====================================================== */}
      <div
        id="unit-form"
        className="scroll-mt-24 border-b border-slate-100 p-5 sm:p-6"
      >
        <div className="mb-5 flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 ${
              editingUnit
                ? "bg-amber-50 text-amber-600"
                : "bg-teal-50 text-teal-600"
            }`}
          >
            {editingUnit ? (
              <Edit3 size={19} />
            ) : (
              <Plus size={20} />
            )}
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {editingUnit
                ? "تعديل الوحدة"
                : "إضافة وحدة"}
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              {editingUnit
                ? "تعديل بيانات وحدة القياس."
                : "أضف وحدة قياس جديدة لاستخدامها مع المنتجات."}
            </p>
          </div>
        </div>

        {/* الخطأ */}
        {error && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <X size={17} />

            <span>{error}</span>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid gap-4 md:grid-cols-[1fr_1fr_auto]"
        >
          {/* اسم الوحدة */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-600">
              اسم الوحدة
            </label>

            <input
              type="text"
              placeholder="مثال: حبة، كرتون، كيلو..."
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              disabled={loading}
              required
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 text-sm text-slate-700 outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          {/* الرمز */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-600">
              الرمز
            </label>

            <input
              type="text"
              placeholder="مثال: pcs"
              value={symbol}
              onChange={(e) =>
                setSymbol(e.target.value)
              }
              disabled={loading}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 text-sm text-slate-700 outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          {/* الأزرار */}
          <div className="flex items-end gap-2">
            <button
              type="submit"
              disabled={loading}
              className="group inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 text-sm font-semibold text-white shadow-sm shadow-teal-200 transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-700 hover:shadow-md hover:shadow-teal-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : editingUnit ? (
                <Check
                  size={17}
                  className="transition-transform duration-200 group-hover:scale-110"
                />
              ) : (
                <Plus
                  size={17}
                  className="transition-transform duration-200 group-hover:rotate-90"
                />
              )}

              <span>
                {loading
                  ? "جاري الحفظ..."
                  : editingUnit
                    ? "حفظ التعديل"
                    : "إضافة الوحدة"}
              </span>
            </button>

            {editingUnit && (
              <button
                type="button"
                onClick={cancelEdit}
                disabled={loading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
              >
                <X size={17} />

                <span>إلغاء</span>
              </button>
            )}
          </div>
        </form>
      </div>

      {/* =====================================================
          قائمة الوحدات
      ====================================================== */}
      <div>
        {/* رأس القائمة */}
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                قائمة الوحدات
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                جميع وحدات القياس المسجلة في النظام.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
              <Ruler size={15} />

              <span>
                {units.length} وحدة
              </span>
            </div>
          </div>
        </div>

        {/* الجدول */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-right">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                  الوحدة
                </th>

                <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                  الرمز
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
              {units.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-16 text-center"
                  >
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                        <Ruler size={27} />
                      </div>

                      <p className="font-medium text-slate-700">
                        لا توجد وحدات مضافة حاليًا
                      </p>

                      <p className="mt-1 text-sm text-slate-400">
                        ابدأ بإضافة أول وحدة قياس.
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          document
                            .getElementById(
                              "unit-form"
                            )
                            ?.scrollIntoView({
                              behavior: "smooth",
                            })
                        }
                        className="mt-4 text-sm font-semibold text-teal-600 transition hover:text-teal-700"
                      >
                        إضافة وحدة
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                units.map((unit) => (
                  <tr
                    key={unit.id}
                    className="group transition-colors duration-150 hover:bg-slate-50/80"
                  >
                    {/* الوحدة */}
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600 transition-all duration-200 group-hover:scale-105 group-hover:bg-teal-100">
                          <Ruler
                            size={19}
                            strokeWidth={1.8}
                          />
                        </div>

                        <div>
                          <p className="font-semibold text-slate-800">
                            {unit.name}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            وحدة قياس
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* الرمز */}
                    <td className="px-6 py-5">
                      {unit.symbol ? (
                        <span className="inline-flex rounded-lg bg-slate-100 px-3 py-1.5 font-mono text-xs font-medium text-slate-600">
                          {unit.symbol}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-300">
                          —
                        </span>
                      )}
                    </td>

                    {/* الحالة */}
                    <td className="px-6 py-5">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        جاهزة
                      </span>
                    </td>

                    {/* الإجراءات */}
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            startEdit(unit)
                          }
                          disabled={loading}
                          className="group/edit inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-all duration-200 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-600 disabled:opacity-50"
                        >
                          <Edit3
                            size={14}
                            className="transition-transform duration-200 group-hover/edit:scale-110"
                          />

                          <span>تعديل</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(unit.id)
                          }
                          disabled={loading}
                          className="group/delete inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 transition-all duration-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        >
                          <Trash2
                            size={14}
                            className="transition-transform duration-200 group-hover/delete:scale-110"
                          />

                          <span>حذف</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* أسفل الجدول */}
        {units.length > 0 && (
          <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-3">
            <p className="text-xs text-slate-400">
              إجمالي وحدات القياس:{" "}
              <span className="font-semibold text-slate-600">
                {units.length}
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}